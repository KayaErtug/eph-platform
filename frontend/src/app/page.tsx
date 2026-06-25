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
  Home,
  Menu,
  Phone,
  PieChart,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

const whatsappNumber = "+90 535 79 09 374";
const whatsappUrl = "https://wa.me/905357909374";

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

const payments = ["PAYTR", "iyzico", "Ziraat Pay"];

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0A1830]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-[1380px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-11 w-11 object-contain" />
            <div className="leading-none">
              <div className="text-[25px] font-black tracking-[0.2em] text-white">E.P.H.</div>
              <div className="mt-1 text-[11px] font-medium text-white/76">Emlak Portföy Havuzu</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-12 text-[13px] font-medium text-white/78 lg:flex">
            <a href="#ozellikler" className="transition hover:text-white">Özellikler</a>
            <a href="#fiyatlandirma" className="transition hover:text-white">Fiyatlandırma</a>
            <a href="#blog" className="transition hover:text-white">Blog</a>
            <a href="#iletisim" className="transition hover:text-white">İletişim</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/giris" className="hidden h-11 items-center justify-center rounded-[10px] border border-white/18 bg-white/8 px-7 text-[13px] font-medium text-white transition hover:border-[#3B82F6] md:flex">
              Giriş Yap
            </Link>
            <button onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-white/82 transition hover:bg-white/8" aria-label="Menü">
              <Menu size={25} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[80] bg-[#071326]/70 backdrop-blur-sm transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} />
      <aside className={`fixed right-4 top-4 z-[90] w-[calc(100%-32px)] max-w-[360px] rounded-[24px] border border-white/14 bg-[#10213B] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] transition md:right-7 md:top-7 ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}>
        <button onClick={() => setOpen(false)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/14 text-white" aria-label="Kapat">
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
  return (
    <section className="relative min-h-[760px] overflow-hidden border-b border-white/10 bg-[#0B1730]">
      <div className="absolute inset-0">
        <img src="/landing/hero-city-villa-4k.webp" alt="EPH premium gayrimenkul" className="h-full w-full object-cover object-[66%_center] opacity-100" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,19,37,.66)_0%,rgba(8,19,37,.46)_34%,rgba(8,19,37,.18)_62%,rgba(8,19,37,.04)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,19,37,.16)_0%,transparent_48%,rgba(8,19,37,.62)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[760px] max-w-[1380px] flex-col justify-center px-5 pb-20 pt-28 md:px-10">
        <div className="max-w-[565px]">
          <h1 className="text-[43px] font-light leading-[1.08] tracking-[-0.055em] text-white sm:text-[54px] md:text-[68px]">
            Gayrimenkul
            <span className="block">Profesyonellerinin</span>
            <span className="block font-medium text-[#60A5FA]">Dijital Merkezi</span>
          </h1>

          <p className="mt-7 max-w-[515px] text-[15px] font-normal leading-8 text-white/78 md:text-[17px]">
            Portföy, müşteri, CRM, pazar analizi ve yapay zeka tek platformda.
            İşinizi büyütmenin en akıllı yolu.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/kayit" className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[10px] bg-[#2563EB] px-8 text-[15px] font-semibold text-white shadow-[0_16px_42px_rgba(37,99,235,.34)] transition hover:bg-[#1D4ED8]">
              Ücretsiz Başvur <ArrowRight size={18} />
            </Link>
            <button className="inline-flex h-[56px] items-center justify-center gap-3 rounded-[10px] border border-white/22 bg-white/8 px-8 text-[15px] font-medium text-white/92 backdrop-blur-md transition hover:border-[#60A5FA]">
              <CirclePlay size={20} strokeWidth={1.7} /> Platformu İzle
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[14px] text-white/66">
            <span className="inline-flex items-center gap-2"><Check size={16} /> Kredi kartı gerektirmez</span>
            <span className="hidden text-white/38 sm:inline">•</span>
            <span>30 gün ücretsiz</span>
          </div>
        </div>

        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 text-center text-[12px] text-white/60 md:block">
          <Home className="mx-auto mb-2" size={22} strokeWidth={1.4} />
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
    <section id="ozellikler" className="relative overflow-hidden border-b border-white/10 bg-[#0B1730] px-5 py-10 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(37,99,235,.18),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1380px] items-center gap-9 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#60A5FA]">✣ Yapay Zeka</div>
          <h2 className="text-left text-[34px] font-light leading-[1.12] tracking-[-0.04em] text-white md:text-[42px]">
            EPH Size
            <span className="block">Portföy Bulur.</span>
          </h2>
          <p className="mt-5 max-w-[280px] text-[14px] leading-7 text-white/64">
            CRM kayıtlarınızı tarar, portföyleri analiz eder ve size en uygun fırsatları sunar.
          </p>

          <div className="mt-8 grid gap-4 text-[14px] text-white/72">
            {["CRM kayıtlarınızı tarar", "Piyasadaki portföyleri analiz eder", "Size uygun fırsatları anlık sunar"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={17} className="text-[#60A5FA]" />{item}</div>
            ))}
          </div>
        </div>

        <div className="relative rounded-[22px] border border-blue-300/24 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,.24)] backdrop-blur-xl md:p-5">
          <button onClick={() => setActive((active - 1 + list.length) % list.length)} className="absolute -left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#10213B]/94 text-white" aria-label="Önceki">
            <ChevronLeft size={23} />
          </button>

          <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
            {list.map((item, index) => (
              <article key={item.title} className={`w-[245px] shrink-0 snap-center overflow-hidden rounded-[13px] border bg-[#10213B]/90 transition duration-300 lg:w-auto ${active === index ? "border-[#60A5FA]/80 shadow-[0_0_40px_rgba(96,165,250,.18)]" : "border-white/12"}`}>
                <div className="relative h-[150px] overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#10213B] via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-bold text-white">{item.price}</span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-[13px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[12px] text-white/62">{item.location}</p>
                  <div className="mt-4 flex items-center gap-4 text-[12px] text-white/76"><span>{item.detail}</span><span>⌂ {item.room}</span></div>
                </div>
              </article>
            ))}
          </div>

          <button onClick={() => setActive((active + 1) % list.length)} className="absolute -right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#10213B]/94 text-white" aria-label="Sonraki">
            <ChevronRight size={23} />
          </button>

          <div className="mt-6 flex justify-center gap-3">
            {list.map((item, index) => (
              <button key={item.title} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition ${active === index ? "w-6 bg-[#60A5FA]" : "w-2.5 bg-white/24"}`} aria-label={`${index + 1}. slayt`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#0E1E38] px-5 py-16 md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_35%,rgba(37,99,235,.16),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-14 md:grid-cols-[420px_1fr]">
        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="absolute -inset-6 rounded-full bg-[#60A5FA]/16 blur-[70px]" />
          <img src="/landing/iphone-premium.webp" alt="EPH müşteri eşleşme mobil ekranı" className="relative w-full drop-shadow-[0_28px_70px_rgba(0,0,0,.36)]" />
        </div>

        <div>
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#60A5FA]">▥ Müşteri Yönetimi</div>
          <h2 className="text-left text-[34px] font-light leading-[1.13] tracking-[-0.04em] text-white md:text-[44px]">
            EPH Size
            <span className="block">Müşteri Bulur.</span>
          </h2>
          <p className="mt-6 max-w-[420px] text-[16px] leading-8 text-white/66">
            İhtiyaçlara uygun müşterileri eşleştirir, sizi doğru alıcıyla buluşturur.
          </p>

          <div className="mt-8 grid gap-4 text-[15px] text-white/74">
            {["Müşteri ihtiyaçlarını analiz eder", "Portföylerle akıllı eşleşme yapar", "Doğru müşteriyi size önerir"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check size={18} className="text-[#60A5FA]" />{item}</div>
            ))}
          </div>

          <Link href="/kayit" className="mt-8 inline-flex items-center gap-3 text-[14px] font-medium text-[#93C5FD]">
            Detaylı Bilgi <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  return (
    <section id="blog" className="relative overflow-hidden border-b border-white/10 bg-[#0B1730] px-5 py-16 md:px-10">
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
          <img src="/landing/dashboard-premium.webp" alt="EPH pazar analizi dashboard" className="relative w-full rounded-[34px] border border-white/14 shadow-[0_28px_110px_rgba(0,0,0,.40)]" />
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section id="fiyatlandirma" className="bg-[#0E1E38] px-5 py-8 md:px-10">
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
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/14 text-white/78" aria-label="Kapat">
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

          <button className="h-11 rounded-[10px] bg-[#2563EB] text-[13px] font-semibold text-white">Gönder</button>
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
          <button className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/82">Tercihleri Yönet</button>
          <button onClick={() => setVisible(false)} className="h-12 rounded-[9px] border border-white/16 px-7 text-[13px] font-medium text-white/82">Reddet</button>
          <button onClick={() => { window.localStorage.setItem("eph-cookie-consent", "accepted"); setVisible(false); }} className="h-12 rounded-[9px] bg-[#2563EB] px-7 text-[13px] font-semibold text-white">Tümünü Kabul Et</button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
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
              <div className="mt-5 flex justify-center gap-3">
                {["f", "ig", "in", "yt"].map((item) => (
                  <span key={item} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4FC] text-[11px] font-bold text-[#2563EB]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="text-[15px] font-bold text-[#0F1E35]">Bize Ulaşın</div>
              <div className="mt-4 grid gap-3 text-[14px] font-semibold text-[#1F3B64]">
                <a href="tel:+905357909374" className="inline-flex items-center justify-center gap-2 md:justify-end">
                  <Phone size={16} className="text-[#2563EB]" />
                  +90 535 790 93 74
                </a>
                <a href="mailto:info@emlakportfoyhavuzu.com" className="inline-flex items-center justify-center gap-2 break-all md:justify-end">
                  <span className="text-[#2563EB]">@</span>
                  info@emlakportfoyhavuzu.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[#E6EEF8] pt-5 text-center text-[12px] font-medium text-[#6A7E96]">
            © 2024 EPH — Emlak Portföy Havuzu. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
      <PaymentBand />
      <CookieBanner />
      <HelpDrawer />
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #0B1730; }
        ::selection { background: rgba(37, 99, 235, 0.45); color: #ffffff; }
      `}</style>
    </main>
  );
}
