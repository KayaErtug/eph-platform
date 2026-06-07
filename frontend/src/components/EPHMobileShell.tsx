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
  if (normalized === "SUPER_ADMIN") return "Yazılım Ekibi";
  if (normalized === "EMLAKCI") return "Emlakçı";
  if (["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT"].includes(normalized)) return "Müteahhit";
  if (["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized)) return "İnşaat Firması";

  return "EPH Üyesi";
}

export function EPHMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
    router.push("/lina");
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
        <div className="eph-mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="eph-mobile-menu-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="eph-mobile-menu-hero">
              <div className="eph-mobile-menu-hero-circle one" />
              <div className="eph-mobile-menu-hero-circle two" />

              <div className="eph-mobile-menu-user-row">
                <div className="eph-mobile-menu-avatar">{getInitial(user)}</div>

                <div className="eph-mobile-menu-user-text">
                  <p>EPH Platform</p>
                  <h2>{getDisplayName(user)}</h2>
                  <span>{roleLabel(user?.role)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="eph-mobile-menu-close"
                  aria-label="Menüyü kapat"
                >
                  <X size={20} />
                </button>
              </div>

              <button type="button" onClick={() => go("/profil")} className="eph-mobile-menu-account">
                <div>
                  <p>Hesap Merkezi</p>
                  <span>Profil ve üyelik bilgileri</span>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="eph-mobile-menu-scroll">
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
                  onClick={() => go("/help-center")}
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

      {!pathname.startsWith("/lina") && (
        <button
          type="button"
          className="eph-mobile-lina-fab"
          onClick={openLina}
          aria-label="Lina"
        >
          <span className="eph-mobile-lina-star">✦</span>
          <span>Lina</span>
        </button>
      )}

      {showBottomNav && <EPHMobileBottomNav pathname={pathname} />}
    </div>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="eph-mobile-menu-section">
      <h3>{title}</h3>
      <div>{children}</div>
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
    <button type="button" onClick={onClick} className={danger ? "eph-mobile-menu-row danger" : "eph-mobile-menu-row"}>
      <span className="eph-mobile-menu-row-left">
        <span className="eph-mobile-menu-row-icon">{icon}</span>
        <span className="eph-mobile-menu-row-label">{label}</span>
      </span>

      <span className="eph-mobile-menu-row-right">
        {badge && <span className="eph-mobile-menu-badge">{badge}</span>}
        <ChevronRight size={16} />
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
    <Link href={href} className={active ? "eph-mobile-nav-item active" : "eph-mobile-nav-item"}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}