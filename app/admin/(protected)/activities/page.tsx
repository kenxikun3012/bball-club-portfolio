import { getActivities } from "@/lib/content-db";

export default async function AdminActivitiesPage() {
  const { intro, gallery, upcoming } = await getActivities();

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Programme</p>
        <h1 className="mt-4 type-h2">Activities.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">{intro}</p>
      </header>

      <section aria-labelledby="admin-gallery" className="mt-12">
        <div className="flex items-baseline justify-between gap-4 border-b border-secondary/40 pb-2">
          <h2 id="admin-gallery" className="type-h3">
            Gallery
          </h2>
          <p className="type-label text-muted">{gallery.length} items</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-secondary/40 text-left">
                <th className="py-2 pr-4 type-label text-muted">Title</th>
                <th className="py-2 pr-4 type-label text-muted">Category</th>
                <th className="py-2 pr-4 type-label text-muted">Date</th>
                <th className="py-2 type-label text-muted">Image</th>
              </tr>
            </thead>
            <tbody>
              {gallery.map((item) => (
                <tr key={item.title} className="border-b border-ink/10">
                  <td className="py-2 pr-4 type-small">{item.title}</td>
                  <td className="py-2 pr-4 type-small text-secondary-ink">{item.category}</td>
                  <td className="py-2 pr-4 type-small text-muted">{item.date}</td>
                  <td className="py-2 type-small text-muted">{item.image ? "Set" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="admin-upcoming" className="mt-16">
        <h2 id="admin-upcoming" className="type-h3 border-b border-secondary/40 pb-2">
          Upcoming
        </h2>
        <ul className="mt-4">
          {upcoming.map((event) => (
            <li
              key={`${event.date}-${event.title}`}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 py-2"
            >
              <span className="type-small">{event.title}</span>
              <span className="type-small text-muted">
                {event.date} · {event.location}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
