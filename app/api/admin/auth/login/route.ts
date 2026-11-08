import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import {
  SESSION_COOKIE,
  consumeLoginAttempt,
  createAdminSession,
  resetLoginAttempts,
  sessionCookieOptions,
  verifyPassword,
  type AdminUser,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { hashIp } from "@/lib/rate-limit";
import { clientIp, hasJsonContentType, isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .email("Enter a valid email address."),
    password: z.string().min(1).max(200),
  })
  .strict();

const INVALID = "Email or password is incorrect.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Request blocked." }, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return NextResponse.json({ ok: false, message: "Unsupported content type." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "Request is too large." }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter your email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const ip = clientIp(request);

  try {
    const limit = await consumeLoginAttempt({ email, ip });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many attempts. Try again in a few minutes.",
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const db = await getDb();
    const user = (await db
      .collection("admin_users")
      .findOne({ email })) as AdminUser | null;

    const valid = Boolean(user && !user.disabled && verifyPassword(password, user.passwordHash));
    if (!user || !valid) {
      return NextResponse.json({ ok: false, message: INVALID }, { status: 401 });
    }

    const now = new Date();
    await db.collection("admin_users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: now, updatedAt: now }, $unset: { lockedUntil: "" } },
    );

    const session = await createAdminSession(user._id, {
      ip,
      userAgent: request.headers.get("user-agent") ?? "",
    });
    await resetLoginAttempts({ email, ip });
    await logAudit({
      actorEmail: email,
      action: "login",
      entity: "admin",
      ipHash: hashIp(ip),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    const response = NextResponse.json({
      ok: true,
      user: { email: user.email, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[api/admin/auth/login] failed", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
