# Admin dashboard — development handover

Status: **Phase 1 complete**. This document is the continuation guide for the remaining
admin-site work (Phases 2–4), plus the current architecture, conventions and deployment
checks.

Last updated: 2026-11-10 · Commit: `98e849f` (Phase 1)

---

## 1. What exists today

### Public site

- One-page portfolio (`app/(site)/page.tsx`) with hero, roster (men/women switch, filters,
  featured carousel), Hall of Fame, achievements, activities and the join form.
- Content is read from **MongoDB** on every request (pages are dynamic). `content/*.json`
  are **seed files/fallback** only.
- Join form → `POST /api/join` → validated with zod, rate limited (3/email + 10/IP per
  24h), stored in `applications`.

### Admin (Phase 1 — read-only)

- `/admin/login` — email + password, no public signup.
- Protected area `/admin`: overview, members, hall of fame, achievements, activities,
  applications (read-only lists), settings (account + env checks).
- Auth: custom DB-backed sessions, scrypt password hashes, httpOnly cookie, middleware
  gate, server-side session validation, audit log, login throttling.
- Tooling: `npm run db:seed`, `npm run admin:create`, `scripts/test-admin.mjs` (15 checks).

### Not built yet

- No CRUD (create/edit/archive/delete) for any content.
- No application status workflow, notes, CSV export.
- No admin-user management, password change, audit viewer, 2FA, password reset email.
- No image uploads (image URL fields are used instead).

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

Phase 1 only authenticates; **role enforcement must be added with the first write
endpoints.**

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

### Phase 2 — Content CRUD (next)

**Goal:** full CRUD for members, hall of famers, achievements and activities, live
immediately, audit-logged, revision-safe.

Suggested design:

- **Generic content endpoint** (fastest, atomic):
  - `GET /api/admin/content/[doc]` → `{ data, revision }`
  - `PATCH /api/admin/content/[doc]` body `{ data, expectedRevision }` →
    validate whole document with a zod schema → `content.updateOne({ _id, revision: expectedRevision }, { $set: { data, updatedAt, updatedBy }, $inc: { revision: 1 } })` → if `matchedCount === 0` return `409` with current revision → audit changed top-level keys → `200 { revision }`.
  - Body cap for admin writes: 512 KB (members doc is large; the public form cap is 10 KB).
- **Schemas** in `lib/admin-schemas.ts` (reuse entity types from `lib/content.ts`):
  string length caps, jersey numbers 0–99, unique roster numbers, enum roles, URLs
  (`https://…`) for image fields, awards string arrays, required fields.
- **UI:** table + edit drawer/page per section.
  - Members: roster tabs, search, create/edit/archive, featured toggle, filter metadata
    (`monthlySessions`, `risingStar`, `joined`, `awards`), staff editor.
  - Hall of Fame: retired jerseys and inductees, reorder.
  - Achievements: summary stats + items.
  - Activities: gallery + upcoming events.
  - Unsaved-changes guard, inline field errors, 409 conflict banner ("someone else edited
    this — reload").
- **Delete policy:** prefer archive/soft-delete flags for players (keeps statistics and
  history); hard delete only for typo rows, behind a typed confirmation. If archived
  players must stay hidden, the public roster/filter code needs an `archived` filter.
- **Concurrency:** always send/verify `expectedRevision`; never blind-overwrite.
- **Audit:** `changes` = changed field names (never values/PII), plus `entityId`/revision.
- **Role check:** writes require `owner` or `editor`; `viewer` gets `403`.

Acceptance: create/edit/archive visible on the public site instantly; 409 on stale
revision; audit entries written; validation rejects operator keys, bad URLs, duplicate
jersey numbers; tests added.

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
- `scripts/test-join.mjs`, `scripts/test-mongo.mjs` as before.

Extend for Phase 2/3 (suggested `scripts/test-admin-crud.mjs`):

- Unauthenticated write → `401`; `viewer` write → `403`.
- Invalid payloads: unknown keys (`$where`, dotted paths), oversized body, bad enums,
  duplicate jersey number, bad image URL → `422`.
- Revision conflict → `409`, valid next revision succeeds.
- Audit entry written per mutation; changes contain no PII values.
- Application status transitions + notes; CSV export escaping and `no-store`.
- Session expiry (set `expiresAt` in the past in Mongo → next request redirects/401).
- Password change revokes other sessions.

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
- Role permissions are defined but **not enforced** for writes yet (there are no writes).
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
lib/auth.ts            scrypt, sessions, guards, login throttling
lib/audit.ts           audit writes
lib/http.ts            request guards
lib/content-db.ts      Mongo content reads + fallback
lib/admin-queries.ts   applications/audit read models
lib/content.ts         types + helpers
app/admin/…            login + protected pages
app/api/admin/auth/…   login/logout
scripts/seed-content.mjs
scripts/create-admin.mjs
scripts/test-admin.mjs
```

Public components receive content via props from `app/(site)/page.tsx` — no component
imports content data directly anymore. Keep it that way when adding admin features.
