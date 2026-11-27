import { ArrowRight, ChevronDown } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/cn";
import {
  formatEventDate,
  isoToday,
  nextTraining,
  type GalleryItem,
  type TrainingSlot,
  type UpcomingEvent,
} from "@/lib/content";

/** Gallery cards before "show more": the featured card plus one full row. */
const GALLERY_PREVIEW = 6;

/** Placeholder art follows what the moment felt like, not one beige tile for all. */
function toneFor(category: string): "light" | "dark" | "flame" {
  const value = category.toLowerCase();
  if (/game|match|final|tournament/.test(value)) return "dark";
  if (/award|community|recruit|social|celebrat/.test(value)) return "flame";
  return "light";
}

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const featured = Boolean(item.featured);
  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden rounded-sm border border-ink/10 bg-cream-200",
        featured ? "aspect-[16/10] md:aspect-auto" : "aspect-[4/3]",
      )}
    >
      <Photo
        variant={index % 3}
        tone={toneFor(item.category)}
        showLabel={false}
        src={item.image}
        alt={item.image ? item.title : ""}
        className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-full bg-cream-50/15 px-2 py-2 type-label text-cream-50 backdrop-blur-sm">
            {item.category}
          </span>
          <span className="type-label text-cream-50">{item.date}</span>
        </div>
        <h3 className={cn("mt-2 text-cream-50", featured ? "type-h3" : "type-h4")}>
          {item.title}
        </h3>
        {featured ? (
          <p className="mt-2 max-w-md type-small text-cream-100/90">{item.description}</p>
        ) : null}
      </div>
    </article>
  );
}

export function Activities({
  activitiesIntro,
  gallery,
  upcoming,
  training,
}: {
  activitiesIntro: string;
  gallery: GalleryItem[];
  upcoming: UpcomingEvent[];
  training: TrainingSlot[];
}) {
  // Fixtures that have already been played don't belong "on the calendar".
  // Dates that are not YYYY-MM-DD can't be compared, so they are kept.
  const today = isoToday();
  const scheduled = upcoming
    .filter((event) => !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = nextTraining(training);

  const preview = gallery.slice(0, GALLERY_PREVIEW);
  const more = gallery.slice(GALLERY_PREVIEW);

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
            title="Where the season actually happens."
            intro={activitiesIntro}
          />
        </Reveal>

        {gallery.length > 0 ? (
          <>
            <ul className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {preview.map((item, index) => (
                <li
                  key={item.title}
                  className={cn(item.featured && "sm:col-span-2 md:row-span-2")}
                >
                  <Reveal delay={Math.min(index, 3) * 50} className="h-full">
                    <GalleryCard item={item} index={index} />
                  </Reveal>
                </li>
              ))}
            </ul>

            {more.length > 0 ? (
              <details className="group mt-8">
                <summary className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink/15 px-6 type-label text-ink transition-colors hover:border-ink/40">
                  <span className="group-open:hidden">Show {more.length} more moments</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                  <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {more.map((item, index) => (
                    <li key={item.title}>
                      <GalleryCard
                        item={{ ...item, featured: false }}
                        index={index + GALLERY_PREVIEW}
                      />
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}

        <Reveal>
          <div className="mt-16 grid gap-16 border-t border-secondary/40 pt-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4">
              <h3 className="type-h3">On the calendar</h3>
              <p className="mt-4 max-w-xs type-small text-ink-soft">
                Fixtures are open to members and students. Open gyms need no booking — bring
                shoes and a shirt.
              </p>
              <a
                href="#join"
                className="mt-4 inline-flex min-h-11 items-center gap-2 type-small underline decoration-ink/30 underline-offset-8 transition-colors hover:text-accent hover:decoration-accent"
              >
                See training times
                <ArrowRight />
              </a>
            </div>

            {scheduled.length === 0 ? (
              <div className="border-y border-secondary/40 py-8 md:col-span-7 md:col-start-6">
                <p className="type-small text-ink-soft">
                  No fixtures on the calendar right now — training carries on every week.
                </p>
                {next ? (
                  <p className="mt-4 type-h4">
                    Next practice: {next.when}, {next.slot.time}
                    <span className="block type-small text-muted">{next.slot.note}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <ul className="md:col-span-7 md:col-start-6">
                {scheduled.map((event) => (
                  <li
                    key={`${event.date}-${event.title}`}
                    className="grid grid-cols-[6rem_1fr] items-baseline gap-x-8 gap-y-2 border-t border-secondary/40 py-4 last:border-b sm:grid-cols-[6rem_1fr_auto]"
                  >
                    <span className="type-h4">{formatEventDate(event.date)}</span>
                    <span>
                      <span className="block type-small font-medium">{event.title}</span>
                      <span className="block type-small text-muted">{event.location}</span>
                    </span>
                    <span className="col-start-2 justify-self-start rounded-full border border-secondary/60 px-2 py-2 type-label text-muted sm:col-start-auto">
                      {event.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
