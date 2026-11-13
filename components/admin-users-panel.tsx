"use client";

import { useState } from "react";
import type { AdminUserView } from "@/lib/user-queries";

type Role = AdminUserView["role"];
const ROLES: Role[] = ["owner", "editor", "viewer"];

interface ApiResult {
  ok?: boolean;
  message?: string;
  user?: AdminUserView;
  tempPassword?: string;
}

async function call(url: string, method: string, body: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as ApiResult | null;
  if (!response.ok || !json?.user) throw new Error(json?.message ?? "Request failed.");
  return json;
}

export function AdminUsersPanel({
  initialUsers,
  currentUserId,
}: Readonly<{ initialUsers: AdminUserView[]; currentUserId: string }>) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: () => Promise<ApiResult>, onUser: (result: ApiResult) => void) {
    setBusy(true);
    setError("");
    try {
      onUser(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function replace(user: AdminUserView) {
    setUsers((current) => current.map((item) => (item.id === user.id ? user : item)));
  }

  function showSecret(result: ApiResult) {
    if (result.user && result.tempPassword) {
      setSecret({ email: result.user.email, password: result.tempPassword });
      setCopied(false);
    }
  }

  return (
    <section className="mt-8 grid gap-8">
      {secret ? (
        <div role="status" className="grid gap-2 border border-ink p-4">
          <p className="type-label text-secondary-ink">Temporary password — shown once</p>
          <p className="type-small">
            Give this to {secret.email}. They must change it at first sign-in. It cannot be shown
            again.
          </p>
          <code className="type-body select-all break-all">{secret.password}</code>
          <div className="flex gap-2">
            <button
              type="button"
              className="type-label border border-ink px-4 py-2"
              onClick={async () => {
                await navigator.clipboard.writeText(secret.password).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              className="type-label border border-ink/20 px-4 py-2"
              onClick={() => setSecret(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => call("/api/admin/users", "POST", { email, role }),
            (result) => {
              if (result.user) setUsers((current) => [...current, result.user!].sort((a, b) => a.email.localeCompare(b.email)));
              showSecret(result);
              setEmail("");
            },
          );
        }}
      >
        <label className="grid gap-2">
          <span className="type-label text-muted">New user email</span>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          />
        </label>
        <label className="grid gap-2">
          <span className="type-label text-muted">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          >
            {ROLES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy} className="type-label border border-ink px-4 py-2 disabled:opacity-40">
          Add user
        </button>
      </form>

      {error ? (
        <p role="alert" className="type-small text-secondary-ink">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-secondary/40 text-left">
              <th className="py-2 pr-4 type-label text-muted">Email</th>
              <th className="py-2 pr-4 type-label text-muted">Role</th>
              <th className="py-2 pr-4 type-label text-muted">State</th>
              <th className="py-2 pr-4 type-label text-muted">Last sign-in</th>
              <th className="py-2 type-label text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const self = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-b border-ink/10">
                  <td className="py-2 pr-4 type-small">
                    {user.email}
                    {self ? <span className="ml-2 type-label text-muted">you</span> : null}
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      aria-label={`Role for ${user.email}`}
                      value={user.role}
                      disabled={self || busy}
                      onChange={(event) =>
                        run(
                          () => call(`/api/admin/users/${user.id}`, "PATCH", { role: event.target.value }),
                          (result) => result.user && replace(result.user),
                        )
                      }
                      className="type-small border border-ink/20 bg-transparent px-2 py-2"
                    >
                      {ROLES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4 type-small text-secondary-ink">
                    {user.disabled ? "disabled" : user.mustChangePassword ? "must change password" : "active"}
                  </td>
                  <td className="py-2 pr-4 type-small text-muted">
                    {user.lastLoginAt ? user.lastLoginAt.slice(0, 10) : "never"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={self || busy}
                        className="type-label border border-ink/20 px-4 py-2 disabled:opacity-40"
                        onClick={() =>
                          run(
                            () => call(`/api/admin/users/${user.id}`, "PATCH", { disabled: !user.disabled }),
                            (result) => result.user && replace(result.user),
                          )
                        }
                      >
                        {user.disabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        type="button"
                        disabled={self || busy}
                        className="type-label border border-ink/20 px-4 py-2 disabled:opacity-40"
                        onClick={() =>
                          run(
                            () => call(`/api/admin/users/${user.id}`, "PATCH", { resetPassword: true }),
                            (result) => {
                              if (result.user) replace(result.user);
                              showSecret(result);
                            },
                          )
                        }
                      >
                        Reset password
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
