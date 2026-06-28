"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calculator,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Home,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  X,
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatBudgetInput(value: string) {
  const digits = onlyDigits(value);

  if (!digits) return "";

  return new Intl.NumberFormat("tr-TR").format(Number(digits));
}

function money(value: number) {
  if (!Number.isFinite(value)) return "0 ₺";

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, value))} ₺`;
}

export default function UretkenlikPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<ProductivityUnit[]>([]);
  const [showCreditModal, setShowCreditModal] = useState(false);

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
    <>
      <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] px-3 pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] text-[#06194A]">
        <div className="mx-auto w-full max-w-[430px]">
          <section className="rounded-[28px] border-2 border-[#C7D6E8] bg-white p-4 text-center shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A] active:scale-[0.98]"
                aria-label="Ana sayfaya dön"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex min-h-11 min-w-0 flex-col items-center justify-center text-center">
                <h1 className="flex min-h-[28px] items-center justify-center text-center text-[22px] font-black tracking-[-0.05em] text-[#06194A]">
                  ÜRETKENLİK
                </h1>
                <p className="mt-0.5 text-center text-[10px] font-bold text-[#64748B]">
                  İşinizi kolaylaştıran araçlar
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
              İşlerinizi tek merkezden yönetin
            </h2>
            <p className="mx-auto mt-2 max-w-[340px] text-[12px] font-bold leading-5 text-[#64748B]">
              Belge, toplu portföy ve finans araçlarını tek ekrandan kullanın.
            </p>
          </section>

          <button
            type="button"
            onClick={() => router.push("/portfoy/quality")}
            className="mt-3 w-full rounded-[26px] border-2 border-[#9FC0EA] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EFF6FF] p-4 text-center shadow-[0_16px_34px_rgba(37,99,235,0.12)] active:scale-[0.99]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_10px_22px_rgba(21,87,214,0.24)]">
              <Building2 size={23} />
            </div>

            <h2 className="mt-3 text-center text-[18px] font-black tracking-[-0.03em]">
              Belge Üretim Merkezi
            </h2>
            <p className="mx-auto mt-1 max-w-[330px] text-center text-[11px] font-bold leading-[1.5] text-[#64748B]">
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

          <button
            type="button"
            onClick={() => router.push("/proje-satis-sablonu")}
            className="mt-3 w-full rounded-[26px] border-2 border-[#C4B5FD] bg-gradient-to-br from-white via-[#FAF8FF] to-[#F5F3FF] p-4 text-center shadow-[0_16px_34px_rgba(124,58,237,0.12)] active:scale-[0.99]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#7C3AED] text-white shadow-[0_10px_22px_rgba(124,58,237,0.24)]">
              <FileSpreadsheet size={23} />
            </div>

            <h2 className="mt-3 text-center text-[18px] font-black tracking-[-0.03em]">
              Proje Satış Excel Şablonu
            </h2>

            <p className="mx-auto mt-1 max-w-[340px] text-center text-[11px] font-bold leading-[1.55] text-[#64748B]">
              Proje, blok, kat ve bağımsız bölümleri tek Excel dosyasıyla topluca
              hazırlayın.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniFeature text="Toplu portföy girişi" tone="purple" />
              <MiniFeature text="Esnek proje yapısı" tone="purple" />
              <MiniFeature text="Fotoğraf paketleri" tone="purple" />
              <MiniFeature text="Güvenli aktarım" tone="purple" />
            </div>

            <div className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-[17px] bg-[#7C3AED] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(124,58,237,0.22)]">
              <FileSpreadsheet size={17} />
              Excel Şablonunu Aç
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowCreditModal(true)}
            className="mt-3 w-full rounded-[26px] border-2 border-[#86EFAC] bg-gradient-to-br from-white via-[#F7FFF9] to-[#F0FDF4] p-4 text-center shadow-[0_16px_34px_rgba(22,163,74,0.11)] active:scale-[0.99]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#16A34A] text-white shadow-[0_10px_22px_rgba(22,163,74,0.24)]">
              <Calculator size={23} />
            </div>

            <h2 className="mt-3 text-center text-[18px] font-black tracking-[-0.03em]">
              Banka Kredisi Hesaplama
            </h2>

            <p className="mx-auto mt-1 max-w-[340px] text-center text-[11px] font-bold leading-[1.55] text-[#64748B]">
              Konut değeri, peşinat, vade ve faiz oranına göre tahmini kredi
              ödemesini hesaplayın.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniFeature text="Kredi tutarı" tone="green" />
              <MiniFeature text="Aylık taksit" tone="green" />
              <MiniFeature text="Toplam ödeme" tone="green" />
              <MiniFeature text="Toplam faiz" tone="green" />
            </div>

            <div className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-[17px] bg-[#16A34A] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)]">
              <WalletCards size={17} />
              Kredi Hesaplayıcıyı Aç
            </div>
          </button>

          <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-black text-[#1557D6]">
              Üretkenlik araçları
            </p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
              Belge üretimi, toplu proje girişi ve finans araçları bu merkezde
              toplanır.
            </p>
          </section>
        </div>
      </main>

      {showCreditModal && (
        <CreditCalculatorModal onClose={() => setShowCreditModal(false)} />
      )}
    </>
  );
}

function CreditCalculatorModal({ onClose }: { onClose: () => void }) {
  const [propertyValue, setPropertyValue] = useState("4000000");
  const [downPayment, setDownPayment] = useState("1000000");
  const [months, setMonths] = useState("120");
  const [monthlyRate, setMonthlyRate] = useState("2.89");

  const propertyAmount = Number(onlyDigits(propertyValue));
  const downPaymentAmount = Number(onlyDigits(downPayment));
  const principal = Math.max(propertyAmount - downPaymentAmount, 0);
  const installmentCount = Math.max(Number(months) || 0, 1);
  const rate =
    Math.max(Number(monthlyRate.replace(",", ".")) || 0, 0) / 100;

  const monthlyPayment =
    rate > 0
      ? (principal *
          rate *
          Math.pow(1 + rate, installmentCount)) /
        (Math.pow(1 + rate, installmentCount) - 1)
      : principal / installmentCount;

  const totalPayment = monthlyPayment * installmentCount;
  const totalInterest = Math.max(totalPayment - principal, 0);
  const downPaymentRate =
    propertyAmount > 0
      ? Math.round((downPaymentAmount / propertyAmount) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-[#1F2937]/50 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[min(92dvh,860px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border-2 border-[#C7D6E8] bg-white shadow-[0_-18px_48px_rgba(31,41,55,0.18)] md:h-auto md:max-h-[90dvh] md:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 border-b border-[#C7D6E8] bg-white/95 px-4 pb-4 pt-[calc(14px+env(safe-area-inset-top))] text-center backdrop-blur">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#C7D6E8] md:hidden" />

          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#1F2937] shadow-sm active:scale-[0.98]"
              aria-label="Üretkenlik sayfasına dön"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="flex min-h-14 min-w-0 items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border-2 border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
                <Calculator size={27} />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#64748B] shadow-sm active:scale-[0.98]"
              aria-label="Kredi hesaplayıcıyı kapat"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="mx-auto mt-3 flex min-h-[58px] max-w-[290px] items-center justify-center text-center text-[24px] font-black leading-tight tracking-tight text-[#1F2937] md:max-w-none md:text-[28px]">
            Konut Kredisi Hesaplayıcı
          </h2>

          <p className="mx-auto mt-2 max-w-md text-center text-xs font-bold leading-5 text-[#64748B]">
            Tutar, vade ve faiz oranına göre tahmini ödeme planınızı görün.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-[calc(22px+env(safe-area-inset-bottom))]">
          <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
            <MortgageInputRow
              icon={<Home size={21} />}
              title="Konut Değeri"
              helper="Satın alınacak konutun fiyatı"
              value={propertyValue}
              onChange={setPropertyValue}
              suffix="₺"
            />

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <MortgageInputRow
              icon={<WalletCards size={21} />}
              title="Peşinat Tutarı"
              helper={`Peşinat oranı: %${downPaymentRate}`}
              value={downPayment}
              onChange={setDownPayment}
              suffix="₺"
            />

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <CalendarDays size={21} />
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-black text-[#1F2937]">Vade</p>
                    <p className="text-[11px] font-bold text-[#64748B]">
                      12 - 240 ay
                    </p>
                  </div>

                  <select
                    className="h-11 min-w-[132px] rounded-2xl border-2 border-[#C7D6E8] bg-[#EEF3F8] px-3 text-center text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
                    value={months}
                    onChange={(event) => setMonths(event.target.value)}
                  >
                    {[12, 24, 36, 48, 60, 84, 120, 180, 240].map(
                      (month) => (
                        <option key={month} value={String(month)}>
                          {month} Ay
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[60, 120, 180].map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setMonths(String(month))}
                      className={`h-9 rounded-2xl border text-[11px] font-black ${
                        months === String(month)
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"
                      }`}
                    >
                      {month} Ay
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Target size={21} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-black text-[#1F2937]">
                      Aylık Faiz Oranı
                    </p>
                    <p className="text-[11px] font-bold text-[#64748B]">
                      Bankanın güncel oranını yazın
                    </p>
                  </div>

                  <div className="relative w-[116px] shrink-0">
                    <input
                      className="h-11 w-full rounded-2xl border-2 border-[#C7D6E8] bg-[#EEF3F8] pl-3 pr-8 text-center text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
                      inputMode="decimal"
                      value={monthlyRate}
                      onChange={(event) =>
                        setMonthlyRate(
                          event.target.value
                            .replace(/[^0-9,.]/g, "")
                            .replace(".", ","),
                        )
                      }
                    />
                    <span className="absolute right-3 top-3 text-sm font-black text-[#64748B]">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-left">
                  <p className="text-xs font-black uppercase tracking-wide text-[#64748B]">
                    Kredi Tutarı
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
                    Konut değeri - peşinat
                  </p>
                </div>
                <p className="shrink-0 text-[20px] font-black text-[#2563EB]">
                  {money(principal)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-left text-sm font-black text-[#1F2937]">
                Hesaplama Sonucu
              </h3>
              <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-[10px] font-black text-[#15803D]">
                Tahmini
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MortgageResult
                title="Aylık Taksit"
                value={money(Math.round(monthlyPayment))}
              />
              <MortgageResult
                title="Toplam Ödeme"
                value={money(Math.round(totalPayment))}
                tone="green"
              />
              <MortgageResult
                title="Toplam Faiz"
                value={money(Math.round(totalInterest))}
                tone="orange"
              />
              <MortgageResult
                title="Aylık Faiz"
                value={`%${monthlyRate || "0"}`}
                tone="purple"
              />
            </div>

            <div className="mt-3 rounded-[20px] bg-[#F8FAFC] px-3 py-3 text-left">
              <p className="text-xs font-black text-[#1F2937]">
                Bilgilendirme
              </p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
                Sonuçlar bilgilendirme amaçlıdır. Masraf, sigorta, ekspertiz,
                vergi ve banka onay koşulları hesaplamaya dahil değildir.
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[#1557D6] px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]"
          >
            Hesaplamayı Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}

function MortgageInputRow({
  icon,
  title,
  helper,
  value,
  onChange,
  suffix,
}: {
  icon: React.ReactNode;
  title: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-left">
            <p className="text-sm font-black text-[#1F2937]">{title}</p>
            <p className="text-[11px] font-bold text-[#64748B]">{helper}</p>
          </div>

          <div className="relative w-[148px] max-w-[54%] shrink-0">
            <input
              className="h-11 w-full rounded-2xl border-2 border-[#C7D6E8] bg-[#EEF3F8] pl-3 pr-8 text-right text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
              inputMode="numeric"
              value={formatBudgetInput(value)}
              onChange={(event) => onChange(onlyDigits(event.target.value))}
            />
            <span className="absolute right-3 top-3 text-sm font-black text-[#64748B]">
              {suffix}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MortgageResult({
  title,
  value,
  tone = "blue",
}: {
  title: string;
  value: string;
  tone?: "blue" | "green" | "orange" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "orange"
        ? "bg-orange-50 text-orange-600"
        : tone === "purple"
          ? "bg-violet-50 text-violet-700"
          : "bg-[#EFF6FF] text-[#2563EB]";

  return (
    <div className="min-w-0 rounded-[20px] border-2 border-[#C7D6E8] bg-white p-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div
        className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}
      >
        <WalletCards size={18} />
      </div>
      <p className="min-h-[26px] text-[10px] font-black uppercase leading-[1.25] text-[#64748B]">
        {title}
      </p>
      <p className="mt-1 break-words text-[14px] font-black leading-tight text-[#1F2937]">
        {value}
      </p>
    </div>
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

function MiniFeature({
  text,
  tone,
}: {
  text: string;
  tone: "purple" | "green";
}) {
  const classes =
    tone === "green"
      ? "border-[#BBF7D0] text-[#15803D]"
      : "border-[#DDD6FE] text-[#5B21B6]";

  return (
    <div
      className={`flex min-h-[38px] items-center justify-center rounded-[14px] border bg-white px-2 py-2 text-center text-[10px] font-black leading-[1.35] ${classes}`}
    >
      {text}
    </div>
  );
}
