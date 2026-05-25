"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  Handshake,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://emlakportfoyhavuzu.com/api";

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    ad: "",
    tel: "",
    email: "",
    meslek: "",
    kod: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submitForm = async () => {
    if (!form.ad || !form.tel || !form.email || !form.meslek) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);

    try {
      const ROLE_MAP: Record<string, string> = {
        Emlakçı: "EMLAKCI",
        Müteahhit: "MUTEAHHIT",
        "İnşaat Firması": "INSAAT_FIRMASI",
      };

      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicantName: form.ad,
          applicantPhone: form.tel,
          applicantEmail: form.email,
          requestedRole:
            ROLE_MAP[form.meslek] || "EMLAKCI",
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
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen overflow-hidden bg-[#06111F] text-white">
        {/* TOP BAR */}
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#06111F]/90 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-11 w-11 rounded-2xl object-contain"
              />

              <div>
                <h1 className="text-lg font-black tracking-tight">
                  EPH Platform
                </h1>

                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#60A5FA]">
                  Emlak Portföy Havuzu
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-8 md:flex">
              {[
                "Platform",
                "Özellikler",
                "Avantajlar",
                "İletişim",
              ].map((item) => (
                <button
                  key={item}
                  className="text-sm font-bold text-white/70 transition hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/giris"
                className="hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black md:flex"
              >
                Giriş Yap
              </Link>

              <button
                onClick={() => setShowForm(true)}
                className="rounded-2xl bg-[#2563EB] px-5 py-3 text-xs font-black text-white transition hover:bg-[#1D4ED8]"
              >
                Üyelik Başvurusu
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative overflow-hidden px-5 pb-24 pt-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_35%)]" />

          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 lg:grid-cols-2">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#93C5FD]">
                <Sparkles size={14} />
                Türkiye’nin Premium B2B Gayrimenkul Ağı
              </div>

              <h2 className="mt-7 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
                Emlakta
                <span className="block text-[#60A5FA]">
                  Yeni Nesil
                </span>
                İş Birliği
              </h2>

              <p className="mt-7 max-w-xl text-lg leading-8 text-white/60">
                Doğrulanmış emlakçılar, müteahhitler ve inşaat
                firmaları için geliştirilen kapalı devre profesyonel
                iş ağı.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 rounded-2xl bg-[#2563EB] px-7 py-4 text-sm font-black transition hover:bg-[#1D4ED8]"
                >
                  Hemen Başvur
                  <ArrowRight size={18} />
                </button>

                <Link
                  href="/giris"
                  className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-black"
                >
                  Platforma Giriş
                </Link>
              </div>

              <div className="mt-14 grid grid-cols-3 gap-4">
                {[
                  ["344+", "Aktif Üye"],
                  ["8.700+", "Portföy"],
                  ["65+", "Başarılı Satış"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <div className="text-3xl font-black text-[#60A5FA]">
                      {value}
                    </div>

                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-white/40">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="relative">
              <div className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[#60A5FA]">
                      CANLI PLATFORM
                    </p>

                    <h3 className="mt-2 text-3xl font-black">
                      Premium Network
                    </h3>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]">
                    <Globe2 size={28} />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Doğrulanmış Üyeler",
                      desc: "Sadece onaylı profesyoneller sisteme erişebilir.",
                    },
                    {
                      icon: Handshake,
                      title: "Ortak Satış Sistemi",
                      desc: "Komisyon paylaşımı ve iş birliği altyapısı.",
                    },
                    {
                      icon: BarChart3,
                      title: "Canlı Piyasa Verisi",
                      desc: "Anlık hareketleri takip edin.",
                    },
                    {
                      icon: Building2,
                      title: "Akıllı Portföy Yönetimi",
                      desc: "Projeleri hızlı yönetin.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-4 rounded-3xl border border-white/10 bg-[#0B1628] p-5"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB]/20 text-[#60A5FA]">
                        <item.icon size={26} />
                      </div>

                      <div>
                        <h4 className="text-lg font-black">
                          {item.title}
                        </h4>

                        <p className="mt-1 text-sm leading-6 text-white/50">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-3xl border border-[#2563EB]/20 bg-[#2563EB]/10 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={22}
                      className="text-[#60A5FA]"
                    />

                    <div>
                      <p className="text-sm font-black">
                        Güvenli Kapalı Devre Sistem
                      </p>

                      <p className="mt-1 text-xs text-white/50">
                        Referans sistemi ve admin onayı ile çalışır.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-white/10 bg-[#081423] px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                <BadgeCheck size={14} />
                Platform Özellikleri
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                Gayrimenkulde
                <span className="block text-[#60A5FA]">
                  Dijital Dönüşüm
                </span>
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: LockKeyhole,
                  title: "Kapalı Devre Ağ",
                  desc: "Sadece doğrulanmış profesyoneller erişebilir.",
                },
                {
                  icon: Users,
                  title: "Profesyonel Network",
                  desc: "Emlakçı, müteahhit ve yatırımcı ağı.",
                },
                {
                  icon: Building2,
                  title: "Portföy Yönetimi",
                  desc: "Projeleri ve ilanları tek merkezden yönet.",
                },
                {
                  icon: ShieldCheck,
                  title: "Güven Skoru",
                  desc: "Belgeli üyelik ve doğrulama sistemi.",
                },
                {
                  icon: Handshake,
                  title: "Ortak Satış",
                  desc: "Komisyon bazlı iş birliği sistemi.",
                },
                {
                  icon: Sparkles,
                  title: "AI Destekli Sistem",
                  desc: "Yapay zekâ ile ilan üretimi ve içerik desteği.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[32px] border border-white/10 bg-white/5 p-7 transition hover:-translate-y-1 hover:border-[#2563EB]/40"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2563EB]/10 text-[#60A5FA]">
                    <item.icon size={30} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/50">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden px-5 py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.25),transparent_35%)]" />

          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-white/10 bg-[#0B1628] p-10 md:p-16">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                <Sparkles size={14} />
                Premium Üyelik Sistemi
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                Türkiye’nin
                <span className="block text-[#60A5FA]">
                  En Güçlü
                </span>
                Emlak Ağına Katıl
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
                Referans sistemiyle çalışan premium iş ağına dahil olun.
                Güvenli, hızlı ve profesyonel dijital gayrimenkul
                ekosistemi.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
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

        {/* FOOTER */}
        <footer className="border-t border-white/10 bg-[#050C16] px-5 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                src="/LOGO_EPH.png"
                alt="EPH"
                className="h-10 w-10 rounded-2xl object-contain"
              />

              <div>
                <p className="text-lg font-black">
                  EPH Platform
                </p>

                <p className="text-xs text-white/40">
                  Emlak Portföy Havuzu
                </p>
              </div>
            </div>

            <div className="text-center text-sm text-white/30">
              © 2026 EPH Platform — Tüm hakları saklıdır.
            </div>

            <div className="flex gap-6 text-sm font-bold text-white/50">
              <button>KVKK</button>
              <button>Gizlilik</button>
              <button>İletişim</button>
            </div>
          </div>
        </footer>
      </main>

      {/* FORM */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-xl rounded-[36px] border border-white/10 bg-[#081423] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                  <BadgeCheck size={14} />
                  Premium Üyelik
                </div>

                <h3 className="mt-5 text-3xl font-black">
                  Üyelik Başvurusu
                </h3>

                <p className="mt-2 text-sm text-white/50">
                  Bilgilerinizi bırakın, sizinle iletişime geçelim.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                <p className="text-lg font-black text-emerald-400">
                  Başvurunuz başarıyla alındı 🎉
                </p>

                <p className="mt-2 text-sm text-white/60">
                  Ekibimiz en kısa sürede sizinle iletişime geçecek.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-8 grid grid-cols-1 gap-5">
                  <Input
                    label="Ad Soyad"
                    value={form.ad}
                    onChange={(v) =>
                      setForm({ ...form, ad: v })
                    }
                  />

                  <Input
                    label="Telefon"
                    value={form.tel}
                    onChange={(v) =>
                      setForm({ ...form, tel: v })
                    }
                  />

                  <Input
                    label="E-posta"
                    value={form.email}
                    onChange={(v) =>
                      setForm({ ...form, email: v })
                    }
                  />

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
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
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold outline-none"
                    >
                      <option value="">
                        Seçiniz
                      </option>

                      <option>
                        Emlakçı
                      </option>

                      <option>
                        Müteahhit
                      </option>

                      <option>
                        İnşaat Firması
                      </option>
                    </select>
                  </div>

                  <Input
                    label="Referans Kodu (Opsiyonel)"
                    value={form.kod}
                    onChange={(v) =>
                      setForm({ ...form, kod: v })
                    }
                  />
                </div>

                <button
                  onClick={submitForm}
                  disabled={loading}
                  className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-black transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {loading
                    ? "Gönderiliyor..."
                    : "Başvuruyu Gönder"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
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
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold outline-none transition focus:border-[#2563EB]"
      />
    </div>
  );
}