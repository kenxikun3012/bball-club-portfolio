"use client";

import { ArrowLeft, ArrowRight } from "@/components/icons";
import { useCarousel } from "@/components/use-carousel";
import { Photo } from "@/components/photo";
import type { Inductee } from "@/lib/content";

/** Dark, gold-framed carousel of Hall of Fame inductees. */
export function HallOfFameCarousel({ inductees }: { inductees: Inductee[] }) {
  const { trackRef, active, atStart, atEnd, progress, onScroll, previous, next } =
    useCarousel(inductees.length);
  const position = atEnd ? inductees.length : active + 1;

  if (inductees.length === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Hall of Fame inductees"
      className="mt-16"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary/25 pb-4">
        <h3 className="type-label text-secondary">Inductees</h3>
        <div className="flex items-center gap-4">
          <p className="type-label text-cream-300/80 tabular-nums">
            {String(position).padStart(2, "0")} /{" "}
            {String(inductees.length).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={previous}
            disabled={atStart}
            aria-label="Previous inductee"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-secondary/40 text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={atEnd}
            aria-label="Next inductee"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-secondary/40 text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        role="group"
        aria-label="Inductees, scrollable"
        className="-mx-6 mt-8 flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-10 md:scroll-px-10 md:px-10 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {inductees.map((inductee, index) => (
          <div
            key={`${inductee.name}-${inductee.jerseyNumber}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${inductees.length}: ${inductee.name}`}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[30%]"
          >
            <article className="group">
              <div className="relative overflow-hidden border border-secondary/30">
                <Photo
                  tone="dark"
                  showLabel={false}
                  variant={index % 3}
                  alt=""
                  className="aspect-[4/5] w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                {inductee.retiredJersey ? (
                  <span className="absolute left-2 top-2 rounded-full border border-secondary/50 bg-ink/80 px-2 py-2 type-label text-secondary backdrop-blur-sm">
                    Retired #{inductee.jerseyNumber}
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-4 right-2 type-display leading-none text-secondary/20"
                >
                  {inductee.jerseyNumber}
                </span>
              </div>
              <h3 className="mt-4 type-h3 text-cream-100">{inductee.name}</h3>
              <p className="mt-2 type-label text-secondary">
                {inductee.years} · {inductee.position}
              </p>
              <p className="mt-4 type-small text-cream-300/85">{inductee.impact}</p>
              {inductee.quote ? (
                <blockquote className="mt-4 border-t border-secondary/25 pt-4 font-display italic type-body text-cream-300/85">
                  “{inductee.quote}”
                </blockquote>
              ) : null}
              <p className="mt-4 type-label text-cream-300/70">
                Inducted {inductee.inducted}
              </p>
            </article>
          </div>
        ))}
      </div>

      <div className="mt-4 h-px w-full bg-cream-100/10" aria-hidden="true">
        <div
          className="h-px bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
