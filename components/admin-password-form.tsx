"use client";

import { useState } from "react";

export function AdminPasswordForm({ forced = false }: Readonly<{ forced?: boolean }>) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const response = await fetch("/api/admin/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setError(json?.message ?? "Could not change the password.");
        return;
      }
      setCurrent("");
      setNext("");
      setDone(true);
      if (forced) window.location.assign("/admin");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-sm gap-4">
      <label className="grid gap-2">
        <span className="type-label text-muted">
          {forced ? "Temporary password" : "Current password"}
        </span>
        <input
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className="type-small border border-ink/20 bg-transparent px-4 py-2"
        />
      </label>
      <label className="grid gap-2">
        <span className="type-label text-muted">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={200}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className="type-small border border-ink/20 bg-transparent px-4 py-2"
        />
        <span className="type-small text-muted">
          At least 8 characters. It cannot be your email or contain the first part of it.
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="type-label justify-self-start border border-ink px-4 py-2 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Change password"}
      </button>
      {error ? (
        <p role="alert" className="type-small text-secondary-ink">
          {error}
        </p>
      ) : null}
      {done && !forced ? (
        <p role="status" className="type-small text-ink-soft">
          Password changed. Your other sessions were signed out.
        </p>
      ) : null}
    </form>
  );
}
