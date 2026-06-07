"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Crown,
  Headphones,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | string;

type SafeUser = {
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  packageType?: string;
  plan?: string;
  membershipType?: string;
  referralCode?: string;
  referenceCode?: string;
  companyName?: string;
  officeName?: string;
  title?: string;
  memberCode?: string;
  trustScore?: number;
};

type PresenceStatus = "online" | "away" | "offline";

type PresenceUser = {
  id: string;
  status: PresenceStatus;
  lastPage?: string | null;
  minutesAgo?: number | null;
};

type PresenceResponse = {
  currentUser?: PresenceUser | null;
  online: PresenceUser[];
  away: PresenceUser[];
  offline: PresenceUser[];
};

const roleTheme = {
  SUPER_ADMIN: {
    label: "Yazılım Ekibi",
    color: "#14B8A6",
    bg: "#ECFEFF",
    badge: "Kurucu Erişimi",
  },
  ADMIN: {
    label: "Admin",
    color: "#334155",
    bg: "#F1F5F9",
    badge: "Yönetim Profili",
  },
  EMLAKCI: {
    label: "Gayrimenkul Danışmanı",
    color: "#1557D6",
    bg: "#EFF6FF",
    badge: "EPH Üyesi",
  },
  MUTEAHHIT: {
    label: "Müteahhit",
    color: "#EA580C",
    bg: "#FFF7ED",
    badge: "Proje Profili",
  },
  INSAAT_FIRMASI: {
    label: "İnşaat Firması",
    color: "#B45309",
    bg: "#FFFBEB",
    badge: "Kurumsal Profil",
  },
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getTheme(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return roleTheme.SUPER_ADMIN;
  if (normalizedRole === "ADMIN") return roleTheme.ADMIN;

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return roleTheme.MUTEAHHIT;
  }

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return roleTheme.INSAAT_FIRMASI;
  }

  return roleTheme.EMLAKCI;
}

function isSuperAdmin(role?: string | null) {
  return normalizeRole(role) === "SUPER_ADMIN";
}

function presenceLabel(status?: PresenceStatus) {
  if (status === "online") return "Online";
  if (status === "away") return "Uzakta";
  return "Çevrimdışı";
}

function presenceDotClass(status?: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-400";
  return "bg-slate-400";
}

function shortUserId(value?: string) {
  if (!value) return "EPH-0000";
  return `EPH-${value.slice(0, 4).toUpperCase()}`;
}

export default function ProfilPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [presence, setPresence] = useState<PresenceResponse>({
    currentUser: null,
    online: [],
    away: [],
    offline: [],
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    const fetchPresence = async () => {
      try {
        const res = await api.get("/visits/presence");

        setPresence({
          currentUser: res.data?.currentUser || null,
          online: Array.isArray(res.data?.online) ? res.data.online : [],
          away: Array.isArray(res.data?.away) ? res.data.away : [],
          offline: Array.isArray(res.data?.offline) ? res.data.offline : [],
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchPresence();

    const interval = setInterval(fetchPresence, 30000);

    return () => clearInterval(interval);
  }, [hydrated, user]);

  const safeUser = user as SafeUser | null;
  const userRole = normalizeRole(safeUser?.role || "EMLAKCI");
  const theme = getTheme(userRole);
  const superAdmin = isSuperAdmin(userRole);

  const displayName = useMemo(() => {
    const fullNameFromParts = `${safeUser?.firstName || ""} ${
      safeUser?.lastName || ""
    }`.trim();

    return (
      safeUser?.fullName ||
      safeUser?.name ||
      fullNameFromParts ||
      safeUser?.companyName ||
      safeUser?.officeName ||
      "EPH Kullanıcısı"
    );
  }, [safeUser]);

  const initials = useMemo(() => {
    return (
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "EPH"
    );
  }, [displayName]);

  const packageName =
    safeUser?.packageType ||
    safeUser?.plan ||
    safeUser?.membershipType ||
    (superAdmin ? "Kurucu Erişimi" : "Standart");

  const referralCode =
    safeUser?.referralCode || safeUser?.referenceCode || "Henüz tanımlı değil";

  const currentPresence =
    presence.currentUser ||
    [...presence.online, ...presence.away, ...presence.offline].find(
      (item) => item.id === safeUser?.id,
    ) ||
    null;

  const currentPresenceStatus = currentPresence?.status || "offline";
  const trustScore = safeUser?.trustScore ?? (superAdmin ? 100 : 82);

  if (!hydrated || !safeUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-24 text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Dashboard'a dön"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-base font-black">Profil</h1>
            <p className="text-[11px] font-bold text-[#64748B]">
              Hesap ve erişim merkezi
            </p>
          </div>

          <Link
            href="/notification-settings"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Bildirim ayarları"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#1557D6]" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-5">
        <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="relative mx-auto h-24 w-24">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-sm"
              style={{ backgroundColor: theme.color }}
            >
              {superAdmin ? <Crown size={42} /> : initials}
            </div>

            <span
              className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white ${presenceDotClass(
                currentPresenceStatus,
              )}`}
            />
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight">
            {displayName}
          </h2>

          <p className="mt-1 text-sm font-bold text-[#64748B]">
            {safeUser.email || "E-posta bilgisi yok"}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Pill text={theme.label} color={theme.color} bg={theme.bg} />
            <Pill text={packageName} color="#1557D6" bg="#EFF6FF" />
            <Pill
              text={presenceLabel(currentPresenceStatus)}
              color={
                currentPresenceStatus === "online"
                  ? "#059669"
                  : currentPresenceStatus === "away"
                    ? "#D97706"
                    : "#64748B"
              }
              bg={
                currentPresenceStatus === "online"
                  ? "#ECFDF5"
                  : currentPresenceStatus === "away"
                    ? "#FFFBEB"
                    : "#F8FAFC"
              }
            />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-3">
          <MiniStat label="Üye No" value={safeUser.memberCode || shortUserId(safeUser.id)} />
          <MiniStat label="Güven" value={`${trustScore}/100`} />
          <MiniStat label="Paket" value={packageName} />
        </section>

        <MenuGroup>
          <MenuItem
            href="/profil"
            icon={<UserRound size={18} />}
            title="Hesap Bilgileri"
            value={safeUser.phone || "Telefon eklenmedi"}
            color={theme.color}
          />
          <MenuItem
            href="/notification-settings"
            icon={<Bell size={18} />}
            title="Bildirim Ayarları"
            value="Ses ve uyarılar"
            color="#EA580C"
          />
          <MenuItem
            href="/market"
            icon={<WalletCards size={18} />}
            title="Üyelik ve Paket"
            value={packageName}
            color="#1557D6"
          />
          <MenuItem
            href="/lina"
            icon={<WandSparkles size={18} />}
            title="Lina Asistan"
            value="Akıllı iş desteği"
            color="#7C3AED"
          />
        </MenuGroup>

        <MenuGroup>
          <MenuItem
            href="/stok"
            icon={<Building2 size={18} />}
            title="Portföyüm"
            value="İlan ve stok yönetimi"
            color="#1557D6"
          />
          <MenuItem
            href="/crm"
            icon={<Users size={18} />}
            title="CRM"
            value="Müşteri ve görev takibi"
            color="#0F766E"
          />
          <MenuItem
            href="/messages"
            icon={<MessageCircle size={18} />}
            title="Mesajlar"
            value="Görüşme merkezi"
            color="#7C3AED"
          />
          <MenuItem
            href="/network"
            icon={<BriefcaseBusiness size={18} />}
            title="Forum / Havuz"
            value="Talep ve iş birliği"
            color="#EA580C"
          />
        </MenuGroup>

        <MenuGroup>
          <InfoLine
            icon={<Mail size={18} />}
            title="E-posta"
            value={safeUser.email || "Bilgi yok"}
            color={theme.color}
          />
          <InfoLine
            icon={<Phone size={18} />}
            title="Telefon"
            value={safeUser.phone || "Bilgi yok"}
            color={theme.color}
          />
          <InfoLine
            icon={<KeyRound size={18} />}
            title="Referans Kodu"
            value={referralCode}
            color={theme.color}
          />
          <InfoLine
            icon={<ShieldCheck size={18} />}
            title="Hesap Durumu"
            value={theme.badge}
            color="#0F766E"
          />
        </MenuGroup>

        {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
          <MenuGroup>
            <MenuItem
              href="/admin"
              icon={<Settings size={18} />}
              title="Yönetim Merkezi"
              value="Kullanıcı ve sistem yönetimi"
              color={superAdmin ? "#14B8A6" : "#334155"}
            />
            <MenuItem
              href="/admin/referrals"
              icon={<Sparkles size={18} />}
              title="Referans Kodları"
              value="Davet ve erişim yönetimi"
              color="#1557D6"
            />
          </MenuGroup>
        )}

        <MenuGroup>
          <MenuItem
            href="/help-center"
            icon={<Headphones size={18} />}
            title="Yardım Merkezi"
            value="Destek ve sık sorulanlar"
            color="#1557D6"
          />
          <button
            onClick={() => {
              logout();
              router.push("/giris");
            }}
            className="flex w-full items-center gap-3 rounded-3xl bg-red-50 px-4 py-4 text-left transition hover:bg-red-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
              <LogOut size={18} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-red-600">
                Güvenli Çıkış Yap
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-red-400">
                Oturumu kapat
              </span>
            </span>

            <ChevronRight size={18} className="text-red-300" />
          </button>
        </MenuGroup>
      </section>
    </main>
  );
}

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex min-h-8 items-center justify-center rounded-full px-3 text-xs font-black"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-[#06194A]">
        {value}
      </div>
    </div>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function MenuItem({
  href,
  icon,
  title,
  value,
  color,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>

      <ChevronRight size={18} className="text-[#94A3B8]" />
    </Link>
  );
}

function InfoLine({
  icon,
  title,
  value,
  color,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block break-words text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>
    </div>
  );
}