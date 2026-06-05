"use client";

import "./EPHMobileShell.css";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  ChevronRight,
  HelpCircle,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  User,
  UsersRound,
  X,
} from "lucide-react";

import LinaPanel from "./LinaPanel";
import { useAuthStore } from "@/store/auth.store";

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

function getDisplayName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return fullName || user?.email?.split("@")[0] || "EPH Üyesi";
}

function getInitial(user?: {
  firstName?: string | null;
  email?: string | null;
} | null) {
  return (user?.firstName?.[0] || user?.email?.[0] || "E").toLocaleUpperCase("tr-TR");
}

function roleLabel(role?: string | null) {
  const normalized = String(role || "").toLocaleUpperCase("tr-TR");

  if (normalized === "ADMIN") return "Admin";
  if (normalized === "SUPER_ADMIN") return "Süper Admin";
  if (normalized === "EMLAKCI") return "Emlakçı";
  if (["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT"].includes(normalized)) return "Müteahhit";
  if (["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized)) return "İnşaat Firması";

  return "EPH Üyesi";
}

export function EPHMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [linaOpen, setLinaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const showShell = shouldShowShell(pathname);
  const showBottomNav = shouldShowBottomNav(pathname);
  const title = useMemo(() => getTitle(pathname), [pathname]);

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  const openLina = () => {
    setMenuOpen(false);
    setLinaOpen(true);
  };

  const feedbackMail = (subject: string) => {
    setMenuOpen(false);
    window.location.href = `mailto:mustafaertugkaya@gmail.com?subject=${encodeURIComponent(subject)}`;
  };

  const comingSoon = (message: string) => {
    alert(message);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/giris");
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
        <div
          className="fixed inset-0 z-[999] bg-[#06194A]/38 backdrop-blur-[3px]"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="fixed bottom-0 left-0 top-0 z-[1000] flex h-[100dvh] w-[318px] max-w-[86vw] translate-x-0 flex-col overflow-hidden rounded-r-[32px] border-r border-[#DDE7F3] bg-white shadow-[22px_0_54px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1557D6] via-[#4F46E5] to-[#7C3AED] px-4 pb-4 pt-4 text-white">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/12" />
              <div className="absolute -bottom-10 left-8 h-28 w-28 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-white/18 text-[19px] font-black shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
                    {getInitial(user)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                      EPH Platform
                    </p>
                    <h2 className="mt-1 truncate text-[18px] font-black tracking-[-0.03em]">
                      {getDisplayName(user)}
                    </h2>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-white/78">
                      {roleLabel(user?.role)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-white/15 text-white active:bg-white/22"
                  aria-label="Menüyü kapat"
                >
                  <X size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => go("/profil")}
                className="relative mt-4 flex min-h-[44px] w-full items-center justify-between rounded-[18px] bg-white/14 px-3 text-left backdrop-blur"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/65">
                    Hesap Merkezi
                  </p>
                  <p className="mt-0.5 text-[12px] font-black text-white">
                    Profil ve üyelik bilgileri
                  </p>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <MenuSection title="Operasyon Merkezi">
                <MenuRow icon={<Home size={17} />} label="Anasayfa" onClick={() => go("/dashboard")} />
                <MenuRow icon={<UsersRound size={17} />} label="CRM" onClick={() => go("/crm")} />
                <MenuRow icon={<Building2 size={17} />} label="Portföy" onClick={() => go("/stok")} />
                <MenuRow icon={<MessageSquare size={17} />} label="Forum" onClick={() => go("/network")} />
                <MenuRow icon={<Target size={17} />} label="Havuz" onClick={() => go("/havuz")} />
                <MenuRow icon={<Bell size={17} />} label="Mesajlar" badge="Yeni" onClick={() => go("/messages")} />
              </MenuSection>

              <MenuSection title="Lina">
                <MenuRow icon={<Bot size={17} />} label="Lina Asistan" onClick={openLina} />
                <MenuRow
                  icon={<Sparkles size={17} />}
                  label="Lina Fırsatları"
                  onClick={() => comingSoon("Lina Fırsatları ekranını sıradaki adımda açacağız.")}
                />
              </MenuSection>

              <MenuSection title="EPH">
                <MenuRow icon={<ShoppingBag size={17} />} label="Market" onClick={() => go("/market")} />
                <MenuRow
                  icon={<Star size={17} />}
                  label="Duyurular"
                  onClick={() => comingSoon("Duyurular bölümü yakında aktif olacak.")}
                />
              </MenuSection>

              <MenuSection title="Geri Bildirim">
                <MenuRow
                  icon={<Lightbulb size={17} />}
                  label="Öneri Gönder"
                  onClick={() => feedbackMail("EPH Öneri")}
                />
                <MenuRow
                  icon={<UsersRound size={17} />}
                  label="Davet Et ve Kazan"
                  onClick={() => go("/admin/referrals")}
                />
                <MenuRow
                  icon={<AlertTriangle size={17} />}
                  label="Sorun Bildir / Şikayet"
                  onClick={() => feedbackMail("EPH Sorun Bildirimi")}
                />
              </MenuSection>

              <MenuSection title="Hesap">
                <MenuRow icon={<User size={17} />} label="Profil" onClick={() => go("/profil")} />
                <MenuRow
                  icon={<Settings size={17} />}
                  label="Bildirim Ayarları"
                  onClick={() => go("/notification-settings")}
                />
                <MenuRow
                  icon={<HelpCircle size={17} />}
                  label="Yardım Merkezi"
                  onClick={() => comingSoon("Yardım Merkezi yakında aktif olacak.")}
                />
                <MenuRow danger icon={<LogOut size={17} />} label="Çıkış Yap" onClick={handleLogout} />
              </MenuSection>
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

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3">
      <h3 className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
        {title}
      </h3>

      <div className="overflow-hidden rounded-[22px] border border-[#DDE7F3] bg-[#FBFDFF]">
        {children}
      </div>
    </section>
  );
}

function MenuRow({
  icon,
  label,
  badge,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center justify-between border-b border-[#EAF1FA] px-3 text-left last:border-b-0 active:bg-[#EFF6FF]"
    >
      <span className={`flex min-w-0 items-center gap-2.5 ${danger ? "text-red-600" : "text-[#06194A]"}`}>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] ${
            danger ? "bg-red-50 text-red-600" : "bg-[#EFF6FF] text-[#1557D6]"
          }`}
        >
          {icon}
        </span>

        <span className="truncate text-[13px] font-black">{label}</span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {badge && (
          <span className="rounded-full bg-[#6D4AFF] px-2 py-1 text-[9px] font-black text-white">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className={danger ? "text-red-300" : "text-[#94A3B8]"} />
      </span>
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