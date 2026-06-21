"use client";

import { ShieldCheck } from "lucide-react";

import type { PortfolioAuthorityDocument } from "@/components/stok/stokTypes";

type LinaDocumentPrecheckPanelProps = {
  document?: PortfolioAuthorityDocument | null;
};

type UnknownRecord = Record<string, unknown>;

function readDocumentValue(
  document: PortfolioAuthorityDocument | null | undefined,
  key: string,
) {
  return (document as unknown as UnknownRecord | undefined)?.[key];
}

function normalizeText(value?: unknown) {
  return String(value || "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function formatDocumentType(value?: unknown) {
  const normalized = normalizeText(value);

  if (normalized === "TAPU") return "Tapu";
  if (normalized === "KIMLIK") return "Kimlik";
  if (normalized === "YETKI_BELGESI") return "Yetki Belgesi";
  if (normalized === "VERGI_LEVHASI") return "Vergi Levhası";
  if (normalized === "DIGER") return "Diğer";

  return String(value || "").trim() || "Belirlenemedi";
}

function formatScore(value?: unknown) {
  if (value === undefined || value === null || value === "") return "--";

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return String(value);

  return `${Math.round(numeric)}/100`;
}

function formatQrDetected(value?: unknown) {
  if (value === true) return "Var";
  if (value === false) return "Yok";
  return "Bekliyor";
}

function formatRiskLevel(value?: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) return "Analiz Bekleniyor";
  if (normalized === "LOW" || normalized === "DUSUK") return "Düşük Risk";
  if (normalized === "MEDIUM" || normalized === "ORTA") return "Orta Risk";
  if (normalized === "HIGH" || normalized === "YUKSEK") return "Yüksek Risk";

  return String(value || "Analiz Bekleniyor");
}

function getRiskBadgeClass(value?: unknown) {
  const normalized = normalizeText(value);

  if (normalized === "LOW" || normalized === "DUSUK") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalized === "MEDIUM" || normalized === "ORTA") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalized === "HIGH" || normalized === "YUKSEK") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-[#F7FBFF] text-[#64748B]";
}

export default function LinaDocumentPrecheckPanel({
  document,
}: LinaDocumentPrecheckPanelProps) {
  const documentType = readDocumentValue(document, "documentType");
  const ocrQualityScore = readDocumentValue(document, "ocrQualityScore");
  const confidenceScore = readDocumentValue(document, "confidenceScore");
  const riskLevel = readDocumentValue(document, "riskLevel");
  const qrDetected = readDocumentValue(document, "qrDetected");
  const summary = String(
    readDocumentValue(document, "linaSummary") ||
      "Lina analizi bekleniyor. Belge yüklendiğinde ön kontrol sonucu burada görünecek.",
  );

  return (
    <div className="mt-2 rounded-[16px] border border-[#BFDBFE] bg-[#EFF6FF] p-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-[#1557D6]">
        <ShieldCheck size={15} />
        <p className="text-[12px] font-black text-[#06194A]">
          Lina Ön Kontrol V2
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <LinaPrecheckMetric label="Belge Türü" value={formatDocumentType(documentType)} />
        <LinaPrecheckMetric label="OCR Kalitesi" value={formatScore(ocrQualityScore)} />
        <LinaPrecheckMetric label="Güven Skoru" value={formatScore(confidenceScore)} />
        <LinaPrecheckMetric label="QR Kod" value={formatQrDetected(qrDetected)} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${getRiskBadgeClass(riskLevel)}`}
        >
          {formatRiskLevel(riskLevel)}
        </span>
      </div>

      <p className="mx-auto mt-2 max-w-[300px] text-center text-[10px] font-bold leading-4 text-[#475569]">
        {summary}
      </p>
    </div>
  );
}

function LinaPrecheckMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-white bg-white/80 px-2 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-0.5 break-words text-[11px] font-black leading-4 text-[#06194A]">
        {value}
      </p>
    </div>
  );
}
