"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  X,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Store,
} from "lucide-react";

import type { ProjectLaunchCenterResponse } from "@/app/proje-satis-sablonu/lib/projectSalesTypes";
import api from "@/lib/api";

type LegacyPresentationResponse = Pick<
  ProjectLaunchCenterResponse,
  "project" | "presentation" | "publishReadiness"
> & { presentation: Partial<Presentation> };

type PoolProjectPresentationResponse = {
  link: {
    expiresAt: string;
    viewCount: number;
  };
  project: any;
  presentation: {
    title: string;
    subtitle: string;
    coverUrl?: string | null;
    metrics: {
      totalUnits: number;
      availableUnits: number;
      reservedUnits: number;
      closedUnits: number;
    };
    typeBreakdown: Array<{
      type: string;
      label: string;
      count: number;
      availableCount: number;
      minPrice?: number | null;
      maxPrice?: number | null;
    }>;
    roomCounts: string[];
    priceRange: {
      min?: number | null;
      max?: number | null;
      currency?: string | null;
    };
    spaces: Array<{
      id: string;
      name: string;
      grossArea?: number | null;
      description?: string | null;
    }>;
    blocks: Array<{
      id: string;
      code: string;
      name: string;
      floorCount: number;
    }>;
    availableUnits: Array<{
      id: string;
      title: string;
      typeLabel: string;
      roomCount?: string | null;
      grossArea?: number | null;
      area?: number | null;
      netArea?: number | null;
      floorLabel?: string | null;
      price?: number | null;
      priceCurrency?: string | null;
      coverUrl?: string | null;
      statusLabel: string;
    }>;
  };
  sharer?: {
    id: string;
    name: string;
    phone?: string | null;
    profileImageUrl?: string | null;
    memberCode?: string | null;
    isVerified?: boolean;
    role?: string | null;
    officeName?: string | null;
  } | null;
};

type PageData =
  | { mode: "POOL"; data: PoolProjectPresentationResponse }
  | { mode: "LEGACY"; data: LegacyPresentationResponse };

function formatMoney(value?: number | null, currency = "TRY") {
  const amount = Number(value || 0);
  if (!amount) return "Fiyat bilgisi için iletişime geçiniz";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency === "TL" ? "TRY" : currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `9${digits}`;
  return `90${digits}`;
}

export default function ProjectPresentationSharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const poolResponse = await api.get<PoolProjectPresentationResponse>(
          `/pool-project-share/${encodeURIComponent(token)}`,
          { timeout: 150000 },
        );
        if (!alive) return;
        setPageData({ mode: "POOL", data: poolResponse.data });
        setError("");
      } catch (poolError: any) {
        try {
          const legacyResponse = await api.get<LegacyPresentationResponse>(
            `/project-presentation-share/${encodeURIComponent(token)}`,
            { timeout: 150000 },
          );
          if (!alive) return;
          setPageData({ mode: "LEGACY", data: legacyResponse.data });
          setError("");
        } catch (legacyError: any) {
          if (!alive) return;
          setError(
            legacyError?.response?.data?.message ||
              poolError?.response?.data?.message ||
              "Proje sunumu şu anda görüntülenemiyor.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F4F8FF] p-5 text-center text-[#0F172A]">
        <Loader2 className="animate-spin text-[#2563EB]" size={34} />
        <strong>Proje sunumu hazırlanıyor</strong>
      </main>
    );
  }

  if (error || !pageData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F4F8FF] p-5 text-center text-[#0F172A]">
        <Building2 className="text-[#2563EB]" size={38} />
        <strong>Sunum bağlantısı geçerli değil</strong>
        <span className="max-w-sm text-sm font-semibold text-[#64748B]">
          {error || "Bu bağlantı süresi dolmuş olabilir."}
        </span>
      </main>
    );
  }

  if (pageData.mode === "LEGACY") {
    if (Array.isArray(pageData.data.presentation.unitTypes)) {
      return <PremiumProjectPresentation presentation={pageData.data.presentation as Presentation} />;
    }
    return <LegacyProjectPresentation data={pageData.data} />;
  }

  return <PoolProjectPresentation data={pageData.data} token={token || ""} />;
}

function PoolProjectPresentation({
  data,
  token,
}: {
  data: PoolProjectPresentationResponse;
  token: string;
}) {
  const { project, presentation, sharer } = data;
  const phone = normalizePhone(sharer?.phone);
  const visibleUnits = useMemo(
    () => presentation.availableUnits.slice(0, 1),
    [presentation.availableUnits],
  );

  const whatsapp = async () => {
    try {
      await api.post(`/pool-project-share/${encodeURIComponent(token)}/whatsapp-click`);
    } catch {
      // İstatistik hatası müşteri iletişimini engellemez.
    }

    const text = `${presentation.title} projesi hakkında bilgi almak istiyorum.`;
    window.open(
      phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-28 text-[#0F172A]">
      <div className="mx-auto w-full max-w-[760px] space-y-4 p-3 sm:p-5">
        <section className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[#DBEAFE] shadow-[0_24px_65px_rgba(15,23,42,0.18)]">
          {presentation.coverUrl ? (
            <img
              src={presentation.coverUrl}
              alt={presentation.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#DBEAFE,#CCFBF1)] text-[#2563EB]">
              <ImageIcon size={52} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <span className="inline-flex rounded-full bg-[#2563EB] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
              EPH Güvenli Proje Sunumu
            </span>
            <h1 className="mt-3 text-[32px] font-black leading-[1.04] sm:text-[42px]">
              {presentation.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold sm:text-[14px]">
              <MapPin size={16} /> {presentation.subtitle}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Toplam" value={presentation.metrics.totalUnits} />
          <Metric label="Satışta" value={presentation.metrics.availableUnits} />
          <Metric label="Rezerve" value={presentation.metrics.reservedUnits} />
          <Metric label="Satılan" value={presentation.metrics.closedUnits} />
        </section>

        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Proje Özeti
          </p>
          <h2 className="mt-1 text-[20px] font-black">{project.name}</h2>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#64748B]">
            {project.description ||
              `${project.blockCount} blok ve ${presentation.metrics.totalUnits} bağımsız bölümden oluşan proje.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <InfoChip label={`${project.blockCount} Blok`} />
            {presentation.typeBreakdown.map((item) => (
              <InfoChip key={item.type} label={`${item.count} ${item.label}`} />
            ))}
            {presentation.roomCounts.map((room) => (
              <InfoChip key={room} label={room} tone="green" />
            ))}
          </div>
          <div className="mt-4 rounded-[18px] border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#64748B]">
              Proje Fiyat Aralığı
            </p>
            <p className="mt-1 text-[17px] font-black text-[#1D4ED8]">
              {formatMoney(
                presentation.priceRange.min,
                presentation.priceRange.currency || "TRY",
              )}
              {presentation.priceRange.max &&
              presentation.priceRange.max !== presentation.priceRange.min
                ? ` – ${formatMoney(
                    presentation.priceRange.max,
                    presentation.priceRange.currency || "TRY",
                  )}`
                : ""}
            </p>
          </div>
        </section>

        {presentation.spaces.length > 0 && (
          <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4 shadow-sm">
            <h2 className="text-[18px] font-black">Proje ve Sosyal Alanlar</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {presentation.spaces.map((space) => (
                <article
                  key={space.id}
                  className="rounded-[17px] border border-emerald-200 bg-emerald-50 p-3"
                >
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  <strong className="mt-2 block text-[12px] text-emerald-900">
                    {space.name}
                  </strong>
                  {space.grossArea ? (
                    <span className="mt-1 block text-[10px] font-bold text-emerald-700">
                      {space.grossArea} m²
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                Örnek Daire Sunumu
              </p>
              <h2 className="mt-1 text-[18px] font-black">
                Projeden Örnek Bağımsız Bölüm
              </h2>
            </div>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[10px] font-black text-[#1D4ED8]">
              1 Örnek
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {visibleUnits.map((unit) => (
              <article
                key={unit.id}
                className="overflow-hidden rounded-[18px] border-2 border-[#D7E2F0] bg-[#F8FAFC]"
              >
                {unit.coverUrl ? (
                  <img
                    src={unit.coverUrl}
                    alt={unit.title}
                    className="h-[140px] w-full object-cover"
                  />
                ) : null}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-[13px]">{unit.title || unit.typeLabel}</strong>
                      <p className="mt-1 text-[10px] font-bold text-[#64748B]">
                        {unit.typeLabel}
                        {unit.roomCount ? ` · ${unit.roomCount}` : ""}
                        {unit.grossArea || unit.area || unit.netArea
                          ? ` · ${unit.grossArea || unit.area || unit.netArea} m²`
                          : ""}
                        {unit.floorLabel ? ` · ${unit.floorLabel}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700">
                      {unit.statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] font-black text-[#2563EB]">
                    {formatMoney(unit.price, unit.priceCurrency || "TRY")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {sharer && (
          <section className="rounded-[24px] border-2 border-[#93C5FD] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {sharer.profileImageUrl ? (
                <img
                  src={sharer.profileImageUrl}
                  alt={sharer.name}
                  className="h-16 w-16 rounded-[20px] object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#EFF6FF] text-[#2563EB]">
                  <Store size={27} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-[17px] font-black">{sharer.name}</h2>
                  {sharer.isVerified && (
                    <BadgeCheck size={18} className="shrink-0 text-[#2563EB]" />
                  )}
                </div>
                <p className="mt-1 text-[11px] font-bold text-[#64748B]">
                  {sharer.officeName || "EPH Gayrimenkul Profesyoneli"}
                </p>
                {sharer.memberCode && (
                  <p className="mt-1 text-[9px] font-black text-[#2563EB]">
                    Üye Kodu: {sharer.memberCode}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="flex items-start gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold leading-5 text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          Bu proje, EPH güvenli müşteri sunumu üzerinden görüntülenmektedir.
          Proje sahibinin özel iletişim ve belge bilgileri paylaşılmaz.
        </section>
      </div>

      {sharer && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[#C7D6E8] bg-white/95 p-2.5 backdrop-blur">
          <div className="mx-auto grid max-w-[760px] grid-cols-2 gap-2">
            <button
              type="button"
              onClick={whatsapp}
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-[16px] bg-emerald-600 text-[12px] font-black text-white"
            >
              <MessageCircle size={18} /> WhatsApp
            </button>
            <a
              href={sharer.phone ? `tel:${sharer.phone}` : undefined}
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] text-[12px] font-black text-white"
            >
              <Phone size={18} /> Ara
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

function LegacyProjectPresentation({ data }: { data: LegacyPresentationResponse }) {
  const { presentation, project, publishReadiness } = data;

  return (
    <main className="min-h-screen bg-[#F4F8FF] p-3 text-[#0F172A] sm:p-5">
      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <section className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[#DBEAFE] shadow-xl">
          {presentation.coverUrl ? (
            <img
              src={presentation.coverUrl}
              alt={presentation.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#2563EB]">
              <ImageIcon size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <span className="text-[10px] font-black uppercase tracking-[0.12em]">
              EPH Proje Sunumu
            </span>
            <h1 className="mt-2 text-[34px] font-black leading-none">
              {presentation.title}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-[12px] font-bold">
              <MapPin size={15} /> {presentation.subtitle}
            </p>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Toplam" value={presentation.metrics.totalUnits} />
          <Metric label="Satışta" value={presentation.metrics.availableUnits} />
          <Metric label="Rezerve" value={presentation.metrics.reservedUnits} />
          <Metric label="Satılan" value={presentation.metrics.closedUnits} />
        </section>
        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4">
          <h2 className="text-[18px] font-black">Proje Özeti</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {presentation.highlights.map((item) => (
              <InfoChip key={item} label={item} />
            ))}
          </div>
        </section>
        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4">
          <h2 className="text-[18px] font-black">Öne Çıkan Bağımsız Bölümler</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {presentation.highlightedUnits.map((unit) => (
              <article
                key={unit.id}
                className="overflow-hidden rounded-[17px] border-2 border-[#D7E2F0] bg-[#F8FAFC]"
              >
                {unit.coverUrl ? (
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                    <img
                      src={unit.coverUrl}
                      alt={unit.title || unit.type}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-3">
                  <strong>{unit.title || unit.type}</strong>
                  <p className="mt-1 text-[10px] font-bold text-[#64748B]">
                    {unit.type}
                    {unit.roomCount ? ` · ${unit.roomCount}` : ""}
                  </p>
                  <p className="mt-2 text-[12px] font-black text-[#2563EB]">
                    {formatMoney(unit.price, unit.priceCurrency || "TRY")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="flex gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800">
          <CheckCircle2 size={18} />
          {project.name} sunumu güvenli bağlantı üzerinden görüntüleniyor. Yayın
          durumu: {publishReadiness.ready ? "hazır" : "kontrolde"}.
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border-2 border-[#C7D6E8] bg-white p-3 text-center shadow-sm">
      <strong className="block text-[22px] font-black text-[#2563EB]">{value}</strong>
      <span className="text-[9px] font-black text-[#64748B]">{label}</span>
    </div>
  );
}

function InfoChip({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "green";
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
      }`}
    >
      {label}
    </span>
  );
}

type Range = { min: number; max: number };
type Presentation = {
  title: string; subtitle: string; coverUrl: string | null;
  constructionStatus?: string | null; mapUrl?: string | null;
  metrics: { totalUnits: number; availableUnits: number; reservedUnits: number; closedUnits: number };
  copy?: { location: string[]; project: string[] };
  unitTypes?: { label: string; count: number; available: number; netArea: Range | null; grossArea: Range | null; prices: (Range & { currency: string })[]; hasUnpriced: boolean }[];
  amenities?: string[]; gallery?: string[];
  presenter?: { name: string; phone: string; photoUrl: string | null; office: { name: string; logoUrl: string | null } | null } | null;
};
const number = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
const range = (value: Range | null) => value ? value.min === value.max ? number(value.min) : `${number(value.min)} – ${number(value.max)}` : "Belirtilmedi";
function imageUrl(value: string | null | undefined) {
  if (!value || value.startsWith("//")) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("/api/")) return value;
  if (value.startsWith("/")) {
    const base = (process.env.NEXT_PUBLIC_API_URL || "https://emlakportfoyhavuzu.com/api").replace(/\/api\/?$/, "");
    return `${base}${value}`;
  }
  return undefined;
}

function PremiumProjectPresentation({ presentation }: { presentation: Presentation }) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!activeImage || !element) return;
    if (!element.open) element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previous; };
  }, [activeImage]);

  const p = presentation;
  const person = p.presenter;
  let phone = person?.phone?.replace(/\D/g, "") || "";
  if (phone.length === 11 && phone.startsWith("0")) phone = `9${phone}`;
  else if (phone.length === 10) phone = `90${phone}`;
  if (!/^\d{10,15}$/.test(phone)) phone = "";
  const gallery = [...new Set(p.gallery || [])].filter(url => imageUrl(url));

  return <main className="page">
    <div className="brand"><Building2 size={22} aria-hidden="true" /> EPH · Müşteri Sunumu</div>
    <header className="hero">
      {imageUrl(p.coverUrl) ? <img className="cover" src={imageUrl(p.coverUrl)} alt={`${p.title} genel görünümü`} fetchPriority="high" /> : <div className="cover fallback"><ImageIcon size={52} aria-hidden="true" /><span>Proje sunumu</span></div>}
      <div className="intro"><h1>{p.title}</h1><p className="location"><MapPin size={20} aria-hidden="true" />{p.subtitle}</p>
        {p.constructionStatus && <p className="status">{p.constructionStatus}</p>}
      </div>
    </header>
    <dl className="metrics">
      {([["Toplam", p.metrics.totalUnits], ["Satışta", p.metrics.availableUnits], ["Rezerve", p.metrics.reservedUnits], ["Satılan", p.metrics.closedUnits]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}
    </dl>
    <section className="section prose" aria-labelledby="location-title"><h2 id="location-title">Yaşamın konumu</h2>
      {(p.copy?.location || [p.subtitle]).map((text, index) => <p key={index}>{text}</p>)}
      {p.mapUrl && /^https:\/\/www\.google\.com\/maps\//.test(p.mapUrl) && <a className="action secondary" href={p.mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={20} />Haritada Aç<ArrowUpRight size={18} /></a>}
    </section>
    <section className="section prose" aria-labelledby="project-title"><h2 id="project-title">Projenizi yakından tanıyın</h2>
      {(p.copy?.project || [p.title]).map((text, index) => <p key={index}>{text}</p>)}
    </section>
    <section className="section" aria-labelledby="types-title"><h2 id="types-title">Daire ve bölüm seçenekleri</h2>
      {p.unitTypes?.length ? <div className="tableWrap" tabIndex={0} role="region" aria-label="Bölüm seçenekleri tablosu; yatay kaydırılabilir"><table><caption>Güncel alan ve satış bilgileri</caption><thead><tr><th scope="col">Tip</th><th scope="col">Adet</th><th scope="col">Net m²</th><th scope="col">Brüt m²</th><th scope="col">Fiyat aralığı</th><th scope="col">Satışta</th></tr></thead><tbody>
        {p.unitTypes.map(type => <tr key={type.label}><th scope="row">{type.label}</th><td>{number(type.count)}</td><td>{range(type.netArea)}</td><td>{range(type.grossArea)}</td><td>{type.prices.map(price => <div key={price.currency}>{range(price)} {price.currency}</div>)}{(type.hasUnpriced || !type.prices.length) && <div>Fiyat için arayın</div>}</td><td>{number(type.available)}</td></tr>)}
      </tbody></table></div> : <p className="center">Bölüm seçenekleri için sunumu hazırlayan kişiyle iletişime geçebilirsiniz.</p>}
    </section>
    {!!p.amenities?.length && <section className="section"><h2>Donatılar ve sosyal alanlar</h2><ul className="amenities">{p.amenities.map(item => <li key={item}><Check size={19} aria-hidden="true" />{item}</li>)}</ul></section>}
    {!!gallery.length && <section className="section"><h2>Proje galerisi</h2><p className="center">Fotoğrafları büyütmek için dokunun.</p><div className="gallery">{gallery.map((url, index) => <button key={url} onClick={() => setActiveImage(url)} aria-label={`${index + 1}. proje fotoğrafını tam ekran aç`}><img src={imageUrl(url)} alt={`${p.title} · Proje fotoğrafı ${index + 1}`} loading="lazy" decoding="async" /></button>)}</div></section>}
    {person && <section className="presenter section"><h2>Sunumu Hazırlayan</h2>
      {imageUrl(person.photoUrl) && <img className="portrait" src={imageUrl(person.photoUrl)} alt={person.name} loading="lazy" />}
      <h3>{person.name}</h3>
      {person.office && <div className="office">{imageUrl(person.office.logoUrl) && <img src={imageUrl(person.office.logoUrl)} alt={`${person.office.name} logosu`} loading="lazy" />}<span>{person.office.name}</span></div>}
      {phone && <><p>{person.phone}</p><div className="actions"><a className="action" href={`tel:+${phone}`}><Phone size={20} />Ara</a><a className="action secondary" href={`https://wa.me/${phone}?text=${encodeURIComponent(`${p.title} projesi hakkında bilgi almak istiyorum.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} />WhatsApp</a></div></>}
    </section>}
    <footer>EPH · Emlak Portföy Havuzu<p>Fiyat ve satış durumu değişebilir. Güncel bilgiler için sunumu hazırlayan kişiyle görüşebilirsiniz.</p></footer>
    <dialog ref={dialog} onCancel={() => setActiveImage(null)} onClose={() => setActiveImage(null)} onClick={event => { if (event.target === event.currentTarget) setActiveImage(null); }} aria-label="Proje fotoğrafı">
      <button className="close" onClick={() => setActiveImage(null)} aria-label="Fotoğrafı kapat"><X size={25} /></button>
      {activeImage && <img src={imageUrl(activeImage)} alt={`${p.title} büyütülmüş proje fotoğrafı`} />}
    </dialog>
    <style jsx>{styles}</style>
  </main>;
}

const styles = `
  .page,.state { color:#102e50; background:#f7f9fc; font:12.5pt/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; overflow-wrap:anywhere; }
  .page { min-height:100vh; padding:24px max(18px,calc((100vw - 1120px)/2)); }
  .page,.page :global(*),.state,.state :global(*) { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; }
  .page table,.page button,.page a { font-size:12.5pt; }
  .page ::selection { background:#cfe2f6; color:#102e50; }
  .brand { display:flex; justify-content:center; align-items:center; gap:10px; margin:0 0 24px; font-weight:600; }
  .hero { overflow:hidden; background:white; border-radius:16px; }
  .cover { display:block; width:100%; height:clamp(260px,48vw,530px); object-fit:cover; }
  .fallback { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:14px; background:#e7eff7; color:#355779; }
  .intro { text-align:center; padding:36px 22px; }
  h1 { font-size:clamp(30px,5vw,52px); line-height:1.18; letter-spacing:-.025em; margin:0 0 18px; text-wrap:balance; }
  .location { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px; margin:0; color:#42617e; }
  .status { margin:20px 0 0; font-weight:600; color:#18588a; }
  .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin:0; padding:30px 0; border-bottom:1px solid #ccd9e7; text-align:center; gap:20px; }
  .metrics dd { margin:0; font-size:30px; font-weight:650; font-variant-numeric:tabular-nums; }
  .metrics dt { color:#42617e; }
  .section { padding:48px 0; border-bottom:1px solid #ccd9e7; }
  h2 { text-align:center; font-size:clamp(24px,3vw,32px); line-height:1.3; margin:0 0 28px; letter-spacing:-.02em; text-wrap:balance; }
  h3 { font-size:23px; margin:14px 0 8px; }
  .prose { max-width:74ch; margin:auto; text-align:center; }
  .prose p { margin:0 0 22px; }
  .center { text-align:center; color:#42617e; }
  .action { display:inline-flex; min-height:48px; align-items:center; justify-content:center; gap:10px; padding:10px 24px; background:#1d558d; color:white; border:1px solid #1d558d; border-radius:10px; text-decoration:none; font-weight:600; }
  .secondary { background:white; color:#1d558d; }
  .action:hover { background:#e3edf7; color:#143e68; }
  .tableWrap { overflow:auto; border:1px solid #ccd9e7; border-radius:12px; scrollbar-color:#6989a8 #edf3f9; }
  table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; text-align:center; background:white; }
  caption { padding:14px; color:#42617e; }
  th,td { padding:18px 14px; border-bottom:1px solid #e1e9f2; min-width:90px; }
  thead th { background:#eaf1f8; font-weight:600; }
  td:nth-child(5) { min-width:220px; }
  tbody tr:last-child th,tbody tr:last-child td { border:0; }
  .amenities { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; justify-content:center; gap:12px; }
  .amenities li { display:flex; gap:10px; align-items:center; background:#e9f1f9; padding:12px 18px; border-radius:12px; }
  .amenities :global(svg) { flex-shrink:0; }
  .gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
  .gallery button { border:0; padding:0; background:#e7eff7; border-radius:12px; overflow:hidden; cursor:zoom-in; min-height:44px; }
  .gallery img { display:block; width:100%; aspect-ratio:4/3; object-fit:cover; transition:transform 180ms ease-out; }
  .gallery button:hover img { transform:scale(1.025); }
  .presenter { text-align:center; }
  .portrait { width:96px; height:96px; object-fit:cover; border-radius:50%; margin:auto; }
  .office { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:14px; color:#42617e; }
  .office img { width:64px; height:64px; object-fit:contain; }
  .actions { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
  footer { text-align:center; padding:32px 0; color:#42617e; }
  footer p { max-width:65ch; margin:12px auto 0; }
  dialog { max-width:100vw; max-height:100dvh; width:100vw; height:100dvh; padding:64px 16px 20px; border:0; background:#f7f9fc; }
  dialog::backdrop { background:#e7eff7; }
  dialog>img { display:block; width:100%; height:100%; object-fit:contain; }
  .close { position:absolute; right:16px; top:12px; width:48px; height:48px; border:1px solid #ccd9e7; border-radius:10px; background:white; color:#102e50; display:grid; place-items:center; cursor:pointer; }
  .page a:focus-visible,.page button:focus-visible,.tableWrap:focus-visible { outline:3px solid #2866a5; outline-offset:4px; }
  .state { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:24px; text-align:center; }
  .state h1 { font-size:28px; }.state p { max-width:60ch; }
  .spin { animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
  @media(max-width:640px) { .page { padding:18px 14px; } .brand { margin-bottom:18px; } .intro { padding:28px 18px; } .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } .section { padding:36px 0; } .gallery { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } th,td { padding:14px 10px; } }
  @media(prefers-reduced-motion:reduce) { .spin { animation:none; } .gallery img { transition:none; } }
`;
