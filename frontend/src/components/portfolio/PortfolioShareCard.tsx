"use client";

import {
  Bath,
  Building2,
  Car,
  Flame,
  Home,
  MapPin,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

export type PortfolioShareFeature = {
  icon: string;
  label: string;
};

export type PortfolioShareData = {
  id: string;
  title: string;
  location: string;
  price: string;
  roomCount: string;
  area: string;
  floor?: string;
  authorization?: string;
  coverImage?: string;
  consultantName?: string;
  consultantPhone?: string;
  portfolioNo?: string;
  score?: number;
  scoreLabel?: string;
  shortDescription?: string;
  longDescription?: string;
  features?: PortfolioShareFeature[];
};

const defaultFeatures: PortfolioShareFeature[] = [
  { icon: "pool", label: "Havuz" },
  { icon: "car", label: "Otopark" },
  { icon: "heat", label: "Yerden Isıtma" },
  { icon: "smart", label: "Akıllı Ev" },
];

function getFeatureIcon(icon: string) {
  const className = "h-4 w-4";

  if (icon === "pool") return <Waves className={className} />;
  if (icon === "car") return <Car className={className} />;
  if (icon === "heat") return <Flame className={className} />;
  if (icon === "smart") return <Sparkles className={className} />;
  if (icon === "bath") return <Bath className={className} />;
  if (icon === "security") return <ShieldCheck className={className} />;

  return <Home className={className} />;
}

export default function PortfolioShareCard({
  data,
}: {
  data: PortfolioShareData;
}) {
  const features = data.features?.length ? data.features : defaultFeatures;

  return (
    <div
      data-share-card="whatsapp"
      className="relative mx-auto w-[390px] overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-[54px] font-black tracking-[-0.06em] text-[#06194A]/[0.055]">
        EPH PORTFÖY HAVUZU
      </div>

      <div className="relative h-[265px] overflow-hidden bg-[#EFF6FF]">
        <img
          src={data.coverImage || "/showcase/stock.jpg"}
          alt={data.title}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/72 via-[#06194A]/10 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1557D6] shadow-lg">
          EPH Yetkili Portföy
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-[#1557D6] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
          Satılık
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
              Portföy Kartı
            </p>

            <h2 className="mt-1 line-clamp-2 text-2xl font-black leading-tight tracking-[-0.04em] text-white">
              {data.title}
            </h2>
          </div>

          <div className="shrink-0 rounded-[20px] bg-white/95 px-3 py-2 text-center shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">
              Karne
            </p>

            <p className="text-xl font-black text-[#1557D6]">
              {data.score || 92}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-30 p-5">
        <div className="rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
            Fiyat
          </p>

          <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[#06194A]">
            {data.price}
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-[#64748B]">
            <MapPin className="h-4 w-4 text-[#1557D6]" />

            <span className="line-clamp-1">{data.location}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <InfoPill
            icon={<Home className="h-4 w-4" />}
            label="Oda"
            value={data.roomCount}
          />

          <InfoPill
            icon={<Maximize2 className="h-4 w-4" />}
            label="Alan"
            value={data.area}
          />

          <InfoPill
            icon={<Building2 className="h-4 w-4" />}
            label="Kat"
            value={data.floor || "—"}
          />

          <InfoPill
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Yetki"
            value={data.authorization || "Alındı"}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {features.slice(0, 4).map((feature) => (
            <div
              key={`${feature.icon}-${feature.label}`}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-xs font-black text-[#27364F]"
            >
              <span className="text-[#1557D6]">
                {getFeatureIcon(feature.icon)}
              </span>

              {feature.label}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-white p-4">
          <p className="line-clamp-2 text-sm font-bold leading-6 text-[#475569]">
            {data.shortDescription ||
              "Site içerisinde, sosyal donatıları güçlü, yerden ısıtmalı ve akıllı ev sistemine sahip yetkili portföy."}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#DDE7F3] pt-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
              Danışman
            </p>

            <p className="mt-1 text-sm font-black text-[#06194A]">
              {data.consultantName || "EPH Üyesi"}
            </p>

            <p className="text-xs font-bold text-[#64748B]">
              {data.consultantPhone || "Telefon bilgisi"}
            </p>
          </div>

          <div className="flex h-[70px] w-[70px] items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] text-center text-[10px] font-black leading-3 text-[#1557D6]">
            QR
            <br />
            KOD
          </div>
        </div>

        <div className="mt-4 rounded-[18px] bg-[#06194A] px-4 py-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
            {data.portfolioNo || "EPH-PORTFOY"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[74px] flex-col items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white p-2 text-center">
      <div className="text-[#1557D6]">{icon}</div>

      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </p>

      <p className="mt-0.5 line-clamp-1 text-xs font-black text-[#06194A]">
        {value}
      </p>
    </div>
  );
}