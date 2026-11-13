"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/admin-fields";
import {
  achievementsFields,
  activitiesFields,
  hallOfFameFields,
  membersFields,
} from "@/lib/admin-fields";
import type { EditableContentId } from "@/lib/content-db";

type Content = Record<string, unknown>;
type Path = (string | number)[];
type Issue = { path: string; message: string };

export interface ContentEditorProps {
  initialData: unknown;
  initialRevision: number;
  canEdit: boolean;
  /** True when the server has ImageKit configured; shows an Upload button on image fields. */
  uploadsEnabled?: boolean;
}

const inputClass =
  "w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-2 type-small text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:opacity-60";

const labelClass = "mb-2 block type-label text-muted";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getAt(root: unknown, path: Path): unknown {
  let value = root;
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

function setIn(root: unknown, path: Path, next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = root.slice();
    copy[head as number] = setIn(copy[head as number], rest, next);
    return copy;
  }
  const source = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
  return { ...source, [head]: setIn(source[head as string], rest, next) };
}

/* ------------------------------------------------------------------ */
/*  Generic, schema-driven content editor.                            */
/*  Saves the whole document with an optimistic revision check.        */
/* ------------------------------------------------------------------ */

export function ContentEditor({
  doc,
  fields,
  initialData,
  initialRevision,
  canEdit,
  uploadsEnabled = false,
}: ContentEditorProps & { doc: EditableContentId; fields: FieldDef[] }) {
  const router = useRouter();
  const [data, setData] = useState<Content>(() => clone(initialData) as Content);
  const [baseline, setBaseline] = useState<Content>(() => clone(initialData) as Content);
  const [revision, setRevision] = useState(initialRevision);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update(path: Path, value: unknown) {
    setData((current) => setIn(current, path, value) as Content);
    setDirty(true);
    setNotice(null);
    setError(null);
    setIssues([]);
  }

  async function uploadImage(file: File, path: Path, id: string) {
    setUploading(id);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body: form });
      const json = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (!response.ok || !json?.url) {
        setUploadError({ id, message: json?.message ?? "Upload failed. Please try again." });
        return;
      }
      update(path, json.url);
    } catch {
      setUploadError({ id, message: "Could not reach the server. Please try again." });
    } finally {
      setUploading(null);
    }
  }

  function discard() {
    setData(clone(baseline));
    setDirty(false);
    setError(null);
    setIssues([]);
    setNotice(null);
    setConflict(null);
  }

  async function save() {
    if (!canEdit || pending || conflict !== null) return;
    setPending(true);
    setError(null);
    setIssues([]);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/content/${doc}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, expectedRevision: revision }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        revision?: number;
        code?: string;
        issues?: Issue[];
      };

      if (response.status === 409) {
        setConflict(result.revision ?? revision);
        return;
      }
      if (!response.ok) {
        setError(result.message ?? "Could not save these changes.");
        setIssues(result.issues ?? []);
        return;
      }

      setRevision(result.revision ?? revision + 1);
      setBaseline(clone(data));
      setDirty(false);
      setNotice("Saved — the public site is already showing these changes.");
      router.refresh();
    } catch {
      setError("Network error — your changes were not saved.");
    } finally {
      setPending(false);
    }
  }

  async function reloadLatest() {
    setReloading(true);
    setError(null);
    setIssues([]);
    try {
      const response = await fetch(`/api/admin/content/${doc}`);
      const result = (await response.json().catch(() => ({}))) as {
        data?: unknown;
        revision?: number;
        message?: string;
      };
      if (!response.ok || result.data === undefined) {
        setError(result.message ?? "Could not load the latest version.");
        return;
      }
      const latest = clone(result.data) as Content;
      setData(latest);
      setBaseline(latest);
      setRevision(result.revision ?? 0);
      setDirty(false);
      setConflict(null);
      setNotice("Loaded the latest revision.");
    } catch {
      setError("Network error — could not load the latest version.");
    } finally {
      setReloading(false);
    }
  }

  function renderField(field: FieldDef, path: Path) {
    const value = getAt(data, path);
    const id = `field-${path.join("-")}`;
    const disabled = !canEdit;

    if (field.kind === "text" || field.kind === "image") {
      return (
        <div key={field.key}>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <input
            id={id}
            type={field.kind === "image" ? "url" : "text"}
            value={typeof value === "string" ? value : ""}
            placeholder={
              field.kind === "image" ? "https://… (optional)" : field.placeholder
            }
            disabled={disabled}
            onChange={(event) => update(path, event.target.value)}
            className={inputClass}
          />
          {"hint" in field && field.hint ? (
            <p className="mt-2 type-small text-muted">{field.hint}</p>
          ) : null}
          {field.kind === "image" && uploadsEnabled && canEdit ? (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <label className="cursor-pointer rounded-sm border border-ink/15 px-4 py-2 type-label text-ink-soft transition-colors focus-within:border-accent hover:border-accent hover:text-accent">
                {uploading === id ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload image file"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadImage(file, path, id);
                  }}
                />
              </label>
              <span className="type-small text-muted">JPEG, PNG or WebP, up to 4 MB.</span>
            </div>
          ) : null}
          {uploadError?.id === id ? (
            <p role="alert" className="mt-2 type-small text-secondary-ink">
              {uploadError.message}
            </p>
          ) : null}
          {field.kind === "image" ? (
            <p className="mt-2 type-small text-muted">
              Leave blank to keep the editorial placeholder.
            </p>
          ) : null}
        </div>
      );
    }

    if (field.kind === "textarea") {
      return (
        <div key={field.key}>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <textarea
            id={id}
            rows={field.rows ?? 4}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(event) => update(path, event.target.value)}
            className={inputClass}
          />
        </div>
      );
    }

    if (field.kind === "number") {
      return (
        <div key={field.key}>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : ""}
            disabled={disabled}
            onChange={(event) =>
              update(
                path,
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            className={inputClass}
          />
        </div>
      );
    }

    if (field.kind === "checkbox") {
      return (
        <label key={field.key} className="flex items-center gap-2 type-small text-ink">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => update(path, event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          {field.label}
        </label>
      );
    }

    if (field.kind === "select") {
      const current = typeof value === "string" ? value : "";
      return (
        <div key={field.key}>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <select
            id={id}
            value={current}
            disabled={disabled}
            onChange={(event) => update(path, event.target.value)}
            className={inputClass}
          >
            {!field.options.includes(current) && current ? (
              <option value={current}>{current}</option>
            ) : null}
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.kind === "list") {
      const list = Array.isArray(value) ? value : [];
      return (
        <div key={field.key}>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <textarea
            id={id}
            rows={Math.min(Math.max(list.length + 1, 2), 6)}
            value={list.join("\n")}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(event) => update(path, event.target.value.split("\n"))}
            className={inputClass}
          />
          <p className="mt-2 type-small text-muted">One entry per line.</p>
        </div>
      );
    }

    const items = Array.isArray(value) ? value : [];
    const blankItem = field.blank;

    function addItem() {
      update(path, [...items, blankItem()]);
    }

    function removeItem(index: number) {
      update(
        path,
        items.filter((_, itemIndex) => itemIndex !== index),
      );
    }

    function moveItem(index: number, direction: -1 | 1) {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const next = items.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      update(path, next);
    }

    return (
      <div key={field.key} className="border-t border-secondary/40 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="type-label text-secondary-ink">
            {field.label} · {items.length}
          </p>
          {canEdit ? (
            <button
              type="button"
              onClick={addItem}
              className="rounded-sm border border-ink/15 px-4 py-2 type-label text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              + Add {field.itemNoun}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4">
          {items.map((item, index) => (
            <details key={index} className="border border-ink/10 bg-cream-50">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="type-small">{field.itemLabel((item ?? {}) as Record<string, unknown>, index)}</span>
                <span className="type-label text-muted">
                  {field.itemNoun} {index + 1}
                </span>
              </summary>
              <div className="grid gap-4 border-t border-ink/10 p-4">
                {field.fields.map((child) =>
                  renderField(child, [...path, index, child.key]),
                )}
                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-4 border-t border-ink/10 pt-4">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="type-label text-muted transition-colors hover:text-ink disabled:opacity-40"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      className="type-label text-muted transition-colors hover:text-ink disabled:opacity-40"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="type-label text-accent transition-colors hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            </details>
          ))}
          {items.length === 0 ? (
            <p className="type-small text-muted">Nothing here yet.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!canEdit ? (
        <p className="border border-secondary/40 bg-secondary-wash px-4 py-2 type-small text-ink-soft">
          Your role can view content but not edit it. Ask an owner for editor access.
        </p>
      ) : null}

      {conflict !== null ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-accent/30 bg-accent-wash px-4 py-4"
        >
          <p className="type-small text-accent">
            Someone else saved revision {conflict}. Reload before saving your changes.
          </p>
          <button
            type="button"
            onClick={reloadLatest}
            disabled={reloading}
            className="rounded-sm bg-ink px-4 py-2 type-label text-cream-100 disabled:opacity-60"
          >
            {reloading ? "Loading…" : "Reload latest"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-4 border border-accent/30 bg-accent-wash px-4 py-4">
          <p className="type-small text-accent">{error}</p>
          {issues.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 type-small text-ink-soft">
              {issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  {issue.path ? `${issue.path} — ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 border border-secondary/60 bg-secondary-wash px-4 py-2 type-small text-ink-soft"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8">
        {fields.map((field) => renderField(field, [field.key]))}
      </div>

      {canEdit ? (
        <div className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 bg-cream-100/95 px-2 py-4 backdrop-blur">
          <p className="type-label text-muted">
            {dirty ? "Unsaved changes" : `Revision ${revision}`}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={discard}
              disabled={!dirty || pending}
              className="rounded-sm border border-ink/15 px-4 py-2 type-label text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending || conflict !== null}
              className="rounded-sm bg-ink px-8 py-4 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ wrappers ------------------------------- */

export function MembersEditor(props: ContentEditorProps) {
  return <ContentEditor doc="members" fields={membersFields} {...props} />;
}

export function HallOfFameEditor(props: ContentEditorProps) {
  return <ContentEditor doc="hallOfFame" fields={hallOfFameFields} {...props} />;
}

export function AchievementsEditor(props: ContentEditorProps) {
  return <ContentEditor doc="achievements" fields={achievementsFields} {...props} />;
}

export function ActivitiesEditor(props: ContentEditorProps) {
  return <ContentEditor doc="activities" fields={activitiesFields} {...props} />;
}
