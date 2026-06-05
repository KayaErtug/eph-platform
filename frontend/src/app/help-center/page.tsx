"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  Lightbulb,
  Mail,
  MessageCircle,
  PlayCircle,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

type HelpItem = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
};

const quickItems: HelpItem[] = [
  {
    title: "Sık Sorulan Sorular",
    desc: "Platform kullanımı ve temel cevaplar",
    href: "#sss",
    icon: <HelpCircle size={18} />,
    color: "#1557D6",
    bg: "#EFF6FF",
  },
  {
    title: "Video Eğitimler",
    desc: "Kısa anlatımlar ve kullanım rehberi",
    href: "#egitimler",
    icon: <PlayCircle size={18} />,
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    title: "Lina Yardımı",
    desc: "Lina ile ilan, CRM ve analiz desteği",
    href: "/lina",
    icon: <WandSparkles size={18} />,
    color: "#7C3AED",
    bg: "#FAF5FF",
  },
  {
    title: "Bildirim Ayarları",
    desc: "Ses, uyarı ve tercihleri düzenle",
    href: "/notification-settings",
    icon: <Bell size={18} />,
    color: "#0F766E",
    bg: "#ECFDF5",
  },
];

const supportItems: HelpItem[] = [
  {
    title: "Destek Talebi Gönder",
    desc: "Teknik sorun veya kullanım desteği",
    href: "mailto:destek@emlakportfoyhavuzu.com",
    icon: <LifeBuoy size={18} />,
    color: "#1557D6",
    bg: "#EFF6FF",
  },
  {
    title: "Öneri / Şikayet Gönder",
    desc: "Geliştirme önerisi veya geri bildirim",
    href: "mailto:destek@emlakportfoyhavuzu.com?subject=EPH%20Öneri%20/%20Şikayet",
    icon: <Lightbulb size={18} />,
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    title: "E-Posta Destek",
    desc: "destek@emlakportfoyhavuzu.com",
    href: "mailto:destek@emlakportfoyhavuzu.com",
    icon: <Mail size={18} />,
    color: "#0F766E",
    bg: "#ECFDF5",
  },
  {
    title: "Mesajlar",
    desc: "Platform içi görüşmelerine dön",
    href: "/messages",
    icon: <MessageCircle size={18} />,
    color: "#7C3AED",
    bg: "#FAF5FF",
  },
];

const faqItems = [
  {
    question: "EPH Platform kimler için?",
    answer:
      "Emlak danışmanları, müteahhitler ve inşaat firmaları için kapalı devre profesyonel portföy, CRM, mesajlaşma ve iş birliği platformudur.",
  },
  {
    question: "Portföylerimi nereden yönetirim?",
    answer:
      "Portföy ve ilan işlemleri için Portföyüm bölümünü kullanabilirsin. Profil sayfasındaki hızlı menüden de tek dokunuşla ulaşabilirsin.",
  },
  {
    question: "Bildirim sesi nereden değiştirilir?",
    answer:
      "Bildirim Ayarları sayfasından mesaj ve sistem bildirim seslerini seçebilirsin.",
  },
  {
    question: "Lina ne işe yarar?",
    answer:
      "Lina; ilan açıklaması, portföy metni, müşteri analizi, fiyat yorumu ve iş akışı desteği sunan EPH asistanıdır.",
  },
];

export default function HelpCenterPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-24 text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Geri dön"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-base font-black">Yardım Merkezi</h1>
            <p className="text-[11px] font-bold text-[#64748B]">
              Destek, eğitim ve geri bildirim
            </p>
          </div>

          <Link
            href="/profil"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Profile dön"
          >
            <ShieldCheck size={18} />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-5">
        <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6] shadow-sm">
            <BookOpen size={34} />
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight">
            EPH Yardım Merkezi
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">
            Platform kullanımı, Lina, bildirimler, portföy yönetimi ve destek
            talepleri için hızlı erişim ekranı.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Pill text="Mobil öncelikli" color="#1557D6" bg="#EFF6FF" />
            <Pill text="Hızlı destek" color="#0F766E" bg="#ECFDF5" />
            <Pill text="EPH V3" color="#EA580C" bg="#FFF7ED" />
          </div>
        </section>

        <MenuGroup title="Hızlı Yardım">
          {quickItems.map((item) => (
            <MenuItem key={item.title} item={item} />
          ))}
        </MenuGroup>

        <MenuGroup title="Destek Kanalları">
          {supportItems.map((item) => (
            <MenuItem key={item.title} item={item} />
          ))}
        </MenuGroup>

        <section
          id="sss"
          className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center justify-center gap-2 text-center">
            <HelpCircle size={18} className="text-[#1557D6]" />
            <h3 className="text-sm font-black text-[#06194A]">
              Sık Sorulan Sorular
            </h3>
          </div>

          <div className="mt-4 grid gap-3">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-3xl bg-[#F8FAFC] p-4 text-center"
              >
                <h4 className="text-sm font-black text-[#06194A]">
                  {item.question}
                </h4>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="egitimler"
          className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_14px_38px_rgba(15,23,42,0.06)]"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
            <PlayCircle size={22} />
          </div>

          <h3 className="mt-3 text-sm font-black text-[#06194A]">
            Video Eğitimler
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#64748B]">
            Eğitim videoları bölümü test kullanıcıları öncesi içeriklerle
            doldurulacak. Şimdilik bu alan hazır tutuluyor.
          </p>

          <Link
            href="/dashboard"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0F49BD]"
          >
            <Sparkles size={17} />
            Dashboard’a Dön
          </Link>
        </section>
      </section>
    </main>
  );
}

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex min-h-8 items-center justify-center rounded-full px-3 text-xs font-black"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  );
}

function MenuGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <h3 className="px-2 pb-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">
        {title}
      </h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function MenuItem({ item }: { item: HelpItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
        style={{ color: item.color, backgroundColor: item.bg }}
      >
        {item.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
          {item.desc}
        </span>
      </span>

      <ChevronRight size={18} className="text-[#94A3B8]" />
    </Link>
  );
}