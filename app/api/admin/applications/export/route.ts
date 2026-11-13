import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { canEditContent, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseListQuery } from "@/lib/application-schemas";
import { exportApplications } from "@/lib/application-queries";
import { toCsv } from "@/lib/csv";
import { clientIp } from "@/lib/http";
import { hashIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = ["name", "email", "phone", "position", "year", "status", "received", "message"];

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (!canEditContent(session.user.role)) {
    return fail(403, "Your role cannot export applications.");
  }
  const limited = await enforceAdminLimit(session.user._id, "export");
  if (limited) return limited;

  const query = parseListQuery(new URL(request.url).searchParams);

  try {
    const items = await exportApplications(query);
    const csv = toCsv(
      HEADERS,
      items.map((item) => [
        item.name,
        item.email,
        item.phone,
        item.position,
        item.year,
        item.status,
        item.createdAt,
        item.message,
      ]),
    );

    await logAudit({
      actorEmail: session.user.email,
      action: "application.export",
      entity: "application",
      changes: [
        `rows:${items.length}`,
        ...(query.status ? ["filter:status"] : []),
        ...(query.q ? ["filter:q"] : []),
      ],
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    const day = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("api/admin/applications/export", "failed", error);
    return fail(503, "Could not export applications right now.");
  }
}
