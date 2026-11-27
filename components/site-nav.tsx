"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, FlameMark } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Club } from "@/lib/content";
import { SECTION_LINKS } from "@/lib/nav";

export function SiteNav({ club }: { club: Club }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Header shadow + "you are here": the current section is the last one whose
  // top has passed a reading line a third of the way down the viewport.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      const line = window.innerHeight * 0.33;
      let found = "";
      for (const link of SECTION_LINKS) {
        const section = document.getElementById(link.href.slice(1));
        if (section && section.getBoundingClientRect().top <= line) found = link.href;
      }
      setCurrent(found);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    // The menu only exists below the lg breakpoint; close it if the layout grows.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-cream-100/90 backdrop-blur-md transition-shadow",
        scrolled
          ? "border-secondary/60 shadow-[0_10px_30px_-24px_rgba(23,20,15,0.6)]"
          : "border-secondary/40",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-8 px-6 md:h-20 md:px-10">
        <a href="#top" className="group flex min-h-11 min-w-0 items-center gap-4">
          <span className="sr-only">Back to top: </span>
          <FlameMark className="h-10 w-10 transition-transform duration-500 ease-out group-hover:rotate-[20deg]" />
          <span className="flex min-w-0 flex-col gap-2 leading-none">
            <span className="truncate font-display tracking-[-0.01em]">{club.shortName}</span>
            <span className="truncate type-label text-muted">
              <span className="hidden sm:inline">Basketball club · </span>Est.{" "}
              {club.founded}
            </span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {SECTION_LINKS.filter((link) => link.href !== "#join").map((link) => {
            const active = current === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "relative whitespace-nowrap py-2 type-label transition-colors hover:text-ink after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-accent after:transition-all after:duration-300 hover:after:w-full",
                  active ? "text-ink after:w-full" : "text-ink-soft after:w-0",
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <a
            href="#join"
            aria-current={current === "#join" ? "location" : undefined}
            className="hidden min-h-11 items-center whitespace-nowrap rounded-sm bg-ink px-6 type-label text-cream-100 transition-colors hover:bg-accent lg:inline-flex"
          >
            Join the club
          </a>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 items-center justify-center rounded-sm border border-ink/15 text-ink transition-colors hover:border-ink/40 lg:hidden"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
              {open ? (
                <>
                  <path d="M2 2 L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14 2 L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M1 1 H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1 6 H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1 11 H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-secondary/40 bg-cream-100 lg:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto max-w-[1240px] px-6 py-4">
          <ul className="flex flex-col divide-y divide-ink/10">
            {SECTION_LINKS.filter((link) => link.href !== "#join").map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={current === link.href ? "location" : undefined}
                  className={cn(
                    "flex items-center justify-between py-4 type-h4",
                    current === link.href && "text-accent",
                  )}
                >
                  {link.label}
                  <ArrowRight className="text-muted" />
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#join"
            onClick={() => setOpen(false)}
            className="mt-4 flex min-h-12 items-center justify-center rounded-sm bg-ink px-6 type-label text-cream-100"
          >
            Join the club
          </a>
        </nav>
      </div>
    </header>
  );
}
