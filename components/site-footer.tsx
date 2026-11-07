import { club } from "@/lib/content";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink text-cream-100">
      <svg
        viewBox="0 0 1440 400"
        className="pointer-events-none absolute inset-0 h-full w-full text-secondary/[0.09]"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="1180" cy="180" r="260" />
          <circle cx="1180" cy="180" r="150" />
          <line x1="920" y1="180" x2="1440" y2="180" />
          <line x1="1180" y1="-80" x2="1180" y2="440" />
        </g>
      </svg>

      <div className="relative mx-auto max-w-[1240px] px-6 pb-8 pt-16 md:px-10 md:pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="type-h2 text-balance">{club.name}</p>
            <p className="mt-4 max-w-sm type-small text-cream-300/75">
              Student-run since {club.founded}. Two squads, one home court, and a standing
              invitation to anyone who wants to play.
            </p>
            <p className="mt-8 type-label text-secondary/70">{club.tagline}</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-2 md:col-start-7">
            <h3 className="type-label text-secondary/70">Explore</h3>
            <ul className="mt-8 space-y-4 type-small">
              {[
                { href: "#club", label: "The club" },
                { href: "#team", label: "Team" },
                { href: "#hall-of-fame", label: "Hall of Fame" },
                { href: "#trophies", label: "Trophies" },
                { href: "#activities", label: "Activities" },
                { href: "#join", label: "Join" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-cream-300/80 transition-colors hover:text-secondary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3 md:col-start-10">
            <h3 className="type-label text-secondary/70">Find us</h3>
            <ul className="mt-8 space-y-4 type-small text-cream-300/80">
              <li>{club.homeCourt}</li>
              <li>{club.address}</li>
              <li>
                <a
                  href={`mailto:${club.email}`}
                  className="underline decoration-cream-300/30 underline-offset-4 transition-colors hover:text-secondary"
                >
                  {club.email}
                </a>
              </li>
              <li>{club.instagram}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-secondary/25 pt-8 type-label text-secondary/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {club.name}
          </p>
          <p>Built for the club · Placeholder content</p>
          <a href="#top" className="transition-colors hover:text-secondary">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
