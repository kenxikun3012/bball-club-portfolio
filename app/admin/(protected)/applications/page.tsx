import { formatAdminDate, getApplicationStats, getApplications } from "@/lib/admin-queries";

export default async function AdminApplicationsPage() {
  const [applications, stats] = await Promise.all([
    getApplications(100),
    getApplicationStats(),
  ]);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Recruitment</p>
        <h1 className="mt-4 type-h2">Applications.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          {stats.total} total · {stats.pending} new. Status workflow, notes and CSV export arrive
          in Phase 3.
        </p>
      </header>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-secondary/40 text-left">
              <th className="py-2 pr-4 type-label text-muted">Name</th>
              <th className="py-2 pr-4 type-label text-muted">Email</th>
              <th className="py-2 pr-4 type-label text-muted">Phone</th>
              <th className="py-2 pr-4 type-label text-muted">Position</th>
              <th className="py-2 pr-4 type-label text-muted">Year</th>
              <th className="py-2 pr-4 type-label text-muted">Status</th>
              <th className="py-2 type-label text-muted">Received</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={String(application._id)} className="border-b border-ink/10">
                <td className="py-2 pr-4 type-small">{application.name}</td>
                <td className="py-2 pr-4 type-small text-ink-soft">{application.email}</td>
                <td className="py-2 pr-4 type-small text-ink-soft">{application.phone}</td>
                <td className="py-2 pr-4 type-small">{application.position}</td>
                <td className="py-2 pr-4 type-small text-muted">{application.year}</td>
                <td className="py-2 pr-4 type-small text-secondary-ink">
                  {application.status ?? "new"}
                </td>
                <td className="py-2 type-small text-muted">
                  {formatAdminDate(application.createdAt)}
                </td>
              </tr>
            ))}
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 type-small text-muted">
                  No applications yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
