import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import {
  activitiesIntro,
  formatEventDate,
  gallery,
  upcoming,
} from "@/lib/content";
import { cn } from "@/lib/cn";

export function Activities() {
  return (
    <section
      id="activities"
      aria-labelledby="activities-title"
      className="scroll-mt-20 border-b border-secondary/40 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <Reveal>
          <SectionHeading
            id="activities-title"
            index="05"
            eyebrow="Activities"
            title={
              <>
                Where the season
                <br className="hidden sm:block" /> actually happens.
              </>
            }
            intro={activitiesIntro}
          />
        </Reveal>

        <ul className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {gallery.map((item, index) => {
            const featured = Boolean(item.featured);
            return (
              <li key={item.title} className={cn(featured && "sm:col-span-2 md:row-span-2")}>
                <Reveal delay={Math.min(index, 3) * 50} className="h-full">
                  <article
                    className={cn(
                      "group relative h-full overflow-hidden rounded-sm border border-ink/10 bg-cream-200",
                      featured ? "aspect-[16/10] md:aspect-auto" : "aspect-[4/3]",
                    )}
                  >
                    <Photo
                      variant={index % 3}
                      label={item.title}
                      src={item.image}
                      alt={item.image ? item.title : ""}
                      className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="rounded-full bg-cream-50/15 px-2 py-2 type-label text-cream-50 backdrop-blur-sm">
                          {item.category}
                        </span>
                        <span className="type-label text-cream-100/65">{item.date}</span>
                      </div>
                      <h3
                        className={cn(
                          "mt-2 text-cream-50",
                          featured ? "type-h3" : "type-h4",
                        )}
                      >
                        {item.title}
                      </h3>
                      {featured ? (
                        <p className="mt-2 max-w-md type-small text-cream-100/75">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal>
          <div className="mt-16 grid gap-16 border-t border-secondary/40 pt-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4">
              <h3 className="type-h3">On the calendar</h3>
              <p className="mt-4 max-w-xs type-small text-ink-soft/75">
                Fixtures are open to members and students. Open gyms need no booking — bring
                shoes and a shirt.
              </p>
              <a
                href="#join"
                className="mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-2 type-small transition-colors hover:border-secondary hover:text-accent"
              >
                Ask about training times
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <ul className="md:col-span-7 md:col-start-6">
              {upcoming.map((event) => (
                <li
                  key={event.title}
                  className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-secondary/40 py-4 last:border-b"
                >
                  <span className="w-24 shrink-0 type-h4">
                    {formatEventDate(event.date)}
                  </span>
                  <span className="flex-1 type-small font-medium">{event.title}</span>
                  <span className="rounded-full border border-secondary/60 px-2 py-2 type-label text-muted">
                    {event.type}
                  </span>
                  <span className="w-full pl-32 type-small text-muted sm:w-auto sm:pl-0">
                    {event.location}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
