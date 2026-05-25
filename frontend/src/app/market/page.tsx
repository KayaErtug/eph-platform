"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Home,
  LineChart,
  LogOut,
  MapPin,
  MessageCircle,
  PieChart,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

interface MarketData {
  summary: {
    totalActive: number;
    totalUnits: number;
    newUnits30: number;
    newUnits7: number;
    closedUnits: number;
    closureRate: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    avgPricePerM2: number;
    totalUsers: number;
    totalProjects: number;
    totalCustomers: number;
  };
  topDistricts: {
    district: string;
    city: string;
    count: number;
    avgPrice: number;
    avgPricePerM2: number;
  }[];
  statusDistribution: Record<string, number>;
  typeDistribution: { type: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  ARSA: "Arsa",
  TARLA: "Tarla",
  OFIS_BURO: "Ofis/Büro",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
  DEPO_ANTREPO: "Depo/Antrepo",
  FABRIKA_ATOLYE: "Fabrika/Atölye",
};

function moneyShort(value?: number) {
  if (!value) return "—";

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₺`;
  }

  return `${value.toLocaleString("tr-TR")} ₺`;
}

function moneyFull(value?: number) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

export default function MarketPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchData();
  }, [hydrated, user]);

  const fetchData = async () => {
    try {
      const response = await api.get("/market/pulse");

      setData(response.data);
      setLastUpdate(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (error) {
      console.error(error);
      alert("Piyasa verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-4 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEF4FF] text-[#1D4ED8]">
            <LineChart size={30} />
          </div>

          <h1 className="text-[22px] font-black text-[#0B1F44]">
            Piyasa verisi bulunamadı
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Veriler oluştuğunda bu ekran otomatik dolacak.
          </p>
        </div>
      </main>
    );
  }

  const { summary, topDistricts, statusDistribution, typeDistribution } = data;

  const maxDistrictCount = Math.max(...topDistricts.map((item) => item.count), 1);
  const maxTypeCount = Math.max(...typeDistribution.map((item) => item.count), 1);
  const totalStatus = Object.values(statusDistribution).reduce(
    (sum, value) => sum + value,
    0
  );

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#111827]">
      <section className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5">
        <header className="mb-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/dashboard")}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <TrendingUp size={14} />
                Canlı Piyasa Nabzı
              </div>

              <h1 className="mt-3 text-[31px] font-black tracking-tight text-[#0B1F44]">
                Piyasa Merkezi
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                EPH Platform içindeki portföy, proje, fiyat ve bölge hareketlerini
                tek ekrandan takip et.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
            >
              Çıkış
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Canlı veri
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-xs font-black text-slate-500">
              <Clock3 size={15} />
              Son güncelleme: {lastUpdate || "—"}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              title="Aktif Portföy"
              value={summary.totalActive.toLocaleString("tr-TR")}
              subtitle={`${summary.totalUnits} toplam ilan`}
              icon={<Building2 size={19} />}
            />

            <KpiCard
              title="Son 30 Gün"
              value={summary.newUnits30.toLocaleString("tr-TR")}
              subtitle={`Son 7 gün: ${summary.newUnits7}`}
              icon={<TrendingUp size={19} />}
            />

            <KpiCard
              title="Ort. İlan Fiyatı"
              value={moneyShort(summary.avgPrice)}
              subtitle={`Min: ${moneyShort(summary.minPrice)}`}
              icon={<WalletCards size={19} />}
            />

            <KpiCard
              title="Ort. m² Fiyatı"
              value={moneyFull(summary.avgPricePerM2)}
              subtitle="Aktif ilan ortalaması"
              icon={<BarChart3 size={19} />}
            />
          </div>
        </header>

        <section className="mb-5 rounded-[32px] border border-slate-200 bg-[#0B1F44] p-5 text-white">
          <div className="mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-blue-200" />

            <h2 className="text-[18px] font-black tracking-tight">
              Platform Genel Durumu
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DarkStat title="Onaylı Üye" value={summary.totalUsers} />
            <DarkStat title="Aktif Proje" value={summary.totalProjects} />
            <DarkStat title="CRM Müşterisi" value={summary.totalCustomers} />
            <DarkStat title="Kapanma Oranı" value={`%${summary.closureRate}`} />
          </div>
        </section>

        <section className="mb-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
              <WalletCards size={14} />
              Fiyat Analizi
            </div>

            <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
              İlan fiyat dağılımı
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Platform genelindeki aktif ilanların fiyat aralığı.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <PriceCard
              title="Minimum Fiyat"
              value={moneyShort(summary.minPrice)}
              subtitle="En düşük aktif ilan"
            />

            <PriceCard
              highlight
              title="Ortalama Fiyat"
              value={moneyShort(summary.avgPrice)}
              subtitle="Tüm aktif ilanlar"
            />

            <PriceCard
              title="Maksimum Fiyat"
              value={moneyShort(summary.maxPrice)}
              subtitle="En yüksek aktif ilan"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                  <MapPin size={14} />
                  Bölgesel Nabız
                </div>

                <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
                  En aktif bölgeler
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  İlan yoğunluğuna göre sıralama.
                </p>
              </div>
            </div>

            {topDistricts.length === 0 ? (
              <EmptyState text="Henüz bölge verisi oluşmadı." />
            ) : (
              <div className="space-y-3">
                {topDistricts.map((district, index) => (
                  <div
                    key={`${district.city}-${district.district}`}
                    className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-black text-[#1D4ED8]">
                            {index + 1}
                          </span>

                          <h3 className="text-[16px] font-black text-[#0B1F44]">
                            {district.district}
                          </h3>
                        </div>

                        <p className="mt-1 pl-9 text-xs font-bold text-slate-400">
                          {district.city}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[18px] font-black text-[#0B1F44]">
                          {district.count}
                        </p>

                        <p className="text-xs font-bold text-slate-400">
                          ilan
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#1D4ED8]"
                        style={{
                          width: `${(district.count / maxDistrictCount) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniInfo
                        title="Ort. Fiyat"
                        value={moneyShort(district.avgPrice)}
                      />

                      <MiniInfo
                        title="m² Fiyatı"
                        value={moneyFull(district.avgPricePerM2)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <DistributionPanel
              title="Durum Dağılımı"
              subtitle="İlan durumlarına göre dağılım"
              items={Object.entries(statusDistribution).map(([key, value]) => ({
                label: STATUS_LABELS[key] || key,
                value,
                percent: totalStatus ? (value / totalStatus) * 100 : 0,
              }))}
            />

            <DistributionPanel
              gold
              title="Mülk Tipi Dağılımı"
              subtitle="En çok girilen mülk tipleri"
              items={typeDistribution.map((item) => ({
                label: TYPE_LABELS[item.type] || item.type,
                value: item.count,
                percent: maxTypeCount ? (item.count / maxTypeCount) * 100 : 0,
              }))}
            />
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-blue-100 bg-[#EEF4FF] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1D4ED8]">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h3 className="text-[16px] font-black text-[#0B1F44]">
                Veri kaynağı
              </h3>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Bu veriler EPH Platform içindeki gerçek ilan hareketlerinden
                otomatik hesaplanır. Platform büyüdükçe piyasa analizleri daha
                güçlü hale gelir.
              </p>
            </div>
          </div>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem href="/stok" icon={<Building2 size={21} />} label="İlanlar" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Network" />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem active href="/market" icon={<WalletCards size={21} />} label="Piyasa" />
          <BottomItem href="/profil" icon={<CircleUserRound size={21} />} label="Profil" />
        </div>
      </nav>
    </main>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-[24px] font-black text-[#0B1F44]">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function DarkStat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[24px] bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-blue-100/70">
        {title}
      </p>

      <p className="mt-2 text-[27px] font-black text-white">
        {value}
      </p>
    </div>
  );
}

function PriceCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 ${
        highlight
          ? "border-blue-100 bg-[#EEF4FF]"
          : "border-slate-200 bg-[#F8FAFC]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className={`mt-3 text-[27px] font-black ${highlight ? "text-[#1D4ED8]" : "text-[#0B1F44]"}`}>
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-sm font-black text-[#0B1F44]">
        {value}
      </p>
    </div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  items,
  gold,
}: {
  title: string;
  subtitle: string;
  items: { label: string; value: number; percent: number }[];
  gold?: boolean;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
          <BarChart3 size={14} />
          Dağılım
        </div>

        <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
          {title}
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {subtitle}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState text="Henüz dağılım verisi yok." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-[#0B1F44]">
                  {item.label}
                </span>

                <span className="text-sm font-black text-slate-500">
                  {item.value}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    gold ? "bg-amber-500" : "bg-[#1D4ED8]"
                  }`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? "text-[#1D4ED8]" : "text-slate-500"
      }`}
    >
      {icon}

      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}