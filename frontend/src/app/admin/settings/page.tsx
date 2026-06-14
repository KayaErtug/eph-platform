"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bot,
  FileText,
  HelpCircle,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

const cards = [
  {
    title: "Kullanıcı Yönetimi",
    desc: "Kullanıcı, rol, onay ve üye numarası işlemleri",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "Sistem Mesajları",
    desc: "Kullanıcı ve rol bazlı sistem mesajları",
    href: "/admin/system-messages",
    icon: MessageCircle,
  },
  {
    title: "Duyurular",
    desc: "Platform duyurularını yönet",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "Bildirim Ayarları",
    desc: "Kullanıcı bildirim tercihleri ekranı",
    href: "/notification-settings",
    icon: Bell,
  },
  {
    title: "Raporlar",
    desc: "Trafik ve kullanıcı raporları",
    href: "/admin/reports",
    icon: FileText,
  },
  {
    title: "Audit Log",
    desc: "Yönetici işlem kayıtları",
    href: "/admin/audit-log",
    icon: ShieldCheck,
  },
  {
    title: "Lina Merkezi",
    desc: "Lina AI asistan ayar ve durum ekranı",
    href: "/lina",
    icon: Bot,
  },
  {
    title: "Yardım Merkezi",
    desc: "Admin destek ve kullanım merkezi",
    href: "/admin/help-center",
    icon: HelpCircle,
  },
  {
    title: "Admin Ana Sayfa",
    desc: "Yönetim merkezine geri dön",
    href: "/admin",
    icon: Settings,
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const role = String(user?.role || "").toUpperCase();
  const canAccess = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/admin");
    }
  }, [hasHydrated, user?.id, user?.role]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Ayarlar
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Sistem yönetimi ve aktif ayar merkezleri
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <RefreshCw size={17} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="mb-3 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-center">
          <Settings className="mx-auto text-blue-700" size={30} />
          <h2 className="mt-2 text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            Admin Ayar Merkezi
          </h2>
          <p className="mx-auto mt-1 max-w-[680px] text-[12px] font-bold leading-5 text-slate-600">
            Bu ekran sahte buton içermez. Her kart aktif bir modüle veya mevcut sistem ekranına yönlendirir.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {cards.map((item, index) => {
            const Icon = item.icon;
            const isLastOdd = cards.length % 2 === 1 && index === cards.length - 1;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[122px] rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-sm transition active:scale-[0.99] ${
                  isLastOdd ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""
                }`}
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon size={24} />
                </span>
                <h3 className="mt-3 line-clamp-2 break-words text-[14px] font-black leading-4 tracking-[-0.03em] text-[#172033]">
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