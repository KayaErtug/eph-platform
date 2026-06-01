"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Home,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const liveItems = [
  "Karahasanlı bölgesinde satılık 2+1 daire aranıyor · müşteri hazır · komisyon paylaşımlı",
  "Selçuk Bey’de 1160 m² kat karşılığı arsa · Bodrum + 5 Kat · %45 pazarlıklı",
  "Doktor müşterim için Bölge Hastanesi yakınında 2+1 kiralık daire aranıyor · acil",
  "Çakmak’ta 1400 m² kat karşılığı arsa · Bodrum + 3 Kat · %35",
];

const trustBoxes = [
  { icon: BadgeCheck, title: "Onaylı Üyeler" },
  { icon: ShieldCheck, title: "Referanslı Sistem" },
  { icon: LockKeyhole, title: "Kapalı Network" },
];

const modules = [
  {
    icon: Building2,
    title: "Portföy Havuzu",
    desc: "Portföylerinizi paylaşın, doğru alıcı ve yatırımcıya hızlıca ulaştırın.",
  },
  {
    icon: BellRing,
    title: "Talep Akışı",
    desc: "Alıcı, kiracı, satıcı ve yatırımcı talepleri doğru profesyonellere ulaşır.",
  },
  {
    icon: BriefcaseBusiness,
    title: "CRM Takibi",
    desc: "Müşteri ve ilan süreçlerinizi takip edin, hiçbir fırsatı kaçırmayın.",
  },
  {
    icon: MessageCircle,
    title: "Mesajlaşma",
    desc: "Üyelerle güvenli ve hızlı iletişim kurun, tüm konuşmalar kayıt altında kalsın.",
  },
  {
    icon: Bot,
    title: "Lina AI Asistan",
    desc: "Akıllı asistanınız Lina, süreçlerinizi kolaylaştırır, zaman kazandırır.",
  },
];

const screens = [
  {
    image: "/showcase/dashboard.jpg",
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Genel görünüm ve performans takibi",
  },
  {
    image: "/showcase/crm.jpg",
    icon: BriefcaseBusiness,
    title: "CRM",
    desc: "Müşteri ve fırsat yönetimi",
  },
  {
    image: "/showcase/stock.jpg",
    icon: Building2,
    title: "Stok",
    desc: "Portföylerinizi ekleyin ve yönetin",
  },
  {
    image: "/showcase/network.jpg",
    icon: UsersRound,
    title: "Network",
    desc: "Doğru iş ortaklarıyla güçlü bağlantılar kurun",
  },
  {
    image: "/showcase/lina.jpg",
    icon: Bot,
    title: "Lina AI",
    desc: "Akıllı asistanınız Lina ile hızlı çözümler",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#071332]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/LOGO_EPH.png"
                alt="EPH Platform"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-base font-black leading-tight sm:text-lg">
                EPH Platform
              </div>
              <div className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-blue-600 sm:text-[10px] sm:tracking-[0.28em]">
                Emlak Portföy Havuzu
              </div>
            </div>
          </Link>

          <Link
            href="/giris"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Giriş
          </Link>
        </div>
      </header>

      <section id="kesfet" className="mx-auto max-w-7xl px-4 pb-12 pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
              <CheckCircle2 size={15} />
              Onaylı profesyonel ağ
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl">
              Gayrimenkul profesyonelleri için kapalı devre
              <span className="block text-blue-600">
                portföy, talep ve iş birliği ağı.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
              EPH; gayrimenkul danışmanlarını, müteahhitleri ve inşaat
              firmalarını kontrollü bir iş ağı içinde buluşturur. Portföyler,
              talepler, CRM ve mesajlaşma tek merkezde toplanır.
            </p>

            <div id="guven" className="mx-auto mt-7 grid max-w-3xl gap-4 sm:grid-cols-3">
              {trustBoxes.map((item) => (
                <div
                  key={item.title}
                  className="flex min-h-[116px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <item.icon size={24} />
                  </div>
                  <div className="mt-3 text-sm font-black text-slate-800">
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Canlı İş Merkezi
                </div>
                <h2 className="mt-2 text-2xl font-black">EPH Kontrol Paneli</h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Home size={24} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric value="8.700+" label="Portföy" />
              <Metric value="344+" label="Aktif Üye" />
            </div>

            <div className="mt-5 space-y-3">
              {liveItems.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-left"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      index === 0
                        ? "bg-emerald-500"
                        : index === 1
                          ? "bg-orange-500"
                          : index === 2
                            ? "bg-blue-500"
                            : "bg-purple-500"
                    }`}
                  />
                  <p className="text-sm font-bold leading-6 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/kayit"
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 text-center text-sm font-black text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-1 hover:bg-blue-700 sm:px-9"
          >
            EPH&apos;ye Katılmak İçin Başvur
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section id="moduller" className="mx-auto max-w-7xl px-4 py-10">
        <SectionTitle
          eyebrow="EPH NE İŞE YARAR?"
          title="Tüm iş süreçlerinizi tek platformda yönetin"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {modules.map((item) => (
            <ModuleCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionTitle
          eyebrow="PLATFORM EKRANLARI"
          title="EPH’yi yakından tanıyın"
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {screens.map((item) => (
            <ScreenCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section id="basvuru" className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[30px] border border-blue-100 bg-blue-50/40 p-7 text-center shadow-sm md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <UsersRound size={36} />
          </div>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black tracking-tight md:text-4xl">
            Kapalı devre gayrimenkul iş ağına dahil olun.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
            EPH’ye katılmak için başvurunuzu oluşturun. Başvurular admin
            kontrolünden geçer. Onaylanan kullanıcılar kapalı devre iş ağına
            dahil olur.
          </p>

          <div className="mt-7 flex justify-center">
            <Link
              href="/kayit"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 text-center text-sm font-black text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-1 hover:bg-blue-700"
            >
              Üyelik Başvurusu Yap
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-5 text-center">
          <Link href="/" className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/LOGO_EPH.png"
                alt="EPH Platform"
                className="h-7 w-7 object-contain"
              />
            </div>

            <div className="text-left">
              <div className="text-sm font-black">EPH Platform</div>
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-600">
                Emlak Portföy Havuzu
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap justify-center gap-5 text-xs font-black text-slate-600">
            <Link href="/kullanici-sozlesmesi">Kullanım Şartları</Link>
            <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/platform-anayasasi">Platform Anayasası</Link>
          </div>

          <p className="text-xs font-semibold text-slate-500">
            © 2026 EPH Platform. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Building2;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <Icon size={25} />
      </div>
      <h3 className="mt-5 text-base font-black">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {desc}
      </p>
    </div>
  );
}

function ScreenCard({
  image,
  icon: Icon,
  title,
  desc,
}: {
  image: string;
  icon: typeof Building2;
  title: string;
  desc: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
      <img src={image} alt={title} className="h-28 w-full object-cover" />

      <div className="p-5">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={20} />
        </div>

        <h3 className="mt-3 text-base font-black">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {desc}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
        {eyebrow}
      </p>
      <h2 className="mx-auto mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-4xl">
        {title}
      </h2>
    </div>
  );
}