import type { Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const AUDIT_ACTIONS = [
  "login",
  "logout",
  "content.update",
  "application.status",
  "application.note",
  "application.export",
  "auth.password",
  "user.create",
  "user.role",
  "user.disable",
  "user.enable",
  "user.reset",
] as const;

export const AUDIT_PAGE_SIZE = 50;
const ACTOR_MAX_LENGTH = 80;

export interface AuditQuery {
  page: number;
  action?: (typeof AUDIT_ACTIONS)[number];
  actor?: string;
  /** Inclusive start day, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive end day, `YYYY-MM-DD`. */
  to?: string;
}

export interface AuditEntryView {
  id: string;
  createdAt: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  changes: string[];
}

type RawParams = Record<string, string | string[] | undefined>;

function first(params: RawParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Accepts only real calendar days; anything else is ignored. */
function parseDay(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

/** Lenient parsing: bad input falls back to defaults instead of erroring. */
export function parseAuditQuery(params: RawParams): AuditQuery {
  const rawPage = Number.parseInt(first(params, "page") ?? "", 10);
  const rawAction = first(params, "action");
  const actor = (first(params, "actor") ?? "").trim().slice(0, ACTOR_MAX_LENGTH);
  return {
    page: Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1,
    action: AUDIT_ACTIONS.find((action) => action === rawAction),
    actor: actor.length > 0 ? actor : undefined,
    from: parseDay(first(params, "from")),
    to: parseDay(first(params, "to")),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(query: AuditQuery): Filter<Record<string, unknown>> {
  const filter: Record<string, unknown> = {};
  if (query.action) filter.action = query.action;
  if (query.actor) filter.actorEmail = { $regex: escapeRegex(query.actor), $options: "i" };
  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.$gte = new Date(`${query.from}T00:00:00Z`);
    if (query.to) {
      const end = new Date(`${query.to}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      range.$lt = end;
    }
    filter.createdAt = range;
  }
  return filter;
}

export interface AuditList {
  items: AuditEntryView[];
  total: number;
  page: number;
  pages: number;
}

/** Read-only. `ipHash` and `userAgent` are never selected. */
export async function listAudit(query: AuditQuery): Promise<AuditList> {
  const db = await getDb();
  const collection = db.collection("audit_logs");
  const filter = buildFilter(query);

  const total = await collection.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(query.page, pages);

  const docs = await collection
    .find(filter, {
      projection: { actorEmail: 1, action: 1, entity: 1, entityId: 1, changes: 1, createdAt: 1 },
    })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * AUDIT_PAGE_SIZE)
    .limit(AUDIT_PAGE_SIZE)
    .toArray();

  return {
    total,
    page,
    pages,
    items: docs.map((doc) => ({
      id: String(doc._id),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
      actorEmail: String(doc.actorEmail ?? ""),
      action: String(doc.action ?? ""),
      entity: String(doc.entity ?? ""),
      entityId: doc.entityId ? String(doc.entityId) : "",
      changes: Array.isArray(doc.changes) ? doc.changes.map(String) : [],
    })),
  };
}
