"use client";

import { Box, Flame, Radar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function Project3DQuickNav() {
  const pathname = usePathname();
  const router = useRouter();

  const on3D = pathname.startsWith("/proje-satis-sablonu/3d");
  const onRadar = pathname.startsWith("/proje-satis-sablonu/firsat-radari");
  const onHeatmap = pathname.startsWith("/proje-satis-sablonu/talep-isi-haritasi");

  if (on3D) return null;

  return (
    <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-[70] flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      {!onHeatmap ? (
        <button
          type="button"
          onClick={() => router.push("/proje-satis-sablonu/talep-isi-haritasi")}
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-xs font-black text-orange-600 shadow-[0_12px_32px_rgba(249,115,22,0.14)] active:scale-95"
          aria-label="Talep Isı Haritasını aç"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50">
            <Flame size={16} />
          </span>
          Talep Isı Haritası
        </button>
      ) : null}

      {!onRadar ? (
        <button
          type="button"
          onClick={() => router.push("/proje-satis-sablonu/firsat-radari")}
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-xs font-black text-[#2563EB] shadow-[0_12px_32px_rgba(37,99,235,0.16)] active:scale-95"
          aria-label="Satış Fırsat Radarını aç"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#EFF6FF]">
            <Radar size={16} />
          </span>
          Fırsat Radarı
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => router.push("/proje-satis-sablonu/3d")}
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-blue-400/40 bg-gradient-to-r from-slate-950 to-blue-700 px-4 text-xs font-black text-white shadow-[0_12px_35px_rgba(30,64,175,0.34)] active:scale-95"
        aria-label="3D Proje Stüdyosunu aç"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
          <Box size={16} />
        </span>
        3D Stüdyo
      </button>
    </div>
  );
}
