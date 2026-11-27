import { MemberPhoto } from "@/components/photo";
import { splitNickname, type RosterPlayer } from "@/lib/content";

/** Portrait card used in the featured-players carousel. */
export function FeaturedCard({ player }: { player: RosterPlayer }) {
  const { name, nickname } = splitNickname(player.name);

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-sm border border-ink/10 bg-cream-200">
        <MemberPhoto
          name={player.name}
          src={player.image}
          showLabel={false}
          tone={player.role === "Captain" ? "flame" : "light"}
          variant={player.number % 3}
          className="aspect-[4/5] w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
        <span
          aria-hidden="true"
          className="absolute right-4 top-2 type-h3 text-ink/40 tabular-nums"
        >
          {player.number}
        </span>
      </div>
      <h3 className="mt-4 type-h4">{name}</h3>
      {nickname ? (
        <p className="font-display italic type-body text-accent">“{nickname}”</p>
      ) : null}
      <p className="mt-2 type-label text-secondary-ink">{player.role}</p>
      <p className="mt-2 type-small text-muted">
        {player.position} · {player.year}
      </p>
    </article>
  );
}
