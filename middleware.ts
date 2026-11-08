import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate for the admin area.
 *
 * Middleware cannot query MongoDB, so this only checks that a session cookie
 * exists. Full validation happens in the admin layout and every admin API
 * route (`getAdminSession` / `requireAdminPage`), so a forged cookie cannot
 * grant access.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page and login endpoint must be reachable without a session.
  if (pathname === "/admin/login" || pathname === "/api/admin/auth/login") {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get("admin_session")?.value);
  if (hasSessionCookie) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
