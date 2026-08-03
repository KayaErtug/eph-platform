"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import api from "@/lib/api";
import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";
import { getFeatureLabels } from "@/components/stok/portfolioFeatureMetadata";
import {
  getPresentationStatusLabel,
  getPropertyPresentationCards,
  type PropertyPresentationInput,
} from "@/components/presentation/propertyPresentation";

type SharedUnit = PropertyPresentationInput & {
  ephId: string;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
  isVerified?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  project?: PropertyPresentationInput["project"] & {
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  sharedBy?: {
    fullName: string;
    phone: string | null;
    profileImageUrl?: string | null;
    memberCode?: string | null;
    officeName?: string | null;
    isVerified?: boolean;
  } | null;
  presentation?: {
    source?: "POOL" | "PORTFOLIO";
    expiresAt?: string | null;
    durationHours?: number;
  } | null;
};

function formatPrice(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmemiş";

  const symbols: Record<string, string> = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  return `${numeric.toLocaleString("tr-TR")} ${symbols[currency || "TRY"] || currency || "₺"}`;
}

function getGalleryImages(unit: SharedUnit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  return Array.from(
    new Set(
      images
        .map((item) => item.supabaseUrl || item.url || "")
        .filter(Boolean),
    ),
  );
}

function getWhatsAppLink(phone: string, ephId: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `90${digits.slice(1)}` : digits;
  const message = `Merhaba, ${ephId} numaralı portföy hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerPresentationPage({
  legacyEndpoint,
}: {
  legacyEndpoint?: "pool-share" | "portfolio-share";
}) {
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
        const response = await api.get(`/customer-presentation/${token}`);
        if (active) setUnit(response.data);
      } catch (primaryError: any) {
        if (legacyEndpoint) {
          try {
            const response = await api.get(`/${legacyEndpoint}/${token}`);
            if (active) setUnit(response.data);
            return;
          } catch (legacyError: any) {
            if (active) {
              setError(
                legacyError?.response?.data?.message ||
                  primaryError?.response?.data?.message ||
                  "Bu müşteri sunumu geçersiz veya artık aktif değil.",
              );
            }
            return;
          }
        }

        if (active) {
          setError(
            primaryError?.response?.data?.message ||
              "Bu müşteri sunumu geçersiz veya artık aktif değil.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [legacyEndpoint, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8FF]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">
            Müşteri sunumu hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F4F8FF] px-6 text-center">
        <Building2 size={42} className="text-[#94A3B8]" />
        <h1 className="text-[18px] font-black text-[#0F172A]">
          Sunum Açılmadı
        </h1>
        <p className="max-w-sm text-[12px] font-bold leading-5 text-[#64748B]">
          {error || "Portföy bulunamadı."}
        </p>
      </div>
    );
  }

  const galleryImages = getGalleryImages(unit);
  const activeImage = galleryImages[galleryIndex] || galleryImages[0] || "";
  const cards = getPropertyPresentationCards(unit);
  const featureLabels = getFeatureLabels(unit.features).slice(0, 12);
  const sharerPhone = unit.sharedBy?.phone || "";
  const expiryText = formatDate(unit.presentation?.expiresAt);
  const statusLabel = getPresentationStatusLabel(unit.status);
  const location =
    [unit.project?.city, unit.project?.district, unit.project?.neighborhood]
      .filter(Boolean)
      .join(" / ") || "Konum belirtilmemiş";

  const trustBadges = [
    { active: Boolean(unit.tapuVerified), label: "Tapu" },
    { active: Boolean(unit.photoVerified), label: "Fotoğraf" },
    { active: Boolean(unit.yetkiVerified || unit.isVerified), label: "Yetki" },
  ];

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

  const recordWhatsappClick = () => {
    void api.post(`/customer-presentation/${token}/whatsapp-click`).catch(() => null);
  };

  return (
    <main className="min-h-screen bg-[#F4F8FF] px-3 py-5 text-[#1F2937]">
      <div className="mx-auto w-full max-w-[480px]">
        <header className="mb-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2563EB]">
            EPH · Emlak Portföy Havuzu
          </p>
          <h1 className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[#0F172A]">
            Müşteri Sunumu
          </h1>
          {expiryText && (
            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-[#64748B]">
              <Clock3 size={12} /> {expiryText} tarihine kadar geçerli
            </p>
          )}
        </header>

        <section className="overflow-hidden rounded-[28px] border-2 border-[#C7D6E8] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="relative h-[300px] overflow-hidden bg-[#EAF1FB] sm:h-[350px]">
            <PremiumPropertyImage
              src={activeImage}
              alt={unit.project?.name || "Portföy"}
              className="h-full w-full"
              loading="eager"
              fallback={<Building2 size={44} />}
              fallbackClassName="text-[#2563EB]"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/45" />

            <div className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black text-white">
              {galleryImages.length > 0
                ? `${galleryIndex + 1} / ${galleryImages.length} Fotoğraf`
                : "Fotoğraf Yok"}
            </div>

            <div className="absolute right-3 top-3 rounded-full bg-[#2563EB] px-3 py-1.5 text-[10px] font-black text-white">
              {statusLabel}
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-lg"
                  aria-label="Önceki fotoğraf"
                >
                  <ChevronLeft size={21} />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-white/92 text-[#1F2937] shadow-lg"
                  aria-label="Sonraki fotoğraf"
                >
                  <ChevronRight size={21} />
                </button>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto border-t-2 border-[#E2EAF5] bg-[#F8FAFC] p-2">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className={`h-[54px] w-[72px] shrink-0 overflow-hidden rounded-[12px] border-2 ${
                    index === galleryIndex
                      ? "border-[#2563EB] ring-2 ring-[#BFDBFE]"
                      : "border-[#E2EAF5]"
                  }`}
                  aria-label={`${index + 1}. fotoğraf`}
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
              {String(unit.type || "Portföy").replaceAll("_", " ")} · {unit.ephId}
            </p>
            <h2 className="mx-auto mt-1 max-w-[390px] text-[20px] font-black leading-tight tracking-[-0.03em] text-[#0F172A]">
              {unit.project?.name || "EPH Portföyü"}
            </h2>
            <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-bold text-[#64748B]">
              <MapPin size={14} /> {location}
            </p>
            <p className="mt-3 inline-flex rounded-full bg-[#2563EB] px-6 py-2 text-[18px] font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]">
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
                {badge.label} {badge.active ? "Doğrulandı" : "Bekliyor"}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t-2 border-[#E2EAF5] bg-[#F8FAFC] p-2.5 sm:grid-cols-3">
            {cards.map((item) => (
              <div
                key={item.key}
                className="flex min-h-[92px] min-w-0 flex-col items-center justify-center rounded-[16px] border-2 border-[#DCE7F5] bg-white px-2 py-2 text-center"
              >
                <span className="text-[20px]">{item.icon}</span>
                <p className="mt-1 text-[8.5px] font-black uppercase tracking-[0.05em] text-[#64748B]">
                  {item.label}
                </p>
                <p className="mt-0.5 break-words text-[11px] font-black leading-4 text-[#0F172A] [overflow-wrap:anywhere]">
                  {item.value}
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
            <div className="border-t-2 border-[#E2EAF5] px-4 py-4 text-center text-[12.5px] font-bold leading-5 text-[#475569]">
              {unit.description}
            </div>
          )}
        </section>

        {unit.sharedBy && (
          <section className="mt-3 rounded-[24px] border-2 border-[#C7D6E8] bg-white p-4 text-center shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
            <p className="text-[9.5px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Bu Sunumu Sizinle Paylaşan
            </p>

            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
                {unit.sharedBy.profileImageUrl ? (
                  <img
                    src={unit.sharedBy.profileImageUrl}
                    alt={unit.sharedBy.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={24} />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="flex items-center gap-1 break-words text-[15px] font-black text-[#0F172A]">
                  {unit.sharedBy.fullName}
                  {unit.sharedBy.isVerified && (
                    <BadgeCheck size={15} className="shrink-0 text-[#2563EB]" />
                  )}
                </p>
                {unit.sharedBy.officeName && (
                  <p className="mt-0.5 text-[10.5px] font-bold text-[#64748B]">
                    {unit.sharedBy.officeName}
                  </p>
                )}
                {unit.sharedBy.memberCode && (
                  <p className="mt-0.5 text-[9.5px] font-black text-[#2563EB]">
                    EPH Üye No: {unit.sharedBy.memberCode}
                  </p>
                )}
              </div>
            </div>

            {sharerPhone && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${sharerPhone}`}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] border-2 border-[#2563EB] bg-[#EFF6FF] text-[12px] font-black text-[#1D4ED8]"
                >
                  <Phone size={16} /> Ara
                </a>
                <a
                  href={getWhatsAppLink(sharerPhone, unit.ephId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordWhatsappClick}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] bg-[#16A34A] text-[12px] font-black text-white"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            )}
          </section>
        )}

        <p className="mx-auto mt-4 max-w-[390px] text-center text-[10px] font-bold leading-4 text-[#94A3B8]">
          Bu sunum EPH üzerinden oluşturulmuştur. Portföy sahibinin özel kullanıcı bilgileri paylaşılmaz.
        </p>
      </div>
    </main>
  );
}
