import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic routing on cookie presence only (Next 16 "proxy"). The API is
 * the authority on whether the session is valid; the app shell re-checks with
 * GET /v1/auth/me and sends the user back here if it isn't.
 */
const SESSION_COOKIES = ["since_access", "since_refresh"];
const APP_PREFIXES = ["/catch-up", "/watchlist", "/stocks"];
const AUTH_PATHS = ["/sign-in", "/sign-up"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));

  if (!hasSession && APP_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_PATHS.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/catch-up";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/catch-up/:path*", "/watchlist/:path*", "/stocks/:path*", "/sign-in", "/sign-up"],
};
