import { NextResponse, type NextRequest } from "next/server";

// Cookie names must match the Express backend (see auth.service.ts / config/jwt.ts)
const ACCESS_TOKEN_COOKIE = "accessToken";

// Routes that always require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/jobs", "/resources", "/profile", "/roadmap"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/resources/:path*", "/profile/:path*", "/roadmap/:path*"],
};
