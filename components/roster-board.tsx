"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { PlayerRow } from "@/components/player-row";
import { Reveal } from "@/components/reveal";
import { type RosterGroup, type RosterPlayer } from "@/lib/content";

const FILTERS = [
  {
    id: "all",
    label: "All players",
    blurb: "Every registered player in this squad.",
  },
  {
    id: "elite-starters",
    label: "Elite starters",
    blurb: "The 12 players representing the university.",
  },
  {
    id: "most-active",
    label: "Most active",
    blurb: "Top 5 training attendance this month.",
  },
  {
    id: "rising-stars",
    label: "Rising stars",
    blurb: "Fast-improving first- and second-year players.",
  },
  {
    id: "fresh-hoopers",
    label: "Fresh hoopers",
    blurb: "Joined the club this season.",
  },
  {
    id: "achievers",
    label: "Achievers",
    blurb: "Players who have won personal awards.",
  },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function filterPlayers(
  players: RosterPlayer[],
  filter: FilterId,
  currentSeason: string,
): RosterPlayer[] {
  switch (filter) {
    case "elite-starters":
      return players.filter((player) => player.role !== "Member");
    case "most-active":
      return [...players]
        .sort((a, b) => b.monthlySessions - a.monthlySessions)
        .slice(0, 5);
    case "rising-stars":
      return players.filter(
        (player) =>
          player.risingStar &&
          (player.year === "Freshman" || player.year === "Sophomore"),
      );
    case "fresh-hoopers":
      return players.filter((player) => player.joined === currentSeason);
    case "achievers":
      return players.filter((player) => player.awards.length > 0);
    default:
      return players;
  }
}

function highlightFor(player: RosterPlayer, filter: FilterId): string | undefined {
  if (filter === "most-active") {
    return `${player.monthlySessions} sessions this month`;
  }
  if (filter === "achievers") {
    return player.awards.join(" · ");
  }
  if (filter === "rising-stars") {
    return "Fast improver · year I–II";
  }
  return undefined;
}

/**
 * Roster board: men's / women's switch, filter drop-down, featured carousel
 * and the two-column grid of players matching the active filter.
 */
export function RosterBoard({
  rosters,
  currentSeason,
}: {
  rosters: RosterGroup[];
  currentSeason: string;
}) {
  const [activeId, setActiveId] = useState(rosters[0]?.id ?? "");
  const [filterId, setFilterId] = useState<FilterId>("all");
  const roster = rosters.find((item) => item.id === activeId) ?? rosters[0];
  if (!roster) return null;

  const activeFilter = FILTERS.find((filter) => filter.id === filterId) ?? FILTERS[0];
  const featured = roster.players.filter((player) => player.featured);
  const filtered = filterPlayers(roster.players, filterId, currentSeason);

  return (
    <div className="mt-16">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="type-label text-muted">
            {roster.label} · {roster.players.length} players
          </p>
          <p className="mt-2 type-small text-ink-soft/75">{activeFilter.blurb}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-4">
            <label htmlFor="roster-filter" className="type-label text-muted">
              Filter
            </label>
            <div className="relative">
              <select
                id="roster-filter"
                value={filterId}
                onChange={(event) => setFilterId(event.target.value as FilterId)}
                className="w-full appearance-none rounded-sm border border-ink/15 bg-cream-50 px-4 py-2 pr-10 type-small text-ink transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 sm:w-56"
              >
                {FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-4 flex items-center type-small text-muted"
              >
                ▾
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Choose roster"
            className="inline-flex self-start overflow-hidden rounded-full border border-ink/15 sm:self-auto"
          >
            {rosters.map((item, index) => {
              const selected = item.id === roster.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "px-4 py-2 type-label transition-colors",
                    index > 0 && "border-l border-ink/15",
                    selected
                      ? "bg-ink text-cream-100"
                      : "text-ink-soft hover:text-ink",
                  )}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {roster.label}, filter {activeFilter.label} — {filtered.length} players
      </p>

      <FeaturedCarousel
        key={roster.id}
        players={featured}
        rosterLabel={roster.label}
      />

      <div className="mt-16">
        <div className="flex items-baseline justify-between gap-8 border-b border-secondary/40 pb-4">
          <h3 className="type-label text-muted">{activeFilter.label}</h3>
          <p className="type-label text-muted">
            {String(filtered.length).padStart(2, "0")} players
          </p>
        </div>

        {filtered.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8">
            {filtered.map((player, index) => (
              <li key={`${roster.id}-${player.number}`}>
                <Reveal delay={(index % 2) * 60}>
                  <PlayerRow
                    player={player}
                    highlight={highlightFor(player, filterId)}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 type-small text-muted">
            No players match this filter yet — try another filter or the other roster.
          </p>
        )}
      </div>
    </div>
  );
}
