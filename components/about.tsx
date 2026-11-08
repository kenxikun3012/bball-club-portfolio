import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { initials, type Club } from "@/lib/content";

export function About({ club }: { club: Club }) {
  const { about } = club;

  return (
    <section
      id="club"
      aria-labelledby="club-title"
      className="scroll-mt-20 border-b border-secondary/40 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <Reveal>
          <SectionHeading
            id="club-title"
            index="01"
            eyebrow="The club"
            title={
              <>
                A student-run club
                <br className="hidden sm:block" /> with a{" "}
                <span className="text-secondary-ink">long memory.</span>
              </>
            }
            intro={about.intro}
          />
        </Reveal>

        <div className="mt-16 grid gap-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6">
            <Reveal>
              <div className="space-y-8 type-body text-ink-soft/90">
                {about.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-pretty">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="mt-12">
                <h3 className="type-label text-muted">What we play on</h3>
                <ul className="mt-8 divide-y divide-ink/10 border-y border-secondary/40">
                  {about.facilities.map((facility, index) => (
                    <li key={facility.title} className="flex gap-8 py-6">
                      <span className="mt-2 type-label text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="type-h4">{facility.title}</p>
                        <p className="mt-2 type-small text-ink-soft/75">
                          {facility.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-5 md:col-start-8">
            <Reveal delay={120}>
              <figure>
                <Photo
                  variant={1}
                  label="Main Campus Gymnasium"
                  alt="Placeholder photo of the club's home court"
                  className="aspect-[5/4] w-full rounded-sm border border-ink/10"
                />
                <figcaption className="mt-4 type-label text-muted">
                  Home since 1985 — Court 1, University Sports Complex
                </figcaption>
              </figure>

              <dl className="mt-8 divide-y divide-ink/10 border-y border-secondary/40">
                {about.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-8 py-4"
                  >
                    <dt className="type-label text-muted">{fact.label}</dt>
                    <dd className="text-right type-small text-ink-soft">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>

        <Reveal delay={80}>
          <div className="mt-16">
            <div className="flex flex-col gap-2 border-t border-secondary/40 pt-8 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="type-h3">Club committee</h3>
              <p className="type-label text-muted">Elected each September</p>
            </div>
            <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {club.committee.map((member) => (
                <li
                  key={member.role}
                  className="border border-ink/10 bg-cream-50 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="type-label text-secondary-ink">{member.role}</p>
                      <p className="mt-4 type-h4">{member.name}</p>
                      <p className="mt-2 type-label text-muted">{member.term}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cream-200 type-h4 text-ink/40"
                    >
                      {initials(member.name)}
                    </span>
                  </div>
                  <p className="mt-4 type-small text-ink-soft/75">{member.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <ol className="mt-16 grid gap-8 border-t border-secondary/40 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {about.milestones.map((milestone) => (
              <li key={milestone.year}>
                <p className="type-numeral">{milestone.year}</p>
                <p className="mt-2 type-small text-ink-soft/75">{milestone.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
