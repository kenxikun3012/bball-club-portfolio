/** Small helpers shared by API route handlers. */

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Reject cross-site browser requests (CSRF hardening). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function hasJsonContentType(request: Request): boolean {
  return (request.headers.get("content-type") ?? "")
    .toLowerCase()
    .includes("application/json");
}

export function declaredBodyTooLarge(request: Request, maxBytes: number): boolean {
  const declared = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(declared) && declared > maxBytes;
}
