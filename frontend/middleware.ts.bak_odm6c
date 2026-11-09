import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/giris", "/kayit"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const token = request.cookies.get("eph_token")?.value;

  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/giris", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === "/giris" || pathname === "/kayit")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|LOGO_EPH.png|manifest.json|sw.js|icons|images).*)",
  ],
};