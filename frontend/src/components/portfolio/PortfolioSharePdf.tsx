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
import type {
  PortfolioShareData,
  PortfolioShareFeature,
} from "./PortfolioShareCard";

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

const defaultFeatures: PortfolioShareFeature[] = [
  { icon: "pool", label: "Açık / Kapalı Havuz" },
  { icon: "car", label: "Kapalı Otopark" },
  { icon: "heat", label: "Yerden Isıtma" },
  { icon: "smart", label: "Akıllı Ev" },
  { icon: "bath", label: "Ebeveyn Banyosu" },
  { icon: "security", label: "7/24 Güvenlik" },
];

export default function PortfolioSharePdf({
  data,
}: {
  data: PortfolioShareData;
}) {
  const features = data.features?.length ? data.features : defaultFeatures;

  return (
    <div
      data-share-card="pdf"
      className="relative mx-auto min-h-[760px] w-[540px] overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-[66px] font-black tracking-[-0.06em] text-[#06194A]/[0.045]">
        EPH PORTFÖY HAVUZU
      </div>

      <div className="relative h-[285px] overflow-hidden bg-[#EFF6FF]">
        <img
          src={data.coverImage || "/showcase/stock.jpg"}
          alt={data.title}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06194A]/78 via-transparent to-transparent" />

        <div className="absolute left-6 top-6 rounded-full bg-white/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#1557D6]">
          EPH PDF Broşür
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.055em] text-white">
            {data.title}
          </h1>

          <div className="mt-3 flex items-center gap-2 text-sm font-black text-white/90">
            <MapPin className="h-4 w-4" />
            {data.location}
          </div>
        </div>
      </div>

      <div className="relative z-30 p-6">
        <div className="grid grid-cols-[1fr_150px] gap-4">
          <div className="rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#64748B]">
              Satış Fiyatı
            </p>

            <p className="mt-1 text-4xl font-black tracking-[-0.06em] text-[#06194A]">
              {data.price}
            </p>
          </div>

          <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">
              Karne
            </p>

            <p className="mt-1 text-4xl font-black text-[#1557D6]">
              {data.score || 92}
            </p>

            <p className="text-xs font-black text-[#06194A]">
              {data.scoreLabel || "Pekiyi"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <PdfInfo
            icon={<Home className="h-4 w-4" />}
            label="Oda"
            value={data.roomCount}
          />

          <PdfInfo
            icon={<Maximize2 className="h-4 w-4" />}
            label="Alan"
            value={data.area}
          />

          <PdfInfo
            icon={<Building2 className="h-4 w-4" />}
            label="Kat"
            value={data.floor || "—"}
          />

          <PdfInfo
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Yetki"
            value={data.authorization || "Alındı"}
          />
        </div>

        <div className="mt-5 rounded-[26px] border border-[#DDE7F3] bg-white p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1557D6]">
            Portföy Açıklaması
          </p>

          <p className="mt-3 text-sm font-semibold leading-7 text-[#475569]">
            {data.longDescription ||
              "Denizli Merkezefendi Şemikler Mahallesi’nde, site içerisinde yer alan 170 m² büyüklüğündeki 3+1 daire satılıktır. Daire 9. katta konumlanmıştır. Yerden ısıtma, akıllı ev sistemi, sosyal donatılar ve güvenli site yaşamı ile öne çıkan yetkili portföydür."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {features.slice(0, 6).map((feature) => (
            <div
              key={`${feature.icon}-${feature.label}`}
              className="flex min-h-[48px] items-center gap-3 rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 text-sm font-black text-[#27364F]"
            >
              <span className="text-[#1557D6]">
                {getFeatureIcon(feature.icon)}
              </span>

              {feature.label}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#DDE7F3] pt-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
              Danışman
            </p>

            <p className="mt-1 text-base font-black text-[#06194A]">
              {data.consultantName || "EPH Üyesi"}
            </p>

            <p className="text-sm font-bold text-[#64748B]">
              {data.consultantPhone || "Telefon bilgisi"}
            </p>

            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#1557D6]">
              {data.portfolioNo || "EPH-PORTFOY"}
            </p>
          </div>

          <div className="flex h-[90px] w-[90px] items-center justify-center rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] text-center text-[11px] font-black leading-3 text-[#1557D6]">
            QR
            <br />
            KOD
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#DDE7F3] bg-white p-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>

      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#06194A]">{value}</p>
    </div>
  );
}