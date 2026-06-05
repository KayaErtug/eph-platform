"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Crown,
  Gauge,
  Headphones,
  Home,
  KeyRound,
  Layers3,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
  Zap,
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
  memberSince?: string;
  trustScore?: number;
  riskLevel?: string;
};

type PresenceStatus = "online" | "away" | "offline";

type PresenceUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  profileImageUrl?: string | null;
  status: PresenceStatus;
  lastSeenAt?: string | null;
  lastPage?: string | null;
  minutesAgo?: number | null;
};

type PresenceResponse = {
  currentUser?: PresenceUser | null;
  online: PresenceUser[];
  away: PresenceUser[];
  offline: PresenceUser[];
};

const roleContent = {
  SUPER_ADMIN: {
    className: "eph-role-super-admin",
    label: "Süper Admin",
    title: "EPH Platform Yönetim Merkezi",
    badge: "EPH Kurucu Profili",
    primaryText: "text-[#14B8A6]",
    softBg: "bg-[#F0FDFA]",
    iconBg: "bg-[#14B8A6] text-white",
    border: "border-[#99F6E4]",
    color: "#14B8A6",
    heroGradient: "from-[#0F172A] via-[#134E4A] to-[#14B8A6]",
  },
  ADMIN: {
    className: "eph-role-admin",
    label: "Admin",
    title: "Sistem yönetim panelin hazır.",
    badge: "Yönetim Profili",
    primaryText: "text-[#0F172A]",
    softBg: "bg-[#F8FAFC]",
    iconBg: "bg-[#E2E8F0] text-[#0F172A]",
    border: "border-[#CBD5E1]",
    color: "#0F172A",
    heroGradient: "from-[#0F172A] via-[#1E293B] to-[#334155]",
  },
  EMLAKCI: {
    className: "eph-role-emlakci",
    label: "Gayrimenkul Danışmanı",
    title: "Portföy ve müşteri takibin hazır.",
    badge: "Mavi / Turkuaz Profil",
    primaryText: "text-[#2563EB]",
    softBg: "bg-[#EFF6FF]",
    iconBg: "bg-[#DBEAFE] text-[#2563EB]",
    border: "border-[#BFDBFE]",
    color: "#2563EB",
    heroGradient: "from-[#1D4ED8] via-[#2563EB] to-[#38BDF8]",
  },
  MUTEAHHIT: {
    className: "eph-role-muteahhit",
    label: "Müteahhit",
    title: "Proje ve satış ağın hazır.",
    badge: "Turuncu / Lacivert Profil",
    primaryText: "text-[#F97316]",
    softBg: "bg-[#FFF7ED]",
    iconBg: "bg-[#FFEDD5] text-[#EA580C]",
    border: "border-[#FED7AA]",
    color: "#F97316",
    heroGradient: "from-[#9A3412] via-[#EA580C] to-[#FDBA74]",
  },
  INSAAT_FIRMASI: {
    className: "eph-role-insaat",
    label: "İnşaat Firması",
    title: "Proje, stok ve satış takibin hazır.",
    badge: "Kurumsal İnşaat Profili",
    primaryText: "text-[#B45309]",
    softBg: "bg-[#FFFBEB]",
    iconBg: "bg-[#FEF3C7] text-[#B45309]",
    border: "border-[#FDE68A]",
    color: "#B45309",
    heroGradient: "from-[#78350F] via-[#B45309] to-[#FBBF24]",
  },
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getTheme(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return roleContent.SUPER_ADMIN;
  if (normalizedRole === "ADMIN") return roleContent.ADMIN;

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return roleContent.MUTEAHHIT;
  }

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return roleContent.INSAAT_FIRMASI;
  }

  return roleContent.EMLAKCI;
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

function presenceBadgeClass(status?: PresenceStatus) {
  if (status === "online")
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "away") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function formatLastSeen(minutesAgo?: number | null) {
  if (minutesAgo === null || minutesAgo === undefined)
    return "Son görülme bilgisi yok";
  if (minutesAgo < 1) return "Az önce aktifti";
  if (minutesAgo < 60) return `Son görülme: ${minutesAgo} dk önce`;

  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `Son görülme: ${hours} saat önce`;

  const days = Math.floor(hours / 24);
  return `Son görülme: ${days} gün önce`;
}

function formatMemberSince(value?: string) {
  if (!value) return "Bilgi yok";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
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
    <main className={`eph-page ${theme.className} min-h-screen bg-[#F7FBFF] pb-24`}>
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Dashboard'a dön"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black text-[#06194A] sm:text-xl">
              Profil V3
            </h1>
            <p className="text-[11px] font-bold text-[#64748B] sm:text-xs">
              Kimlik, üyelik, erişim ve durum merkezi
            </p>
          </div>

          <button
            onClick={() => {
              logout();
              router.push("/giris");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 shadow-sm"
            aria-label="Çıkış yap"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {superAdmin && (
          <section
            className={`mb-4 overflow-hidden rounded-[28px] bg-gradient-to-br ${theme.heroGradient} p-5 text-center text-white shadow-xl md:p-7`}
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[11px] font-black backdrop-blur">
              <Crown size={15} />
              EPH Kurucu Alanı
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              Hoşgeldin Mustafa Abi
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/80">
              EPH Platform Yönetim Merkezi. Kullanıcı, portföy, network ve
              sistem durumunu tek ekrandan takip edebilirsin.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <FounderMiniCard
                icon={<ShieldCheck size={20} />}
                label="Rol"
                value="Süper Admin"
              />
              <FounderMiniCard
                icon={<Crown size={20} />}
                label="Yetki"
                value="Kurucu Erişimi"
              />
              <FounderMiniCard
                icon={<Sparkles size={20} />}
                label="Tema"
                value="Turkuaz Yönetim"
              />
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="eph-card overflow-hidden p-5 text-center md:p-6">
            <div
              className={`mx-auto inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-[11px] font-black shadow-sm ${theme.border} ${theme.primaryText}`}
            >
              <BadgeCheck size={14} />
              {theme.badge}
            </div>

            <div className="mt-5 flex flex-col items-center gap-4 md:flex-row md:text-left">
              <div className="relative shrink-0">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-[30px] text-3xl font-black shadow-sm ${theme.iconBg}`}
                >
                  {superAdmin ? <Crown size={42} /> : initials}
                </div>

                <span
                  className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white ${presenceDotClass(
                    currentPresenceStatus,
                  )}`}
                />
              </div>

              <div className="min-w-0 flex-1 text-center md:text-left">
                <h2 className="text-3xl font-black leading-tight text-[#06194A] md:text-4xl">
                  {displayName}
                </h2>

                <p className={`mt-2 text-sm font-black ${theme.primaryText}`}>
                  {superAdmin ? "Kurucu · Süper Admin" : theme.label}
                </p>

                <div
                  className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black md:mx-0 ${presenceBadgeClass(
                    currentPresenceStatus,
                  )}`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${presenceDotClass(
                      currentPresenceStatus,
                    )}`}
                  />
                  {presenceLabel(currentPresenceStatus)}
                </div>

                <p className="mt-2 text-xs font-bold text-[#64748B]">
                  {formatLastSeen(currentPresence?.minutesAgo)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SmallStat
                icon={<CheckCircle2 size={18} />}
                label="Durum"
                value={presenceLabel(currentPresenceStatus)}
                color={theme.color}
              />
              <SmallStat
                icon={<Crown size={18} />}
                label="Üyelik"
                value={packageName}
                color={theme.color}
              />
              <SmallStat
                icon={<ShieldCheck size={18} />}
                label="Güven"
                value={`${trustScore}/100`}
                color={theme.color}
              />
            </div>
          </section>

          <section className="eph-card p-5 text-center md:p-6">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: superAdmin ? "#F0FDFA" : "#EFF6FF",
                color: theme.color,
              }}
            >
              <ClipboardList size={22} />
            </div>

            <h3 className="mt-3 text-2xl font-black text-[#06194A]">
              EPH Kimlik Kartı
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              Üyelik, rol, referans ve platform kimliği tek kartta.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Üye No" value={safeUser.memberCode || shortUserId(safeUser.id)} />
              <DetailRow label="Rol" value={superAdmin ? "Süper Admin" : theme.label} />
              <DetailRow label="Paket" value={packageName} />
              <DetailRow label="Katılım" value={formatMemberSince(safeUser.memberSince)} />
              <DetailRow label="Güven Skoru" value={`${trustScore}/100`} />
              <DetailRow label="Referans" value={referralCode} />
            </div>
          </section>
        </div>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<Building2 size={20} />}
            label="Aktif İlan"
            value={superAdmin ? "Tüm platform" : "Hazır"}
            desc="Portföy ekranı"
            color={theme.color}
          />
          <MetricCard
            icon={<Layers3 size={20} />}
            label="Pasif İlan"
            value="Kontrol"
            desc="Arşiv ve taslak"
            color="#64748B"
          />
          <MetricCard
            icon={<Users size={20} />}
            label="CRM"
            value="Açık"
            desc="Müşteri takibi"
            color="#0F766E"
          />
          <MetricCard
            icon={<MessageCircle size={20} />}
            label="Mesajlar"
            value="Aktif"
            desc="Görüşmeler"
            color="#7C3AED"
          />
          <MetricCard
            icon={<BriefcaseBusiness size={20} />}
            label="Network"
            value="Canlı"
            desc="Talep akışı"
            color="#EA580C"
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="eph-card p-5 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#EFF6FF", color: theme.color }}
            >
              <Rocket size={22} />
            </div>

            <h3 className="mt-3 text-2xl font-black text-[#06194A]">
              Hızlı İşlemler
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              En çok kullanılan bölümlere tek dokunuşla geç.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <QuickAction href="/stok" icon={<Building2 size={18} />} title="Portföyüm" />
              <QuickAction href="/crm" icon={<Users size={18} />} title="CRM" />
              <QuickAction href="/messages" icon={<MessageCircle size={18} />} title="Mesajlar" />
              <QuickAction href="/network" icon={<BriefcaseBusiness size={18} />} title="Network" />
              <QuickAction href="/lina" icon={<WandSparkles size={18} />} title="Lina" />
              <QuickAction href="/market" icon={<WalletCards size={18} />} title="Market" />
            </div>
          </div>

          <div className="eph-card p-5 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#ECFDF5", color: "#0F766E" }}
            >
              <Gauge size={22} />
            </div>

            <h3 className="mt-3 text-2xl font-black text-[#06194A]">
              EPH Durum Merkezi
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              Oturum, bildirim, paket ve hesap doğrulama durumu.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatusRow
                icon={<Zap size={18} />}
                label="Anlık Durum"
                value={presenceLabel(currentPresenceStatus)}
                color={
                  currentPresenceStatus === "online"
                    ? "#10B981"
                    : currentPresenceStatus === "away"
                      ? "#F59E0B"
                      : "#64748B"
                }
              />
              <StatusRow
                icon={<Home size={18} />}
                label="Son Sayfa"
                value={currentPresence?.lastPage || "Bilgi yok"}
                color={theme.color}
              />
              <StatusRow
                icon={<Bell size={18} />}
                label="Bildirim"
                value="Ayarlar hazır"
                color="#EA580C"
              />
              <StatusRow
                icon={<ShieldCheck size={18} />}
                label="Doğrulama"
                value={trustScore >= 80 ? "Güvenli" : "Kontrol gerekli"}
                color="#0F766E"
              />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="eph-card p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
              <WandSparkles size={22} />
            </div>

            <h3 className="mt-3 text-2xl font-black text-[#06194A]">
              Lina bugün senin için ne yapabilir?
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              Portföy üretimi, açıklama yazımı, müşteri yorumu ve fiyat önerisi
              için Lina’ya hızlıca geçebilirsin.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <LinaAction title="Portföy oluştur" desc="Yeni ilan metni" />
              <LinaAction title="Açıklama yaz" desc="Profesyonel açıklama" />
              <LinaAction title="Müşteri analizi" desc="Talep yorumlama" />
              <LinaAction title="Fiyat önerisi" desc="Pazar odaklı fikir" />
            </div>

            <Link
              href="/lina"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0F49BD]"
            >
              <Sparkles size={17} />
              Lina Asistan’a Git
            </Link>
          </div>

          <div className="grid gap-3">
            <InfoCard
              icon={<Mail size={20} />}
              label="E-posta"
              value={safeUser.email || "E-posta bilgisi yok"}
              color={theme.color}
            />

            <InfoCard
              icon={<Phone size={20} />}
              label="Telefon"
              value={safeUser.phone || "Telefon bilgisi yok"}
              color={theme.color}
            />

            <InfoCard
              icon={<Building2 size={20} />}
              label="Firma / Ofis"
              value={
                superAdmin
                  ? "EPH Platform"
                  : safeUser.companyName ||
                    safeUser.officeName ||
                    "Firma bilgisi yok"
              }
              color={theme.color}
            />

            <InfoCard
              icon={<KeyRound size={20} />}
              label="Referans Kodu"
              value={referralCode}
              color={theme.color}
            />
          </div>
        </section>

        {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
          <section className="mt-4 eph-card p-5 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: superAdmin ? "#F0FDFA" : "#F5F3FF",
                color: superAdmin ? "#14B8A6" : "#7C3AED",
              }}
            >
              <Settings size={22} />
            </div>

            <h3 className="mt-3 text-2xl font-black text-[#06194A]">
              {superAdmin ? "Süper Admin Hızlı Erişim" : "Admin Hızlı Erişim"}
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              Kullanıcı yönetimi, referans kodları ve sistem kontrolleri için
              yönetim modüllerine hızlıca geçebilirsin.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/admin" className="eph-btn-primary">
                Yönetim Merkezi
              </Link>

              <Link href="/admin/referrals" className="eph-btn-soft">
                Referans Kodları
              </Link>
            </div>
          </section>
        )}

        <section className="mt-4 eph-card p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
            <Bell size={22} />
          </div>

          <h3 className="mt-3 text-2xl font-black text-[#06194A]">
            Bildirim ve Güvenlik
          </h3>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            Bildirim sesi, hesap güvenliği ve oturum işlemlerini buradan takip
            edebilirsin.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/notification-settings" className="eph-btn-soft">
              Bildirim Ayarları
            </Link>

            <button
              onClick={() => {
                logout();
                router.push("/giris");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-600"
            >
              <LogOut size={17} />
              Güvenli Çıkış Yap
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function FounderMiniCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
        {icon}
      </div>

      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
  color = "#2563EB",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-center">
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-1 truncate text-base font-black text-[#06194A]">
        {value}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  desc,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="eph-card p-4 text-center">
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC]"
        style={{ color }}
      >
        {icon}
      </div>

      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-[#06194A]">{value}</div>

      <p className="mt-1 text-xs font-semibold text-[#64748B]">{desc}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1557D6] shadow-sm">
        {icon}
      </div>

      <div className="mt-3 text-sm font-black text-[#06194A]">{title}</div>
    </Link>
  );
}

function StatusRow({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-left">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#94A3B8]">
          {label}
        </div>

        <div className="mt-1 truncate text-sm font-black text-[#06194A]">
          {value}
        </div>
      </div>
    </div>
  );
}

function LinaAction({ title, desc }: { title: string; desc: string }) {
  return (
    <Link
      href="/lina"
      className="rounded-3xl border border-[#E9D5FF] bg-[#FAF5FF] p-4 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#7C3AED] shadow-sm">
        <Star size={17} />
      </div>

      <div className="mt-3 text-sm font-black text-[#06194A]">{title}</div>
      <div className="mt-1 text-xs font-semibold text-[#64748B]">{desc}</div>
    </Link>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color = "#2563EB",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="eph-card flex flex-col items-center gap-3 p-4 text-center sm:flex-row sm:text-left">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF]"
        style={{ color }}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
          {label}
        </div>

        <div className="mt-1 break-words text-sm font-black text-[#06194A]">
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-center">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-black text-[#06194A]">
        {value}
      </div>
    </div>
  );
}