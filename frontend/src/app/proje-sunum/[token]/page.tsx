"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
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
>;

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

    const load = async () => {
      try {
        const poolResponse = await api.get<PoolProjectPresentationResponse>(
          `/pool-project-share/${encodeURIComponent(token)}`,
        );
        if (!alive) return;
        setPageData({ mode: "POOL", data: poolResponse.data });
        setError("");
      } catch (poolError: any) {
        try {
          const legacyResponse = await api.get<LegacyPresentationResponse>(
            `/project-presentation-share/${encodeURIComponent(token)}`,
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
    () => presentation.availableUnits.slice(0, 80),
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
                Canlı Satış Stoku
              </p>
              <h2 className="mt-1 text-[18px] font-black">
                Satışa Açık Bağımsız Bölümler
              </h2>
            </div>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[10px] font-black text-[#1D4ED8]">
              {presentation.availableUnits.length}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                className="rounded-[17px] border-2 border-[#D7E2F0] bg-[#F8FAFC] p-3"
              >
                <strong>{unit.title || unit.type}</strong>
                <p className="mt-1 text-[10px] font-bold text-[#64748B]">
                  {unit.type}
                  {unit.roomCount ? ` · ${unit.roomCount}` : ""}
                </p>
                <p className="mt-2 text-[12px] font-black text-[#2563EB]">
                  {formatMoney(unit.price, unit.priceCurrency || "TRY")}
                </p>
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
