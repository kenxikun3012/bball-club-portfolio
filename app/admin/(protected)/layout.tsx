import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminPage();

  return (
    <AdminShell user={{ email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}
