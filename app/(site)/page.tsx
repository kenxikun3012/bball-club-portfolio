import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { About } from "@/components/about";
import { Roster } from "@/components/roster";
import { HallOfFame } from "@/components/hall-of-fame";
import { Achievements } from "@/components/achievements";
import { Activities } from "@/components/activities";
import { Contact } from "@/components/contact";
import { Reveal } from "@/components/reveal";
import { getSiteContent } from "@/lib/content-db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getSiteContent();

  return (
    <>
      <Hero club={content.club} />
      <Ticker stats={content.club.stats} founded={content.club.founded} />
      <About club={content.club} />
      <Roster
        rosters={content.rosters}
        staff={content.staff}
        currentSeason={content.club.currentSeason}
      />
      <HallOfFame hallOfFame={content.hallOfFame} />
      <Achievements
        achievements={content.achievements}
        achievementSummary={content.achievementSummary}
        club={content.club}
      />
      <Activities
        activitiesIntro={content.activitiesIntro}
        gallery={content.gallery}
        upcoming={content.upcoming}
      />
      <Contact club={content.club} />
      <div aria-hidden="true" className="mx-auto max-w-[1240px] px-6 pb-16 md:px-10">
        <Reveal>
          <p className="border-t border-secondary/40 pt-8 text-center type-lead text-balance text-ink-soft">
            “Show up early. Stay late.{" "}
            <span className="text-secondary-ink">Pass the ball.</span>”
          </p>
        </Reveal>
      </div>
    </>
  );
}
