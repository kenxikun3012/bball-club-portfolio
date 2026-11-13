import { ObjectId, type UpdateFilter } from "mongodb";
import { destroyAllAdminSessions, type AdminRole, type AdminUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export interface AdminUserView {
  id: string;
  email: string;
  role: AdminRole;
  disabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const ADMIN_ROLES = ["owner", "editor", "viewer"] as const;

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

/** Safe projection: no hash, lock counters or session data. */
function toView(user: AdminUser): AdminUserView {
  return {
    id: user._id.toHexString(),
    email: user.email,
    role: user.role,
    disabled: user.disabled === true,
    mustChangePassword: user.mustChangePassword === true,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: iso(user.createdAt) ?? "",
  };
}

function toObjectId(id: string): ObjectId | null {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export async function listUsers(): Promise<AdminUserView[]> {
  const db = await getDb();
  const users = await db
    .collection<AdminUser>("admin_users")
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ email: 1 })
    .toArray();
  return users.map(toView);
}

export async function createUser(
  email: string,
  role: AdminRole,
  passwordHash: string,
): Promise<AdminUserView | "duplicate"> {
  const db = await getDb();
  const now = new Date();
  const doc = {
    email,
    role,
    passwordHash,
    disabled: false,
    mustChangePassword: true,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  try {
    const result = await db.collection("admin_users").insertOne(doc);
    return toView({ ...doc, _id: result.insertedId } as AdminUser);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return "duplicate";
    throw error;
  }
}

export interface UserChange {
  role?: AdminRole;
  disabled?: boolean;
  /** New scrypt hash for a password reset (forces a change at next login). */
  passwordHash?: string;
}

export type UpdateResult =
  | { view: AdminUserView; before: { role: AdminRole; disabled: boolean } }
  | "not-found"
  | "self"
  | "last-owner";

/**
 * Applies a change to another user. Demoting or disabling an active owner must
 * leave at least one active owner: the change is applied, owners are counted and
 * the change is reverted if none remain (fails safe if two owners race).
 */
export async function updateUser(
  id: string,
  change: UserChange,
  actorId: ObjectId,
): Promise<UpdateResult> {
  const objectId = toObjectId(id);
  if (!objectId) return "not-found";
  if (objectId.equals(actorId)) return "self";

  const db = await getDb();
  const collection = db.collection<AdminUser>("admin_users");
  const before = await collection.findOne({ _id: objectId });
  if (!before) return "not-found";

  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  const update: UpdateFilter<AdminUser> = { $set: set };
  if (change.role !== undefined) set.role = change.role;
  if (change.disabled !== undefined) set.disabled = change.disabled;
  if (change.passwordHash !== undefined) {
    set.passwordHash = change.passwordHash;
    set.mustChangePassword = true;
    set.passwordChangedAt = now;
    update.$unset = { failedAttempts: "", lockedUntil: "" };
  }
  await collection.updateOne({ _id: objectId }, update);

  const wasActiveOwner = before.role === "owner" && before.disabled !== true;
  const losesOwnership =
    (change.role !== undefined && change.role !== "owner") || change.disabled === true;
  if (wasActiveOwner && losesOwnership) {
    const owners = await collection.countDocuments({ role: "owner", disabled: { $ne: true } });
    if (owners === 0) {
      await collection.updateOne(
        { _id: objectId },
        { $set: { role: before.role, disabled: before.disabled === true } },
      );
      return "last-owner";
    }
  }

  if (
    (change.role !== undefined && change.role !== before.role) ||
    change.disabled === true ||
    change.passwordHash !== undefined
  ) {
    await destroyAllAdminSessions(objectId);
  }

  const after = await collection.findOne({ _id: objectId });
  if (!after) return "not-found";
  return {
    view: toView(after),
    before: { role: before.role, disabled: before.disabled === true },
  };
}
