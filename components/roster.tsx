import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { RosterBoard } from "@/components/roster-board";
import type { RosterGroup, StaffMember } from "@/lib/content";

export function Roster({
  rosters,
  staff,
  currentSeason,
}: {
  rosters: RosterGroup[];
  staff: StaffMember[];
  currentSeason: string;
}) {
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
                Two squads, one standard. Start with the{" "}
                <span className="text-secondary-ink">featured players</span> above, then
                scan the full roster below — 12 starters and 12 development players in each
                squad.
              </>
            }
          />
        </Reveal>

        <RosterBoard rosters={rosters} currentSeason={currentSeason} />

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
                  <dd className="mt-2 type-label text-secondary-ink">{member.role}</dd>
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
