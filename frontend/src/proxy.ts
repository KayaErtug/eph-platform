import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = [
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/portfoy",
  "/havuz",
  "/profil",
  "/crm",
  "/network",
  "/messages",
  "/kontor",
  "/uyelik",
  "/lina",
  "/notification-settings",
  "/admin",
  "/market",
  "/stok",
  "/uretkenlik",
  "/forum-v3",
  "/help-center",
  "/proje-satis-sablonu",
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("eph_token")?.value;

  const isAuthRoute = AUTH_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/giris", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthRoute) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/giris",
    "/kayit/:path*",
    "/sifremi-unuttum",
    "/dashboard/:path*",
    "/portfoy/:path*",
    "/havuz/:path*",
    "/profil/:path*",
    "/crm/:path*",
    "/network/:path*",
    "/messages/:path*",
    "/kontor/:path*",
    "/uyelik/:path*",
    "/lina/:path*",
    "/notification-settings/:path*",
    "/admin/:path*",
    "/market/:path*",
    "/stok/:path*",
    "/uretkenlik/:path*",
    "/forum-v3/:path*",
    "/help-center/:path*",
    "/proje-satis-sablonu/:path*",
  ],
};
