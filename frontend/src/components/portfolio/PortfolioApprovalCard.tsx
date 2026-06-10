"use client";

type ApprovalStatus =
  | "TASLAK"
  | "BELGE_BEKLENIYOR"
  | "INCELEMEYE_GONDERILDI"
  | "INCELEMEDE"
  | "EKSIK_BILGI_BEKLENIYOR"
  | "ONAYLANDI"
  | "HAVUZDA"
  | "REDDEDILDI";

interface PortfolioApprovalCardProps {
  status?: ApprovalStatus | string;
  approvalNote?: string | null;
  approvedAt?: string | null;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  TASLAK: {
    label: "Taslak",
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
  BELGE_BEKLENIYOR: {
    label: "Belge Bekleniyor",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  INCELEMEYE_GONDERILDI: {
    label: "İncelemeye Gönderildi",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  INCELEMEDE: {
    label: "İncelemede",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  EKSIK_BILGI_BEKLENIYOR: {
    label: "Eksik Bilgi Bekleniyor",
    bg: "bg-orange-100",
    text: "text-orange-700",
  },
  ONAYLANDI: {
    label: "Onaylandı",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  HAVUZDA: {
    label: "Havuzda Yayında",
    bg: "bg-green-100",
    text: "text-green-700",
  },
  REDDEDILDI: {
    label: "Reddedildi",
    bg: "bg-rose-100",
    text: "text-rose-700",
  },
};

export default function PortfolioApprovalCard({
  status,
  approvalNote,
  approvedAt,
}: PortfolioApprovalCardProps) {
  const config =
    STATUS_CONFIG[status || ""] ||
    STATUS_CONFIG["TASLAK"];

  return (
    <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <div className="text-center">
        <h2 className="text-[16px] font-black text-[#06194A]">
          Portföy Onay Durumu
        </h2>

        <div
          className={`mt-3 inline-flex rounded-full px-4 py-2 text-[12px] font-black ${config.bg} ${config.text}`}
        >
          {config.label}
        </div>

        {approvedAt && (
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            Onay Tarihi:{" "}
            {new Date(approvedAt).toLocaleDateString("tr-TR")}
          </p>
        )}

        {approvalNote && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[12px] font-semibold text-slate-600">
            {approvalNote}
          </div>
        )}
      </div>
    </section>
  );
}