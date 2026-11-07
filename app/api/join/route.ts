import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { fieldErrors, joinRequestSchema } from "@/lib/validation";
import { checkJoinRateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Reject cross-site browser requests (CSRF hardening). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function badRequest(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return badRequest(403, "Request blocked.");
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return badRequest(415, "Unsupported content type.");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return badRequest(413, "Request is too large.");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return badRequest(413, "Request is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest(400, "Invalid request body.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badRequest(400, "Invalid request body.");
  }

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  const record = body as Record<string, unknown>;
  if (typeof record.website === "string" && record.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(422, "Please check the highlighted fields.", {
      fields: fieldErrors(parsed.error),
    });
  }

  const { name, email, phone, position, year, message } = parsed.data;

  try {
    const limits = await checkJoinRateLimits({
      email,
      ip: clientIp(request),
    });

    if (!limits.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "You've reached the limit of 3 applications per day. Please try again later.",
          retryAfterSeconds: limits.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limits.retryAfterSeconds) },
        },
      );
    }

    const db = await getDb();
    await db.collection("applications").insertOne({
      name,
      email,
      phone,
      position,
      year,
      message: message ?? "",
      consent: true,
      status: "new",
      source: "portfolio-join-form",
      // Only a salted hash of the IP is stored (privacy).
      ipHash: limits.ipHash,
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
      createdAt: new Date(),
    });

    return NextResponse.json(
      { ok: true, message: "Application received. We'll be in touch." },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/join] failed to store application", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Something went wrong on our side. Please try again later.",
      },
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
