/* ------------------------------------------------------------------ */
/*  Content types + pure helpers.                                      */
/*  Runtime content now lives in MongoDB (see lib/content-db.ts);       */
/*  the JSON files in /content are seed data only.                     */
/* ------------------------------------------------------------------ */

export interface Stat {
  value: string;
  label: string;
}

export interface TrainingSlot {
  day: string;
  time: string;
  note: string;
}

export interface Facility {
  title: string;
  detail: string;
}

export interface Milestone {
  year: string;
  text: string;
}

export interface CommitteeMember {
  role: string;
  name: string;
  /** Term or batch label, e.g. "2025/26" or "9th Batch". */
  term?: string;
  /** Older content used `batch` for the same line. */
  batch?: string;
  detail: string;
}

export interface Club {
  name: string;
  shortName: string;
  university: string;
  founded: number;
  headlineWordmark: string;
  tagline: string;
  seoDescription: string;
  homeCourt: string;
  address: string;
  email: string;
  instagram: string;
  /** Current season label, e.g. "2025/26" — used by the "Fresh hoopers" filter. */
  currentSeason: string;
  /** Club committee positions shown in The club section. */
  committee: CommitteeMember[];
  hero: {
    eyebrow: string;
    headline: string[];
    intro: string;
    introHighlight?: string;
    primaryCta: string;
    secondaryCta: string;
    caption: string;
  };
  stats: Stat[];
  training: TrainingSlot[];
  about: {
    intro: string;
    paragraphs: string[];
    facilities: Facility[];
    facts: { label: string; value: string }[];
    milestones: Milestone[];
  };
}

export const PLAYER_ROLES = [
  "Captain",
  "Ex-captain",
  "Starter",
  "Member",
  "Ace",
  "Elite",
] as const;

export type PlayerRole = (typeof PLAYER_ROLES)[number];

export interface RosterPlayer {
  number: number;
  name: string;
  position: string;
  year: string;
  height: string;
  hometown: string;
  role: PlayerRole;
  featured?: boolean;
  monthlySessions: number;
  risingStar?: boolean;
  joined: string;
  awards: string[];
  bio: string;
  image?: string | null;
}

export interface StaffMember {
  name: string;
  role: string;
  detail: string;
  image?: string | null;
}

export interface RosterGroup {
  id: string;
  label: string;
  shortLabel: string;
  players: RosterPlayer[];
}

export interface Achievement {
  year: string;
  title: string;
  competition: string;
  result: string;
  note: string;
}

export interface GalleryItem {
  title: string;
  category: string;
  date: string;
  description: string;
  image: string | null;
  featured?: boolean;
}

export interface UpcomingEvent {
  date: string;
  title: string;
  type: string;
  location: string;
}

export interface RetiredJersey {
  number: number;
  name: string;
  years: string;
  note: string;
}

export interface Inductee {
  name: string;
  years: string;
  position: string;
  jerseyNumber: number;
  retiredJersey?: boolean;
  inducted: string;
  impact: string;
  quote?: string;
  image?: string | null;
}

export interface HallOfFame {
  intro: string;
  retiredJerseys: RetiredJersey[];
  inductees: Inductee[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Pull a usable address out of a free-text contact line; null when there is none. */
export function extractEmail(text: string): string | null {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/);
  return match ? match[0] : null;
}

/** "2025/2026" → "25/26"; anything unexpected is returned unchanged. */
export function shortSeason(season: string): string {
  const match = season.match(/^(?:\d{2})?(\d{2})\s*[/–-]\s*(?:\d{2})?(\d{2})$/);
  return match ? `${match[1]}/${match[2]}` : season;
}

/** Local calendar date as YYYY-MM-DD, for comparing against event dates. */
export function isoToday(timeZone = "Asia/Yangon"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** "Khant Zay Heinn aka KenZ" → name "Khant Zay Heinn", nickname "KenZ". */
export function splitNickname(full: string): { name: string; nickname: string | null } {
  const match = full.match(/^(.*?)\s+aka\s+(.+)$/i);
  return match
    ? { name: match[1].trim(), nickname: match[2].trim() }
    : { name: full.trim(), nickname: null };
}

/** "9th Batch" → 9; null when the text is not a batch label. */
export function batchNumber(text?: string): number | null {
  const match = text?.match(/(\d+)\s*(?:st|nd|rd|th)?\s*batch/i);
  return match ? Number(match[1]) : null;
}

/** Contact lines in the content read "No official X yet, can contact Y". */
export function isUnofficialContact(text: string): boolean {
  return /no official/i.test(text);
}

/** The handle after "can contact", or the whole line when it is already a handle. */
export function contactHandle(text: string): string {
  const match = text.match(/contact\s+@?([\w.]+)\s*$/i);
  return match ? match[1] : text.trim();
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** End of a "4:00 – 5:30 PM" range in minutes after midnight; null when it has no time. */
function sessionEndMinutes(time: string): number | null {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (/pm/i.test(match[3] ?? time)) hours += 12;
  return hours * 60 + Number(match[2]);
}

export interface NextTraining {
  slot: TrainingSlot;
  /** "Today", "Tomorrow" or the weekday name. */
  when: string;
}

/** The next weekly training session, in the club's own time zone. */
export function nextTraining(
  slots: TrainingSlot[],
  now: Date = new Date(),
  timeZone = "Asia/Yangon",
): NextTraining | null {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const today = WEEKDAYS.indexOf(part("weekday").toLowerCase());
  const minutesNow = Number(part("hour")) * 60 + Number(part("minute"));
  if (today === -1) return null;

  let best: { slot: TrainingSlot; distance: number } | null = null;
  for (const slot of slots) {
    const day = WEEKDAYS.indexOf(slot.day.trim().toLowerCase());
    if (day === -1) continue;
    let distance = (day - today + 7) % 7;
    const end = sessionEndMinutes(slot.time);
    if (distance === 0 && end !== null && end <= minutesNow) distance = 7;
    if (!best || distance < best.distance) best = { slot, distance };
  }
  if (!best) return null;
  const when =
    best.distance === 0 ? "Today" : best.distance === 1 ? "Tomorrow" : best.slot.day;
  return { slot: best.slot, when };
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function formatEventDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export interface SiteContent {
  club: Club;
  rosters: RosterGroup[];
  staff: StaffMember[];
  hallOfFame: HallOfFame;
  achievements: Achievement[];
  achievementSummary: Stat[];
  activitiesIntro: string;
  gallery: GalleryItem[];
  upcoming: UpcomingEvent[];
}
