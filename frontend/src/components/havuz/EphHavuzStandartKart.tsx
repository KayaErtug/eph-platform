"use client";

import {
  BedDouble,
  Building2,
  Car,
  Compass,
  Eye,
  Flame,
  Home,
  Layers3,
  MapPin,
  Maximize2,
  MessageCircle,
  Mountain,
  Ruler,
  Sparkles,
  Star,
  Target,
  Trees,
  TrendingUp,
  WalletCards,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type {
  EphCardFact,
  EphCardIconKey,
  EphPremiumCardData,
} from "@/components/portfolio/ephPremiumCardStandard";

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
  matchScore: number;
  availableCreditLabel?: string | null;
  isOwnPortfolio: boolean;
  selected?: boolean;
  busy?: boolean;
  messageBusy?: boolean;
  canUsePoolActions: boolean;
  onDetail: () => void;
  onMessage: () => void;
  onInterest: () => void;
};

function FactCell({ item }: { item: EphCardFact }) {
  const Icon = ICONS[item.icon] || Home;

  return (
    <div className="flex min-h-[62px] min-w-0 flex-col items-center justify-center rounded-[15px] border border-[#DCE7F4] bg-[linear-gradient(180deg,#FFFFFF,#F5F9FF)] px-1.5 py-1.5 text-center shadow-[0_6px_14px_rgba(15,23,42,0.04)]">
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

export default function EphHavuzStandartKart({
  data,
  photoCount,
  matchScore,
  availableCreditLabel,
  isOwnPortfolio,
  selected = false,
  busy = false,
  messageBusy = false,
  canUsePoolActions,
  onDetail,
  onMessage,
  onInterest,
}: Props) {
  const visibleFeatures = data.additionalFeatures.slice(0, 5);
  const remainingFeatureCount = Math.max(
    0,
    data.additionalFeatures.length - visibleFeatures.length,
  );

  return (
    <article
      className={`relative w-full max-w-full overflow-hidden rounded-[24px] border border-[#C7D6E8] bg-white shadow-[0_20px_50px_rgba(6,25,74,0.13)] transition-all duration-300 ${
        selected ? "ring-4 ring-[#BFDBFE]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onDetail}
        className="group relative block h-[205px] w-full overflow-hidden bg-[#06194A] text-left"
        aria-label={`${data.title} detayını aç`}
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
          <span className="max-w-[48%] truncate rounded-full bg-[#1557D6] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
            {data.status}
          </span>
          <span className="max-w-[48%] truncate rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[9px] font-black text-white backdrop-blur">
            {photoCount} Fotoğraf
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4 text-center">
          <p className="line-clamp-2 text-[22px] font-black leading-[24px] tracking-[-0.04em] text-white drop-shadow-lg">
            {data.title}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-white/90">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{data.location}</span>
          </div>
        </div>
      </button>

      <div className="p-2.5">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full border border-[#D7E4F3] bg-[#F4F8FF] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#1557D6]">
            {data.propertyType}
          </span>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-700">
            Havuzda
          </span>
          {matchScore > 0 && (
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
              Eşleşme %{Math.round(matchScore)}
            </span>
          )}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] border border-[#DCE7F4] bg-[linear-gradient(135deg,#F8FBFF,#EEF5FF)] px-3 py-2">
          <p className="min-w-0 truncate text-[22px] font-black tracking-[-0.045em] text-[#06194A]">
            {data.price}
          </p>
          <span className="shrink-0 rounded-[12px] border border-[#D7E4F3] bg-white px-2.5 py-2 text-[8px] font-black text-[#1557D6] shadow-sm">
            {data.portfolioNo}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {data.facts.slice(0, 8).map((item) => (
            <FactCell key={item.key} item={item} />
          ))}
        </div>

        <div className="mt-2 flex min-h-[34px] items-center gap-1.5 overflow-x-auto rounded-[15px] border border-[#E2EAF4] bg-[#F8FAFC] px-2 py-1.5">
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
              İlave özellik eklenmedi
            </span>
          )}
        </div>

        {availableCreditLabel && (
          <div className="mt-2 flex min-h-[36px] items-center justify-center gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 text-center">
            <WalletCards className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="text-[9px] font-black text-emerald-700">
              Kullanılabilir Kredi
            </span>
            <span className="text-[10px] font-black text-emerald-900">
              {availableCreditLabel}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-[#E2EAF5] bg-[#F8FAFC] p-2.5">
        {isOwnPortfolio ? (
          <div className="flex min-h-[44px] items-center justify-center rounded-[13px] border border-[#C7D6E8] bg-white px-3 text-center text-[11px] font-black leading-4 text-[#64748B]">
            Bu portföy size ait
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onDetail}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-[12px] bg-white px-1 text-[10px] font-black text-[#1557D6] shadow-sm active:scale-[0.98]"
            >
              <Eye className="h-3.5 w-3.5" />
              Detay
            </button>
            <button
              type="button"
              onClick={onMessage}
              disabled={busy || !canUsePoolActions}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-[12px] bg-white px-1 text-[10px] font-black text-[#475569] shadow-sm disabled:opacity-60"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#1557D6]" />
              {messageBusy ? "Açılıyor" : "İletişim 3K"}
            </button>
            <button
              type="button"
              onClick={onInterest}
              disabled={busy || !canUsePoolActions}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-[12px] bg-[#1557D6] px-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(21,87,214,0.22)] disabled:opacity-60"
            >
              <Target className="h-3.5 w-3.5" />
              İlgilen 10K
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
