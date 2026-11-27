import { unstable_cache } from "next/cache";
import { logWarn } from "@/lib/log";
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

/** Documents exposed by the Phase 2 admin editor. */
export const EDITABLE_CONTENT_IDS = [
  "members",
  "hallOfFame",
  "achievements",
  "activities",
] as const;

export type EditableContentId = (typeof EDITABLE_CONTENT_IDS)[number];

export function isEditableContentId(value: string): value is EditableContentId {
  return (EDITABLE_CONTENT_IDS as readonly string[]).includes(value);
}

export interface ContentSnapshot<T> {
  data: T;
  revision: number;
  updatedAt?: Date;
  updatedBy?: string;
}

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

/** Cache tag for one content document; the admin save route expires it. */
export const contentTag = (id: ContentId) => `content:${id}`;

/** Safety net so edits made outside the admin (db:seed, Atlas) still appear eventually. */
const CONTENT_CACHE_SECONDS = 300;

class ContentMissingError extends Error {}

/**
 * Cached read of one document. Failures and missing documents THROW, and thrown
 * results are never cached, so a database blip or an unseeded database cannot pin
 * the JSON fallback in the cache.
 */
function readCachedDocument<T>(id: ContentId): Promise<T> {
  return unstable_cache(
    async () => {
      const document = await readDocument<T>(id);
      if (!document) throw new ContentMissingError(id);
      return document.data;
    },
    ["content-db", id],
    { tags: [contentTag(id)], revalidate: CONTENT_CACHE_SECONDS },
  )();
}

async function getContentData<T>(id: ContentId): Promise<T> {
  // Never touch the database during `next build` — deployments may not have
  // network access to Atlas at build time, and pages are rendered on demand.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return loadFallback<T>(id);
  }

  try {
    return await readCachedDocument<T>(id);
  } catch (error) {
    if (error instanceof ContentMissingError) {
      logWarn("content-db", `"${id}" missing — using JSON seed fallback. Run npm run db:seed.`);
    } else {
      logWarn("content-db", `database unavailable for "${id}" — using JSON seed fallback.`, error);
    }
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

/**
 * Read a document together with its revision for the admin editor.
 * Missing documents fall back to the JSON seed at revision 0 so the first
 * save creates the Mongo document.
 */
export async function getContentSnapshot<T = Record<string, unknown>>(
  id: ContentId,
): Promise<ContentSnapshot<T>> {
  try {
    const document = await readDocument<T>(id);
    if (document) {
      return {
        data: document.data,
        revision: document.revision,
        updatedAt: document.updatedAt,
        updatedBy: document.updatedBy,
      };
    }
    logWarn("content-db", `"${id}" missing — admin editor is using the JSON seed.`);
  } catch (error) {
    logWarn("content-db", `database unavailable for "${id}" — admin editor is using the JSON seed.`, error);
  }

  return { data: await loadFallback<T>(id), revision: 0 };
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
