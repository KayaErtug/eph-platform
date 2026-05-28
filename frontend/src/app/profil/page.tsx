"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Cpu,
  Radar,
  Lock,
  LogOut,
  ArrowLeft,
  Activity,
  Database,
  Globe,
  Sparkles,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";

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
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </main>
    );
  }

  const isAdmin = user.role === "ADMIN";

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] p-10">
        <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-black text-[#0B1F44]">
            Profil Sistemi
          </h1>

          <p className="mt-4 text-slate-500">
            Normal kullanıcı profil sistemi geçici olarak bakımda.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-2xl bg-[#1D4ED8] px-6 py-3 text-sm font-black text-white"
          >
            Dashboard'a Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_center,rgba(201,168,76,0.12),transparent_45%)]" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:44px_44px]" />

      <header className="sticky top-0 z-50 border-b border-cyan-400/10 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/5 text-cyan-100"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="text-2xl font-black tracking-tight">
                EPH Identity Core
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                Admin Mission Layer
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              router.push("/giris");
            }}
            className="flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-black text-red-200"
          >
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8 pb-24">
        <section className="overflow-hidden rounded-[42px] border border-cyan-400/10 bg-[#061126]/90 p-8 shadow-2xl shadow-cyan-950/40">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                <Shield size={14} />
                System Commander
              </div>

              <h1 className="mt-5 text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Identity
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-[#F7DFA3] bg-clip-text text-transparent">
                  Core
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
                Bu alan standart kullanıcı profili değildir. Sistem yönetimi,
                güvenlik katmanları, AI operasyon erişimleri ve yönetici
                otoriteleri bu merkezden kontrol edilir.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-[#C9A84C] px-6 py-4 text-sm font-black text-[#061126]">
                  AI Security Grid
                </button>

                <button className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-4 text-sm font-black text-cyan-100">
                  Mission Access
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <GlassCard
                icon={<Cpu size={22} />}
                title="AI Core"
                value="ONLINE"
                color="cyan"
              />

              <GlassCard
                icon={<Radar size={22} />}
                title="Network Radar"
                value="ACTIVE"
                color="gold"
              />

              <GlassCard
                icon={<Lock size={22} />}
                title="Security Layer"
                value="PROTECTED"
                color="green"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Activity size={20} />}
            title="Realtime Operations"
            value="247"
          />

          <MetricCard
            icon={<Database size={20} />}
            title="Data Streams"
            value="1.2TB"
          />

          <MetricCard
            icon={<Globe size={20} />}
            title="Network Signals"
            value="89"
          />

          <MetricCard
            icon={<Sparkles size={20} />}
            title="AI Monitoring"
            value="ACTIVE"
          />
        </section>

        <section className="mt-6 rounded-[36px] border border-cyan-400/10 bg-[#061126]/80 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                Mission Navigation
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Admin Command Routes
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NavCard
              href="/admin"
              title="Admin Center"
              desc="Kullanıcı yönetimi ve sistem kontrolü"
            />

            <NavCard
              href="/network"
              title="Network Grid"
              desc="Canlı network operasyon merkezi"
            />

            <NavCard
              href="/crm"
              title="CRM Intelligence"
              desc="Müşteri istihbarat sistemi"
            />

            <NavCard
              href="/stok"
              title="Inventory Core"
              desc="Portföy ve stok radar sistemi"
            />

            <NavCard
              href="/market"
              title="Market Intelligence"
              desc="Piyasa analiz ve AI takip sistemi"
            />

            <NavCard
              href="/dashboard"
              title="Mission Control"
              desc="Ana komuta merkezi"
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function GlassCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  const styles: Record<string, string> = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    gold: "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#F7DFA3]",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  };

  return (
    <div
      className={`rounded-[30px] border p-5 backdrop-blur-xl ${styles[color]}`}
    >
      <div className="flex items-center justify-between">
        {icon}

        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
          {title}
        </span>
      </div>

      <div className="mt-5 text-3xl font-black">{value}</div>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between text-cyan-200">
        {icon}

        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          LIVE
        </span>
      </div>

      <div className="mt-5 text-4xl font-black">{value}</div>

      <div className="mt-2 text-sm font-bold text-slate-400">{title}</div>
    </div>
  );
}

function NavCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[30px] border border-cyan-400/10 bg-white/[0.04] p-5 no-underline transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.07]"
    >
      <div className="text-xl font-black text-white">{title}</div>

      <div className="mt-3 text-sm leading-6 text-slate-400">{desc}</div>

      <div className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
        OPEN MODULE →
      </div>
    </Link>
  );
}