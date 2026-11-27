import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  APPLICATION_STATUSES,
  MAX_NOTES,
  PAGE_SIZE,
  isApplicationStatus,
  type ApplicationStatus,
  type ListQuery,
} from "@/lib/application-schemas";

export interface ApplicationNoteView {
  id: string;
  text: string;
  authorEmail: string;
  createdAt: string;
}

export interface ApplicationView {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  year: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt?: string;
  notes: ApplicationNoteView[];
}

export const EXPORT_LIMIT = 5000;

interface ApplicationDoc {
  _id: ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  year?: string;
  message?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: { id: string; text: string; authorEmail: string; createdAt: Date }[];
}

function iso(value: Date | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : "";
}

/** Maps a stored document (including legacy ones) to a safe view: no IP data. */
function toView(doc: ApplicationDoc): ApplicationView {
  return {
    id: doc._id.toHexString(),
    name: doc.name ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    position: doc.position ?? "",
    year: doc.year ?? "",
    message: doc.message ?? "",
    status: isApplicationStatus(doc.status) ? doc.status : "new",
    createdAt: iso(doc.createdAt),
    updatedAt: doc.updatedAt ? iso(doc.updatedAt) : undefined,
    notes: (doc.notes ?? []).map((note) => ({
      id: note.id,
      text: note.text,
      authorEmail: note.authorEmail,
      createdAt: iso(note.createdAt),
    })),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(query: Pick<ListQuery, "status" | "q">): Filter<ApplicationDoc> {
  const filter: Filter<ApplicationDoc>[] = [];
  if (query.status === "new") {
    filter.push({ $or: [{ status: "new" }, { status: { $exists: false } }] });
  } else if (query.status) {
    filter.push({ status: query.status });
  }
  if (query.q) {
    const pattern = { $regex: escapeRegex(query.q), $options: "i" };
    filter.push({ $or: [{ name: pattern }, { email: pattern }] });
  }
  return filter.length > 0 ? { $and: filter } : {};
}

function toObjectId(id: string): ObjectId | null {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export interface ApplicationList {
  items: ApplicationView[];
  total: number;
  page: number;
  pages: number;
  counts: Record<ApplicationStatus, number>;
}

export async function listApplications(query: ListQuery): Promise<ApplicationList> {
  const db = await getDb();
  const collection = db.collection<ApplicationDoc>("applications");
  const filter = buildFilter(query);

  const [total, grouped] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .aggregate<{ _id: string | null; count: number }>([
        { $group: { _id: { $ifNull: ["$status", "new"] }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >;
  for (const row of grouped) {
    if (isApplicationStatus(row._id)) counts[row._id] += row.count;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const docs = await collection
    .find(filter, { projection: { ipHash: 0, userAgent: 0 } })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();

  return { items: docs.map(toView), total, page, pages, counts };
}

export async function exportApplications(
  query: Pick<ListQuery, "status" | "q">,
): Promise<ApplicationView[]> {
  const db = await getDb();
  const docs = await db
    .collection<ApplicationDoc>("applications")
    .find(buildFilter(query), { projection: { ipHash: 0, userAgent: 0 } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(EXPORT_LIMIT)
    .toArray();
  return docs.map(toView);
}

export async function getApplication(id: string): Promise<ApplicationView | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const doc = await db
    .collection<ApplicationDoc>("applications")
    .findOne({ _id: objectId }, { projection: { ipHash: 0, userAgent: 0 } });
  return doc ? toView(doc) : null;
}

export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
  now: Date,
): Promise<{ view: ApplicationView; from: ApplicationStatus } | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const before = await db
    .collection<ApplicationDoc>("applications")
    .findOneAndUpdate(
      { _id: objectId },
      { $set: { status, updatedAt: now } },
      { returnDocument: "before", projection: { status: 1 } },
    );
  if (!before) return null;
  const view = await getApplication(id);
  if (!view) return null;
  return { view, from: isApplicationStatus(before.status) ? before.status : "new" };
}

/** Atomic append; refuses (returns "limit") once MAX_NOTES is reached. */
export async function addApplicationNote(
  id: string,
  text: string,
  authorEmail: string,
  now: Date,
): Promise<ApplicationView | "limit" | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const collection = db.collection<ApplicationDoc>("applications");

  const result = await collection.updateOne(
    {
      _id: objectId,
      $expr: { $lt: [{ $size: { $ifNull: ["$notes", []] } }, MAX_NOTES] },
    },
    {
      $push: {
        notes: { id: new ObjectId().toHexString(), text, authorEmail, createdAt: now },
      },
      $set: { updatedAt: now },
    },
  );

  if (result.matchedCount === 0) {
    const exists = await collection.countDocuments({ _id: objectId }, { limit: 1 });
    return exists ? "limit" : null;
  }
  return getApplication(id);
}
