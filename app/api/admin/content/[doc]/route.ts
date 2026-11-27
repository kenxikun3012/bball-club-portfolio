import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { z } from "zod";
import { canEditContent, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { contentSchemas, schemaIssues } from "@/lib/admin-schemas";
import {
  contentTag,
  getContentSnapshot,
  isEditableContentId,
  type ContentDocument,
} from "@/lib/content-db";
import { clientIp, declaredBodyTooLarge, hasJsonContentType, isSameOrigin } from "@/lib/http";
import { getDb } from "@/lib/mongodb";
import { hashIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Members is the largest document; leave room for future growth. */
const MAX_BODY_BYTES = 512_000;

const patchSchema = z
  .object({
    data: z.unknown(),
    expectedRevision: z.number().int().min(0),
  })
  .strict();

function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

async function currentRevision(doc: string): Promise<number | null> {
  try {
    const db = await getDb();
    const document = await db
      .collection<ContentDocument<unknown>>("content")
      .findOne({ _id: doc as ContentDocument<unknown>["_id"] }, { projection: { revision: 1 } });
    return document?.revision ?? null;
  } catch (error) {
    logError("api/admin/content", "revision lookup failed", error);
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ doc: string }> },
) {
  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");

  const { doc } = await context.params;
  if (!isEditableContentId(doc)) return fail(404, "Unknown content document.");

  try {
    const snapshot = await getContentSnapshot(doc);
    return NextResponse.json({
      ok: true,
      doc,
      data: snapshot.data,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt ?? null,
      updatedBy: snapshot.updatedBy ?? null,
    });
  } catch (error) {
    logError("api/admin/content", "read failed", error);
    return fail(503, "Could not load this content right now.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ doc: string }> },
) {
  if (!isSameOrigin(request)) return fail(403, "Request blocked.");
  if (!hasJsonContentType(request)) return fail(415, "Unsupported content type.");
  if (declaredBodyTooLarge(request, MAX_BODY_BYTES)) {
    return fail(413, "Request is too large.");
  }

  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (!canEditContent(session.user.role)) {
    return fail(403, "Your role can view content but not edit it.");
  }
  const limited = await enforceAdminLimit(session.user._id, "write");
  if (limited) return limited;

  const { doc } = await context.params;
  if (!isEditableContentId(doc)) return fail(404, "Unknown content document.");

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return fail(413, "Request is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request body.");
  }

  const envelope = patchSchema.safeParse(body);
  if (!envelope.success) {
    return fail(422, "Invalid request body.", {
      issues: schemaIssues(envelope.error),
    });
  }

  const parsed = contentSchemas[doc].safeParse(envelope.data.data);
  if (!parsed.success) {
    return fail(422, "Please check the highlighted fields.", {
      issues: schemaIssues(parsed.error),
    });
  }

  const data = parsed.data as Record<string, unknown>;
  const expectedRevision = envelope.data.expectedRevision;

  try {
    const db = await getDb();
    const collection = db.collection<ContentDocument<unknown>>("content");
    const existing = await collection.findOne({ _id: doc });

    if (existing && existing.revision !== expectedRevision) {
      return NextResponse.json(
        {
          ok: false,
          code: "conflict",
          message: "Someone else saved a newer revision. Reload before saving.",
          revision: existing.revision,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const updatedBy = session.user.email;
    const changes = Object.keys(data).filter(
      (key) =>
        JSON.stringify((existing?.data as Record<string, unknown> | undefined)?.[key]) !==
        JSON.stringify(data[key]),
    );

    if (!existing) {
      if (expectedRevision !== 0) {
        return NextResponse.json(
          {
            ok: false,
            code: "conflict",
            message: "This content does not exist yet. Reload and try again.",
            revision: 0,
          },
          { status: 409 },
        );
      }
      try {
        await collection.insertOne({
          _id: doc as ContentDocument<unknown>["_id"],
          data,
          revision: 1,
          updatedAt: now,
          updatedBy,
        });
      } catch (error) {
        // Another request created the document between our read and insert.
        const code = (error as { code?: number }).code;
        if (code === 11000) {
          return NextResponse.json(
            {
              ok: false,
              code: "conflict",
              message: "Someone else created this content. Reload before saving.",
              revision: (await currentRevision(doc)) ?? 0,
            },
            { status: 409 },
          );
        }
        throw error;
      }
    } else {
      const result = await collection.updateOne(
        { _id: doc, revision: expectedRevision },
        { $set: { data, updatedAt: now, updatedBy }, $inc: { revision: 1 } },
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          {
            ok: false,
            code: "conflict",
            message: "Someone else saved a newer revision. Reload before saving.",
            revision: (await currentRevision(doc)) ?? expectedRevision,
          },
          { status: 409 },
        );
      }
    }

    // Expire the cached public read right away so the edit is live on the next request.
    revalidateTag(contentTag(doc), { expire: 0 });

    await logAudit({
      actorEmail: session.user.email,
      action: "content.update",
      entity: "content",
      entityId: doc,
      changes,
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      ok: true,
      doc,
      revision: expectedRevision + 1,
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    logError("api/admin/content", "write failed", error);
    return fail(503, "Could not save this content right now.");
  }
}

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "GET, PATCH" } },
  );
}
