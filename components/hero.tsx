import { ArrowRight } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { Highlighted } from "@/components/highlight";
import { nextTraining, shortSeason, type Club } from "@/lib/content";

export function Hero({ club }: { club: Club }) {
  const [lineOne, lineTwo] = club.hero.headline;
  const titles = club.stats[0];
  const next = nextTraining(club.training);

  const facts = [
    { label: "Founded", value: String(club.founded) },
    { label: "Season", value: shortSeason(club.currentSeason) },
    ...(club.stats[1] ? [club.stats[1]] : []),
  ];

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
              <h1 id="hero-title" className="type-display">
                <span className="block">{lineOne}</span>
                <span className="relative mt-2 inline-block">
                  {lineTwo}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 h-1 w-[78%] bg-[linear-gradient(90deg,var(--color-accent),var(--color-secondary))] md:-bottom-4 md:h-2"
                  />
                </span>
              </h1>
              <p lang="my" className="mt-8 type-small text-muted">
                ရန်ကုန်နည်းပညာတက္ကသိုလ် ဘတ်စကက်ဘောအသင်း
              </p>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-6 max-w-xl type-lead text-ink-soft">
                <Highlighted text={club.hero.intro} phrase={club.hero.introHighlight} />
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
                <a
                  href="#join"
                  className="group inline-flex min-h-12 items-center gap-4 rounded-sm bg-ink px-8 type-label text-cream-100 transition-colors hover:bg-accent"
                >
                  {club.hero.primaryCta}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <a
                  href="#team"
                  className="inline-flex min-h-11 items-center gap-2 type-small text-ink underline decoration-ink/30 underline-offset-8 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {club.hero.secondaryCta}
                </a>
              </div>
              {next ? (
                <p className="mt-6 type-small text-ink-soft">
                  <span className="font-semibold text-ink">Next practice:</span> {next.when},{" "}
                  {next.slot.time} · {next.slot.note}. Just turn up — no booking needed.
                </p>
              ) : null}
            </Reveal>

            <Reveal delay={240}>
              <dl className="mt-16 grid max-w-lg grid-cols-3 grid-rows-[auto_auto] gap-x-8 border-t border-secondary/40 pt-8">
                {facts.map((item) => (
                  <div key={item.label} className="row-span-2 grid grid-rows-subgrid">
                    <dt className="type-label text-muted">{item.label}</dt>
                    <dd className="mt-2 self-end type-h4 tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={160} className="relative">
              <figure className="relative">
                <Photo
                  priority
                  showLabel={false}
                  tone="flame"
                  label={club.hero.caption}
                  className="aspect-[4/5] w-full rounded-sm border border-ink/10 shadow-editorial"
                />
                <figcaption className="mt-4 type-label text-muted">
                  {club.hero.caption}
                </figcaption>
              </figure>

              {titles ? (
                <div className="absolute -left-4 bottom-16 hidden w-44 border border-ink/10 border-t-4 border-t-accent bg-cream-50 p-6 shadow-editorial sm:block">
                  <p className="type-stat tabular-nums">{titles.value}</p>
                  <p className="mt-2 type-label text-muted">{titles.label}</p>
                </div>
              ) : null}

              <span
                aria-hidden="true"
                className="absolute right-2 top-2 flex h-24 w-24 items-center justify-center rounded-full border border-cream-50/60 bg-cream-100/85 backdrop-blur-sm sm:-right-4 sm:-top-4"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="h-20 w-20 animate-[spin_36s_linear_infinite] text-ink motion-reduce:animate-none"
                >
                  <defs>
                    <path
                      id="hero-circle"
                      d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    />
                  </defs>
                  <text fontSize="9.5" fill="currentColor">
                    <textPath href="#hero-circle" textLength="226" lengthAdjust="spacing">
                      {`EST. ${club.founded} · ${club.shortName} BASKETBALL CLUB ·`.toUpperCase()}
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
