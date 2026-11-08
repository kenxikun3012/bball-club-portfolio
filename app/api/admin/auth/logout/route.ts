import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroyAdminSession, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Request blocked." }, { status: 403 });
  }

  const session = await getAdminSession();
  if (session) {
    await destroyAdminSession(session.token);
    await logAudit({
      actorEmail: session.user.email,
      action: "logout",
      entity: "admin",
      userAgent: request.headers.get("user-agent") ?? "",
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
