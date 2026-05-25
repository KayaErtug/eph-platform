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
  X,
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

const platformCards = [
  {
    icon: ShieldCheck,
    title: "Doğrulanmış Üyeler",
    desc: "Sisteme yalnızca onaylı sektör profesyonelleri erişebilir.",
  },
  {
    icon: Handshake,
    title: "Ortak Satış Sistemi",
    desc: "Portföy, talep ve iş birliği süreçleri tek merkezde takip edilir.",
  },
  {
    icon: BarChart3,
    title: "Piyasa Takibi",
    desc: "Sektördeki hareketleri ve fırsatları düzenli olarak takip edin.",
  },
  {
    icon: Building2,
    title: "Portföy Yönetimi",
    desc: "İlan, proje ve portföy kayıtlarını daha düzenli yönetin.",
  },
];

const features = [
  {
    icon: LockKeyhole,
    title: "Kapalı Devre Ağ",
    desc: "Paylaşımlar yalnızca EPH üyeleri tarafından görüntülenir.",
  },
  {
    icon: Users,
    title: "Profesyonel Network",
    desc: "Emlakçı, müteahhit ve inşaat firmaları aynı sistemde buluşur.",
  },
  {
    icon: Building2,
    title: "Portföy Havuzu",
    desc: "Satılık, kiralık ve proje bazlı portföyler düzenli şekilde yönetilir.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Üyelik",
    desc: "Başvurular admin onayı ve referans sistemiyle değerlendirilir.",
  },
  {
    icon: Handshake,
    title: "İş Birliği",
    desc: "Talep, portföy ve ortak satış süreçleri daha hızlı ilerler.",
  },
  {
    icon: Sparkles,
    title: "Lina AI Desteği",
    desc: "İlan metni, portföy girişi ve içerik üretiminde akıllı destek sağlar.",
  },
];

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [infoModal, setInfoModal] = useState<null | "kvkk" | "gizlilik" | "iletisim">(
    null
  );

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
              <a href="#platform" className="text-sm font-bold text-white/70 transition hover:text-white">
                Platform
              </a>
              <a href="#ozellikler" className="text-sm font-bold text-white/70 transition hover:text-white">
                Özellikler
              </a>
              <a href="#basvuru" className="text-sm font-bold text-white/70 transition hover:text-white">
                Başvuru
              </a>
              <button
                onClick={() => setInfoModal("iletisim")}
                className="text-sm font-bold text-white/70 transition hover:text-white"
              >
                İletişim
              </button>
            </nav>

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

        <section id="platform" className="relative overflow-hidden px-5 pb-24 pt-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_35%)]" />

          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 lg:grid-cols-2">
            <div className="relative z-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#93C5FD]">
                <Sparkles size={14} />
                B2B Gayrimenkul İş Ağı
              </div>

              <h2 className="mt-7 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
                Emlakta
                <span className="block text-[#60A5FA]">Daha Güçlü</span>
                İş Birliği
              </h2>

              <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-white/60 lg:mx-0">
                Doğrulanmış emlakçılar, müteahhitler ve inşaat firmaları için
                geliştirilen kapalı devre profesyonel paylaşım ağı.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
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

              <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur"
                  >
                    <div className="text-3xl font-black text-[#60A5FA]">{value}</div>

                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-white/40">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:text-left">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[#60A5FA]">
                      CANLI PLATFORM
                    </p>

                    <h3 className="mt-2 text-3xl font-black">EPH Network</h3>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]">
                    <Globe2 size={28} />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {platformCards.map((item) => (
                    <div
                      key={item.title}
                      className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#0B1628] p-5 text-center md:flex-row md:text-left"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB]/20 text-[#60A5FA]">
                        <item.icon size={26} />
                      </div>

                      <div>
                        <h4 className="text-lg font-black">{item.title}</h4>

                        <p className="mt-1 text-sm leading-6 text-white/50">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-3xl border border-[#2563EB]/20 bg-[#2563EB]/10 p-5">
                  <div className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
                    <CheckCircle2 size={22} className="text-[#60A5FA]" />

                    <div>
                      <p className="text-sm font-black">Güvenli Kapalı Devre Sistem</p>

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

        <section id="ozellikler" className="border-t border-white/10 bg-[#081423] px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-xs font-black text-[#60A5FA]">
                <BadgeCheck size={14} />
                Platform Özellikleri
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                Gayrimenkulde
                <span className="block text-[#60A5FA]">Dijital İş Takibi</span>
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[32px] border border-white/10 bg-white/5 p-7 text-center transition hover:-translate-y-1 hover:border-[#2563EB]/40"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2563EB]/10 text-[#60A5FA]">
                    <item.icon size={30} />
                  </div>

                  <h3 className="mt-6 text-2xl font-black">{item.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-white/50">{item.desc}</p>
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
              <button onClick={() => setInfoModal("kvkk")}>KVKK</button>
              <button onClick={() => setInfoModal("gizlilik")}>Gizlilik</button>
              <button onClick={() => setInfoModal("iletisim")}>İletişim</button>
            </div>
          </div>
        </footer>
      </main>

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
  type: "kvkk" | "gizlilik" | "iletisim";
  onClose: () => void;
}) {
  const content = {
    kvkk: {
      title: "KVKK Bilgilendirmesi",
      text: "EPH Platform’a iletilen başvuru bilgileri yalnızca üyelik değerlendirmesi ve iletişim amacıyla kullanılır.",
    },
    gizlilik: {
      title: "Gizlilik",
      text: "Platform içindeki paylaşımlar kapalı devre yapıdadır. Kullanıcı verileri üçüncü kişilerle izinsiz paylaşılmaz.",
    },
    iletisim: {
      title: "İletişim",
      text: "EPH Platform ile iletişim kurmak için üyelik başvuru formunu doldurabilir veya giriş yaptıktan sonra platform içi iletişim kanallarını kullanabilirsiniz.",
    },
  }[type];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-5 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#081423] p-8 text-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]/20 text-[#60A5FA]">
          <ShieldCheck size={28} />
        </div>

        <h3 className="mt-5 text-2xl font-black">{content.title}</h3>

        <p className="mt-4 text-sm leading-7 text-white/60">{content.text}</p>

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