# Applications Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Officers can move join applications through a status pipeline, keep notes, search/paginate, and export CSV from the admin.

**Architecture:** Server-rendered list page with a client detail panel. Two new admin API routes copy the content API's guard pipeline (`app/api/admin/content/[doc]/route.ts`). Queries live in one module; CSV serialisation is a pure module.

**Tech Stack:** Next.js 16 route handlers, MongoDB driver, zod 3, existing `lib/auth.ts` / `lib/http.ts` / `lib/audit.ts` / `lib/rate-limit.ts` (`hashIp`).

**Spec:** `docs/superpowers/specs/2026-11-12-applications-workflow-design.md`

## Global Constraints

- Statuses: `new | reviewing | shortlisted | accepted | rejected`; missing status reads as `new`; any→any transition allowed.
- Notes: text 1–1000 chars, max 100 per application; audit never stores note text or other field values.
- Write/export roles: `owner`, `editor` (use `canEditContent(role)` from `lib/auth.ts`); `viewer` → 403.
- Pipeline order: same-origin 403 → JSON content type 415 → body cap 413 → session 401 → role 403 → strict zod 422 → write + audit.
- `ipHash` / `userAgent` never returned or exported.
- List: `limit` fixed 25, `q` ≤ 80 chars regex-escaped, newest first. Export cap 5,000 rows.
- CSV: UTF-8 BOM, RFC 4180 quoting, cells starting `= + - @`, tab or CR prefixed with `'`; `Cache-Control: no-store`.
- UI: 8px spacing grid and `type-*` classes; `npm run check:design` must pass; `npm run typecheck` must pass.

## Review Focus

- Search `q` containing regex metacharacters (`.*`, `(`, `\`) matches literally and never errors or hangs.
- Message/name starting with `=HYPERLINK(...)` is defused in CSV; embedded quotes, commas and newlines stay in one cell.
- `page` beyond the last page or non-numeric (`abc`, `-1`, `0`) falls back to a valid page instead of 500.
- Two concurrent note posts both persist (use `$push`, not read-modify-write).
- Legacy applications with no `status`/`notes` fields display as `new` with zero notes and can be updated.

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/application-schemas.ts` | statuses, PATCH body union, list query parsing |
| `lib/csv.ts` | pure `toCsv` |
| `lib/application-queries.ts` | list, get, update status, add note, export rows |
| `app/api/admin/applications/[id]/route.ts` | PATCH |
| `app/api/admin/applications/export/route.ts` | GET CSV |
| `components/admin-application-panel.tsx` | client detail panel |
| `app/admin/(protected)/applications/page.tsx` | list page (modify) |
| `lib/mongodb.ts` | add indexes (modify) |
| `lib/admin-queries.ts` | remove `getApplications` (modify) |
| `scripts/test-admin-applications.mjs` | integration tests |

---

### Task 1: Schemas, CSV and queries

**Files:**
- Create: `lib/application-schemas.ts`, `lib/csv.ts`, `lib/application-queries.ts`
- Modify: `lib/mongodb.ts` (indexes `{status:1,createdAt:-1}` named `status_created`, `{email:1}` named `email`), `lib/admin-queries.ts`

**Interfaces:**
- Produces:
  - `APPLICATION_STATUSES` const tuple and `type ApplicationStatus`
  - `applicationPatchSchema: z.ZodType<{ status: ApplicationStatus } | { addNote: string }>` (strict union)
  - `parseListQuery(params: URLSearchParams | Record<string, string | string[] | undefined>): { page: number; status?: ApplicationStatus; q?: string }`
  - `toCsv(headers: string[], rows: string[][]): string` (BOM-prefixed, CRLF line ends)
  - `interface ApplicationView { id: string; name; email; phone; position; year; message; status: ApplicationStatus; createdAt: string; updatedAt?: string; notes: { id: string; text: string; authorEmail: string; createdAt: string }[] }`
  - `listApplications(query): Promise<{ items: ApplicationView[]; total: number; page: number; pages: number; counts: Record<ApplicationStatus, number> }>`
  - `getApplication(id: string): Promise<ApplicationView | null>` (null for invalid ObjectId)
  - `setApplicationStatus(id, status, now): Promise<{ view: ApplicationView; from: ApplicationStatus } | null>`
  - `addApplicationNote(id, text, authorEmail, now): Promise<ApplicationView | "limit" | null>`
  - `exportApplications(query): Promise<ApplicationView[]>` (≤ 5,000)

- [ ] **Step 1: Write the failing test** — create `scripts/test-admin-applications.mjs` with the harness from `scripts/test-admin-crud.mjs` (ephemeral editor/viewer, cleanup of users, audit rows and seeded applications) plus a seeder inserting 3 applications (names `Test Alpha`, `=HYPERLINK("x")`, `Test, "Quoted"\nLine`). First check: `GET /admin/applications?status=bogus&page=abc` returns 200 for an editor session cookie.
- [ ] **Step 2: Run it** — start `npm start -- -p 3100` after `npm run build`, then `node --env-file=.env.local scripts/test-admin-applications.mjs`. Expected: harness runs; later checks FAIL (not yet implemented).
- [ ] **Step 3: Implement the modules above.** List query uses `$or` of `{name}`/`{email}` with an escaped case-insensitive `$regex`; `status: "new"` filter also matches documents lacking `status` (`$in`/`$exists:false`). Clamp `page` to `[1, pages]`; invalid values → 1. Map legacy docs to defaults in one `toView` function.
- [ ] **Step 4: `npm run typecheck`** — Expected: no errors.
- [ ] **Step 5: Commit** — `feat(admin): application schemas, queries and CSV serialiser`

### Task 2: PATCH endpoint (status and notes)

**Files:**
- Create: `app/api/admin/applications/[id]/route.ts`
- Test: `scripts/test-admin-applications.mjs`

**Interfaces:**
- Consumes: Task 1 `applicationPatchSchema`, `setApplicationStatus`, `addApplicationNote`; `canEditContent`, `getAdminSession`, `logAudit`, `hashIp`, `clientIp`, `isSameOrigin`, `hasJsonContentType`, `declaredBodyTooLarge` (body cap 4,000 bytes).
- Produces: `PATCH /api/admin/applications/:id` → `200 { ok: true, application: ApplicationView }`; errors 401/403/404/413/415/422 per Global Constraints. Audit actions `application.status` (`changes: ["status:new→reviewing"]`) and `application.note` (`changes: ["note"]`).

- [ ] **Step 1: Add failing checks** — unauthenticated 401; viewer 403; cross-origin 403; wrong content type 415; invalid id 404; `{status:"bogus"}`, `{status:"accepted", extra:1}` and `{}` → 422; editor `{status:"reviewing"}` → 200 and DB shows it; audit row exists with `changes` and no note text; `{addNote:"hello"}` persists with author email; 101st note → 422; two parallel note posts both persist; legacy doc (insert without `status`) can be moved to `shortlisted`.
- [ ] **Step 2: Run** — Expected: new checks FAIL.
- [ ] **Step 3: Implement** the route (copy the guard order from the content route; `export const runtime = "nodejs"; dynamic = "force-dynamic"`; add `POST/GET/PUT/DELETE` → 405 like the content route). Note push uses `$push` with `$expr` size guard in the filter so the cap is atomic.
- [ ] **Step 4: Run tests and `npm run typecheck`** — Expected: all PASS.
- [ ] **Step 5: Commit** — `feat(admin): application status and notes endpoint`

### Task 3: CSV export endpoint

**Files:**
- Create: `app/api/admin/applications/export/route.ts`
- Test: `scripts/test-admin-applications.mjs`

**Interfaces:**
- Consumes: Task 1 `parseListQuery`, `exportApplications`, `toCsv`; same auth helpers.
- Produces: `GET /api/admin/applications/export?status=&q=` → `text/csv` attachment `applications-YYYY-MM-DD.csv`; columns `name,email,phone,position,year,status,received,message`; audit `application.export` with `changes: ["rows:<n>", "filter:status", "filter:q"]` (names only).

- [ ] **Step 1: Add failing checks** — 401 unauthenticated; viewer 403; editor 200 with `cache-control` containing `no-store`, `content-type` starting `text/csv`, body starting with BOM; seeded `=HYPERLINK("x")` appears as `'=HYPERLINK(""x"")` inside quotes; the `Test, "Quoted"\nLine` row parses back to 8 cells using a minimal RFC 4180 parser in the test; `?status=accepted` filters rows; no `ipHash`/`userAgent` text in body; audit row written.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the route (no body, so only same-origin is not needed for GET; session + role + audit). Return `new Response(csv, { headers })`.
- [ ] **Step 4: Run tests, `npm run typecheck`** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(admin): application CSV export`

### Task 4: List page and detail panel

**Files:**
- Create: `components/admin-application-panel.tsx`
- Modify: `app/admin/(protected)/applications/page.tsx`
- Test: `scripts/test-admin-applications.mjs`

**Interfaces:**
- Consumes: Task 1 `listApplications`, `parseListQuery`, `ApplicationView`; Task 2 PATCH endpoint; `requireAdminPage()` user role for `canEdit`.
- Produces: `<AdminApplicationPanel application={ApplicationView} canEdit={boolean} />` (client; select changes status, form adds note, updates in place, inline error on failure, controls disabled when `!canEdit`).

- [ ] **Step 1: Add failing checks** — page HTML for an editor contains seeded names, status chips with counts, the Export CSV link and search form; viewer HTML has no Export link; `?q=.*` returns 200 with no seeded rows (literal match); `?page=999` returns 200 showing the last page; `?q=alpha&status=new` filters; legacy doc appears with `new`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the page (server component reading `searchParams`; GET form for search/status; previous/next links preserving filters; row opens the panel — one panel rendered per row inside `<details>`, no JS needed for the list) and the panel component. Remove the stale "arrive in Phase 3" copy.
- [ ] **Step 4: Verify** — `npm run typecheck`, `npm run check:design`, `npm run build`, rerun the full test script (all PASS), then open `/admin/applications` in the browser at 360 and 1440 widths and check layout.
- [ ] **Step 5: Commit** — `feat(admin): applications list, search and detail panel`

### Task 5: Docs and regression

**Files:**
- Modify: `handover.md` (Phase 3a done; test script and API rows; known issues), `README.md` if it lists admin scripts

- [ ] **Step 1: Update docs** to reflect delivered scope and remaining 3b/3c.
- [ ] **Step 2: Regression** — run `scripts/test-admin.mjs`, `scripts/test-admin-crud.mjs`, `scripts/test-admin-applications.mjs` against the production build; Expected: all PASS.
- [ ] **Step 3: Commit** — `docs: record applications workflow`
