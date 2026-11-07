import { MemberPhoto } from "@/components/photo";
import type { RosterPlayer } from "@/lib/content";

/** Compact, scannable roster row used in the two-column grid. */
export function PlayerRow({
  player,
  highlight,
}: {
  player: RosterPlayer;
  /** Optional filter-specific line, e.g. "12 sessions this month". */
  highlight?: string;
}) {
  return (
    <article className="group flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <div className="relative w-full shrink-0 overflow-hidden rounded-sm border border-ink/10 bg-cream-200 lg:w-40">
        <MemberPhoto
          name={player.name}
          src={player.image}
          showLabel={false}
          variant={player.number % 3}
          className="aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.02] lg:aspect-square"
        />
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 type-h3 text-ink/30"
        >
          {player.number}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className="min-w-0 break-words type-h4">{player.name}</h3>
          <span className="shrink-0 type-label text-secondary-ink">
            {player.role}
          </span>
        </div>
        <p className="mt-2 type-label text-muted">
          {player.position} · {player.year}
        </p>
        <p className="mt-2 type-small text-muted">
          {player.height} · {player.hometown}
        </p>
        {highlight ? (
          <p className="mt-2 type-label text-secondary-ink">{highlight}</p>
        ) : null}
      </div>
    </article>
  );
}
