import { getDb } from "@/lib/mongodb";
import type {
  Achievement,
  Club,
  GalleryItem,
  HallOfFame,
  RosterGroup,
  SiteContent,
  StaffMember,
  Stat,
  UpcomingEvent,
} from "@/lib/content";

/**
 * Mongo-backed content repository.
 *
 * Documents live in the `content` collection, one per content area:
 *   club, members, hallOfFame, achievements, activities
 * Each document: { _id, data, revision, updatedAt, updatedBy }.
 *
 * The JSON files in /content are only seed data; if a document is missing
 * (e.g. the database has not been seeded yet) we fall back to them so the
 * public site never renders empty.
 */

export type ContentId = "club" | "members" | "hallOfFame" | "achievements" | "activities";

export interface ContentDocument<T> {
  _id: ContentId;
  data: T;
  revision: number;
  updatedAt: Date;
  updatedBy: string;
}

interface MembersData {
  rosters: RosterGroup[];
  staff: StaffMember[];
}

interface AchievementsData {
  summary: Stat[];
  items: Achievement[];
}

interface ActivitiesData {
  intro: string;
  gallery: GalleryItem[];
  upcoming: UpcomingEvent[];
}

async function readDocument<T>(id: ContentId): Promise<ContentDocument<T> | null> {
  const db = await getDb();
  return db
    .collection<ContentDocument<T>>("content")
    .findOne({ _id: id });
}

async function loadFallback<T>(file: string): Promise<T> {
  // Server-only dynamic import of the seed file. Keeps the site usable
  // before `npm run db:seed` has been run.
  switch (file) {
    case "club":
      return (await import("@/content/club.json")).default as T;
    case "members":
      return (await import("@/content/members.json")).default as T;
    case "hallOfFame":
      return (await import("@/content/hall-of-fame.json")).default as T;
    case "achievements":
      return (await import("@/content/achievements.json")).default as T;
    case "activities":
      return (await import("@/content/activities.json")).default as T;
    default:
      throw new Error(`Unknown content file: ${file}`);
  }
}

async function getContentData<T>(id: ContentId): Promise<T> {
  // Never touch the database during `next build` — deployments may not have
  // network access to Atlas at build time, and pages are rendered on demand.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return loadFallback<T>(id);
  }

  try {
    const document = await readDocument<T>(id);
    if (document) return document.data;
    console.warn(`[content-db] "${id}" missing — using JSON seed fallback. Run npm run db:seed.`);
  } catch (error) {
    console.warn(
      `[content-db] database unavailable for "${id}" — using JSON seed fallback.`,
      error instanceof Error ? error.message : error,
    );
  }
  return loadFallback<T>(id);
}

export async function getClub(): Promise<Club> {
  return getContentData<Club>("club");
}

export async function getMembers(): Promise<MembersData> {
  return getContentData<MembersData>("members");
}

export async function getHallOfFame(): Promise<HallOfFame> {
  return getContentData<HallOfFame>("hallOfFame");
}

export async function getAchievements(): Promise<AchievementsData> {
  return getContentData<AchievementsData>("achievements");
}

export async function getActivities(): Promise<ActivitiesData> {
  return getContentData<ActivitiesData>("activities");
}

export async function getSiteContent(): Promise<SiteContent> {
  const [club, members, hallOfFame, achievements, activities] = await Promise.all([
    getClub(),
    getMembers(),
    getHallOfFame(),
    getAchievements(),
    getActivities(),
  ]);

  return {
    club,
    rosters: members.rosters,
    staff: members.staff,
    hallOfFame,
    achievements: achievements.items,
    achievementSummary: achievements.summary,
    activitiesIntro: activities.intro,
    gallery: activities.gallery,
    upcoming: activities.upcoming,
  };
}
