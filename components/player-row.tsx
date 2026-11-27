import { Photo } from "@/components/photo";
import { splitNickname, type RosterPlayer } from "@/lib/content";

/**
 * Compact roster entry. Without a real photo there is nothing to show in a
 * tile, so the jersey number carries the row instead of a placeholder image.
 */
export function PlayerRow({
  player,
  highlight,
}: {
  player: RosterPlayer;
  /** Optional filter-specific line, e.g. "12 sessions this month". */
  highlight?: string;
}) {
  const { name, nickname } = splitNickname(player.name);

  return (
    <article className="flex items-start gap-4 border-t border-ink/10 py-6">
      {player.image ? (
        <Photo
          src={player.image}
          alt={`Portrait of ${name}`}
          className="h-16 w-16 shrink-0 rounded-sm border border-ink/10"
        />
      ) : null}
      <p className="w-12 shrink-0 type-numeral text-accent tabular-nums">
        <span className="sr-only">Number </span>
        {player.number}
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className="min-w-0 break-words type-h4">{name}</h3>
          <span className="shrink-0 type-label text-secondary-ink">{player.role}</span>
        </div>
        {nickname ? (
          <p className="font-display italic type-body text-accent">“{nickname}”</p>
        ) : null}
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
