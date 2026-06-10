"use client";

interface PortfolioAuthorityCardProps {
  yetkiVerified?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
}

export default function PortfolioAuthorityCard({
  yetkiVerified,
  tapuVerified,
  photoVerified,
}: PortfolioAuthorityCardProps) {
  const items = [
    {
      label: "Yetki Belgesi",
      active: yetkiVerified,
    },
    {
      label: "Tapu Doğrulaması",
      active: tapuVerified,
    },
    {
      label: "Fotoğraf Doğrulaması",
      active: photoVerified,
    },
  ];

  return (
    <section className="mt-3 rounded-[22px] border border-[#DDE7F3] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <h2 className="text-center text-[16px] font-black text-[#06194A]">
        Evrak Durumu
      </h2>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-[#E5EDF7] p-3"
          >
            <span className="text-[12px] font-bold text-[#06194A]">
              {item.label}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[11px] font-black ${
                item.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {item.active ? "Onaylı" : "Bekliyor"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}