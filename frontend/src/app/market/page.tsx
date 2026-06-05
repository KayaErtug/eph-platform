"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Camera,
  ChevronRight,
  Crown,
  Megaphone,
  MessageCircle,
  Mic2,
  PackagePlus,
  Sparkles,
  Star,
  Store,
  Target,
  X,
} from "lucide-react";

type MarketItem = {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
};

const items: MarketItem[] = [
  {
    id: "premium",
    title: "Premium Üyelikler",
    desc: "Silver, Gold ve Premium paket seçenekleri.",
    tag: "Üyelik",
    icon: <Crown size={19} />,
    bg: "#FFF7ED",
    color: "#EA580C",
  },
  {
    id: "boost",
    title: "Portföy Öne Çıkarma",
    desc: "Yetkili portföylerin daha fazla görünürlük kazanması.",
    tag: "Portföy",
    icon: <Target size={19} />,
    bg: "#EFF6FF",
    color: "#1557D6",
  },
  {
    id: "ads",
    title: "Reklam Alanları",
    desc: "Bölgesel ve sektörel görünürlük paketleri.",
    tag: "Reklam",
    icon: <Megaphone size={19} />,
    bg: "#F4F0FF",
    color: "#6D4AFF",
  },
  {
    id: "partners",
    title: "Çözüm Ortakları",
    desc: "Ekspertiz, fotoğrafçı, drone ve tapu danışmanı.",
    tag: "Hizmet",
    icon: <Camera size={19} />,
    bg: "#ECFDF5",
    color: "#059669",
  },
  {
    id: "lina",
    title: "Lina Paketleri",
    desc: "Ek kredi, sesli yanıt ve rapor paketleri.",
    tag: "Lina",
    icon: <Mic2 size={19} />,
    bg: "#FDF2F8",
    color: "#DB2777",
  },
  {
    id: "academy",
    title: "Akademi ve Eğitim",
    desc: "Satış, portföy yönetimi ve EPH kullanım eğitimleri.",
    tag: "Eğitim",
    icon: <BookOpen size={19} />,
    bg: "#FEFCE8",
    color: "#A16207",
  },
];

export default function MarketPage() {
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);

  const featured = useMemo(() => items.slice(0, 3), []);

  const sendAdminMessage = () => {
    if (!selectedItem) return;

    const subject = encodeURIComponent(`EPH Market Talebi: ${selectedItem.title}`);
    const body = encodeURIComponent(
      `Merhaba,\n\nEPH Market içinde "${selectedItem.title}" bölümüyle ilgileniyorum.\n\nLütfen bu konuda benimle iletişime geçin.\n\nTeşekkürler.`,
    );

    window.location.href = `mailto:mustafaertugkaya@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F7FBFF] px-3 pb-4 pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-2">
        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
            <Store size={22} />
          </div>

          <h1 className="mt-2 text-[20px] font-black tracking-[-0.035em] text-[#06194A]">
            EPH Hizmet Merkezi
          </h1>

          <p className="mx-auto mt-1 max-w-[330px] text-[12px] font-bold leading-5 text-[#64748B]">
            Üyelik, görünürlük, çözüm ortakları ve Lina hizmetleri burada toplanır.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {featured.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="min-h-[58px] rounded-[17px] px-2 py-2 text-center"
                style={{ background: item.bg }}
              >
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-[12px] bg-white" style={{ color: item.color }}>
                  {item.icon}
                </div>
                <p className="mt-1 line-clamp-1 text-[10px] font-black text-[#06194A]">
                  {item.tag}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#DDE7F3] bg-[#F4F0FF] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2">
            <Sparkles className="shrink-0 text-[#6D4AFF]" size={17} />
            <p className="text-[11px] font-black leading-4 text-[#27364F]">
              Bu bölüm EPH’nin hizmet, paket ve çözüm ortakları merkezi olarak hazırlanıyor.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="min-h-[122px] rounded-[22px] border border-[#DDE7F3] p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
              style={{ background: item.bg }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white" style={{ color: item.color }}>
                  {item.icon}
                </div>

                <span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black text-[#64748B]">
                  Yakında
                </span>
              </div>

              <h2 className="mt-2 text-left text-[14px] font-black leading-4 text-[#06194A]">
                {item.title}
              </h2>

              <p className="mt-1 line-clamp-2 text-left text-[10px] font-bold leading-4 text-[#64748B]">
                {item.desc}
              </p>

              <div className="mt-2 flex items-center justify-between text-[10px] font-black" style={{ color: item.color }}>
                Detay
                <ChevronRight size={15} />
              </div>
            </button>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <h2 className="text-center text-[16px] font-black tracking-[-0.03em] text-[#06194A]">
            Market ne işe yarar?
          </h2>

          <div className="mt-3 grid gap-1.5">
            <InfoRow icon={<PackagePlus size={16} />} text="Üyelik ve ek paket talepleri burada toplanır." />
            <InfoRow icon={<Star size={16} />} text="Portföy görünürlüğü ve reklam çözümleri hazırlanır." />
            <InfoRow icon={<MessageCircle size={16} />} text="İlgilendiğiniz hizmet için yönetime mesaj gönderebilirsiniz." />
          </div>
        </section>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#06194A]/38 px-3 pb-3 backdrop-blur-[3px]">
          <section className="w-full max-w-[430px] rounded-[28px] border border-[#DDE7F3] bg-white p-4 shadow-[0_22px_54px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]" style={{ background: selectedItem.bg, color: selectedItem.color }}>
                  {selectedItem.icon}
                </div>

                <div className="min-w-0 text-left">
                  <p className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#1557D6]">
                    EPH Market
                  </p>
                  <h2 className="mt-0.5 text-left text-[17px] font-black text-[#06194A]">
                    {selectedItem.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F7FBFF] text-[#06194A]"
              >
                <X size={19} />
              </button>
            </div>

            <p className="mt-3 text-center text-[13px] font-bold leading-5 text-[#64748B]">
              Bu bölüm henüz kullanıma açılmadı. İlgileniyorsanız yönetime mesaj gönderin; talebiniz kayıt altına alınsın.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="min-h-[42px] rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black text-[#64748B]"
              >
                Kapat
              </button>

              <button
                type="button"
                onClick={sendAdminMessage}
                className="min-h-[42px] rounded-[16px] bg-[#1557D6] text-[12px] font-black text-white"
              >
                Yönetime Mesaj Gönder
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-[42px] items-center gap-2 rounded-[17px] bg-[#F7FBFF] px-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </span>
      <p className="text-left text-[11px] font-bold leading-4 text-[#64748B]">{text}</p>
    </div>
  );
}