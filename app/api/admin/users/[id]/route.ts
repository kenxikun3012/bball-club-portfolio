import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { z } from "zod";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp, declaredBodyTooLarge, hasJsonContentType, isSameOrigin } from "@/lib/http";
import { generateTempPassword } from "@/lib/password-policy";
import { hashIp } from "@/lib/rate-limit";
import { ADMIN_ROLES, updateUser, type UserChange } from "@/lib/user-queries";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;
const NO_STORE = { "Cache-Control": "no-store" };

/** Exactly one of role, disabled or resetPassword. */
const patchSchema = z.union([
  z.object({ role: z.enum(ADMIN_ROLES) }).strict(),
  z.object({ disabled: z.boolean() }).strict(),
  z.object({ resetPassword: z.literal(true) }).strict(),
]);

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: NO_STORE });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Invalid request body.");

  const { id } = await context.params;
  let tempPassword: string | undefined;
  const change: UserChange = {};
  if ("role" in parsed.data) change.role = parsed.data.role;
  else if ("disabled" in parsed.data) change.disabled = parsed.data.disabled;
  else {
    tempPassword = generateTempPassword();
    change.passwordHash = hashPassword(tempPassword);
  }

  try {
    const result = await updateUser(id, change, session.user._id);
    if (result === "not-found") return fail(404, "User not found.");
    if (result === "self") return fail(403, "You cannot change your own account here.");
    if (result === "last-owner") return fail(409, "At least one active owner is required.");

    const action = change.passwordHash
      ? "user.reset"
      : change.role !== undefined
        ? "user.role"
        : change.disabled
          ? "user.disable"
          : "user.enable";
    await logAudit({
      actorEmail: session.user.email,
      action,
      entity: "admin_user",
      entityId: result.view.email,
      changes: change.role !== undefined ? [`role:${result.before.role}→${change.role}`] : [],
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json(
      { ok: true, user: result.view, ...(tempPassword ? { tempPassword } : {}) },
      { headers: NO_STORE },
    );
  } catch (error) {
    logError("api/admin/users", "update failed", error);
    return fail(503, "Could not update the user right now.");
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "PATCH" } },
  );
}
