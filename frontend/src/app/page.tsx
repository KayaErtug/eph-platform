"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Handshake,
  LockKeyhole,
  MessageCircle,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const featureCards = [
  {
    icon: Building2,
    title: "Portföy Havuzu",
    text: "Portföylerinizi paylaşın, doğru alıcıya ulaşın.",
  },
  {
    icon: UsersRound,
    title: "Talep Akışı",
    text: "Talepler doğru profesyonellere ulaşır.",
  },
  {
    icon: Handshake,
    title: "Güvenli İş Ağı",
    text: "Doğrulanmış üyelerle güvenli iş birlikleri kurun.",
  },
  {
    icon: MessageCircle,
    title: "Mesajlaşma",
    text: "Güvenli ve hızlı iletişim kurun.",
  },
  {
    icon: Bot,
    title: "Lina AI Asistan",
    text: "Lina süreçlerinizi kolaylaştırır.",
  },
];

const modules = [
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
    text: "Akıllı asistanınız ile hızlı çözümler",
  },
];

function LoginTile() {
  return (
    <Link
      href="/giris"
      className="flex h-[74px] w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border border-[#D7E2F1] bg-white text-[#1557D6] shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-[#1557D6] md:h-[82px] md:w-[82px]"
      aria-label="Giriş yap"
    >
      <LockKeyhole size={27} strokeWidth={2.6} />
      <span className="mt-1 text-[13px] font-black tracking-wide">GİRİŞ</span>
    </Link>
  );
}

function LogoTile() {
  return (
    <Link
      href="/"
      className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-2xl border border-[#D7E2F1] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)] md:h-[82px] md:w-[82px]"
      aria-label="EPH Platform"
    >
      <img
        src="/LOGO_EPH.png"
        alt="EPH Platform"
        className="h-[58px] w-[58px] object-contain md:h-[66px] md:w-[66px]"
      />
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7FBFF] text-[#071332]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/96 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[82px_1fr_82px] items-center gap-2 px-4 py-4 md:grid-cols-[130px_1fr_130px] md:px-6 lg:px-8">
          <div className="flex justify-start">
            <LogoTile />
          </div>

          <div className="min-w-0 text-center">
            <Link href="/" className="inline-block">
              <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#06194A] md:text-[36px] lg:text-[44px]">
                EPH Platform
              </p>
              <p className="mt-1 text-[13px] font-bold leading-none text-[#1557D6] md:text-[19px] lg:text-[24px]">
                Emlak Portföy Havuzu
              </p>
            </Link>

            <nav className="mt-5 hidden items-center justify-center gap-10 text-sm font-black text-[#071332] md:flex">
              <a href="#kesfet" className="group text-center transition hover:text-[#1557D6]">
                Keşfet
                <span className="mx-auto mt-2 block h-2 w-2 rounded-full bg-[#1557D6]" />
              </a>
              <a href="#moduller" className="group text-center transition hover:text-[#1557D6]">
                Modüller
                <span className="mx-auto mt-2 block h-2 w-2 rounded-full bg-[#1557D6]" />
              </a>
              <a href="#guven" className="group text-center transition hover:text-[#1557D6]">
                Güven
                <span className="mx-auto mt-2 block h-2 w-2 rounded-full bg-[#1557D6]" />
              </a>
              <a href="#hakkimizda" className="group text-center transition hover:text-[#1557D6]">
                Hakkımızda
                <span className="mx-auto mt-2 block h-2 w-2 rounded-full bg-[#1557D6]" />
              </a>
            </nav>
          </div>

          <div className="flex justify-end">
            <LoginTile />
          </div>
        </div>
      </header>

      <section id="kesfet" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(37,99,235,0.10),transparent_35%),radial-gradient(circle_at_right,rgba(96,165,250,0.18),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-10 pt-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pb-12 lg:pt-16">
          <div className="text-center lg:text-left">
            <h1 className="mx-auto max-w-3xl text-[34px] font-black leading-[1.12] tracking-[-0.045em] text-[#06194A] md:text-[52px] lg:mx-0 lg:text-[56px]">
              Gayrimenkul profesyonelleri için
              <span className="block text-[#1557D6]">kapalı devre iş ağı</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-[16px] font-semibold leading-8 text-[#27364F] md:text-[19px] lg:mx-0">
              Portföylerinizi paylaşın, doğru alıcı ve yatırımcıya hızlıca
              ulaşın. Güvenli, verimli ve kazançlı iş birlikleri kurun.
            </p>

            <Link
              href="/kayit"
              className="mx-auto mt-8 inline-flex min-h-[58px] w-full max-w-[360px] items-center justify-center gap-3 rounded-2xl bg-[#1557D6] px-7 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(21,87,214,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0F49BD] lg:mx-0"
            >
              EPH’ye Katılmak İçin Başvur
              <ArrowRight size={22} />
            </Link>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.12)] md:min-h-[390px]">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent" />
            <img
              src="/showcase/dashboard.jpg"
              alt="EPH Platform görünümü"
              className="h-full min-h-[280px] w-full object-cover opacity-75 md:min-h-[390px]"
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,87,214,0.08),transparent_45%)]" />

            <div className="absolute left-[12%] top-[36%] flex h-14 w-14 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#1557D6] shadow-lg">
              <UsersRound size={25} />
            </div>
            <div className="absolute left-[44%] top-[18%] flex h-14 w-14 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#1557D6] shadow-lg">
              <Handshake size={25} />
            </div>
            <div className="absolute bottom-[18%] left-[46%] flex h-14 w-14 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#1557D6] shadow-lg">
              <Building2 size={25} />
            </div>
            <div className="absolute right-[14%] top-[43%] flex h-16 w-16 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#1557D6] shadow-lg">
              <Building2 size={30} />
            </div>
          </div>
        </div>
      </section>

      <section id="moduller" className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.10)] md:p-7">
          <div className="grid gap-4 md:grid-cols-5">
            {featureCards.map((item) => (
              <article
                key={item.title}
                className="flex flex-col items-center gap-4 rounded-3xl bg-white p-5 text-center md:flex-row md:items-center md:border-r md:border-[#E2E8F0] md:text-left last:md:border-r-0"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_10px_26px_rgba(15,23,42,0.10)]">
                  <item.icon size={30} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#071332]">
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

      <section className="bg-white px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
            Platform Ekranları
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#06194A] md:text-5xl">
            EPH’yi yakından tanıyın
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {modules.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-white text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
              >
                <div className="h-36 overflow-hidden bg-[#F8FAFC]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]">
                    <item.icon size={20} />
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

      <section id="guven" className="bg-white px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-[#BFDBFE] bg-[#F8FBFF] p-7 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:p-11">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1557D6]">
            <ShieldCheck size={40} />
          </div>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black text-[#06194A] md:text-5xl">
            Kapalı devre gayrimenkul iş ağına dahil olun.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-[#475569] md:text-lg">
            Başvurular admin kontrolünden geçer. Onaylanan kullanıcılar EPH’nin
            kapalı devre profesyonel iş ağına dahil olur.
          </p>

          <Link
            href="/kayit"
            className="mx-auto mt-7 inline-flex min-h-[58px] w-full max-w-[380px] items-center justify-center gap-3 rounded-2xl bg-[#1557D6] px-6 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)] transition hover:bg-[#0F49BD]"
          >
            Üyelik Başvurusu Yap
            <ArrowRight size={21} />
          </Link>
        </div>
      </section>

      <footer
        id="hakkimizda"
        className="border-t border-[#DDE7F3] bg-white px-5 py-7 md:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center lg:flex-row lg:text-left">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/LOGO_EPH.png"
              alt="EPH Platform"
              className="h-10 w-10 rounded-xl border border-[#DDE7F3] bg-white object-contain p-1"
            />

            <div>
              <p className="text-sm font-black text-[#06194A]">EPH Platform</p>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1557D6]">
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

      <button
        type="button"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1557D6] text-white shadow-xl shadow-blue-600/30 md:hidden"
        aria-label="Tanıtım videosunu aç"
      >
        <Play size={22} fill="white" />
      </button>
    </main>
  );
}