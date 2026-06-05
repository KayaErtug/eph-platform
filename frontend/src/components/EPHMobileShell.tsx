"use client";

import "./EPHMobileShell.css";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Building2,
  Home,
  Menu,
  MessageSquare,
  Target,
  User,
  UsersRound,
} from "lucide-react";
import LinaPanel from "./LinaPanel";

const MAIN_ROUTES = [
  "/dashboard",
  "/crm",
  "/stok",
  "/network",
  "/havuz",
  "/forum",
  "/messages",
];

function getTitle(pathname: string) {
  if (pathname.startsWith("/crm")) return "CRM";
  if (pathname.startsWith("/stok")) return "PORTFÖY";
  if (pathname.startsWith("/forum") || pathname.startsWith("/network")) return "FORUM";
  if (pathname.startsWith("/havuz")) return "HAVUZ";
  if (pathname.startsWith("/messages")) return "MESAJLAR";
  if (pathname.startsWith("/profil")) return "PROFİL";
  if (pathname.startsWith("/notification-settings")) return "BİLDİRİMLER";
  if (pathname.startsWith("/admin")) return "ADMİN";
  if (pathname.startsWith("/market")) return "MARKET";
  if (pathname.startsWith("/lina")) return "LİNA";

  return "ANASAYFA";
}

function shouldShowShell(pathname: string) {
  if (pathname === "/") return false;
  if (pathname.startsWith("/giris")) return false;
  if (pathname.startsWith("/kayit")) return false;
  if (pathname.startsWith("/kvkk")) return false;
  if (pathname.startsWith("/kullanici-sozlesmesi")) return false;
  if (pathname.startsWith("/platform-anayasasi")) return false;
  if (pathname.startsWith("/gizlilik-politikasi")) return false;
  if (pathname.startsWith("/cerez-politikasi")) return false;

  return true;
}

function shouldShowBottomNav(pathname: string) {
  if (!shouldShowShell(pathname)) return false;

  if (pathname.startsWith("/profil")) return false;
  if (pathname.startsWith("/notification-settings")) return false;
  if (pathname.startsWith("/yardim-merkezi")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/market")) return false;
  if (pathname.startsWith("/lina")) return false;

  return MAIN_ROUTES.some((route) => pathname.startsWith(route));
}

export function EPHMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [linaOpen, setLinaOpen] = useState(false);

  const showShell = shouldShowShell(pathname);
  const showBottomNav = shouldShowBottomNav(pathname);
  const title = useMemo(() => getTitle(pathname), [pathname]);

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="eph-mobile-app-shell">
      <header className="eph-mobile-topbar">
        <button
          type="button"
          className="eph-mobile-icon-button"
          aria-label="Menü"
          onClick={() => router.push("/dashboard")}
        >
          <Menu size={25} strokeWidth={2.5} />
        </button>

        <div className="eph-mobile-page-title">{title}</div>

        <div className="eph-mobile-top-actions">
          <button
            type="button"
            className="eph-mobile-icon-button eph-mobile-bell-button"
            aria-label="Bildirimler"
            onClick={() => router.push("/messages")}
          >
            <Bell size={24} strokeWidth={2.35} />
            <span>3</span>
          </button>

          <button
            type="button"
            className="eph-mobile-avatar-button"
            aria-label="Profil"
            onClick={() => router.push("/profil")}
          >
            <User size={23} strokeWidth={2.35} />
          </button>
        </div>
      </header>

      <main className={showBottomNav ? "eph-mobile-content with-bottom-nav" : "eph-mobile-content"}>
        {children}
      </main>

      <button
        type="button"
        className="eph-mobile-lina-fab"
        onClick={() => setLinaOpen(true)}
        aria-label="Lina"
      >
        <span className="eph-mobile-lina-star">✦</span>
        <span>Lina</span>
      </button>

      {showBottomNav && <EPHMobileBottomNav pathname={pathname} />}

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />
    </div>
  );
}

function EPHMobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="eph-mobile-bottom-nav" aria-label="Alt menü">
      <BottomItem
        href="/dashboard"
        active={pathname.startsWith("/dashboard")}
        icon={<Home size={25} strokeWidth={2.35} />}
        label="Anasayfa"
      />
      <BottomItem
        href="/crm"
        active={pathname.startsWith("/crm")}
        icon={<UsersRound size={25} strokeWidth={2.35} />}
        label="CRM"
      />
      <BottomItem
        href="/stok"
        active={pathname.startsWith("/stok")}
        icon={<Building2 size={25} strokeWidth={2.35} />}
        label="Portföy"
      />
      <BottomItem
        href="/network"
        active={pathname.startsWith("/network") || pathname.startsWith("/forum")}
        icon={<MessageSquare size={25} strokeWidth={2.35} />}
        label="Forum"
      />
      <BottomItem
        href="/havuz"
        active={pathname.startsWith("/havuz")}
        icon={<Target size={26} strokeWidth={2.35} />}
        label="Havuz"
      />
    </nav>
  );
}

function BottomItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={active ? "eph-mobile-nav-item active" : "eph-mobile-nav-item"}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}