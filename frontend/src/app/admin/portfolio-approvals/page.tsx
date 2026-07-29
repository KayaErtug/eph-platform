"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  FileWarning,
  Filter,
  FolderOpen,
  Home,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UsersRound,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type PortfolioApprovalStatus =
  | "BELGE_BEKLENIYOR"
  | "INCELEMEYE_GONDERILDI"
  | "INCELEMEDE"
  | "EKSIK_BILGI_BEKLENIYOR"
  | "ONAYLANDI"
  | "HAVUZDA"
  | "REDDEDILDI";

type ApprovalUnit = {
  id: string;
  type: string;
  number: string;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  status: string;
  approvalStatus?: PortfolioApprovalStatus | string | null;
  approvalNote?: string | null;
  submittedForApprovalAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  isPoolVisible?: boolean;
  poolPublishedAt?: string | null;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    city: string;
    district: string;
    address?: string | null;
    owner?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      memberCode?: string | null;
    };
  };
  images?: {
    id?: string;
    url?: string;
    supabaseUrl?: string;
    isCover?: boolean;
    sortOrder?: number;
  }[];
  authorityDocuments?: {
    id: string;
    authorityType: string;
    approved: boolean;
    approvedById?: string | null;
    approvedAt?: string | null;
    rejectReason?: string | null;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tümü",
  BELGE_BEKLENIYOR: "Belge Bekliyor",
  INCELEMEYE_GONDERILDI: "Gönderildi",
  INCELEMEDE: "İncelemede",
  EKSIK_BILGI_BEKLENIYOR: "Eksik Bilgi",
  ONAYLANDI: "Onaylandı",
  HAVUZDA: "Havuz",
  REDDEDILDI: "Red",
  WAITING: "Onaylanacak",
};

const FILTERS = [
  "WAITING",
  "INCELEMEYE_GONDERILDI",
  "INCELEMEDE",
  "EKSIK_BILGI_BEKLENIYOR",
  "ONAYLANDI",
  "REDDEDILDI",
  "HAVUZDA",
];

const SELECT_FILTERS = ["ALL", ...FILTERS];

function effectiveApprovalStatus(item: ApprovalUnit) {
  if (item.isPoolVisible || item.approvalStatus === "HAVUZDA") return "HAVUZDA";
  return String(item.approvalStatus || "BELGE_BEKLENIYOR");
}

function isWaitingApprovalStatus(status: string) {
  return [
    "BELGE_BEKLENIYOR",
    "INCELEMEYE_GONDERILDI",
    "INCELEMEDE",
    "EKSIK_BILGI_BEKLENIYOR",
  ].includes(status);
}

function getRequiredDocumentApprovalState(item: ApprovalUnit) {
  const documents = Array.isArray(item.authorityDocuments)
    ? item.authorityDocuments
    : [];

  const tapuDocuments = documents.filter(
    (document) => document.authorityType === "TAPU",
  );
  const yetkiDocuments = documents.filter(
    (document) => document.authorityType === "YETKI_BELGESI",
  );

  const tapuDocument =
    tapuDocuments.find((document) => document.approved) || tapuDocuments[0];
  const yetkiDocument =
    yetkiDocuments.find((document) => document.approved) || yetkiDocuments[0];
  const hasApprovedTapu = tapuDocuments.some(
    (document) => document.approved,
  );
  const hasApprovedYetki = yetkiDocuments.some(
    (document) => document.approved,
  );

  return {
    tapuDocument,
    yetkiDocument,
    hasApprovedTapu,
    hasApprovedYetki,
    allRequiredApproved: hasApprovedTapu && hasApprovedYetki,
  };
}

function matchesApprovalFilter(item: ApprovalUnit, filter: string) {
  const status = effectiveApprovalStatus(item);

  if (filter === "ALL") return true;
  if (filter === "WAITING") return isWaitingApprovalStatus(status);

  return status === filter;
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function money(value?: number | null, currency?: string | null) {
  if (!value) return "Fiyat yok";

  const symbol =
    currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₺";

  return `${Number(value).toLocaleString("tr-TR")} ${symbol}`;
}

function dateText(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ownerName(item: ApprovalUnit) {
  return (
    [item.project?.owner?.firstName, item.project?.owner?.lastName]
      .filter(Boolean)
      .join(" ") || "Sahip bilgisi yok"
  );
}

function statusClass(status?: string | null) {
  if (status === "HAVUZDA") return "bg-emerald-50 text-emerald-700";
  if (status === "ONAYLANDI") return "bg-green-50 text-green-700";
  if (status === "REDDEDILDI") return "bg-rose-50 text-rose-700";
  if (status === "EKSIK_BILGI_BEKLENIYOR") return "bg-orange-50 text-orange-700";
  if (status === "INCELEMEDE") return "bg-blue-50 text-blue-700";
  if (status === "INCELEMEYE_GONDERILDI") return "bg-indigo-50 text-indigo-700";
  return "bg-amber-50 text-amber-700";
}

function portfolioCode(id: string) {
  const raw = String(id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toUpperCase()}-${raw.slice(-4).toUpperCase()}`;
}

function coverImage(item: ApprovalUnit) {
  const images = Array.isArray(item.images) ? item.images : [];

  const sorted = [...images].sort((a, b) => {
    if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });

  return sorted[0]?.supabaseUrl || sorted[0]?.url || "";
}

function unitKind(item: ApprovalUnit) {
  const value = String(item.type || "").replaceAll("_", " ").toLocaleLowerCase("tr-TR");

  if (!value) return "Portföy";

  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export default function PortfolioApprovalsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [items, setItems] = useState<ApprovalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("WAITING");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccess = ["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(
    String(user?.role || "").toUpperCase(),
  );

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/dashboard");
      return;
    }

    fetchItems();
  }, [hasHydrated, user?.id, user?.role]);

  async function fetchItems() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(`/units/admin/portfolio-approvals?status=ALL&t=${Date.now()}`);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Portföy onay kayıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.type).filter(Boolean)));

    return values.map((value) => ({
      value,
      label: unitKind({ id: value, type: value, number: value, status: "" }),
    }));
  }, [items]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      waiting: items.filter((item) => isWaitingApprovalStatus(effectiveApprovalStatus(item))).length,
      reviewing: items.filter((item) => effectiveApprovalStatus(item) === "INCELEMEDE").length,
      approved: items.filter((item) => effectiveApprovalStatus(item) === "ONAYLANDI").length,
      pool: items.filter((item) => effectiveApprovalStatus(item) === "HAVUZDA").length,
      rejected: items.filter((item) => effectiveApprovalStatus(item) === "REDDEDILDI").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = normalize(query);

    return items.filter((item) => {
      const statusMatch = matchesApprovalFilter(item, filter);
      const typeMatch = typeFilter === "ALL" || item.type === typeFilter;

      const haystack = normalize(
        [
          portfolioCode(item.id),
          item.project?.name,
          item.project?.city,
          item.project?.district,
          ownerName(item),
          unitKind(item),
          item.type,
          item.number,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return statusMatch && typeMatch && (!q || haystack.includes(q));
    });
  }, [items, filter, typeFilter, query]);

  async function act(id: string, action: string) {
    setActionLoading(`${id}-${action}`);
    setError("");
    setSuccess("");

    try {
      if (action === "review") {
        await api.post(`/units/${id}/mark-reviewing`, {
          note: "Portföy admin onay merkezinde incelemeye alındı.",
        });
        setSuccess("Portföy incelemeye alındı.");
      }

      if (action === "missing") {
        await api.post(`/units/${id}/request-missing-info`, {
          note: "Portföy için ek bilgi veya belge bekleniyor.",
        });
        setSuccess("Eksik bilgi talebi gönderildi.");
      }

      if (action === "approve") {
        const targetItem = items.find((item) => item.id === id);
        const documentState = targetItem
          ? getRequiredDocumentApprovalState(targetItem)
          : null;

        if (!documentState?.allRequiredApproved) {
          throw new Error(
            "Portföyü onaylayıp yayınlamak için Tapu ve Yetki Belgesinin ikisi de ayrı ayrı onaylanmalıdır.",
          );
        }

        await api.post(`/units/${id}/approve`, {
          note:
            "Tapu ve Yetki Belgesi onayları doğrulandı. Portföy admin onay merkezinden onaylandı ve havuzda yayınlandı.",
        });

        setSuccess(
          "Portföy onaylandı ve otomatik olarak havuzda yayınlandı.",
        );
      }

      if (action === "reject") {
        await api.post(`/units/${id}/reject`, {
          note: "Portföy admin onay merkezinden reddedildi.",
        });
        setSuccess("Portföy reddedildi.");
      }

      await fetchItems();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "İşlem tamamlanamadı.",
      );
    } finally {
      setActionLoading("");
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Portföy Onay Merkezi
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F8FAFC] pb-[calc(88px+env(safe-area-inset-bottom))] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Admin paneline dön"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Portföy Onayları
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Mobil onay, belge ve havuz merkezi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/portfolio-approvals"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Bekleyen onaylar"
            >
              <Bell size={17} />
              {counts.waiting > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {counts.waiting}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={fetchItems}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Yenile"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-24">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="grid grid-cols-3 gap-2 md:grid-cols-6">
          <StatCard icon={<ClipboardCheck size={18} />} label="Toplam" value={counts.total} tone="slate" />
          <StatCard icon={<FileWarning size={18} />} label="Bekleyen" value={counts.waiting} tone="amber" />
          <StatCard icon={<ShieldCheck size={18} />} label="İnceleme" value={counts.reviewing} tone="blue" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Onay" value={counts.approved} tone="green" />
          <StatCard icon={<Send size={18} />} label="Havuz" value={counts.pool} tone="purple" />
          <StatCard icon={<XCircle size={18} />} label="Red" value={counts.rejected} tone="rose" />
        </section>

        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`h-10 rounded-xl px-2 text-[11px] font-black sm:text-[12px] ${
                  filter === key
                    ? "bg-[#172033] text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {STATUS_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_170px_170px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Portföy adı, sahip, şehir, tür veya kod ara..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6] md:text-left"
              />
            </label>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              {SELECT_FILTERS.map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="ALL">Tüm Türler</option>
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchItems}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#172033] px-3 text-[12px] font-black text-white"
            >
              <Filter size={16} />
              Yenile
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center text-[13px] font-black text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-[13px] font-black text-emerald-700">
            {success}
          </div>
        ) : null}

        {filteredItems.length === 0 ? (
          <section className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ShieldCheck className="mx-auto text-slate-400" size={38} />
            <p className="mt-3 text-[15px] font-black text-slate-700">
              Bu filtrede portföy yok.
            </p>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-2">
            {filteredItems.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                actionLoading={actionLoading}
                onAction={act}
              />
            ))}
          </section>
        )}

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-center text-[12px] font-black text-slate-500 shadow-sm">
          Gösterilen kayıt: {filteredItems.length} / Toplam kayıt: {items.length}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          <MobileNav href="/admin" icon={<Home size={21} />} label="Panel" />
          <MobileNav href="/admin/portfolio-approvals" icon={<CheckCircle2 size={21} />} label="Onay" active />
          <MobileNav href="/admin/system-messages" icon={<FileText size={21} />} label="Mesaj" />
          <MobileNav href="/admin/settings" icon={<Settings size={21} />} label="Ayar" />
          <MobileNav href="/admin/help-center" icon={<UsersRound size={21} />} label="Yardım" />
        </div>
      </nav>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "slate" | "amber" | "blue" | "green" | "purple" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-700"
          : tone === "purple"
            ? "bg-purple-50 text-purple-700"
            : tone === "rose"
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black leading-none text-[#172033]">
        {value}
      </p>
    </article>
  );
}

function PortfolioCard({
  item,
  actionLoading,
  onAction,
}: {
  item: ApprovalUnit;
  actionLoading: string;
  onAction: (id: string, action: string) => void;
}) {
  const image = coverImage(item);
  const currentStatus = effectiveApprovalStatus(item);
  const isPool = currentStatus === "HAVUZDA";
  const isFinalApproved = currentStatus === "ONAYLANDI";
  const isRejected = currentStatus === "REDDEDILDI";
  const isReviewable = [
    "INCELEMEYE_GONDERILDI",
    "INCELEMEDE",
  ].includes(currentStatus);
  const documentState = getRequiredDocumentApprovalState(item);
  const canApproveAndPublish =
    isReviewable && documentState.allRequiredApproved;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="h-[74px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-[86px] sm:w-[104px]">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <FolderOpen size={25} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                {portfolioCode(item.id)}
              </p>
              <h2 className="line-clamp-2 text-[15px] font-black leading-[1.05] tracking-[-0.04em] text-[#172033]">
                {item.project?.name || unitKind(item)}
              </h2>
              <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                {unitKind(item)} • {item.project?.district || "İlçe yok"} /{" "}
                {item.project?.city || "Şehir yok"}
              </p>
              <p className="mt-1 truncate text-[12px] font-black text-[#1557D6]">
                {money(item.price, item.priceCurrency)}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${statusClass(
                item.approvalStatus,
              )}`}
            >
              {STATUS_LABELS[currentStatus] || "Durum Yok"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <InfoCard
          icon={<UsersRound size={15} />}
          label="Sahip"
          value={ownerName(item)}
        />
        <InfoCard
          icon={<CalendarDays size={15} />}
          label="Gönderim"
          value={dateText(item.submittedForApprovalAt || item.updatedAt)}
        />
        <InfoCard
          icon={<FolderOpen size={15} />}
          label="Tür"
          value={unitKind(item)}
        />
        <InfoCard
          icon={<span className="text-[13px] font-black">₺</span>}
          label="Fiyat"
          value={money(item.price, item.priceCurrency)}
        />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <DocumentStatus
          label="Yetki"
          active={documentState.hasApprovedYetki}
        />
        <DocumentStatus
          label="Tapu"
          active={documentState.hasApprovedTapu}
        />
        <DocumentStatus
          label="Foto"
          active={Boolean(item.photoVerified)}
        />
        <DocumentStatus label="Havuz" active={isPool} />
      </div>

      {isReviewable && !documentState.allRequiredApproved ? (
        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-center text-[10px] font-black leading-4 text-amber-800">
          Onayla ve Yayınla kilitli · Tapu ve Yetki Belgesinin ikisi de
          ayrı ayrı onaylanmalıdır.
        </p>
      ) : isFinalApproved ? (
        <p className="mt-2 rounded-2xl bg-emerald-50 p-2.5 text-center text-[11px] font-black leading-4 text-emerald-800">
          ✅ Portföy onaylandı.
        </p>
      ) : item.approvalNote ? (
        <p className="mt-2 line-clamp-2 rounded-2xl bg-amber-50 p-2.5 text-center text-[11px] font-bold leading-4 text-amber-800">
          {item.approvalNote}
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-5">
        <ActionButton
          label="İncele"
          icon={<Eye size={15} />}
          loading={actionLoading === `${item.id}-review`}
          disabled={!isReviewable || currentStatus === "INCELEMEDE"}
          onClick={() => onAction(item.id, "review")}
          className="bg-blue-50 text-blue-700"
        />
        <ActionButton
          label="Eksik Bilgi"
          icon={<FileWarning size={15} />}
          loading={actionLoading === `${item.id}-missing`}
          disabled={!isReviewable}
          onClick={() => onAction(item.id, "missing")}
          className="bg-amber-50 text-amber-700"
        />
        <ActionButton
          label={isPool ? "Yayınlandı" : "Onayla ve Yayınla"}
          icon={<CheckCircle2 size={15} />}
          loading={actionLoading === `${item.id}-approve`}
          disabled={!canApproveAndPublish || isPool || isFinalApproved}
          onClick={() => onAction(item.id, "approve")}
          className="col-span-2 bg-emerald-600 text-white md:col-span-1"
        />
        <ActionButton
          label={isRejected ? "Reddedildi" : "Portföyü Reddet"}
          icon={<XCircle size={15} />}
          loading={actionLoading === `${item.id}-reject`}
          disabled={!isReviewable || isRejected}
          onClick={() => onAction(item.id, "reject")}
          className="bg-rose-50 text-rose-700"
        />
        <Link
          href={`/portfoy/${item.id}`}
          className="col-span-2 flex min-h-[40px] items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 md:col-span-1"
        >
          <FileText size={15} />
          Detay
        </Link>
      </div>
    </article>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-1.5 text-center">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-700">
        {icon}
      </div>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 break-words text-[10px] font-black leading-4 text-[#172033]">
        {value}
      </p>
    </div>
  );
}

function DocumentStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-1.5 text-center">
      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <span
        className={`mt-1 inline-flex min-w-[30px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ${
          active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {active ? "✓" : "—"}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  disabled = false,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex min-h-[40px] items-center justify-center gap-1 rounded-2xl px-1.5 text-[11px] font-black disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : icon}
      {loading ? "..." : label}
    </button>
  );
}

function MobileNav({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-black ${
        active ? "bg-[#172033] text-white" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="mt-1 truncate">{label}</span>
    </Link>
  );
}