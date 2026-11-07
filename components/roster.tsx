import { MemberPhoto } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { players, staff } from "@/lib/content";

export function Roster() {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="scroll-mt-20 border-b border-secondary/40 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <Reveal>
          <SectionHeading
            id="team-title"
            index="02"
            eyebrow="The roster"
            title={
              <>
                Twenty-four players,
                <br className="hidden sm:block" /> one standard.
              </>
            }
            intro={
              <>
                Every lineup is <span className="text-secondary-ink">earned at practice</span>.
                Positions are the coach&apos;s problem — the roster below is how the club
                introduces itself.
              </>
            }
          />
        </Reveal>

        <ul className="mt-16 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {players.map((player, index) => (
            <li key={player.number}>
              <Reveal delay={(index % 4) * 60}>
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
                  <p className="mt-2 type-label text-secondary-ink">
                    {player.position}
                  </p>
                  <p className="mt-4 type-small text-ink-soft/75">{player.bio}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4 type-small text-muted">
                    <span>{player.year}</span>
                    <span>{player.height}</span>
                    <span>{player.hometown}</span>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal>
          <div className="mt-24 border-t border-secondary/40 pt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="type-h3">The bench</h3>
              <p className="type-label text-muted">Coaches, staff &amp; volunteers</p>
            </div>
            <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {staff.map((member) => (
                <div key={member.name} className="border-t border-secondary/40 pt-4">
                  <dt className="type-h4">{member.name}</dt>
                  <dd className="mt-2 type-label text-secondary-ink">
                    {member.role}
                  </dd>
                  <dd className="mt-2 type-small text-ink-soft/75">{member.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
