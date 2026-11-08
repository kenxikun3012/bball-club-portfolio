import { getAchievements } from "@/lib/content-db";

export default async function AdminAchievementsPage() {
  const { items, summary } = await getAchievements();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Honours</p>
        <h1 className="mt-4 type-h2">Achievements.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Timeline of club honours — read-only in Phase 1.
        </p>
      </header>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((stat) => (
          <li key={stat.label} className="border border-ink/10 bg-cream-50 p-6">
            <p className="type-stat">{stat.value}</p>
            <p className="mt-2 type-label text-muted">{stat.label}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="admin-honours" className="mt-12">
        <h2 id="admin-honours" className="type-h3 border-b border-secondary/40 pb-2">
          Honours list
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-secondary/40 text-left">
                <th className="py-2 pr-4 type-label text-muted">Year</th>
                <th className="py-2 pr-4 type-label text-muted">Title</th>
                <th className="py-2 pr-4 type-label text-muted">Competition</th>
                <th className="py-2 type-label text-muted">Result</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.year}-${item.title}`} className="border-b border-ink/10">
                  <td className="py-2 pr-4 type-small text-muted">{item.year}</td>
                  <td className="py-2 pr-4 type-small">{item.title}</td>
                  <td className="py-2 pr-4 type-small text-ink-soft">{item.competition}</td>
                  <td className="py-2 type-small text-secondary-ink">{item.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
