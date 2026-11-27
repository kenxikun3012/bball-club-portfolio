import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { canEditContent, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { applicationPatchSchema, MAX_NOTES } from "@/lib/application-schemas";
import { addApplicationNote, setApplicationStatus } from "@/lib/application-queries";
import { clientIp, declaredBodyTooLarge, hasJsonContentType, isSameOrigin } from "@/lib/http";
import { hashIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return fail(403, "Request blocked.");
  if (!hasJsonContentType(request)) return fail(415, "Unsupported content type.");
  if (declaredBodyTooLarge(request, MAX_BODY_BYTES)) return fail(413, "Request is too large.");

  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (!canEditContent(session.user.role)) {
    return fail(403, "Your role can view applications but not change them.");
  }
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

  const parsed = applicationPatchSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Invalid request body.");

  const { id } = await context.params;
  const now = new Date();
  const audit = {
    actorEmail: session.user.email,
    entity: "application",
    entityId: id,
    ipHash: hashIp(clientIp(request)),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  try {
    if ("status" in parsed.data) {
      const result = await setApplicationStatus(id, parsed.data.status, now);
      if (!result) return fail(404, "Application not found.");
      await logAudit({
        ...audit,
        action: "application.status",
        changes: [`status:${result.from}→${parsed.data.status}`],
      });
      return NextResponse.json({ ok: true, application: result.view });
    }

    const result = await addApplicationNote(id, parsed.data.addNote, session.user.email, now);
    if (result === null) return fail(404, "Application not found.");
    if (result === "limit") return fail(422, `Notes are limited to ${MAX_NOTES} per application.`);
    await logAudit({ ...audit, action: "application.note", changes: ["note"] });
    return NextResponse.json({ ok: true, application: result });
  } catch (error) {
    logError("api/admin/applications", "update failed", error);
    return fail(503, "Could not update this application right now.");
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "PATCH" } },
  );
}
