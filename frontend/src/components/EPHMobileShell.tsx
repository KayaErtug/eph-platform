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
  X,
  Settings,
  Bot,
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
  const [menuOpen, setMenuOpen] = useState(false);

  const showShell = shouldShowShell(pathname);
  const showBottomNav = shouldShowBottomNav(pathname);
  const title = useMemo(() => getTitle(pathname), [pathname]);

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

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
          onClick={() => setMenuOpen(true)}
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

      {menuOpen && (
        <div className="fixed inset-0 z-[999] bg-[#06194A]/35 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)}>
          <aside
            className="h-full w-[286px] rounded-r-[28px] border-r border-[#DDE7F3] bg-white p-3 shadow-[20px_0_44px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between rounded-[20px] bg-[#F7FBFF] px-3 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#1557D6]">
                  EPH Menü
                </p>
                <h2 className="mt-1 text-[17px] font-black text-[#06194A]">
                  Hızlı Erişim
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white text-[#06194A] shadow-sm"
                aria-label="Menüyü kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-1.5">
              <MenuItem icon={<Home size={18} />} label="Anasayfa" onClick={() => go("/dashboard")} />
              <MenuItem icon={<UsersRound size={18} />} label="CRM" onClick={() => go("/crm")} />
              <MenuItem icon={<Building2 size={18} />} label="Portföy" onClick={() => go("/stok")} />
              <MenuItem icon={<MessageSquare size={18} />} label="Forum" onClick={() => go("/network")} />
              <MenuItem icon={<Target size={18} />} label="Havuz" onClick={() => go("/havuz")} />
              <MenuItem icon={<Bell size={18} />} label="Mesajlar" badge="Yeni" onClick={() => go("/messages")} />
              <MenuItem icon={<Bot size={18} />} label="Lina" onClick={() => setLinaOpen(true)} />
              <MenuItem icon={<Settings size={18} />} label="Bildirim Ayarları" onClick={() => go("/notification-settings")} />
              <MenuItem icon={<User size={18} />} label="Profil" onClick={() => go("/profil")} />
            </div>
          </aside>
        </div>
      )}

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

function MenuItem({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center justify-between rounded-[16px] px-3 text-left text-[13px] font-black text-[#06194A] transition active:bg-[#EFF6FF]"
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[13px] bg-[#EFF6FF] text-[#1557D6]">
          {icon}
        </span>
        {label}
      </span>

      {badge && (
        <span className="rounded-full bg-[#6D4AFF] px-2 py-1 text-[9px] font-black text-white">
          {badge}
        </span>
      )}
    </button>
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