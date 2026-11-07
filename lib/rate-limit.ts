import crypto from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { requireEnv } from "@/lib/env";

/**
 * Rolling-window rate limiting backed by MongoDB (atomic counters + TTL).
 * Limits: 3 accepted applications per email and 10 per IP in any 24h window.
 */
const WINDOW_MS = 24 * 60 * 60 * 1000;

export const EMAIL_LIMIT = 3;
export const IP_LIMIT = 10;

interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email).digest("hex");
}

export function hashIp(ip: string): string {
  const salt = requireEnv("IP_HASH_SALT");
  return crypto.createHmac("sha256", salt).update(ip).digest("hex");
}

interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

async function consume(key: string, limit: number): Promise<ConsumeResult> {
  const db = await getDb();
  const limits = db.collection<RateLimitDoc>("join_rate_limits");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + WINDOW_MS);

  // Atomic increment, but only while the window is live and under the limit.
  const bumped = await limits.findOneAndUpdate(
    { _id: key, expiresAt: { $gt: now }, count: { $lt: limit } },
    { $inc: { count: 1 }, $set: { updatedAt: now } },
    { returnDocument: "after" },
  );
  if (bumped && typeof bumped.count === "number") {
    return {
      allowed: true,
      remaining: Math.max(0, limit - bumped.count),
      retryAfterSeconds: 0,
    };
  }

  const existing = await limits.findOne({ _id: key });
  if (existing && existing.expiresAt > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  // No live window: start a fresh one. A race can hit a duplicate key; then
  // re-try the conditional increment once.
  try {
    await limits.updateOne(
      { _id: key },
      {
        $set: { count: 1, expiresAt, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  } catch {
    const retry = await limits.findOneAndUpdate(
      { _id: key, expiresAt: { $gt: now }, count: { $lt: limit } },
      { $inc: { count: 1 }, $set: { updatedAt: now } },
      { returnDocument: "after" },
    );
    if (retry && typeof retry.count === "number") {
      return {
        allowed: true,
        remaining: Math.max(0, limit - retry.count),
        retryAfterSeconds: 0,
      };
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }
}

export interface JoinRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  ipHash: string;
}

export async function checkJoinRateLimits({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<JoinRateLimitResult> {
  const ipHash = hashIp(ip);

  const emailResult = await consume(`email:${hashEmail(email)}`, EMAIL_LIMIT);
  if (!emailResult.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: emailResult.retryAfterSeconds,
      ipHash,
    };
  }

  const ipResult = await consume(`ip:${ipHash}`, IP_LIMIT);
  if (!ipResult.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: ipResult.retryAfterSeconds,
      ipHash,
    };
  }

  return { allowed: true, retryAfterSeconds: 0, ipHash };
}
