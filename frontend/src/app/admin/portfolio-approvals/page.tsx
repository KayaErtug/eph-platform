"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileWarning,
  Home,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

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
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tümü",
  BELGE_BEKLENIYOR: "Belge Bekliyor",
  INCELEMEYE_GONDERILDI: "Gönderildi",
  INCELEMEDE: "İncelemede",
  EKSIK_BILGI_BEKLENIYOR: "Eksik Bilgi",
  ONAYLANDI: "Onaylandı",
  HAVUZDA: "Havuzda",
  REDDEDILDI: "Reddedildi",
};

const FILTERS = [
  "ALL",
  "BELGE_BEKLENIYOR",
  "INCELEMEYE_GONDERILDI",
  "INCELEMEDE",
  "EKSIK_BILGI_BEKLENIYOR",
  "ONAYLANDI",
  "HAVUZDA",
  "REDDEDILDI",
];

const HEADER_THEMES = [
  {
    title: "Cumhuriyet",
    quote:
      "Ey Türk istikbalinin evladı! İşte, bu ahval ve şerait içinde dahi vazifen, Türk istiklal ve cumhuriyetini kurtarmaktır! Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
    image: "/admin-themes/ataturk.jpg",
    bg: "from-[#8B0000] via-[#C1121F] to-[#003049]",
  },
  {
    title: "Turan",
    quote:
      "Vatan ne Türkiye'dir Türklere, ne Türkistan; Vatan büyük ve müebbet bir ülkedir: Türklere Turan.",
    image: "/admin-themes/ziya-gokalp.jpg",
    bg: "from-[#06194A] via-[#123B7A] to-[#B91C1C]",
  },
  {
    title: "Türklük",
    quote: "Türklüğün bedeni Türkiye, ruhu İslamiyet, gayesi Turan'dır.",
    image: "/admin-themes/ziya-gokalp.jpg",
    bg: "from-[#0F172A] via-[#1E3A8A] to-[#991B1B]",
  },
  {
    title: "Türkçe",
    quote:
      "Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.",
    image: "/admin-themes/karamanoglu.jpg",
    bg: "from-[#7C2D12] via-[#B45309] to-[#991B1B]",
  },
  {
    title: "Dil",
    quote:
      "Har içinde biten gonca güle minnet eylemem, Arabi, Farisi bilmem; dile minnet eylemem. Sırat-ı Müstakim üzre gözetirim Rahim'i, İblisin talim ettiği yola minnet eylemem.",
    image: "/admin-themes/kul-nesimi.jpg",
    bg: "from-[#3F2E1E] via-[#7C2D12] to-[#111827]",
  },
  {
    title: "Fetih",
    quote:
      "Onlar korkularından denizi zincirleyecek kadar akıllı ise, biz gemileri karadan yürütebilecek kadar deliyiz.",
    image: "/admin-themes/fatih.jpg",
    bg: "from-[#14532D] via-[#166534] to-[#854D0E]",
  },
  {
    title: "Kutlu Yol",
    quote:
      "Yufka yüreklilerle çetin yollar aşılmaz; Çünkü bu yol kutludur, gider Tanrı Dağı'na.",
    image: "/admin-themes/atsiz.jpg",
    bg: "from-[#312E81] via-[#1E40AF] to-[#7C3AED]",
  },
  {
    title: "Orhun",
    quote:
      "Ey Türk! Üstte mavi gök çökmedikçe, altta yağız yer delinmedikçe, senin ilini ve töreni kim bozabilir?",
    image: "/admin-themes/bilge-kagan.jpg",
    bg: "from-[#0F172A] via-[#0F766E] to-[#1E3A8A]",
  },
  {
    title: "İstiklal",
    quote:
      "Hakkıdır hür yaşamış bayrağımın hürriyet; Hakkıdır Hakk'a tapan milletimin istiklal!",
    image: "/admin-themes/mehmet-akif.jpg",
    bg: "from-[#991B1B] via-[#B91C1C] to-[#1E3A8A]",
  },
];

function getThemeOfHour() {
  const hour = new Date().getHours();
  return HEADER_THEMES[hour % HEADER_THEMES.length];
}

function money(value?: number | null, currency?: string | null) {
  if (!value) return "Fiyat yok";
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : "₺";
  return `${Number(value).toLocaleString("tr-TR")} ${symbol}`;
}

function dateText(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleDateString("tr-TR", {
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
  if (status === "HAVUZDA") return "bg-emerald-100 text-emerald-800";
  if (status === "ONAYLANDI") return "bg-green-100 text-green-800";
  if (status === "REDDEDILDI") return "bg-rose-100 text-rose-800";
  if (status === "EKSIK_BILGI_BEKLENIYOR") return "bg-orange-100 text-orange-800";
  if (status === "INCELEMEDE") return "bg-blue-100 text-blue-800";
  if (status === "INCELEMEYE_GONDERILDI") return "bg-indigo-100 text-indigo-800";
  return "bg-amber-100 text-amber-800";
}

function portfolioCode(id: string) {
  const raw = String(id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toUpperCase()}-${raw.slice(-4).toUpperCase()}`;
}

export default function PortfolioApprovalsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [items, setItems] = useState<ApprovalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const theme = getThemeOfHour();

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
  }, [hasHydrated, user?.id, user?.role, filter]);

  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/units/admin/portfolio-approvals?status=${filter}`,
      );
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Portföy onay kayıtları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    return {
      total: items.length,
      waiting: items.filter((x) =>
        ["BELGE_BEKLENIYOR", "INCELEMEYE_GONDERILDI"].includes(
          String(x.approvalStatus || ""),
        ),
      ).length,
      reviewing: items.filter((x) => x.approvalStatus === "INCELEMEDE").length,
      approved: items.filter((x) => x.approvalStatus === "ONAYLANDI").length,
      pool: items.filter((x) => x.approvalStatus === "HAVUZDA").length,
    };
  }, [items]);

  const act = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    setError("");

    try {
      if (action === "review") {
        await api.post(`/units/${id}/mark-reviewing`, {
          note: "Portföy admin onay merkezinde incelemeye alındı.",
        });
      }

      if (action === "missing") {
        await api.post(`/units/${id}/request-missing-info`, {
          note: "Portföy için ek bilgi veya belge bekleniyor.",
        });
      }

      if (action === "approve") {
        await api.post(`/units/${id}/approve`, {
          note: "Portföy admin onay merkezinden onaylandı.",
        });
      }

      if (action === "reject") {
        await api.post(`/units/${id}/reject`, {
          note: "Portföy admin onay merkezinden reddedildi.",
        });
      }

      if (action === "pool") {
        await api.post(`/units/${id}/send-to-pool`);
      }

      await fetchItems();
    } catch (err: any) {
      setError(err?.response?.data?.message || "İşlem tamamlanamadı.");
    } finally {
      setActionLoading("");
    }
  };

  if (!hasHydrated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <Loader2 className="animate-spin text-[#1557D6]" size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-28 text-[#172033]">
      <section className="mx-auto w-full max-w-[430px] px-3 py-3">
        <div
          className={`overflow-hidden rounded-[28px] bg-gradient-to-br ${theme.bg} p-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]`}
        >
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur"
              aria-label="Admin merkezine dön"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                EPH Yönetim Merkezi
              </p>
              <h1 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                Portföy Onayları
              </h1>
            </div>

            <button
              onClick={fetchItems}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur"
              aria-label="Yenile"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-white/10 p-3 backdrop-blur">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white/15">
              <img
                src={theme.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span className="relative text-2xl">🇹🇷</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white">
                  🇹🇷 {theme.title}
                </span>
              </div>
              <p className="mt-2 text-center text-[12px] font-bold leading-5 text-white/92">
                {theme.quote}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          <MiniStat label="Toplam" value={counts.total} tone="bg-slate-900 text-white" />
          <MiniStat label="Bekleyen" value={counts.waiting} tone="bg-amber-100 text-amber-800" />
          <MiniStat label="İnceleme" value={counts.reviewing} tone="bg-blue-100 text-blue-800" />
          <MiniStat label="Onay" value={counts.approved} tone="bg-emerald-100 text-emerald-800" />
          <MiniStat label="Havuz" value={counts.pool} tone="bg-green-100 text-green-800" />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`h-10 shrink-0 rounded-2xl px-3 text-[11px] font-black ${
                filter === key
                  ? "bg-[#06194A] text-white"
                  : "border border-[#DDE7F3] bg-white text-[#475569]"
              }`}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-[20px] border border-rose-100 bg-rose-50 p-3 text-center text-[12px] font-black text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-white p-8 text-center">
            <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
            <p className="mt-3 text-[12px] font-black text-slate-500">
              Portföyler yükleniyor
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[#DDE7F3] bg-white p-8 text-center">
            <ShieldCheck className="mx-auto text-emerald-600" size={34} />
            <p className="mt-3 text-[14px] font-black text-[#06194A]">
              Bu filtrede portföy yok.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[26px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                      {portfolioCode(item.id)}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-[16px] font-black leading-tight text-[#06194A]">
                      {item.project?.name || "EPH Portföy"}
                    </h2>
                    <p className="mt-1 text-[12px] font-bold text-[#64748B]">
                      {item.project?.district || "İlçe yok"} /{" "}
                      {item.project?.city || "Şehir yok"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${statusClass(
                      item.approvalStatus,
                    )}`}
                  >
                    {STATUS_LABELS[String(item.approvalStatus || "")] ||
                      "Durum Yok"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Info label="Sahip" value={ownerName(item)} />
                  <Info label="Fiyat" value={money(item.price, item.priceCurrency)} />
                  <Info label="Gönderim" value={dateText(item.submittedForApprovalAt || item.updatedAt)} />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <CheckItem label="Yetki" active={Boolean(item.yetkiVerified || item.isVerified)} />
                  <CheckItem label="Tapu" active={Boolean(item.tapuVerified)} />
                  <CheckItem label="Foto" active={Boolean(item.photoVerified)} />
                  <CheckItem label="Havuz" active={Boolean(item.isPoolVisible || item.approvalStatus === "HAVUZDA")} />
                </div>

                {item.approvalNote && (
                  <p className="mt-3 rounded-[16px] bg-slate-50 p-3 text-center text-[11px] font-bold leading-5 text-slate-600">
                    {item.approvalNote}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton
                    label="İncele"
                    icon={<Clock3 size={15} />}
                    loading={actionLoading === `${item.id}-review`}
                    onClick={() => act(item.id, "review")}
                    className="bg-blue-50 text-blue-700"
                  />
                  <ActionButton
                    label="Eksik Bilgi"
                    icon={<FileWarning size={15} />}
                    loading={actionLoading === `${item.id}-missing`}
                    onClick={() => act(item.id, "missing")}
                    className="bg-orange-50 text-orange-700"
                  />
                  <ActionButton
                    label="Onayla"
                    icon={<CheckCircle2 size={15} />}
                    loading={actionLoading === `${item.id}-approve`}
                    onClick={() => act(item.id, "approve")}
                    className="bg-emerald-50 text-emerald-700"
                  />
                  <ActionButton
                    label="Reddet"
                    icon={<XCircle size={15} />}
                    loading={actionLoading === `${item.id}-reject`}
                    onClick={() => act(item.id, "reject")}
                    className="bg-rose-50 text-rose-700"
                  />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ActionButton
                    label="Havuza Al"
                    icon={<Send size={15} />}
                    loading={actionLoading === `${item.id}-pool`}
                    onClick={() => act(item.id, "pool")}
                    className="bg-[#1557D6] text-white"
                  />

                  <Link
                    href={`/stok/${item.id}`}
                    className="flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-[11px] font-black text-[#1557D6]"
                  >
                    <Building2 size={15} />
                    Detay
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <Link
          href="/admin"
          className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white text-[12px] font-black text-[#06194A]"
        >
          <Home size={16} />
          Admin Merkezine Dön
        </Link>
      </section>
    </main>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-[18px] p-2 text-center ${tone}`}>
      <p className="text-[16px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#F7FBFF] p-2 text-center">
      <p className="text-[8px] font-black uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] font-black leading-tight text-[#06194A]">
        {value}
      </p>
    </div>
  );
}

function CheckItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-[14px] p-2 text-center text-[10px] font-black ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"
      }`}
    >
      {label} {active ? "✓" : "—"}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] px-2 text-[11px] font-black disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={15} /> : icon}
      {loading ? "İşleniyor" : label}
    </button>
  );
}
