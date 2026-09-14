"use client";

import { Calculator, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import api from "@/lib/api";

type Result = {
  currency: string;
  capacity: {
    grossConstructionArea: number;
    saleableArea: number;
    estimatedIndependentUnitCount: number;
  };
  financials: {
    totalCost: number;
    projectedRevenue: number;
    grossProfit: number;
    profitMarginPercent: number;
    breakEvenSalePricePerM2: number;
  };
  assessment: { level: string; message: string };
  unitMix: Array<{
    label: string;
    sharePercent: number;
    estimatedUnitCount: number;
  }>;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FeasibilityPage() {
  const [form, setForm] = useState({
    landArea: "2000",
    floorAreaRatio: "2",
    taksPercent: "40",
    maxFloors: "6",
    commonAreaPercent: "18",
    constructionCostPerM2: "25000",
    salePricePerM2: "60000",
    landCost: "30000000",
    otherCosts: "5000000",
    financingCostPercent: "8",
    marketingCostPercent: "2",
    contingencyPercent: "5",
    twoPlusOneArea: "100",
    twoPlusOneShare: "60",
    threePlusOneArea: "140",
    threePlusOneShare: "40",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value.replace(/[^0-9.,]/g, "") }));
  }

  function number(value: string) {
    return Number(value.replace(",", "."));
  }

  async function calculate() {
    setLoading(true);
    setError("");
    try {
      const response = await api.post<Result>("/project-sales/feasibility/calculate", {
        landArea: number(form.landArea),
        floorAreaRatio: number(form.floorAreaRatio),
        taksPercent: number(form.taksPercent),
        maxFloors: number(form.maxFloors),
        commonAreaPercent: number(form.commonAreaPercent),
        constructionCostPerM2: number(form.constructionCostPerM2),
        salePricePerM2: number(form.salePricePerM2),
        landCost: number(form.landCost),
        otherCosts: number(form.otherCosts),
        financingCostPercent: number(form.financingCostPercent),
        marketingCostPercent: number(form.marketingCostPercent),
        contingencyPercent: number(form.contingencyPercent),
        currency: "TRY",
        unitMix: [
          {
            label: "2+1",
            averageGrossArea: number(form.twoPlusOneArea),
            sharePercent: number(form.twoPlusOneShare),
          },
          {
            label: "3+1",
            averageGrossArea: number(form.threePlusOneArea),
            sharePercent: number(form.threePlusOneShare),
          },
        ],
      });
      setResult(response.data);
    } catch (requestError: any) {
      setResult(null);
      setError(
        requestError?.response?.data?.message ||
          "Fizibilite hesaplanamadı. Girilen değerleri kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<[keyof typeof form, string, string]> = [
    ["landArea", "Arsa m²", "2000"],
    ["floorAreaRatio", "Emsal (KAKS)", "2.00"],
    ["taksPercent", "TAKS %", "40"],
    ["maxFloors", "Azami kat", "6"],
    ["commonAreaPercent", "Ortak alan %", "18"],
    ["constructionCostPerM2", "İnşaat maliyeti / m²", "25000"],
    ["salePricePerM2", "Satış fiyatı / m²", "60000"],
    ["landCost", "Arsa maliyeti", "30000000"],
    ["otherCosts", "Diğer maliyetler", "5000000"],
    ["financingCostPercent", "Finansman %", "8"],
    ["marketingCostPercent", "Pazarlama %", "2"],
    ["contingencyPercent", "Beklenmeyen gider %", "5"],
  ];

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-[calc(18px+env(safe-area-inset-top))] sm:px-6">
        <header className="mb-5 rounded-[28px] border border-blue-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#2563EB] text-white">
            <Calculator size={22} />
          </div>
          <h1 className="mt-3 text-2xl font-black">Arsa / Proje Fizibilite Motoru</h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Arsa, imar ve finansal varsayımlardan yaklaşık yapılabilir alan, maliyet, ciro, kâr ve başa baş satış fiyatını hesaplayın.
          </p>
        </header>

        <section className="rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map(([key, label, placeholder]) => (
              <label key={key} className="text-xs font-black text-slate-600">
                {label}
                <input
                  value={form[key]}
                  onChange={(event) => setField(key, event.target.value)}
                  inputMode="decimal"
                  placeholder={placeholder}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB]"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F4F8FF] p-4">
              <div className="text-sm font-black">2+1 Ürün Karması</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input value={form.twoPlusOneArea} onChange={(e) => setField("twoPlusOneArea", e.target.value)} inputMode="decimal" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Ort. brüt m²" />
                <input value={form.twoPlusOneShare} onChange={(e) => setField("twoPlusOneShare", e.target.value)} inputMode="decimal" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Pay %" />
              </div>
            </div>
            <div className="rounded-2xl bg-[#F4F8FF] p-4">
              <div className="text-sm font-black">3+1 Ürün Karması</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input value={form.threePlusOneArea} onChange={(e) => setField("threePlusOneArea", e.target.value)} inputMode="decimal" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Ort. brüt m²" />
                <input value={form.threePlusOneShare} onChange={(e) => setField("threePlusOneShare", e.target.value)} inputMode="decimal" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Pay %" />
              </div>
            </div>
          </div>

          <button type="button" disabled={loading} onClick={() => void calculate()} className="mx-auto mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Calculator size={18} />}
            Fizibiliteyi Hesapla
          </button>
        </section>

        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        {result ? (
          <section className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ["Brüt İnşaat Alanı", `${result.capacity.grossConstructionArea.toLocaleString("tr-TR")} m²`],
                ["Satılabilir Alan", `${result.capacity.saleableArea.toLocaleString("tr-TR")} m²`],
                ["Toplam Maliyet", money(result.financials.totalCost, result.currency)],
                ["Tahmini Ciro", money(result.financials.projectedRevenue, result.currency)],
                ["Tahmini Kâr", money(result.financials.grossProfit, result.currency)],
              ].map(([title, value]) => (
                <div key={title} className="rounded-2xl border border-[#D8E4F3] bg-white p-4 text-center shadow-sm">
                  <div className="text-xs font-bold text-slate-400">{title}</div>
                  <div className="mt-2 text-base font-black">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#D8E4F3] bg-white p-5 shadow-sm">
                <h2 className="text-center font-black">Finansal Özet</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span>Kâr marjı</span><strong>%{result.financials.profitMarginPercent.toLocaleString("tr-TR")}</strong></div>
                  <div className="flex justify-between"><span>Başa baş satış / m²</span><strong>{money(result.financials.breakEvenSalePricePerM2, result.currency)}</strong></div>
                  <div className="flex justify-between"><span>Tahmini bağımsız bölüm</span><strong>{result.capacity.estimatedIndependentUnitCount}</strong></div>
                </div>
                <div className="mt-4 rounded-2xl bg-[#F4F8FF] p-4 text-center text-sm font-bold">{result.assessment.message}</div>
              </div>

              <div className="rounded-[24px] border border-[#D8E4F3] bg-white p-5 shadow-sm">
                <h2 className="text-center font-black">Ürün Karması</h2>
                <div className="mt-4 space-y-3">
                  {result.unitMix.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#F4F8FF] p-3 text-sm">
                      <strong>{item.label}</strong>
                      <span>%{item.sharePercent} · yaklaşık {item.estimatedUnitCount} adet</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} />
              <p>Bu çıktı karar desteği amaçlı yaklaşık fizibilitedir; resmi imar durumu, ruhsat, ekspertiz, vergi veya finansman görüşü yerine geçmez.</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
