"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { ChevronDown } from "@/components/icons";
import { PlayerRow } from "@/components/player-row";
import { type RosterGroup, type RosterPlayer } from "@/lib/content";

const FILTERS = [
  {
    id: "all",
    label: "Rest of the squad",
    blurb: "Everyone registered in this squad, after the featured players.",
  },
  {
    id: "elite-starters",
    label: "Starters & leaders",
    blurb: "Captains, aces and starters who represent the university.",
  },
  {
    id: "most-active",
    label: "Most training this month",
    blurb: "The five players with the most sessions this month.",
  },
  {
    id: "rising-stars",
    label: "Rising stars",
    blurb: "Fast-improving first- and second-year players.",
  },
  {
    id: "fresh-hoopers",
    label: "New this season",
    blurb: "Players who joined the club this season.",
  },
  {
    id: "achievers",
    label: "Award winners",
    blurb: "Players who have won personal awards.",
  },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

/** Rows shown before "Show all" on the default view — about one screen. */
const PREVIEW_COUNT = 6;

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
          (player.year === "Freshman" || player.year === "Sophomore" || /year i{1,2}\b/i.test(player.year)),
      );
    case "fresh-hoopers":
      return players.filter((player) => player.joined === currentSeason);
    case "achievers":
      return players.filter((player) => player.awards.length > 0);
    default:
      // The featured players are already on screen in the carousel above.
      return players.filter((player) => !player.featured);
  }
}

function highlightFor(player: RosterPlayer, filter: FilterId): string | undefined {
  if (filter === "most-active") return `${player.monthlySessions} sessions this month`;
  if (filter === "achievers") return player.awards.join(" · ");
  if (filter === "rising-stars") return "Fast improver";
  return undefined;
}

/**
 * Roster board: squad switch, filter, featured carousel and the list of
 * players matching the active filter (collapsed on the default view).
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
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const roster = rosters.find((item) => item.id === activeId) ?? rosters[0];
  if (!roster || roster.players.length === 0) {
    return (
      <p className="mt-16 border-y border-secondary/40 py-8 type-body text-ink-soft">
        The roster for this season is being finalised — come to a training session to
        meet the squad.
      </p>
    );
  }

  const activeFilter = FILTERS.find((filter) => filter.id === filterId) ?? FILTERS[0];
  const featured = roster.players.filter((player) => player.featured);
  const filtered = filterPlayers(roster.players, filterId, currentSeason);
  // Only the default view is long enough to need collapsing; a chosen filter
  // is an explicit request to see its results.
  const collapsible = filterId === "all" && filtered.length > PREVIEW_COUNT + 2;
  const visible = collapsible && !expanded ? filtered.slice(0, PREVIEW_COUNT) : filtered;

  const chooseRoster = (id: string) => {
    setActiveId(id);
    setExpanded(false);
  };

  return (
    <div className="mt-16">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="type-label text-muted">
            {roster.label} · {roster.players.length} players
          </p>
          <p className="mt-2 type-small text-ink-soft">{activeFilter.blurb}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div
            role="group"
            aria-label="Choose squad"
            className="inline-flex self-start overflow-hidden rounded-full border border-ink/15 sm:self-auto"
          >
            {rosters.map((item, index) => {
              const selected = item.id === roster.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseRoster(item.id)}
                  className={cn(
                    "min-h-11 px-6 type-label transition-colors",
                    index > 0 && "border-l border-ink/15",
                    selected ? "bg-ink text-cream-100" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <label htmlFor="roster-filter" className="type-label text-muted">
              Show
            </label>
            <div className="relative w-full sm:w-64">
              <select
                id="roster-filter"
                value={filterId}
                onChange={(event) => {
                  setFilterId(event.target.value as FilterId);
                  setExpanded(false);
                }}
                className="h-11 w-full appearance-none rounded-sm border border-ink/15 bg-cream-50 px-4 pr-10 type-small text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {roster.label}, {activeFilter.label}: {filtered.length} players
      </p>

      <FeaturedCarousel key={roster.id} players={featured} rosterLabel={roster.label} />

      <div className="mt-16">
        <div className="flex items-baseline justify-between gap-8 pb-4">
          <h3 className="type-label text-muted">{activeFilter.label}</h3>
          <p className="type-label text-muted tabular-nums">{filtered.length} players</p>
        </div>

        {filtered.length > 0 ? (
          <ul id={listId} className="grid gap-x-8 border-b border-ink/10 sm:grid-cols-2">
            {visible.map((player) => (
              <li key={`${roster.id}-${player.number}-${player.name}`}>
                <PlayerRow player={player} highlight={highlightFor(player, filterId)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-ink/10 pt-8 type-small text-ink-soft">
            Nobody matches this yet — try another view or the other squad.
          </p>
        )}

        {collapsible ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink/15 px-6 type-label text-ink transition-colors hover:border-ink/40"
          >
            {expanded
              ? "Show fewer players"
              : `Show all ${filtered.length} players`}
            <ChevronDown
              className={cn("transition-transform duration-300", expanded && "rotate-180")}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
