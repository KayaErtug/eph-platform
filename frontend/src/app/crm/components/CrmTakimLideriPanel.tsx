"use client";

import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Flame,
  Home,
  MessageSquare,
  MoreVertical,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

type Tone = "blue" | "green" | "orange" | "purple" | "red" | "yellow";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  purple: "bg-violet-50 text-violet-700 border-violet-100",
  red: "bg-red-50 text-red-700 border-red-100",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
};

const kpis = [
  { title: "Danışman", value: "10", subtitle: "Aktif", icon: <Users size={22} />, tone: "blue" as Tone },
  { title: "Portföy", value: "428", subtitle: "Toplam", icon: <Home size={22} />, tone: "green" as Tone },
  { title: "Sıcak Fırsat", value: "37", subtitle: "Eşleşme", icon: <Flame size={22} />, tone: "red" as Tone },
  { title: "Görev", value: "18", subtitle: "Bugün", icon: <CheckSquare size={22} />, tone: "orange" as Tone },
  { title: "Satış", value: "12", subtitle: "Bu Ay", icon: <TrendingUp size={22} />, tone: "green" as Tone, badge: "↗ %20" },
  { title: "Takım Cirosu", value: "84M ₺", subtitle: "Bu Ay", icon: <Trophy size={22} />, tone: "purple" as Tone, badge: "↗ %18" },
  { title: "Portföy Kalitesi", value: "89/100", subtitle: "Ortalama", icon: <Star size={22} />, tone: "yellow" as Tone, badge: "↗ %6" },
  { title: "Dönüşüm Oranı", value: "%14", subtitle: "Bu Ay", icon: <Target size={22} />, tone: "blue" as Tone, badge: "↗ %3" },
];

const quickActions = [
  { top: "Görev", bottom: "Ata", icon: <ClipboardList size={22} />, tone: "blue" as Tone },
  { top: "Toplantı", bottom: "Ekle", icon: <CalendarDays size={22} />, tone: "purple" as Tone },
  { top: "Fırsat", bottom: "Paylaş", icon: <Share2 size={22} />, tone: "green" as Tone },
  { top: "Mesaj", bottom: "Gönder", icon: <MessageSquare size={22} />, tone: "blue" as Tone },
  { top: "Portföy", bottom: "Kalitesi", icon: <Star size={22} />, tone: "yellow" as Tone },
  { top: "Eşleşme", bottom: "Gör", icon: <Target size={22} />, tone: "green" as Tone },
  { top: "Rozet", bottom: "Öner", icon: <Award size={22} />, tone: "red" as Tone },
  { top: "Rapor", bottom: "Aç", icon: <BarChart3 size={22} />, tone: "blue" as Tone },
];

const segments = [
  { title: "Danışmanlar", value: "10", subtitle: "Aktif", icon: <Users size={18} />, tone: "blue" as Tone },
  { title: "Fırsatlar", value: "37", subtitle: "Sıcak", icon: <Flame size={18} />, tone: "red" as Tone },
  { title: "Geciken Takipler", value: "14", subtitle: "Geciken", icon: <Bell size={18} />, tone: "red" as Tone },
  { title: "Görevler", value: "18", subtitle: "Bugün", icon: <CheckSquare size={18} />, tone: "green" as Tone },
  { title: "Portföyler", value: "428", subtitle: "Toplam", icon: <Home size={18} />, tone: "green" as Tone },
  { title: "Performans", value: "%127", subtitle: "Hedefe Göre", icon: <TrendingUp size={18} />, tone: "blue" as Tone },
];

const advisors = [
  { name: "Volkan Demir", portfolio: 52, crm: 145, sales: 3, quality: 82, conversion: 16 },
  { name: "Ayşe Yılmaz", portfolio: 68, crm: 162, sales: 5, quality: 94, conversion: 22 },
  { name: "Mehmet Can", portfolio: 46, crm: 112, sales: 2, quality: 68, conversion: 9 },
  { name: "Zeynep Acar", portfolio: 41, crm: 108, sales: 1, quality: 45, conversion: 6 },
  { name: "Ali Toprak", portfolio: 39, crm: 93, sales: 2, quality: 72, conversion: 11 },
];

const opportunities = [
  { title: "3+1 Daire Arayan", area: "Pamukkale", budget: "7.500.000 ₺", match: 91 },
  { title: "2+1 Daire Arayan", area: "Merkezefendi", budget: "5.200.000 ₺", match: 87 },
  { title: "Villa Arayan", area: "Pamukkale", budget: "12.000.000 ₺", match: 84 },
  { title: "Dükkan Arayan", area: "Merkez", budget: "4.000.000 ₺", match: 62 },
];

const missingFields = [
  ["Tapu bilgisi eksik", 14, "bg-red-500"],
  ["Cephe bilgisi eksik", 23, "bg-orange-500"],
  ["Aidat bilgisi eksik", 11, "bg-yellow-500"],
  ["Fotoğraf yetersiz", 8, "bg-blue-500"],
  ["Açıklama yetersiz", 6, "bg-violet-500"],
];

const badges = [
  { title: "Portföy Ustası", person: "Ayşe Yılmaz", score: "94 Puan", icon: <Star size={34} />, tone: "purple" as Tone },
  { title: "Satış Ustası", person: "Mehmet Can", score: "83 Puan", icon: <Trophy size={34} />, tone: "orange" as Tone },
  { title: "Takım Oyuncusu", person: "Volkan Demir", score: "79 Puan", icon: <ShieldCheck size={34} />, tone: "blue" as Tone },
  { title: "CRM Ustası", person: "Ali Toprak", score: "Öneri Yap", icon: <Users size={34} />, tone: "green" as Tone },
];

function showComingSoon(title: string) {
  alert(`${title} özelliği yakında aktif olacak.`);
}

function qualityColor(value: number) {
  if (value >= 85) return "bg-emerald-500 text-emerald-700";
  if (value >= 70) return "bg-yellow-500 text-yellow-700";
  return "bg-red-500 text-red-700";
}

export default function CrmTakimLideriPanel() {
  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] pb-[calc(88px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <header className="sticky top-0 z-20 border-b border-[#C7D6E8] bg-[#071B63] px-4 py-4 text-white shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[42px_1fr_42px] items-center gap-2">
          <button
            type="button"
            onClick={() => showComingSoon("Menü")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
            aria-label="Menü"
          >
            <span className="text-2xl leading-none">≡</span>
          </button>

          <div className="min-w-0 text-center">
            <h1 className="truncate text-xl font-extrabold leading-tight">CRM Takım Lideri</h1>
            <p className="text-sm font-semibold text-blue-100">Takım A</p>
          </div>

          <button
            type="button"
            onClick={() => showComingSoon("Bildirimler")}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
            aria-label="Bildirimler"
          >
            <Bell size={20} />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black">
              5
            </span>
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <section className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-50 to-violet-100 text-5xl">
              🤖
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#2563EB]">Lina Takım Koçu</h2>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  ● AKTİF
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm font-semibold text-[#1F2937]">
                <p>↗ Takım A bu ay ofis ortalamasının %27 üzerinde.</p>
                <p>⚠️ 3 danışman 7 gündür yeni portföy girmedi.</p>
                <p>⭐ Ayşe'nin portföy kalite skoru takımın en iyisi.</p>
                <p>🔎 8 potansiyel eşleşme fırsatı bulundu.</p>
              </div>

              <button
                type="button"
                onClick={() => showComingSoon("Lina Takım Koçu Tüm Öneriler")}
                className="mt-4 min-h-[44px] rounded-2xl border border-[#2563EB] bg-white px-4 py-2 text-sm font-extrabold text-[#2563EB]"
              >
                Tüm Önerileri Gör
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => showComingSoon(item.title)}
              className="rounded-3xl border border-[#C7D6E8] bg-white p-4 text-left shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50"
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1F2937]">{item.title}</p>
                  <p className="mt-1 text-2xl font-extrabold text-[#111827]">{item.value}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#64748B]">{item.subtitle}</p>
                    {item.badge && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </section>

        <Panel title="Hızlı İşlemler">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
            {quickActions.map((item) => (
              <button
                key={`${item.top}-${item.bottom}`}
                type="button"
                onClick={() => showComingSoon(`${item.top} ${item.bottom}`)}
                className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-2 py-3 text-center shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                  {item.icon}
                </span>
                <span className="text-[11px] font-extrabold leading-tight text-[#1F2937]">
                  {item.top}
                  <br />
                  {item.bottom}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Segmentler">
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            {segments.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => showComingSoon(item.title)}
                className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-2 py-3 text-center shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                  {item.icon}
                </span>
                <span className="mt-2 line-clamp-2 min-h-[28px] text-[11px] font-extrabold leading-[14px] text-[#1F2937]">
                  {item.title}
                </span>
                <span className="mt-1 text-xl font-black text-[#111827]">{item.value}</span>
                <span className="text-[11px] font-bold text-[#64748B]">{item.subtitle}</span>
              </button>
            ))}
          </div>
        </Panel>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel
            title="Kendi Takımım"
            actionText="Tümünü Gör"
            onAction={() => showComingSoon("Tüm Danışmanlar")}
          >
            <div className="space-y-3">
              {advisors.map((advisor) => (
                <button
                  key={advisor.name}
                  type="button"
                  onClick={() => showComingSoon(`${advisor.name} Performans`)}
                  className="w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-left transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  <div className="grid grid-cols-[44px_1fr_24px] gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-[#2563EB]">
                      {advisor.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#1F2937]">{advisor.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-[#64748B]">
                        Portföy: {advisor.portfolio} · CRM: {advisor.crm} · Satış: {advisor.sales}
                      </p>

                      <MetricBar label="Kalite" value={advisor.quality} suffix="/100" />
                      <MetricBar label="Dönüşüm" value={advisor.conversion} suffix="%" max={25} />
                    </div>

                    <MoreVertical className="mt-1 text-[#64748B]" size={18} />
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Sıcak Fırsatlar"
            actionText="Tümünü Gör"
            onAction={() => showComingSoon("Tüm Sıcak Fırsatlar")}
          >
            <div className="space-y-3">
              {opportunities.map((item) => (
                <button
                  key={`${item.title}-${item.budget}`}
                  type="button"
                  onClick={() => showComingSoon(`${item.title} Eşleşmesi`)}
                  className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-left transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Flame size={20} />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-[#1F2937]">{item.title}</span>
                    <span className="block text-xs font-bold text-[#64748B]">Bölge: {item.area}</span>
                    <span className="block text-xs font-bold text-[#64748B]">Bütçe: {item.budget}</span>
                  </span>

                  <span className={`rounded-2xl px-3 py-2 text-center text-sm font-black ${item.match >= 85 ? "bg-emerald-50 text-emerald-700" : item.match >= 70 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}`}>
                    Eşleşme
                    <br />%{item.match}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => showComingSoon("Tüm Fırsatları Gör")}
                className="min-h-[44px] w-full rounded-2xl border border-[#2563EB] bg-white px-3 py-2 text-sm font-extrabold text-[#2563EB]"
              >
                Tüm Fırsatları Gör <ChevronRight className="inline" size={16} />
              </button>
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel
            title="Portföy Kalitesi"
            actionText="Tümünü Gör"
            onAction={() => showComingSoon("Portföy Kalitesi Detayı")}
          >
            <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-4 text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-emerald-400 bg-white">
                  <div>
                    <p className="text-3xl font-black text-[#111827]">89</p>
                    <p className="text-xs font-black text-[#64748B]">/100</p>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold text-[#64748B]">Ortalama Kalite Skoru</p>
              </div>

              <div className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-4">
                <h3 className="text-sm font-extrabold text-[#1F2937]">Eksik Alanlar</h3>
                <div className="mt-3 space-y-2">
                  {missingFields.map(([label, count, color]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#1F2937]">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="text-xs font-black text-[#111827]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-4">
              <h3 className="text-sm font-extrabold text-[#1F2937]">Danışman Bazlı Kalite</h3>
              <div className="mt-3 space-y-2">
                {advisors.map((advisor) => (
                  <div key={`quality-${advisor.name}`} className="grid grid-cols-[90px_1fr_48px] items-center gap-2">
                    <span className="truncate text-xs font-bold text-[#1F2937]">{advisor.name}</span>
                    <span className="h-2 rounded-full bg-slate-200">
                      <span className={`block h-2 rounded-full ${qualityColor(advisor.quality).split(" ")[0]}`} style={{ width: `${advisor.quality}%` }} />
                    </span>
                    <span className="text-right text-xs font-black text-[#111827]">{advisor.quality}/100</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Takım Rozetleri"
            actionText="Rozet Öner"
            onAction={() => showComingSoon("Rozet Öner")}
          >
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <button
                  key={badge.title}
                  type="button"
                  onClick={() => showComingSoon(`${badge.title} Rozeti`)}
                  className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-4 text-center transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border ${toneClasses[badge.tone]}`}>
                    {badge.icon}
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-[#1F2937]">{badge.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">Önerilen: {badge.person}</p>
                  <p className="mt-1 text-xs font-black text-[#2563EB]">{badge.score}</p>
                  <span className="mt-3 inline-flex min-h-[34px] items-center justify-center rounded-2xl border border-[#2563EB] bg-white px-3 text-xs font-black text-[#2563EB]">
                    Öner
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function Panel({
  title,
  children,
  actionText,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[#1F2937]">{title}</h2>
        {actionText && (
          <button
            type="button"
            onClick={onAction}
            className="flex items-center gap-1 text-xs font-black text-[#2563EB]"
          >
            {actionText} <ChevronRight size={14} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricBar({
  label,
  value,
  suffix,
  max = 100,
}: {
  label: string;
  value: number;
  suffix: string;
  max?: number;
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const color = value >= 85 || (max === 25 && value >= 16) ? "bg-emerald-500" : value >= 65 || (max === 25 && value >= 9) ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="mt-2 grid grid-cols-[66px_1fr_52px] items-center gap-2">
      <span className="text-xs font-bold text-[#64748B]">{label}</span>
      <span className="h-2 rounded-full bg-slate-200">
        <span className={`block h-2 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </span>
      <span className="text-right text-xs font-black text-[#111827]">
        {suffix === "%" ? `%${value}` : `${value}${suffix}`}
      </span>
    </div>
  );
}