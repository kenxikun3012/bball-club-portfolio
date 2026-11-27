import { ArrowUp, FlameMark } from "@/components/icons";
import {
  contactHandle,
  extractEmail,
  isUnofficialContact,
  type Club,
} from "@/lib/content";
import { SECTION_LINKS } from "@/lib/nav";

export function SiteFooter({ club }: { club: Club }) {
  const year = new Date().getFullYear();
  const email = extractEmail(club.email);
  const instagram = contactHandle(club.instagram);
  const unofficial = isUnofficialContact(club.email) || isUnofficialContact(club.instagram);

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
            <FlameMark className="h-12 w-12 ring-1 ring-cream-100/15 rounded-full" />
            <p className="mt-6 type-h2 text-balance">{club.name}</p>
            <p lang="my" className="mt-2 type-small text-cream-300/85">
              ရန်ကုန်နည်းပညာတက္ကသိုလ် ဘတ်စကက်ဘောအသင်း
            </p>
            <p className="mt-6 max-w-sm type-small text-cream-300/85">
              Two squads, one home court, and a standing invitation to anyone who wants to
              play.
            </p>
            <p className="mt-8 type-label text-secondary">{club.tagline}</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-2 md:col-start-7">
            <h2 className="type-label text-secondary">Explore</h2>
            <ul className="mt-4 type-small">
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-cream-300/85 transition-colors hover:text-secondary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3 md:col-start-10">
            <h2 className="type-label text-secondary">Find us</h2>
            <ul className="mt-6 space-y-4 type-small text-cream-300/85">
              <li>{club.homeCourt}</li>
              <li>{club.address}</li>
              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-11 items-center break-all underline decoration-cream-300/50 underline-offset-4 transition-colors hover:text-secondary"
                  >
                    {email}
                  </a>
                </li>
              ) : null}
              {instagram ? <li>Instagram: {instagram}</li> : null}
              {unofficial ? (
                <li className="text-cream-300/70">No official club accounts yet.</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-secondary/25 pt-8 type-label text-cream-300/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {club.name}
          </p>
          <a
            href="#top"
            className="inline-flex min-h-11 items-center gap-2 self-start transition-colors hover:text-secondary sm:self-auto"
          >
            Back to top
            <ArrowUp />
          </a>
        </div>
      </div>
    </footer>
  );
}
