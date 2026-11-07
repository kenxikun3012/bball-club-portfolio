import { MemberPhoto } from "@/components/photo";
import type { RosterPlayer } from "@/lib/content";

/** Portrait card used in the featured-players carousel. */
export function FeaturedCard({ player }: { player: RosterPlayer }) {
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-sm border border-ink/10 bg-cream-200">
        <MemberPhoto
          name={player.name}
          src={player.image}
          showLabel={false}
          variant={player.number % 3}
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
      <p className="mt-2 type-label text-secondary-ink">{player.role}</p>
      <p className="mt-2 type-small text-muted">
        {player.position} · {player.year}
      </p>
    </article>
  );
}
