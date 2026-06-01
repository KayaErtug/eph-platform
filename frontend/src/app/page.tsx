"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Bot,
  Building2,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

const processCards = [
  {
    icon: Building2,
    title: "Portföy Havuzu",
    text: "Portföylerinizi paylaşın, doğru alıcı ve yatırımcıya hızlıca ulaşın.",
  },
  {
    icon: ArrowRight,
    title: "Talep Akışı",
    text: "Alıcı, kiracı, satıcı ve yatırımcı talepleri doğru profesyonellere ulaşır.",
  },
  {
    icon: UsersRound,
    title: "CRM Takibi",
    text: "Müşteri ve ilan süreçlerinizi takip edin, hiçbir fırsatı kaçırmayın.",
  },
  {
    icon: MessageCircle,
    title: "Mesajlaşma",
    text: "Üyelerle güvenli ve hızlı iletişim kurun, tüm görüşmeleri kayıt altında tutun.",
  },
  {
    icon: Bot,
    title: "Lina AI Asistan",
    text: "Lina, süreçlerinizi kolaylaştırır ve işlerinizi hızlandırır.",
  },
];

const screens = [
  {
    image: "/showcase/dashboard.jpg",
    icon: Building2,
    title: "Dashboard",
    text: "Genel görünüm ve performans takibi",
  },
  {
    image: "/showcase/crm.jpg",
    icon: UsersRound,
    title: "CRM",
    text: "Müşteri ve fırsat yönetimi",
  },
  {
    image: "/showcase/stock.jpg",
    icon: Building2,
    title: "Stok",
    text: "Portföylerinizi ekleyin ve yönetin",
  },
  {
    image: "/showcase/network.jpg",
    icon: Network,
    title: "Network",
    text: "Doğru iş ortaklarıyla bağlantılar kurun",
  },
  {
    image: "/showcase/lina.jpg",
    icon: Sparkles,
    title: "Lina AI",
    text: "Akıllı asistanınız Lina ile hızlı çözümler",
  },
];

const liveItems = [
  {
    dot: "bg-emerald-500",
    text: "Karahanlı bölgesinde satılık 2+1 daire aranıyor · müşteri hazır · komisyon paylaşımlı",
    time: "2 dk önce",
  },
  {
    dot: "bg-amber-500",
    text: "Selçuk Bey'de 1160 m² kat karşılığı arsa · Bodrum + 5 Kat · %45 Kat Karşılığı",
    time: "7 dk önce",
  },
  {
    dot: "bg-blue-600",
    text: "Doktor müşterim için; Bölge Hastanesi'ne yakın 2+1 kiralık daire arıyorum · acil",
    time: "11 dk önce",
  },
  {
    dot: "bg-violet-600",
    text: "Çakmak'ta 1400 m² kat karşılığı arsa · Bodrum + 3 Kat · %40 Kat Karşılığı",
    time: "18 dk önce",
  },
];

export default function LandingPage() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("ephIntroVideoSeen");

    if (seen) return;

    const timer = window.setTimeout(() => {
      setShowVideo(true);
      sessionStorage.setItem("ephIntroVideoSeen", "true");
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#071332]">
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/LOGO_EPH.png"
              alt="EPH Platform"
              className="h-10 w-10 shrink-0 rounded-xl border border-[#E2E8F0] bg-white object-contain p-1 shadow-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-tight text-[#071332] sm:text-base">
                EPH Platform
              </p>
              <p className="truncate text-[9px] font-black uppercase tracking-[0.24em] text-[#2563EB] sm:text-[10px]">
                Emlak Portföy Havuzu
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-black text-[#172554] lg:flex">
            <a href="#kesfet" className="transition hover:text-[#2563EB]">
              Keşfet
            </a>
            <a href="#moduller" className="transition hover:text-[#2563EB]">
              Modüller
            </a>
            <a href="#guven" className="transition hover:text-[#2563EB]">
              Güven
            </a>
            <a href="#hakkimizda" className="transition hover:text-[#2563EB]">
              Hakkımızda
            </a>
          </nav>

          <Link
            href="/giris"
            className="flex h-11 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 text-xs font-black text-[#071332] shadow-sm transition hover:border-[#2563EB] hover:text-[#2563EB] sm:text-sm"
          >
            Giriş Yap
          </Link>
        </div>
      </header>

      <section id="kesfet" className="relative overflow-hidden bg-[#FBFCFF]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_28%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-8 lg:py-16">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-black text-[#2563EB] shadow-sm">
              <ShieldCheck size={16} />
              Onaylı profesyonel ağ
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-center text-[40px] font-black leading-[1.08] tracking-[-0.04em] text-[#071332] sm:text-6xl lg:mx-0 lg:text-left">
              Emlak profesyonelleri için kapalı devre
              <span className="block text-[#2563EB]">
                portföy, talep ve iş birliği ağı.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-center text-base font-semibold leading-8 text-[#475569] sm:text-lg lg:mx-0 lg:text-left">
              EPH; gayrimenkul danışmanları, müteahhitler ve inşaat firmalarını
              kontrollü bir iş ağı içinde buluşturur. Portföyler, talepler, CRM
              ve mesajlaşma tek merkezde toplanır.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 text-center shadow-sm">
                <UsersRound className="mx-auto text-[#2563EB]" size={28} />
                <p className="mt-3 text-xs font-black text-[#071332]">
                  Onaylı üyeler
                </p>
              </div>
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 text-center shadow-sm">
                <ShieldCheck className="mx-auto text-[#2563EB]" size={28} />
                <p className="mt-3 text-xs font-black text-[#071332]">
                  Referanslı sistem
                </p>
              </div>
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 text-center shadow-sm">
                <LockKeyhole className="mx-auto text-[#2563EB]" size={28} />
                <p className="mt-3 text-xs font-black text-[#071332]">
                  Kapalı network
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#2563EB]">
                  Canlı İş Merkezi
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#071332]">
                  EPH Kontrol Paneli
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-600/20">
                <BellRing size={22} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center">
                <p className="text-2xl font-black text-[#071332]">8.700+</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">
                  Portföy
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center">
                <p className="text-2xl font-black text-[#071332]">344+</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">
                  Aktif Üye
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {liveItems.map((item) => (
                <div
                  key={item.text}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${item.dot}`}
                  />
                  <p className="text-left text-xs font-bold leading-5 text-[#334155] sm:text-sm">
                    {item.text}
                  </p>
                  <p className="whitespace-nowrap text-xs font-semibold text-[#64748B]">
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 text-center sm:px-6 lg:px-8">
          <Link
            href="/kayit"
            className="mx-auto inline-flex min-h-[60px] w-full max-w-[430px] items-center justify-center gap-3 rounded-2xl bg-[#2563EB] px-7 text-base font-black text-white shadow-xl shadow-blue-600/25 transition hover:bg-[#1D4ED8]"
          >
            <UsersRound size={22} />
            EPH’ye Katılmak İçin Başvur
            <ArrowRight size={21} />
          </Link>
        </div>
      </section>

      <section id="moduller" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
            EPH ne işe yarar?
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#071332] sm:text-4xl">
            Tüm iş süreçlerinizi tek platformda yönetin
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {processCards.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border border-[#E2E8F0] bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <item.icon size={27} />
                </div>
                <h3 className="mt-5 text-base font-black text-[#071332]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">
            Platform Ekranları
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#071332] sm:text-4xl">
            EPH’yi yakından tanıyın
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {screens.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white text-center shadow-sm"
              >
                <div className="h-32 overflow-hidden bg-[#F8FAFC]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    <item.icon size={18} />
                  </div>
                  <h3 className="mt-3 text-base font-black text-[#071332]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
                    {item.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="guven" className="bg-white px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-[#BFDBFE] bg-[#F8FBFF] p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
            <UsersRound size={40} />
          </div>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black text-[#071332] sm:text-4xl">
            Kapalı devre gayrimenkul iş ağına dahil olun.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[#475569]">
            EPH’ye katılmak için başvurunuzu oluşturun. Başvurular admin
            kontrolünden geçer. Onaylanan kullanıcılar kapalı devre iş ağına
            dahil olur.
          </p>

          <Link
            href="/kayit"
            className="mx-auto mt-7 inline-flex min-h-[56px] w-full max-w-[380px] items-center justify-center gap-3 rounded-2xl bg-[#2563EB] px-6 text-base font-black text-white shadow-xl shadow-blue-600/20 transition hover:bg-[#1D4ED8]"
          >
            <UsersRound size={21} />
            Üyelik Başvurusu Yap
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <footer
        id="hakkimizda"
        className="border-t border-[#E2E8F0] bg-white px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center lg:flex-row lg:text-left">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/LOGO_EPH.png"
              alt="EPH Platform"
              className="h-9 w-9 rounded-xl border border-[#E2E8F0] bg-white object-contain p-1"
            />
            <div>
              <p className="text-sm font-black text-[#071332]">
                EPH Platform
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#2563EB]">
                Emlak Portföy Havuzu
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-black text-[#334155]">
            <Link href="/platform-anayasasi">Hakkımızda</Link>
            <Link href="/kullanici-sozlesmesi">Kullanım Şartları</Link>
            <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/iletisim">İletişim</Link>
          </div>

          <p className="text-xs font-semibold text-[#64748B]">
            © 2026 EPH Platform. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>

      {showVideo ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-0 backdrop-blur-xl md:p-5"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black md:h-[92vh] md:max-w-[520px] md:rounded-[32px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={20} />
            </button>

            <video
              src="/eph.mp4"
              controls
              autoPlay
              muted
              playsInline
              className="h-full w-full bg-black object-cover"
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowVideo(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-xl shadow-blue-600/30"
        aria-label="Tanıtım videosunu aç"
      >
        <Play size={22} fill="white" />
      </button>
    </main>
  );
}