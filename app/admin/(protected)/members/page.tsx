import { getMembers } from "@/lib/content-db";

export default async function AdminMembersPage() {
  const { rosters, staff } = await getMembers();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Roster</p>
        <h1 className="mt-4 type-h2">Members.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Read-only in Phase 1 — editing, reordering and creating players comes in Phase 2.
        </p>
      </header>

      {rosters.map((roster) => (
        <section key={roster.id} aria-labelledby={`roster-${roster.id}`} className="mt-12">
          <div className="flex items-baseline justify-between gap-4 border-b border-secondary/40 pb-2">
            <h2 id={`roster-${roster.id}`} className="type-h3">
              {roster.label}
            </h2>
            <p className="type-label text-muted">{roster.players.length} players</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-secondary/40 text-left">
                  <th className="py-2 pr-4 type-label text-muted">No.</th>
                  <th className="py-2 pr-4 type-label text-muted">Name</th>
                  <th className="py-2 pr-4 type-label text-muted">Role</th>
                  <th className="py-2 pr-4 type-label text-muted">Year</th>
                  <th className="py-2 pr-4 type-label text-muted">Position</th>
                  <th className="py-2 type-label text-muted">Featured</th>
                </tr>
              </thead>
              <tbody>
                {roster.players.map((player) => (
                  <tr key={`${roster.id}-${player.number}`} className="border-b border-ink/10">
                    <td className="py-2 pr-4 type-small text-muted">{player.number}</td>
                    <td className="py-2 pr-4 type-small">{player.name}</td>
                    <td className="py-2 pr-4 type-small text-secondary-ink">{player.role}</td>
                    <td className="py-2 pr-4 type-small">{player.year}</td>
                    <td className="py-2 pr-4 type-small text-ink-soft">{player.position}</td>
                    <td className="py-2 type-small text-muted">
                      {player.featured ? "Yes" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section aria-labelledby="admin-staff" className="mt-16">
        <h2 id="admin-staff" className="type-h3 border-b border-secondary/40 pb-2">
          Staff
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {staff.map((member) => (
            <li key={member.name} className="border border-ink/10 bg-cream-50 p-6">
              <p className="type-h4">{member.name}</p>
              <p className="mt-2 type-label text-secondary-ink">{member.role}</p>
              <p className="mt-2 type-small text-muted">{member.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
