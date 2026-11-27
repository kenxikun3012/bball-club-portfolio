import { redirect } from "next/navigation";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { requireAdminPage } from "@/lib/auth";
import { listUsers } from "@/lib/user-queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireAdminPage();
  if (user.role !== "owner") redirect("/admin");

  const users = await listUsers();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Access</p>
        <h1 className="mt-4 type-h2">Users.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Create accounts, change roles, disable access and reset passwords. New and reset accounts
          get a one-time temporary password.
        </p>
      </header>
      <AdminUsersPanel initialUsers={users} currentUserId={user._id.toHexString()} />
    </>
  );
}
