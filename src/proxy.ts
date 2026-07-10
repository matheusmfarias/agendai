import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

const RESERVED_PUBLIC_SEGMENTS = new Set([
  "admin",
  "app",
  "api",
  "login",
  "access-denied",
  "cliente",
  "_next",
  "favicon.ico",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/app")) {
    const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (!first) {
    return NextResponse.rewrite(new URL("/login", request.url));
  }

  if (
    RESERVED_PUBLIC_SEGMENTS.has(first) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
