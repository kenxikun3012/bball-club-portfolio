import Link from "next/link";
import { redirect } from "next/navigation";
import { AUDIT_ACTIONS, listAudit, parseAuditQuery } from "@/lib/audit-queries";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function href(query: { page?: number; action?: string; actor?: string; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (query.action) search.set("action", query.action);
  if (query.actor) search.set("actor", query.actor);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.toString();
  return `/admin/audit${qs ? `?${qs}` : ""}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

export default async function AdminAuditPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const user = await requireAdminPage();
  if (user.role !== "owner") redirect("/admin");

  const query = parseAuditQuery(await searchParams);
  const list = await listAudit(query);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Security</p>
        <h1 className="mt-4 type-h2">Audit log.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          {list.total} entries. Field names only; no values, passwords or IP data are recorded here.
        </p>
      </header>

      <form action="/admin/audit" method="get" className="mt-6 flex flex-wrap items-end gap-4">
        <label className="grid gap-2">
          <span className="type-label text-muted">Action</span>
          <select
            name="action"
            defaultValue={query.action ?? ""}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          >
            <option value="">all</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="type-label text-muted">Actor email</span>
          <input
            name="actor"
            defaultValue={query.actor ?? ""}
            maxLength={80}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          />
        </label>
        <label className="grid gap-2">
          <span className="type-label text-muted">From</span>
          <input
            type="date"
            name="from"
            defaultValue={query.from ?? ""}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          />
        </label>
        <label className="grid gap-2">
          <span className="type-label text-muted">To</span>
          <input
            type="date"
            name="to"
            defaultValue={query.to ?? ""}
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          />
        </label>
        <button type="submit" className="type-label border border-ink px-4 py-2">
          Filter
        </button>
        <Link href="/admin/audit" className="type-label text-secondary-ink underline">
          Clear
        </Link>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-secondary/40 text-left">
              <th className="py-2 pr-4 type-label text-muted">Time</th>
              <th className="py-2 pr-4 type-label text-muted">Actor</th>
              <th className="py-2 pr-4 type-label text-muted">Action</th>
              <th className="py-2 pr-4 type-label text-muted">Target</th>
              <th className="py-2 type-label text-muted">Changes</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((entry) => (
              <tr key={entry.id} className="border-b border-ink/10 align-top">
                <td className="py-2 pr-4 type-small text-muted">{formatTime(entry.createdAt)}</td>
                <td className="py-2 pr-4 type-small">{entry.actorEmail}</td>
                <td className="py-2 pr-4 type-small text-secondary-ink">{entry.action}</td>
                <td className="py-2 pr-4 type-small text-ink-soft">
                  {entry.entity}
                  {entry.entityId ? ` · ${entry.entityId}` : ""}
                </td>
                <td className="py-2 type-small text-muted">{entry.changes.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.items.length === 0 ? (
          <p className="py-8 type-small text-muted">No entries match.</p>
        ) : null}
      </div>

      <nav aria-label="Pagination" className="mt-6 flex items-center gap-4">
        {list.page > 1 ? (
          <Link className="type-label underline" href={href({ ...query, page: list.page - 1 })}>
            Previous
          </Link>
        ) : null}
        <span className="type-small text-muted">
          Page {list.page} of {list.pages}
        </span>
        {list.page < list.pages ? (
          <Link className="type-label underline" href={href({ ...query, page: list.page + 1 })}>
            Next
          </Link>
        ) : null}
      </nav>
    </>
  );
}
