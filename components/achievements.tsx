import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { achievements, achievementSummary, club } from "@/lib/content";
import { cn } from "@/lib/cn";

function resultBadge(result: string) {
  const champion = result.toLowerCase() === "champions";
  return cn(
    "inline-flex items-center rounded-full px-2 py-2 type-label",
    champion ? "bg-secondary text-ink" : "border border-secondary/60 text-ink-soft/80",
  );
}

export function Achievements() {
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
            index="04"
            eyebrow="Honours"
            title={
              <>
                The
                <br className="hidden sm:block" /> trophy room.
              </>
            }
            intro="Four decades of finals, one-night comebacks and the occasional heartbreak. This is the part the club is quietly proud of."
          />
        </Reveal>

        <div className="mt-16 grid gap-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <ol className="relative ml-2 border-l border-secondary/50 pl-8">
              {achievements.map((item, index) => (
                <li key={`${item.year}-${item.title}`} className="relative pb-12 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 top-2 h-2 w-2 -translate-x-1/2 rounded-full ring-4 ring-cream-100",
                      index === 0 ? "bg-accent" : "bg-cream-400",
                    )}
                  />
                  <Reveal delay={Math.min(index, 4) * 40}>
                    <div className="flex flex-wrap items-baseline gap-4">
                      <span className="type-numeral">{item.year}</span>
                      <span className={resultBadge(item.result)}>{item.result}</span>
                    </div>
                    <h3 className="mt-4 type-h4">{item.title}</h3>
                    <p className="mt-2 type-label text-muted">{item.competition}</p>
                    <p className="mt-4 max-w-lg type-small text-ink-soft/75">
                      {item.note}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>

          <aside className="md:col-span-4 md:col-start-9">
            <Reveal delay={120}>
              <div className="bg-ink p-8 text-cream-100">
                <p className="type-label text-secondary/75">Honours at a glance</p>
                <dl className="mt-8 grid grid-cols-2 gap-8">
                  {achievementSummary.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="type-stat">{stat.value}</dd>
                      <dd className="mt-2 type-label text-secondary/60">{stat.label}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-8 border-t border-secondary/30 pt-4 type-small text-cream-300/75">
                  The club&apos;s first regional title came in 1998. The most recent
                  conference final was won in 2025.
                </p>
                <p className="mt-4 type-label text-secondary/60">
                  {club.shortName} · Est. {club.founded}
                </p>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
