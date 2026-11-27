import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { z } from "zod";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp, declaredBodyTooLarge, hasJsonContentType, isSameOrigin } from "@/lib/http";
import { generateTempPassword } from "@/lib/password-policy";
import { hashIp } from "@/lib/rate-limit";
import { ADMIN_ROLES, createUser, listUsers } from "@/lib/user-queries";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;
const NO_STORE = { "Cache-Control": "no-store" };

const createSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).email(),
    role: z.enum(ADMIN_ROLES),
  })
  .strict();

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: NO_STORE });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (session.user.role !== "owner") return fail(403, "Only owners can manage users.");

  try {
    return NextResponse.json({ ok: true, users: await listUsers() }, { headers: NO_STORE });
  } catch (error) {
    logError("api/admin/users", "list failed", error);
    return fail(503, "Could not load users right now.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Request blocked.");
  if (!hasJsonContentType(request)) return fail(415, "Unsupported content type.");
  if (declaredBodyTooLarge(request, MAX_BODY_BYTES)) return fail(413, "Request is too large.");

  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (session.user.role !== "owner") return fail(403, "Only owners can manage users.");
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Enter a valid email and role.");

  try {
    const tempPassword = generateTempPassword();
    const result = await createUser(parsed.data.email, parsed.data.role, hashPassword(tempPassword));
    if (result === "duplicate") return fail(409, "A user with this email already exists.");

    await logAudit({
      actorEmail: session.user.email,
      action: "user.create",
      entity: "admin_user",
      entityId: parsed.data.email,
      changes: [`role:${parsed.data.role}`],
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json(
      { ok: true, user: result, tempPassword },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    logError("api/admin/users", "create failed", error);
    return fail(503, "Could not create the user right now.");
  }
}
