# Admin users and password change (Phase 3b) — design

Status: design approved in chat 2026-11-12. Part of Phase 3 in `handover.md`. The audit
viewer is sub-project 3c.

## Goal

Owners manage who can log in (create, change role, disable/enable, reset password). Every
user can change their own password. No action can lock the club out, and no secret is ever
stored in plaintext, logged or audited.

## Decisions (from the owner)

- New and reset passwords: server-generated one-time temporary password, shown once to the
  owner; the user must change it at first login.
- Password rules: minimum 8 characters, maximum 200, must not equal the account email.
  Added by me (cheap, same spirit): must differ from the current password and must not
  contain the email's local part (before `@`, case-insensitive, local part ≥ 3 chars).
- UI: owner-only `/admin/users` page with nav link; password change form in Settings.

## Data

`admin_users` gains `mustChangePassword?: boolean` (missing = false). Existing
`passwordChangedAt`, `disabled`, `lastLoginAt` are reused. No new collections.

## Auth changes (`lib/auth.ts`)

- `AdminUser.mustChangePassword?: boolean`.
- `getAdminSession(options?: { allowMustChange?: boolean })`: **by default returns `null`**
  when the user must change their password (secure by default: every API 401s). Only the
  password endpoint and the change-password page pass `allowMustChange: true`.
- `requireAdminPage()`: if the user must change their password, `redirect("/admin/change-password")`.
- `consumePasswordAttempt(userId)` / `resetPasswordAttempts(userId)`: 5 attempts per 15
  minutes, key `pw:user:<id>`, reusing `auth_rate_limits`.
- `destroyOtherAdminSessions(userId, keepToken)`.

## Password policy (`lib/password-policy.ts`, pure)

- `validateNewPassword(password, { email, current? }): string | null` returns a safe message
  or null.
- `generateTempPassword(): string` — 16 chars from the unambiguous alphabet used by
  `scripts/create-admin.mjs`, via `crypto.randomBytes`.

## API

Standard pipeline everywhere: same-origin 403 → JSON 415 → body cap 413 (4 KB) → session 401
→ role 403 → strict zod 422 → write + audit; generic 503 on internal errors, logged with an
`[api/admin/...]` prefix. Responses containing a temp password send `Cache-Control: no-store`.

### `POST /api/admin/auth/password` (any role)

`{ currentPassword, newPassword }` strict. Uses `allowMustChange: true`. Throttled with
`consumePasswordAttempt` (429 + `Retry-After`). Wrong current password → 403 (generic
message). Policy failure → 422. On success: new scrypt hash, `passwordChangedAt = now`,
`mustChangePassword = false`, delete all other sessions of the user, reset throttle, audit
`auth.password`. Response `200 { ok: true }`.

### `GET /api/admin/users` (owner)

Returns `{ users: [{ id, email, role, disabled, mustChangePassword, lastLoginAt, createdAt }] }`
sorted by email. Never returns hashes, lock fields or session data.

### `POST /api/admin/users` (owner)

`{ email, role }` strict (email trimmed/lowercased, ≤ 254, valid; role enum). Creates the
user with a generated temp password, `mustChangePassword: true`, `disabled: false`.
Duplicate email → 409 (unique index). Response `201 { ok: true, user, tempPassword }`
(`no-store`). Audit `user.create` (changes: `["role:<role>"]`; email is the entityId).

### `PATCH /api/admin/users/[id]` (owner)

Body is exactly one of `{ role }`, `{ disabled: boolean }`, `{ resetPassword: true }`.
Invalid/unknown id → 404.

- Self-protection: an owner cannot change their own role or disable themselves (403).
  Resetting your own password is not allowed here (use the change-password form; 403).
- Last-owner guard: demoting or disabling an `owner` must leave at least one other active
  owner. The update is applied, active owners are counted, and if none remain the update is
  reverted and the request returns 409. (Fails safe under concurrency.)
- `role` change, `disabled: true`, and `resetPassword` delete that user's sessions.
  `resetPassword` also sets a new hash, `mustChangePassword: true`, `passwordChangedAt`,
  clears `failedAttempts`/`lockedUntil`, and returns `{ tempPassword }` once (`no-store`).
- Audit: `user.role` (`role:<from>→<to>`), `user.disable`, `user.enable`, `user.reset`.

## UI

- `/admin/users` (server component; non-owners redirect to `/admin`): table of users, add-user
  form (email + role), per-row role select, enable/disable and reset buttons, one-time
  password panel (copy button, "shown once" notice, dismiss clears it from state).
  `components/admin-users-panel.tsx` (client). Nav gets "Users" for owners only.
- `/admin/change-password` (outside the `(protected)` group so a forced user can reach it):
  explains the requirement, uses `components/admin-password-form.tsx` (client).
- Settings page embeds the same form for every role; its "Coming next" copy is updated.
- Keep the 8px spacing grid and `type-*` classes; `npm run check:design` must pass.

## Testing (`scripts/test-admin-users.mjs`, needs a running server)

Ephemeral owner/editor/viewer users. Checks: unauthenticated 401; non-owner 403 on every users
endpoint; create returns a temp password once and the stored document has only a hash; duplicate
email 409; new user must change password (API 401, page redirect) then can log in and reach
admin after changing; wrong current password 403; policy failures 422 (short, equals email,
contains local part, equals current); throttle 429 after 5 bad attempts; password change keeps
the current session and revokes others; role change, disable and reset revoke sessions;
disabled user cannot log in; self role/disable 403; last-owner demote/disable 409; audit rows
exist and contain no password text; everything created is cleaned up.

## Out of scope

Email delivery, password reset by email, 2FA, user deletion, invitations, audit viewer (3c).
