"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  LayoutDashboard,
  MessageCircle,
  Network,
  Store,
  UserCircle2,
} from "lucide-react";
import type { ReactNode } from "react";

type EphAppShellProps = {
  title: string;
  children: ReactNode;
};

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Network",
    href: "/network",
    icon: Network,
  },
  {
    label: "Mesajlar",
    href: "/messages",
    icon: MessageCircle,
  },
  {
    label: "Stok",
    href: "/stok",
    icon: Building2,
  },
  {
    label: "CRM",
    href: "/crm",
    icon: BarChart3,
  },
  {
    label: "Market",
    href: "/market",
    icon: Store,
  },
  {
    label: "Profil",
    href: "/profil",
    icon: UserCircle2,
  },
];

export default function EphAppShell({
  title,
  children,
}: EphAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033] transition hover:bg-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-black text-[#172033] md:text-2xl">
              {title}
            </h1>
          </div>

          <Link
            href="/profil"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033] transition hover:bg-white"
          >
            <UserCircle2 size={20} />
          </Link>
        </div>

        <nav className="hidden border-t border-[#EEF2F7] md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                    active
                      ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20"
                      : "border border-[#DDE7F3] bg-white text-[#172033] hover:bg-[#EFF6FF]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 md:px-6">
        {children}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#DDE7F3] bg-white/98 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-3 text-[11px] font-black transition ${
                  active ? "text-[#2563EB]" : "text-[#64748B]"
                }`}
              >
                <Icon size={20} />
                <span className="text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}