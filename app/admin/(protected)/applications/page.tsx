import Link from "next/link";
import { AdminApplicationPanel } from "@/components/admin-application-panel";
import { formatAdminDate } from "@/lib/admin-queries";
import { listApplications } from "@/lib/application-queries";
import { APPLICATION_STATUSES, parseListQuery } from "@/lib/application-schemas";
import { canEditContent, requireAdminPage } from "@/lib/auth";

type SearchParams = Record<string, string | string[] | undefined>;

function href(params: { page?: number; status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return `/admin/applications${qs ? `?${qs}` : ""}`;
}

export default async function AdminApplicationsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const query = parseListQuery(await searchParams);
  const [user, list] = await Promise.all([requireAdminPage(), listApplications(query)]);
  const canEdit = canEditContent(user.role);
  const exportParams = new URLSearchParams();
  if (query.status) exportParams.set("status", query.status);
  if (query.q) exportParams.set("q", query.q);
  const exportQuery = exportParams.toString();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Recruitment</p>
        <h1 className="mt-4 type-h2">Applications.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          {list.total} {query.status || query.q ? "matching" : "total"} · {list.counts.new} new
        </p>
      </header>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        <Link href={href({ q: query.q })} className="type-label border border-ink/20 px-4 py-2">
          all
        </Link>
        {APPLICATION_STATUSES.map((status) => (
          <Link
            key={status}
            href={href({ status, q: query.q })}
            aria-current={query.status === status ? "true" : undefined}
            className="type-label border border-ink/20 px-4 py-2 aria-[current=true]:border-ink"
          >
            {status} ({list.counts[status]})
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <form action="/admin/applications" method="get" className="flex gap-2">
          {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
          <input
            name="q"
            defaultValue={query.q ?? ""}
            maxLength={80}
            placeholder="Search name or email"
            aria-label="Search applications"
            className="type-small border border-ink/20 bg-transparent px-4 py-2"
          />
          <button type="submit" className="type-label border border-ink px-4 py-2">
            Search
          </button>
        </form>
        {canEdit ? (
          <a
            href={`/api/admin/applications/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="type-label text-secondary-ink underline"
          >
            Export CSV
          </a>
        ) : null}
      </div>

      <div className="mt-8 grid gap-2">
        {list.items.map((application) => (
          <details key={application.id} className="border-b border-ink/10">
            <summary className="grid cursor-pointer grid-cols-2 gap-2 py-2 md:grid-cols-6">
              <span className="type-small">{application.name}</span>
              <span className="type-small text-ink-soft">{application.email}</span>
              <span className="type-small">{application.position}</span>
              <span className="type-small text-muted">{application.year}</span>
              <span className="type-small text-secondary-ink">{application.status}</span>
              <span className="type-small text-muted">{formatAdminDate(application.createdAt)}</span>
            </summary>
            <AdminApplicationPanel application={application} canEdit={canEdit} />
          </details>
        ))}
        {list.items.length === 0 ? (
          <p className="py-8 type-small text-muted">No applications match.</p>
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
