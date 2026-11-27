"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CarouselState {
  /** Index of the first card in view. */
  active: number;
  atStart: boolean;
  atEnd: boolean;
  /** 0–1: how much of the track has been seen, including the cards in view. */
  progress: number;
}

const INITIAL: CarouselState = { active: 0, atStart: true, atEnd: false, progress: 0 };

/**
 * Shared scroll-snap carousel logic.
 *
 * The end of the track is detected from the real scroll position, not from the
 * card index: when several cards fit in view the last index is never "active",
 * so index-based checks leave the Next button enabled with nowhere to go.
 */
export function useCarousel(count: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CarouselState>(INITIAL);

  /** Distance between the left edges of two neighbouring cards. */
  const step = useCallback(() => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !first) return 0;
    const second = track.children[1] as HTMLElement | undefined;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const size = step();
    // Snap points rarely land exactly on the maximum scroll offset, so allow
    // a small remainder that no further card can snap into.
    const atEnd = max <= 1 || max - track.scrollLeft <= Math.max(1, size * 0.1);
    const index = size > 0 ? Math.round(track.scrollLeft / size) : 0;
    const next: CarouselState = {
      active: Math.max(0, Math.min(index, count - 1)),
      atStart: track.scrollLeft <= 1,
      atEnd,
      progress:
        atEnd || track.scrollWidth <= 0
          ? 1
          : Math.min(1, (track.scrollLeft + track.clientWidth) / track.scrollWidth),
    };
    setState((prev) =>
      prev.active === next.active &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd &&
      Math.abs(prev.progress - next.progress) < 0.005
        ? prev
        : next,
    );
  }, [count, step]);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const move = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollBy({ left: direction * step(), behavior: reduce ? "auto" : "smooth" });
    },
    [step],
  );

  return {
    trackRef,
    ...state,
    onScroll: measure,
    previous: () => move(-1),
    next: () => move(1),
  };
}
