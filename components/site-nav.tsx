"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const links = [
  { href: "#club", label: "The club" },
  { href: "#team", label: "Team" },
  { href: "#trophies", label: "Trophies" },
  { href: "#activities", label: "Activities" },
  { href: "#join", label: "Join" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-cream-100/85 backdrop-blur-md transition-shadow",
        scrolled
          ? "border-secondary/60 shadow-[0_10px_30px_-24px_rgba(23,20,15,0.6)]"
          : "border-secondary/40",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-8 px-6 md:h-20 md:px-10">
        <a
          href="#top"
          className="group flex items-center gap-4"
          aria-label="University Basketball Club — back to top"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-ink font-display text-cream-100 transition-colors group-hover:bg-secondary group-hover:text-ink">
            U
          </span>
          <span className="flex flex-col gap-2 leading-none">
            <span className="font-display tracking-[-0.01em]">University Basketball</span>
            <span className="type-label text-muted">Club · Est. 1985</span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative type-label text-ink-soft/85 transition-colors hover:text-ink after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-secondary after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="#join"
            className="hidden rounded-sm bg-ink px-6 py-2 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink lg:inline-flex"
          >
            Join the club
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-ink/15 text-ink lg:hidden"
          >
            <span className="sr-only">Menu</span>
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
        className="border-t border-secondary/40 bg-cream-100 lg:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto max-w-[1240px] px-6 py-4">
          <ul className="flex flex-col divide-y divide-ink/10">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between py-4 type-h4"
                >
                  {link.label}
                  <span aria-hidden="true" className="type-small text-muted">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#join"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center rounded-sm bg-ink px-6 py-4 type-label text-cream-100"
          >
            Join the club
          </a>
        </nav>
      </div>
    </header>
  );
}
