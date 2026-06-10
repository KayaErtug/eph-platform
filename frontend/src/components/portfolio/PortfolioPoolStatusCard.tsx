"use client";

interface PortfolioPoolStatusCardProps {
  isPoolVisible?: boolean;
  poolPublishedAt?: string | null;
}

export default function PortfolioPoolStatusCard({
  isPoolVisible,
  poolPublishedAt,
}: PortfolioPoolStatusCardProps) {
  return (
    <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <div className="text-center">
        <h2 className="text-[16px] font-black text-[#06194A]">
          Havuz Durumu
        </h2>

        <div
          className={`mt-3 inline-flex rounded-full px-4 py-2 text-[12px] font-black ${
            isPoolVisible
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {isPoolVisible ? "Havuzda Yayında" : "Havuzda Değil"}
        </div>

        {poolPublishedAt && (
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            Yayın Tarihi:{" "}
            {new Date(poolPublishedAt).toLocaleDateString("tr-TR")}
          </p>
        )}
      </div>
    </section>
  );
}