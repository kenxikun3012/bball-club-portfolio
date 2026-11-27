import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { consumeAuthAttempt } from "@/lib/auth";
import { logError } from "@/lib/log";

/** Per-user ceilings for authenticated admin actions (rolling TTL windows). */
const LIMITS = {
  write: { max: 60, windowMs: 5 * 60 * 1000 },
  export: { max: 10, windowMs: 15 * 60 * 1000 },
  upload: { max: 20, windowMs: 15 * 60 * 1000 },
} as const;

export type AdminLimitKind = keyof typeof LIMITS;

/**
 * Returns a ready-made 429 response when the user is over the limit, else null.
 * Call it after authentication and the role check. If the limiter itself fails
 * (database trouble) it fails open: the write it guards would fail anyway.
 */
export async function enforceAdminLimit(
  userId: ObjectId,
  kind: AdminLimitKind,
): Promise<NextResponse | null> {
  const { max, windowMs } = LIMITS[kind];
  try {
    const result = await consumeAuthAttempt(`limit:${kind}:${userId.toHexString()}`, max, windowMs);
    if (result.allowed) return null;
    return NextResponse.json(
      {
        ok: false,
        message: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds), "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    logError("admin-limits", "limiter failed open", error);
    return null;
  }
}
