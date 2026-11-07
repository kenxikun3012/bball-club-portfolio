import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { HallOfFameCarousel } from "@/components/hall-of-fame-carousel";
import { hallOfFame } from "@/lib/content";

export function HallOfFame() {
  return (
    <section
      id="hall-of-fame"
      aria-labelledby="hall-of-fame-title"
      className="relative scroll-mt-20 overflow-hidden bg-ink py-24 text-cream-100 md:py-32"
    >
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full text-secondary/[0.07]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="1230" cy="180" r="320" />
          <circle cx="1230" cy="180" r="190" />
          <line x1="910" y1="180" x2="1440" y2="180" />
          <line x1="1230" y1="-140" x2="1230" y2="520" />
          <path d="M 0 760 L 220 760 L 220 900" />
        </g>
      </svg>

      <div className="relative mx-auto max-w-[1240px] px-6 md:px-10">
        <Reveal>
          <SectionHeading
            id="hall-of-fame-title"
            tone="dark"
            index="03"
            eyebrow="Hall of Fame"
            title={
              <>
                Forever on
                <br className="hidden sm:block" /> the wall.
              </>
            }
            intro={hallOfFame.intro}
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-16">
            <div className="flex items-baseline justify-between gap-8 border-b border-secondary/25 pb-4">
              <h3 className="type-label text-secondary">Retired jerseys</h3>
              <p className="type-label text-cream-300/60">
                {hallOfFame.retiredJerseys.length} numbers raised
              </p>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {hallOfFame.retiredJerseys.map((jersey) => (
                <li
                  key={jersey.number}
                  className="relative overflow-hidden border border-secondary/25 bg-secondary/[0.06] px-4 py-8 text-center"
                >
                  <p className="type-display text-secondary">{jersey.number}</p>
                  <p className="mt-4 type-label text-cream-100">{jersey.name}</p>
                  <p className="mt-2 type-label text-cream-300/60">{jersey.years}</p>
                  <p className="mt-4 type-small text-cream-300/70">{jersey.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <HallOfFameCarousel inductees={hallOfFame.inductees} />
        </Reveal>
      </div>
    </section>
  );
}
