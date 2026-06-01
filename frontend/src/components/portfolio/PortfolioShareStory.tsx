"use client";

import { MapPin, ShieldCheck, Star } from "lucide-react";
import type { PortfolioShareData } from "./PortfolioShareCard";

export default function PortfolioShareStory({
  data,
}: {
  data: PortfolioShareData;
}) {
  return (
    <div
      data-share-card="story"
      className="relative mx-auto h-[760px] w-[428px] overflow-hidden rounded-[34px] bg-[#06194A] shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
    >
      <img
        src={data.coverImage || "/showcase/stock.jpg"}
        alt={data.title}
        className="absolute inset-0 h-full w-full object-cover"
        crossOrigin="anonymous"
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,25,74,0.35),rgba(6,25,74,0.14)_38%,rgba(6,25,74,0.95)),radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.18),transparent_28%)]" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-[58px] font-black tracking-[-0.06em] text-white/[0.075]">
        EPH PORTFÖY HAVUZU
      </div>

      <div className="relative z-30 flex h-full flex-col justify-between p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-full bg-white/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#1557D6]">
            EPH Portföy
          </div>

          <div className="rounded-full bg-[#1557D6] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            Satılık
          </div>
        </div>

        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white backdrop-blur">
            <Star className="h-4 w-4" />
            {data.scoreLabel || "Pekiyi Portföy"} · {data.score || 92}/100
          </div>

          <h1 className="max-w-[360px] text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white">
            {data.title}
          </h1>

          <div className="mt-5 flex items-center gap-2 text-base font-black text-white/90">
            <MapPin className="h-5 w-5" />
            {data.location}
          </div>

          <div className="mt-7 rounded-[30px] bg-white/94 p-5 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#64748B]">
              Fiyat
            </p>

            <p className="mt-1 text-4xl font-black tracking-[-0.06em] text-[#06194A]">
              {data.price}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StoryPill label="Oda" value={data.roomCount} />

              <StoryPill label="Alan" value={data.area} />

              <StoryPill label="Kat" value={data.floor || "—"} />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] bg-white/14 p-4 text-sm font-bold leading-6 text-white backdrop-blur">
            {data.shortDescription ||
              "Sosyal donatıları güçlü, yetkili portföy statüsünde, paylaşım için hazır ilan kartı."}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-black text-white backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Yetkili Portföy
            </div>

            <p className="mt-4 text-sm font-black text-white">
              {data.consultantName || "EPH Üyesi"}
            </p>

            <p className="text-xs font-bold text-white/72">
              {data.consultantPhone || "Telefon bilgisi"}
            </p>
          </div>

          <div className="flex h-[82px] w-[82px] items-center justify-center rounded-[24px] bg-white text-center text-[11px] font-black leading-3 text-[#1557D6]">
            QR
            <br />
            KOD
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#F7FBFF] px-2 py-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#64748B]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#06194A]">{value}</p>
    </div>
  );
}