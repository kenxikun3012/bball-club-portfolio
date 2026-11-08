/** Shared form options (used by both the client form and server validation). */
export const POSITIONS = [
  "Point guard",
  "Shooting guard",
  "Small forward",
  "Power forward",
  "Center",
  "Not sure yet",
] as const;

export const YEARS = [
  "Fresher",
  "Year II",
  "Year III",
  "Senior",
  "Graduate",
] as const;

export type Position = (typeof POSITIONS)[number];
export type StudyYear = (typeof YEARS)[number];
