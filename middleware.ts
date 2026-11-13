import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware: security headers for every page + the admin gate.
 *
 * 1. A fresh nonce per request builds a strict Content-Security-Policy. Next.js
 *    reads the policy from the *request* headers and stamps the nonce on its own
 *    scripts, so no `'unsafe-inline'` is needed for scripts.
 * 2. Admin pages and APIs are marked `noindex` and gated on session-cookie presence.
 *    Middleware cannot query MongoDB, so full validation still happens in the admin
 *    layout and every admin API route (`getAdminSession` / `requireAdminPage`); a
 *    forged cookie cannot grant access.
 */

const isProd = process.env.NODE_ENV === "production";

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets nonced scripts load their own chunks; dev needs eval for React refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    // Tailwind/Next inject inline styles; style injection is far lower risk than script.
    "style-src 'self' 'unsafe-inline'",
    // Content images are https-only by schema; data: covers inline SVG/blur placeholders.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

const NOINDEX = "noindex, nofollow";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  const nonce = newNonce();
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const decorate = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", policy);
    if (isAdmin) response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  };

  // The login page and login endpoint must be reachable without a session.
  if (!isAdmin || pathname === "/admin/login" || pathname === "/api/admin/auth/login") {
    return decorate(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (request.cookies.get("admin_session")?.value) {
    return decorate(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (pathname.startsWith("/api/admin")) {
    return decorate(
      NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }),
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
  return decorate(NextResponse.redirect(loginUrl));
}

export const config = {
  // Everything except static assets, which need no per-request policy.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|photos/).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
