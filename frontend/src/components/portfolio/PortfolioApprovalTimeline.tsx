"use client";

interface PortfolioApprovalTimelineProps {
  approvalStatus?: string;
}

const STEPS = [
  {
    key: "TASLAK",
    label: "Taslak Oluşturuldu",
  },
  {
    key: "BELGE_BEKLENIYOR",
    label: "Yetki Belgesi Bekleniyor",
  },
  {
    key: "INCELEMEYE_GONDERILDI",
    label: "İncelemeye Gönderildi",
  },
  {
    key: "INCELEMEDE",
    label: "İncelemede",
  },
  {
    key: "ONAYLANDI",
    label: "Onaylandı",
  },
  {
    key: "HAVUZDA",
    label: "Havuzda Yayında",
  },
];

export default function PortfolioApprovalTimeline({
  approvalStatus,
}: PortfolioApprovalTimelineProps) {
  const currentIndex = STEPS.findIndex(
    (step) => step.key === approvalStatus,
  );

  return (
    <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <h2 className="text-center text-[16px] font-black text-[#06194A]">
        Onay Süreci
      </h2>

      <div className="mt-5 space-y-3">
        {STEPS.map((step, index) => {
          const completed =
            currentIndex >= 0 && index <= currentIndex;

          return (
            <div
              key={step.key}
              className="flex items-center gap-3"
            >
              <div
                className={`h-5 w-5 rounded-full ${
                  completed
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              />

              <span
                className={`text-[12px] font-bold ${
                  completed
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}