"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type ProductivityUnit = {
  id: string;
  status?: string | null;
  isVerified?: boolean | null;
  tapuVerified?: boolean | null;
  photoVerified?: boolean | null;
  yetkiVerified?: boolean | null;
};

const ACTIVE_STATUSES = [
  "SATILIK",
  "KIRALIK",
  "GUNLUK_KIRALIK",
  "DEVREN_SATILIK",
  "DEVREN_KIRALIK",
  "ON_SATIS",
  "PROJE_ASAMASI",
  "YAKINDA_SATISTA",
  "INSAAT_PROJESI",
  "HEMEN_TESLIM",
];

function isUnitVerified(unit: ProductivityUnit) {
  return Boolean(
    unit.isVerified ||
      (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
  );
}

export default function UretkenlikPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<ProductivityUnit[]>([]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    const fetchUnits = async () => {
      try {
        setLoading(true);
        const response = await api.get("/units");
        setUnits(Array.isArray(response.data) ? response.data : []);
      } catch {
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [hydrated, router, user]);

  const activeCount = useMemo(
    () =>
      units.filter((unit) =>
        ACTIVE_STATUSES.includes(String(unit.status || "")),
      ).length,
    [units],
  );

  const verifiedCount = useMemo(
    () => units.filter((unit) => isUnitVerified(unit)).length,
    [units],
  );

  const waitingCount = Math.max(0, units.length - verifiedCount);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F8FF] px-4 text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={32} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">
            Üretkenlik merkezi hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] px-3 pb-[calc(110px+env(safe-area-inset-bottom))] pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px]">
        <section className="rounded-[28px] border-2 border-[#C7D6E8] bg-white p-4 text-center shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A] active:scale-[0.98]"
              aria-label="Geri dön"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <h1 className="text-[22px] font-black tracking-[-0.05em] text-[#06194A]">
                ÜRETKENLİK
              </h1>
              <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                Belge ve içerik üretim merkezi
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
              <Sparkles size={20} />
            </div>
          </div>

          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#1557D6] text-white shadow-[0_12px_26px_rgba(21,87,214,0.28)]">
            <FileText size={26} />
          </div>

          <h2 className="mt-3 text-[21px] font-black tracking-[-0.04em]">
            İşlerinizi tek merkezden üretin
          </h2>
          <p className="mx-auto mt-2 max-w-[340px] text-[12px] font-bold leading-5 text-[#64748B]">
            Portföy belgelerini yönetin, yenileyin ve incelemeye hazır hâle
            getirin.
          </p>
        </section>

        <button
          type="button"
          onClick={() => router.push("/portfoy/quality")}
          className="mt-3 w-full rounded-[26px] border-2 border-[#C7D6E8] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EFF6FF] p-4 text-center shadow-[0_16px_34px_rgba(37,99,235,0.12)] active:scale-[0.99]"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_10px_22px_rgba(21,87,214,0.24)]">
            <Building2 size={23} />
          </div>

          <h2 className="mt-3 text-[18px] font-black tracking-[-0.03em]">
            Belge Üretim Merkezi
          </h2>
          <p className="mx-auto mt-1 max-w-[330px] text-[11px] font-bold leading-[1.5] text-[#64748B]">
            Yetki belgesi, tapu ve portföy evraklarını yükleyin, yenileyin ve
            kontrol edin.
          </p>

          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-white">
            <Metric label="Toplam" value={units.length} />
            <Metric label="Aktif" value={activeCount} tone="blue" />
            <Metric label="Bekleyen" value={waitingCount} tone="orange" />
          </div>

          <div className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-[17px] bg-[#1557D6] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
            <ShieldCheck size={17} />
            Belge Merkezini Aç
          </div>
        </button>

        <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black text-[#1557D6]">
            Üretkenlik araçları
          </p>
          <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
            Yeni belge, sunum ve paylaşım araçları bu merkezde toplanacak.
          </p>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "blue" | "orange";
}) {
  const color =
    tone === "blue"
      ? "text-[#1557D6]"
      : tone === "orange"
        ? "text-orange-600"
        : "text-[#06194A]";

  return (
    <div className="border-r border-[#E2EAF5] px-1.5 py-2.5 last:border-r-0">
      <p className={`text-[16px] font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}
