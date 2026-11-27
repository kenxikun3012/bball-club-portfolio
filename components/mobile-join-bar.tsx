"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Thumb-zone Join button for phones. Appears once the hero (with its own Join
 * button) has scrolled away and gets out of the way when the Join section,
 * where the form lives, comes into view.
 */
export function MobileJoinBar({ nextPractice }: { nextPractice?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = document.getElementById("top");
      const join = document.getElementById("join");
      if (!hero || !join) return;
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      const joinInView = join.getBoundingClientRect().top < window.innerHeight;
      setShow(pastHero && !joinInView);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-secondary/60 bg-cream-100/95 px-4 pt-2 backdrop-blur-md transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden motion-reduce:transition-none",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="flex items-center gap-4">
        {nextPractice ? (
          <p className="min-w-0 flex-1 truncate type-small text-ink-soft">
            <span className="font-semibold text-ink">Next practice</span>
            <span className="block truncate">{nextPractice}</span>
          </p>
        ) : null}
        <a
          href="#join"
          className={cn(
            "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink px-6 type-label text-cream-100 transition-colors active:bg-accent",
            !nextPractice && "flex-1",
          )}
        >
          Join the club
          <ArrowRight />
        </a>
      </div>
    </div>
  );
}
