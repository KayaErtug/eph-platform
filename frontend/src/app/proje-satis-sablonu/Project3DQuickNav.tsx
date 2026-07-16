"use client";

import { Box } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function Project3DQuickNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/proje-satis-sablonu/3d")) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/proje-satis-sablonu/3d")}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-[70] inline-flex h-12 items-center gap-2 rounded-2xl border border-blue-400/40 bg-gradient-to-r from-slate-950 to-blue-700 px-4 text-xs font-black text-white shadow-[0_12px_35px_rgba(30,64,175,0.34)] active:scale-95 md:bottom-6 md:right-6"
      aria-label="3D Proje Stüdyosunu aç"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
        <Box size={16} />
      </span>
      3D Stüdyo
    </button>
  );
}
