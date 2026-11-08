import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = rawNext && rawNext.startsWith("/admin") ? rawNext : "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-cream-100">
            U
          </span>
          <p className="type-label text-muted">Club control room</p>
        </div>

        <div className="mt-8 border border-ink/10 bg-cream-50 p-8 shadow-editorial">
          <h1 className="type-h2">Sign in.</h1>
          <p className="mt-2 type-small text-muted">
            Admin accounts are created by the club committee.
          </p>
          <AdminLoginForm next={next} />
        </div>

        <p className="mt-8 text-center type-label text-muted">
          Protected area · all actions are audited
        </p>
      </div>
    </main>
  );
}
