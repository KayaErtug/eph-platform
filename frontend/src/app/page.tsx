"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  Globe2,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const stats = [
  ["344+", "Aktif Üye"],
  ["8.700+", "Portföy"],
  ["65+", "Başarılı Satış"],
];

const features = [
  {
    icon: LockKeyhole,
    label: "Güvenlik",
    title: "Kapalı Devre Ağ",
    desc: "Paylaşımlar yalnızca onaylı EPH üyeleri tarafından görüntülenir. Dışarıya sızdırılmaz.",
  },
  {
    icon: Users,
    label: "Network",
    title: "Profesyonel Ağ",
    desc: "Gayrimenkul danışmanları, müteahhitler ve inşaat firmaları tek çatı altında buluşur.",
  },
  {
    icon: Building2,
    label: "Portföy",
    title: "Portföy Havuzu",
    desc: "Satılık, kiralık ve proje bazlı portföyler tek merkezden düzenli biçimde izlenir.",
  },
  {
    icon: ShieldCheck,
    label: "Üyelik",
    title: "Güvenli Üyelik",
    desc: "Her başvuru admin onayı ve referans sistemiyle değerlendirilir.",
  },
  {
    icon: Handshake,
    label: "Satış",
    title: "İş Birliği",
    desc: "Talep, portföy ve ortak satış süreçleri daha şeffaf ve takip edilebilir hale gelir.",
  },
  {
    icon: Sparkles,
    label: "Lina",
    title: "Akıllı Asistan",
    desc: "İlan metni, portföy girişi ve içerik üretiminde sesli ve yazılı destek sağlar.",
  },
];

const liveActivities = [
  {
    icon: BellRing,
    title: "Yeni Talep Paylaşıldı",
    desc: "3+1 daire arayan müşteri talebi network’e düştü.",
    time: "Az önce",
  },
  {
    icon: Building2,
    title: "Yeni Portföy Eklendi",
    desc: "Denizli merkezde satılık portföy yayına alındı.",
    time: "2 dk önce",
  },
  {
    icon: Handshake,
    title: "Ortak Satış Görüşmesi",
    desc: "Gayrimenkul danışmanı ve müteahhit arasında görüşme başladı.",
    time: "5 dk önce",
  },
];

const showcaseItems = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Günlük özet, son ilanlar, hızlı işlemler ve piyasa bilgileri tek ekranda.",
    image: "/showcase/dashboard.jpg",
  },
  {
    icon: MessageCircle,
    title: "Network",
    desc: "Sektör profesyonelleri arasında talep, portföy ve iş birliği akışı.",
    image: "/showcase/network.jpg",
  },
  {
    icon: BriefcaseBusiness,
    title: "CRM",
    desc: "Müşteri görüşmeleri, günlük takipler ve iş planı kayıtları düzenli ilerler.",
    image: "/showcase/crm.jpg",
  },
  {
    icon: Building2,
    title: "Portföy Yönetimi",
    desc: "Stok, proje ve ilan yönetimi daha kontrollü şekilde takip edilir.",
    image: "/showcase/stock.jpg",
  },
  {
    icon: Bot,
    title: "Lina Asistan",
    desc: "Sesli ve yazılı destekle ilan oluşturma süreci hızlanır.",
    image: "/showcase/lina.jpg",
  },
];

type InfoModalType = "kesfet" | "kvkk" | "gizlilik" | "iletisim";

export default function LandingPage() {
  const [showVideo, setShowVideo] = useState(false);
  const [infoModal, setInfoModal] = useState<null | InfoModalType>(null);

  useEffect(() => {
    const alreadySeenVideo = sessionStorage.getItem("ephIntroVideoSeen");

    if (alreadySeenVideo) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowVideo(true);
      sessionStorage.setItem("ephIntroVideoSeen", "true");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <main className="min-h-screen overflow-hidden bg-[#F8FAFC] text-[#172033]">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#DDE7F3] bg-white/92 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-11 w-11 rounded-2xl object-contain shadow-sm"
              />

              <div>
                <h1 className="text-lg font-black tracking-tight text-[#172033]">
                  EPH Platform
                </h1>

                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#2563EB]">
                  Emlak Portföy Havuzu
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              <button
                type="button"
                onClick={() => setInfoModal("kesfet")}
                className="text-sm font-bold text-[#64748B] transition hover:text-[#2563EB]"
              >
                Keşfet
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("ozellikler")}
                className="text-sm font-bold text-[#64748B] transition hover:text-[#2563EB]"
              >
                Neler Var?
              </button>

              <button
                type="button"
                onClick={() => setInfoModal("iletisim")}
                className="text-sm font-bold text-[#64748B] transition hover:text-[#2563EB]"
              >
                Bizimle İletişime Geç
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/giris"
                className="rounded-2xl border border-[#DDE7F3] bg-white px-5 py-3 text-xs font-black text-[#172033] shadow-sm transition hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </header>

        <section
          id="platform"
          className="relative overflow-hidden px-5 pb-24 pt-36"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.13),transparent_30%)]" />
          <div className="absolute left-10 top-28 h-28 w-28 rounded-full bg-[#DBEAFE] blur-3xl" />
          <div className="absolute bottom-12 right-10 h-40 w-40 rounded-full bg-[#CCFBF1] blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 py-2 text-xs font-black text-[#2563EB] shadow-sm">
                <Zap size={14} />
                Sektörün Kapalı Devre İş Ağı
              </div>

              <h2 className="mt-7 text-4xl font-black leading-[1.06] tracking-tight text-[#172033] md:text-7xl">
  İş Birliği,
  <span className="block text-[#2563EB]">
    Teknoloji ve Sonuç Odaklı
  </span>
  Kapalı Devre Ekosistem
</h2>

<p className="mx-auto mt-7 max-w-3xl text-lg leading-9 text-[#5B6B82] lg:mx-0">
  Gayrimenkulün üretici ve satış gücünü yapay zeka ile tek merkezde
  birleştiren seçkin iş ağı.

  <span className="mt-4 block">
    EPH Platform; gayrimenkul danışmanlarını, müteahhitleri,
    yatırımcıları ve proje geliştiricileri aynı profesyonel ekosistem
    içerisinde buluşturur.
  </span>

  <span className="mt-4 block">
    Portföy yönetimi, canlı network, CRM süreçleri, ortak satış sistemi
    ve Lina yapay zeka desteği sayesinde iş akışı daha hızlı, daha
    düzenli ve daha verimli hale gelir.
  </span>
</p>

              <div className="mt-8 grid grid-cols-1 gap-3 text-sm font-bold text-[#334155] sm:grid-cols-3">
                <div className="rounded-2xl border border-[#DDE7F3] bg-white px-4 py-3 shadow-sm">
                  Anlık Talep Paylaşımı
                </div>

                <div className="rounded-2xl border border-[#DDE7F3] bg-white px-4 py-3 shadow-sm">
                  Ortak Satış Fırsatı
                </div>

                <div className="rounded-2xl border border-[#DDE7F3] bg-white px-4 py-3 shadow-sm">
                  Güvenli Network
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link
                  href="/kayit"
                  className="group flex items-center gap-2 rounded-2xl bg-[#2563EB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2563EB]/20 transition hover:-translate-y-1 hover:bg-[#1D4ED8]"
                >
                  Üyelik Başvurusu Yap
                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className="group flex items-center gap-2 rounded-2xl border border-[#DDE7F3] bg-white px-7 py-4 text-sm font-black text-[#172033] shadow-sm transition hover:-translate-y-1 hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14B8A6] text-white">
                    <Play size={14} fill="white" />
                  </span>
                  Tanıtım Videosunu İzle
                </button>

                <button
                  type="button"
                  onClick={() => setInfoModal("kesfet")}
                  className="rounded-2xl border border-[#DDE7F3] bg-white px-7 py-4 text-sm font-black text-[#172033] shadow-sm transition hover:-translate-y-1 hover:border-[#F97316]/30 hover:bg-[#FFF7ED]"
                >
                  EPH’yi Keşfet
                </button>
              </div>

              <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-[#DDE7F3] bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="text-3xl font-black text-[#2563EB]">
                      {value}
                    </div>

                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-[#64748B]">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative mx-auto max-w-xl overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-xl shadow-slate-200/70">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#DBEAFE] blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#CCFBF1] blur-3xl" />

                <div className="relative rounded-[28px] border border-[#DDE7F3] bg-[#F8FAFC] p-6">
                  <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:text-left">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2563EB]">
                        CANLI İŞ AĞI
                      </p>

                      <h3 className="mt-2 text-3xl font-black text-[#172033]">
                        EPH Keşif Merkezi
                      </h3>
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20">
                      <Radar size={28} />
                    </div>
                  </div>

                  <div className="relative mx-auto mt-10 flex h-80 w-full max-w-sm items-center justify-center">
                    <div className="absolute h-72 w-72 rounded-full border border-[#BFDBFE]" />
                    <div className="absolute h-56 w-56 rounded-full border border-[#99F6E4]" />
                    <div className="absolute h-40 w-40 rounded-full border border-[#FED7AA]" />

                    <MiniBubble
                      className="left-2 top-10"
                      icon={Building2}
                      title="Yeni Portföy"
                      desc="Bölgesel fırsat yayında"
                      color="blue"
                    />

                    <MiniBubble
                      className="right-1 top-24"
                      icon={MessageCircle}
                      title="Yeni Talep"
                      desc="Alıcı talebi paylaşıldı"
                      color="teal"
                    />

                    <MiniBubble
                      className="bottom-10 left-8"
                      icon={Handshake}
                      title="Ortak Satış"
                      desc="İş birliği başladı"
                      color="orange"
                    />

                    <MiniBubble
                      className="bottom-16 right-5"
                      icon={TrendingUp}
                      title="Hızlı Dönüş"
                      desc="Fırsatlar takipte"
                      color="purple"
                    />

                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[#BFDBFE] bg-white shadow-2xl shadow-blue-100">
                      <div className="absolute h-24 w-24 rounded-full bg-[#DBEAFE] blur-xl" />

                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#2563EB] text-white">
                        <Globe2 size={38} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-[#BFDBFE] bg-white p-5 shadow-sm">
                    <div className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
                      <CheckCircle2 size={22} className="text-[#14B8A6]" />

                      <div>
                        <p className="text-sm font-black text-[#172033]">
                          Portföy + Talep + Network Tek Merkezde
                        </p>

                        <p className="mt-1 text-xs text-[#64748B]">
                          Sektör profesyonelleri için daha hızlı, düzenli ve
                          güvenli iş akışı.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-[#DDE7F3] bg-white px-5 py-20">
          <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-[#EFF6FF] blur-3xl" />
          <div className="absolute bottom-0 right-10 h-56 w-56 rounded-full bg-[#ECFDF5] blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <SectionHeader
              icon={Activity}
              badge="Canlı Network Akışı"
              title="Platform İçinde İş Fırsatları"
              highlight="Anlık Hareket Eder"
              desc="Portföy, talep, mesajlaşma ve ortak satış süreçleri tek akışta izlenir. EPH, sektör profesyonellerine canlı ve düzenli bir iş takip merkezi sunar."
            />

            <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {liveActivities.map((item, index) => (
                <div
                  key={item.title}
                  className="relative overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${
                      index === 0
                        ? "bg-[#DBEAFE]"
                        : index === 1
                          ? "bg-[#CCFBF1]"
                          : "bg-[#FFEDD5]"
                    }`}
                  />

                  <div
                    className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                      index === 0
                        ? "bg-[#DBEAFE] text-[#2563EB]"
                        : index === 1
                          ? "bg-[#CCFBF1] text-[#0F766E]"
                          : "bg-[#FFEDD5] text-[#EA580C]"
                    }`}
                  >
                    <item.icon size={28} />
                  </div>

                  <h3 className="relative mt-6 text-xl font-black text-[#172033]">
                    {item.title}
                  </h3>

                  <p className="relative mt-3 min-h-[56px] text-sm leading-7 text-[#64748B]">
                    {item.desc}
                  </p>

                  <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-[#DDE7F3] bg-[#F8FAFC] px-4 py-2 text-xs font-black text-[#64748B]">
                    <Clock3 size={14} />
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LinaTechnologyShowcase />

        <section className="relative overflow-hidden bg-[#F8FAFC] px-5 py-24">
          <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-[#DBEAFE]/70 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FFEDD5]/70 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <SectionHeader
              icon={MonitorSmartphone}
              badge="Platformdan Görüntüler"
              title="EPH Sadece Anlatılmaz,"
              highlight="Kullanırken Hissedilir"
              desc="Dashboard, network, CRM, portföy yönetimi ve Lina ekranlarıyla sektör profesyonelleri için gerçek bir çalışma merkezi sunar."
            />

            <div className="mt-16 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
              {showcaseItems.map((item, index) => (
                <article
                  key={item.title}
                  className={`group relative overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    index === 0 ? "xl:col-span-2" : ""
                  }`}
                >
                  <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#DBEAFE] blur-3xl transition group-hover:bg-[#BFDBFE]" />

                  <div className="relative overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-[#F8FAFC]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-[260px] w-full object-cover transition duration-500 group-hover:scale-105 md:h-[320px]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/55 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#2563EB] shadow-sm">
                          <item.icon size={24} />
                        </div>

                        <div>
                          <h3 className="text-2xl font-black text-[#172033]">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-[#2563EB]">
                            EPH Modülü
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 max-w-xl text-sm leading-7 text-[#64748B]">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="ozellikler"
          className="relative overflow-hidden border-t border-[#DDE7F3] bg-white px-5 py-24"
        >
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-[#EFF6FF] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#ECFDF5] blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <SectionHeader
              icon={BadgeCheck}
              badge="Neler Var?"
              title="EPH’de Sadece İlan Değil,"
              highlight="Tam Bir İş Ekosistemi Var"
              desc="Güvenli üyelikten ortak satışa, portföy havuzundan Lina desteğine kadar tüm süreçler sektör profesyonelleri için tek merkezde toplanır."
            />

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((item, index) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${
                      index % 4 === 0
                        ? "bg-[#DBEAFE]"
                        : index % 4 === 1
                          ? "bg-[#CCFBF1]"
                          : index % 4 === 2
                            ? "bg-[#FFEDD5]"
                            : "bg-[#EDE9FE]"
                    }`}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="rounded-full border border-[#DDE7F3] bg-[#F8FAFC] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#2563EB]">
                      {item.label}
                    </div>

                    <div className="text-xs font-black text-[#CBD5E1]">
                      0{index + 1}
                    </div>
                  </div>

                  <div
                    className={`relative mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-3xl transition group-hover:scale-110 ${
                      index % 4 === 0
                        ? "bg-[#DBEAFE] text-[#2563EB]"
                        : index % 4 === 1
                          ? "bg-[#CCFBF1] text-[#0F766E]"
                          : index % 4 === 2
                            ? "bg-[#FFEDD5] text-[#EA580C]"
                            : "bg-[#EDE9FE] text-[#7C3AED]"
                    }`}
                  >
                    <item.icon size={34} />
                  </div>

                  <h3 className="relative mt-7 text-2xl font-black text-[#172033]">
                    {item.title}
                  </h3>

                  <p className="relative mt-4 min-h-[84px] text-sm leading-7 text-[#64748B]">
                    {item.desc}
                  </p>

                  <div className="relative mt-7 h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div className="h-full w-1/2 rounded-full bg-[#2563EB] transition-all duration-500 group-hover:w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="basvuru" className="relative overflow-hidden px-5 py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.10),transparent_35%)]" />

          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-[#DDE7F3] bg-white p-10 text-center shadow-xl shadow-slate-200/70 md:p-16">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#DBEAFE] blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#CCFBF1] blur-3xl" />

            <div className="relative z-10 mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB]">
                <Sparkles size={14} />
                Üyelik Başvurusu
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight text-[#172033] md:text-6xl">
                EPH Platform’a
                <span className="block text-[#2563EB]">Katılmak İçin</span>
                Tek Bir Adım Yeter
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#64748B]">
                Başvurunuzu tek kayıt ekranından oluşturun. Referans kodunuz
                varsa bilgileriniz otomatik gelir; yoksa başvurunuz admin
                değerlendirmesine alınır.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/kayit"
                  className="rounded-2xl bg-[#2563EB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-[#2563EB]/20 transition hover:-translate-y-1 hover:bg-[#1D4ED8]"
                >
                  Üyelik Başvurusu Yap
                </Link>

                <Link
                  href="/giris"
                  className="rounded-2xl border border-[#DDE7F3] bg-white px-8 py-4 text-sm font-black text-[#172033] shadow-sm transition hover:-translate-y-1 hover:bg-[#EFF6FF]"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#DDE7F3] bg-white px-5 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-10 w-10 rounded-2xl object-contain shadow-sm"
              />

              <div>
                <p className="text-lg font-black text-[#172033]">
                  EPH Platform
                </p>

                <p className="text-xs text-[#64748B]">Emlak Portföy Havuzu</p>
              </div>
            </div>

            <div className="text-center text-sm text-[#64748B]">
              © 2026 EPH Platform — Tüm hakları saklıdır.
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-center text-sm font-bold text-[#64748B]">
              <Link
                href="/platform-anayasasi"
                className="transition hover:text-[#2563EB]"
              >
                Platform Anayasası
              </Link>

              <Link href="/kvkk" className="transition hover:text-[#2563EB]">
                KVKK
              </Link>

              <Link
                href="/gizlilik-politikasi"
                className="transition hover:text-[#2563EB]"
              >
                Gizlilik Politikası
              </Link>

              <Link
                href="/kullanici-sozlesmesi"
                className="transition hover:text-[#2563EB]"
              >
                Kullanıcı Sözleşmesi
              </Link>

              <Link
                href="/cerez-politikasi"
                className="transition hover:text-[#2563EB]"
              >
                Çerez Politikası
              </Link>

              <button
                onClick={() => setInfoModal("iletisim")}
                className="transition hover:text-[#2563EB]"
              >
                İletişim
              </button>
            </div>
          </div>
        </footer>
      </main>

      {showVideo && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-0 backdrop-blur-xl md:p-5"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black md:h-[92vh] md:max-w-[520px] md:rounded-[36px] md:border md:border-white/10 md:shadow-2xl md:shadow-[#2563EB]/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            >
              <X size={20} />
            </button>

            <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-5 pb-16 pt-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#60A5FA]">
                EPH Platform
              </p>

              <h3 className="mt-1 text-xl font-black text-white">
                Tanıtım Videosu
              </h3>
            </div>

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
      )}

      {infoModal && (
        <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </>
  );
}

function SectionHeader({
  icon: Icon,
  badge,
  title,
  highlight,
  desc,
}: {
  icon: typeof Activity;
  badge: string;
  title: string;
  highlight: string;
  desc: string;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 py-2 text-xs font-black text-[#2563EB] shadow-sm">
        <Icon size={14} />
        {badge}
      </div>

      <h2 className="mt-6 text-4xl font-black leading-tight text-[#172033] md:text-6xl">
        {title}
        <span className="block text-[#2563EB]">{highlight}</span>
      </h2>

      <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#64748B] md:text-lg">
        {desc}
      </p>
    </div>
  );
}

function LinaTechnologyShowcase() {
  const [activeDemo, setActiveDemo] = useState<"voice" | "whatsapp" | "copy">(
    "voice",
  );

  return (
    <section className="relative overflow-hidden bg-[#08111F] px-5 py-24 text-white">
      <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#C9A84C]/20 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-[#2563EB]/20 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#F7DFA3]">
            <Bot size={14} />
            Lina Teknoloji Vitrini
          </div>

          <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Lina yalnızca yardımcı değil,
            <span className="block text-[#F7DFA3]">
              operasyonel iş ortağıdır.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Sesli ilan girişi, WhatsApp üzerinden güncelleme ve profesyonel
            metin üretimiyle EPH, klasik bir portföy havuzundan daha fazlasını
            sunar.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setActiveDemo("voice")}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeDemo === "voice"
                ? "bg-[#C9A84C] text-[#08111F]"
                : "border border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            Lina ile Konuş
          </button>

          <button
            onClick={() => setActiveDemo("whatsapp")}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeDemo === "whatsapp"
                ? "bg-[#C9A84C] text-[#08111F]"
                : "border border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            WhatsApp Güncelleme
          </button>

          <button
            onClick={() => setActiveDemo("copy")}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeDemo === "copy"
                ? "bg-[#C9A84C] text-[#08111F]"
                : "border border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            Sihirli Metin
          </button>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[36px] border border-[#C9A84C]/20 bg-white/[0.06] p-6 text-center backdrop-blur-xl">
            {activeDemo === "voice" && <VoiceDemo />}
            {activeDemo === "whatsapp" && <WhatsappDemo />}
            {activeDemo === "copy" && <CopyDemo />}
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#F7DFA3]">
                  Lina Çıktısı
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  Otomatik İlan Kartı
                </h3>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A84C] text-[#08111F]">
                <Sparkles size={26} />
              </div>
            </div>

            <div className="mt-6 rounded-[30px] border border-[#C9A84C]/20 bg-[#0D1828] p-5">
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white p-5 text-[#172033]">
                <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">
                      Yeni Portföy
                    </div>

                    <h4 className="mt-2 text-2xl font-black">
                      Merkezefendi’de 3+1 Site İçi Daire
                    </h4>
                  </div>

                  <div className="rounded-2xl bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#0F766E]">
                    Hazırlandı
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <LinaField label="Konum" value="Denizli / Merkezefendi" />
                  <LinaField label="Oda" value="3+1" />
                  <LinaField label="Tip" value="Site içi daire" />
                </div>

                <p className="mt-5 text-center text-sm leading-7 text-[#64748B] md:text-left">
                  Lina, verilen kısa portföy bilgisini düzenli ilan kartına
                  dönüştürür. Konum, oda sayısı, açıklama ve paylaşım dili
                  otomatik hazırlanır.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                  <span className="rounded-full bg-[#EFF6FF] px-3 py-2 text-xs font-black text-[#2563EB]">
                    #Merkezefendi
                  </span>

                  <span className="rounded-full bg-[#FFF7ED] px-3 py-2 text-xs font-black text-[#EA580C]">
                    #3+1
                  </span>

                  <span className="rounded-full bg-[#F5F3FF] px-3 py-2 text-xs font-black text-[#7C3AED]">
                    #LinaHazırladı
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <LinaCapability
                title="İlan Oluşturur"
                desc="Kısa bilgiyi düzenli portföye çevirir."
              />

              <LinaCapability
                title="Güncelleme Yapar"
                desc="Fiyat, durum ve not bilgilerini işler."
              />

              <LinaCapability
                title="Metin Yazar"
                desc="İlan ve sosyal medya açıklaması üretir."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VoiceDemo() {
  return (
    <div>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#F7DFA3]">
        <Bot size={36} />
      </div>

      <h3 className="mt-5 text-3xl font-black">Lina ile Konuş</h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-300">
        “Merkezefendi’de 3+1, lüks site içinde, geniş balkonlu daire.”
      </p>

      <div className="mt-7 rounded-[28px] border border-[#C9A84C]/20 bg-black/20 p-5">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-[#F7DFA3]">
          Dinliyorum...
        </div>

        <div className="mt-5 flex h-16 items-center justify-center gap-1">
          {[24, 38, 52, 34, 60, 44, 28, 56, 40, 30, 50, 36].map(
            (height, index) => (
              <span
                key={index}
                className="w-2 rounded-full bg-[#C9A84C]"
                style={{
                  height: `${height}px`,
                  opacity: 0.35 + (index % 4) * 0.15,
                }}
              />
            ),
          )}
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
        Ses komutu portföy kartına dönüştürülüyor.
      </div>
    </div>
  );
}

function WhatsappDemo() {
  return (
    <div>
      <div className="mx-auto max-w-sm rounded-[38px] border border-[#C9A84C]/30 bg-[#111827] p-4 shadow-2xl shadow-black/30">
        <div className="rounded-[30px] bg-[#ECE5DD] p-4 text-left">
          <div className="mb-4 text-center text-xs font-black text-[#075E54]">
            WhatsApp · Lina
          </div>

          <ChatBubble side="right">
            Lina, Denizli projesindeki 5 numaralı dairenin fiyatını 4.5 milyona
            güncelle.
          </ChatBubble>

          <ChatBubble side="left">
            Anlaşıldı. Güncelleme yapıldı ve ilgili ağa bildirim hazırlandı. ✅
          </ChatBubble>

          <ChatBubble side="right">Portföy notuna “güncel fiyat” ekle.</ChatBubble>

          <ChatBubble side="left">
            Not eklendi. İlan kartı güncel bilgilerle yenilendi.
          </ChatBubble>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 p-4 text-sm font-bold text-[#F7DFA3]">
        WhatsApp simülasyonu: fiyat ve portföy notu güncellendi.
      </div>
    </div>
  );
}

function CopyDemo() {
  return (
    <div>
      <div className="grid gap-4">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Önce
          </p>

          <p className="mt-3 text-lg font-black text-white">
            2+1, 100m², site içi, balkonlu
          </p>
        </div>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C9A84C] text-[#08111F]">
          <Sparkles size={22} />
        </div>

        <div className="rounded-[26px] border border-[#C9A84C]/25 bg-[#C9A84C]/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F7DFA3]">
            Lina Sonrası
          </p>

          <p className="mt-3 text-base font-semibold leading-8 text-slate-100">
            Modern site yaşamı, ferah kullanım alanı ve balkon avantajını bir
            araya getiren bu 2+1 daire; konforlu yaşam arayanlar için güçlü bir
            fırsat sunar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-3 flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
          side === "right"
            ? "bg-[#DCF8C6] text-[#172033]"
            : "bg-white text-[#172033]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function LinaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-2 text-sm font-black text-[#172033]">{value}</div>
    </div>
  );
}

function LinaCapability({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C9A84C]/15 text-[#F7DFA3]">
        <CheckCircle2 size={20} />
      </div>

      <h4 className="mt-3 text-sm font-black text-white">{title}</h4>

      <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
    </div>
  );
}

function MiniBubble({
  className,
  icon: Icon,
  title,
  desc,
  color,
}: {
  className: string;
  icon: typeof Building2;
  title: string;
  desc: string;
  color: "blue" | "teal" | "orange" | "purple";
}) {
  const colorClass = {
    blue: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    teal: "bg-[#ECFDF5] text-[#0F766E] border-[#99F6E4]",
    orange: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
    purple: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  }[color];

  return (
    <div
      className={`absolute rounded-2xl border bg-white px-4 py-3 text-left shadow-sm ${colorClass} ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-black">
        <Icon size={15} />
        {title}
      </div>

      <p className="mt-1 text-[11px] text-[#64748B]">{desc}</p>
    </div>
  );
}

function InfoModal({
  type,
  onClose,
}: {
  type: InfoModalType;
  onClose: () => void;
}) {
  const content = {
    kesfet: {
      title: "EPH Platform’u Keşfet",
      icon: Radar,
      text: `EPH Platform, gayrimenkul sektöründe yalnızca ilan paylaşımı yapılan klasik bir sistem değildir.

EPH; gayrimenkul danışmanlarını, müteahhitleri ve inşaat firmalarını aynı kapalı devre profesyonel ağda buluşturan yeni nesil bir iş birliği merkezidir.

Bu sistemde portföyler daha görünür olur, müşteri talepleri daha hızlı yayılır, projeler daha geniş satış ağına ulaşır ve ortak satış fırsatları daha düzenli takip edilir.

Gayrimenkul danışmanı, elinde olmayan portföy yüzünden müşterisini kaybetmez.
Müteahhit, projesini yalnızca birkaç kişiyle değil, daha geniş bir profesyonel ağla paylaşır.
İnşaat firması, stok ve kampanya bilgisini daha hızlı duyurur.

EPH; portföy, talep, mesajlaşma, CRM, network ve Lina asistanını aynı merkezde birleştirir.

Kısacası EPH, gayrimenkul sektöründe daha hızlı iletişim, daha güçlü iş birliği ve daha düzenli satış takibi için geliştirilen profesyonel bir ekosistemdir.`,
    },

    kvkk: {
      title: "KVKK Aydınlatma Metni",
      icon: ShieldCheck,
      text: `EPH Platform üzerinden iletilen kişisel veriler; üyelik başvurularının değerlendirilmesi, kullanıcı doğrulama süreçlerinin yürütülmesi, platform güvenliğinin sağlanması, iletişim faaliyetlerinin yönetilmesi, teknik destek hizmetlerinin sunulması ve platform içi iş süreçlerinin yürütülmesi amacıyla işlenmektedir.

Bu kapsamda ad, soyad, telefon numarası, e-posta adresi, meslek bilgisi, referans kodu, portföy bilgileri, talep kayıtları, mesajlaşma içerikleri, işlem kayıtları ve platform kullanım verileri işlenebilir.

Kişisel veriler; 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hukuka ve dürüstlük kurallarına uygun şekilde, belirli ve meşru amaçlarla, işlendikleri amaçla bağlantılı ve ölçülü olarak korunur.

EPH Platform; kullanıcı verilerinin yetkisiz erişime, kayba, kötüye kullanıma veya izinsiz paylaşıma karşı korunması için gerekli teknik ve idari güvenlik önlemlerini almayı taahhüt eder.

Kişisel veriler, yasal zorunluluklar ve hizmetin gerektirdiği teknik süreçler dışında üçüncü kişilerle izinsiz paylaşılmaz.

Kullanıcılar; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, hatalı veya eksik verilerin düzeltilmesini isteme, gerekli şartların oluşması halinde silinmesini veya yok edilmesini talep etme haklarına sahiptir.

KVKK kapsamındaki başvurular için bizimle info@emlakportfoyhavuzu.com adresi üzerinden iletişime geçebilirsiniz.`,
    },

    gizlilik: {
      title: "Gizlilik Politikası",
      icon: LockKeyhole,
      text: `EPH Platform; gayrimenkul danışmanları, müteahhitler ve inşaat firmaları için geliştirilmiş kapalı devre profesyonel bir gayrimenkul iş ağıdır.

Platform içerisinde paylaşılan portföyler, talepler, mesajlar, kampanyalar, proje bilgileri, CRM kayıtları ve iş birliği süreçleri yalnızca yetkili kullanıcılar tarafından görüntülenebilir.

Kullanıcı hesap bilgileri, iletişim verileri ve platform hareketleri güvenli sunucu altyapısında korunur. Sistem güvenliği, kötüye kullanımın önlenmesi ve hizmet kalitesinin artırılması amacıyla işlem kayıtları, oturum bilgileri ve teknik loglar tutulabilir.

EPH Platform; kullanıcı verilerini satmaz, kiralamaz veya ticari amaçlarla üçüncü taraflara pazarlamaz.

Kullanıcılar, kendi hesap güvenliklerinden sorumludur. Şifre bilgilerinin veya hesap erişim bilgilerinin üçüncü kişilerle paylaşılması halinde doğabilecek güvenlik risklerinden kullanıcı sorumludur.

Platformda yer alan portföy, talep, proje, mesajlaşma ve ticari içeriklerin izinsiz kopyalanması, çoğaltılması, dışarı aktarılması veya platform dışı amaçlarla kullanılması yasaktır.

EPH Platform, gizlilik ve güvenlik standartlarını geliştirmek amacıyla bu politikada zaman zaman güncelleme yapabilir.`,
    },

    iletisim: {
      title: "İletişim",
      icon: MessageCircle,
      text: `EPH Platform ile iletişime geçmek için aşağıdaki e-posta adresini kullanabilirsiniz.

E-posta:
info@emlakportfoyhavuzu.com

Üyelik başvuruları, teknik destek, iş birliği talepleri, KVKK başvuruları, gizlilik talepleri ve platform hakkındaki tüm sorularınız için bizimle iletişime geçebilirsiniz.

Başvurular ve destek talepleri mümkün olan en kısa sürede değerlendirilir.`,
    },
  }[type];

  const Icon = content.icon;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/55 p-5 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-[32px] border border-[#DDE7F3] bg-white p-8 text-center text-[#172033] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          <Icon size={30} />
        </div>

        <h3 className="mt-5 text-3xl font-black">{content.title}</h3>

        <p className="mt-5 whitespace-pre-line text-center text-sm leading-8 text-[#64748B]">
          {content.text}
        </p>

        <button
          onClick={onClose}
          className="mt-7 rounded-2xl bg-[#2563EB] px-7 py-3 text-sm font-black text-white shadow-lg shadow-[#2563EB]/20"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}