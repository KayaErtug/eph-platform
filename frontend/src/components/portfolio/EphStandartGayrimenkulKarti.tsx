"use client";

import {
  BedDouble,
  Building2,
  Car,
  Compass,
  Flame,
  Home,
  Layers3,
  MapPin,
  Maximize2,
  Mountain,
  Ruler,
  ShieldCheck,
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
  EphCardVariant,
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
  status: ShieldCheck,
  bed: BedDouble,
  "open-area": Trees,
  "closed-area": Building2,
  usage: Sparkles,
  class: Star,
  building: Building2,
};

type Props = {
  data: EphPremiumCardData;
  variant?: EphCardVariant;
  className?: string;
};

function variantClasses(variant: EphCardVariant) {
  if (variant === "instagram-post") {
    return "w-[420px] min-h-[525px] rounded-[34px]";
  }

  if (variant === "story" || variant === "reel") {
    return "h-[760px] w-[428px] rounded-[36px]";
  }

  if (variant === "whatsapp") {
    return "w-[390px] min-h-[820px] rounded-[34px]";
  }

  return "w-full rounded-[30px]";
}

function imageHeightClass(variant: EphCardVariant) {
  if (variant === "story" || variant === "reel") return "h-[330px]";
  if (variant === "instagram-post") return "h-[210px]";
  if (variant === "detail") return "h-[300px]";
  return "h-[250px]";
}

function factGridClass(variant: EphCardVariant) {
  if (variant === "instagram-post") return "grid-cols-4";
  return "grid-cols-2";
}

function featureLimit(variant: EphCardVariant) {
  if (variant === "instagram-post") return 4;
  if (variant === "story" || variant === "reel") return 6;
  return 8;
}

export default function EphStandartGayrimenkulKarti({
  data,
  variant = "detail",
  className = "",
}: Props) {
  const isStory = variant === "story" || variant === "reel";
  const isCompact = variant === "instagram-post";
  const visibleFeatures = data.additionalFeatures.slice(0, featureLimit(variant));

  return (
    <article
      data-eph-premium-card={variant}
      className={`relative mx-auto overflow-hidden border border-[#C7D6E8] bg-white shadow-[0_28px_80px_rgba(6,25,74,0.17)] ${variantClasses(variant)} ${className}`}
    >
      <div className={`relative overflow-hidden bg-[#06194A] ${imageHeightClass(variant)}`}>
        <img
          src={data.coverImage || "/showcase/stock.jpg"}
          alt={data.title}
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,25,74,0.12),rgba(6,25,74,0.14)_42%,rgba(6,25,74,0.92))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.25),transparent_24%)]" />

        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/60 bg-white/94 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6] shadow-lg backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            {data.authorization}
          </div>
          <div className="rounded-full border border-white/15 bg-[#1557D6] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
            {data.status}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
            <Sparkles className="h-4 w-4" />
            EPH Premium Portföy Kartı
          </div>
          <h2 className={`${isStory ? "text-[34px]" : isCompact ? "text-[24px]" : "text-[28px]"} line-clamp-2 font-black leading-[1.02] tracking-[-0.045em] text-white`}>
            {data.title}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-[12px] font-extrabold text-white/88">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{data.location}</span>
          </div>
        </div>
      </div>

      <div className={`${isStory ? "p-4" : isCompact ? "p-3.5" : "p-4"}`}>
        <div className="rounded-[24px] border border-[#DDE7F3] bg-[linear-gradient(135deg,#F8FBFF,#EEF5FF)] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748B]">
            {data.propertyType}
          </p>
          <p className={`${isStory ? "text-[29px]" : "text-[25px]"} mt-1 font-black tracking-[-0.045em] text-[#06194A]`}>
            {data.price}
          </p>
        </div>

        <div className={`mt-3 grid gap-2 ${factGridClass(variant)}`}>
          {data.facts.map((item) => (
            <FactBox key={item.key} item={item} compact={isCompact} />
          ))}
        </div>

        {visibleFeatures.length > 0 && (
          <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#1557D6]">
              <Star className="h-4 w-4" />
              İlave Özellikler
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleFeatures.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-[#D7E4F3] bg-[#F4F8FF] px-2.5 py-1.5 text-[9px] font-extrabold leading-3 text-[#27364F]"
                >
                  {feature}
                </span>
              ))}
            </div>
          </section>
        )}

        {!isCompact && (
          <p className={`mt-3 line-clamp-2 rounded-[20px] border border-[#DDE7F3] bg-[#F8FAFC] px-3 py-2.5 text-[11px] font-bold leading-5 text-[#475569] ${isStory ? "min-h-[58px]" : ""}`}>
            {data.description}
          </p>
        )}

        <footer className="mt-3 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#06194A,#0C2A6B_58%,#1557D6)] px-4 py-3 text-white shadow-[0_16px_30px_rgba(6,25,74,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/60">
                EPH Danışmanı
              </p>
              <p className="mt-1 truncate text-[12px] font-black">
                {data.consultantName}
              </p>
              <p className="mt-0.5 truncate text-[9px] font-bold text-white/70">
                {data.consultantPhone}
              </p>
            </div>
            <div className="shrink-0 rounded-[14px] border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/55">
                Portföy No
              </p>
              <p className="mt-1 text-[9px] font-black">{data.portfolioNo}</p>
            </div>
          </div>
        </footer>
      </div>

      <div className="pointer-events-none absolute -right-20 top-1/2 -rotate-90 text-[34px] font-black tracking-[-0.05em] text-[#06194A]/[0.025]">
        EMLAK PORTFÖY HAVUZU
      </div>
    </article>
  );
}

function FactBox({
  item,
  compact,
}: {
  item: EphCardFact;
  compact: boolean;
}) {
  const Icon = ICONS[item.icon] || Home;

  return (
    <div
      className={`flex min-w-0 flex-col items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-[#F8FBFF] px-2 text-center ${compact ? "min-h-[64px] py-2" : "min-h-[72px] py-2.5"}`}
    >
      <Icon className="h-4 w-4 text-[#1557D6]" strokeWidth={2.25} />
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#64748B]">
        {item.label}
      </p>
      <p className={`${compact ? "text-[10px]" : "text-[12px]"} mt-1 line-clamp-2 font-black leading-4 text-[#06194A]`}>
        {item.value}
      </p>
    </div>
  );
}
