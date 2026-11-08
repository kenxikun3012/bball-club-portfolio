import { getSiteContent } from "@/lib/content-db";
import {
  formatAdminDate,
  getApplicationStats,
  getApplications,
  getRecentAudit,
} from "@/lib/admin-queries";

export default async function AdminOverviewPage() {
  const [content, stats, recentApplications, recentAudit] = await Promise.all([
    getSiteContent(),
    getApplicationStats(),
    getApplications(5),
    getRecentAudit(6),
  ]);

  const playerCount = content.rosters.reduce(
    (total, roster) => total + roster.players.length,
    0,
  );

  const cards = [
    { value: playerCount, label: "Players" },
    { value: stats.total, label: "Applications" },
    { value: stats.pending, label: "New applications" },
    { value: content.hallOfFame.inductees.length, label: "Hall of Fame" },
    { value: content.achievements.length, label: "Honours" },
    { value: content.gallery.length, label: "Activities" },
  ];

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Control room</p>
        <h1 className="mt-4 type-h2">Overview.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Read-only in Phase 1. Content editing and application management arrive in the next
          phases.
        </p>
      </header>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label} className="border border-ink/10 bg-cream-50 p-6">
            <p className="type-stat">{card.value}</p>
            <p className="mt-2 type-label text-muted">{card.label}</p>
          </li>
        ))}
      </ul>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        <section aria-labelledby="recent-applications">
          <div className="flex items-baseline justify-between gap-4 border-b border-secondary/40 pb-2">
            <h2 id="recent-applications" className="type-h3">
              Recent applications
            </h2>
            <a href="/admin/applications" className="type-label text-secondary-ink">
              View all →
            </a>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-secondary/40 text-left">
                  <th className="py-2 pr-4 type-label text-muted">Name</th>
                  <th className="py-2 pr-4 type-label text-muted">Email</th>
                  <th className="py-2 type-label text-muted">Received</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((application) => (
                  <tr key={String(application._id)} className="border-b border-ink/10">
                    <td className="py-2 pr-4 type-small">{application.name}</td>
                    <td className="py-2 pr-4 type-small text-ink-soft">
                      {application.email}
                    </td>
                    <td className="py-2 type-small text-muted">
                      {formatAdminDate(application.createdAt)}
                    </td>
                  </tr>
                ))}
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 type-small text-muted">
                      No applications yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="recent-audit">
          <div className="border-b border-secondary/40 pb-2">
            <h2 id="recent-audit" className="type-h3">
              Recent activity
            </h2>
          </div>
          <ul className="mt-4">
            {recentAudit.map((entry) => (
              <li
                key={String(entry._id)}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 py-2"
              >
                <span className="type-small">
                  {entry.action} · {entry.entity}
                </span>
                <span className="type-small text-muted">
                  {entry.actorEmail} · {formatAdminDate(entry.createdAt)}
                </span>
              </li>
            ))}
            {recentAudit.length === 0 ? (
              <li className="py-4 type-small text-muted">No audit entries yet.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
