"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  BookOpen,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Megaphone,
  MessageCircle,
  Settings,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

const guideCards = [
  {
    title: "Admin Ana Sayfa",
    desc: "Yönetim panelindeki kartlar, menüler ve ana rapor alanları.",
    href: "/admin",
    icon: BookOpen,
  },
  {
    title: "Kullanıcı Yönetimi",
    desc: "Kullanıcı listeleme, onay, askıya alma, rol ve üye no işlemleri.",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "Katılım Talepleri",
    desc: "Yeni başvuruları inceleme, onaylama, reddetme ve not ekleme.",
    href: "/admin/katilim-talepleri",
    icon: UserPlus,
  },
  {
    title: "Portföy Onayları",
    desc: "Yetki belgeli portföyleri inceleme, onaylama ve havuza alma.",
    href: "/admin/portfolio-approvals",
    icon: ClipboardCheck,
  },
  {
    title: "Referans Yönetimi",
    desc: "Referans kodu oluşturma, pasifleştirme ve takip işlemleri.",
    href: "/admin/referrals",
    icon: UsersRound,
  },
  {
    title: "Sistem Mesajları",
    desc: "Tek kullanıcı, rol, şehir veya tüm kullanıcılara mesaj gönderimi.",
    href: "/admin/system-messages",
    icon: MessageCircle,
  },
  {
    title: "Duyurular",
    desc: "Platform duyurularını oluşturma, düzenleme ve yayına alma.",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "Raporlar",
    desc: "Trafik, online kullanıcılar, sayfa ve kullanıcı raporları.",
    href: "/admin/reports",
    icon: Activity,
  },
  {
    title: "Audit Log",
    desc: "Yönetici işlem geçmişi, IP, cihaz ve metadata kayıtları.",
    href: "/admin/audit-log",
    icon: FileText,
  },
  {
    title: "Ayarlar",
    desc: "Aktif sistem modüllerine hızlı erişim ve ayar merkezi.",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Lina Merkezi",
    desc: "Lina AI asistan ekranı ve yönetim destek alanı.",
    href: "/lina",
    icon: Sparkles,
  },
];

export default function AdminHelpCenterPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const role = String(user?.role || "").toUpperCase();
  const canAccess = role === "MODERATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/admin");
    }
  }, [hasHydrated, user?.id, user?.role, canAccess, router]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Admin paneline dön"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Admin Yardım Merkezi
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Yönetim modülleri için hızlı rehber
              </p>
            </div>
          </div>

          <Link
            href="/admin/settings"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Admin ayarlarına git"
          >
            <Settings size={17} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="mb-3 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-center">
          <HelpCircle className="mx-auto text-blue-700" size={32} />
          <h2 className="mt-2 text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            Yönetim Rehberi
          </h2>
          <p className="mx-auto mt-1 max-w-[760px] text-[12px] font-bold leading-5 text-slate-600">
            Bu merkez admin panelindeki aktif modüllere hızlı erişim sağlar. Her kart gerçek bir ekrana yönlenir.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {guideCards.map((item, index) => {
            const Icon = item.icon;
            const isLastOdd = guideCards.length % 2 === 1 && index === guideCards.length - 1;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[124px] rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-sm transition active:scale-[0.99] ${
                  isLastOdd ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""
                }`}
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon size={24} />
                </span>
                <h3 className="mt-3 text-[14px] font-black tracking-[-0.03em] text-[#172033]">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">
                  {item.desc}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}