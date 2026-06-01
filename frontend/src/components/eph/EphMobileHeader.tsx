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
        bg-white
        border-b
        border-slate-200
      "
    >
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="
              h-10
              w-10
              rounded-xl
              border
              border-slate-200
              flex
              items-center
              justify-center
            "
          >
            <ArrowLeft size={20} />
          </button>

          <button
            className="
              h-10
              w-10
              rounded-xl
              border
              border-slate-200
              flex
              items-center
              justify-center
            "
          >
            <Bell size={20} />
          </button>
        </div>

        <div className="pb-4 pt-3 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}