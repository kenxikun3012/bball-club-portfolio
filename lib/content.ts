import clubJson from "@/content/club.json";
import membersJson from "@/content/members.json";
import achievementsJson from "@/content/achievements.json";
import activitiesJson from "@/content/activities.json";
import hallOfFameJson from "@/content/hall-of-fame.json";

/* ------------------------------------------------------------------ */
/*  Types — keep these in sync with the JSON files in /content         */
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
  term: string;
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
    /** Optional phrase inside `intro` to highlight in gold. */
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

export type PlayerRole = "Captain" | "Ex-captain" | "Starter" | "Member";

export interface RosterPlayer {
  number: number;
  name: string;
  position: string;
  year: string;
  height: string;
  hometown: string;
  role: PlayerRole;
  /** Shown in the featured carousel above the full grid. */
  featured?: boolean;
  /** Training sessions attended this month — drives the "Most active" filter. */
  monthlySessions: number;
  /** Drives the "Rising stars" filter (fast-improving year I–II players). */
  risingStar?: boolean;
  /** Season the player joined, e.g. "2025/26" — drives "Fresh hoopers". */
  joined: string;
  /** Personal awards — drives the "Achievers" filter. */
  awards: string[];
  bio: string;
  /** Optional real photo path, e.g. "/photos/avery-rivera.jpg". */
  image?: string | null;
}

export interface RosterGroup {
  id: string;
  label: string;
  shortLabel: string;
  players: RosterPlayer[];
}

export interface StaffMember {
  name: string;
  role: string;
  detail: string;
  image?: string | null;
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
/*  Content                                                            */
/* ------------------------------------------------------------------ */

export const club = clubJson as Club;

export const rosters = membersJson.rosters as RosterGroup[];
export const staff = membersJson.staff as StaffMember[];

export const achievements = [...(achievementsJson.items as Achievement[])].sort(
  (a, b) => Number(b.year) - Number(a.year),
);
export const achievementSummary = achievementsJson.summary as Stat[];

export const gallery = activitiesJson.gallery as GalleryItem[];
export const activitiesIntro = activitiesJson.intro;
export const upcoming = activitiesJson.upcoming as UpcomingEvent[];

export const hallOfFame = hallOfFameJson as HallOfFame;
export const currentSeason = club.currentSeason;

/* ------------------------------------------------------------------ */
/*  Small helpers used by several components                           */
/* ------------------------------------------------------------------ */

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
