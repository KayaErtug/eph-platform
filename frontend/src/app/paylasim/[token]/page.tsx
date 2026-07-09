"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
} from "lucide-react";

import api from "@/lib/api";
import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";
import {
  decodePortfolioMetadataState,
  getFeatureLabels,
  getMetadataLabel,
} from "@/components/stok/portfolioFeatureMetadata";

type SharedUnit = {
  ephId: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  netArea?: number | null;
  grossArea?: number | null;
  floor?: number | null;
  floorLabel?: string | null;
  totalFloors?: number | null;
  conceptLabel?: string | null;
  facades?: string[] | null;
  features?: string[] | null;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
  isVerified?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  project?: {
    name?: string | null;
    city?: string | null;
    district?: string | null;
  } | null;
  sharedBy?: { fullName: string; phone: string | null } | null;
};

function formatPrice(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmemiş";

  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function typeLabel(type?: string | null) {
  if (!type) return "Portföy";
  return String(type).replaceAll("_", " ");
}

function getGalleryImages(unit: SharedUnit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  return Array.from(
    new Set(images.map((item) => item.supabaseUrl || item.url || "").filter(Boolean)),
  );
}

function getWhatsAppLink(phone: string, ephId: string) {
  const digits = phone.replace(/\D/g, "");
  const message = `Merhaba, ${ephId} numaralı Havuz portföyü hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

type SpecItem = { label: string; value: string };

function getSpecs(unit: SharedUnit): SpecItem[] {
  const specs: SpecItem[] = [
    { label: "Portföy Tipi", value: typeLabel(unit.type) },
    {
      label: "İşlem",
      value: unit.status ? String(unit.status).replaceAll("_", " ") : "Havuz",
    },
  ];

  if (unit.roomCount) specs.push({ label: "Oda Planı", value: unit.roomCount });
  if (unit.area) specs.push({ label: "Alan", value: `${unit.area} m²` });
  if (unit.netArea) specs.push({ label: "Net Alan", value: `${unit.netArea} m²` });
  if (unit.grossArea) specs.push({ label: "Brüt Alan", value: `${unit.grossArea} m²` });
  if (unit.floorLabel || (unit.floor !== null && unit.floor !== undefined)) {
    specs.push({ label: "Kat", value: unit.floorLabel || String(unit.floor) });
  }
  if (unit.totalFloors) specs.push({ label: "Toplam Kat", value: String(unit.totalFloors) });
  if (unit.conceptLabel) specs.push({ label: "Konsept", value: unit.conceptLabel });
  if (Array.isArray(unit.facades) && unit.facades.length > 0) {
    specs.push({ label: "Cephe", value: unit.facades.join(", ") });
  }

  const metadata = decodePortfolioMetadataState(unit.features);
  Object.entries(metadata).forEach(([key, value]) => {
    specs.push({ label: getMetadataLabel(key), value });
  });

  return specs;
}

export default function PoolSharePage() {
  const params = useParams();
  const token = String(params?.token || "");

  const [unit, setUnit] = useState<SharedUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!token) return;

    let active = true;

    (async () => {
      try {
        const response = await api.get(`/pool-share/${token}`);
        if (active) setUnit(response.data);
      } catch (err: any) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Bu paylaşım bağlantısı geçersiz veya artık aktif değil.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="text-[13px] font-black text-[#64748B]">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F1F5F9] px-6 text-center">
        <Building2 size={40} className="text-[#94A3B8]" />
        <p className="max-w-xs text-[13px] font-black leading-5 text-[#1F2937]">
          {error || "Portföy bulunamadı."}
        </p>
      </div>
    );
  }

  const location =
    [unit.project?.city, unit.project?.district].filter(Boolean).join(" / ") ||
    "Konum belirtilmemiş";
  const galleryImages = getGalleryImages(unit);
  const activeImage = galleryImages[galleryIndex] || galleryImages[0] || "";
  const specs = getSpecs(unit);
  const featureLabels = getFeatureLabels(unit.features);
  const sharerPhone = unit.sharedBy?.phone || "";

  const goPrevImage = () => {
    if (galleryImages.length <= 1) return;
    setGalleryIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  };

  const goNextImage = () => {
    if (galleryImages.length <= 1) return;
    setGalleryIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  };

  const trustBadges = [
    { active: Boolean(unit.tapuVerified), label: "Tapu Doğrulandı" },
    { active: Boolean(unit.photoVerified), label: "Fotoğraf Doğrulandı" },
    { active: Boolean(unit.yetkiVerified), label: "Yetki Doğrulandı" },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-3 py-6">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
          EPH · Emlak Portföy Havuzu
        </p>

        <section className="overflow-hidden rounded-[26px] border-2 border-[#C7D6E8] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
          <div className="relative h-[280px] bg-[#EAF1FB] sm:h-[320px]">
            <PremiumPropertyImage
              src={activeImage}
              alt={unit.project?.name || "Portföy"}
              className="h-full w-full"
              loading="eager"
              fallback={<Building2 size={40} />}
              fallbackClassName="text-[#2563EB]"
            />

            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/30" />

            <div className="absolute left-3 top-3 z-[2] rounded-full bg-slate-950/82 px-3 py-1.5 text-[10px] font-black text-white shadow-sm">
              {galleryImages.length > 0
                ? `${galleryIndex + 1} / ${galleryImages.length} Fotoğraf`
                : "Fotoğraf Yok"}
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  aria-label="Önceki fotoğraf"
                  className="absolute left-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-[0_10px_22px_rgba(15,23,42,0.20)]"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  aria-label="Sonraki fotoğraf"
                  className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-[0_10px_22px_rgba(15,23,42,0.20)]"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto border-t-2 border-[#E2EAF5] bg-[#F8FAFC] p-2 [-webkit-overflow-scrolling:touch]">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className={`relative h-[52px] w-[68px] shrink-0 overflow-hidden rounded-[12px] border-2 ${
                    index === galleryIndex
                      ? "border-[#2563EB] ring-2 ring-[#BFDBFE]"
                      : "border-[#E2EAF5]"
                  }`}
                  aria-label={`Fotoğraf ${index + 1}`}
                >
                  <PremiumPropertyImage
                    src={image}
                    alt=""
                    className="h-full w-full"
                    fallback={<Building2 size={16} />}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="px-4 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              {typeLabel(unit.type)} • {unit.ephId}
            </p>
            <h1 className="mt-1 text-[19px] font-black leading-tight text-[#0F172A]">
              {unit.project?.name || "EPH Portföyü"}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-bold text-[#64748B]">
              <MapPin size={13} /> {location}
            </p>
            <p className="mt-2 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-1.5 text-[17px] font-black text-white">
              {formatPrice(unit.price, unit.priceCurrency)}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 border-t-2 border-[#E2EAF5] bg-white px-3 py-2.5">
            {trustBadges.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-black ${
                  badge.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                <CheckCircle2 size={11} />
                {badge.active ? badge.label : `${badge.label.replace(" Doğrulandı", "")} Bekliyor`}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t-2 border-[#E2EAF5] bg-[#F8FAFC] p-2.5">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="rounded-[14px] bg-white px-2 py-2 text-center"
              >
                <p className="text-[8.5px] font-black uppercase tracking-[0.05em] text-[#64748B]">
                  {spec.label}
                </p>
                <p className="mt-0.5 text-[11px] font-black text-[#0F172A]">
                  {spec.value}
                </p>
              </div>
            ))}
          </div>

          {featureLabels.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 border-t-2 border-[#E2EAF5] px-4 py-3">
              {featureLabels.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-black text-[#1D4ED8]"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}

          {unit.description && (
            <div className="border-t-2 border-[#E2EAF5] px-4 py-3 text-center text-[12.5px] font-bold leading-5 text-[#475569]">
              {unit.description}
            </div>
          )}
        </section>

        {unit.sharedBy && (
          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-white p-4 text-center shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Bu İlanı Sizinle Paylaşan
            </p>
            <p className="mt-1 text-[15px] font-black text-[#0F172A]">
              {unit.sharedBy.fullName}
            </p>

            {sharerPhone && (
              <a
                href={getWhatsAppLink(sharerPhone, unit.ephId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#16A34A] px-4 text-[13px] font-black text-white"
              >
                <MessageCircle size={16} /> WhatsApp'tan Yaz
              </a>
            )}
          </section>
        )}

        <p className="mx-auto mt-4 max-w-[340px] text-center text-[10px] font-bold leading-4 text-[#94A3B8]">
          Bu sayfa yalnızca sizinle paylaşılan bu tekil portföyü gösterir. EPH
          Platformu'nun diğer bölümlerine erişim üyelik gerektirir.
        </p>
      </div>
    </div>
  );
}
