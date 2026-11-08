"use client";

import {
  Bot,
  Calculator,
  Flame,
  Radar,
  Store,
} from "lucide-react";
import Link from "next/link";

const tools = [
  {
    href: "/proje-satis-sablonu/firsat-radari",
    title: "Satış Fırsat Radarı",
    description: "CRM ve Talep Merkezi eşleşmelerini proje stoğunda görün.",
    icon: Radar,
  },
  {
    href: "/proje-satis-sablonu/talep-isi-haritasi",
    title: "Talep Isı Haritası",
    description: "Bölgedeki talep yoğunluğunu, bütçe ve ürün tiplerini analiz edin.",
    icon: Flame,
  },
  {
    href: "/proje-satis-sablonu/fizibilite",
    title: "Arsa / Proje Fizibilitesi",
    description: "Emsal, TAKS, maliyet ve satış varsayımlarından yaklaşık fizibilite çıkarın.",
    icon: Calculator,
  },
  {
    href: "/proje-satis-sablonu/lina-muteahhit",
    title: "Lina Müteahhit Asistanı",
    description: "Stok, fırsat, talep ve fizibilite verilerini Lina ile yorumlayın.",
    icon: Bot,
  },
  {
    href: "/proje-satis-kanali",
    title: "EPH Emlakçı Satış Kanalı",
    description: "EPH emlakçı ağına açılmış proje stoklarını ve CRM uyumunu inceleyin.",
    icon: Store,
  },
] as const;

export default function ContractorToolsPage() {
  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-[calc(18px+env(safe-area-inset-top))] sm:px-6">
        <header className="mb-5 rounded-[28px] border border-blue-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-black">Müteahhit Araçları</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Proje stoğu, satış fırsatları, bölgesel talep, fizibilite ve Lina karar desteğini tek merkezden yönetin.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-[24px] border border-[#D8E4F3] bg-white p-5 shadow-sm transition active:scale-[0.99]"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                  <Icon size={22} />
                </div>
                <h2 className="mt-4 text-center text-base font-black">{tool.title}</h2>
                <p className="mt-2 text-center text-sm leading-6 text-slate-500">{tool.description}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
