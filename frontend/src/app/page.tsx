"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ContactRound,
  Home,
  LineChart,
  Menu,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

const whatsappNumber = "+90 535 79 09 374";
const whatsappUrl = "https://wa.me/905357909374";

const heroPromises = [
  { icon: Home, title: "Portföy Bulur" },
  { icon: UsersRound, title: "Müşteri Bulur" },
  { icon: ClipboardList, title: "İşleri Organize Eder" },
];

const aiLines = [
  "CRM kayıtlarınızı tarar, uygun portföyü bulur.",
  "Portföy kayıtlarınızı tarar, uygun müşteriyi bulur.",
];

const stats = [
  { icon: Building2, value: "25K+", label: "Portföy" },
  { icon: UsersRound, value: "10K+", label: "Üye" },
  { icon: Sparkles, value: "1.5K+", label: "Talep" },
  { icon: BellRing, value: "7/24", label: "Destek" },
];

const aiFeatures = [
  { icon: Search, title: "CRM Taraması", text: "Kayıtlarınızı analiz eder." },
  { icon: BarChart3, title: "Portföy Eşleştirme", text: "Doğru alıcıyı bulur." },
  { icon: UsersRound, title: "Müşteri Eşleştirme", text: "En uygun talebi yakalar." },
  { icon: BellRing, title: "Günlük Bildirim", text: "Fırsatları bildirir." },
  { icon: ContactRound, title: "Rehber Takibi", text: "Yeni portföy fırsatı üretir." },
  { icon: Zap, title: "Tam Entegrasyon", text: "Tüm işler tek yerde." },
];

const solutionCards = [
  {
    title: "Pazar Analizi",
    image: "/showcase/dashboard.jpg",
    cta: "Raporu Keşfet",
    bullets: ["Sınırsız rapor", "Yapay zeka destekli", "Emsal analizi", "Kendi markanızla"],
  },
  {
    title: "Alıcı Talebi",
    image: "/showcase/crm.jpg",
    cta: "Talep Oluştur",
    bullets: ["İlanları tarar", "Eşleşme bildirir", "Fırsat kaçırmaz", "Günlük takip"],
  },
  {
    title: "Rehber Takibi",
    image: "/showcase/network.jpg",
    cta: "Rehberi Bağla",
    bullets: ["Kişileri takip eder", "Satışa çıkanları bildirir", "Portföy fırsatı üretir", "Bildirim gönderir"],
  },
];

const sliderItems = ["Premium Gayrimenkul", "Vizyon Grup", "Delta Yapı", "Referans Emlak", "Ali Rıza Emlak", "Kaya Gayrimenkul"];

const footerAdvantages = [
  { icon: BellRing, title: "Hız", text: "Zamandan kazanın." },
  { icon: Sparkles, title: "Kolay Kullanım", text: "Sade ve anlaşılır." },
  { icon: Zap, title: "Az Maliyet", text: "Verimli altyapı." },
  { icon: ShieldCheck, title: "Güvenli", text: "SSL koruması." },
];

function LogoBlock() {
  return (
    <Link href="/" className="flex items-center justify-center gap-2">
      <img src="/LOGO_EPH.png" alt="EPH Platform" className="h-10 w-10 object-contain md:h-12 md:w-12" />
      <div className="text-left">
        <p className="text-[21px] font-black leading-none text-white md:text-2xl">E.P.H.</p>
        <p className="mt-0.5 text-[9px] font-bold leading-none text-white/78 md:text-[10px]">Emlak Portföy Havuzu</p>
      </div>
    </Link>
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
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 hidden items-center gap-2 rounded-full border border-[#BBF7D0] bg-white px-4 py-2.5 text-xs font-black text-[#166534] shadow-[0_14px_34px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 md:flex"
      >
        <Phone size={17} />
        WhatsApp
      </button>

      <div
        className={`fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-sm transition ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed bottom-0 right-0 z-[90] w-full max-w-[340px] rounded-t-[24px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.28)] transition duration-300 md:bottom-5 md:right-5 md:rounded-[24px] ${
          open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0F172A]"
          aria-label="Kapat"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 pr-8">
          <img src="/LOGO_EPH.png" alt="EPH" className="h-11 w-11 object-contain" />
          <div>
            <h3 className="text-base font-black leading-tight text-[#071332]">Size nasıl yardımcı olabiliriz?</h3>
            <p className="mt-0.5 text-xs font-semibold text-[#64748B]">Formu doldurun, sizi arayalım.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5">
          <input className="h-10 rounded-lg border border-[#D7E2F1] bg-[#F8FAFC] px-3 text-xs font-semibold outline-none focus:border-[#1557D6] focus:bg-white" placeholder="Ad Soyad" />
          <input className="h-10 rounded-lg border border-[#D7E2F1] bg-[#F8FAFC] px-3 text-xs font-semibold outline-none focus:border-[#1557D6] focus:bg-white" placeholder="Telefon" />
          <input className="h-10 rounded-lg border border-[#D7E2F1] bg-[#F8FAFC] px-3 text-xs font-semibold outline-none focus:border-[#1557D6] focus:bg-white" placeholder="E-posta" />

          <div>
            <p className="mb-2 text-xs font-black text-[#071332]">Emlak Ofisiniz Var Mı?</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D7E2F1] bg-white px-2 py-2 text-[11px] font-bold text-[#334155]">
                <input type="radio" name="office" defaultChecked />
                Evet
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D7E2F1] bg-white px-2 py-2 text-[11px] font-bold text-[#334155]">
                <input type="radio" name="office" />
                Hayır
              </label>
            </div>
          </div>

          <button type="button" className="h-10 rounded-lg bg-[#1557D6] text-xs font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.22)]">
            Gönder
          </button>

          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 text-center text-xs font-black text-[#166534]">
            <Phone size={17} />
            WhatsApp {whatsappNumber}
          </a>
        </div>
      </aside>
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F8FF] text-[#071332]">
      <section className="relative overflow-hidden rounded-b-[22px] bg-[#061733] text-white shadow-[0_18px_55px_rgba(15,23,42,0.22)] md:rounded-b-[34px]">
        <div className="absolute inset-0">
          <img src="/showcase/dashboard.jpg" alt="EPH Platform" className="h-full w-full object-cover opacity-[0.28]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,12,30,0.96),rgba(7,23,51,0.84),rgba(3,12,30,0.94))]" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8 md:py-5">
          <LogoBlock />

          <nav className="hidden items-center gap-8 text-xs font-black text-white/82 lg:flex">
            <a href="#ana" className="text-white">Ana Sayfa</a>
            <a href="#ozellikler" className="hover:text-white">Özellikler</a>
            <a href="#moduller" className="hover:text-white">Modüller</a>
            <a href="#pazar" className="hover:text-white">Pazar Analizi</a>
            <a href="#iletisim" className="hover:text-white">İletişim</a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/giris" className="flex h-10 items-center justify-center rounded-xl border border-white/25 px-6 text-xs font-black text-white transition hover:bg-white/10">
              Giriş Yap
            </Link>
            <Link href="/kayit" className="flex h-10 items-center justify-center rounded-xl bg-[#1557D6] px-6 text-xs font-black text-white shadow-[0_12px_28px_rgba(21,87,214,0.30)]">
              Ücretsiz Başvur
            </Link>
          </div>

          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 md:hidden" aria-label="Menü">
            <Menu size={22} />
          </button>
        </header>

        <div id="ana" className="relative z-10 mx-auto max-w-7xl px-4 pb-5 pt-2 text-center md:px-8 md:pb-10 md:pt-3">
          <div className="mx-auto inline-flex max-w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/90 md:text-[11px]">
            ✨ Emlak Sektörünün Dijital Platformu
          </div>

          <h1 className="mx-auto mt-4 max-w-3xl text-center text-[25px] font-black leading-[1.08] tracking-[-0.04em] text-white md:text-[48px] lg:text-[56px]">
            Gayrimenkul Profesyonellerinin
            <span className="block text-[#4F8CFF]">Dijital Merkezi</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-center text-[13px] font-semibold leading-6 text-white/82 md:text-base">
            Emlakçılar ve müteahhitler için portföy, müşteri, CRM, pazar analizi ve yapay zeka tek uygulamada.
          </p>

          <div className="mx-auto mt-5 grid max-w-3xl gap-2 md:grid-cols-3">
            {heroPromises.map((item) => (
              <article key={item.title} className="group flex min-h-[62px] items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white px-3 text-center text-[#071332] shadow-[0_16px_42px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]">
                  <item.icon size={20} />
                </div>
                <h2 className="text-[17px] font-black leading-tight md:text-[15px]">{item.title}</h2>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-2 grid max-w-3xl gap-2">
            {aiLines.map((line) => (
              <div key={line} className="flex min-h-[34px] items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/92 px-3 text-center text-[12px] font-bold leading-5 text-[#1E293B] shadow-[0_10px_24px_rgba(15,23,42,0.13)] md:text-sm">
                <Bot size={15} className="shrink-0 text-[#1557D6]" />
                <span>{line}</span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-4 grid max-w-[460px] gap-2.5 sm:grid-cols-2">
            <Link href="/kayit" className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,87,214,0.34)] transition hover:-translate-y-0.5 hover:bg-[#0F49BD]">
              Ücretsiz Başvur
              <ArrowRight size={19} />
            </Link>
            <button type="button" className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/8 px-5 text-sm font-black text-white transition hover:bg-white/14">
              Platformu İzle
              <Play size={18} />
            </button>
          </div>

          <div className="mx-auto mt-4 grid max-w-3xl grid-cols-4 overflow-hidden rounded-2xl border border-white/15 bg-[#071C3B]/82 shadow-[0_14px_40px_rgba(15,23,42,0.24)]">
            {stats.map((item) => (
              <div key={item.label} className="flex min-h-[66px] flex-col items-center justify-center border-r border-white/10 px-2 text-center last:border-r-0">
                <item.icon size={18} className="mb-1.5 text-[#4F8CFF]" />
                <strong className="text-[17px] font-black leading-none text-white md:text-[21px]">{item.value}</strong>
                <span className="mt-1 text-[10px] font-bold text-white/75 md:text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ozellikler" className="px-4 py-6 md:px-8 md:py-9">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-xl font-black tracking-[-0.03em] text-[#06194A] md:text-4xl">
            Yapay Zeka Gücü ile Fark Yaratın
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
            {aiFeatures.map((item) => (
              <article key={item.title} className="group flex min-h-[116px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_10px_26px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-[#1557D6]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
                  <item.icon size={21} />
                </div>
                <h3 className="mt-2 text-xs font-black text-[#071332] md:text-sm">{item.title}</h3>
                <p className="mt-1.5 text-[11px] font-semibold leading-4 text-[#475569] md:text-xs">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pazar" className="px-4 pb-7 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-3">
          {solutionCards.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-3xl border border-[#DDE7F3] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5">
              <div className="grid gap-3 p-4 sm:grid-cols-[1fr_126px] lg:grid-cols-1 xl:grid-cols-[1fr_126px]">
                <div className="text-center sm:text-left lg:text-center xl:text-left">
                  <h3 className="text-lg font-black leading-tight text-[#06194A]">{item.title}</h3>
                  <ul className="mt-3 grid gap-1.5">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center justify-center gap-2 text-xs font-bold text-[#334155] sm:justify-start lg:justify-center xl:justify-start">
                        <Check size={15} className="text-[#1557D6]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="mt-4 h-10 rounded-xl bg-[#1557D6] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.18)]">
                    {item.cta}
                  </button>
                </div>

                <div className="mx-auto h-[132px] w-full max-w-[150px] overflow-hidden rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC]">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="moduller" className="px-4 pb-7 md:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[#0B2145] bg-[#061733] text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 text-center">
              <h3 className="text-base font-black md:text-xl">Binlerce Profesyonel EPH&apos;yi Tercih Ediyor</h3>
              <p className="mt-1 text-xs font-semibold text-white/65">Gerçek kullanıcı başarı hikayeleri</p>
            </div>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex animate-[marquee_26s_linear_infinite] gap-3 px-4 py-4 [@media(prefers-reduced-motion:reduce)]:animate-none">
            {[...sliderItems, ...sliderItems].map((item, index) => (
              <div key={`${item}-${index}`} className="flex min-w-[180px] items-center justify-center rounded-2xl border border-white/10 bg-white/6 p-3 text-center">
                <div>
                  <p className="text-xs font-black">{item}</p>
                  <p className="mt-1 text-xs text-[#FACC15]">★★★★★</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid border-t border-white/10 md:grid-cols-4">
            {footerAdvantages.map((item) => (
              <article key={item.title} className="flex items-center justify-center gap-2 border-b border-white/10 p-4 text-center md:border-b-0 md:border-r last:md:border-r-0">
                <item.icon size={23} className="shrink-0 text-white/85" />
                <div>
                  <h4 className="text-xs font-black">{item.title}</h4>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-white/60">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer id="iletisim" className="px-4 pb-5 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-2 rounded-3xl border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:grid-cols-4 md:items-center">
          <div className="text-xl font-black text-[#1557D6]">PAYTR</div>
          <div className="text-xl font-black text-[#1557D6]">iyzico</div>
          <div className="text-xl font-black text-[#DC2626]">Ziraat Pay</div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[#F0FDF4] px-3 py-2.5 text-xs font-black text-[#166534]">
            <Phone size={18} />
            WhatsApp {whatsappNumber}
          </a>
        </div>
      </footer>

      <HelpDrawer />

      <style jsx global>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}
