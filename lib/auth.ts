import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { hashIp } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/*  Admin authentication: scrypt passwords + opaque DB sessions.       */
/* ------------------------------------------------------------------ */

export type AdminRole = "owner" | "editor" | "viewer";

export interface AdminUser {
  _id: ObjectId;
  email: string;
  role: AdminRole;
  passwordHash: string;
  disabled?: boolean;
  failedAttempts?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AdminSessionDoc {
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  ipHash: string;
  userAgent: string;
}

export const SESSION_COOKIE = "admin_session";
const SESSION_IDLE_MS = 8 * 60 * 60 * 1000; // 8h idle
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000; // 7d max
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltValue, hashValue] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !saltValue || !hashValue) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_ABSOLUTE_MS / 1000),
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(
  userId: ObjectId,
  meta: { ip: string; userAgent: string },
): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);

  await db.collection<AdminSessionDoc>("admin_sessions").insertOne({
    tokenHash: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
    ipHash: hashIp(meta.ip),
    userAgent: meta.userAgent.slice(0, 300),
  });

  return { token, expiresAt };
}

export async function destroyAdminSession(token: string): Promise<void> {
  const db = await getDb();
  await db
    .collection("admin_sessions")
    .deleteOne({ tokenHash: hashToken(token) });
}

export async function destroyAllAdminSessions(userId: ObjectId): Promise<void> {
  const db = await getDb();
  await db.collection("admin_sessions").deleteMany({ userId });
}

export interface SessionContext {
  user: AdminUser;
  token: string;
}

/** Validate the session cookie against the database (Node runtime only). */
export async function getAdminSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const db = await getDb();
    const sessions = db.collection<AdminSessionDoc>("admin_sessions");
    const session = await sessions.findOne({ tokenHash: hashToken(token) });
    if (!session) return null;

    const now = new Date();
    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      await sessions.deleteOne({ tokenHash: session.tokenHash });
      return null;
    }

    const user = (await db.collection("admin_users").findOne({
      _id: session.userId,
    })) as AdminUser | null;
    if (!user || user.disabled) return null;

    // Extend the idle window at most once every few minutes.
    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await sessions.updateOne(
        { tokenHash: session.tokenHash },
        { $set: { lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_IDLE_MS) } },
      );
    }

    return { user, token };
  } catch (error) {
    console.error("[auth] session lookup failed", error);
    return null;
  }
}

export async function requireAdminPage(): Promise<AdminUser> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session.user;
}

/* ------------------------------------------------------------------ */
/*  Login throttling (rolling window, hashed keys)                     */
/* ------------------------------------------------------------------ */

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_ATTEMPTS = 5;
const IP_ATTEMPTS = 20;

interface AuthRateDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

async function consumeAuthAttempt(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const db = await getDb();
  const limits = db.collection<AuthRateDoc>("auth_rate_limits");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_WINDOW_MS);

  const bumped = await limits.findOneAndUpdate(
    { _id: key, expiresAt: { $gt: now }, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  );
  if (bumped) return { allowed: true, retryAfterSeconds: 0 };

  const existing = await limits.findOne({ _id: key });
  if (existing && existing.expiresAt > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  try {
    await limits.updateOne(
      { _id: key },
      { $set: { count: 1, expiresAt } },
      { upsert: true },
    );
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: false, retryAfterSeconds: Math.ceil(AUTH_WINDOW_MS / 1000) };
  }
}

export async function consumeLoginAttempt({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const emailHash = crypto.createHash("sha256").update(email).digest("hex");
  const emailResult = await consumeAuthAttempt(`login:email:${emailHash}`, EMAIL_ATTEMPTS);
  if (!emailResult.allowed) return emailResult;
  return consumeAuthAttempt(`login:ip:${hashIp(ip)}`, IP_ATTEMPTS);
}

export async function resetLoginAttempts({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<void> {
  const emailHash = crypto.createHash("sha256").update(email).digest("hex");
  const db = await getDb();
  const limits = db.collection<AuthRateDoc>("auth_rate_limits");
  await limits.deleteMany({
    _id: { $in: [`login:email:${emailHash}`, `login:ip:${hashIp(ip)}`] },
  });
}
