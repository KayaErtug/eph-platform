"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Crown,
  Home,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";

type UserRole = "ADMIN" | "EMLAKCI" | "MUTEAHHIT" | string;

type SafeUser = {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  packageType?: string;
  plan?: string;
  membershipType?: string;
  referralCode?: string;
  referenceCode?: string;
  companyName?: string;
  officeName?: string;
  title?: string;
};

const roleContent = {
  EMLAKCI: {
    className: "eph-role-emlakci",
    label: "Gayrimenkul Danışmanı",
    title: "Portföy ve müşteri takibin hazır.",
    badge: "Mavi / Turkuaz Profil",
    primaryText: "text-[#2563EB]",
    softBg: "bg-[#EFF6FF]",
    iconBg: "bg-[#DBEAFE] text-[#2563EB]",
  },
  MUTEAHHIT: {
    className: "eph-role-muteahhit",
    label: "Müteahhit",
    title: "Proje ve satış ağın hazır.",
    badge: "Turuncu / Lacivert Profil",
    primaryText: "text-[#F97316]",
    softBg: "bg-[#FFF7ED]",
    iconBg: "bg-[#FFEDD5] text-[#EA580C]",
  },
  ADMIN: {
    className: "eph-role-admin",
    label: "Admin",
    title: "Sistem yönetim panelin hazır.",
    badge: "Mor / Gri Yönetim Profili",
    primaryText: "text-[#7C3AED]",
    softBg: "bg-[#F5F3FF]",
    iconBg: "bg-[#EDE9FE] text-[#7C3AED]",
  },
};

export default function ProfilPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
    }
  }, [hydrated, router, user]);

  const safeUser = user as SafeUser | null;

  const userRole = String(safeUser?.role || "EMLAKCI").toUpperCase();
  const theme =
    userRole === "ADMIN"
      ? roleContent.ADMIN
      : userRole === "MUTEAHHIT" || userRole === "MÜTEAHHİT"
        ? roleContent.MUTEAHHIT
        : roleContent.EMLAKCI;

  const displayName = useMemo(() => {
    return (
      safeUser?.fullName ||
      safeUser?.name ||
      safeUser?.companyName ||
      safeUser?.officeName ||
      "EPH Kullanıcısı"
    );
  }, [safeUser]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [displayName]);

  const packageName =
    safeUser?.packageType || safeUser?.plan || safeUser?.membershipType || "Standart";

  const referralCode =
    safeUser?.referralCode || safeUser?.referenceCode || "Henüz tanımlı değil";

  if (!hydrated || !safeUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className={`eph-page ${theme.className} pb-24`}>
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#172033] shadow-sm"
            aria-label="Dashboard'a dön"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-xl font-black text-[#172033]">Profil</h1>
            <p className="text-xs font-bold text-[#64748B]">
              Hesap ve üyelik bilgileri
            </p>
          </div>

          <button
            onClick={() => {
              logout();
              router.push("/giris");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 shadow-sm"
            aria-label="Çıkış yap"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="eph-card overflow-hidden p-6 text-center md:p-8">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black text-[#64748B] shadow-sm">
              <BadgeCheck size={14} className={theme.primaryText} />
              {theme.badge}
            </div>

            <div className="mt-7 flex flex-col items-center gap-5">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-[32px] text-3xl font-black shadow-sm ${theme.iconBg}`}
              >
                {initials || "EPH"}
              </div>

              <div>
                <h2 className="text-4xl font-black leading-tight text-[#172033] md:text-5xl">
                  {displayName}
                </h2>

                <p className="mt-3 text-base font-bold text-[#64748B]">
                  {theme.label}
                </p>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#64748B]">
                  {theme.title} Profil bilgilerini, üyelik durumunu, referans
                  kodunu ve hızlı erişimlerini bu ekrandan takip edebilirsin.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <SmallStat icon={<CheckCircle2 size={18} />} label="Durum" value="Aktif" />
              <SmallStat icon={<Crown size={18} />} label="Üyelik" value={packageName} />
              <SmallStat icon={<ShieldCheck size={18} />} label="Rol" value={theme.label} />
            </div>
          </section>

          <section className="grid gap-4">
            <InfoCard
              icon={<Mail size={20} />}
              label="E-posta"
              value={safeUser.email || "E-posta bilgisi yok"}
            />

            <InfoCard
              icon={<Phone size={20} />}
              label="Telefon"
              value={safeUser.phone || "Telefon bilgisi yok"}
            />

            <InfoCard
              icon={<KeyRound size={20} />}
              label="Referans Kodu"
              value={referralCode}
            />

            <InfoCard
              icon={<Building2 size={20} />}
              label="Firma / Ofis"
              value={safeUser.companyName || safeUser.officeName || "Firma bilgisi yok"}
            />
          </section>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href="/dashboard"
            icon={<Home size={22} />}
            title="Dashboard"
            desc="Ana kontrol ekranına dön"
          />

          <ActionCard
            href="/stok"
            icon={<Building2 size={22} />}
            title="İlanlar"
            desc="Portföy ve stok yönetimi"
          />

          <ActionCard
            href="/crm"
            icon={<Users size={22} />}
            title="CRM"
            desc="Müşteri ve görev takibi"
          />

          <ActionCard
            href="/network"
            icon={<MessageCircle size={22} />}
            title="Network"
            desc="Talep ve iş birliği akışı"
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="eph-card p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <WalletCards size={24} />
            </div>

            <h3 className="mt-4 text-2xl font-black text-[#172033]">
              Üyelik Özeti
            </h3>

            <p className="mt-3 text-sm leading-7 text-[#64748B]">
              Paket limitleri, hesap durumu ve platform erişim bilgileri burada
              gösterilir.
            </p>

            <div className="mt-5 rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-5">
              <div className="text-sm font-bold text-[#64748B]">Mevcut Paket</div>
              <div className={`mt-2 text-3xl font-black ${theme.primaryText}`}>
                {packageName}
              </div>
            </div>
          </div>

          <div className="eph-card p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#0F766E]">
              <ClipboardList size={24} />
            </div>

            <h3 className="mt-4 text-2xl font-black text-[#172033]">
              Hesap Bilgileri
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Kullanıcı ID" value={safeUser.id || "Yok"} />
              <DetailRow label="Rol" value={theme.label} />
              <DetailRow label="Unvan" value={safeUser.title || "Tanımlı değil"} />
              <DetailRow label="Referans" value={referralCode} />
            </div>
          </div>
        </section>

        {userRole === "ADMIN" && (
          <section className="mt-6 eph-card p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
              <Settings size={24} />
            </div>

            <h3 className="mt-4 text-2xl font-black text-[#172033]">
              Admin Hızlı Erişim
            </h3>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#64748B]">
              Kullanıcı yönetimi, referans kodları ve sistem kontrolleri için
              admin modüllerine hızlıca geçebilirsin.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/admin" className="eph-btn-primary">
                Admin Paneli
              </Link>

              <Link href="/admin/referrals" className="eph-btn-soft">
                Referans Kodları
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 eph-card p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
            <Bell size={24} />
          </div>

          <h3 className="mt-4 text-2xl font-black text-[#172033]">
            Bildirim ve Güvenlik
          </h3>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#64748B]">
            Bildirim sesi, hesap güvenliği ve oturum işlemlerini buradan takip
            edebilirsin.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/notification-settings" className="eph-btn-soft">
              Bildirim Ayarları
            </Link>

            <button
              onClick={() => {
                logout();
                router.push("/giris");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-600"
            >
              <LogOut size={17} />
              Güvenli Çıkış Yap
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function SmallStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
        {icon}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-[#172033]">{value}</div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="eph-card flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
          {label}
        </div>

        <div className="mt-1 break-words text-base font-black text-[#172033]">
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="eph-card group p-5 text-center transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] transition group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-black text-[#172033]">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-[#64748B]">{desc}</p>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-black text-[#172033]">
        {value}
      </div>
    </div>
  );
}