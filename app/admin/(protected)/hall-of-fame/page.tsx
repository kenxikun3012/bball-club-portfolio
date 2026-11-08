import { getHallOfFame } from "@/lib/content-db";

export default async function AdminHallOfFamePage() {
  const hallOfFame = await getHallOfFame();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Legacy</p>
        <h1 className="mt-4 type-h2">Hall of Fame.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Retired jerseys and inductees — read-only in Phase 1.
        </p>
      </header>

      <section aria-labelledby="admin-jerseys" className="mt-12">
        <div className="flex items-baseline justify-between gap-4 border-b border-secondary/40 pb-2">
          <h2 id="admin-jerseys" className="type-h3">
            Retired jerseys
          </h2>
          <p className="type-label text-muted">{hallOfFame.retiredJerseys.length} numbers</p>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {hallOfFame.retiredJerseys.map((jersey) => (
            <li key={jersey.number} className="border border-ink/10 bg-cream-50 p-6">
              <p className="type-stat text-secondary-ink">#{jersey.number}</p>
              <p className="mt-2 type-h4">{jersey.name}</p>
              <p className="mt-2 type-label text-muted">{jersey.years}</p>
              <p className="mt-2 type-small text-ink-soft">{jersey.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-inductees" className="mt-16">
        <h2 id="admin-inductees" className="type-h3 border-b border-secondary/40 pb-2">
          Inductees
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-secondary/40 text-left">
                <th className="py-2 pr-4 type-label text-muted">Name</th>
                <th className="py-2 pr-4 type-label text-muted">Years</th>
                <th className="py-2 pr-4 type-label text-muted">Position</th>
                <th className="py-2 pr-4 type-label text-muted">Jersey</th>
                <th className="py-2 type-label text-muted">Inducted</th>
              </tr>
            </thead>
            <tbody>
              {hallOfFame.inductees.map((inductee) => (
                <tr
                  key={`${inductee.name}-${inductee.jerseyNumber}`}
                  className="border-b border-ink/10"
                >
                  <td className="py-2 pr-4 type-small">{inductee.name}</td>
                  <td className="py-2 pr-4 type-small">{inductee.years}</td>
                  <td className="py-2 pr-4 type-small text-ink-soft">{inductee.position}</td>
                  <td className="py-2 pr-4 type-small text-secondary-ink">
                    {inductee.retiredJersey ? `#${inductee.jerseyNumber} retired` : "—"}
                  </td>
                  <td className="py-2 type-small text-muted">{inductee.inducted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
