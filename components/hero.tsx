import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { Highlighted } from "@/components/highlight";
import type { Club } from "@/lib/content";

export function Hero({ club }: { club: Club }) {
  const [lineOne, lineTwo] = club.hero.headline;
  const titles = club.stats[0];

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* decorative half-court lines */}
      <svg
        viewBox="0 0 900 900"
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-10 hidden h-[min(88vh,800px)] w-auto text-ink/10 lg:block"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="450" cy="450" r="420" />
          <circle cx="450" cy="450" r="250" />
          <line x1="30" y1="450" x2="870" y2="450" />
          <line x1="450" y1="30" x2="450" y2="870" />
          <path d="M 0 210 L 300 210 L 300 690 L 0 690" />
          <path d="M 900 210 L 600 210 L 600 690 L 900 690" />
        </g>
      </svg>

      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <div className="grid gap-16 pb-24 pt-16 md:pt-24 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-32">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="flex items-center gap-4 type-label text-accent">
                <span aria-hidden="true" className="h-px w-10 bg-secondary" />
                {club.hero.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 id="hero-title" className="mt-8 type-display">
                <span className="block">{lineOne}</span>
                <span className="relative mt-2 inline-block">
                  {lineTwo}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 h-1 w-[78%] bg-secondary md:-bottom-4 md:h-2"
                  />
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-8 max-w-xl type-lead text-pretty text-ink-soft">
                <Highlighted
                  text={club.hero.intro}
                  phrase={club.hero.introHighlight}
                />
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-12 flex flex-col items-start gap-8 sm:flex-row sm:items-center">
                <a
                  href="#join"
                  className="inline-flex items-center gap-4 rounded-sm bg-ink px-8 py-4 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink"
                >
                  {club.hero.primaryCta}
                  <span aria-hidden="true">→</span>
                </a>
                <a
                  href="#team"
                  className="group inline-flex items-center gap-2 border-b border-ink/25 pb-2 type-small text-ink transition-colors hover:border-secondary hover:text-accent"
                >
                  {club.hero.secondaryCta}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <dl className="mt-16 grid max-w-lg grid-cols-3 gap-8 border-t border-secondary/40 pt-8">
                {[
                  { label: "Founded", value: String(club.founded) },
                  { label: "Home court", value: "Main Campus" },
                  { label: "Season", value: "25/26" },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="type-label text-muted">{item.label}</dt>
                    <dd className="mt-2 type-h4">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={180} className="relative">
              <figure className="relative">
                <Photo
                  priority
                  label={club.hero.caption}
                  variant={0}
                  className="aspect-[4/5] w-full rounded-sm border border-ink/10 shadow-editorial"
                />
                <figcaption className="mt-4 flex items-center justify-between type-label text-muted">
                  <span>{club.hero.caption}</span>
                  <span>01 / 08</span>
                </figcaption>
              </figure>

              <div className="absolute -left-4 bottom-16 hidden w-44 border border-ink/10 border-t-4 border-t-secondary bg-secondary-wash p-6 shadow-editorial backdrop-blur-sm sm:block">
                <p className="type-stat">{titles.value}</p>
                <p className="mt-2 type-label text-muted">{titles.label}</p>
                <p className="mt-4 border-t border-secondary/50 pt-2 type-small text-ink-soft/70">
                  Most recently won in 2025.
                </p>
              </div>

              <span
                aria-hidden="true"
                className="absolute -right-4 -top-4 flex h-24 w-24 items-center justify-center rounded-full border border-secondary/60 bg-cream-100/80 backdrop-blur-sm"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="h-20 w-20 animate-[spin_36s_linear_infinite] text-ink/50"
                >
                  <defs>
                    <path
                      id="hero-circle"
                      d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    />
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="49"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    opacity="0.5"
                  />
                  <text fontSize="9.5" fill="currentColor" letterSpacing="2.6">
                    <textPath href="#hero-circle">
                      EST. 1985 · UNIVERSITY BASKETBALL CLUB ·
                    </textPath>
                  </text>
                </svg>
              </span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
