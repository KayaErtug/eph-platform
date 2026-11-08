import { NextRequest, NextResponse } from "next/server";
import { paymentReturnPath } from "./src/lib/payment-return";

const mobileOnlyRoutes = [
  "/dashboard", "/crm", "/portfoy", "/stok", "/havuz", "/network",
  "/forum-v3", "/messages", "/notification-settings", "/profil", "/lina",
  "/market", "/uretkenlik", "/proje-satis-sablonu", "/proje-satis-kanali", "/ofisim",
];
const publicRoutes = [
  "/", "/giris", "/kayit", "/ucretlendirme", "/sifremi-unuttum",
  "/kullanici-sozlesmesi", "/gizlilik-politikasi", "/kvkk",
  "/cerez-politikasi", "/platform-anayasasi", "/mobil-uygulama", "/help-center",
];
const shareRoutes = [
  "/paylasim", "/portfoy-paylasim", "/talep-paylasim",
  "/proje-sunum", "/verify-authority",
];

function isWithin(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const token = request.cookies.get("eph_token")?.value;
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (mobileOnlyRoutes.some((route) => isWithin(pathname, route))) {
    return redirect("/mobil-uygulama");
  }

  if (isWithin(pathname, "/admin")) {
    if (token) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://emlakportfoyhavuzu.com/api";
        const response = await fetch(`${apiUrl.replace(/\/$/, "")}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const user = await response.json();
          if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
            return NextResponse.next();
          }
        }
      } catch {
        // Oturum veya rol doğrulanamazsa yönetim ekranını açma.
      }
    }
    return redirect("/mobil-uygulama");
  }

  // Vitrin ve paylaşımların public görsel/font dosyaları oturum istemez.
  if (/\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|mp3|mp4|webmanifest|js|css)$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (token && (pathname === "/giris" || pathname === "/kayit")) {
    return redirect(paymentReturnPath(request.nextUrl.searchParams.get("next")));
  }

  const isPublic = publicRoutes.includes(pathname)
    || isWithin(pathname, "/kayit")
    || shareRoutes.some((route) => isWithin(pathname, route));

  if (!token && !isPublic) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", paymentReturnPath(`${pathname}${request.nextUrl.search}`));
    return redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/|favicon.ico|LOGO_EPH.png|manifest.json|sw.js|workbox-|icons/|images/|apple-touch-icon.png).*)",
  ],
};
