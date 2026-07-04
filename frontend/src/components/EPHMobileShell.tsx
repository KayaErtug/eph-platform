"use client";

import "./EPHMobileShell.css";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  ChevronRight,
  FileSpreadsheet,
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

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Conversation = {
  unreadCount?: number | null;
};

const MAIN_ROUTES = [
  "/dashboard",
  "/crm",
  "/portfoy",
  "/network",
  "/havuz",
  "/forum",
  "/messages",
];

function getTitle(pathname: string) {
  if (pathname.startsWith("/crm")) return "CRM";
  if (pathname.startsWith("/portfoy")) return "PORTFÖY";
  if (pathname.startsWith("/forum") || pathname.startsWith("/network")) {
    return "FORUM";
  }
  if (pathname.startsWith("/havuz")) return "HAVUZ";
  if (pathname.startsWith("/messages")) return "MESAJLAR";
  if (pathname.startsWith("/profil")) return "PROFİL";
  if (pathname.startsWith("/notification-settings")) return "BİLDİRİMLER";
  if (pathname.startsWith("/admin")) return "ADMİN";
  if (pathname.startsWith("/market")) return "MARKET";
  if (pathname.startsWith("/lina")) return "LİNA";
  if (pathname.startsWith("/proje-satis-sablonu")) return "PROJE SATIŞ";

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

function getDisplayName(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
) {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user?.email?.split("@")[0] || "EPH Üyesi";
}

function getInitial(
  user?: {
    firstName?: string | null;
    email?: string | null;
  } | null,
) {
  return (user?.firstName?.[0] || user?.email?.[0] || "E").toLocaleUpperCase(
    "tr-TR",
  );
}

function roleLabel(role?: string | null) {
  const normalized = String(role || "").toLocaleUpperCase("tr-TR");

  if (normalized === "ADMIN") return "Admin";
  if (normalized === "SUPER_ADMIN") return "Yazılım Ekibi";
  if (normalized === "EMLAKCI") return "Emlakçı";

  if (
    ["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT"].includes(normalized)
  ) {
    return "Müteahhit";
  }

  if (
    ["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized)
  ) {
    return "İnşaat Firması";
  }

  return "EPH Üyesi";
}

function readConversations(payload: unknown): Conversation[] {
  if (Array.isArray(payload)) {
    return payload as Conversation[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { items?: unknown[] }).items)
  ) {
    return (payload as { items: Conversation[] }).items;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { conversations?: unknown[] }).conversations)
  ) {
    return (payload as { conversations: Conversation[] }).conversations;
  }

  return [];
}

function formatUnreadCount(value: number) {
  return value > 99 ? "99+" : String(value);
}

export function EPHMobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showLinaFab, setShowLinaFab] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const showShell = shouldShowShell(pathname);
  const showBottomNav = shouldShowBottomNav(pathname);
  const title = useMemo(() => getTitle(pathname), [pathname]);
  const unreadBadge = unreadMessages > 0
    ? formatUnreadCount(unreadMessages)
    : undefined;

  useEffect(() => {
    const setViewportVars = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const viewportWidth =
        window.visualViewport?.width || window.innerWidth;

      document.documentElement.style.setProperty(
        "--eph-vvh",
        `${viewportHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--eph-vvw",
        `${viewportWidth}px`,
      );
    };

    setViewportVars();

    window.addEventListener("resize", setViewportVars);
    window.visualViewport?.addEventListener("resize", setViewportVars);
    window.visualViewport?.addEventListener("scroll", setViewportVars);

    return () => {
      window.removeEventListener("resize", setViewportVars);
      window.visualViewport?.removeEventListener("resize", setViewportVars);
      window.visualViewport?.removeEventListener("scroll", setViewportVars);
    };
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/lina")) {
      setShowLinaFab(false);
      return;
    }

    setShowLinaFab(true);

    const timer = window.setTimeout(() => {
      setShowLinaFab(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("from") !== "profil") return;

    const handleProfileReturn = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest<HTMLElement>("a, button");

      if (!trigger) return;

      const ariaLabel = String(
        trigger.getAttribute("aria-label") || "",
      ).toLocaleLowerCase("tr-TR");

      const href =
        trigger instanceof HTMLAnchorElement
          ? String(trigger.getAttribute("href") || "")
          : "";

      const isReturnAction =
        ariaLabel.includes("geri") ||
        ariaLabel.includes("dön") ||
        href === "/giris" ||
        href === "/crm" ||
        href === "/uretkenlik";

      if (!isReturnAction) return;

      event.preventDefault();
      event.stopPropagation();
      router.replace("/profil");
    };

    document.addEventListener("click", handleProfileReturn, true);

    return () => {
      document.removeEventListener("click", handleProfileReturn, true);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!showShell || !user?.id) {
      setUnreadMessages(0);
      return;
    }

    let active = true;

    const fetchUnreadMessages = async () => {
      try {
        const response = await api.get(
          `/conversations?userId=${encodeURIComponent(String(user.id))}`,
        );

        const conversations = readConversations(response.data);
        const total = conversations.reduce((sum, conversation) => {
          const unread = Number(conversation.unreadCount || 0);
          return sum + (Number.isFinite(unread) ? unread : 0);
        }, 0);

        if (active) {
          setUnreadMessages(Math.max(0, total));
        }
      } catch {
        if (active) {
          setUnreadMessages(0);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadMessages();
      }
    };

    fetchUnreadMessages();

    const interval = window.setInterval(fetchUnreadMessages, 30000);

    window.addEventListener("focus", fetchUnreadMessages);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", fetchUnreadMessages);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [pathname, showShell, user?.id]);

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
    window.location.href = `mailto:mustafaertugkaya@gmail.com?subject=${encodeURIComponent(
      subject,
    )}`;
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
            aria-label={
              unreadMessages > 0
                ? `${unreadMessages} okunmamış mesaj`
                : "Mesajlar"
            }
            onClick={() => router.push("/messages")}
          >
            <Bell size={24} strokeWidth={2.35} />
            {unreadBadge && <span>{unreadBadge}</span>}
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
          className="eph-mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="eph-mobile-menu-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="eph-mobile-menu-hero">
              <div className="eph-mobile-menu-hero-circle one" />
              <div className="eph-mobile-menu-hero-circle two" />

              <div className="eph-mobile-menu-user-row">
                <div className="eph-mobile-menu-avatar">
                  {getInitial(user)}
                </div>

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

              <button
                type="button"
                onClick={() => go("/profil")}
                className="eph-mobile-menu-account"
              >
                <div>
                  <p>Hesap Merkezi</p>
                  <span>Profil ve üyelik bilgileri</span>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="eph-mobile-menu-scroll">
              <MenuSection title="Operasyon Merkezi">
                <MenuRow
                  icon={<Home size={17} />}
                  label="Anasayfa"
                  onClick={() => go("/dashboard")}
                />
                <MenuRow
                  icon={<UsersRound size={17} />}
                  label="CRM"
                  onClick={() => go("/crm")}
                />
                <MenuRow
                  icon={<Building2 size={17} />}
                  label="Portföy"
                  onClick={() => go("/portfoy")}
                />
                <MenuRow
                  icon={<MessageSquare size={17} />}
                  label="Forum"
                  onClick={() => go("/network")}
                />
                <MenuRow
                  icon={<Target size={17} />}
                  label="Havuz"
                  onClick={() => go("/havuz")}
                />
                <MenuRow
                  icon={<Bell size={17} />}
                  label="Mesajlar"
                  badge={unreadBadge}
                  onClick={() => go("/messages")}
                />
              </MenuSection>

              <MenuSection title="Lina">
                <MenuRow
                  icon={<Bot size={17} />}
                  label="Lina Asistan"
                  onClick={openLina}
                />
                <MenuRow
                  icon={<Sparkles size={17} />}
                  label="Lina Fırsatları"
                  onClick={() =>
                    comingSoon(
                      "Lina Fırsatları ekranını sıradaki adımda açacağız.",
                    )
                  }
                />
              </MenuSection>

              <MenuSection title="EPH">
                <MenuRow
                  icon={<ShoppingBag size={17} />}
                  label="Market"
                  onClick={() => go("/ucretlendirme")}
                />
                <MenuRow
                  icon={<FileSpreadsheet size={17} />}
                  label="Proje Satış Excel Şablonu"
                  onClick={() => go("/proje-satis-sablonu")}
                />
                <MenuRow
                  icon={<Star size={17} />}
                  label="Duyurular"
                  onClick={() =>
                    comingSoon("Duyurular bölümü yakında aktif olacak.")
                  }
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
                <MenuRow
                  icon={<User size={17} />}
                  label="Profil"
                  onClick={() => go("/profil")}
                />
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
                <MenuRow
                  danger
                  icon={<LogOut size={17} />}
                  label="Çıkış Yap"
                  onClick={handleLogout}
                />
              </MenuSection>
            </div>
          </aside>
        </div>
      )}

      <main
        className={
          showBottomNav
            ? "eph-mobile-content with-bottom-nav"
            : "eph-mobile-content"
        }
      >
        {children}
      </main>

      {!pathname.startsWith("/lina") && showLinaFab && (
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

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? "eph-mobile-menu-row danger"
          : "eph-mobile-menu-row"
      }
    >
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
        href="/portfoy"
        active={pathname.startsWith("/portfoy")}
        icon={<Building2 size={25} strokeWidth={2.35} />}
        label="Portföy"
      />
      <BottomItem
        href="/network"
        active={
          pathname.startsWith("/network") ||
          pathname.startsWith("/forum")
        }
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
      className={
        active
          ? "eph-mobile-nav-item active"
          : "eph-mobile-nav-item"
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
