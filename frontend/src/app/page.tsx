"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Sparkles,
  Users,
  Crown,
  MessageCircleMore,
  BellRing,
  BadgeCheck,
  Network,
  BrainCircuit,
} from "lucide-react";

export default function HomePage() {
  const [infoModal, setInfoModal] = useState<string | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111F] text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1D4ED833,transparent_45%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 py-20 text-center">
          <div className="mb-6 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-xl">
            <Sparkles size={16} className="text-[#60A5FA]" />

            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#93C5FD]">
              Türkiye’nin Premium Emlak Ekosistemi
            </p>
          </div>

          <Image
            src="/LOGO_EPH.png"
            alt="EPH Platform"
            width={140}
            height={140}
            className="mb-8 rounded-[36px] shadow-2xl"
          />

          <h1 className="max-w-5xl text-center text-5xl font-black leading-tight tracking-tight md:text-7xl">
            Güven Üzerine Kurulan
            <span className="block bg-gradient-to-r from-[#60A5FA] via-[#93C5FD] to-[#FFFFFF] bg-clip-text text-transparent">
              Dijital Emlak Ekosistemi
            </span>
          </h1>

          <p className="mt-8 max-w-3xl text-center text-lg font-medium leading-8 text-white/70 md:text-xl">
            EPH Platform; emlakçılar, müteahhitler ve inşaat firmaları için
            geliştirilmiş kapalı devre profesyonel iş ağıdır.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-7 py-4 text-sm font-black shadow-2xl transition hover:scale-[1.03]"
            >
              Platforma Giriş
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-black backdrop-blur-xl transition hover:bg-white/10"
            >
              Ücretsiz Başvur
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:grid-cols-3">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
          <ShieldCheck className="mb-5 text-[#60A5FA]" size={42} />

          <h2 className="text-2xl font-black">
            Güven & Mahremiyet
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/70">
            Kullanıcı müşteri bilgileri, CRM notları ve ticari ilişkiler özel
            veri kabul edilir. Adminler dahil hiç kimse kullanıcı mahremiyetine
            sınırsız erişemez.
          </p>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
          <Network className="mb-5 text-[#60A5FA]" size={42} />

          <h2 className="text-2xl font-black">
            Premium Network
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/70">
            Emlakçılar, müteahhitler ve inşaat firmaları güvenli ortamda
            bağlantı kurabilir, talepler paylaşabilir ve iş birlikleri
            oluşturabilir.
          </p>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
          <BrainCircuit className="mb-5 text-[#60A5FA]" size={42} />

          <h2 className="text-2xl font-black">
            Lina AI
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/70">
            Yapay zeka destekli asistan sistemi sayesinde kullanıcılar daha hızlı
            portföy yönetimi ve profesyonel iş akışı deneyimi yaşar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0B1F44] via-[#102B5B] to-[#07111F] p-8 shadow-2xl md:p-12">
          <div className="flex flex-col items-center text-center">
            <Crown className="mb-5 text-[#FACC15]" size={54} />

            <h2 className="text-4xl font-black">
              EPH Platform Anayasası
            </h2>

            <p className="mt-5 max-w-3xl text-base leading-8 text-white/70">
              EPH Platformu; kullanıcı mahremiyetini, adil rekabeti ve veri
              güvenliğini temel ilke kabul eder.
            </p>

            <Link
              href="/platform-anayasasi"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#07111F] transition hover:scale-[1.03]"
            >
              Platform Anayasasını Oku
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-4">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <Users className="mb-4 text-[#60A5FA]" size={36} />

          <h3 className="text-xl font-black">
            CRM Sistemi
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/70">
            Görev yönetimi, müşteri takibi, aktiviteler ve profesyonel CRM akışı.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <MessageCircleMore className="mb-4 text-[#60A5FA]" size={36} />

          <h3 className="text-xl font-black">
            Anlık Mesajlaşma
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/70">
            Kullanıcılar güvenli şekilde mesajlaşabilir ve anlık bildirim alır.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <BellRing className="mb-4 text-[#60A5FA]" size={36} />

          <h3 className="text-xl font-black">
            Akıllı Bildirimler
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/70">
            Görev zamanı yaklaşınca sistem otomatik hatırlatma ve uyarılar üretir.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <Building2 className="mb-4 text-[#60A5FA]" size={36} />

          <h3 className="text-xl font-black">
            Portföy Yönetimi
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/70">
            İlanlar, projeler ve bağımsız bölümler profesyonel şekilde yönetilir.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050C16] px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img
              src="/LOGO_EPH.png"
              alt="EPH"
              className="h-10 w-10 rounded-2xl object-contain"
            />

            <div>
              <p className="text-lg font-black">EPH Platform</p>

              <p className="text-xs text-white/40">
                Emlak Portföy Havuzu
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-center text-sm font-bold text-white/50">
            <Link
              href="/platform-anayasasi"
              className="transition hover:text-white"
            >
              Platform Anayasası
            </Link>

            <Link
              href="/kvkk"
              className="transition hover:text-white"
            >
              KVKK
            </Link>

            <Link
              href="/gizlilik-politikasi"
              className="transition hover:text-white"
            >
              Gizlilik Politikası
            </Link>

            <Link
              href="/kullanici-sozlesmesi"
              className="transition hover:text-white"
            >
              Kullanıcı Sözleşmesi
            </Link>

            <Link
              href="/cerez-politikasi"
              className="transition hover:text-white"
            >
              Çerez Politikası
            </Link>

            <button
              onClick={() => setInfoModal("iletisim")}
              className="transition hover:text-white"
            >
              İletişim
            </button>
          </div>

          <div className="text-center text-sm text-white/30">
            © 2026 EPH Platform — Tüm hakları saklıdır.
          </div>
        </div>
      </footer>

      {infoModal === "iletisim" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-[30px] bg-[#0B1727] p-8 text-white shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <BadgeCheck className="text-[#60A5FA]" size={32} />

              <h2 className="text-2xl font-black">
                İletişim
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-7 text-white/70">
              <p>
                Skycity İş Merkezi, 4. Kat No:36
                <br />
                Merkezefendi / Denizli
              </p>

              <p>
                Telefon:
                <br />
                +90 258 911 07 18
              </p>

              <p>
                E-Posta:
                <br />
                ephplatform@gmail.com
              </p>
            </div>

            <button
              onClick={() => setInfoModal(null)}
              className="mt-8 w-full rounded-2xl bg-[#2563EB] px-5 py-4 text-sm font-black transition hover:opacity-90"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}