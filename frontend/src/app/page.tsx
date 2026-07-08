"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Cookie,
  Home,
  LogIn,
  MapPin,
  Menu,
  Phone,
  PieChart,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

const whatsappNumber = "+90 535 794 46 94";
const whatsappUrl = "https://wa.me/905357944694";

const portfolioCards = Array.from({ length: 19 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");

  return {
    id: `portfolio-horizontal-${number}`,
    image: `/landing/portfolio-horizontal/portfolio-${number}.webp`,
    alt: `EPH portföy görseli ${number}`,
  };
});

const marqueeCards = Array.from({ length: 17 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");

  return {
    id: `marquee-vertical-${number}`,
    image: `/landing/marquee-vertical/vertical-${number}.webp`,
    alt: `EPH dikey vitrin görseli ${number}`,
  };
});

const stats = [
  { icon: Building2, value: "25.000+", label: "Aktif Portföy" },
  { icon: UsersRound, value: "10.000+", label: "Kayıtlı Üye" },
  { icon: PieChart, value: "1.500+", label: "Günlük Talep" },
  { icon: ShieldCheck, value: "7/24", label: "Canlı Destek" },
];

const heroWords = ["Dijital Merkezi", "Akıllı CRM’i", "Ortak Portföy Ağı", "Yeni Nesil Havuzu"];

function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function PremiumPropertyImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#09172D]">
      <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
    </div>
  );
}

function TiltPortfolioCard({
  item,
}: {
  item: (typeof portfolioCards)[number];
}) {
  const [transform, setTransform] = useState("perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)");

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x - rect.width / 2) / rect.width) * 10;
    const rotateX = ((y - rect.height / 2) / rect.height) * -8;

    setTransform(
      `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) scale(1.018)`,
    );
  };

  const reset = () => {
    setTransform("perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)");
  };

  return (
    <article
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      style={{ transform }}
      className="group relative aspect-[16/10] w-[260px] shrink-0 snap-center overflow-hidden rounded-[18px] border border-white/14 bg-[#10213B]/92 shadow-[0_18px_50px_rgba(0,0,0,.24)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:border-[#60A5FA]/70 hover:shadow-[0_28px_80px_rgba(37,99,235,.28)] lg:w-auto"
    >
      <PremiumPropertyImage src={item.image} alt={item.alt} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,rgba(255,255,255,.13)_44%,transparent_60%)] bg-[length:220%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-[card-shine_1.05s_ease-out] group-hover:opacity-100" />
    </article>
  );
}

function TiltMarqueeCard({
  item,
}: {
  item: (typeof marqueeCards)[number];
}) {
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)");

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x - rect.width / 2) / rect.width) * 9;
    const rotateX = ((y - rect.height / 2) / rect.height) * -8;

    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-7px) scale(1.018)`,
    );
  };

  const reset = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)");
  };

  return (
    <article
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      style={{ transform }}
      className="group relative aspect-[4/5] overflow-hidden rounded-[18px] border border-white/14 bg-[#0F203C]/92 shadow-[0_16px_44px_rgba(0,0,0,.24)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:border-[#60A5FA]/70 hover:shadow-[0_28px_74px_rgba(37,99,235,.28)] sm:rounded-[22px]"
    >
      <img
        src={item.image}
        alt={item.alt}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,transparent_24%,rgba(255,255,255,.14)_44%,transparent_62%)] bg-[length:220%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-[card-shine_1.05s_ease-out] group-hover:opacity-100" />
    </article>
  );
}

function VerticalMarquee() {
  const [randomizedCards, setRandomizedCards] = useState(marqueeCards);

  useEffect(() => {
    const shuffled = [...marqueeCards];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    setRandomizedCards(shuffled);
  }, []);

  const firstColumn = randomizedCards.filter((_, index) => index % 3 === 0);
  const secondColumn = randomizedCards.filter((_, index) => index % 3 === 1);
  const thirdColumn = randomizedCards.filter((_, index) => index % 3 === 2);

  const renderSet = (items: typeof marqueeCards, prefix: string) => (
    <div className="grid gap-2.5 pb-2.5 sm:gap-3 sm:pb-3">
      {items.map((item, index) => <TiltMarqueeCard key={`${prefix}-${item.id}-${index}`} item={item} />)}
    </div>
  );

  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[720px] overflow-hidden rounded-[30px] border border-white/12 bg-[#071326]/46 p-2.5 shadow-[0_38px_120px_rgba(0,0,0,.35)] backdrop-blur-xl sm:h-[540px] sm:p-3 lg:h-[650px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-[#09172D] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[#09172D] to-transparent" />

      <div className="grid h-full grid-cols-3 gap-2 sm:gap-3">
        <div className="marquee-column overflow-hidden pt-5 sm:pt-7">
          <div className="vertical-marquee-track vertical-marquee-left">
            {renderSet(firstColumn, "first-a")}
            {renderSet(firstColumn, "first-b")}
          </div>
        </div>
        <div className="marquee-column overflow-hidden pt-12 sm:pt-16">
          <div className="vertical-marquee-track vertical-marquee-middle">
            {renderSet(secondColumn, "second-a")}
            {renderSet(secondColumn, "second-b")}
          </div>
        </div>
        <div className="marquee-column overflow-hidden pt-1 sm:pt-3">
          <div className="vertical-marquee-track vertical-marquee-right">
            {renderSet(thirdColumn, "third-a")}
            {renderSet(thirdColumn, "third-b")}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#071326]/76 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1380px] items-center justify-between px-4 sm:px-5 md:h-[76px] md:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11" />
            <div className="min-w-0 leading-none">
              <div className="text-[21px] font-black tracking-[0.17em] text-white sm:text-[25px] sm:tracking-[0.2em]">E.P.H.</div>
              <div className="mt-1 hidden text-[11px] font-medium text-white/76 xs:block sm:block">Emlak Portföy Havuzu</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-10 text-[13px] font-medium text-white/78 lg:flex">
            <a href="#ozellikler" className="transition hover:text-white">Özellikler</a>
            <a href="#fiyatlandirma" className="transition hover:text-white">Fiyatlandırma</a>
            <a href="#blog" className="transition hover:text-white">Blog</a>
            <a href="#iletisim" className="transition hover:text-white">İletişim</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/giris" className="shine-button relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-blue-300/35 bg-[#2563EB] px-3.5 text-[12px] font-semibold text-white shadow-[0_12px_34px_rgba(37,99,235,.30)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] sm:h-11 sm:px-6 sm:text-[13px]">
              <LogIn size={16} />
              <span className="sm:hidden">Giriş</span>
              <span className="hidden sm:inline">Giriş Yap</span>
            </Link>
            <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/10 text-white/82 transition hover:bg-white/8 sm:h-11 sm:w-11" aria-label="Menü">
              <Menu size={23} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[80] bg-[#071326]/70 backdrop-blur-sm transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
      <aside className={`fixed right-4 top-4 z-[90] w-[calc(100%-32px)] max-w-[360px] rounded-[24px] border border-white/14 bg-[#10213B] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] transition md:right-7 md:top-7 ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/14 text-white" aria-label="Kapat">
          <X size={18} />
        </button>
        <div className="mt-4 grid gap-3 text-[16px] font-semibold text-white">
          <a onClick={() => setOpen(false)} href="#ozellikler">Özellikler</a>
          <a onClick={() => setOpen(false)} href="#fiyatlandirma">Fiyatlandırma</a>
          <a onClick={() => setOpen(false)} href="#blog">Blog</a>
          <a onClick={() => setOpen(false)} href="#iletisim">İletişim</a>
          <Link href="/giris" className="mt-4 rounded-[12px] border border-white/16 px-4 py-3 text-center">Giriş Yap</Link>
          <Link href="/kayit" className="rounded-[12px] bg-[#2563EB] px-4 py-3 text-center">Ücretsiz Başvur</Link>
        </div>
      </aside>
    </>
  );
}

function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setWordIndex((value) => (value + 1) % heroWords.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[920px] overflow-hidden border-b border-white/10 bg-[#09172D] lg:min-h-[810px]">
      <div className="absolute inset-0">
        <img src="/landing/hero-city-villa-4k.webp" alt="EPH premium gayrimenkul" className="h-full w-full object-cover object-[62%_center] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,15,31,.94)_0%,rgba(6,17,35,.84)_42%,rgba(6,17,35,.55)_68%,rgba(6,17,35,.35)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,35,.28)_0%,rgba(6,17,35,.16)_45%,rgba(6,17,35,.88)_100%)]" />
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-blue-500/18 blur-[120px]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/14 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[920px] max-w-[1380px] items-center gap-12 px-5 pb-16 pt-28 md:px-10 lg:min-h-[810px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pb-10 lg:pt-24">
        <div className="mx-auto max-w-[650px] text-center lg:mx-0 lg:text-left" data-reveal>
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/[0.07] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE] backdrop-blur-xl lg:mx-0">
            <Sparkles size={15} /> Türkiye’nin Gayrimenkul Profesyonel Ağı
          </div>

          <h1 className="text-[42px] font-light leading-[1.07] tracking-[-0.055em] text-white sm:text-[56px] md:text-[68px] lg:text-[72px]">
            Gayrimenkul
            <span className="block">Profesyonellerinin</span>
            <span key={heroWords[wordIndex]} className="hero-gradient-text mt-2 block min-h-[1.12em] font-semibold">
              {heroWords[wordIndex]}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-[590px] text-[15px] font-normal leading-8 text-white/76 md:text-[17px] lg:mx-0">
            Portföy, müşteri, CRM, pazar analizi ve yapay zekâ tek platformda.
            İşinizi büyüten bağlantılar, fırsatlar ve veriler tek merkezde.
          </p>

          <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
            <Link href="/giris" className="shine-button relative inline-flex h-[56px] items-center justify-center gap-3 overflow-hidden rounded-[12px] bg-[#2563EB] px-8 text-[15px] font-semibold text-white shadow-[0_18px_48px_rgba(37,99,235,.38)] transition hover:-translate-y-1 hover:bg-[#1D4ED8]">
              <LogIn size={19} /> Giriş Yap
            </Link>
            <Link href="/kayit" className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[12px] border border-white/22 bg-white/8 px-8 text-[15px] font-semibold text-white/94 backdrop-blur-md transition hover:-translate-y-1 hover:border-[#60A5FA] hover:bg-white/12">
              Ücretsiz Başvur <ArrowRight size={18} />
            </Link>
            <a href="#ozellikler" className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[12px] border border-white/12 bg-[#071326]/38 px-6 text-[14px] font-medium text-white/82 backdrop-blur-md transition hover:border-white/28 hover:text-white">
              <CirclePlay size={19} strokeWidth={1.7} /> Platformu Keşfet
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] text-white/64 lg:justify-start">
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Kredi kartı gerekmez</span>
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-400" /> 30 gün ücretsiz</span>
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Mobil öncelikli</span>
          </div>
        </div>

        <div className="relative" data-reveal>
          <VerticalMarquee />
        </div>

        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 text-center text-[12px] text-white/54 lg:block">
          <Home className="mx-auto mb-2 animate-bounce" size={21} strokeWidth={1.4} />
          Aşağı Kaydırın
        </div>
      </div>
    </section>
  );
}

function PortfolioSlider() {
  const [active, setActive] = useState(0);
  const list = useMemo(() => portfolioCards, []);
  const visibleCards = useMemo(
    () => Array.from({ length: 5 }, (_, offset) => list[(active + offset) % list.length]),
    [active, list],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % list.length), 2400);
    return () => window.clearInterval(timer);
  }, [list.length]);

  const previous = () => setActive((value) => (value - 1 + list.length) % list.length);
  const next = () => setActive((value) => (value + 1) % list.length);

  return (
    <section id="ozellikler" data-reveal className="relative overflow-hidden border-b border-white/10 bg-[#0B1730] px-5 py-16 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(37,99,235,.18),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1380px] items-center gap-10 lg:grid-cols-[310px_1fr]">
        <div className="text-center lg:text-left">
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#60A5FA]">✣ Yapay Zekâ</div>
          <h2 className="text-[34px] font-light leading-[1.12] tracking-[-0.04em] text-white md:text-[44px]">
            EPH Size
            <span className="hero-gradient-text block font-medium">Portföy Bulur.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[310px] text-[14px] leading-7 text-white/64 lg:mx-0">
            CRM kayıtlarınızı tarar, portföyleri analiz eder ve en güçlü fırsatları önünüze getirir.
          </p>

          <div className="mx-auto mt-8 grid max-w-[330px] gap-4 text-left text-[14px] text-white/72 lg:mx-0">
            {["CRM kayıtlarınızı tarar", "Piyasadaki portföyleri analiz eder", "Uygun fırsatları anlık sunar"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={17} className="text-[#60A5FA]" />{item}</div>
            ))}
          </div>
        </div>

        <div className="relative rounded-[26px] border border-blue-300/24 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,.24)] backdrop-blur-xl md:p-5">
          <button onClick={previous} className="absolute -left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#10213B]/94 text-white shadow-lg transition hover:scale-105 md:-left-4" aria-label="Önceki görsel">
            <ChevronLeft size={23} />
          </button>

          <div key={active} className="portfolio-window flex snap-x gap-4 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible">
            {visibleCards.map((item) => <TiltPortfolioCard key={item.id} item={item} />)}
          </div>

          <button onClick={next} className="absolute -right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#10213B]/94 text-white shadow-lg transition hover:scale-105 md:-right-4" aria-label="Sonraki görsel">
            <ChevronRight size={23} />
          </button>

          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={`h-2 rounded-full transition-all ${index === 0 ? "w-7 bg-[#60A5FA]" : "w-2 bg-white/24"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerSection() {
  return (
    <section data-reveal className="relative overflow-hidden border-b border-white/10 bg-[#0E1E38] px-5 py-16 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_35%,rgba(37,99,235,.18),transparent_30%)]" />
      <div className="absolute right-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[430px_1fr]">
        <div className="relative mx-auto w-full max-w-[390px]">
          <div className="absolute -inset-7 rounded-[48px] bg-[#60A5FA]/14 blur-[70px]" />

          <div className="relative overflow-hidden rounded-[42px] border-[7px] border-[#050B15] bg-[#DCE7F4] shadow-[0_34px_90px_rgba(0,0,0,.46)] transition duration-700 hover:-translate-y-2 hover:scale-[1.012]">
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#050B15]" />
            <iframe
              src="/landing/denizli-24-pin-map.html"
              title="Denizli Merkezefendi ve Pamukkale EPH harita keşfi"
              className="block aspect-[9/16] w-full border-0"
              loading="lazy"
              allow="geolocation"
            />
          </div>
        </div>

        <div className="text-center lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">
            <MapPin size={15} /> EPH Harita Keşfi
          </div>

          <h2 className="text-[34px] font-light leading-[1.12] tracking-[-0.04em] text-white md:text-[46px]">
            Denizli’deki Portföyleri
            <span className="hero-gradient-text block font-medium">Harita Üzerinden Keşfedin.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-8 text-white/66 lg:mx-0">
            Merkezefendi ve Pamukkale’deki portföyleri gerçek harita üzerinde görün.
            EPH pinleri fiyatları, bölgeleri ve fırsat yoğunluğunu ilk bakışta gösterir.
          </p>

          <div className="mx-auto mt-8 grid max-w-[560px] gap-4 text-left text-[15px] text-white/76 lg:mx-0">
            {[
              "24 portföy pini sırayla ve uzak konumlar dönüşümlü iner",
              "Merkezefendi ve Pamukkale aynı kadrajda gösterilir",
              "EPH’nin özgün harita pini ve fiyat etiketi kullanılır",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Check size={18} className="mt-1 shrink-0 text-[#60A5FA]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Link
            href="/giris"
            className="shine-button relative mt-9 inline-flex h-[54px] items-center justify-center gap-3 overflow-hidden rounded-[12px] bg-[#2563EB] px-7 text-[14px] font-semibold text-white shadow-[0_18px_46px_rgba(37,99,235,.34)] transition hover:-translate-y-1 hover:bg-[#1D4ED8]"
          >
            Portföyleri Keşfet <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  return (
    <section id="blog" data-reveal className="relative overflow-hidden border-b border-white/10 bg-[#0B1730] px-5 py-16 md:px-10">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 md:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#60A5FA]">⌘ Pazar Analizi</div>
          <h2 className="text-left text-[32px] font-light leading-[1.14] tracking-[-0.04em] text-white md:text-[42px]">
            Pazar Analizi ile
            <span className="block">Doğru Karar Verin.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-white/66">
            Bölge bazlı fiyat trendlerini, arz-talep dengesini ve yatırım fırsatlarını görün.
          </p>

          <div className="mt-7 grid gap-3 text-[14px] text-white/74">
            {["Bölge bazlı fiyat analizleri", "Arz-talep ve yatırım fırsatları", "Güncel raporlar ve grafikler"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={17} className="text-[#60A5FA]" />{item}</div>
            ))}
          </div>

          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#93C5FD]">
            Detaylı Bilgi <ArrowRight size={17} />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[34px] bg-[#60A5FA]/12 blur-[50px]" />
          <img src="/landing/dashboard-premium.webp" alt="EPH pazar analizi dashboard" className="relative w-full rounded-[34px] border border-white/14 shadow-[0_28px_110px_rgba(0,0,0,.40)] transition duration-700 hover:-translate-y-2 hover:scale-[1.015] hover:[transform:perspective(1000px)_rotateY(3deg)_rotateX(1deg)]" />
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section id="fiyatlandirma" data-reveal className="bg-[#0E1E38] px-5 py-8 md:px-10">
      <div className="mx-auto grid max-w-[1380px] overflow-hidden rounded-[14px] border border-white/12 bg-white/[0.055] md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center justify-center gap-5 border-b border-white/10 px-7 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <item.icon className="text-[#60A5FA]" size={36} strokeWidth={1.4} />
            <div><div className="text-[30px] font-light text-white">{item.value}</div><div className="mt-1 text-[13px] text-white/58">{item.label}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentBand() {
  return (
    <section className="bg-[#F6FAFF] px-5 py-10 md:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center text-[18px] font-bold tracking-[-0.02em] text-[#0F1E35]">
          Güvenli Ödeme Altyapımız
        </div>

        <div className="mt-5 rounded-[18px] border border-[#DCE7F5] bg-white px-4 py-3 shadow-[0_14px_38px_rgba(15,30,53,.06)]">
          <div className="flex flex-nowrap items-center justify-between overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex h-12 shrink-0 items-center justify-center border-r border-[#E6EEF8] px-4">
              <span className="text-[18px] font-black italic tracking-tight text-[#1A1F71]">VISA</span>
            </div>

            <div className="flex h-12 shrink-0 items-center justify-center gap-1 border-r border-[#E6EEF8] px-4">
              <span className="h-5 w-5 rounded-full bg-[#EB001B] opacity-90" />
              <span className="-ml-2.5 h-5 w-5 rounded-full bg-[#F79E1B] opacity-90" />
            </div>

            <div className="flex h-12 shrink-0 items-center justify-center border-r border-[#E6EEF8] px-4">
              <span className="text-[14px] font-black tracking-[0.08em] text-[#003087]">troy</span>
            </div>

            <div className="flex h-12 shrink-0 items-center justify-center border-r border-[#E6EEF8] px-4">
              <span className="text-[13px] font-black tracking-tight text-[#2563EB]">
                PAY<span className="text-[#0F1E35]">TR</span>
              </span>
            </div>

            <div className="flex h-12 shrink-0 items-center justify-center border-r border-[#E6EEF8] px-4">
              <span className="text-[14px] font-bold italic text-[#00AEEF]">iyzico</span>
            </div>

            <div className="flex h-12 shrink-0 items-center justify-center px-4">
              <span className="text-[12px] font-black text-[#009A44]">
                Ziraat<span className="text-[#E30613]">Pay</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-5 grid max-w-[820px] gap-3 text-center sm:grid-cols-3">
          <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-[#1F3B64]">
            <ShieldCheck size={17} className="text-[#2563EB]" /> PCI DSS
          </div>
          <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-[#1F3B64]">
            <ShieldCheck size={17} className="text-[#2563EB]" /> 256 Bit SSL
          </div>
          <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-[#1F3B64]">
            <ShieldCheck size={17} className="text-[#2563EB]" /> 3D Secure
          </div>
        </div>
      </div>
    </section>
  );
}

function HelpDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 30000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] flex h-12 items-center justify-center rounded-full border border-white/16 bg-[#2563EB] px-5 text-[13px] font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,.32)]"
      >
        Yardım / Kayıt
      </button>

      <div className={`fixed inset-0 z-[85] bg-[#061225]/62 backdrop-blur-sm transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />

      <aside className={`fixed bottom-0 right-0 z-[90] w-full max-w-[390px] rounded-t-[24px] border border-white/14 bg-[#10213B] p-5 shadow-[0_30px_100px_rgba(0,0,0,.48)] transition md:bottom-6 md:right-6 md:rounded-[24px] ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"}`}>
        <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/14 text-white/78" aria-label="Kapat">
          <X size={17} />
        </button>

        <div className="pr-10">
          <div className="text-[20px] font-semibold text-white">Size nasıl yardımcı olabiliriz?</div>
          <p className="mt-2 text-[13px] leading-6 text-white/62">Formu doldurun, EPH ekibi kısa süre içinde sizinle iletişime geçsin.</p>
        </div>

        <div className="mt-5 grid gap-3">
          <input className="h-11 rounded-[10px] border border-white/12 bg-white/[0.06] px-4 text-[13px] text-white outline-none placeholder:text-white/38 focus:border-[#60A5FA]" placeholder="Ad Soyad" />
          <input className="h-11 rounded-[10px] border border-white/12 bg-white/[0.06] px-4 text-[13px] text-white outline-none placeholder:text-white/38 focus:border-[#60A5FA]" placeholder="Telefon" />
          <input className="h-11 rounded-[10px] border border-white/12 bg-white/[0.06] px-4 text-[13px] text-white outline-none placeholder:text-white/38 focus:border-[#60A5FA]" placeholder="E-posta" />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[12px] text-white/72">
              <input type="radio" name="office" defaultChecked /> Ofisim Var
            </label>
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[12px] text-white/72">
              <input type="radio" name="office" /> Yok
            </label>
          </div>

          <button type="button" className="h-11 rounded-[10px] bg-[#2563EB] text-[13px] font-semibold text-white">Gönder</button>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[13px] font-medium text-white/76">
            <Phone size={16} /> {whatsappNumber}
          </a>
        </div>
      </aside>
    </>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem("eph-cookie-consent") !== "accepted");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[75] mx-auto max-w-[1320px] rounded-[18px] border border-white/14 bg-[#10213B]/94 p-5 shadow-[0_20px_90px_rgba(0,0,0,.38)] backdrop-blur-xl">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#d99a5d]/20 text-[#e3a15e]"><Cookie size={42} /></div>
          <div>
            <div className="text-[16px] font-semibold text-white">Çerezleri Kullanıyoruz 🍪</div>
            <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-white/66">
              Sitemizi geliştirmek, hizmetlerimizi sunmak ve size daha iyi bir deneyim sağlamak için çerezlerden yararlanıyoruz.
              <Link href="/cerez-politikasi" className="ml-1 text-[#93C5FD] underline underline-offset-4">Çerez Politikamız</Link> hakkında detaylı bilgiye ulaşabilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:flex">
          <button type="button" className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/82">Tercihleri Yönet</button>
          <button type="button" onClick={() => setVisible(false)} className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/82">Reddet</button>
          <button type="button" onClick={() => { window.localStorage.setItem("eph-cookie-consent", "accepted"); setVisible(false); }} className="h-12 rounded-[9px] bg-[#2563EB] px-7 text-[13px] font-semibold text-white">Tümünü Kabul Et</button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useScrollReveal();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B1730] text-white">
      <Header />
      <Hero />
      <PortfolioSlider />
      <CustomerSection />
      <AnalyticsSection />
      <StatsBand />
      <footer id="iletisim" className="bg-[#F6FAFF] px-5 pt-12 md:px-10">
        <div className="mx-auto max-w-[1180px] rounded-[24px] border border-[#DCE7F5] bg-white p-6 shadow-[0_18px_50px_rgba(15,30,53,.06)] md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1fr_1fr] md:items-start">
            <div className="hidden md:block" />

            <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                <img src="/LOGO_EPH.png" alt="EPH" className="h-12 w-12 object-contain" />
                <div className="text-left leading-none">
                  <div className="text-[26px] font-black tracking-[0.18em] text-[#0F1E35]">E.P.H.</div>
                  <div className="mt-1 text-[11px] font-semibold text-[#51657F]">Emlak Portföy Havuzu</div>
                </div>
              </div>
              <p className="mx-auto mt-4 max-w-[320px] text-[13px] leading-6 text-[#51657F]">
                Gayrimenkul profesyonelleri için geliştirilmiş modern portföy, CRM ve pazar analizi platformu.
              </p>
            </div>

            <div className="text-center md:text-right">
              <div className="text-[15px] font-bold text-[#0F1E35]">Bize Ulaşın</div>
              <div className="mt-4 grid gap-3 text-[14px] font-semibold text-[#1F3B64]">
                <a href="tel:+905357944694" className="inline-flex items-center justify-center gap-2 md:justify-end">
                  <Phone size={16} className="text-[#2563EB]" />
                  +90 535 794 46 94
                </a>
                <a href="mailto:info@emlakportfoyhavuzu.com" className="inline-flex items-center justify-center gap-2 break-all md:justify-end">
                  <span className="text-[#2563EB]">@</span>
                  info@emlakportfoyhavuzu.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <PaymentBand />
      <section className="bg-[#F6FAFF] px-5 pb-28 md:px-10">
        <div className="mx-auto max-w-[1180px] rounded-[24px] border border-[#DCE7F5] bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,30,53,.06)]">
          <div className="text-[16px] font-bold text-[#0F1E35]">Bizi Takip Edin</div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=61590178241390&locale=tr_TR"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-[0_12px_28px_rgba(24,119,242,.28)] transition hover:-translate-y-1 hover:scale-105"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.024 1.792-4.695 4.533-4.695 1.312 0 2.686.235 2.686.235v2.974h-1.513c-1.49 0-1.956.931-1.956 1.887v2.259h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/ephplatform"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_12px_28px_rgba(221,42,123,.28)] transition hover:-translate-y-1 hover:scale-105"
              style={{ background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 48%,#8134AF 72%,#515BD4 100%)" }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948C23.728 2.698 21.31.273 16.948.073 15.668.014 15.259 0 12 0zm0 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
                <path d="M12 5.838A6.162 6.162 0 1 0 12 18.162 6.162 6.162 0 0 0 12 5.838zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                <circle cx="18.406" cy="5.595" r="1.44" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-[0_12px_28px_rgba(10,102,194,.28)] transition hover:-translate-y-1 hover:scale-105"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 4.128 0c0 1.14-.925 2.065-2.065 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-[0_12px_28px_rgba(255,0,0,.24)] transition hover:-translate-y-1 hover:scale-105"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mx-auto mt-7 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCE7F5] bg-white text-[#2563EB] shadow-[0_14px_35px_rgba(15,30,53,.10)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(37,99,235,.16)]"
            aria-label="Sayfa başına dön"
          >
            <ArrowUp size={23} strokeWidth={2.2} />
          </button>
          <div className="mt-2 text-[12px] font-semibold text-[#51657F]">Sayfa Başına Dön</div>

          <div className="mx-auto mt-6 max-w-[720px] border-t border-[#E6EEF8] pt-5 text-center text-[12px] font-medium text-[#6A7E96]">
            © 2024 EPH — Emlak Portföy Havuzu. Tüm hakları saklıdır.
          </div>
        </div>
      </section>
      <CookieBanner />
      <HelpDrawer />
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #0B1730; }
        ::selection { background: rgba(37, 99, 235, 0.45); color: #ffffff; }

        .portfolio-window {
          animation: portfolio-window-enter .38s cubic-bezier(.2,.72,.2,1) both;
        }

        .hero-gradient-text {
          color: transparent;
          background: linear-gradient(90deg, #60A5FA 0%, #E0F2FE 22%, #A78BFA 48%, #38BDF8 72%, #60A5FA 100%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          animation: moving-gradient 5.8s linear infinite, word-enter .58s cubic-bezier(.2,.75,.2,1) both;
          filter: drop-shadow(0 10px 28px rgba(96, 165, 250, .22));
        }

        .shine-button::after {
          content: "";
          position: absolute;
          inset: -120% auto -120% -45%;
          width: 34%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.62), transparent);
          animation: light-sweep 3.6s ease-in-out infinite;
        }

        .vertical-marquee-track {
          will-change: transform;
        }

        .vertical-marquee-left {
          animation: vertical-marquee 17s linear infinite;
        }

        .vertical-marquee-middle {
          animation: vertical-marquee 19s linear infinite reverse;
        }

        .vertical-marquee-right {
          animation: vertical-marquee 15s linear infinite;
        }

        .marquee-column:hover .vertical-marquee-track {
          animation-play-state: paused;
        }

        [data-reveal] {
          opacity: 0;
          transform: translateY(34px);
          transition: opacity .8s ease, transform .8s cubic-bezier(.2,.72,.2,1);
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes portfolio-window-enter {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes moving-gradient {
          from { background-position: 0% center; }
          to { background-position: 250% center; }
        }

        @keyframes word-enter {
          from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes light-sweep {
          0%, 56% { left: -45%; opacity: 0; }
          62% { opacity: 1; }
          84%, 100% { left: 122%; opacity: 0; }
        }

        @keyframes vertical-marquee {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }

        @keyframes card-shine {
          from { background-position: 190% 0; }
          to { background-position: -30% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }

          [data-reveal] {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
