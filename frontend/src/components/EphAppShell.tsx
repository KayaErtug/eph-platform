"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare,
  CreditCard,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Store,
  UserCircle2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

type EphAppShellProps = {
  title: string;
  children: ReactNode;
};

type MenuItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const realtorMenuItems: MenuItem[] = [
  { label: "Ana Sayfa", href: "/dashboard", icon: Home },
  { label: "İlanlarım", href: "/stok", icon: Building2 },
  { label: "Müşterilerim", href: "/crm", icon: Users },
  { label: "Pazaryeri", href: "/network", icon: Store },
  { label: "Lina", href: "/lina", icon: Bot },
];

const contractorMenuItems: MenuItem[] = [
  { label: "Ana Sayfa", href: "/dashboard", icon: Home },
  { label: "Projelerim", href: "/stok", icon: Building2 },
  { label: "İş Ortaklarım", href: "/crm", icon: BriefcaseBusiness },
  { label: "Pazaryeri", href: "/network", icon: Store },
  { label: "Lina", href: "/lina", icon: Bot },
];

const constructionCompanyMenuItems: MenuItem[] = [
  { label: "Ana Sayfa", href: "/dashboard", icon: Home },
  { label: "Projeler", href: "/stok", icon: Building2 },
  { label: "Tahsilatlar", href: "/market", icon: WalletCards },
  { label: "Pazaryeri", href: "/network", icon: Store },
  { label: "Lina", href: "/lina", icon: Bot },
];

const baseDrawerItems: MenuItem[] = [
  { label: "Ajandam", href: "/crm", icon: CalendarDays },
  { label: "Görevlerim", href: "/crm", icon: CheckSquare },
  { label: "Mesajlar", href: "/messages", icon: MessageCircle },
  { label: "Bildirimler", href: "/notification-settings", icon: Bell },
  { label: "Profilim", href: "/profil", icon: UserCircle2 },
  { label: "Kontör Cüzdanım", href: "/kontor", icon: WalletCards },
  
  { label: "Üyeliğim", href: "/uyelik", icon: CreditCard },
  { label: "Ayarlar", href: "/notification-settings", icon: Settings },
  { label: "Yardım Merkezi", href: "/platform-anayasasi", icon: HelpCircle },
];

const constructionCompanyDrawerItems: MenuItem[] = [
  { label: "Satış Raporları", href: "/market", icon: WalletCards },
  ...baseDrawerItems,
];

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function isContractorRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  );
}

function isConstructionCompanyRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  );
}

function getRoleTheme(role?: string | null) {
  if (isConstructionCompanyRole(role)) {
    return {
      primary: "#C9A84C",
      soft: "#FFFBEB",
      border: "#FDE68A",
      text: "#0B1F44",
      label: "İnşaat Firması",
    };
  }

  if (isContractorRole(role)) {
    return {
      primary: "#EA580C",
      soft: "#FFF7ED",
      border: "#FED7AA",
      text: "#172033",
      label: "Müteahhit",
    };
  }

  return {
    primary: "#2563EB",
    soft: "#EFF6FF",
    border: "#BFDBFE",
    text: "#172033",
    label: "Emlakçı",
  };
}

function getRoleMenuItems(role?: string | null) {
  if (isConstructionCompanyRole(role)) {
    return constructionCompanyMenuItems;
  }

  if (isContractorRole(role)) {
    return contractorMenuItems;
  }

  return realtorMenuItems;
}

function getDrawerItems(role?: string | null) {
  if (isConstructionCompanyRole(role)) {
    return constructionCompanyDrawerItems;
  }

  return baseDrawerItems;
}

function getKontorBadgeStyle(balance: number) {
  if (balance <= 0) {
    return {
      borderColor: "#FECACA",
      backgroundColor: "#FEF2F2",
      color: "#DC2626",
    };
  }

  if (balance < 100) {
    return {
      borderColor: "#FDE68A",
      backgroundColor: "#FFFBEB",
      color: "#B45309",
    };
  }

  return {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
  };
}

function readKontorBalance(data: any) {
  const numeric = Number(data?.balance ?? data?.bakiye ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function EphAppShell({ title, children }: EphAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kontorBalance, setKontorBalance] = useState(0);

  const theme = getRoleTheme(user?.role);

  const menuItems = useMemo(() => {
    return getRoleMenuItems(user?.role);
  }, [user?.role]);

  const drawerItems = useMemo(() => {
    return getDrawerItems(user?.role);
  }, [user?.role]);

  useEffect(() => {
    let alive = true;

    async function loadKontorBalance() {
      if (!user?.id) {
        setKontorBalance(0);
        return;
      }

      try {
        const response = await api.get(`/units/pool/wallet?t=${Date.now()}`);
        if (alive) setKontorBalance(readKontorBalance(response.data));
      } catch {
        if (alive) setKontorBalance(0);
      }
    }

    loadKontorBalance();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const kontorBadgeStyle = getKontorBadgeStyle(kontorBalance);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    router.push("/giris");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-3 md:px-6 md:py-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 min-w-10 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] px-3 text-[#172033] transition hover:bg-white md:h-11 md:min-w-11"
            aria-label="Geri dön"
          >
            <ArrowLeft size={18} />
            <span className="ml-1 hidden text-xs font-black sm:inline">
              Geri
            </span>
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div
              className="mx-auto mb-1 hidden w-fit rounded-full border px-3 py-1 text-[11px] font-black md:block"
              style={{
                color: theme.primary,
                backgroundColor: theme.soft,
                borderColor: theme.border,
              }}
            >
              {theme.label} Paneli
            </div>

            <h1 className="truncate text-center text-base font-black text-[#172033] md:text-2xl">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <Link
              href="/kontor"
              className="hidden h-10 items-center gap-1.5 rounded-2xl border px-2.5 text-[11px] font-black shadow-sm transition hover:bg-white sm:flex md:h-11"
              style={kontorBadgeStyle}
              aria-label="Kontör cüzdanı"
            >
              <WalletCards size={17} />
              <span>{kontorBalance}</span>
              <span className="hidden md:inline">kontör</span>
            </Link>

            <Link
              href="/kontor"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition hover:bg-white sm:hidden"
              style={kontorBadgeStyle}
              aria-label="Kontör cüzdanı"
            >
              <span className="relative">
                <WalletCards size={18} />
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[8px] font-black">
                  {kontorBalance > 99 ? "99+" : kontorBalance}
                </span>
              </span>
            </Link>

            <Link
              href="/notification-settings"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033] transition hover:bg-white md:h-11 md:w-11"
              aria-label="Bildirimler"
            >
              <Bell size={18} />
            </Link>

            <Link
              href="/messages"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033] transition hover:bg-white md:h-11 md:w-11"
              aria-label="Mesajlar"
            >
              <MessageCircle size={18} />
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border text-white shadow-lg transition md:h-11 md:w-11"
              style={{
                borderColor: theme.primary,
                backgroundColor: theme.primary,
                boxShadow: `0 10px 24px ${theme.primary}33`,
              }}
              aria-label="Menüyü aç"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-[#EEF2F7] md:block">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-6 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-[140px] flex-col items-center justify-center gap-2 rounded-2xl px-5 py-4 text-center text-sm font-black transition ${
                    active
                      ? "text-white shadow-lg"
                      : "border border-[#DDE7F3] bg-white text-[#172033] hover:bg-[#F8FAFC]"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: theme.primary,
                          boxShadow: `0 12px 28px ${theme.primary}26`,
                        }
                      : undefined
                  }
                >
                  <Icon size={20} />
                  <span className="text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-5 pb-28 text-center md:px-6 md:py-7">
        <div className="w-full max-w-full">{children}</div>
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/45"
            onClick={() => setDrawerOpen(false)}
            aria-label="Menüyü kapat"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-6 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-black text-[#172033]">
                  {user?.firstName || user?.email || "EPH Kullanıcısı"}
                </p>
                <p
                  className="mt-1 w-fit rounded-full px-3 py-1 text-[11px] font-black"
                  style={{
                    color: theme.primary,
                    backgroundColor: theme.soft,
                  }}
                >
                  {theme.label}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033]"
                aria-label="Menüyü kapat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              {drawerItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-left text-sm font-black text-[#172033]"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{
                        color: theme.primary,
                        backgroundColor: theme.soft,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm font-black text-red-600"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-600">
                  <LogOut size={18} />
                </span>
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}