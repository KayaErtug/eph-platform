"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Menu, X } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import StokCreateModal from "@/components/stok/StokCreateModal";
import type {
  Project,
  ProjectFormState,
  Unit,
  UnitFormState,
} from "@/components/stok/stokTypes";

type ViewMode = "cards" | "list";

type RoleType =
  | "realtor"
  | "contractor"
  | "construction"
  | "admin"
  | "superadmin";

type ToneType = "blue" | "orange" | "green" | "purple" | "slate";

type VerifyPayload = {
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  isOffMarket?: boolean;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "SATILIK", label: "Satılık" },
  { value: "KIRALIK", label: "Kiralık" },
  { value: "ON_SATIS", label: "Ön Satış" },
  { value: "PROJE_ASAMASI", label: "Proje" },
  { value: "YAKINDA_SATISTA", label: "Yakında" },
  { value: "INSAAT_HALINDE", label: "İnşaat" },
  { value: "HEMEN_TESLIM", label: "Teslim" },
  { value: "SATILDI", label: "Satıldı" },
  { value: "PASIF", label: "Pasif" },
];

const QUICK_ACTIONS = [
  {
    label: "Yeni Portföy",
    desc: "Stok kaydı oluştur",
    action: "add",
    accent: "#1557D6",
  },
  {
    label: "Lina Yardımı",
    desc: "Metin ve analiz desteği",
    action: "lina",
    accent: "#7C3AED",
  },
  {
    label: "Network",
    desc: "Talep ve fırsatlar",
    href: "/network",
    accent: "#EA580C",
  },
  {
    label: "CRM",
    desc: "Müşteri takibi",
    href: "/crm",
    accent: "#16A34A",
  },
  {
    label: "Dashboard",
    desc: "Kontrol merkezi",
    href: "/dashboard",
    accent: "#0F172A",
  },
];

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getRoleType(role?: string | null): RoleType {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "superadmin";
  if (normalizedRole === "ADMIN") return "admin";

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return "construction";
  }

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return "contractor";
  }

  return "realtor";
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Süper Admin";
  if (normalizedRole === "ADMIN") return "Admin";
  if (normalizedRole === "MUTEAHHIT") return "Müteahhit";
  if (normalizedRole === "MÜTEAHHİT") return "Müteahhit";
  if (normalizedRole === "MÜTAHHİT") return "Müteahhit";
  if (normalizedRole === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (normalizedRole === "İNŞAAT_FİRMASI") return "İnşaat Firması";

  return "Gayrimenkul Danışmanı";
}

function getTone(roleType: RoleType): ToneType {
  if (roleType === "contractor") return "orange";
  if (roleType === "construction") return "green";
  if (roleType === "admin") return "purple";
  if (roleType === "superadmin") return "slate";

  return "blue";
}

function toneColors(tone: ToneType) {
  const map = {
    blue: {
      main: "#1557D6",
      hover: "#0F49BD",
      soft: "#EFF6FF",
      border: "#DDE7F3",
      shadow: "rgba(21,87,214,0.24)",
    },
    orange: {
      main: "#EA580C",
      hover: "#C2410C",
      soft: "#FFF7ED",
      border: "#FED7AA",
      shadow: "rgba(234,88,12,0.20)",
    },
    green: {
      main: "#16A34A",
      hover: "#15803D",
      soft: "#F0FDF4",
      border: "#BBF7D0",
      shadow: "rgba(22,163,74,0.18)",
    },
    purple: {
      main: "#7C3AED",
      hover: "#6D28D9",
      soft: "#F5F3FF",
      border: "#DDD6FE",
      shadow: "rgba(124,58,237,0.20)",
    },
    slate: {
      main: "#0F172A",
      hover: "#020617",
      soft: "#F1F5F9",
      border: "#DDE7F3",
      shadow: "rgba(15,23,42,0.20)",
    },
  };

  return map[tone];
}

function formatPrice(value?: number | string | null) {
  const price = Number(value || 0);

  if (!price) return "Fiyat yok";

  return `${price.toLocaleString("tr-TR")} TL`;
}

function formatStatus(value?: string | null) {
  const status = String(value || "").trim();

  const map: Record<string, string> = {
    SATILIK: "Satılık",
    KIRALIK: "Kiralık",
    ON_SATIS: "Ön Satış",
    PROJE_ASAMASI: "Proje Aşaması",
    YAKINDA_SATISTA: "Yakında Satışta",
    INSAAT_HALINDE: "İnşaat Halinde",
    HEMEN_TESLIM: "Hemen Teslim",
    INSAAT_PROJESI: "İnşaat Projesi",
    SATILDI: "Satıldı",
    PASIF: "Pasif",
  };

  return map[status] || status || "Durum Yok";
}

function unitLocation(unit: Unit) {
  return [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ");
}

function unitTitle(unit: Unit) {
  return unit.project?.name || "EPH Portföy";
}

function isUnitVerified(unit: Unit) {
  return Boolean(
    unit.isVerified ||
      (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
  );
}

function countByStatus(units: Unit[], status: string) {
  return units.filter((unit) => unit.status === status).length;
}

function Shell({
  title,
  role,
  tone,
  children,
  onLogout,
}: {
  title: string;
  role: string;
  tone: ToneType;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const colors = toneColors(tone);

  const links = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "İlanlarım", href: "/stok" },
    { label: "CRM", href: "/crm" },
    { label: "Network", href: "/network" },
    { label: "Mesajlar", href: "/messages" },
    { label: "Profil", href: "/profil" },
  ];

  useEffect(() => {
    if (!menuOpen) return;

    const scrollY = window.scrollY;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  return (
    <main className="min-h-screen bg-[#F7FBFF] text-[#06194A]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[76px_1fr_76px] items-center gap-2 px-4 py-4 md:grid-cols-[150px_1fr_150px] md:px-6 lg:px-8">
          <div className="flex justify-start">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] md:h-[70px] md:w-[70px]"
              aria-label="Dashboard'a dön"
            >
              <ArrowLeft size={23} strokeWidth={2.6} />
              <span className="mt-1 text-[10px] font-black">GERİ</span>
            </button>
          </div>

          <div className="min-w-0 text-center">
            <div
              className="mx-auto inline-flex max-w-full rounded-full border px-3 py-1 text-[10px] font-black md:text-[11px]"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.soft,
                color: colors.main,
              }}
            >
              {role}
            </div>

            <h1 className="mt-2 truncate text-[24px] font-black leading-none tracking-[-0.04em] text-[#06194A] md:text-[40px]">
              {title}
            </h1>

            <p className="mt-1 truncate text-[12px] font-bold text-[#1557D6] md:text-[17px]">
              EPH Platform İş Merkezi
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/notification-settings"
              className="relative hidden h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] sm:flex md:h-[70px] md:w-[70px]"
              aria-label="Bildirim ayarları"
            >
              <Bell size={23} />
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] md:h-[70px] md:w-[70px]"
              aria-label="Menüyü aç"
            >
              <Menu size={24} strokeWidth={2.7} />
              <span className="mt-1 text-[10px] font-black">MENÜ</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-6 lg:px-8">
        {children}
      </section>

      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/65 px-4 pt-8 backdrop-blur-sm">
          <aside className="flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[36px] border border-[#DDE7F3] bg-white shadow-2xl">
            <div className="relative shrink-0 px-6 pb-5 pt-6 text-center">
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#DDE7F3]" />

              <button
                onClick={() => setMenuOpen(false)}
                className="absolute right-5 top-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#06194A] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                aria-label="Menüyü kapat"
              >
                <X size={24} />
              </button>

              <h2 className="text-[34px] font-black leading-none tracking-[-0.04em] text-[#06194A]">
                EPH Menü
              </h2>

              <p className="mx-auto mt-3 max-w-[320px] text-[15px] font-bold leading-7 text-[#64748B]">
                Tüm bölümlere simetrik ve hızlı geçiş.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-1">
              <div className="grid gap-3">
                {links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-[74px] w-full items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-white px-5 text-center text-[20px] font-black text-[#06194A] shadow-[0_10px_26px_rgba(15,23,42,0.06)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="mt-6 flex h-[62px] w-full items-center justify-center rounded-2xl bg-[#1557D6] text-[19px] font-black text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)]"
              >
                Çıkış Yap
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function SectionCard({
  title,
  desc,
  accent = "#1557D6",
  children,
}: {
  title: string;
  desc: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="mx-auto h-2 w-full" style={{ backgroundColor: accent }} />

      <div className="p-5 md:p-6">
        <h2 className="text-[26px] font-black leading-tight tracking-[-0.035em] text-[#06194A] md:text-[34px]">
          {title}
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-[14px] font-semibold leading-7 text-[#475569] md:text-[16px]">
          {desc}
        </p>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function Hero({
  role,
  totalUnits,
  activeUnits,
  soldUnits,
  verifiedUnits,
  tone,
}: {
  role: string;
  totalUnits: number;
  activeUnits: number;
  soldUnits: number;
  verifiedUnits: number;
  tone: ToneType;
}) {
  const colors = toneColors(tone);

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_22px_60px_rgba(15,23,42,0.10)] md:p-8">
      <div className="absolute inset-x-0 top-0 h-3" style={{ background: `linear-gradient(90deg, ${colors.main}, #DBEAFE, ${colors.main})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(247,251,255,0.96),rgba(255,255,255,0.98)),radial-gradient(circle_at_top,rgba(219,234,254,0.85),transparent_34%)]" />

      <div className="relative">
        <div
          className="mx-auto inline-flex rounded-full border px-4 py-2 text-xs font-black"
          style={{
            color: colors.main,
            backgroundColor: colors.soft,
            borderColor: colors.border,
          }}
        >
          {role}
        </div>

        <h2 className="mx-auto mt-5 max-w-4xl text-[38px] font-black leading-[1.02] tracking-[-0.05em] text-[#06194A] md:text-[64px]">
          İlanlarım
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-[#27364F] md:text-lg">
          Portföy, proje ve ilan akışını mobil öncelikli premium stok panelinden yönetin.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroMini value={totalUnits} label="Toplam İlan" />
          <HeroMini value={activeUnits} label="Aktif İlan" />
          <HeroMini value={soldUnits} label="Kapanan" />
          <HeroMini value={verifiedUnits} label="Doğrulanmış" />
        </div>
      </div>
    </section>
  );
}

function HeroMini({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="text-3xl font-black text-[#06194A]">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </div>
    </div>
  );
}

function KpiGrid({
  units,
  projects,
}: {
  units: Unit[];
  projects: Project[];
}) {
  const activeCount = units.filter((unit) =>
    ["SATILIK", "KIRALIK", "ON_SATIS", "PROJE_ASAMASI", "YAKINDA_SATISTA", "INSAAT_HALINDE", "HEMEN_TESLIM", "INSAAT_PROJESI"].includes(
      unit.status || "",
    ),
  ).length;

  const items = [
    {
      label: "Toplam Portföy",
      value: units.length,
      desc: "Kayıtlı bağımsız bölüm",
      accent: "#1557D6",
    },
    {
      label: "Aktif Stok",
      value: activeCount,
      desc: "Satış veya kiralama açık",
      accent: "#16A34A",
    },
    {
      label: "Projeler",
      value: projects.length,
      desc: "Bağlı proje kayıtları",
      accent: "#EA580C",
    },
    {
      label: "Doğrulanan",
      value: units.filter(isUnitVerified).length,
      desc: "Güven kontrolü tamam",
      accent: "#7C3AED",
    },
  ];

  return (
    <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-h-[210px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-white text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
        >
          <div className="h-2 w-full" style={{ backgroundColor: item.accent }} />

          <div className="flex flex-1 flex-col items-center justify-center p-5">
            <p className="text-[12px] font-black uppercase tracking-[0.15em] text-[#64748B]">
              {item.label}
            </p>

            <p className="mt-3 text-[44px] font-black leading-none tracking-[-0.04em] text-[#06194A]">
              {item.value}
            </p>

            <p className="mt-3 flex min-h-[44px] items-center justify-center text-sm font-semibold leading-6 text-[#475569]">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

function QuickActions({
  canAddUnit,
  onAdd,
  onLina,
}: {
  canAddUnit: boolean;
  onAdd: () => void;
  onLina: () => void;
}) {
  const handleAction = (action?: string) => {
    if (action === "add") {
      if (canAddUnit) onAdd();
      return;
    }

    if (action === "lina") {
      onLina();
    }
  };

  return (
    <SectionCard
      title="Hızlı İşlemler"
      desc="İlan yönetiminde en çok kullanılan işlemler simetrik kart düzeninde."
      accent="#1557D6"
    >
      <div className="scrollbar-hide -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex w-max gap-3">
          {QUICK_ACTIONS.map((item) => {
            const content = (
              <div className="flex h-[154px] w-[154px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
                <div
                  className="h-2 w-full shrink-0"
                  style={{ backgroundColor: item.accent }}
                />

                <div className="flex flex-1 flex-col items-center justify-center px-4">
                  <p className="flex min-h-[42px] items-center justify-center text-[15px] font-black leading-5 text-[#06194A]">
                    {item.label}
                  </p>

                  <p className="mt-2 flex min-h-[38px] items-center justify-center text-[11px] font-bold leading-5 text-[#64748B]">
                    {item.desc}
                  </p>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleAction(item.action)}
                disabled={item.action === "add" && !canAddUnit}
                className="disabled:opacity-50"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function FilterCenter({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  viewMode,
  setViewMode,
  visibleCount,
  totalCount,
}: {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  cityFilter: string;
  setCityFilter: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  visibleCount: number;
  totalCount: number;
}) {
  return (
    <SectionCard
      title="Filtre Merkezi"
      desc={`${visibleCount} / ${totalCount} kayıt gösteriliyor. Arama, şehir ve durum filtreleri aktiftir.`}
      accent="#EA580C"
    >
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Proje, şehir, mahalle, numara veya durum ara"
            className="h-[58px] w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-center text-sm font-bold text-[#06194A] outline-none placeholder:text-[#64748B] focus:border-[#1557D6] focus:bg-white"
          />

          <input
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            placeholder="Şehir filtrele"
            className="h-[58px] w-full rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-center text-sm font-bold text-[#06194A] outline-none placeholder:text-[#64748B] focus:border-[#1557D6] focus:bg-white"
          />
        </div>

        <div className="scrollbar-hide -mx-5 overflow-x-auto px-5 pb-1">
          <div className="flex w-max gap-2">
            {STATUS_OPTIONS.map((item) => (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => setStatusFilter(item.value)}
                className={`h-[52px] w-[118px] shrink-0 rounded-2xl border text-center text-[12px] font-black transition ${
                  statusFilter === item.value
                    ? "border-[#1557D6] bg-[#1557D6] text-white shadow-[0_14px_30px_rgba(21,87,214,0.24)]"
                    : "border-[#DDE7F3] bg-white text-[#27364F]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`h-[56px] rounded-2xl border text-center text-sm font-black ${
              viewMode === "cards"
                ? "border-[#1557D6] bg-[#1557D6] text-white"
                : "border-[#DDE7F3] bg-white text-[#27364F]"
            }`}
          >
            Kart Görünümü
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`h-[56px] rounded-2xl border text-center text-sm font-black ${
              viewMode === "list"
                ? "border-[#1557D6] bg-[#1557D6] text-white"
                : "border-[#DDE7F3] bg-white text-[#27364F]"
            }`}
          >
            Liste Görünümü
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function UnitCards({
  units,
  isAdmin,
  onVerify,
}: {
  units: Unit[];
  isAdmin: boolean;
  onVerify: (unitId: string, payload: VerifyPayload) => void;
}) {
  if (units.length === 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-8 text-center">
        <p className="mx-auto max-w-[320px] text-sm font-bold leading-7 text-[#64748B]">
          Filtrelere uygun portföy kaydı bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr gap-4 lg:grid-cols-2">
      {units.map((unit) => (
        <UnitCard
          key={unit.id}
          unit={unit}
          isAdmin={isAdmin}
          onVerify={onVerify}
        />
      ))}
    </div>
  );
}

function UnitCard({
  unit,
  isAdmin,
  onVerify,
}: {
  unit: Unit;
  isAdmin: boolean;
  onVerify: (unitId: string, payload: VerifyPayload) => void;
}) {
  const verified = isUnitVerified(unit);
  const location = unitLocation(unit);

  return (
    <article className="flex min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-white text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]">
      <Link href={`/stok/${unit.id}`} className="flex flex-1 flex-col text-inherit no-underline">
        <div
          className="h-2 w-full shrink-0"
          style={{
            backgroundColor: verified ? "#16A34A" : "#EA580C",
          }}
        />

        <div className="flex flex-1 flex-col items-center justify-between p-5">
          <div className="w-full">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-black text-[#1557D6]">
                {formatStatus(unit.status)}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-black ${
                  verified
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {verified ? "Doğrulanmış" : "Kontrol Bekliyor"}
              </span>

              {unit.isOffMarket && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700">
                  Off-Market
                </span>
              )}
            </div>

            <h3 className="mx-auto mt-5 flex min-h-[58px] max-w-[420px] items-center justify-center text-[22px] font-black leading-tight tracking-[-0.035em] text-[#06194A]">
              <span className="line-clamp-2">{unitTitle(unit)}</span>
            </h3>

            <p className="mx-auto mt-3 flex min-h-[24px] max-w-[380px] items-center justify-center text-sm font-bold text-[#64748B]">
              <span className="line-clamp-1">
                {location || "Konum bilgisi yok"} {unit.number ? `· No ${unit.number}` : ""}
              </span>
            </p>

            <p className="mt-4 text-[28px] font-black leading-none tracking-[-0.035em] text-[#1557D6]">
              {formatPrice(unit.price)}
            </p>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            <UnitMini label="Tip" value={unit.type || "—"} />
            <UnitMini label="Oda" value={unit.roomCount || "—"} />
            <UnitMini label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
            <UnitMini
              label="Kat"
              value={unit.floor != null ? String(unit.floor) : "—"}
            />
          </div>

          <div className="mt-5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#1557D6] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]">
            İlan Detayına Git
          </div>
        </div>
      </Link>

      {isAdmin && (
        <div className="border-t border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#64748B]">
            Admin Doğrulama
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <VerifyButton
              active={Boolean(unit.tapuVerified)}
              label={unit.tapuVerified ? "Tapu Onaylı" : "Tapu Onayla"}
              onClick={() =>
                onVerify(unit.id, {
                  tapuVerified: !unit.tapuVerified,
                  photoVerified: unit.photoVerified,
                  yetkiVerified: unit.yetkiVerified,
                  isOffMarket: unit.isOffMarket,
                })
              }
            />

            <VerifyButton
              active={Boolean(unit.photoVerified)}
              label={
                unit.photoVerified ? "Fotoğraf Onaylı" : "Fotoğraf Onayla"
              }
              onClick={() =>
                onVerify(unit.id, {
                  tapuVerified: unit.tapuVerified,
                  photoVerified: !unit.photoVerified,
                  yetkiVerified: unit.yetkiVerified,
                  isOffMarket: unit.isOffMarket,
                })
              }
            />

            <VerifyButton
              active={Boolean(unit.yetkiVerified)}
              label={unit.yetkiVerified ? "Yetki Onaylı" : "Yetki Onayla"}
              onClick={() =>
                onVerify(unit.id, {
                  tapuVerified: unit.tapuVerified,
                  photoVerified: unit.photoVerified,
                  yetkiVerified: !unit.yetkiVerified,
                  isOffMarket: unit.isOffMarket,
                })
              }
            />

            <VerifyButton
              active={verified}
              label="Tümünü Doğrula"
              onClick={() =>
                onVerify(unit.id, {
                  tapuVerified: true,
                  photoVerified: true,
                  yetkiVerified: true,
                  isOffMarket: unit.isOffMarket,
                })
              }
            />
          </div>
        </div>
      )}
    </article>
  );
}

function UnitMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[74px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F7FBFF] p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </p>

      <p className="mt-1 line-clamp-1 text-sm font-black text-[#06194A]">
        {value}
      </p>
    </div>
  );
}

function VerifyButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[48px] rounded-2xl border px-3 text-center text-[12px] font-black transition ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[#DDE7F3] bg-white text-[#27364F] hover:border-[#1557D6]"
      }`}
    >
      {label}
    </button>
  );
}


function CompactList({
  units,
}: {
  units: Unit[];
}) {
  if (units.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-8 text-center">
        <p className="mx-auto max-w-[320px] text-sm font-bold leading-7 text-[#64748B]">
          Liste görünümünde gösterilecek kayıt bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {units.map((unit) => {
        const verified = isUnitVerified(unit);
        const location = unitLocation(unit);

        return (
          <Link
            key={unit.id}
            href={`/stok/${unit.id}`}
            className="grid min-h-[142px] grid-cols-[8px_1fr] overflow-hidden rounded-[26px] border border-[#DDE7F3] bg-white text-inherit shadow-[0_12px_30px_rgba(15,23,42,0.07)] no-underline transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)]"
          >
            <span
              className="h-full w-full"
              style={{ backgroundColor: verified ? "#16A34A" : "#EA580C" }}
            />

            <div className="grid gap-3 p-4 text-center md:grid-cols-[1.1fr_0.8fr_0.8fr_0.7fr] md:items-center">
              <div className="flex min-h-[70px] flex-col items-center justify-center">
                <p className="line-clamp-2 text-[18px] font-black leading-tight text-[#06194A]">
                  {unitTitle(unit)}
                </p>

                <p className="mt-2 line-clamp-1 text-xs font-bold text-[#64748B]">
                  {location || "Konum yok"} {unit.number ? `· No ${unit.number}` : ""}
                </p>
              </div>

              <div className="flex min-h-[70px] flex-col items-center justify-center rounded-2xl bg-[#F7FBFF] px-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">
                  Fiyat
                </p>
                <p className="mt-1 line-clamp-1 text-[15px] font-black text-[#1557D6]">
                  {formatPrice(unit.price)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <UnitMini label="Oda" value={unit.roomCount || "—"} />
                <UnitMini label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
              </div>

              <div className="flex min-h-[70px] flex-col items-center justify-center gap-2">
                <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-black text-[#1557D6]">
                  {formatStatus(unit.status)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    verified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {verified ? "Onaylı" : "Kontrol"}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function PremiumInsight({
  units,
}: {
  units: Unit[];
}) {
  const saleCount = countByStatus(units, "SATILIK");
  const rentCount = countByStatus(units, "KIRALIK");
  const projectCount = units.filter((unit) =>
    ["ON_SATIS", "PROJE_ASAMASI", "YAKINDA_SATISTA", "INSAAT_HALINDE", "INSAAT_PROJESI"].includes(
      unit.status || "",
    ),
  ).length;

  const total = Math.max(units.length, 1);

  const items = [
    { label: "Satılık", value: saleCount, accent: "#1557D6" },
    { label: "Kiralık", value: rentCount, accent: "#16A34A" },
    { label: "Proje", value: projectCount, accent: "#EA580C" },
  ];

  return (
    <SectionCard
      title="Portföy Dengesi"
      desc="Stok dağılımı tek bakışta okunur. Bu bölüm listeye girmeden operasyon yönü verir."
      accent="#7C3AED"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const width = Math.round((item.value / total) * 100);

          return (
            <div
              key={item.label}
              className="flex min-h-[168px] flex-col items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center"
            >
              <p className="text-[13px] font-black uppercase tracking-[0.15em] text-[#64748B]">
                {item.label}
              </p>

              <p className="mt-2 text-[34px] font-black leading-none text-[#06194A]">
                {item.value}
              </p>

              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    backgroundColor: item.accent,
                  }}
                />
              </div>

              <p className="mt-3 text-xs font-bold text-[#64748B]">
                %{width} stok ağırlığı
              </p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}


function InventorySection({
  units,
  viewMode,
  isAdmin,
  onVerify,
}: {
  units: Unit[];
  viewMode: ViewMode;
  isAdmin: boolean;
  onVerify: (unitId: string, payload: VerifyPayload) => void;
}) {
  return (
    <SectionCard
      title="Canlı İlan Listesi"
      desc="Kart ve liste görünümü aktiftir. Tüm içerikler mobil simetri kuralına göre hizalanır."
      accent="#16A34A"
    >
      {viewMode === "cards" ? (
        <UnitCards units={units} isAdmin={isAdmin} onVerify={onVerify} />
      ) : (
        <CompactList units={units} />
      )}
    </SectionCard>
  );
}

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linaOpen, setLinaOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: "",
    city: "Denizli",
    district: "",
    address: "",
  });

  const [unitForm, setUnitForm] = useState<UnitFormState>({
    type: "DAIRE",
    floor: "",
    number: "",
    roomCount: "3+1",
    area: "",
    price: "",
    status: "SATILIK",
    description: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const roleType = getRoleType(user?.role);
  const tone = getTone(roleType);
  const roleName = roleLabel(user?.role);
  const isAdmin = roleType === "admin" || roleType === "superadmin";

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "MÜTEAHHİT" ||
    user?.role === "MÜTAHHİT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "İNŞAAT_FİRMASI" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "EMLAKCI";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchData();
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!hydrated || !user) return;

    fetchUnits();
  }, [statusFilter, cityFilter]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [projectRes, unitRes] = await Promise.all([
        api.get("/projects"),
        api.get("/units"),
      ]);

      setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
      setUnits(Array.isArray(unitRes.data) ? unitRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);

    const res = await api.get(`/units?${params.toString()}`);

    setUnits(Array.isArray(res.data) ? res.data : []);
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    if (!q) return units;

    return units.filter((unit) => {
      const text = [
        unit.project?.name,
        unit.project?.city,
        unit.project?.district,
        unit.project?.address,
        unit.number,
        unit.type,
        unit.status,
        unit.roomCount,
        unit.description,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return text.includes(q);
    });
  }, [units, search]);

  const activeUnits = units.filter((unit) =>
    ["SATILIK", "KIRALIK", "ON_SATIS", "PROJE_ASAMASI", "YAKINDA_SATISTA", "INSAAT_HALINDE", "HEMEN_TESLIM", "INSAAT_PROJESI"].includes(
      unit.status || "",
    ),
  ).length;

  const soldUnits = countByStatus(units, "SATILDI");
  const verifiedUnits = units.filter(isUnitVerified).length;
  const myProjects = isAdmin ? projects : [];

  const resetForm = () => {
    setSelectedProjectId("");

    setProjectForm({
      name: "",
      city: "Denizli",
      district: "",
      address: "",
    });

    setUnitForm({
      type: "DAIRE",
      floor: "",
      number: "",
      roomCount: "3+1",
      area: "",
      price: "",
      status: "SATILIK",
      description: "",
    });

    setFormError("");
    setFormSuccess(false);
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (
          !projectForm.name ||
          !projectForm.city ||
          !projectForm.district ||
          !projectForm.address
        ) {
          setFormError("Proje bilgilerini eksiksiz doldurun.");
          setFormLoading(false);
          return;
        }

        const projectRes = await api.post("/projects", projectForm);

        projectId = projectRes.data.id;
      }

      if (!unitForm.number || !unitForm.area || !unitForm.price) {
        setFormError("Birim numarası, alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      await api.post(`/units/project/${projectId}`, {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        number: unitForm.number,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: parseFloat(unitForm.price),
        status: unitForm.status,
        description: unitForm.description || undefined,
      });

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdminVerify = async (unitId: string, payload: VerifyPayload) => {
    try {
      await api.patch(`/units/${unitId}/verify`, payload);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Doğrulama işlemi yapılamadı.");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="flex flex-col items-center gap-4 text-[#27364F]">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#1557D6] border-t-transparent" />
          <p className="text-sm font-black">İlanlarım yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <Shell
      title="İlanlarım"
      role={roleName}
      tone={tone}
      onLogout={handleLogout}
    >
      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Hero
          role={roleName}
          totalUnits={units.length}
          activeUnits={activeUnits}
          soldUnits={soldUnits}
          verifiedUnits={verifiedUnits}
          tone={tone}
        />

        <KpiGrid units={units} projects={projects} />

        <QuickActions
          canAddUnit={canAddUnit}
          onAdd={() => {
            resetForm();
            setShowModal(true);
          }}
          onLina={() => setLinaOpen(true)}
        />

        <FilterCenter
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          visibleCount={filteredUnits.length}
          totalCount={units.length}
        />

        <PremiumInsight units={filteredUnits} />

        <InventorySection
          units={filteredUnits}
          viewMode={viewMode}
          isAdmin={isAdmin}
          onVerify={handleAdminVerify}
        />
      </div>

      <StokCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projects={myProjects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        unitForm={unitForm}
        setUnitForm={setUnitForm}
        formError={formError}
        formSuccess={formSuccess}
        formLoading={formLoading}
        onSubmit={handleSubmit}
      />

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Shell>
  );
}
