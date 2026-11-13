# Applications workflow (Phase 3a) — design

Status: approved in chat 2026-11-12. Part of Phase 3 in `handover.md`; password change,
admin-user management and the audit viewer are separate sub-projects (3b, 3c).

## Goal

Let officers run recruiting from the admin without touching the database: move join
applications through a status pipeline, keep internal notes, find applications quickly and
export them to CSV. Every write follows the existing admin API pipeline and is audited.

## Decisions (from the owner)

- Build order: applications first.
- CSV export: `owner` and `editor` only. `viewer` gets 403.
- Accepting an application only changes its status (no roster automation).

## Data

`applications` documents (existing: name, email, phone, position, year, message, consent,
status, source, ipHash, userAgent, createdAt) gain:

| Field | Shape |
| --- | --- |
| `status` | `new \| reviewing \| shortlisted \| accepted \| rejected` (missing = `new`) |
| `notes` | `[{ id: string, text: string (1–1000), authorEmail: string, createdAt: Date }]`, max 100 |
| `updatedAt` | `Date`, set on every admin write |

Any status may move to any other status (so mistakes are recoverable). Indexes added in
`lib/mongodb.ts`: `{ status: 1, createdAt: -1 }`, `{ email: 1 }`.

## API

All admin endpoints use the standard pipeline: same-origin (403) → JSON content type (415)
→ body cap (413) → session (401) → role (403) → strict zod (422) → fixed Mongo query shapes
→ write + audit → JSON. Errors never leak internals; log with an `[api/admin/applications]`
prefix.

### `PATCH /api/admin/applications/[id]`

Body is exactly one of `{ status }` or `{ addNote: string }` (strict union).
Roles: `owner`, `editor`. Invalid ObjectId or unknown id → 404. Adding a note beyond the cap
→ 422.

- Status change: `$set { status, updatedAt }`; audit `application.status` with
  `changes: ["status:<from>→<to>"]`.
- Note: `$push notes` (author = session email); audit `application.note` with
  `changes: ["note"]` (never the note text).
- Response: `200 { ok: true, application }` with the updated safe view.

### `GET /api/admin/applications/export`

Query: `status`, `q` (same semantics as the list). Roles: `owner`, `editor`.
Streams a UTF-8 CSV with a BOM, columns: name, email, phone, position, year, status,
received, message. RFC 4180 quoting; cells starting with `= + - @` or tab/CR are prefixed
with `'` to defuse spreadsheet formula injection. Headers: `Content-Type: text/csv`,
`Content-Disposition: attachment`, `Cache-Control: no-store`. Audit `application.export`
with the row count and filter names (not values). Hard cap: 5,000 rows.

`ipHash` and `userAgent` are never returned by any endpoint or exported.

## List and detail UI

`/admin/applications` (server component) reads search params: `page` (default 1),
`limit` (fixed 25), `status` (enum, else ignored), `q` (trimmed, ≤80 chars, regex-escaped,
case-insensitive match on name or email). Sorted newest first. Shows total count, per-status
chips, a search box, previous/next, and an "Export CSV" link (hidden for viewers).

Clicking a row opens a detail panel (client component) with the full message, metadata, a
status select, and the notes list with an add-note form. Viewers see everything with the
controls disabled. Saving updates in place (no full reload); failures show an inline error.
UI uses the existing 8px grid and `type-*` classes; `npm run check:design` must pass.

## Code layout

| File | Responsibility |
| --- | --- |
| `lib/application-schemas.ts` | status enum, PATCH body schemas, list query schema |
| `lib/application-queries.ts` | list/filter/paginate, get by id, update status, add note (admin read/write model) |
| `lib/csv.ts` | pure `toCsv(rows)` with RFC 4180 + formula defusing |
| `app/api/admin/applications/[id]/route.ts` | PATCH |
| `app/api/admin/applications/export/route.ts` | GET CSV |
| `components/admin-application-panel.tsx` | client detail panel |
| `app/admin/(protected)/applications/page.tsx` | list page |

`lib/admin-queries.ts` keeps overview stats; its `getApplications` is replaced by the new
query module.

## Testing

`scripts/test-admin-applications.mjs` (same style as `test-admin-crud.mjs`; needs the dev
server): editor/viewer logins; unauthenticated 401; viewer 403 on PATCH and export; invalid
id 404; bad status/unknown keys 422; status transition persisted + audited; note added and
audited without text; note cap; search and pagination; CSV quoting and formula defusing;
`no-store` header; export audited; cleans up all records it creates. A pure check for
`toCsv` runs without the server.

## Out of scope

Roster automation, email notifications, bulk actions, soft delete, application deletion.
