import { MemberPhoto } from "@/components/photo";
import type { Player } from "@/lib/content";

/** One player card — shared by the desktop grid and the mobile carousel. */
export function PlayerCard({ player, index }: { player: Player; index: number }) {
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-sm border border-ink/10 bg-cream-200">
        <MemberPhoto
          name={player.name}
          src={player.image}
          label={`No. ${player.number}`}
          variant={(player.number + index) % 3}
          className="aspect-[4/5] w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 type-h3 text-ink/30"
        >
          {player.number}
        </span>
      </div>
      <h3 className="mt-4 type-h4">{player.name}</h3>
      <p className="mt-2 type-label text-secondary-ink">{player.position}</p>
      <p className="mt-4 type-small text-ink-soft/75">{player.bio}</p>
      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4 type-small text-muted">
        <span>{player.year}</span>
        <span>{player.height}</span>
        <span>{player.hometown}</span>
      </div>
    </article>
  );
}
