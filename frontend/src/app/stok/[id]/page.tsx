"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  FileText,
  Home,
  MessageCircle,
  Phone,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS } from "@/components/stok/stokConstants";
import type { Unit } from "@/components/stok/stokTypes";

type DetailUnit = Unit & {
  createdAt?: string;
  updatedAt?: string;
  project?: Unit["project"] & {
    owner?: {
      firstName?: string;
      lastName?: string;
      role?: string;
    };
  };
};

function formatMoney(value?: number) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmedi";
  return `${numeric.toLocaleString("tr-TR")} ₺`;
}

function formatDate(value?: string) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function statusStyle(status?: string) {
  return (
    STATUS_COLORS[status || ""] || {
      color: "#344054",
      bg: "#F2F4F7",
      border: "#D0D5DD",
      dot: "#667085",
    }
  );
}

function statusLabel(status?: string) {
  return STATUS_LABELS[status || ""] || status || "Durum yok";
}

function typeLabel(type?: string) {
  return TYPE_LABELS[type || ""] || type || "Mülk tipi yok";
}

function unitTitle(unit?: DetailUnit | null) {
  if (!unit) return "Stok Detayı";
  const projectName = unit.project?.name || "EPH Portföy";
  const room = unit.roomCount ? `${unit.roomCount} ` : "";
  const type = typeLabel(unit.type);
  return `${projectName} · ${room}${type}`;
}

export default function StokDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [unit, setUnit] = useState<DetailUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  const unitId = params?.id;

  useEffect(() => {
    if (!unitId) return;
    fetchUnit();
  }, [unitId]);

  useEffect(() => {
    if (!unitId || typeof window === "undefined") return;
    setIsFollowing(localStorage.getItem(`eph-stock-follow-${unitId}`) === "true");
  }, [unitId]);

  const fetchUnit = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/units/${unitId}`);
      setUnit(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "İlan detayı yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = () => {
    if (!unitId || typeof window === "undefined") return;
    const next = !isFollowing;
    setIsFollowing(next);
    localStorage.setItem(`eph-stock-follow-${unitId}`, String(next));
  };

  const calculatedSquareMeterPrice = useMemo(() => {
    const price = Number(unit?.price || 0);
    const area = Number(unit?.area || 0);
    if (!price || !area) return "—";
    return `${Math.round(price / area).toLocaleString("tr-TR")} ₺/m²`;
  }, [unit]);

  const verificationItems = [
    { label: "Tapu", active: Boolean(unit?.tapuVerified), description: "Tapu evrakı kontrol durumu" },
    { label: "Fotoğraf", active: Boolean(unit?.photoVerified), description: "Görsel doğrulama durumu" },
    { label: "Yetki", active: Boolean(unit?.yetkiVerified), description: "Portföy yetki kontrolü" },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-[#0B1F44]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-slate-500">İlan detayı yükleniyor</p>
        </div>
      </main>
    );
  }

  if (error || !unit) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-4 text-[#0B1F44]">
        <section className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FileText size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black">İlan bulunamadı</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{error || "Bu ilana ait detay bilgisi alınamadı."}</p>
          <button onClick={() => router.push("/stok")} className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">
            Stok Sayfasına Dön
          </button>
        </section>
      </main>
    );
  }

  const style = statusStyle(unit.status);
  const ownerName = [unit.project?.owner?.firstName, unit.project?.owner?.lastName].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-[#F4F7FB] pb-28 text-[#111827]">
      <section className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-5 flex flex-col gap-4 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <button onClick={() => router.push("/stok")} className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 lg:mx-0" aria-label="Stok sayfasına dön">
              <ArrowLeft size={20} />
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black" style={{ color: style.color, background: style.bg, borderColor: style.border }}>
              <span className="h-2 w-2 rounded-full" style={{ background: style.dot }} />
              {statusLabel(unit.status)}
            </div>
            <h1 className="mt-4 text-[29px] font-black tracking-tight text-[#0B1F44] md:text-[42px]">{unitTitle(unit)}</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 lg:mx-0">
              {[unit.project?.district, unit.project?.city, unit.project?.address].filter(Boolean).join(" / ") || "Konum bilgisi yok"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex lg:justify-end">
            <button onClick={toggleFollow} className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${isFollowing ? "bg-amber-100 text-amber-700" : "border border-slate-200 bg-white text-slate-600"}`}>
              <Star size={18} fill={isFollowing ? "currentColor" : "none"} />
              {isFollowing ? "Takipte" : "Takibe Al"}
            </button>
            <Link href="/network" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-4 text-sm font-black text-white">
              <Share2 size={18} /> Paylaş
            </Link>
            <Link href="/crm" className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
              <UsersRound size={18} /> CRM
            </Link>
            <Link href="/messages" className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
              <MessageCircle size={18} /> Mesaj
            </Link>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
              <div className="relative flex min-h-[310px] items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 text-center text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.35),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,.20),transparent_28%)]" />
                <div className="relative">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/10 backdrop-blur">
                    <Building2 size={42} />
                  </div>
                  <h2 className="mt-5 text-3xl font-black">{unit.project?.name || "EPH Portföy"}</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-white/70">
                    Fotoğraf modülü eklenene kadar bu alan profesyonel ilan vitrini olarak çalışır.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={<WalletCards size={22} />} label="Fiyat" value={formatMoney(unit.price)} tone="blue" />
                <MetricCard icon={<Home size={22} />} label="Oda / Plan" value={unit.roomCount || "—"} tone="green" />
                <MetricCard icon={<Sparkles size={22} />} label="Alan" value={unit.area ? `${unit.area} m²` : "—"} tone="amber" />
                <MetricCard icon={<TrendingUp size={22} />} label="m² Değeri" value={calculatedSquareMeterPrice} tone="slate" />
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle icon={<FileText size={21} />} title="İlan Açıklaması" description="Portföy hakkında girilen açıklama ve iç notlar" />
              <div className="mt-4 rounded-[24px] bg-[#F8FAFC] p-5 text-center text-sm font-semibold leading-7 text-slate-600">
                {unit.description || "Bu ilan için henüz açıklama girilmemiş. Açıklama alanı; manzara, cephe, kullanım durumu, teslim bilgisi ve özel portföy notları için kullanılabilir."}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle icon={<ShieldCheck size={21} />} title="Doğrulama ve Güven" description="Tapu, fotoğraf ve yetki kontrolleri" />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {verificationItems.map((item) => <VerificationCard key={item.label} {...item} />)}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle icon={<CalendarDays size={21} />} title="İlan Geçmişi" description="Bu alan ilan operasyon kayıtları için hazırlandı" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <TimelineCard title="İlan oluşturuldu" description="Portföy stok sistemine eklendi." date={formatDate(unit.createdAt)} />
                <TimelineCard title="Son güncelleme" description="İlan bilgileri son kez işlendi." date={formatDate(unit.updatedAt || unit.createdAt)} />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#0B1F44]">Proje Bilgileri</h2>
              <div className="mt-4 space-y-3 text-left">
                <InfoRow label="Proje" value={unit.project?.name || "—"} />
                <InfoRow label="Şehir" value={unit.project?.city || "—"} />
                <InfoRow label="İlçe" value={unit.project?.district || "—"} />
                <InfoRow label="Adres" value={unit.project?.address || "—"} />
                <InfoRow label="Bağımsız Bölüm No" value={unit.number || "—"} />
                <InfoRow label="Kat" value={unit.floor != null ? String(unit.floor) : "—"} />
                <InfoRow label="Mülk Tipi" value={typeLabel(unit.type)} />
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CircleUserRound size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#0B1F44]">Portföy Sahibi</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{ownerName || "Kullanıcı bilgisi yok"}</p>
              {unit.project?.owner?.role && <span className="mt-3 inline-flex rounded-full bg-[#F8FAFC] px-3 py-2 text-xs font-black text-slate-500">{unit.project.owner.role}</span>}
              <div className="mt-4 grid gap-2">
                <Link href="/messages" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-black text-white"><MessageCircle size={18} /> Mesaj Gönder</Link>
                <Link href="/network" className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"><Share2 size={18} /> Network’te Paylaş</Link>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Star size={25} /></div>
              <h2 className="mt-4 text-xl font-black text-[#0B1F44]">Takip Bilgisi</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Bu ilk sürümde takip bilgisi cihaz bazlı tutulur. Backend takip listesi eklendiğinde burada takip eden kullanıcılar görünecek.
              </p>
              <button onClick={toggleFollow} className={`mt-4 h-12 w-full rounded-2xl text-sm font-black ${isFollowing ? "bg-amber-100 text-amber-700" : "bg-[#0B1F44] text-white"}`}>
                {isFollowing ? "Takipten Çıkar" : "İlanı Takibe Al"}
              </button>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <SectionTitle centered icon={<Phone size={21} />} title="Hızlı Aksiyon" description="Bu ilanı iş akışına bağla" />
              <div className="mt-4 grid gap-2">
                <Link href="/crm" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">CRM’e Müşteri Ekle</Link>
                <Link href="/network" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Portföy Talebi Oluştur</Link>
              </div>
            </section>
          </aside>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem active href="/stok" icon={<Building2 size={21} />} label="Stok" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Network" />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem href="/profil" icon={<CircleUserRound size={21} />} label="Profil" />
        </div>
      </nav>
    </main>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "blue" | "green" | "amber" | "slate" }) {
  const styles = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center"><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${styles[tone]}`}>{icon}</div><p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-base font-black text-[#0B1F44]">{value}</p></div>;
}

function SectionTitle({ icon, title, description, centered }: { icon: ReactNode; title: string; description: string; centered?: boolean }) {
  return <div className={centered ? "text-center" : "text-center md:text-left"}><div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ${centered ? "" : "md:mx-0"}`}>{icon}</div><h2 className="text-xl font-black text-[#0B1F44]">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p></div>;
}

function VerificationCard({ label, active, description }: { label: string; active: boolean; description: string }) {
  return <div className={`rounded-[24px] border p-4 text-center ${active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-[#F8FAFC]"}`}><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-white text-emerald-700" : "bg-white text-slate-400"}`}>{active ? <CheckCircle2 size={24} /> : <BadgeCheck size={24} />}</div><h3 className={`mt-3 text-sm font-black ${active ? "text-emerald-800" : "text-slate-600"}`}>{label}</h3><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p><p className={`mt-3 text-[10px] font-black uppercase tracking-wide ${active ? "text-emerald-700" : "text-slate-400"}`}>{active ? "Doğrulandı" : "Bekliyor"}</p></div>;
}

function TimelineCard({ title, description, date }: { title: string; description: string; date: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4 text-center md:text-left"><p className="text-[11px] font-black uppercase tracking-wide text-blue-700">{date}</p><h3 className="mt-2 text-sm font-black text-[#0B1F44]">{title}</h3><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3"><span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span><span className="text-right text-sm font-black text-[#0B1F44]">{value}</span></div>;
}

function BottomItem({ icon, label, active, href }: { icon: ReactNode; label: string; active?: boolean; href: string }) {
  return <Link href={href} className={`flex w-16 flex-col items-center gap-1 ${active ? "text-[#1D4ED8]" : "text-slate-500"}`}>{icon}<span className="text-[11px] font-bold">{label}</span></Link>;
}
