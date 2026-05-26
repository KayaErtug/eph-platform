"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Globe2,
  Handshake,
  LockKeyhole,
  MessageCircle,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://emlakportfoyhavuzu.com/api";

const ROLE_MAP: Record<string, string> = {
  Emlakçı: "EMLAKCI",
  Müteahhit: "MUTEAHHIT",
  "İnşaat Firması": "INSAAT_FIRMASI",
};

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
    desc: "Emlakçı, müteahhit ve inşaat firmaları tek çatı altında buluşur, birlikten kuvvet doğar.",
  },
  {
    icon: Building2,
    label: "Portföy",
    title: "Portföy Havuzu",
    desc: "Satılık, kiralık ve proje bazlı tüm portföyler tek merkezden ve düzenli biçimde izlenir.",
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
    desc: "Talep, portföy ve ortak satış süreçleri hızlanır. Komisyon paylaşımı şeffaf çalışır.",
  },
  {
    icon: Sparkles,
    label: "Yapay Zeka",
    title: "Lina AI",
    desc: "İlan metni, portföy girişi ve içerik üretiminde sesli ve yazılı akıllı destek sağlar.",
  },
];

type InfoModalType = "kesfet" | "kvkk" | "gizlilik" | "iletisim";

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [infoModal, setInfoModal] = useState<null | InfoModalType>(null);

  const [form, setForm] = useState({
    ad: "",
    tel: "",
    email: "",
    meslek: "",
    kod: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const submitForm = async () => {
    if (!form.ad.trim() || !form.tel.trim() || !form.email.trim() || !form.meslek) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicantName: form.ad,
          applicantPhone: form.tel,
          applicantEmail: form.email,
          requestedRole: ROLE_MAP[form.meslek] || "EMLAKCI",
          referralCode: form.kod || undefined,
          message: "",
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      setSuccess(true);
      setForm({
        ad: "",
        tel: "",
        email: "",
        meslek: "",
        kod: "",
      });
    } catch {
      alert("Başvuru gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const closeApplicationForm = () => {
    setShowForm(false);
    setSuccess(false);
  };

  return (
    <>
      <main className="min-h-screen overflow-hidden bg-[#06111F] text-white">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#06111F]/90 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-11 w-11 rounded-2xl object-contain"
              />

              <div>
                <h1 className="text-lg font-black tracking-tight">EPH Platform</h1>

                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#60A5FA]">
                  Emlak Portföy Havuzu
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              <button
                type="button"
                onClick={() => setInfoModal("kesfet")}
                className="text-sm font-bold text-white/70 transition hover:text-white"
              >
                Keşfet
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("ozellikler")}
                className="text-sm font-bold text-white/70 transition hover:text-white"
              >
                Neler Var?
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("basvuru")}
                className="text-sm font-bold text-white/70 transition hover:text-white"
              >
                Hemen Başvur
              </button>

              <button
                type="button"
                onClick={() => setInfoModal("iletisim")}
                className="text-sm font-bold text-white/70 transition hover:text-white"
              >
                Bizimle İletişime Geç
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/giris"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black transition hover:bg-white/10"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </header>

        <section id="platform" className="relative overflow-hidden px-5 pb-24 pt-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.38),transparent_34%)]" />
          <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#60A5FA]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#2563EB]/15 blur-3xl" />

          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="relative z-10 text-center lg:text-left">
              <div className="inline-flex animate-pulse items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#93C5FD]">
                <Zap size={14} />
                Sektörün Kapalı Devre Güç Ağı
              </div>

              <h2 className="mt-7 text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">
                Portföyün
                <span className="block bg-gradient-to-r from-[#60A5FA] via-white to-[#93C5FD] bg-clip-text text-transparent">
                  Daha Uzağa
                </span>
                Ulaşsın
              </h2>

              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/65 lg:mx-0">
                EPH; emlakçıları, müteahhitleri ve inşaat firmalarını aynı
                profesyonel ağda buluşturur. Portföyler görünür olur, talepler
                hızlanır, ortak satış fırsatları tek merkezde takip edilir.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 text-sm font-bold text-white/70 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Anlık Talep Paylaşımı
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Ortak Satış Fırsatı
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Güvenli Network
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <button
                  onClick={() => setShowForm(true)}
                  className="group flex items-center gap-2 rounded-2xl bg-[#2563EB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2563EB]/25 transition hover:-translate-y-1 hover:bg-[#1D4ED8]"
                >
                  Hemen Başvur
                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className="group flex items-center gap-2 rounded-2xl border border-[#60A5FA]/30 bg-white/5 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]">
                    <Play size={14} fill="white" />
                  </span>
                  Tanıtım Videosunu İzle
                </button>

                <button
                  type="button"
                  onClick={() => setInfoModal("kesfet")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-black transition hover:-translate-y-1 hover:bg-white/10"
                >
                  EPH’yi Keşfet
                </button>
              </div>

              <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur transition hover:-translate-y-1 hover:border-[#60A5FA]/40"
                  >
                    <div className="text-3xl font-black text-[#60A5FA]">{value}</div>

                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-white/40">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <div className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

              <div className="relative mx-auto max-w-xl overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(96,165,250,0.12),transparent)]" />

                <div className="relative rounded-[32px] border border-white/10 bg-[#07111F] p-6">
                  <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:text-left">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#60A5FA]">
                        CANLI İŞ AĞI
                      </p>

                      <h3 className="mt-2 text-3xl font-black">
                        EPH Keşif Merkezi
                      </h3>
                    </div>

                    <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-[#2563EB]">
                      <Radar size={28} />
                    </div>
                  </div>

                  <div className="relative mx-auto mt-10 flex h-80 w-full max-w-sm items-center justify-center">
                    <div className="absolute h-72 w-72 animate-ping rounded-full border border-[#60A5FA]/20" />
                    <div className="absolute h-56 w-56 rounded-full border border-[#60A5FA]/20" />
                    <div className="absolute h-40 w-40 rounded-full border border-[#60A5FA]/20" />

                    <div className="absolute left-2 top-10 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-black text-[#93C5FD]">
                        <Building2 size={15} />
                        Yeni Portföy
                      </div>

                      <p className="mt-1 text-[11px] text-white/50">
                        Bölgesel fırsat yayında
                      </p>
                    </div>

                    <div className="absolute right-1 top-24 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-black text-[#93C5FD]">
                        <MessageCircle size={15} />
                        Yeni Talep
                      </div>

                      <p className="mt-1 text-[11px] text-white/50">
                        Alıcı talebi paylaşıldı
                      </p>
                    </div>

                    <div className="absolute bottom-10 left-8 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-black text-[#93C5FD]">
                        <Handshake size={15} />
                        Ortak Satış
                      </div>

                      <p className="mt-1 text-[11px] text-white/50">
                        İş birliği başladı
                      </p>
                    </div>

                    <div className="absolute bottom-16 right-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-black text-[#93C5FD]">
                        <TrendingUp size={15} />
                        Hızlı Dönüş
                      </div>

                      <p className="mt-1 text-[11px] text-white/50">
                        Fırsatlar takipte
                      </p>
                    </div>

                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[#60A5FA]/30 bg-[#2563EB]/20 shadow-2xl shadow-[#2563EB]/30">
                      <div className="absolute h-24 w-24 rounded-full bg-[#2563EB]/30 blur-xl" />

                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#2563EB]">
                        <Globe2 size={38} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-[#2563EB]/20 bg-[#2563EB]/10 p-5">
                    <div className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
                      <CheckCircle2 size={22} className="text-[#60A5FA]" />

                      <div>
                        <p className="text-sm font-black">
                          Portföy + Talep + Network Tek Merkezde
                        </p>

                        <p className="mt-1 text-xs text-white/50">
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

        <section
          id="ozellikler"
          className="relative overflow-hidden border-t border-white/10 bg-[#081423] px-5 py-24"
        >
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-[#2563EB]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#60A5FA]/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                <BadgeCheck size={14} />
                Neler Var?
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                EPH’de Sadece İlan Değil,
                <span className="block bg-gradient-to-r from-[#60A5FA] via-white to-[#93C5FD] bg-clip-text text-transparent">
                  Tam Bir İş Ekosistemi Var
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/55 md:text-lg">
                Güvenli üyelikten ortak satışa, portföy havuzundan Lina AI desteğine
                kadar tüm süreçler sektör profesyonelleri için tek merkezde toplanır.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((item, index) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-7 text-center backdrop-blur transition duration-300 hover:-translate-y-2 hover:border-[#60A5FA]/50 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-[#2563EB]/10"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#2563EB]/10 blur-2xl transition group-hover:bg-[#60A5FA]/20" />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="rounded-full border border-[#60A5FA]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#93C5FD]">
                      {item.label}
                    </div>

                    <div className="text-xs font-black text-white/20">
                      0{index + 1}
                    </div>
                  </div>

                  <div className="relative mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#60A5FA]/20 bg-[#2563EB]/10 text-[#60A5FA] transition group-hover:scale-110 group-hover:bg-[#2563EB]/20">
                    <item.icon size={34} />
                  </div>

                  <h3 className="relative mt-7 text-2xl font-black">{item.title}</h3>

                  <p className="relative mt-4 min-h-[84px] text-sm leading-7 text-white/55">
                    {item.desc}
                  </p>

                  <div className="relative mt-7 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-1/2 rounded-full bg-[#60A5FA] transition-all duration-500 group-hover:w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="basvuru" className="relative overflow-hidden px-5 py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.25),transparent_35%)]" />

          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-white/10 bg-[#0B1628] p-10 text-center md:p-16">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                <Sparkles size={14} />
                Üyelik Başvurusu
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                EPH Platform’a
                <span className="block text-[#60A5FA]">Katılmak İçin</span>
                Başvuru Oluştur
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
                Başvurular admin onayı ile değerlendirilir. Onaylanan kullanıcılar
                platformdaki kapalı devre iş ağına erişebilir.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded-2xl bg-[#2563EB] px-8 py-4 text-sm font-black"
                >
                  Başvuru Oluştur
                </button>

                <Link
                  href="/giris"
                  className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#050C16] px-5 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-10 w-10 rounded-2xl object-contain"
              />

              <div>
                <p className="text-lg font-black">EPH Platform</p>

                <p className="text-xs text-white/40">Emlak Portföy Havuzu</p>
              </div>
            </div>

            <div className="text-center text-sm text-white/30">
              © 2026 EPH Platform — Tüm hakları saklıdır.
            </div>

            <div className="flex gap-6 text-sm font-bold text-white/50">
              <button
                onClick={() => setInfoModal("kvkk")}
                className="transition hover:text-white"
              >
                KVKK
              </button>

              <button
                onClick={() => setInfoModal("gizlilik")}
                className="transition hover:text-white"
              >
                Gizlilik
              </button>

              <button
                onClick={() => setInfoModal("iletisim")}
                className="transition hover:text-white"
              >
                İletişim
              </button>
            </div>
          </div>
        </footer>
      </main>

      {showVideo && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#07111F] p-3 shadow-2xl shadow-[#2563EB]/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-3 pb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#60A5FA]">
                  EPH Platform
                </p>

                <h3 className="mt-1 text-xl font-black text-white">
                  Tanıtım Videosu
                </h3>
              </div>

              <button
                onClick={() => setShowVideo(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <video
              
	      src="/eph.mp4"
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-[24px] bg-black object-contain"
            />
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur"
          onClick={closeApplicationForm}
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-[36px] border border-white/10 bg-[#081423] p-8 text-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                  <BadgeCheck size={14} />
                  Üyelik Başvurusu
                </div>

                <h3 className="mt-5 text-3xl font-black">Üyelik Başvurusu</h3>

                <p className="mt-2 text-sm text-white/50">
                  Bilgilerinizi bırakın, sizinle iletişime geçelim.
                </p>
              </div>

              <button
                onClick={closeApplicationForm}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                <p className="text-lg font-black text-emerald-400">
                  Başvurunuz başarıyla alındı.
                </p>

                <p className="mt-2 text-sm text-white/60">
                  Ekibimiz en kısa sürede sizinle iletişime geçecek.
                </p>

                <button
                  onClick={closeApplicationForm}
                  className="mt-6 rounded-2xl bg-[#2563EB] px-6 py-3 text-sm font-black text-white"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <div className="mt-8 grid grid-cols-1 gap-5">
                  <Input
                    label="Ad Soyad"
                    value={form.ad}
                    onChange={(v) => setForm({ ...form, ad: v })}
                  />

                  <Input
                    label="Telefon"
                    value={form.tel}
                    onChange={(v) => setForm({ ...form, tel: v })}
                  />

                  <Input
                    label="E-posta"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                  />

                  <div>
                    <label className="mb-2 block text-center text-xs font-black uppercase tracking-[0.2em] text-white/40">
                      Meslek
                    </label>

                    <select
                      value={form.meslek}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          meslek: e.target.value,
                        })
                      }
                      className="h-14 w-full rounded-2xl border border-white/10 bg-[#0B1628] px-5 text-center text-sm font-bold text-white outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option>Emlakçı</option>
                      <option>Müteahhit</option>
                      <option>İnşaat Firması</option>
                    </select>
                  </div>

                  <Input
                    label="Referans Kodu (Opsiyonel)"
                    value={form.kod}
                    onChange={(v) => setForm({ ...form, kod: v })}
                  />
                </div>

                <button
                  onClick={submitForm}
                  disabled={loading}
                  className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-black transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {infoModal && (
        <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </>
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

EPH; emlakçıları, müteahhitleri ve inşaat firmalarını aynı kapalı devre profesyonel ağda buluşturan yeni nesil bir iş birliği merkezidir.

Bu sistemde portföyler daha görünür olur, müşteri talepleri daha hızlı yayılır, projeler daha geniş satış ağına ulaşır ve ortak satış fırsatları daha düzenli takip edilir.

Emlakçı, elinde olmayan portföy yüzünden müşterisini kaybetmez.
Müteahhit, projesini yalnızca birkaç kişiyle değil, daha geniş bir profesyonel ağla paylaşır.
İnşaat firması, stok ve kampanya bilgisini daha hızlı duyurur.

EPH; portföy, talep, mesajlaşma, CRM, network ve yapay zekâ destekli Lina asistanı aynı merkezde birleştirir.

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
      text: `EPH Platform; emlakçılar, müteahhitler ve inşaat firmaları için geliştirilmiş kapalı devre profesyonel bir gayrimenkul iş ağıdır.

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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-5 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-[32px] border border-white/10 bg-[#081423] p-8 text-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-[#2563EB]/20 text-[#60A5FA]">
          <Icon size={30} />
        </div>

        <h3 className="mt-5 text-3xl font-black">{content.title}</h3>

        <p className="mt-5 whitespace-pre-line text-center text-sm leading-8 text-white/65">
          {content.text}
        </p>

        <button
          onClick={onClose}
          className="mt-7 rounded-2xl bg-[#2563EB] px-7 py-3 text-sm font-black text-white"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-center text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-5 text-center text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#2563EB]"
      />
    </div>
  );
}