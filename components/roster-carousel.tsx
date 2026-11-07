"use client";

import { useCallback, useRef, useState } from "react";
import { PlayerCard } from "@/components/player-card";
import type { Player } from "@/lib/content";

const GAP_PX = 32; // matches gap-8

/** Mobile-only, swipeable roster carousel. Desktop keeps the grid. */
export function RosterCarousel({ players }: { players: Player[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const card = track?.firstElementChild as HTMLElement | null;
      if (!track || !card) return;

      const clamped = Math.max(0, Math.min(index, players.length - 1));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: clamped * (card.offsetWidth + GAP_PX),
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [players.length],
  );

  const handleScroll = () => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;

    const index = Math.round(track.scrollLeft / (card.offsetWidth + GAP_PX));
    setActive(Math.max(0, Math.min(index, players.length - 1)));
  };

  const progress = ((active + 1) / players.length) * 100;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Player roster — swipe or use the arrows"
      className="lg:hidden"
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="-mx-6 mt-16 flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-10 md:px-10"
      >
        {players.map((player, index) => (
          <div
            key={player.number}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${players.length}: ${player.name}`}
            className="w-[85%] shrink-0 snap-start sm:w-[64%]"
          >
            <PlayerCard player={player} index={index} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-8">
        <p className="type-label text-muted" aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(players.length).padStart(2, "0")}
        </p>
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            aria-label="Previous player"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-secondary disabled:opacity-30"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active === players.length - 1}
            aria-label="Next player"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-secondary disabled:opacity-30"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-ink/10" aria-hidden="true">
        <div
          className="h-px bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
