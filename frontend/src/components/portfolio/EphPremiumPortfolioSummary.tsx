"use client";

import Link from "next/link";
import {
  BedDouble,
  Building2,
  Car,
  Check,
  Compass,
  Copy,
  Flame,
  Home,
  Layers3,
  MapPin,
  Maximize2,
  MessageCircle,
  Mountain,
  Presentation,
  Ruler,
  Send,
  Share2,
  Sparkles,
  Star,
  Trees,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type {
  EphCardFact,
  EphCardIconKey,
  EphPremiumCardData,
} from "./ephPremiumCardStandard";

const ICONS: Record<EphCardIconKey, LucideIcon> = {
  room: BedDouble,
  area: Maximize2,
  floor: Layers3,
  age: Building2,
  heating: Flame,
  parking: Car,
  front: Compass,
  elevator: TrendingUp,
  home: Home,
  layout: Building2,
  land: Trees,
  view: Mountain,
  pool: Waves,
  zoning: Ruler,
  parcel: MapPin,
  status: Star,
  bed: BedDouble,
  "open-area": Trees,
  "closed-area": Building2,
  usage: Sparkles,
  class: Star,
  building: Building2,
};

type Props = {
  data: EphPremiumCardData;
  photoCount: number;
  maxPhotoCount?: number;
  copied?: boolean;
  onOpenGallery: () => void;
  onCopyLink: () => void;
  onNativeShare: () => void;
  onShareCard: () => void;
  onPresentation: () => void;
};

function FactCell({ item }: { item: EphCardFact }) {
  const Icon = ICONS[item.icon] || Home;

  return (
    <div className="flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-[15px] border border-[#DCE7F4] bg-[linear-gradient(180deg,#FFFFFF,#F5F9FF)] px-1.5 py-1.5 text-center shadow-[0_7px_16px_rgba(15,23,42,0.045)]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#1557D6]" strokeWidth={2.35} />
      <p className="mt-1 line-clamp-1 text-[7px] font-black uppercase tracking-[0.08em] text-[#718096]">
        {item.label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] font-black leading-[12px] text-[#06194A]">
        {item.value || "—"}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  className = "",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[46px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-center text-[9px] font-black transition active:scale-[0.98] ${className}`}
    >
      {icon}
      <span className="line-clamp-1">{label}</span>
    </button>
  );
}

export default function EphPremiumPortfolioSummary({
  data,
  photoCount,
  maxPhotoCount = 15,
  copied = false,
  onOpenGallery,
  onCopyLink,
  onNativeShare,
  onShareCard,
  onPresentation,
}: Props) {
  const visibleFeatures = data.additionalFeatures.slice(0, 8);
  const remainingFeatureCount = Math.max(
    0,
    data.additionalFeatures.length - visibleFeatures.length,
  );

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#C7D6E8] bg-white shadow-[0_24px_64px_rgba(6,25,74,0.15)]">
      <button
        type="button"
        onClick={onOpenGallery}
        className="group relative block h-[205px] w-full overflow-hidden bg-[#06194A] text-left"
        aria-label="Portföy galerisini aç"
      >
        <img
          src={data.coverImage || "/showcase/stock.jpg"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-xl"
        />
        <img
          src={data.coverImage || "/showcase/stock.jpg"}
          alt={data.title}
          className="absolute inset-0 h-full w-full object-contain transition duration-500 group-hover:scale-[1.015]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,25,74,0.08),rgba(6,25,74,0.08)_38%,rgba(6,25,74,0.94))]" />

        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#1557D6] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
            {data.status}
          </span>
          <span className="rounded-full border border-white/20 bg-black/38 px-3 py-1.5 text-[9px] font-black text-white backdrop-blur">
            {photoCount}/{maxPhotoCount} Fotoğraf
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4 text-center">
          <p className="line-clamp-2 text-[23px] font-black leading-[25px] tracking-[-0.04em] text-white drop-shadow-lg">
            {data.title}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-white/90">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{data.location}</span>
          </div>
        </div>
      </button>

      <div className="p-2.5">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] border border-[#DCE7F4] bg-[linear-gradient(135deg,#F8FBFF,#EEF5FF)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="min-w-0">
            <p className="line-clamp-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#64748B]">
              {data.propertyType}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[22px] font-black tracking-[-0.045em] text-[#06194A]">
              {data.price}
            </p>
          </div>
          <button
            type="button"
            onClick={onCopyLink}
            className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-[14px] border border-[#D7E4F3] bg-white px-2.5 text-[9px] font-black text-[#1557D6] shadow-sm"
            aria-label="Portföy bağlantısını kopyala"
          >
            <span>{data.portfolioNo}</span>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {data.facts.slice(0, 8).map((item) => (
            <FactCell key={item.key} item={item} />
          ))}
        </div>

        <div className="mt-2 flex min-h-[32px] items-center gap-1.5 overflow-x-auto rounded-[15px] border border-[#E2EAF4] bg-[#F8FAFC] px-2 py-1.5">
          <Star className="h-3.5 w-3.5 shrink-0 text-[#1557D6]" />
          {visibleFeatures.length > 0 ? (
            <>
              {visibleFeatures.map((feature) => (
                <span
                  key={feature}
                  className="shrink-0 rounded-full border border-[#D7E4F3] bg-white px-2 py-1 text-[8px] font-black text-[#334155]"
                >
                  {feature}
                </span>
              ))}
              {remainingFeatureCount > 0 && (
                <span className="shrink-0 rounded-full bg-[#1557D6] px-2 py-1 text-[8px] font-black text-white">
                  +{remainingFeatureCount}
                </span>
              )}
            </>
          ) : (
            <span className="text-[8px] font-bold text-[#64748B]">
              İlave özellik seçilmedi
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 min-h-[30px] rounded-[15px] border border-[#E2EAF4] bg-white px-2.5 py-1.5 text-center text-[9px] font-bold leading-[14px] text-[#475569]">
          {data.description}
        </p>

        <div className="mt-2 grid grid-cols-[1fr_208px] items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#06194A,#0C2A6B_58%,#1557D6)] p-2 text-white shadow-[0_14px_28px_rgba(6,25,74,0.18)]">
          <div className="min-w-0 px-1">
            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/55">
              EPH Danışmanı
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] font-black">
              {data.consultantName}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <Link
              href="/messages"
              className="flex min-h-[46px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] bg-white/10 px-1 text-center text-[9px] font-black text-white transition active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Mesaj</span>
            </Link>
            <ActionButton
              label="WhatsApp"
              icon={<Send className="h-4 w-4" />}
              onClick={onNativeShare}
              className="bg-emerald-500 text-white"
            />
            <ActionButton
              label="Sunum"
              icon={<Presentation className="h-4 w-4" />}
              onClick={onPresentation}
              className="bg-violet-500 text-white"
            />
            <ActionButton
              label="Kart / QR"
              icon={<Share2 className="h-4 w-4" />}
              onClick={onShareCard}
              className="bg-white text-[#1557D6]"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
