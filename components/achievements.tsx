import { ChevronDown } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/cn";
import type { Achievement, Club, Stat } from "@/lib/content";

/** Entries shown before the "full record" disclosure. */
const HIGHLIGHT_COUNT = 3;

function resultBadge(result: string) {
  const champion = result.toLowerCase() === "champions";
  return cn(
    "inline-flex items-center rounded-full px-2 py-2 type-label",
    champion ? "bg-secondary text-ink" : "border border-secondary-ink/40 text-ink-soft",
  );
}

function Entry({ item, first }: { item: Achievement; first: boolean }) {
  return (
    <li className="relative pb-12 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-10 top-4 h-2 w-2 -translate-x-1/2 rounded-full ring-4 ring-cream-100",
          first ? "bg-accent" : "bg-cream-400",
        )}
      />
      <div className="flex flex-wrap items-baseline gap-4">
        <span className="type-numeral tabular-nums">{item.year}</span>
        <span className={resultBadge(item.result)}>{item.result}</span>
      </div>
      <h3 className="mt-4 type-h4">{item.title}</h3>
      <p className="mt-2 type-label text-muted">{item.competition}</p>
      <p className="mt-4 max-w-lg type-small text-ink-soft">{item.note}</p>
    </li>
  );
}

export function Achievements({
  achievements,
  achievementSummary,
  club,
}: {
  achievements: Achievement[];
  achievementSummary: Stat[];
  club: Club;
}) {
  const latest = achievements[0];
  const highlights = achievements.slice(0, HIGHLIGHT_COUNT);
  const rest = achievements.slice(HIGHLIGHT_COUNT);

  return (
    <section
      id="trophies"
      aria-labelledby="trophies-title"
      className="scroll-mt-20 border-b border-secondary/40 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <Reveal>
          <SectionHeading
            id="trophies-title"
            title="The trophy room."
            intro="Finals, one-night comebacks and the occasional heartbreak. This is the part the club is quietly proud of."
          />
        </Reveal>

        <div className="mt-16 grid gap-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            {achievements.length === 0 ? (
              <p className="type-body text-ink-soft">
                The honours list is being written up — check back soon.
              </p>
            ) : (
              <Reveal>
                <div className="ml-2 border-l border-secondary/50 pl-10">
                  <ol>
                    {highlights.map((item, index) => (
                      <Entry key={`${item.year}-${item.title}`} item={item} first={index === 0} />
                    ))}
                  </ol>

                  {rest.length > 0 ? (
                    <details className="group mt-12">
                      <summary className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink/15 px-6 type-label text-ink transition-colors hover:border-ink/40">
                        <span className="group-open:hidden">
                          Show the full record ({rest.length} more)
                        </span>
                        <span className="hidden group-open:inline">Hide the full record</span>
                        <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
                      </summary>
                      <ol start={HIGHLIGHT_COUNT + 1} className="mt-12">
                        {rest.map((item) => (
                          <Entry key={`${item.year}-${item.title}`} item={item} first={false} />
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </div>
              </Reveal>
            )}
          </div>

          {achievementSummary.length > 0 || latest ? (
            <aside className="md:col-span-4 md:col-start-9">
              <Reveal delay={120}>
                <div className="bg-ink p-8 text-cream-100">
                  <h3 className="type-label text-secondary">Honours at a glance</h3>
                  {achievementSummary.length > 0 ? (
                    <dl className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-1 lg:grid-cols-2">
                      {achievementSummary.map((stat) => (
                        <div key={stat.label} className="flex flex-col-reverse">
                          <dt className="mt-2 type-label text-cream-300/85">{stat.label}</dt>
                          <dd className="type-stat tabular-nums">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {latest ? (
                    <p className="mt-8 border-t border-secondary/30 pt-4 type-small text-cream-300/85">
                      Most recent: {latest.title} ({latest.result.toLowerCase()},{" "}
                      {latest.year}).
                    </p>
                  ) : null}
                  <p className="mt-4 type-label text-secondary/80">
                    {club.shortName} · Est. {club.founded}
                  </p>
                </div>
              </Reveal>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
