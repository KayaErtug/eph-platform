'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

import {
  Bell,
  Building2,
  ChevronRight,
  CircleUserRound,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  Plus,
  UsersRound,
  WalletCards,
} from 'lucide-react';

function getGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const isBayram =
    (month === 3 && day >= 29 && day <= 31) ||
    (month === 4 && day <= 2) ||
    (month === 6 && day >= 5 && day <= 9);

  if (isBayram) {
    return {
      title: 'İyi bayramlar',
      subtitle:
        'Sevdiklerinle birlikte huzurlu ve bereketli bir bayram geçirmeni dileriz.',
    };
  }

  if (hour >= 5 && hour < 12) {
    return {
      title: 'Günaydın',
      subtitle: 'Bugünkü portföy hareketlerin ve müşteri trafiğin hazır.',
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      title: 'Tünaydın',
      subtitle:
        'Piyasadaki fırsatları ve aktif görüşmelerini takip etmeyi unutma.',
    };
  }

  if (hour >= 17 && hour < 22) {
    return {
      title: 'İyi akşamlar',
      subtitle:
        'Günün performansını ve müşteri hareketlerini gözden geçirebilirsin.',
    };
  }

  return {
    title: 'İyi geceler',
    subtitle: 'Yarınki fırsatlar için sistemin hazır durumda.',
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const greeting = getGreeting();

  const firstName =
    user?.firstName?.trim() || user?.email?.split('@')[0] || 'EPH Üyesi';

  const handleLogout = () => {
    logout();
    router.push('/giris');
  };

  return (
    <main className="min-h-screen bg-[#F4F6F9] text-[#111827]">
      <section className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] px-5 pb-28 pt-6">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-black tracking-tight text-[#0B1F44]">
                EPH
              </h1>

              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Emlak Portföy Havuzu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
                <Bell size={19} />
              </button>

              <button
                onClick={() => router.push('/profil')}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1D4ED8]"
              >
                <CircleUserRound size={24} />
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 text-[13px] font-black text-red-600 transition hover:bg-red-100"
          >
            <LogOut size={16} />
            Güvenli Çıkış Yap
          </button>

          <div className="mt-8 text-center">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#1D4ED8]">
              Günlük Özet
            </p>

            <h2 className="mt-2 text-[28px] font-black leading-none tracking-tight">
              {greeting.title} {firstName}
            </h2>

            <p className="mx-auto mt-3 max-w-[280px] text-[15px] leading-6 text-slate-500">
              {greeting.subtitle}
            </p>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-3 gap-3">
          <StatCard title="İlan" value="128" change="+12%" />
          <StatCard title="Müşteri" value="86" change="+8%" />
          <StatCard title="İşlem" value="42" change="+15%" />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[18px] font-black tracking-tight">
              Hızlı İşlemler
            </h3>

            <button className="text-[13px] font-bold text-[#1D4ED8]">
              Düzenle
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <QuickAction href="/stok" icon={<Plus size={20} />} label="İlan" />

            <QuickAction
              href="/crm"
              icon={<UsersRound size={20} />}
              label="CRM"
            />

            <QuickAction
              href="/network"
              icon={<MessageCircle size={20} />}
              label="Network"
            />

            <QuickAction
              href="/market"
              icon={<WalletCards size={20} />}
              label="Piyasa"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[18px] font-black tracking-tight">
              Son İlanlar
            </h3>

            <Link
              href="/stok"
              className="flex items-center gap-1 text-[13px] font-bold text-[#1D4ED8]"
            >
              Tümü
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="space-y-3">
            <ListingCard
              title="Sümerpark Evleri"
              type="3+1 Daire"
              location="Merkezefendi / Denizli"
              price="6.250.000 TL"
              status="Aktif"
            />

            <ListingCard
              title="Nova Residence"
              type="2+1 Daire"
              location="Pamukkale / Denizli"
              price="4.750.000 TL"
              status="Aktif"
            />

            <ListingCard
              title="Elite Konakları"
              type="4+1 Daire"
              location="Pamukkale / Denizli"
              price="8.900.000 TL"
              status="Pasif"
            />
          </div>
        </section>

        <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
              <Mic size={25} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black uppercase tracking-wide text-[#1D4ED8]">
                Lina AI
              </p>

              <h3 className="mt-1 text-[19px] font-black tracking-tight">
                Sesli ilan oluştur
              </h3>

              <p className="mt-1 text-[14px] leading-5 text-slate-500">
                İlan bilgilerini konuşarak hızlıca kayıt oluştur.
              </p>
            </div>
          </div>

          <button className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#1D4ED8] text-[14px] font-black text-white">
            Lina’yı Başlat
          </button>
        </section>

        <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[18px] font-black tracking-tight">
              Piyasa Özeti
            </h3>

            <Link
              href="/market"
              className="flex items-center gap-1 text-[13px] font-bold text-[#1D4ED8]"
            >
              Detay
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MarketMini title="Konut m²" value="33.750" change="+4.2%" />
            <MarketMini title="Kiralık" value="185" change="+3.1%" />
            <MarketMini title="Satış" value="320" change="+8.7%" />
          </div>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem
            active
            href="/dashboard"
            icon={<Home size={21} />}
            label="Ana Sayfa"
          />

          <BottomItem
            href="/stok"
            icon={<Building2 size={21} />}
            label="İlanlar"
          />

          <BottomItem
            href="/network"
            icon={<MessageCircle size={21} />}
            label="Network"
          />

          <BottomItem
            href="/crm"
            icon={<UsersRound size={21} />}
            label="CRM"
          />

          <BottomItem
            href="/profil"
            icon={<CircleUserRound size={21} />}
            label="Profil"
          />
        </div>
      </nav>
    </main>
  );
}

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-[28px] font-black leading-none">{value}</p>

      <p className="mt-3 text-[12px] font-bold text-emerald-600">
        {change}
      </p>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-slate-200 bg-white px-2 py-4"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>

      <span className="mt-3 block text-center text-[12px] font-bold text-slate-700">
        {label}
      </span>
    </Link>
  );
}

function ListingCard({
  title,
  type,
  location,
  price,
  status,
}: {
  title: string;
  type: string;
  location: string;
  price: string;
  status: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3">
      <div className="h-[82px] w-[92px] shrink-0 overflow-hidden rounded-[18px] bg-[#E8EEF6]">
        <div className="flex h-full items-end justify-center">
          <div className="mb-2 h-12 w-14 rounded-t-md bg-white/70" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[16px] font-black tracking-tight">
          {title}
        </h4>

        <p className="mt-1 text-[13px] font-semibold text-slate-500">
          {type}
        </p>

        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-slate-400">
          <MapPin size={12} />
          {location}
        </p>

        <p className="mt-2 text-[17px] font-black">{price}</p>
      </div>

      <div className="flex flex-col items-end justify-between self-stretch py-1">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            status === 'Aktif'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {status}
        </span>

        <ChevronRight size={19} className="text-slate-400" />
      </div>
    </article>
  );
}

function MarketMini({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-[19px] font-black">{value}</p>

      <p className="mt-2 text-[12px] font-bold text-emerald-600">
        {change}
      </p>
    </div>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? 'text-[#1D4ED8]' : 'text-slate-500'
      }`}
    >
      {icon}

      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}