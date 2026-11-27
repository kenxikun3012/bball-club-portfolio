# Admin Users and Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners manage admin accounts; every user can change their own password; temp passwords force a change at first login.

**Architecture:** Extend `lib/auth.ts` so sessions of users who must change their password are unusable by default; add a pure password-policy module, a user-queries module and three routes copying the standard admin pipeline from `app/api/admin/applications/[id]/route.ts`.

**Tech Stack:** Next.js 16 route handlers, MongoDB driver, zod 3, Node `crypto` scrypt via `hashPassword`/`verifyPassword`.

**Spec:** `docs/superpowers/specs/2026-11-12-admin-users-design.md`

## Global Constraints

- Roles: `owner | editor | viewer`; all users endpoints are owner-only.
- Pipeline order: same-origin 403 → JSON 415 → body cap 4,000 bytes 413 → session 401 → role 403 → strict zod 422 → write + audit.
- Password: min 8, max 200, must not equal email, must differ from current, must not contain the email local part (≥ 3 chars, case-insensitive).
- Temp password: 16 chars from `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789` via `crypto.randomBytes`; returned once with `Cache-Control: no-store`; never stored, logged or audited.
- Throttle: 5 password attempts per 15 minutes per user (`pw:user:<id>` in `auth_rate_limits`).
- Never return `passwordHash`, `failedAttempts`, `lockedUntil`, session data.
- `npm run typecheck`, `npm run check:design`, `npm run build` pass; UI uses the 8px grid and `type-*` classes.

## Review Focus

- Last owner demoted/disabled, including two owners doing it to each other at the same time, leaves at least one active owner.
- A user with `mustChangePassword` cannot use any admin API or page except the password endpoint/page; cookie from before the reset is dead.
- Email casing/whitespace (`  Bob@X.com `) creates one lowercase user; a second create with different casing is a 409, not a duplicate.
- Password containing the email local part in different case, or only whitespace, is rejected; a 200-char password works; 201 chars is 422.
- Changing a password revokes other sessions but the current browser stays signed in.

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/password-policy.ts` | `validateNewPassword`, `generateTempPassword` (pure) |
| `lib/auth.ts` | `mustChangePassword`, `getAdminSession` option, redirect, throttle, other-session revoke (modify) |
| `lib/user-queries.ts` | list/create/update users, last-owner guard |
| `app/api/admin/auth/password/route.ts` | change own password |
| `app/api/admin/users/route.ts` | GET list, POST create |
| `app/api/admin/users/[id]/route.ts` | PATCH role/disabled/reset |
| `app/admin/change-password/page.tsx` | forced-change page |
| `components/admin-password-form.tsx` | client form (change-password + Settings) |
| `app/admin/(protected)/users/page.tsx`, `components/admin-users-panel.tsx` | owner UI |
| `components/admin-shell.tsx`, `app/admin/(protected)/settings/page.tsx` | nav link, form, copy (modify) |
| `scripts/test-admin-users.mjs` | integration tests |

---

### Task 1: Password policy and auth changes

**Files:**
- Create: `lib/password-policy.ts`
- Modify: `lib/auth.ts`
- Test: `scripts/test-admin-users.mjs` (harness from `scripts/test-admin-applications.mjs`: ephemeral owner/editor/viewer, cleanup of users, sessions, audit rows, throttle keys)

**Interfaces:**
- Produces:
  - `validateNewPassword(password: string, ctx: { email: string; current?: string }): string | null`
  - `generateTempPassword(): string`
  - `AdminUser.mustChangePassword?: boolean`
  - `getAdminSession(options?: { allowMustChange?: boolean }): Promise<SessionContext | null>` (default `null` for must-change users)
  - `requireAdminPage()` redirects must-change users to `/admin/change-password`
  - `consumePasswordAttempt(userId: ObjectId): Promise<{ allowed: boolean; retryAfterSeconds: number }>`, `resetPasswordAttempts(userId: ObjectId): Promise<void>`
  - `destroyOtherAdminSessions(userId: ObjectId, keepToken: string): Promise<void>`

- [ ] **Step 1: Write failing tests** — in the new script add the harness, then checks: a seeded user with `mustChangePassword: true` can log in but `GET /api/admin/applications/export` is 401 and `GET /admin` redirects (307) to `/admin/change-password`; a normal user is unaffected. Policy checks run through the endpoint in Task 2.
- [ ] **Step 2: Run** — `npm run build && npm start -- -p 3101` then `TEST_BASE=http://127.0.0.1:3101 node --env-file=.env.local scripts/test-admin-users.mjs`. Expected: must-change checks FAIL.
- [ ] **Step 3: Implement** the policy module and auth changes. Tokens are SHA-256 hashed in `admin_sessions`; `destroyOtherAdminSessions` deletes `{ userId, tokenHash: { $ne: hashToken(keepToken) } }`. Throttle reuses the private `consumeAuthAttempt` with key `pw:user:<id>`, limit 5.
- [ ] **Step 4: Run tests and `npm run typecheck`** — Expected: PASS.

### Task 2: Change-password endpoint, page and form

**Files:**
- Create: `app/api/admin/auth/password/route.ts`, `app/admin/change-password/page.tsx`, `components/admin-password-form.tsx`
- Modify: `app/admin/(protected)/settings/page.tsx` (embed form, update "Coming next" copy)
- Test: `scripts/test-admin-users.mjs`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `POST /api/admin/auth/password` → `200 { ok: true }`; errors 401/403/415/413/422/429. `<AdminPasswordForm forced?: boolean />` (client; on success shows a message, and when `forced` navigates to `/admin`).

- [ ] **Step 1: Add failing checks** — unauthenticated 401; wrong current → 403; 7 chars, equals email, contains local part (different case), equals current, 201 chars → 422; 200-char password succeeds; throttle returns 429 after 5 bad attempts within a fresh user; success keeps the current session working and invalidates a second session cookie obtained by a separate login; must-change user can call it, after which the gate lifts (admin APIs work); audit `auth.password` exists without password text.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** route (pipeline order, `allowMustChange: true`), page (server component using `getAdminSession({ allowMustChange: true })`; no session → `/admin/login`; not required → `/admin`) and form.
- [ ] **Step 4: Run tests, `npm run typecheck`, `npm run check:design`** — Expected: PASS.

### Task 3: Users API

**Files:**
- Create: `lib/user-queries.ts`, `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`
- Test: `scripts/test-admin-users.mjs`

**Interfaces:**
- Consumes: Task 1 (`generateTempPassword`, `hashPassword`, `destroyAllAdminSessions`).
- Produces (`lib/user-queries.ts`):
  - `interface AdminUserView { id: string; email: string; role: AdminRole; disabled: boolean; mustChangePassword: boolean; lastLoginAt: string | null; createdAt: string }`
  - `listUsers(): Promise<AdminUserView[]>`
  - `createUser(email: string, role: AdminRole, passwordHash: string): Promise<AdminUserView | "duplicate">`
  - `updateUser(id: string, change: { role?: AdminRole; disabled?: boolean; passwordHash?: string }, actorId: ObjectId): Promise<{ view: AdminUserView; before: { role: AdminRole; disabled: boolean } } | "not-found" | "self" | "last-owner">`
- Routes per spec: `GET/POST /api/admin/users`, `PATCH /api/admin/users/[id]`; audit actions `user.create`, `user.role`, `user.disable`, `user.enable`, `user.reset`.

- [ ] **Step 1: Add failing checks** — 401 / 403 for editor and viewer on GET, POST, PATCH; list contains no `passwordHash`; create returns `tempPassword` (16 chars) with `no-store`, stored doc has only a hash and `mustChangePassword: true`; `"  Bob@X.com "` stores `bob@x.com`; recreate with other casing → 409; bad email/role/extra keys → 422; invalid id 404; owner PATCH role/disabled/reset on another user works and revokes that user's session; reset returns a new temp password and the old password no longer logs in; disabled user cannot log in, re-enabled can; self role change and self disable → 403; with exactly one active owner, demoting/disabling that owner (via a second owner then removing it) → 409; two owners demoting each other in parallel leaves ≥ 1 active owner; audit rows exist and contain neither temp passwords nor hashes.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** queries and routes. `updateUser`: refuse self changes; apply update; for demote/disable of an owner, count active owners (`role: "owner", disabled: {$ne: true}`) and revert and return `"last-owner"` when zero; delete sessions on role change, disable and reset.
- [ ] **Step 4: Run tests and `npm run typecheck`** — Expected: PASS.

### Task 4: Users page, nav and docs

**Files:**
- Create: `app/admin/(protected)/users/page.tsx`, `components/admin-users-panel.tsx`
- Modify: `components/admin-shell.tsx` (owner-only "Users" link), `handover.md`, `README.md` if it lists admin scripts
- Test: `scripts/test-admin-users.mjs`

**Interfaces:**
- Consumes: Task 3 `listUsers`, `AdminUserView`; users API.
- Produces: `<AdminUsersPanel initialUsers={AdminUserView[]} currentUserId={string} />` (client: add form, role select, enable/disable, reset, one-time password panel with copy and dismiss; self row has controls disabled).

- [ ] **Step 1: Add failing checks** — editor/viewer GET `/admin/users` redirect away (307 to `/admin`); owner gets 200 containing the seeded emails and no hashes; nav HTML for owner includes `/admin/users`, for editor does not.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** page, panel and nav link; update `handover.md` (3b done, API rows, test script, known issue about shared owner password resolved by the reset flow).
- [ ] **Step 4: Verify** — `npm run typecheck`, `npm run check:design`, `npm run build`, then run `test-admin-users.mjs`, `test-admin-applications.mjs`, `test-admin.mjs`, `test-admin-crud.mjs` against the build; Expected: all PASS. Open `/admin/users` at 360 and 1440 px.
