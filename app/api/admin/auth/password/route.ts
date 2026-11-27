import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { z } from "zod";
import {
  consumePasswordAttempt,
  destroyOtherAdminSessions,
  getAdminSession,
  hashPassword,
  resetPasswordAttempts,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp, declaredBodyTooLarge, hasJsonContentType, isSameOrigin } from "@/lib/http";
import { getDb } from "@/lib/mongodb";
import { validateNewPassword } from "@/lib/password-policy";
import { hashIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

const bodySchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().max(1000),
  })
  .strict();

function fail(status: number, message: string, extra?: Record<string, unknown>, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, message, ...extra }, { status, headers });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Request blocked.");
  if (!hasJsonContentType(request)) return fail(415, "Unsupported content type.");
  if (declaredBodyTooLarge(request, MAX_BODY_BYTES)) return fail(413, "Request is too large.");

  // Users who must change their password are allowed here and nowhere else.
  const session = await getAdminSession({ allowMustChange: true });
  if (!session) return fail(401, "Unauthorized.");
  const limited = await enforceAdminLimit(session.user._id, "write");
  if (limited) return limited;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return fail(413, "Request is too large.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request body.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(422, "Enter your current and new password.");

  const { currentPassword, newPassword } = parsed.data;
  const user = session.user;

  try {
    const limit = await consumePasswordAttempt(user._id);
    if (!limit.allowed) {
      return fail(
        429,
        "Too many attempts. Try again in a few minutes.",
        { retryAfterSeconds: limit.retryAfterSeconds },
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return fail(403, "Current password is incorrect.");
    }
    // Only wrong guesses should count: a verified holder gets the budget back,
    // so policy rejections (too short, etc.) never lock them out.
    await resetPasswordAttempts(user._id);

    const problem = validateNewPassword(newPassword, {
      email: user.email,
      current: currentPassword,
    });
    if (problem) return fail(422, problem);

    const now = new Date();
    const db = await getDb();
    await db.collection("admin_users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hashPassword(newPassword),
          passwordChangedAt: now,
          updatedAt: now,
          mustChangePassword: false,
        },
      },
    );
    await destroyOtherAdminSessions(user._id, session.token);
    await resetPasswordAttempts(user._id);

    await logAudit({
      actorEmail: user.email,
      action: "auth.password",
      entity: "admin",
      entityId: user._id.toHexString(),
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("api/admin/auth/password", "failed", error);
    return fail(503, "Could not change the password right now.");
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
