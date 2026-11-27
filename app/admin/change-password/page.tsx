import { redirect } from "next/navigation";
import { AdminPasswordForm } from "@/components/admin-password-form";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getAdminSession({ allowMustChange: true });
  if (!session) redirect("/admin/login");
  if (!session.user.mustChangePassword) redirect("/admin");

  return (
    <main className="mx-auto grid max-w-md gap-8 px-8 py-16">
      <header>
        <p className="type-label text-secondary-ink">Security</p>
        <h1 className="mt-4 type-h2">Choose a new password.</h1>
        <p className="mt-2 type-small text-muted">
          You signed in with a temporary password. Set your own to continue.
        </p>
      </header>
      <AdminPasswordForm forced />
    </main>
  );
}
