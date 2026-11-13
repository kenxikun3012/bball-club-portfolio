import { AdminPasswordForm } from "@/components/admin-password-form";
import { getAdminSession } from "@/lib/auth";
import { readEnv } from "@/lib/env";
import { isImageKitConfigured } from "@/lib/imagekit";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();

  const environment = [
    { label: "MongoDB URI", ok: Boolean(readEnv("MONGODB_URI")) },
    { label: "Database name", ok: Boolean(readEnv("MONGODB_DB")) },
    { label: "IP hash salt", ok: Boolean(readEnv("IP_HASH_SALT")) },
    { label: "ImageKit uploads (optional)", ok: isImageKitConfigured() },
  ];

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Configuration</p>
        <h1 className="mt-4 type-h2">Settings.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Account details and environment checks. Club content editing is available from the
          Members, Hall of Fame, Achievements and Activities sections.
        </p>
      </header>

      <section aria-labelledby="admin-account" className="mt-12">
        <h2 id="admin-account" className="type-h3 border-b border-secondary/40 pb-2">
          Your account
        </h2>
        <dl className="mt-4 divide-y divide-ink/10 border-y border-secondary/40">
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="type-label text-muted">Email</dt>
            <dd className="type-small">{session?.user.email ?? "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="type-label text-muted">Role</dt>
            <dd className="type-small text-secondary-ink">{session?.user.role ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="admin-password" className="mt-16">
        <h2 id="admin-password" className="type-h3 border-b border-secondary/40 pb-2">
          Change password
        </h2>
        <div className="mt-4">
          <AdminPasswordForm />
        </div>
      </section>

      <section aria-labelledby="admin-env" className="mt-16">
        <h2 id="admin-env" className="type-h3 border-b border-secondary/40 pb-2">
          Environment
        </h2>
        <ul className="mt-4">
          {environment.map((item) => (
            <li
              key={item.label}
              className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-2"
            >
              <span className="type-small">{item.label}</span>
              <span className="type-label text-secondary-ink">
                {item.ok ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-next" className="mt-16">
        <h2 id="admin-next" className="type-h3 border-b border-secondary/40 pb-2">
          Coming next
        </h2>
        <ul className="mt-4 space-y-2 type-small text-ink-soft">
          <li>Phase 2 — content editing is live (revision-safe, audit-logged).</li>
          <li>Phase 3 — applications, admin users and password change are live.</li>
          <li>Phase 3c — audit viewer. Phase 4 — hardening, uploads and 2FA.</li>
        </ul>
      </section>
    </>
  );
}
