"use client";

import { useState } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/application-schemas";
import type { ApplicationView } from "@/lib/application-queries";

async function patch(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/admin/applications/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as {
    ok?: boolean;
    message?: string;
    application?: ApplicationView;
  } | null;
  if (!response.ok || !json?.application) {
    throw new Error(json?.message ?? "Could not save. Please try again.");
  }
  return json.application;
}

export function AdminApplicationPanel({
  application,
  canEdit,
}: Readonly<{ application: ApplicationView; canEdit: boolean }>) {
  const [current, setCurrent] = useState(application);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(body: Record<string, unknown>, onDone?: () => void) {
    setBusy(true);
    setError("");
    try {
      setCurrent(await patch(current.id, body));
      onDone?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      <div className="grid gap-2">
        <p className="type-label text-muted">Message</p>
        <p className="type-small whitespace-pre-wrap text-ink-soft">
          {current.message || "No message."}
        </p>
        <p className="type-label mt-2 text-muted">Status</p>
        <select
          className="type-small border border-ink/20 bg-transparent p-2"
          value={current.status}
          disabled={!canEdit || busy}
          onChange={(event) => run({ status: event.target.value as ApplicationStatus })}
          aria-label={`Status for ${current.name}`}
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <p className="type-label text-muted">Notes ({current.notes.length})</p>
        <ul className="grid gap-2">
          {current.notes.map((item) => (
            <li key={item.id} className="border-b border-ink/10 pb-2">
              <p className="type-small whitespace-pre-wrap">{item.text}</p>
              <p className="type-label text-muted">
                {item.authorEmail} · {item.createdAt.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (note.trim()) run({ addNote: note }, () => setNote(""));
          }}
        >
          <textarea
            className="type-small min-h-16 border border-ink/20 bg-transparent p-2"
            value={note}
            maxLength={1000}
            disabled={!canEdit || busy}
            onChange={(event) => setNote(event.target.value)}
            placeholder={canEdit ? "Add an internal note" : "Read-only"}
            aria-label={`Add a note for ${current.name}`}
          />
          <button
            type="submit"
            disabled={!canEdit || busy || note.trim().length === 0}
            className="type-label justify-self-start border border-ink px-4 py-2 disabled:opacity-40"
          >
            Add note
          </button>
        </form>
        {error ? (
          <p role="alert" className="type-small text-secondary-ink">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
