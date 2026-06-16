"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Crown,
  Gift,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";

const membershipPlans = [
  {
    name: "Deneme Üyeliği",
    badge: "Başlangıç",
    price: "0 ₺",
    credit: "500 hediye kontör",
    desc: "EPH Platformu deneme döneminde CRM, Portföy, Forum ve Havuz akışlarını test etmek için idealdir.",
    icon: Gift,
    features: [
      "500 hediye kontör",
      "CRM kullanımı",
      "Portföy merkezi",
      "Forum ve Havuz erişimi",
      "Temel kalite göstergeleri",
    ],
  },
  {
    name: "Profesyonel Üyelik",
    badge: "Bireysel Uzman",
    price: "Talep ile",
    credit: "5.000 kontör",
    desc: "Aktif portföy ve müşteri takibi yapan emlak profesyonelleri için genişletilmiş kullanım paketi.",
    icon: Crown,
    features: [
      "5.000 kontör paketi",
      "Gelişmiş Havuz aksiyonları",
      "Portföy kalite takibi",
      "CRM performans merkezi",
      "Öncelikli destek talebi",
    ],
  },
  {
    name: "Kurumsal Üyelik",
    badge: "Ofis / Ekip",
    price: "Talep ile",
    credit: "20.000 kontör",
    desc: "Takım, ofis ve şube yönetimi yapan kurumlar için toplu kontör ve yönetim merkezi paketi.",
    icon: Building2,
    features: [
      "20.000 kontör paketi",
      "Ofis sahibi CRM",
      "Takım lideri yönetimi",
      "Ofis kalite merkezi",
      "Toplu kontör takibi",
    ],
  },
];

const revenueModules = [
  {
    title: "Kontör Ekonomisi",
    text: "Mesaj, ilgileniyorum ve müşterim var aksiyonları kontör ile çalışır. Listeleme ve detay görüntüleme ücretsiz kalır.",
    icon: WalletCards,
  },
  {
    title: "Ofis Paketleri",
    text: "Ofis sahibi, takım liderleri ve danışmanlar için kalite, performans ve toplu kontör yönetimi hazırlanır.",
    icon: UsersRound,
  },
  {
    title: "Havuz Fırsatları",
    text: "Yetkili portföyler, güven endeksi ve CRM eşleşmesi ile daha görünür hale gelir.",
    icon: ShieldCheck,
  },
];

const creditActions = [
  ["Havuz mesajı", "3 kontör"],
  ["İlgileniyorum", "10 kontör"],
  ["Müşterim var", "20 kontör"],
  ["Listeleme ve detay", "Ücretsiz"],
];

export default function UyelikPage() {
  const recommendedPlan = useMemo(() => "Profesyonel Üyelik", []);

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] pb-[calc(92px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <header className="sticky top-0 z-40 border-b border-[#C7D6E8] bg-white/95 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/profil"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
            aria-label="Profile dön"
          >
            <ArrowLeft size={19} />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
              Gelir Modülleri Faz-1
            </p>
            <h1 className="truncate text-[20px] font-black tracking-[-0.04em] text-[#1F2937]">
              Üyelik Merkezi
            </h1>
          </div>

          <Link
            href="/kontor"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-[#EFF6FF] text-[#2563EB] shadow-sm"
            aria-label="Kontör cüzdanı"
          >
            <WalletCards size={19} />
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 lg:px-6">
        <section className="overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-white shadow-sm">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#2563EB] text-white shadow-sm">
              <Sparkles size={27} />
            </div>
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
              EPH Gelir Ekonomisi
            </p>
            <h2 className="mt-1 text-[22px] font-black tracking-[-0.05em] text-[#1F2937]">
              Üyelik ve kontör sistemi
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-[13px] font-bold leading-6 text-slate-600">
              Deneme döneminde her kullanıcı 500 hediye kontör ile başlar. Ödeme altyapısı aktif edilene kadar paketler talep yöntemiyle ilerler; sahte ödeme ekranı gösterilmez.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <InfoPill icon={<Gift size={15} />} text="500 hediye kontör" />
              <InfoPill icon={<CheckCircle2 size={15} />} text="Deneme modu" />
              <InfoPill icon={<MessageCircle size={15} />} text="Paket talebi" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          {membershipPlans.map((plan) => {
            const Icon = plan.icon;
            const recommended = plan.name === recommendedPlan;

            return (
              <article
                key={plan.name}
                className={`rounded-[28px] border bg-white p-3 shadow-sm ${
                  recommended ? "border-[#2563EB] ring-2 ring-blue-100" : "border-[#C7D6E8]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                    <Icon size={24} />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                      recommended
                        ? "bg-[#2563EB] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>

                <h3 className="mt-3 text-center text-[18px] font-black tracking-[-0.03em] text-[#1F2937]">
                  {plan.name}
                </h3>
                <p className="mt-1 text-center text-[22px] font-black text-[#2563EB]">
                  {plan.price}
                </p>
                <p className="mt-1 text-center text-[12px] font-black text-slate-500">
                  {plan.credit}
                </p>
                <p className="mt-2 text-center text-[12px] font-bold leading-5 text-slate-600">
                  {plan.desc}
                </p>

                <div className="mt-3 space-y-1.5">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 rounded-2xl border border-[#E5EDF7] bg-[#F8FAFC] px-3 py-2 text-[12px] font-bold text-[#1F2937]"
                    >
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                      <span className="min-w-0 break-words">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/messages"
                  className="mt-3 flex min-h-[42px] items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-center text-[12px] font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.20)]"
                >
                  Paket Talebi Oluştur
                </Link>
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-center text-[16px] font-black text-[#1F2937] sm:text-left">
                Kontör Kullanım Ücretleri
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-[#2563EB]">
                Havuz
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {creditActions.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3"
                >
                  <span className="text-[13px] font-black text-[#1F2937]">
                    {label}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#2563EB] shadow-sm">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-center text-[16px] font-black text-[#1F2937] sm:text-left">
                Gelir Modülleri
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-[#2563EB]">
                Faz-1
              </span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {revenueModules.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center"
                  >
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-2 text-[13px] font-black text-[#1F2937]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                      {item.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <section className="rounded-[28px] border border-[#C7D6E8] bg-white p-4 text-center shadow-sm">
          <BadgeCheck className="mx-auto text-[#2563EB]" size={28} />
          <h2 className="mt-2 text-[17px] font-black tracking-[-0.03em] text-[#1F2937]">
            Ödeme altyapısı sonraki fazda aktif edilecek
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[12px] font-bold leading-5 text-slate-600">
            Şimdilik kredi kartı veya online ödeme ekranı gösterilmez. Paket talepleri mesaj/destek kanalıyla alınır. Bu sayede platformda sahte satın alma veya çalışmayan ödeme adımı oluşmaz.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/kontor"
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-4 text-[12px] font-black text-[#1F2937]"
            >
              <WalletCards size={16} /> Kontör Cüzdanım
            </Link>
            <Link
              href="/messages"
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-[12px] font-black text-white"
            >
              <MessageCircle size={16} /> Paket Talebi Oluştur
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#C7D6E8] bg-white px-3 text-[11px] font-black text-[#1F2937] shadow-sm">
      <span className="text-[#2563EB]">{icon}</span>
      {text}
    </span>
  );
}
