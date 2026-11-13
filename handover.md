# Admin dashboard — development handover

Status: **Phase 2 complete, Phase 3a (applications) 3b (admin users, password change) and 3c (audit viewer) Phase 4a (security hardening) and Phase 4b (CI, e2e, accessibility), 4c (caching), 4e (uploads) and 4f (monitoring) complete**. This document is the continuation guide for the remaining
admin-site work (Phases 3–4), plus the current architecture, conventions and deployment
checks.

Last updated: 2026-11-10 · Phase 2 content editing

---

## 1. What exists today

### Public site

- One-page portfolio (`app/(site)/page.tsx`) with hero, roster (men/women switch, filters,
  featured carousel), Hall of Fame, achievements, activities and the join form.
- Content is read from **MongoDB** on every request (pages are dynamic). `content/*.json`
  are **seed files/fallback** only.
- Join form → `POST /api/join` → validated with zod, rate limited (3/email + 10/IP per
  24h), stored in `applications`.

### Admin (Phase 2 — content editing)

- `/admin/login` — email + password, no public signup.
- Protected area `/admin`: overview, members, hall of fame, achievements, activities,
  applications (read-only list), settings (account + env checks).
- **Content editors** for members, hall of fame, achievements and activities:
  schema-driven forms, add/remove/reorder rows, unsaved-changes guard, inline validation
  summary, optimistic revision check with a 409 "reload latest" banner. `viewer` sees the
  same forms disabled; `editor`/`owner` can save.
- Auth: custom DB-backed sessions, scrypt password hashes, httpOnly cookie, middleware
  gate, server-side session validation, audit log, login throttling.
- Tooling: `npm run db:seed`, `npm run admin:create`, `scripts/test-admin.mjs` (15 checks),
  `scripts/test-admin-crud.mjs` (14 checks).

### Not built yet

- No application status workflow, notes, CSV export.
- No admin-user management, password change, audit viewer, 2FA, password reset email.
- No image uploads (image URL fields are used instead).
- Club-level content (hero, about, training, committee) is not editable in the admin UI;
  `content/club.json` / the `club` document remain seed-managed.

---

## 2. Quick start

```bash
npm install
cp .env.example .env.local        # fill MONGODB_URI, MONGODB_DB, IP_HASH_SALT
npm run db:seed                   # content/*.json → MongoDB (idempotent)
npm run admin:create -- you@example.com owner
npm run dev                       # http://localhost:3000 · /admin
```

| Command | Purpose |
| --- | --- |
| `npm run build` | production build (server output `.next`) |
| `npm start` | serve production build |
| `npm run typecheck` | `tsc --noEmit` (build itself skips type-checking) |
| `npm run check:design` | enforce 8px spacing grid + shared type scale |
| `npm run db:seed` | seed content documents |
| `npm run admin:create -- <email> [role]` | create or reset an admin account |
| `node --env-file=.env.local scripts/test-admin.mjs` | auth + live-content tests (server must run) |
| `node --env-file=.env.local scripts/test-admin-crud.mjs` | content editing tests (server must run) |
| `node --env-file=.env.local scripts/test-join.mjs` | join API tests |
| `node --env-file=.env.local scripts/test-mongo.mjs` | Atlas connectivity check |

Environment:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | database name (default `bball_club`) |
| `IP_HASH_SALT` | HMAC salt for hashing IPs (rate limiting, audit) |

`NEXT_WORKER_THREADS=1` is only for restricted sandboxes; never set it on Vercel.

---

## 3. Architecture

### Routes

```
app/
  (site)/                 # public site (layout with nav/footer)
  admin/
    login/page.tsx        # public login page
    (protected)/          # requireAdminPage() + AdminShell
      page.tsx            # overview
      members/page.tsx
      hall-of-fame/page.tsx
      achievements/page.tsx
      activities/page.tsx
      applications/page.tsx
      settings/page.tsx
  api/
    join/route.ts
    admin/auth/login/route.ts
    admin/auth/logout/route.ts
    admin/content/[doc]/route.ts   # GET snapshot · PATCH revision-safe write
  components/
    admin-content-editor.tsx       # schema-driven editor (client)
middleware.ts             # edge gate for /admin + /api/admin
```

### Layers

| File | Responsibility |
| --- | --- |
| `lib/mongodb.ts` | cached Mongo client, index creation |
| `lib/content-db.ts` | content repository (`getClub`, `getMembers`, … `getSiteContent`), JSON fallback, build-time guard |
| `lib/content.ts` | content types + pure helpers |
| `lib/auth.ts` | scrypt hash/verify, sessions, `getAdminSession`, `requireAdminPage`, login throttling |
| `lib/audit.ts` | append-only audit entries |
| `lib/admin-queries.ts` | admin read models (applications, audit) |
| `lib/admin-schemas.ts` | strict zod schemas for each editable content document |
| `lib/admin-fields.ts` | declarative field map consumed by the content editor |
| `components/admin-content-editor.tsx` | generic editor + per-section wrappers |
| `lib/http.ts` | client IP, same-origin, content-type, body-size helpers |
| `middleware.ts` | redirects unauthenticated `/admin`, 401s `/api/admin` |

### MongoDB collections

| Collection | Shape |
| --- | --- |
| `content` | `{ _id: "club" \| "members" \| "hallOfFame" \| "achievements" \| "activities", data, revision, updatedAt, updatedBy }` |
| `admin_users` | `{ email (unique), role: owner\|editor\|viewer, passwordHash, disabled, failedAttempts, lockedUntil, lastLoginAt, createdAt, updatedAt, passwordChangedAt }` |
| `admin_sessions` | `{ tokenHash (unique, SHA-256), userId, createdAt, lastSeenAt, expiresAt (TTL), absoluteExpiresAt, ipHash, userAgent }` |
| `auth_rate_limits` | `{ _id, count, expiresAt (TTL) }` — login throttling |
| `applications` | `{ name, email, phone, position, year, message, consent, status, source, ipHash, userAgent, createdAt }` |
| `audit_logs` | `{ actorEmail, action, entity, entityId?, changes: string[], ipHash?, userAgent, createdAt }` |
| `join_rate_limits` | `{ _id, count, expiresAt (TTL) }` — join form |

Password hash format: `scrypt$N$r$p$salt$hash` (base64url), `N=32768, r=8, p=1`,
`maxmem=64MB`. Keep `lib/auth.ts` and `scripts/create-admin.mjs` in sync.

---

## 4. Conventions (required)

### API route pattern

Every admin endpoint must follow the same pipeline:

1. `isSameOrigin(request)` → `403` (CSRF).
2. `hasJsonContentType` / content-type check → `415`.
3. Body-size cap (`declaredBodyTooLarge`) → `413`.
4. `getAdminSession()` → `401` when absent; role check → `403`.
5. `zod.object({...}).strict()` parse → `422` with safe field messages.
6. Fixed Mongo query shapes; never pass request objects/keys into queries
   (`$where`, `$gt`, dotted paths are rejected by `.strict()`).
7. Write + audit → `revalidatePath`/no cache needed (pages are dynamic) → JSON response.
8. No internal error details to the client; log server-side with an `[api/...]` prefix.

### Roles

| Role | Intended permissions (Phase 2+) |
| --- | --- |
| `viewer` | read-only access to admin pages/applications |
| `editor` | viewer + content CRUD (members, HoF, achievements, activities) |
| `owner` | editor + admin-user management, settings, exports |

Phase 1 only authenticated; write endpoints now enforce roles: `viewer` gets `403`,
`editor`/`owner` can save content.

### Design system (admin UI reuses the public tokens)

- Spacing: every padding/margin/gap/inset is a multiple of **8px**.
- Type: use the semantic classes `type-display`, `type-h2`…`type-label`; never raw
  `text-*` sizes or arbitrary pixels.
- `npm run check:design` runs in CI; it fails on violations.
- Palette: cream `#F7F2E8`, ink `#17140F`, burnt orange `#C2410C`, gold `#EEC166`.
- Components are server components by default; client components only for interactivity
  (`usePathname`, forms, local state).

### Content edits & publishing

Pages are dynamic and read Mongo per request, so a successful write is live immediately —
no `revalidatePath`/`revalidateTag` needed. If caching is added later, it must be
invalidated in the same transaction path.

---

## 5. Remaining work

### Phase 2 — Content CRUD ✅ done

**Delivered:**

- `GET /api/admin/content/[doc]` → `{ data, revision, updatedAt, updatedBy }` (any role).
- `PATCH /api/admin/content/[doc]` body `{ data, expectedRevision }`:
  same-origin → JSON → 512 KB cap → session → `owner`/`editor` check → strict zod
  validation of the whole document → revision-checked update → changed-key audit →
  `200 { revision }`. Stale revision returns `409 { revision }`; the editor shows a
  "reload latest" banner. Missing documents are created at revision 0.
- `lib/admin-schemas.ts`: strict schemas for all four documents. String caps, jersey
  numbers 0–99, unique numbers per roster, unique retired jerseys, duplicate roster ids,
  player role enum, `YYYY-MM-DD` event dates, and https-only image URLs. Unknown /
  operator keys are rejected.
- `lib/admin-fields.ts` + `components/admin-content-editor.tsx`: schema-driven editor with
  collapsible row editors, add/remove/reorder, search-free compact forms, validation
  issue list, unsaved-changes guard, save/discard, and read-only mode for `viewer`.
- Admin pages for members, hall of fame, achievements and activities now load a snapshot
  (`getContentSnapshot`) and render the editor.
- `scripts/test-admin-crud.mjs`: 14 checks (role enforcement, validation, 409, audit,
  live public update) and restores the original document.

**Deferred from the original sketch:** explicit archive/soft-delete flags, roster search
and a separate edit drawer. Deleting a row removes it outright; add `archived` fields
before using this for historical players. Club-level content (hero/about/training) is
still seed-managed.

### Phase 3a — Applications workflow ✅ done

- `PATCH /api/admin/applications/[id]` — `{ status }` or `{ addNote }` (owner/editor; viewer 403).
  Statuses `new → reviewing → shortlisted → accepted → rejected` (any to any). Notes max 100,
  1000 chars each, appended atomically. Audit `application.status` / `application.note` (no text).
- `GET /api/admin/applications/export?status=&q=` — CSV (owner/editor), BOM, RFC 4180, formula
  injection defused, `no-store`, max 5,000 rows, audit `application.export`.
- `/admin/applications` — status chips with counts, search (name/email, literal match),
  pagination (25), expandable detail panel. IP data is never exposed.
- Code: `lib/application-schemas.ts`, `lib/application-queries.ts`, `lib/csv.ts`,
  `components/admin-application-panel.tsx`. Tests: `scripts/test-admin-applications.mjs` (37 checks).
- Still open in Phase 3: admin-user management, password change, audit viewer (3b/3c).

### Phase 3b — Admin users and password change ✅ done

- `POST /api/admin/auth/password` (any role): current + new password, throttled (5 wrong guesses /
  15 min), revokes other sessions, audit `auth.password`. Rules: 8–200 chars, not the email, not
  containing the email local part, different from the current password.
- `GET/POST /api/admin/users`, `PATCH /api/admin/users/[id]` (owner only): create with a one-time
  16-char temp password (`no-store`), change role, disable/enable, reset password. Role change,
  disable and reset revoke the target's sessions. Self-changes are refused; the last active owner
  is protected (apply, count, revert on zero). Audit `user.create/role/disable/enable/reset`.
- Temp passwords set `mustChangePassword`: `getAdminSession()` returns null for such users (every
  API 401s) and pages redirect to `/admin/change-password`. Only the password endpoint, that page
  and logout opt in with `allowMustChange`.
- UI: owner-only `/admin/users` + nav link; change-password form in Settings.
- Tests: `scripts/test-admin-users.mjs` (60 checks) must run against an ISOLATED database:
  `MONGODB_DB=bball_club_test npm start -- -p 3102`, then the script with the same env. It refuses
  database names without "test".
- Remaining: Phase 4.

### Phase 3c — Audit viewer ✅ done

- `/admin/audit` (owner only; others redirect to `/admin`): read-only table of `audit_logs`, 50 per
  page, newest first. Filters: action (known-actions dropdown), actor email (literal, case-
  insensitive), from/to dates (UTC, `to` inclusive). Bad input falls back to defaults.
- `ipHash` / `userAgent` are never selected. Code: `lib/audit-queries.ts`; indexes
  `action_created`, `actor_created` in `lib/mongodb.ts`.
- Tests: `scripts/test-admin-audit.mjs` (22 checks, isolated test database like 3b).
- Phase 3 is complete. Keep `AUDIT_ACTIONS` in `lib/audit-queries.ts` in sync when adding actions.

### Phase 4a — Security hardening ✅ done

- `middleware.ts` now runs on every page (static assets excluded): per-request nonce + strict CSP
  (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`, `object-src 'none'`,
  `style-src` keeps `'unsafe-inline'`, `img-src` allows `https:`). Next reads the nonce from the request
  header; `app/layout.tsx` passes it to the inline `js` class script. **Any new inline `<script>` must
  take `nonce` from `headers().get("x-nonce")`** or the browser will block it. Pages must stay dynamic.
- `next.config.ts`: HSTS (`max-age=31536000`, production only, no includeSubDomains/preload) and COOP.
- `X-Robots-Tag: noindex, nofollow` on `/admin/*` and `/api/admin/*`; `app/robots.ts` hides `/admin`, `/api/`.
- `lib/admin-limits.ts`: per-user limits via `auth_rate_limits` — 60 writes / 5 min and 10 exports /
  15 min (429 + `Retry-After`), applied after the role check on content, applications, users and
  password routes. Fails open if the limiter's database call fails.
- Account lockout: not added; login throttling (5/email, 20/IP per 15 min) already covers guessing.
- Tests: `scripts/test-admin-security.mjs` (19 checks; production build + isolated test database).
  Verified in the browser: public site and login page load with no CSP violations.
- Remaining Phase 4: CI + e2e + accessibility (4b), caching (4c), TOTP 2FA (4d), uploads (4e),
  email reset / monitoring / backups (4f).

### Phase 4b — CI, browser tests, accessibility ✅ done

- `npm run test:integration` (`scripts/run-integration.mjs`): seeds an isolated test database, starts a
  production server on 3102 and runs all six suites. Needs `npm run build` first and `MONGODB_URI`
  (from `.env.local` or the environment). The database name is forced to one containing "test".
- `npm run test:e2e` (Playwright, Chromium, `tests/e2e/`, config `playwright.config.ts`): production
  server on 3103 + isolated test database; seeds ephemeral `e2e.*` users/application and cleans up
  (restores seeded content) afterwards. Specs: public site (+CSP/console errors), login, content
  editing, applications, users, and axe accessibility scans (home, login, all admin pages).
  First time on a machine: `npx playwright install chromium`.
- `.github/workflows/ci.yml`: `checks` (typecheck, design check, build), `integration` and `e2e`
  (each with a throwaway `mongo:7` service container, no secrets). **Not yet run on GitHub.**
- Accessibility fixes: logo link name now contains its visible text; the two carousels are keyboard-
  focusable named groups; `--color-muted` darkened from #8a7b63 (3.69:1 on cream-100) to #6e624f
  (5.34:1 on cream-100, 4.73:1 on cream-200) so muted text meets WCAG AA. The axe scans now enforce
  serious/critical violations **including contrast** and pass on all scanned pages. Note: the orange
  `accent-soft` (#e0703a, 2.87:1) is not used for text anywhere axe scanned; do not use it for text.
- `npm audit` reports 1 high issue in `zod` < 4.6.6 (memory exhaustion on huge collections); fixing
  means a zod 3→4 major upgrade. Request bodies are size-capped, which limits exposure.
- Remaining Phase 4: only TOTP 2FA (4d) and email password reset, both deliberately skipped for now.

### Phase 4c — Content caching ✅ done

- Public content reads use `unstable_cache` (`lib/content-db.ts`), tagged `content:<id>`, 5-minute
  safety expiry. A successful content save calls `revalidateTag(tag, { expire: 0 })`, so admin edits
  are live on the next request. Failures and missing documents throw and are never cached, so the
  JSON seed fallback cannot get stuck in the cache.
- The admin editor reads uncached (revision-checked). **Edits made outside the admin** (`npm run
  db:seed`, Atlas UI, the club document which has no editor) can take up to 5 minutes to appear.
- Tests: `test-admin-crud` proves the cache is active (direct DB edit not served) and that a save
  invalidates it. Pages stay dynamic so the CSP nonce keeps working.

### Phase 4e — Image uploads (ImageKit) ✅ done

- `POST /api/admin/uploads` (owner/editor): multipart `file`, max 4 MB (Vercel bodies cap at ~4.5 MB),
  JPEG/PNG/WebP detected from the file's bytes (SVG/GIF/renamed files rejected), name sanitised, 20
  uploads / 15 min / user, audit `upload.image` (type + size only). The server uploads to ImageKit
  with the private key (`lib/imagekit.ts`, plain `fetch`, no SDK) into `/club` and returns the
  https URL, which must sit under `IMAGEKIT_URL_ENDPOINT`. Upstream errors become a generic 502.
- Env: `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` (see `.env.example`). Without them the API
  returns 503 and the editor hides the Upload button; pasting URLs still works. Settings shows status.
- Editor: image fields on Members / Hall of Fame / Activities get an Upload button that fills the
  URL field (still needs Save). Tests use `scripts/mock-imagekit.mjs` (21 API checks + 3 browser tests).
- **To do with real keys:** add both variables locally and on Vercel, then upload one real image and
  save it; confirm it renders on the public site (CSP allows `https:` images).

### Phase 4f — Monitoring and operations ✅ done (code part)

- `GET /api/health`: public, no-store, pings MongoDB; `{ ok, db }` with 200 or 503, no secrets. Point
  an uptime monitor (e.g. UptimeRobot, Better Stack) at `https://<domain>/api/health`.
- `lib/log.ts`: all server errors/warnings are one JSON line (`level`, `scope`, `message`, `error`,
  `time`) searchable in Vercel Logs; connection-string credentials are redacted. Use `logError` /
  `logWarn`, not `console.*`. No Sentry; add it later if needed (mind the CSP).
- **Backups (manual, in Atlas — not done by code):**
  1. Atlas > Database > Backup: enable Cloud Backup if your tier allows it (M10+). The free M0 tier
     has **no** automated snapshots; use a scheduled `mongodump` instead or upgrade before launch.
  2. Keep at least 7 daily snapshots; note the restore window.
  3. Do one test restore into a scratch cluster and check `content`, `admin_users`, `applications`.
  4. Network Access `0.0.0.0/0` is required for Vercel; keep strong DB credentials and rotate them
     (and `IP_HASH_SALT`, `IMAGEKIT_PRIVATE_KEY`) if they ever leak. Rotating the salt resets throttles.
- Email password reset: intentionally skipped (owners reset on the Users page). TOTP 2FA: skipped.

### Phase 3 — Applications, admins, audit UI

- Status workflow: `new → reviewing → shortlisted → accepted → rejected`
  (`PATCH /api/admin/applications/[id]`), with internal notes array
  `{ text, authorEmail, createdAt }`; audit every transition.
- List: pagination (`page`, `limit`), `status` filter, search by name/email; detail panel
  with message and metadata; never expose raw IP (only `ipHash`).
- CSV export: `GET /api/admin/applications/export` — owner/editor only, RFC-4180 escaping,
  `Cache-Control: no-store`, audit `export` (who, count, filter).
- Admin-user management (owner only): create, change role, disable (revoke sessions),
  reset password (returns one-time temp), prevent self-disable/last-owner removal.
- Password change: `POST /api/admin/auth/password` (current + new, min length, revoke all
  other sessions).
- Audit viewer: paginated `audit_logs` table with filters (actor, entity, date).

### Phase 4 — Hardening & polish

- Content caching (`unstable_cache` + tags) if traffic grows; verification after each write.
- Email-based password reset + optional TOTP 2FA (needs an email provider decision).
- Image uploads (Vercel Blob: MIME/size allowlist, admin-only route) as an alternative to
  image URLs.
- Rate limiting for admin mutations; account lockout after repeated failures.
- Error monitoring (Sentry or Vercel logs), uptime checks, Atlas backups schedule.
- Accessibility pass on admin tables/forms; responsive check at 360/768/1024/1440.
- End-to-end tests (Playwright) for login + one CRUD path; CI workflow.
- `robots.txt`/`X-Robots-Tag` verification for `/admin`; CSP review.

---

## 6. Testing

Existing scripts:

- `scripts/test-admin.mjs` — 15 checks: redirects, CSRF, login, cookie, DB session,
  authenticated pages, middleware 401, logout revocation, rate limit, live DB→page content.
  It creates/removes an ephemeral admin and cleans rate-limit entries.
- `scripts/test-admin-crud.mjs` — 14 checks: editor/viewer login, read snapshot,
  unauthenticated 401, viewer 403, unknown doc 404, operator-key/duplicate-jersey/bad-URL
  422s, valid save, live public update, stale-revision 409, value-free audit entry. Restores
  the original `members` document and removes its users/audit rows.
- `scripts/test-join.mjs`, `scripts/test-mongo.mjs` as before.

Still recommended (Phase 3/4):

- Application status transitions + notes; CSV export escaping and `no-store`.
- Session expiry (set `expiresAt` in the past in Mongo → next request redirects/401).
- Password change revokes other sessions.
- Oversized content body → `413` (the cap is 512 KB; the UI never approaches it).

---

## 7. Deployment & operations checklist

1. Push the branch (`git push origin master`).
2. Vercel: Framework Preset **Next.js**, Output Directory **empty**, Node **22.x**,
   env vars `MONGODB_URI`, `MONGODB_DB`, `IP_HASH_SALT`.
3. **Atlas → Network Access:** allow `0.0.0.0/0` (Vercel serverless has no fixed egress).
   Without this, `/api/join` and `/admin` login fail with a 6-second Mongo timeout.
4. Seed production DB once (same cluster/database as local if shared):
   `npm run db:seed`, then `npm run admin:create -- <owner email> owner`.
5. Verify after deploy:
   - `/` renders (dynamic, reads Mongo).
   - `/admin/login` loads; login succeeds; `/admin` 200; logout redirects.
   - `/admin` and `/api/admin/*` return 401/redirect without a cookie.
   - `/admin/members` edit saves, the public page updates, and a stale revision returns 409.
   - Join form returns `201` and the row appears in `applications`.
6. Backups: enable Atlas snapshots; keep `content/*.json` in sync via `db:seed` only when
   intentional (it **overwrites** content docs).

Known deployment constraints:

- Static export is gone (`next.config.ts` has no `output: "export"`); the app needs a Node
  runtime.
- `typescript.ignoreBuildErrors` is `true`; run `npm run typecheck` in CI.
- Admin cookies are `Secure` in production; HTTPS required (Vercel provides it).
- Build must not query Mongo (`NEXT_PHASE=phase-production-build` guard in
  `lib/content-db.ts`).

---

## 8. Known issues / decisions

- Password change UI is missing; reset via `npm run admin:create` (updates the same user).
  The current owner temp password was shared in chat — reset it before production.
- Role enforcement is live for content writes (`viewer` → 403); application/admin-user
  endpoints in Phase 3 must repeat the same check.
- Content editing saves the whole document. Deleting a row is permanent (no archive flag);
  add `archived` fields before removing historical players/staff.
- Content fallback to JSON seeds keeps the public site up if Mongo is unreachable, but it
  can mask configuration errors (warning is logged).
- Sessions: 8h idle / 7d absolute, cookie fixed at 7d; no rotation on privilege change yet
  (revoke on password change in Phase 3).
- CSRF protection relies on SameSite=Lax + Origin/Host checks (no double-submit token).
- Admin pages are dynamic (cookie access), so each request queries Mongo — acceptable for
  club-scale traffic; add caching in Phase 4 if needed.
- Public content and admin content share one database user; consider separate users
  (public read-only vs admin read/write) for least privilege.
- Middleware only checks cookie presence (Edge runtime cannot reach Mongo); never treat it
  as authorization — always call `getAdminSession`/`requireAdminPage`.

---

## 9. File map (admin-relevant)

```
middleware.ts
lib/auth.ts            scrypt, sessions, guards, login throttling, canEditContent
lib/audit.ts           audit writes
lib/http.ts            request guards
lib/content-db.ts      Mongo content reads, snapshots + fallback
lib/admin-queries.ts   applications/audit read models
lib/admin-schemas.ts   strict zod schemas for content writes
lib/admin-fields.ts    field map for the content editor
lib/content.ts         types + helpers
components/admin-content-editor.tsx  schema-driven editor (client)
app/admin/…            login + protected pages (content editors)
app/api/admin/auth/…   login/logout
app/api/admin/content/[doc]/route.ts  content GET + revision-safe PATCH
scripts/seed-content.mjs
scripts/create-admin.mjs
scripts/test-admin.mjs
scripts/test-admin-crud.mjs
```

Public components receive content via props from `app/(site)/page.tsx` — no component
imports content data directly anymore. Keep it that way when adding admin features.
