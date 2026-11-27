import { z } from "zod";

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const MAX_NOTES = 100;
export const NOTE_MAX_LENGTH = 1000;
export const PAGE_SIZE = 25;
export const SEARCH_MAX_LENGTH = 80;

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** Exactly one of `status` or `addNote`; unknown keys are rejected. */
export const applicationPatchSchema = z.union([
  z.object({ status: z.enum(APPLICATION_STATUSES) }).strict(),
  z.object({ addNote: z.string().trim().min(1).max(NOTE_MAX_LENGTH) }).strict(),
]);

export interface ListQuery {
  page: number;
  status?: ApplicationStatus;
  q?: string;
}

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function first(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Lenient parsing: bad input falls back to defaults instead of erroring. */
export function parseListQuery(params: RawParams): ListQuery {
  const rawPage = Number.parseInt(first(params, "page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawStatus = first(params, "status");
  const status = isApplicationStatus(rawStatus) ? rawStatus : undefined;

  const trimmed = (first(params, "q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const q = trimmed.length > 0 ? trimmed : undefined;

  return { page, status, q };
}
