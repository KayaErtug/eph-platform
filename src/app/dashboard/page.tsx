'use client';

import {
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleUserRound,
  Home,
  Mic,
  Plus,
  Search,
  UsersRound,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] pb-28 text-[#111827]">
      <section className="mx-auto max-w-md px-4 pt-5">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">EPH</p>
            <h1 className="text-2xl font-bold tracking-tight">
              Merhaba, Ahmet 👋
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bugün portföyünde neler oluyor?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
              <Bell size={19} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
              <CircleUserRound size={22} />
            </button>
          </div>
        </header>

        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
          <Search size={18} className="text-gray-400" />
          <input
            placeholder="İlan, müşteri veya proje ara..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3">
          <StatCard title="Toplam İlan" value="128" change="+12%" />
          <StatCard title="Aktif Müşteri" value="86" change="+8%" />
        </section>

        <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#6D5DFB] p-5 text-white shadow-lg shadow-indigo-200">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-indigo-100">Lina AI</p>
              <h2 className="mt-1 text-xl font-bold leading-tight">
                Sesli ilan oluştur
              </h2>
              <p className="mt-2 text-sm text-indigo-100">
                İlan bilgilerini söyle, Lina açıklamayı hazırlasın.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Mic size={24} />
            </div>
          </div>

          <button className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-[#4F46E5]">
            Lina ile Başla
          </button>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold">Hızlı İşlemler</h2>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction icon={<Plus size={20} />} label="İlan Ekle" />
            <QuickAction icon={<UsersRound size={20} />} label="Müşteri" />
            <QuickAction icon={<Mic size={20} />} label="Lina AI" />
            <QuickAction
              icon={<ChartNoAxesColumnIncreasing size={20} />}
              label="Piyasa"
            />
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Son Eklenen İlanlar</h2>
            <button className="text-sm font-semibold text-[#4F46E5]">
              Tümü
            </button>
          </div>

          <div className="space-y-3">
            <ListingCard
              title="Sümerpark Evleri"
              location="Merkezefendi / Denizli"
              price="6.250.000 TL"
              status="Aktif"
            />
            <ListingCard
              title="Nova Residence"
              location="Pamukkale / Denizli"
              price="4.750.000 TL"
              status="Aktif"
            />
          </div>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem active icon={<Home size={20} />} label="Ana Sayfa" />
          <BottomItem icon={<Building2 size={20} />} label="İlanlar" />

          <button className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-xl shadow-indigo-300">
            <Plus size={28} />
          </button>

          <BottomItem icon={<UsersRound size={20} />} label="CRM" />
          <BottomItem icon={<CalendarDays size={20} />} label="Profil" />
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
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-3 flex items-end justify-between">
        <strong className="text-3xl font-bold">{value}</strong>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
          {change}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-4 text-center text-xs font-semibold shadow-sm ring-1 ring-gray-100">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[#4F46E5]">
        {icon}
      </span>
      {label}
    </button>
  );
}

function ListingCard({
  title,
  location,
  price,
  status,
}: {
  title: string;
  location: string;
  price: string;
  status: string;
}) {
  return (
    <article className="flex gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
      <div className="h-24 w-24 shrink-0 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />

      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold">{title}</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{location}</p>
        </div>

        <p className="font-bold text-[#111827]">{price}</p>
      </div>
    </article>
  );
}

function BottomItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 text-xs ${
        active ? 'text-[#4F46E5]' : 'text-gray-400'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}