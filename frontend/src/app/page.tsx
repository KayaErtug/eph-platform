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
  MessageCircle,
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
  { icon: Home, title: "EPH Size Portföy Bulur!" },
  { icon: UsersRound, title: "EPH Size Müşteri Bulur!" },
  { icon: ClipboardList, title: "EPH Tüm İşlerinizi Organize Eder!" },
];

const aiLines = [
  "Yapay zeka sayesinde CRM kayıtlarınızı tarar, en uygun portföyü bulur.",
  "Yapay zeka sayesinde portföy kayıtlarınızı tarar, en uygun müşteriyi bulur.",
];

const stats = [
  { icon: Building2, value: "25.000+", label: "Aktif Portföy" },
  { icon: UsersRound, value: "10.000+", label: "Profesyonel Üye" },
  { icon: Sparkles, value: "1.500+", label: "Günlük Talep" },
  { icon: BellRing, value: "7/24", label: "Destek" },
  { icon: LineChart, value: "%98", label: "Başarı Oranı" },
  { icon: ShieldCheck, value: "100%", label: "Güvenli Altyapı" },
];

const aiFeatures = [
  { icon: Search, title: "CRM Taraması", text: "Kayıtlarınızı analiz eder, en uygun fırsatları bulur." },
  { icon: BarChart3, title: "Portföy Eşleştirme", text: "Portföylerinizi analiz eder, doğru alıcıyı bulur." },
  { icon: UsersRound, title: "Müşteri Eşleştirme", text: "Alıcı taleplerini tarar, en uygun ilanları eşleştirir." },
  { icon: BellRing, title: "Günlük Bildirim", text: "Yeni fırsatları günlük olarak size bildirir." },
  { icon: ContactRound, title: "Rehber Takibi", text: "Rehberinizdeki fırsatları sizin için takip eder." },
  { icon: Zap, title: "Tam Entegrasyon", text: "Tüm süreçlerinizi tek platformda yönetir." },
];

const solutionCards = [
  {
    title: "EPH ile Pazar Analizi Yapmak Çok Kolay!",
    image: "/showcase/dashboard.jpg",
    cta: "Raporu Keşfet",
    bullets: ["Sınırsız rapor", "Yapay zeka destekli", "Emsal analizi", "Kendi markanızla rapor"],
  },
  {
    title: "Alıcı Talepleri ile Eşleşmeyi Yakala!",
    image: "/showcase/crm.jpg",
    cta: "Talep Oluştur",
    bullets: ["Tüm ilan sitelerini tarar", "Uygun ilanları size bildirir", "Anlık eşleşme sağlar", "Fırsat kaçırma riskini azaltır"],
  },
  {
    title: "Rehberini Takip Et, Fırsatları Yakala!",
    image: "/showcase/network.jpg",
    cta: "Rehberi Bağla",
    bullets: ["Rehberinizdeki kişileri takip eder", "Satışa çıkan gayrimenkulleri bildirir", "Yeni portföy fırsatları oluşturur", "Bildirimlerle sizi uyarır"],
  },
];

const sliderItems = ["Premium Gayrimenkul", "Vizyon Grup", "Delta Yapı", "Referans Emlak", "Ali Rıza Emlak", "Kaya Gayrimenkul"];

const footerAdvantages = [
  { icon: BellRing, title: "Hız & Verimlilik", text: "Zamandan kazanın, daha çok kazanın." },
  { icon: Sparkles, title: "Kolay Kullanım", text: "Basit, anlaşılır ve kullanıcı dostu arayüz." },
  { icon: Zap, title: "Az Maliyet", text: "Yüksek performans, düşük maliyet." },
  { icon: ShieldCheck, title: "Güvenli Altyapı", text: "Verileriniz 256-bit SSL ile korunur." },
];

function LogoBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center justify-center gap-3">
      <img src="/LOGO_EPH.png" alt="EPH Platform" className={compact ? "h-12 w-12 object-contain" : "h-16 w-16 object-contain"} />
      <div className="text-left">
        <p className={compact ? "text-2xl font-black leading-none text-white" : "text-3xl font-black leading-none text-white"}>E.P.H.</p>
        <p className="mt-1 text-[11px] font-bold leading-none text-white/80">Emlak Portföy Havuzu</p>
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
        className="fixed bottom-5 right-5 z-50 hidden items-center gap-2 rounded-full border border-[#BBF7D0] bg-white px-5 py-3 text-sm font-black text-[#166534] shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 md:flex"
      >
        <Phone size={20} />
        WhatsApp&apos;tan Yazın
      </button>

      <div
        className={`fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed bottom-0 right-0 z-[90] w-full max-w-[420px] rounded-t-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.30)] transition duration-300 md:bottom-6 md:right-6 md:rounded-[30px] ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0F172A]"
          aria-label="Kapat"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <img src="/LOGO_EPH.png" alt="EPH" className="h-14 w-14 object-contain" />
          <div>
            <h3 className="text-xl font-black leading-tight text-[#071332]">Size Nasıl Yardımcı Olabiliriz?</h3>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Formu doldurun, sizi arayalım.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <input className="h-12 rounded-xl border border-[#D7E2F1] bg-[#F8FAFC] px-4 text-sm font-semibold outline-none transition focus:border-[#1557D6] focus:bg-white" placeholder="Ad Soyad" />
          <input className="h-12 rounded-xl border border-[#D7E2F1] bg-[#F8FAFC] px-4 text-sm font-semibold outline-none transition focus:border-[#1557D6] focus:bg-white" placeholder="Telefon Numaranız" />
          <input className="h-12 rounded-xl border border-[#D7E2F1] bg-[#F8FAFC] px-4 text-sm font-semibold outline-none transition focus:border-[#1557D6] focus:bg-white" placeholder="E-posta Adresiniz" />

          <div>
            <p className="mb-3 text-sm font-black text-[#071332]">Emlak Ofisiniz Var Mı?</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D7E2F1] bg-white px-3 py-3 text-xs font-bold text-[#334155]">
                <input type="radio" name="office" defaultChecked />
                Evet, var
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D7E2F1] bg-white px-3 py-3 text-xs font-bold text-[#334155]">
                <input type="radio" name="office" />
                Hayır, yok
              </label>
            </div>
          </div>

          <button type="button" className="mt-1 h-12 rounded-xl bg-[#1557D6] text-sm font-black text-white shadow-[0_14px_28px_rgba(21,87,214,0.25)] transition hover:bg-[#0F49BD]">
            Gönder
          </button>

          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-[58px] items-center justify-center gap-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 text-center text-sm font-black text-[#166534]">
            <Phone size={21} />
            WhatsApp&apos;tan Yazın {whatsappNumber}
          </a>
        </div>
      </aside>
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F8FF] text-[#071332]">
      <section className="relative overflow-hidden rounded-b-[28px] bg-[#061733] text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] md:rounded-b-[40px]">
        <div className="absolute inset-0">
          <img src="/showcase/dashboard.jpg" alt="EPH Platform" className="h-full w-full object-cover opacity-[0.34]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,12,30,0.96),rgba(7,23,51,0.82),rgba(3,12,30,0.92))]" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <LogoBlock compact />

          <nav className="hidden items-center gap-9 text-sm font-black text-white/85 lg:flex">
            <a href="#ana" className="text-white">Ana Sayfa</a>
            <a href="#ozellikler" className="hover:text-white">Özellikler</a>
            <a href="#moduller" className="hover:text-white">Modüller</a>
            <a href="#pazar" className="hover:text-white">Pazar Analizi</a>
            <a href="#fiyatlar" className="hover:text-white">Fiyatlar</a>
            <a href="#iletisim" className="hover:text-white">İletişim</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/giris" className="flex h-11 items-center justify-center rounded-xl border border-white/25 px-7 text-sm font-black text-white transition hover:bg-white/10">Giriş Yap</Link>
            <Link href="/kayit" className="flex h-11 items-center justify-center rounded-xl bg-[#1557D6] px-7 text-sm font-black text-white shadow-[0_14px_32px_rgba(21,87,214,0.35)] transition hover:bg-[#0F49BD]">Ücretsiz Başvur</Link>
          </div>

          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 md:hidden" aria-label="Menü">
            <Menu size={24} />
          </button>
        </header>

        <div id="ana" className="relative z-10 mx-auto max-w-7xl px-5 pb-7 pt-4 text-center md:px-8 md:pb-12 md:pt-4">
          <div className="mx-auto hidden justify-center md:flex">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-20 w-20 object-contain" />
          </div>

          <div className="mx-auto mt-2 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/90">
            ✨ Emlak Sektörünün Dijital Platformu
          </div>

          <h1 className="mx-auto mt-5 max-w-3xl text-center text-[32px] font-black leading-[1.08] tracking-[-0.045em] text-white md:text-[56px] lg:text-[64px]">
            Emlakçılar ve Müteahhitler İçin
            <span className="block text-[#4F8CFF]">Her Şey Tek Uygulamada!</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-center text-[15px] font-semibold leading-7 text-white/82 md:text-lg">
            EPH, gayrimenkul profesyonellerine özel olarak bizzat sektörün içindeki emlakçılar tarafından titizlikle hazırlandı.
          </p>

          <div className="mx-auto mt-6 grid max-w-3xl gap-3 md:grid-cols-3">
            {heroPromises.map((item) => (
              <article key={item.title} className="group flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-white/20 bg-white text-center text-[#071332] shadow-[0_20px_50px_rgba(15,23,42,0.25)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(21,87,214,0.30)]">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]">
                  <item.icon size={22} />
                </div>
                <h2 className="text-[15px] font-black leading-tight">{item.title}</h2>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-3 grid max-w-3xl gap-2">
            {aiLines.map((line) => (
              <div key={line} className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/92 px-4 text-center text-sm font-bold text-[#1E293B] shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                <Bot size={18} className="shrink-0 text-[#1557D6]" />
                <span>{line}</span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-6 grid max-w-[520px] gap-3 sm:grid-cols-2">
            <Link href="/kayit" className="flex min-h-[60px] items-center justify-center gap-3 rounded-2xl bg-[#1557D6] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(21,87,214,0.38)] transition hover:-translate-y-0.5 hover:bg-[#0F49BD]">
              Ücretsiz Başvur
              <ArrowRight size={22} />
            </Link>
            <button type="button" className="flex min-h-[60px] items-center justify-center gap-3 rounded-2xl border border-white/35 bg-white/8 px-6 text-sm font-black text-white transition hover:bg-white/14">
              Platformu İzle
              <Play size={21} />
            </button>
          </div>

          <div className="mx-auto mt-5 grid max-w-5xl grid-cols-2 overflow-hidden rounded-2xl border border-white/15 bg-[#071C3B]/82 shadow-[0_18px_50px_rgba(15,23,42,0.28)] sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((item) => (
              <div key={item.label} className="flex min-h-[86px] flex-col items-center justify-center border-b border-r border-white/10 px-3 text-center last:border-r-0 lg:border-b-0">
                <item.icon size={24} className="mb-2 text-[#4F8CFF]" />
                <strong className="text-[22px] font-black leading-none text-white">{item.value}</strong>
                <span className="mt-1 text-xs font-bold text-white/78">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ozellikler" className="px-5 py-7 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-black tracking-[-0.03em] text-[#06194A] md:text-4xl">Yapay Zeka Gücü ile Fark Yaratın</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {aiFeatures.map((item) => (
              <article key={item.title} className="group flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#1557D6] hover:shadow-[0_20px_45px_rgba(21,87,214,0.16)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
                  <item.icon size={25} />
                </div>
                <h3 className="mt-3 text-sm font-black text-[#071332]">{item.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#475569]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pazar" className="px-5 pb-8 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {solutionCards.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-3xl border border-[#DDE7F3] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <div className="grid gap-4 p-5 sm:grid-cols-[1fr_150px] lg:grid-cols-1 xl:grid-cols-[1fr_150px]">
                <div className="text-center sm:text-left lg:text-center xl:text-left">
                  <h3 className="text-xl font-black leading-tight text-[#06194A]">{item.title}</h3>
                  <ul className="mt-4 grid gap-2">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center justify-center gap-2 text-sm font-bold text-[#334155] sm:justify-start lg:justify-center xl:justify-start">
                        <Check size={17} className="text-[#1557D6]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="mt-5 h-11 rounded-xl bg-[#1557D6] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(21,87,214,0.20)] transition hover:bg-[#0F49BD]">
                    {item.cta}
                  </button>
                </div>

                <div className="mx-auto h-[170px] w-full max-w-[180px] overflow-hidden rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] shadow-inner">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="moduller" className="px-5 pb-8 md:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[#0B2145] bg-[#061733] text-white shadow-[0_20px_65px_rgba(15,23,42,0.20)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15"><ChevronLeft size={20} /></button>
            <div className="min-w-0 text-center">
              <h3 className="text-xl font-black">Binlerce Profesyonel EPH&apos;yi Tercih Ediyor</h3>
              <p className="mt-1 text-sm font-semibold text-white/65">Gerçek kullanıcılarımızın başarı hikayeleri</p>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15"><ChevronRight size={20} /></button>
          </div>

          <div className="flex animate-[marquee_26s_linear_infinite] gap-4 px-5 py-5 [@media(prefers-reduced-motion:reduce)]:animate-none">
            {[...sliderItems, ...sliderItems].map((item, index) => (
              <div key={`${item}-${index}`} className="flex min-w-[220px] items-center justify-center rounded-2xl border border-white/10 bg-white/6 p-4 text-center">
                <div>
                  <p className="text-sm font-black">{item}</p>
                  <p className="mt-1 text-[#FACC15]">★★★★★</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid border-t border-white/10 md:grid-cols-4">
            {footerAdvantages.map((item) => (
              <article key={item.title} className="flex items-center justify-center gap-3 border-b border-white/10 p-5 text-center md:border-b-0 md:border-r last:md:border-r-0">
                <item.icon size={27} className="shrink-0 text-white/85" />
                <div>
                  <h4 className="text-sm font-black">{item.title}</h4>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/60">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer id="iletisim" className="px-5 pb-6 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-3xl border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:grid-cols-4 md:items-center">
          <div className="text-2xl font-black text-[#1557D6]">PAYTR</div>
          <div className="text-2xl font-black text-[#1557D6]">iyzico</div>
          <div className="text-2xl font-black text-[#DC2626]">Ziraat Pay</div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 rounded-2xl bg-[#F0FDF4] px-4 py-3 text-sm font-black text-[#166534]">
            <Phone size={21} />
            WhatsApp&apos;tan Yazın
            <span className="block text-xs">{whatsappNumber}</span>
          </a>
        </div>
      </footer>

      <HelpDrawer />

      <style jsx global>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}
