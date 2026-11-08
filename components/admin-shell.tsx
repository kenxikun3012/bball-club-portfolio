"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/hall-of-fame", label: "Hall of Fame" },
  { href: "/admin/achievements", label: "Achievements" },
  { href: "/admin/activities", label: "Activities" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({
  user,
  children,
}: {
  user: { email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-ink/10 bg-cream-200/40 md:flex md:flex-col">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-cream-100">
              U
            </span>
            <span className="mt-2 flex flex-col leading-none">
              <span className="font-display tracking-[-0.01em]">Club admin</span>
              <span className="mt-2 type-label text-muted">Control room</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Admin" className="mt-4 flex-1 px-4">
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-sm px-4 py-2 type-small font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-ink text-cream-100"
                      : "text-ink-soft hover:bg-cream-100",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-ink/10 p-6">
          <p className="type-label text-muted">{user.role}</p>
          <p className="mt-2 truncate type-small text-ink-soft">{user.email}</p>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="mt-4 w-full rounded-sm border border-ink/15 px-4 py-2 type-label text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-8 border-b border-secondary/40 bg-cream-100 px-6 py-4 md:hidden">
          <Link href="/admin" className="font-display">
            Club admin
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="type-label text-muted transition-colors hover:text-accent"
          >
            Sign out
          </button>
        </header>

        <div className="mx-auto max-w-[1100px] px-6 py-8 md:px-10 md:py-12">{children}</div>
      </div>
    </div>
  );
}
