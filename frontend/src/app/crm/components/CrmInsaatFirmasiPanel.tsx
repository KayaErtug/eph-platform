"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Hammer,
  HardHat,
  MessageSquarePlus,
  Package,
  Plus,
  ReceiptText,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

type StatCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "purple" | "orange";
};

const toneClasses = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  purple: "bg-violet-50 text-violet-700 border-violet-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
};

const stats: StatCard[] = [
  { title: "Aktif Proje", value: "12", subtitle: "Devam Eden", icon: <Building2 size={22} />, tone: "blue" },
  { title: "Aktif Şantiye", value: "8", subtitle: "Çalışan", icon: <HardHat size={22} />, tone: "green" },
  { title: "Taşeron", value: "27", subtitle: "Aktif Firma", icon: <Users size={22} />, tone: "purple" },
  { title: "Bekleyen Hakediş", value: "14", subtitle: "Onay Bekliyor", icon: <ReceiptText size={22} />, tone: "orange" },
  { title: "Malzeme Talebi", value: "23", subtitle: "Açık Talep", icon: <Package size={22} />, tone: "orange" },
  { title: "Tedarikçi", value: "31", subtitle: "Aktif", icon: <Truck size={22} />, tone: "blue" },
  { title: "Satış Ağı", value: "18", subtitle: "Emlakçı", icon: <Users size={22} />, tone: "green" },
  { title: "Toplam Ciro", value: "248M ₺", subtitle: "Projeler", icon: <BarChart3 size={22} />, tone: "blue" },
];

const quickActions = [
  { top: "Proje", bottom: "Ekle", icon: <Building2 size={24} />, tone: "blue" },
  { top: "Şantiye", bottom: "Ekle", icon: <HardHat size={24} />, tone: "green" },
  { top: "Taşeron", bottom: "Ekle", icon: <Hammer size={24} />, tone: "purple" },
  { top: "Tedarikçi", bottom: "Ekle", icon: <Truck size={24} />, tone: "blue" },
  { top: "Hakediş", bottom: "Ekle", icon: <ReceiptText size={24} />, tone: "orange" },
  { top: "Malzeme", bottom: "Talebi", icon: <Package size={24} />, tone: "orange" },
  { top: "Görüşme", bottom: "Ekle", icon: <MessageSquarePlus size={24} />, tone: "blue" },
  { top: "Kredi", bottom: "Hesapla", icon: <WalletCards size={24} />, tone: "green" },
];

const segments = [
  "Projeler",
  "Şantiyeler",
  "Taşeronlar",
  "Tedarikçiler",
  "Hakedişler",
  "Satış Ekibi",
  "Müşteriler",
  "Diğer Kayıtlar",
];

const sites = [
  { name: "Denizli Residence", percent: 68, workers: 47, subcontractors: 8, updated: "Bugün" },
  { name: "Merkez Lofts", percent: 42, workers: 35, subcontractors: 6, updated: "1 Gün Önce" },
  { name: "Yeşil Vadi Konutları", percent: 75, workers: 62, subcontractors: 12, updated: "Bugün" },
];

const payments = [
  ["Yılmaz İnşaat", "1.450.000 ₺"],
  ["Aktaş Hafriyat", "850.000 ₺"],
  ["Demir Beton", "620.000 ₺"],
  ["Kaya Elektrik", "320.000 ₺"],
];

const materialRequests = [
  ["Demir", "12 Ton"],
  ["Çimento", "45 Ton"],
  ["Tuğla", "15.000 Adet"],
  ["İnşaat Demiri", "8 Ton"],
];

const salesTeam = [
  ["Mustafa Kaya", "Satılan BB: 12", "845.000 ₺"],
  ["Ahmet Yılmaz", "Satılan BB: 8", "520.000 ₺"],
  ["Fatma Demir", "Satılan BB: 6", "315.000 ₺"],
  ["Mehmet Can", "Satılan BB: 4", "210.000 ₺"],
];

const linaAlerts = [
  { icon: <AlertTriangle size={18} />, text: "Denizli Residence şantiyesinde beton stoğu kritik seviyeye düştü.", tone: "orange" },
  { icon: <AlertTriangle size={18} />, text: "Yılmaz İnşaat hakedişi 15 gündür onay bekliyor.", tone: "orange" },
  { icon: <CalendarClock size={18} />, text: "3 taşeronun sözleşme süresi önümüzdeki hafta doluyor.", tone: "blue" },
  { icon: <CheckCircle2 size={18} />, text: "Merkez Lofts projesinde satış oranı hedefin altında.", tone: "green" },
];

function showComingSoon(title: string) {
  alert(`${title} özelliği yakında aktif olacak.`);
}

export default function CrmInsaatFirmasiPanel() {
  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] px-3 py-4 pb-[calc(88px+env(safe-area-inset-bottom))] text-[#1F2937] sm:px-5 lg:px-6">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-3xl border border-[#C7D6E8] bg-white px-4 py-4 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563EB]">EPH CRM</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1F2937]">İnşaat Firması CRM</h1>
            <p className="mt-1 text-sm font-medium text-[#64748B]">
              Proje, şantiye, taşeron, tedarik, hakediş ve satış operasyon merkezi
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => showComingSoon(item.title)}
              className="rounded-3xl border border-[#C7D6E8] bg-white p-4 text-left shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-[#2563EB]">{item.title}</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#111827]">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">{item.subtitle}</p>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                  {item.icon}
                </div>
              </div>
            </button>
          ))}
        </section>

        <section className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
          <h2 className="text-center text-base font-extrabold text-[#1F2937]">Hızlı İşlemler</h2>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {quickActions.map((item) => (
              <button
                key={`${item.top}-${item.bottom}`}
                type="button"
                onClick={() => showComingSoon(`${item.top} ${item.bottom}`)}
                className="flex min-h-[104px] flex-col items-center justify-between rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-2 py-3 text-center shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50"
              >
                <span className="text-[12px] font-extrabold leading-tight text-[#2563EB]">
                  {item.top}
                  <br />
                  {item.bottom}
                </span>
                <span className={`mt-2 flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses[item.tone as keyof typeof toneClasses]}`}>
                  {item.icon}
                </span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white">
                  <Plus size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
          <h2 className="text-center text-base font-extrabold text-[#1F2937]">Segmentler</h2>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {segments.map((segment) => (
              <button
                key={segment}
                type="button"
                onClick={() => showComingSoon(segment)}
                className="min-h-[44px] rounded-2xl border border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2 text-center text-xs font-extrabold text-[#1F2937] transition hover:border-[#2563EB] hover:bg-blue-50"
              >
                {segment}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <article className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-center text-base font-extrabold text-[#1F2937]">Aktif Şantiyeler</h2>
              <button
                type="button"
                onClick={() => showComingSoon("Aktif Şantiyeler Tümü")}
                className="flex items-center gap-1 text-xs font-bold text-[#2563EB]"
              >
                Tümü <ChevronRight size={15} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {sites.map((site) => (
                <div key={site.name} className="rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                  <div className="flex h-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-slate-100">
                    <HardHat className="text-[#2563EB]" size={38} />
                  </div>

                  <h3 className="mt-3 text-center text-sm font-extrabold text-[#1F2937]">{site.name}</h3>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Tamamlanma</span>
                      <span className="text-[#2563EB]">%{site.percent}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${site.percent}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs font-semibold text-[#64748B]">
                    <p className="flex justify-between">
                      <span>Çalışan</span>
                      <span>{site.workers}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Taşeron</span>
                      <span>{site.subcontractors}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Son Güncelleme</span>
                      <span>{site.updated}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => showComingSoon(`${site.name} Detay`)}
                    className="mt-4 min-h-[44px] w-full rounded-2xl border border-[#2563EB] bg-white px-3 py-2 text-sm font-extrabold text-[#2563EB]"
                  >
                    Detay
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-center text-base font-extrabold text-[#1F2937]">Lina Önerileri</h2>
              <button
                type="button"
                onClick={() => showComingSoon("Lina Önerileri Tümünü Gör")}
                className="text-xs font-bold text-[#2563EB]"
              >
                Tümünü Gör
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {linaAlerts.map((alert, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => showComingSoon("Lina Önerisi")}
                  className="flex w-full gap-3 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-left transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  <span
                    className={`mt-0.5 shrink-0 ${
                      alert.tone === "orange" ? "text-orange-600" : alert.tone === "green" ? "text-emerald-600" : "text-[#2563EB]"
                    }`}
                  >
                    {alert.icon}
                  </span>
                  <p className="text-sm font-semibold leading-relaxed text-[#1F2937]">{alert.text}</p>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <SmallListCard
            title="Bekleyen Hakedişler"
            icon={<ReceiptText size={18} />}
            rows={payments.map(([name, amount]) => ({ left: name, right: amount, badge: "Onay Bekliyor" }))}
          />

          <SmallListCard
            title="Malzeme Talepleri"
            icon={<Package size={18} />}
            rows={materialRequests.map(([name, amount]) => ({ left: name, right: amount, badge: "Açık Talep" }))}
          />

          <SmallListCard
            title="Satış Ekibi Performansı"
            icon={<Users size={18} />}
            rows={salesTeam.map(([name, detail, amount]) => ({ left: name, right: amount, badge: detail }))}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
            <h2 className="text-center text-base font-extrabold text-[#1F2937]">Son Aktiviteler</h2>

            <div className="mt-4 space-y-3">
              {[
                "Yılmaz İnşaat için 500.000 ₺ hakediş onaylandı.",
                "Denizli Residence şantiyesinde günlük rapor girildi.",
                "ABC Yapı Market için yeni sipariş oluşturuldu.",
                "Mustafa Kaya yeni müşteri görüşmesi kaydetti.",
              ].map((activity, index) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => showComingSoon("Aktivite Detayı")}
                  className="flex w-full items-start gap-3 rounded-2xl bg-[#F8FAFC] p-3 text-left transition hover:bg-blue-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                    <CheckCircle2 size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1F2937]">{activity}</p>
                    <p className="mt-1 text-xs font-medium text-[#64748B]">{index + 1} saat önce</p>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
            <h2 className="text-center text-base font-extrabold text-[#1F2937]">Özel Raporlar</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["Şantiye", "Performans"],
                ["Taşeron", "Performans"],
                ["Hakediş", "Raporu"],
                ["Malzeme", "Tüketim"],
                ["Satış", "Performans"],
                ["Proje", "Karlılık"],
              ].map(([top, bottom]) => (
                <button
                  key={`${top}-${bottom}`}
                  type="button"
                  onClick={() => showComingSoon(`${top} ${bottom}`)}
                  className="min-h-[72px] rounded-2xl border border-[#C7D6E8] bg-[#EEF3F8] px-2 py-3 text-center text-xs font-extrabold text-[#1F2937] transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  {top}
                  <br />
                  {bottom}
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function SmallListCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Array<{ left: string; right: string; badge: string }>;
}) {
  return (
    <article className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-center text-base font-extrabold text-[#1F2937]">
          <span className="text-[#2563EB]">{icon}</span>
          {title}
        </h2>
        <button type="button" onClick={() => showComingSoon(`${title} Tümü`)} className="text-xs font-bold text-[#2563EB]">
          Tümü
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <button
            key={`${row.left}-${row.right}`}
            type="button"
            onClick={() => showComingSoon(row.left)}
            className="grid w-full grid-cols-[1fr_auto] gap-2 rounded-2xl bg-[#F8FAFC] p-3 text-left transition hover:bg-blue-50"
          >
            <div className="min-w-0">
              <p className="break-words text-sm font-extrabold text-[#1F2937]">{row.left}</p>
              <p className="mt-1 break-words text-xs font-bold text-orange-600">{row.badge}</p>
            </div>
            <p className="text-right text-sm font-extrabold text-[#1F2937]">{row.right}</p>
          </button>
        ))}
      </div>
    </article>
  );
}