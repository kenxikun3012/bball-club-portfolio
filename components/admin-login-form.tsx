"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(result.message ?? "Could not sign in.");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-8">
      <div>
        <label htmlFor="admin-email" className="mb-2 block type-label text-muted">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-4 type-small text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-2 block type-label text-muted">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-4 type-small text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {error ? (
        <p role="alert" className="border border-accent/30 bg-accent-wash px-4 py-2 type-small text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-4 rounded-sm bg-ink px-8 py-4 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
