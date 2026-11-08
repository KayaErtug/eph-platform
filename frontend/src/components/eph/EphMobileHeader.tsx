"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
};

export default function EphMobileHeader({ title }: Props) {
  const router = useRouter();

  return (
    <header
      className="
        sticky
        top-0
        z-50
        bg-white/95
        backdrop-blur-md
        border-b
        border-slate-200
      "
    >
      <div className="px-3 py-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="flex items-center justify-start">
            <button
              onClick={() => router.push("/dashboard")}
              className="
                h-11
                w-11
                min-h-[44px]
                min-w-[44px]
                rounded-xl
                border
                border-slate-200
                bg-white
                flex
                items-center
                justify-center
                text-slate-700
                transition
                hover:bg-slate-50
              "
              aria-label="Geri dön"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="px-2 text-center min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center justify-end">
            <button
              className="
                h-11
                w-11
                min-h-[44px]
                min-w-[44px]
                rounded-xl
                border
                border-slate-200
                bg-white
                flex
                items-center
                justify-center
                text-slate-700
                transition
                hover:bg-slate-50
              "
              aria-label="Bildirimler"
            >
              <Bell size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}