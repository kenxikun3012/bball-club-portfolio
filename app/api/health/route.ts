import { NextResponse } from "next/server";
import { logError } from "@/lib/log";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Uptime check: 200 when the app can reach MongoDB, 503 otherwise. Public by design,
 * so it reveals nothing beyond up/down.
 */
export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() }, { headers: NO_STORE });
  } catch (error) {
    logError("api/health", "database ping failed", error);
    return NextResponse.json(
      { ok: false, db: "down", time: new Date().toISOString() },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "GET", ...NO_STORE } },
  );
}
