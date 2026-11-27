/** Shared form options (used by both the client form and server validation). */
export const POSITIONS = [
  "Point guard",
  "Shooting guard",
  "Small forward",
  "Power forward",
  "Center",
  "Not sure yet",
] as const;

/** YTU's own year labels — the same ones the roster uses. */
export const YEARS = [
  "Year I",
  "Year II",
  "Year III",
  "Year IV",
  "Year V",
  "Year VI",
  "Graduate",
] as const;

export type Position = (typeof POSITIONS)[number];
export type StudyYear = (typeof YEARS)[number];
