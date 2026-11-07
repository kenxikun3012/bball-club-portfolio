"use client";

import { useCallback, useRef, useState } from "react";
import { Photo } from "@/components/photo";
import type { Inductee } from "@/lib/content";

const GAP_PX = 32; // matches gap-8

/** Dark, gold-framed carousel of Hall of Fame inductees. */
export function HallOfFameCarousel({ inductees }: { inductees: Inductee[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const card = track?.firstElementChild as HTMLElement | null;
      if (!track || !card) return;

      const clamped = Math.max(0, Math.min(index, inductees.length - 1));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: clamped * (card.offsetWidth + GAP_PX),
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [inductees.length],
  );

  const handleScroll = () => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;

    const index = Math.round(track.scrollLeft / (card.offsetWidth + GAP_PX));
    setActive(Math.max(0, Math.min(index, inductees.length - 1)));
  };

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
          <p aria-live="polite" className="type-label text-cream-300/60 tabular-nums">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(inductees.length).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            aria-label="Previous inductee"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/40 text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:opacity-30"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active === inductees.length - 1}
            aria-label="Next inductee"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/40 text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:opacity-30"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="-mx-6 mt-8 flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-10 md:px-10"
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
              <p className="mt-4 type-small text-cream-300/75">{inductee.impact}</p>
              {inductee.quote ? (
                <blockquote className="mt-4 border-t border-secondary/25 pt-4 type-small text-cream-300/60">
                  “{inductee.quote}”
                </blockquote>
              ) : null}
              <p className="mt-4 type-label text-cream-300/45">
                Inducted {inductee.inducted}
              </p>
            </article>
          </div>
        ))}
      </div>

      <div className="mt-4 h-px w-full bg-cream-100/10" aria-hidden="true">
        <div
          className="h-px bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${((active + 1) / inductees.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
