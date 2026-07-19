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
  status?: string;
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

function getShareFeatureLabels(data: PortfolioShareData) {
  const labels = (data.features || [])
    .map((feature) => String(feature.label || "").trim())
    .filter(Boolean);

  return labels.length > 0
    ? labels.slice(0, 8)
    : ["Portföy Bilgisi"];
}

function getFeatureIcon(label: string) {
  const className = "h-4 w-4";
  const normalized = label.toLocaleLowerCase("tr-TR");

  if (normalized.includes("havuz")) return <Waves className={className} />;
  if (normalized.includes("otopark") || normalized.includes("şarj")) return <Car className={className} />;
  if (normalized.includes("hamam") || normalized.includes("sauna") || normalized.includes("ısı")) return <Flame className={className} />;
  if (normalized.includes("akıllı")) return <Sparkles className={className} />;
  if (normalized.includes("banyo")) return <Bath className={className} />;
  if (normalized.includes("güven")) return <ShieldCheck className={className} />;

  return <Home className={className} />;
}

export default function PortfolioShareCard({
  data,
}: {
  data: PortfolioShareData;
}) {
  const marketingLabels = getShareFeatureLabels(data);

  return (
    <div
      data-share-card="whatsapp"
      className="relative mx-auto w-[390px] overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
    >
      <div className="pointer-events-none absolute left-1/2 top-[54%] z-20 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-center font-black tracking-[-0.06em] text-[#06194A]/[0.035]">
        <div className="text-[54px] leading-[0.95]">EMLAK</div>
        <div className="text-[54px] leading-[0.95]">PORTFÖY</div>
        <div className="text-[54px] leading-[0.95]">HAVUZU</div>
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
          {data.authorization === "Yetkili"
            ? "EPH Yetkili Portföy"
            : "EPH Portföy"}
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-[#1557D6] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
          {data.status || "Portföy"}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
            Portföy Kartı
          </p>

          <h2 className="mt-1 line-clamp-2 text-2xl font-black leading-tight tracking-[-0.04em] text-white">
            {data.title}
          </h2>
        </div>
      </div>

      <div className="relative z-30 p-5">
        <div className="rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
            Fiyat
          </p>

          <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[#06194A]">
            {data.price}
          </p>

          <div className="mt-3 flex items-center justify-center gap-2 text-sm font-extrabold text-[#64748B]">
            <MapPin className="h-4 w-4 text-[#1557D6]" />

            <span className="line-clamp-1">{data.location}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <InfoPill label="Oda" value={data.roomCount} />
          <InfoPill label="Alan" value={data.area} />
          <InfoPill label="Kat" value={data.floor || "—"} />
          <InfoPill label="Yetki" value={data.authorization || "Kontrol"} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {marketingLabels.map((label) => (
            <div
              key={label}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-center text-[11px] font-black text-[#27364F]"
            >
              <span className="text-[#1557D6]">
                {getFeatureIcon(label)}
              </span>

              {label}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-white p-4">
          <p className="line-clamp-2 text-sm font-bold leading-6 text-[#475569]">
            {data.shortDescription ||
              "Bu portföy için açıklama paylaşılmadı."}
          </p>
        </div>

        <div className="mt-5 rounded-[18px] bg-[#06194A] px-4 py-4 text-center">
          <p className="text-sm font-black text-white">
            {data.consultantName || "EPH Danışmanı"}
          </p>
          <p className="mt-1 text-xs font-bold text-white/75">
            {data.consultantPhone || "Telefon paylaşılmadı"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[74px] flex-col items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white p-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-xs font-black leading-4 text-[#06194A]">
        {value}
      </p>
    </div>
  );
}
