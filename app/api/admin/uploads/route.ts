import { NextResponse } from "next/server";
import { enforceAdminLimit } from "@/lib/admin-limits";
import { canEditContent, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp, declaredBodyTooLarge, isSameOrigin } from "@/lib/http";
import { sniffImage } from "@/lib/image-sniff";
import { ImageKitError, isImageKitConfigured, uploadToImageKit } from "@/lib/imagekit";
import { logError } from "@/lib/log";
import { hashIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel functions accept ~4.5 MB bodies, so keep the file under 4 MB plus form overhead. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 256 * 1024;

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Keeps only safe characters and forces the extension of the *detected* type. */
function safeFileName(original: string, ext: string): string {
  const base = original
    .replace(/\.[^.]*$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}.${ext}`;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Request blocked.");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return fail(415, "Unsupported content type.");
  }
  if (declaredBodyTooLarge(request, MAX_BODY_BYTES)) return fail(413, "Image is too large (4 MB maximum).");

  const session = await getAdminSession();
  if (!session) return fail(401, "Unauthorized.");
  if (!canEditContent(session.user.role)) return fail(403, "Your role cannot upload images.");
  if (!isImageKitConfigured()) return fail(503, "Image uploads are not configured.");
  const limited = await enforceAdminLimit(session.user._id, "upload");
  if (limited) return limited;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail(400, "Invalid upload.");
  }
  if (!(file instanceof File) || file.size === 0) return fail(422, "Choose an image file to upload.");
  if (file.size > MAX_FILE_BYTES) return fail(413, "Image is too large (4 MB maximum).");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = sniffImage(bytes);
  if (!image) return fail(415, "Only JPEG, PNG or WebP images are allowed.");

  try {
    const url = await uploadToImageKit(bytes, safeFileName(file.name, image.ext), image.mime);
    await logAudit({
      actorEmail: session.user.email,
      action: "upload.image",
      entity: "image",
      changes: [`type:${image.mime}`, `bytes:${bytes.length}`],
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent") ?? "",
    });
    return NextResponse.json({ ok: true, url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("api/admin/uploads", error instanceof ImageKitError ? "ImageKit upload failed" : "upload failed", error);
    return fail(502, "The image service could not store the image. Please try again.");
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
