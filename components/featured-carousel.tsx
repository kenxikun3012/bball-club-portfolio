"use client";

import { ArrowLeft, ArrowRight } from "@/components/icons";
import { useCarousel } from "@/components/use-carousel";
import { FeaturedCard } from "@/components/featured-card";
import type { RosterPlayer } from "@/lib/content";

/** Horizontal featured-players carousel (all screen sizes). */
export function FeaturedCarousel({
  players,
  rosterLabel,
}: {
  players: RosterPlayer[];
  rosterLabel: string;
}) {
  const { trackRef, active, atStart, atEnd, progress, onScroll, previous, next } =
    useCarousel(players.length);
  const position = atEnd ? players.length : active + 1;

  if (players.length === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Featured players — ${rosterLabel}`}
      className="mt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="type-label text-secondary-ink">Featured players</h3>
        <div className="flex items-center gap-4">
          <p className="type-label text-muted tabular-nums">
            {String(position).padStart(2, "0")} /{" "}
            {String(players.length).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={previous}
            disabled={atStart}
            aria-label="Previous featured player"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-secondary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={atEnd}
            aria-label="Next featured player"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-secondary disabled:cursor-not-allowed disabled:opacity-30"
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
        aria-label="Featured players, scrollable"
        className="-mx-6 mt-4 flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-10 md:scroll-px-10 md:px-10 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {players.map((player, index) => (
          <div
            key={`${player.number}-${player.name}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${players.length}: ${player.name}, ${player.role}`}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[23%]"
          >
            <FeaturedCard player={player} />
          </div>
        ))}
      </div>

      <div className="mt-4 h-px w-full bg-ink/10" aria-hidden="true">
        <div
          className="h-px bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
