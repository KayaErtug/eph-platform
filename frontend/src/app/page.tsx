"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Cookie,
  Menu,
  Mouse,
  PieChart,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

const portfolioCards = [
  { title: "Levent’te Lüks Residence", location: "İstanbul / Beşiktaş", price: "35.000.000 ₺", detail: "450 m²", room: "5+1", image: "/gorseller/ilan-10.jpg" },
  { title: "Nişantaşı’nda 3+1 Daire", location: "İstanbul / Şişli", price: "30.000.000 ₺", detail: "180 m²", room: "3+1", image: "/gorseller/ilan-11.jpg" },
  { title: "Bebek’te Yalı Dairesi", location: "İstanbul / Beşiktaş", price: "32.000.000 ₺", detail: "220 m²", room: "4+1", image: "/gorseller/ilan-12.jpg" },
  { title: "Zekeriyaköy Villa", location: "İstanbul / Sarıyer", price: "45.000.000 ₺", detail: "600 m²", room: "6+2", image: "/gorseller/ilan-13.jpg" },
  { title: "Ataşehir’de Residence", location: "İstanbul / Ataşehir", price: "28.000.000 ₺", detail: "150 m²", room: "2+1", image: "/gorseller/ilan-14.jpg" },
];

const stats = [
  { icon: Building2, value: "25.000+", label: "Aktif Portföy" },
  { icon: UsersRound, value: "10.000+", label: "Kayıtlı Üye" },
  { icon: PieChart, value: "1.500+", label: "Günlük Talep" },
  { icon: ShieldCheck, value: "7/24", label: "Canlı Destek" },
];

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 bg-[#030814]/36 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1380px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-11 w-11 object-contain" />
            <div className="leading-none">
              <div className="text-[25px] font-black tracking-[0.2em] text-white">E.P.H.</div>
              <div className="mt-1 text-[11px] font-medium text-white/72">Emlak Portföy Havuzu</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-12 text-[13px] font-medium text-white/72 lg:flex">
            <a href="#ozellikler" className="transition hover:text-white">Özellikler</a>
            <a href="#fiyatlandirma" className="transition hover:text-white">Fiyatlandırma</a>
            <a href="#blog" className="transition hover:text-white">Blog</a>
            <a href="#iletisim" className="transition hover:text-white">İletişim</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/giris" className="hidden h-11 items-center justify-center rounded-[10px] border border-white/16 bg-white/[0.025] px-7 text-[13px] font-medium text-white/88 transition hover:border-[#8b5cf6] md:flex">
              Giriş Yap
            </Link>
            <button onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-white/76 transition hover:bg-white/5" aria-label="Menü">
              <Menu size={25} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </header>
      <div className={`fixed inset-0 z-[80] bg-black/62 backdrop-blur-sm transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
      <aside className={`fixed right-4 top-4 z-[90] w-[calc(100%-32px)] max-w-[360px] rounded-[24px] border border-white/12 bg-[#070d1b] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] transition md:right-7 md:top-7 ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}>
        <button onClick={() => setOpen(false)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white" aria-label="Kapat"><X size={18} /></button>
        <div className="mt-4 grid gap-3 text-[16px] font-semibold text-white">
          <a onClick={() => setOpen(false)} href="#ozellikler">Özellikler</a>
          <a onClick={() => setOpen(false)} href="#fiyatlandirma">Fiyatlandırma</a>
          <a onClick={() => setOpen(false)} href="#blog">Blog</a>
          <a onClick={() => setOpen(false)} href="#iletisim">İletişim</a>
          <Link href="/giris" className="mt-4 rounded-[12px] border border-white/14 px-4 py-3 text-center">Giriş Yap</Link>
          <Link href="/kayit" className="rounded-[12px] bg-[#7c3aed] px-4 py-3 text-center">Ücretsiz Başvur</Link>
        </div>
      </aside>
    </>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[720px] overflow-hidden border-b border-white/[0.06] bg-[#020611] md:min-h-[760px]">
      <div className="absolute inset-0">
        <img src="/landing/hero-city-villa-4k.webp" alt="EPH premium gayrimenkul" className="h-full w-full object-cover object-center opacity-95" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020611_0%,rgba(2,6,17,.94)_30%,rgba(2,6,17,.45)_62%,rgba(2,6,17,.18)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,17,.30)_0%,rgba(2,6,17,.08)_42%,#020611_100%)]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[720px] max-w-[1380px] flex-col justify-center px-5 pb-20 pt-28 md:min-h-[760px] md:px-10">
        <div className="max-w-[565px]">
          <h1 className="text-[42px] font-light leading-[1.08] tracking-[-0.055em] text-white sm:text-[52px] md:text-[68px]">
            Gayrimenkul
            <span className="block">Profesyonellerinin</span>
            <span className="block font-medium text-[#8b5cf6]">Dijital Merkezi</span>
          </h1>
          <p className="mt-7 max-w-[515px] text-[15px] font-normal leading-8 text-white/66 md:text-[17px]">
            Portföy, müşteri, CRM, pazar analizi ve yapay zeka tek platformda. İşinizi büyütmenin en akıllı yolu.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/kayit" className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[10px] bg-[#6d28d9] px-8 text-[15px] font-semibold text-white shadow-[0_16px_42px_rgba(124,58,237,.30)] transition hover:bg-[#8b5cf6]">
              Ücretsiz Başvur <ArrowRight size={18} />
            </Link>
            <button className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[10px] border border-white/18 bg-black/18 px-8 text-[15px] font-medium text-white/88 backdrop-blur-md transition hover:border-[#8b5cf6]">
              <CirclePlay size={20} strokeWidth={1.7} /> Platformu İzle
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[14px] text-white/56">
            <span className="inline-flex items-center gap-2"><Check size={16} /> Kredi kartı gerektirmez</span>
            <span className="hidden text-white/28 sm:inline">•</span>
            <span>30 gün ücretsiz</span>
          </div>
        </div>
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 text-center text-[12px] text-white/52 md:block">
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
    <section id="ozellikler" className="relative overflow-hidden border-b border-white/[0.06] bg-[#020611] px-5 py-8 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(124,58,237,.10),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1380px] items-center gap-9 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">✣ Yapay Zeka</div>
          <h2 className="text-left text-[34px] font-light leading-[1.12] tracking-[-0.04em] text-white md:text-[42px]">EPH Size<span className="block">Portföy Bulur.</span></h2>
          <p className="mt-5 max-w-[280px] text-[14px] leading-7 text-white/55">CRM kayıtlarınızı tarar, portföyleri analiz eder ve size en uygun fırsatları sunar.</p>
          <div className="mt-8 grid gap-4 text-[14px] text-white/62">
            {["CRM kayıtlarınızı tarar", "Piyasadaki portföyleri analiz eder", "Size uygun fırsatları anlık sunar"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={17} className="text-[#8b5cf6]" />{item}</div>
            ))}
          </div>
        </div>
        <div className="relative rounded-[22px] border border-[#8b5cf6]/36 bg-white/[0.035] p-4 shadow-[0_24px_90px_rgba(0,0,0,.32)] backdrop-blur-xl md:p-5">
          <button onClick={() => setActive((active - 1 + list.length) % list.length)} className="absolute -left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0b1020]/90 text-white" aria-label="Önceki"><ChevronLeft size={23} /></button>
          <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
            {list.map((item, index) => (
              <article key={item.title} className={`w-[245px] shrink-0 snap-center overflow-hidden rounded-[13px] border bg-[#080d1b]/88 transition duration-300 lg:w-auto ${active === index ? "border-[#8b5cf6]/70 shadow-[0_0_40px_rgba(124,58,237,.16)]" : "border-white/10"}`}>
                <div className="relative h-[150px] overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b17] via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-[#8b5cf6] px-3 py-1 text-[11px] font-bold text-white">{item.price}</span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-[13px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[12px] text-white/58">{item.location}</p>
                  <div className="mt-4 flex items-center gap-4 text-[12px] text-white/72"><span>{item.detail}</span><span>⌂ {item.room}</span></div>
                </div>
              </article>
            ))}
          </div>
          <button onClick={() => setActive((active + 1) % list.length)} className="absolute -right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0b1020]/90 text-white" aria-label="Sonraki"><ChevronRight size={23} /></button>
          <div className="mt-6 flex justify-center gap-3">
            {list.map((item, index) => (
              <button key={item.title} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition ${active === index ? "w-6 bg-[#8b5cf6]" : "w-2.5 bg-white/18"}`} aria-label={`${index + 1}. slayt`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#020611] px-5 py-16 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_35%,rgba(124,58,237,.11),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-14 md:grid-cols-[420px_1fr]">
        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="absolute -inset-6 rounded-full bg-[#8b5cf6]/16 blur-[70px]" />
          <img src="/landing/iphone-premium.webp" alt="EPH müşteri eşleşme mobil ekranı" className="relative w-full drop-shadow-[0_28px_70px_rgba(0,0,0,.45)]" />
        </div>
        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">▥ Müşteri Yönetimi</div>
          <h2 className="text-left text-[34px] font-light leading-[1.13] tracking-[-0.04em] text-white md:text-[44px]">EPH Size<span className="block">Müşteri Bulur.</span></h2>
          <p className="mt-6 max-w-[420px] text-[16px] leading-8 text-white/58">İhtiyaçlara uygun müşterileri eşleştirir, sizi doğru alıcıyla buluşturur.</p>
          <div className="mt-8 grid gap-4 text-[15px] text-white/66">
            {["Müşteri ihtiyaçlarını analiz eder", "Portföylerle akıllı eşleşme yapar", "Doğru müşteriyi size önerir"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={18} className="text-[#8b5cf6]" />{item}</div>
            ))}
          </div>
          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#a78bfa]">Detaylı Bilgi <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  return (
    <section id="blog" className="relative overflow-hidden border-b border-white/[0.06] bg-[#020611] px-5 py-16 md:px-10">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 md:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b5cf6]">⌘ Pazar Analizi</div>
          <h2 className="text-left text-[32px] font-light leading-[1.14] tracking-[-0.04em] text-white md:text-[42px]">Pazar Analizi ile<span className="block">Doğru Karar Verin.</span></h2>
          <p className="mt-5 text-[15px] leading-7 text-white/58">Bölge bazlı fiyat trendlerini, arz-talep dengesini ve yatırım fırsatlarını görün.</p>
          <div className="mt-7 grid gap-3 text-[14px] text-white/66">
            {["Bölge bazlı fiyat analizleri", "Arz-talep ve yatırım fırsatları", "Güncel raporlar ve grafikler"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={17} className="text-[#8b5cf6]" />{item}</div>
            ))}
          </div>
          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#a78bfa]">Detaylı Bilgi <ArrowRight size={17} /></Link>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-[34px] bg-[#8b5cf6]/9 blur-[50px]" />
          <img src="/landing/dashboard-premium.webp" alt="EPH pazar analizi dashboard" className="relative w-full rounded-[34px] border border-white/12 shadow-[0_28px_110px_rgba(0,0,0,.50)]" />
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section id="fiyatlandirma" className="bg-[#020611] px-5 py-8 md:px-10">
      <div className="mx-auto grid max-w-[1380px] overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.035] md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center justify-center gap-5 border-b border-white/8 px-7 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <item.icon className="text-[#8b5cf6]" size={36} strokeWidth={1.4} />
            <div><div className="text-[30px] font-light text-white">{item.value}</div><div className="mt-1 text-[13px] text-white/52">{item.label}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(window.localStorage.getItem("eph-cookie-consent") !== "accepted"), []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[1320px] rounded-[18px] border border-white/14 bg-[#090f1e]/94 p-5 shadow-[0_20px_90px_rgba(0,0,0,.50)] backdrop-blur-xl">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#d99a5d]/18 text-[#e3a15e]"><Cookie size={42} /></div>
          <div>
            <div className="text-[16px] font-semibold text-white">Çerezleri Kullanıyoruz 🍪</div>
            <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-white/62">Sitemizi geliştirmek, hizmetlerimizi sunmak ve size daha iyi bir deneyim sağlamak için çerezlerden yararlanıyoruz.<Link href="/cerez-politikasi" className="ml-1 text-[#a78bfa] underline underline-offset-4">Çerez Politikamız</Link> hakkında detaylı bilgiye ulaşabilirsiniz.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:flex">
          <button className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/80">Tercihleri Yönet</button>
          <button onClick={() => setVisible(false)} className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/80">Reddet</button>
          <button onClick={() => { window.localStorage.setItem("eph-cookie-consent", "accepted"); setVisible(false); }} className="h-12 rounded-[9px] bg-[#7c3aed] px-7 text-[13px] font-semibold text-white">Tümünü Kabul Et</button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020611] text-white">
      <Header />
      <Hero />
      <PortfolioSlider />
      <CustomerSection />
      <AnalyticsSection />
      <StatsBand />
      <footer id="iletisim" className="bg-[#020611] px-5 pb-28 md:px-10">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-white/[0.035] p-5 text-center md:flex-row">
          <div className="text-[13px] text-white/54">EPH — Emlak Portföy Havuzu</div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-[13px] text-white/60"><span>KVKK</span><span>Kullanıcı Sözleşmesi</span><span>Gizlilik Politikası</span></div>
          <Link href="/kayit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#7c3aed] px-6 text-[13px] font-semibold text-white">Ücretsiz Başvur <ArrowRight size={16} /></Link>
        </div>
      </footer>
      <CookieBanner />
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #020611; }
        ::selection { background: rgba(124, 58, 237, 0.45); color: #ffffff; }
      `}</style>
    </main>
  );
}
