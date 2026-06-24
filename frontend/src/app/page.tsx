"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Cookie,
  Home,
  Menu,
  Mouse,
  PieChart,
  Search,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

const heroBg = "/landing/ece-office-front.png";

const portfolioCards = [
  {
    title: "Levent’te Lüks Residence",
    location: "İstanbul / Beşiktaş",
    price: "35.000.000 ₺",
    detail: "450 m²",
    room: "5+1",
    image: "/gorseller/ilan-1.jpg",
  },
  {
    title: "Nişantaşı’nda 3+1 Daire",
    location: "İstanbul / Şişli",
    price: "30.000.000 ₺",
    detail: "180 m²",
    room: "3+1",
    image: "/gorseller/ilan-2.jpg",
  },
  {
    title: "Bebek’te Yalı Dairesi",
    location: "İstanbul / Beşiktaş",
    price: "32.000.000 ₺",
    detail: "220 m²",
    room: "4+1",
    image: "/gorseller/ilan-3.jpg",
  },
  {
    title: "Zekeriyaköy Villa",
    location: "İstanbul / Sarıyer",
    price: "45.000.000 ₺",
    detail: "600 m²",
    room: "6+2",
    image: "/gorseller/ilan-4.jpg",
  },
  {
    title: "Ataşehir’de Residence",
    location: "İstanbul / Ataşehir",
    price: "28.000.000 ₺",
    detail: "150 m²",
    room: "2+1",
    image: "/gorseller/ilan-5.jpg",
  },
];

const customers = [
  { name: "Ahmet Yılmaz", detail: "3+1 Daire · Levent", price: "6.000.000 ₺ kadar", match: "%92" },
  { name: "Zeynep Kara", detail: "2+1 Daire · Kadıköy", price: "5.000.000 ₺ kadar", match: "%87" },
  { name: "Mehmet Ekinci", detail: "Villa · Beykoz", price: "15.000.000 ₺ kadar", match: "%85" },
  { name: "Selin Demir", detail: "Residence · Ataşehir", price: "4.500.000 ₺ kadar", match: "%80" },
];

const stats = [
  { icon: Building2, value: "25.000+", label: "Aktif Portföy" },
  { icon: UsersRound, value: "10.000+", label: "Kayıtlı Üye" },
  { icon: PieChart, value: "1.500+", label: "Günlük Talep" },
  { icon: Zap, value: "7/24", label: "Canlı Destek" },
];

function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.04] bg-[#030817]/35 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1360px] items-center justify-between px-5 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/LOGO_EPH.png" alt="EPH" className="h-10 w-10 object-contain" />
          <div className="leading-none">
            <div className="text-[23px] font-black tracking-[0.18em] text-white">E.P.H.</div>
            <div className="mt-1 text-[11px] font-medium text-white/72">Emlak Portföy Havuzu</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-12 text-[13px] font-medium text-white/78 lg:flex">
          <a href="#ozellikler" className="hover:text-white">Özellikler</a>
          <a href="#fiyatlandirma" className="hover:text-white">Fiyatlandırma</a>
          <a href="#blog" className="hover:text-white">Blog</a>
          <a href="#iletisim" className="hover:text-white">İletişim</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/giris"
            className="hidden h-11 items-center justify-center rounded-[10px] border border-white/16 px-7 text-[13px] font-medium text-white transition hover:border-[#8b5cf6] md:flex"
          >
            Giriş Yap
          </Link>
          <button className="flex h-11 w-11 items-center justify-center text-white/75" aria-label="Menü">
            <Menu size={24} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[760px] overflow-hidden border-b border-white/[0.06] bg-[#020715] md:min-h-[790px]">
      <div className="absolute inset-0">
        <img src={heroBg} alt="EPH premium gayrimenkul" className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020715_0%,rgba(2,7,21,.94)_28%,rgba(2,7,21,.50)_58%,rgba(2,7,21,.78)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,21,.42)_0%,rgba(2,7,21,.20)_42%,#020715_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_32%,rgba(139,92,246,.26),transparent_34%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[760px] max-w-[1360px] flex-col justify-center px-5 pb-24 pt-28 md:min-h-[790px] md:px-10">
        <div className="max-w-[560px]">
          <h1 className="text-[46px] font-light leading-[1.09] tracking-[-0.055em] text-white md:text-[68px]">
            Gayrimenkul
            <span className="block">Profesyonellerinin</span>
            <span className="block font-medium text-[#8b5cf6]">Dijital Merkezi</span>
          </h1>

          <p className="mt-7 max-w-[500px] text-[16px] font-normal leading-8 text-white/66">
            Portföy, müşteri, CRM, pazar analizi ve yapay zeka tek platformda.
            İşinizi büyütmenin en akıllı yolu.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/kayit"
              className="inline-flex h-[58px] items-center justify-center gap-3 rounded-[10px] bg-[#7c3aed] px-8 text-[15px] font-semibold text-white shadow-[0_16px_42px_rgba(124,58,237,.36)] transition hover:bg-[#8b5cf6]"
            >
              Ücretsiz Başvur <ArrowRight size={18} />
            </Link>
            <button className="inline-flex h-[58px] items-center justify-center gap-3 rounded-[10px] border border-white/18 bg-white/[0.03] px-8 text-[15px] font-medium text-white/88 backdrop-blur-md transition hover:border-[#8b5cf6]">
              <CirclePlay size={20} strokeWidth={1.7} /> Platformu İzle
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[14px] text-white/56">
            <span className="inline-flex items-center gap-2"><Check size={16} /> Kredi kartı gerektirmez</span>
            <span className="text-white/28">•</span>
            <span>30 gün ücretsiz</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-center text-[12px] text-white/52 md:block">
          <Mouse className="mx-auto mb-2" size={24} strokeWidth={1.4} />
          Aşağı Kaydırın
        </div>
      </div>
    </section>
  );
}

function PortfolioSlider() {
  const [active, setActive] = useState(0);
  const list = useMemo(() => portfolioCards, []);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % list.length), 4200);
    return () => window.clearInterval(timer);
  }, [list.length]);

  return (
    <section id="ozellikler" className="relative overflow-hidden border-b border-white/[0.06] bg-[#030817] px-5 py-8 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(124,58,237,.16),transparent_28%)]" />
      <div className="relative mx-auto grid max-w-[1360px] items-center gap-9 md:grid-cols-[310px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">✣ Yapay Zeka</div>
          <h2 className="text-[36px] font-light leading-[1.12] tracking-[-0.04em] text-white md:text-[42px]">
            EPH Size
            <span className="block">Portföy Bulur.</span>
          </h2>
          <p className="mt-5 max-w-[260px] text-[14px] leading-7 text-white/55">
            CRM kayıtlarınızı tarar, portföyleri analiz eder ve size en uygun fırsatları sunar.
          </p>

          <div className="mt-8 grid gap-4 text-[14px] text-white/62">
            {["CRM kayıtlarınızı tarar", "Piyasadaki portföyleri analiz eder", "Size uygun fırsatları anlık sunar"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check size={17} className="text-[#8b5cf6]" /> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-[22px] border border-[#8b5cf6]/36 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,.38)] backdrop-blur-xl">
          <button
            onClick={() => setActive((active - 1 + list.length) % list.length)}
            className="absolute -left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0b1020]/90 text-white"
            aria-label="Önceki"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {list.map((item, index) => (
              <article
                key={item.title}
                className={`overflow-hidden rounded-[12px] border bg-[#080d1b]/88 transition duration-300 ${
                  active === index ? "border-[#8b5cf6]/70 shadow-[0_0_40px_rgba(124,58,237,.20)]" : "border-white/10"
                }`}
              >
                <div className="relative h-[150px] overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b17] via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-[#8b5cf6] px-3 py-1 text-[11px] font-bold text-white">
                    {item.price}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-[13px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[12px] text-white/58">{item.location}</p>
                  <div className="mt-4 flex items-center gap-4 text-[12px] text-white/72">
                    <span>{item.detail}</span>
                    <span>⌂ {item.room}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <button
            onClick={() => setActive((active + 1) % list.length)}
            className="absolute -right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0b1020]/90 text-white"
            aria-label="Sonraki"
          >
            <ChevronRight size={24} />
          </button>

          <div className="mt-6 flex justify-center gap-3">
            {list.map((item, index) => (
              <button
                key={item.title}
                onClick={() => setActive(index)}
                className={`h-2.5 rounded-full transition ${active === index ? "w-6 bg-[#8b5cf6]" : "w-2.5 bg-white/18"}`}
                aria-label={`${index + 1}. slayt`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[285px]">
      <div className="absolute -inset-6 rounded-full bg-[#8b5cf6]/28 blur-[60px]" />
      <div className="relative rounded-[42px] border border-white/30 bg-[#060a14] p-2 shadow-[0_30px_120px_rgba(0,0,0,.55)]">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[#071020] px-4 py-5">
          <div className="flex items-center justify-between text-[10px] font-bold text-white">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-black/70" />
            <span>●●●</span>
          </div>

          <h3 className="mt-8 text-[16px] font-semibold text-white">Eşleşen Müşteriler</h3>

          <div className="mt-4 grid gap-3">
            {customers.map((item, index) => (
              <article key={item.name} className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.055] p-3">
                <img src={`/gorseller/ilan-${index + 6}.jpg`} alt={item.name} className="h-12 w-12 rounded-[12px] object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-white">{item.name}</div>
                  <div className="mt-1 truncate text-[10px] text-white/58">{item.detail}</div>
                  <div className="mt-1 truncate text-[10px] text-white/48">{item.price}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8b5cf6]/50 text-[10px] font-bold text-[#a78bfa]">
                  {item.match}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-5 gap-2 text-center text-[9px] text-white/58">
            {["Ana Sayfa", "Portföy", "+", "CRM", "Profil"].map((item) => (
              <div key={item} className={item === "+" ? "rounded-full bg-[#8b5cf6] py-2 text-white" : "py-2"}>{item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#020715] px-5 py-14 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(124,58,237,.14),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-[1100px] items-center gap-14 md:grid-cols-2">
        <PhoneMockup />

        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">▥ Müşteri Yönetimi</div>
          <h2 className="text-[36px] font-light leading-[1.13] tracking-[-0.04em] text-white md:text-[44px]">
            EPH Size
            <span className="block">Müşteri Bulur.</span>
          </h2>
          <p className="mt-6 max-w-[420px] text-[16px] leading-8 text-white/58">
            İhtiyaçlara uygun müşterileri eşleştirir, sizi doğru alıcıyla buluşturur.
          </p>

          <div className="mt-8 grid gap-4 text-[15px] text-white/66">
            {["Müşteri ihtiyaçlarını analiz eder", "Portföylerle akıllı eşleşme yapar", "Doğru müşteriyi size önerir"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check size={18} className="text-[#8b5cf6]" /> {item}
              </div>
            ))}
          </div>

          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#a78bfa]">
            Detaylı Bilgi <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  return (
    <section id="blog" className="relative overflow-hidden border-b border-white/[0.06] bg-[#020715] px-5 py-12 md:px-10">
      <div className="mx-auto grid max-w-[1160px] items-center gap-12 md:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">⌘ Pazar Analizi</div>
          <h2 className="text-[34px] font-light leading-[1.14] tracking-[-0.04em] text-white md:text-[42px]">
            Pazar Analizi ile
            <span className="block">Doğru Karar Verin.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-white/58">
            Bölge bazlı fiyat trendlerini, arz-talep dengesini ve yatırım fırsatlarını görün.
          </p>

          <div className="mt-7 grid gap-3 text-[14px] text-white/66">
            {["Bölge bazlı fiyat analizleri", "Arz-talep ve yatırım fırsatları", "Güncel raporlar ve grafikler"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check size={17} className="text-[#8b5cf6]" /> {item}
              </div>
            ))}
          </div>

          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#a78bfa]">
            Detaylı Bilgi <ArrowRight size={17} />
          </Link>
        </div>

        <div className="relative rounded-[34px] border border-white/16 bg-[#090f1e] p-5 shadow-[0_28px_120px_rgba(0,0,0,.50)]">
          <div className="rounded-[26px] border border-white/10 bg-[#050a15] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-[18px] font-semibold text-white">İstanbul Konut Pazarı</div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/58">Nisan 2024</div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["Ortalama Fiyat", "42.750 ₺/m²", "+%8.2"],
                ["Toplam Portföy", "25.430", "+%12.7"],
                ["Talep", "1.520", "+%9.3"],
              ].map(([label, value, change]) => (
                <div key={label}>
                  <div className="text-[11px] text-white/45">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold text-white">{value}</div>
                  <div className="mt-1 text-[11px] text-emerald-400">{change}</div>
                </div>
              ))}
            </div>

            <div className="relative mt-8 h-[210px]">
              <div className="absolute inset-0 rounded-[22px] border border-white/8 bg-white/[0.02]" />
              <svg viewBox="0 0 680 240" className="absolute inset-0 h-full w-full p-5">
                <defs>
                  <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M24 176 C86 126 128 142 172 112 C220 78 254 94 300 118 C358 150 382 86 430 102 C492 122 520 58 656 48 L656 220 L24 220 Z" fill="url(#lineFill)" />
                <path d="M24 176 C86 126 128 142 172 112 C220 78 254 94 300 118 C358 150 382 86 430 102 C492 122 520 58 656 48" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
                {[24, 172, 300, 430, 656].map((x, index) => (
                  <circle key={x} cx={x} cy={[176, 112, 118, 102, 48][index]} r="7" fill="#8b5cf6" stroke="#d8b4fe" strokeWidth="3" />
                ))}
              </svg>
              <button className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-xl">
                <CirclePlay size={32} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section className="bg-[#020715] px-5 py-8 md:px-10">
      <div className="mx-auto grid max-w-[1360px] overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.035] md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center justify-center gap-5 border-b border-white/8 px-7 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <item.icon className="text-[#8b5cf6]" size={36} strokeWidth={1.4} />
            <div>
              <div className="text-[30px] font-light text-white">{item.value}</div>
              <div className="mt-1 text-[13px] text-white/52">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem("eph-cookie-consent") !== "accepted");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[1320px] rounded-[18px] border border-white/14 bg-[#090f1e]/94 p-5 shadow-[0_20px_90px_rgba(0,0,0,.50)] backdrop-blur-xl">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#d99a5d]/18 text-[#e3a15e]">
            <Cookie size={42} />
          </div>
          <div>
            <div className="text-[16px] font-semibold text-white">Çerezleri Kullanıyoruz 🍪</div>
            <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-white/62">
              Sitemizi geliştirmek, hizmetlerimizi sunmak ve size daha iyi bir deneyim sağlamak için çerezlerden yararlanıyoruz.
              <Link href="/cerez-politikasi" className="ml-1 text-[#a78bfa] underline underline-offset-4">Çerez Politikamız</Link> hakkında detaylı bilgiye ulaşabilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:flex">
          <button className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/80">Tercihleri Yönet</button>
          <button onClick={() => setVisible(false)} className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/80">Reddet</button>
          <button
            onClick={() => {
              window.localStorage.setItem("eph-cookie-consent", "accepted");
              setVisible(false);
            }}
            className="h-12 rounded-[9px] bg-[#7c3aed] px-7 text-[13px] font-semibold text-white"
          >
            Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-[0_16px_45px_rgba(124,58,237,.45)] md:hidden"
        aria-label="Menü"
      >
        <Menu size={22} />
      </button>
      <div className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
      <aside className={`fixed bottom-0 left-0 right-0 z-[91] rounded-t-[24px] border border-white/10 bg-[#090f1e] p-5 transition ${open ? "translate-y-0" : "translate-y-full"}`}>
        <button onClick={() => setOpen(false)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white">
          <X size={18} />
        </button>
        <div className="mt-4 grid gap-3 text-[16px] font-semibold text-white">
          <Link href="#ozellikler">Özellikler</Link>
          <Link href="#fiyatlandirma">Fiyatlandırma</Link>
          <Link href="#blog">Blog</Link>
          <Link href="#iletisim">İletişim</Link>
          <Link href="/giris" className="mt-3 rounded-[12px] border border-white/14 px-4 py-3 text-center">Giriş Yap</Link>
          <Link href="/kayit" className="rounded-[12px] bg-[#7c3aed] px-4 py-3 text-center">Ücretsiz Başvur</Link>
        </div>
      </aside>
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020715] text-white">
      <Header />
      <Hero />
      <PortfolioSlider />
      <CustomerSection />
      <AnalyticsSection />
      <StatsBand />
      <footer id="iletisim" className="bg-[#020715] px-5 pb-28 md:px-10">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-white/[0.035] p-5 text-center md:flex-row">
          <div className="text-[13px] text-white/54">EPH — Emlak Portföy Havuzu</div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-[13px] text-white/60">
            <span>KVKK</span>
            <span>Kullanıcı Sözleşmesi</span>
            <span>Gizlilik Politikası</span>
          </div>
          <Link href="/kayit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#7c3aed] px-6 text-[13px] font-semibold text-white">
            Ücretsiz Başvur <ArrowRight size={16} />
          </Link>
        </div>
      </footer>
      <CookieBanner />
      <MobileMenu />
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        body {
          background: #020715;
        }
        ::selection {
          background: rgba(124, 58, 237, 0.45);
          color: #ffffff;
        }
      `}</style>
    </main>
  );
}
