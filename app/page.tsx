import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { About } from "@/components/about";
import { Roster } from "@/components/roster";
import { Achievements } from "@/components/achievements";
import { Activities } from "@/components/activities";
import { Contact } from "@/components/contact";
import { Reveal } from "@/components/reveal";

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Roster />
      <Achievements />
      <Activities />
      <Contact />
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
