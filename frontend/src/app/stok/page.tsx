"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Unit {
  id: string;
  type: string;
  floor?: number;
  number: string;
  roomCount?: string;
  area?: number;
  price: number;
  status: string;
  description?: string;
  project: {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    owner: { firstName: string; lastName: string };
  };
}

interface Project {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  isActive: boolean;
  owner: { firstName: string; lastName: string; role: string };
  units: Unit[];
  _count: { units: number };
}

const STATUS_COLORS: Record<string, string> = {
  SATILIK: "bg-green-950 text-green-300 border-green-800",
  KIRALIK: "bg-blue-950 text-blue-300 border-blue-800",
  GUNLUK_KIRALIK: "bg-cyan-950 text-cyan-300 border-cyan-800",
  DEVREN_SATILIK: "bg-purple-950 text-purple-300 border-purple-800",
  DEVREN_KIRALIK: "bg-indigo-950 text-indigo-300 border-indigo-800",
  INSAAT_PROJESI: "bg-orange-950 text-orange-300 border-orange-800",
  KAT_KARSILIGI: "bg-amber-950 text-amber-300 border-amber-800",
  REZERVE: "bg-yellow-950 text-yellow-300 border-yellow-800",
  SATILDI: "bg-red-950 text-red-300 border-red-800",
  KIRALANDII: "bg-gray-800 text-gray-300 border-gray-700",
  PASIF: "bg-gray-800 text-gray-500 border-gray-700",
};

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
  PASIF: "Pasif",
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev", KOSK_YALI: "Köşk/Yalı",
  CIFTLIK_EVI: "Çiftlik Evi", PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza", OFIS_BURO: "Ofis/Büro",
  PLAZA_KATI: "Plaza Katı", DEPO_ANTREPO: "Depo/Antrepo",
  FABRIKA_ATOLYE: "Fabrika/Atölye", OTEL_PANSIYON: "Otel/Pansiyon",
  DUGUN_SALONU: "Düğün Salonu", ARSA: "Arsa", TARLA: "Tarla",
  BAHCE: "Bahçe", ZEYTINLIK: "Zeytinlik", ADA: "Ada",
  DEVRE_MULK: "Devre Mülk", TURISTIK_TESIS: "Turistik Tesis",
};

const STATUS_GROUPS = [
  {
    label: "Satış",
    statuses: ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"],
  },
  {
    label: "Kiralık",
    statuses: ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"],
  },
  {
    label: "Diğer",
    statuses: ["REZERVE", "SATILDI", "KIRALANDII", "PASIF"],
  },
];

export default function StokPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"projects" | "units">("projects");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchData();
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    fetchUnits();
  }, [statusFilter, cityFilter]);

  const fetchData = async () => {
    try {
      const [projRes, unitsRes] = await Promise.all([
        api.get("/projects"),
        api.get("/units"),
      ]);
      setProjects(projRes.data);
      setUnits(unitsRes.data);
    } finally { setLoading(false); }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);
    const res = await api.get(`/units?${params.toString()}`);
    setUnits(res.data);
  };

  if (!hydrated || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  const totalSatilik = units.filter(u => ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"].includes(u.status)).length;
  const totalKiralik = units.filter(u => ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"].includes(u.status)).length;
  const totalRezeve = units.filter(u => u.status === "REZERVE").length;
  const totalSatildi = units.filter(u => ["SATILDI", "KIRALANDII"].includes(u.status)).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-semibold">EPH</span>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Ana Sayfa</Link>
            <Link href="/profil" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Profilim</Link>
            <Link href="/stok" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-800">Stok</Link>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Admin</Link>
            )}
          </nav>

          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-4 py-2 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Stok Yönetimi</h1>
          <p className="text-gray-500 text-sm">Proje ve daire portföyünüzü yönetin</p>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-2">Toplam Proje</p>
            <p className="text-2xl font-semibold text-white">{projects.length}</p>
          </div>
          <div className="bg-gray-900 border border-green-900 rounded-xl p-5">
            <p className="text-green-500 text-xs mb-2">Satış İlanları</p>
            <p className="text-2xl font-semibold text-green-300">{totalSatilik}</p>
          </div>
          <div className="bg-gray-900 border border-blue-900 rounded-xl p-5">
            <p className="text-blue-500 text-xs mb-2">Kiralık İlanlar</p>
            <p className="text-2xl font-semibold text-blue-300">{totalKiralik}</p>
          </div>
          <div className="bg-gray-900 border border-yellow-900 rounded-xl p-5">
            <p className="text-yellow-500 text-xs mb-2">Rezerve</p>
            <p className="text-2xl font-semibold text-yellow-300">{totalRezeve}</p>
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView("projects")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === "projects" ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
            Projeler
          </button>
          <button onClick={() => setView("units")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === "units" ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
            Tüm Birimler
          </button>
        </div>

        {/* Projeler */}
        {view === "projects" && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-sm">Henüz proje eklenmemiş.</p>
              </div>
            ) : projects.map((p) => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">{p.name}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {p.city} / {p.district}
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{p.address}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{p.owner.firstName} {p.owner.lastName}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`text-xs border rounded-full px-3 py-1 ${p.isActive ? "bg-green-950 text-green-300 border-green-800" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {p.isActive ? "Aktif" : "Pasif"}
                    </span>
                    <span className="text-gray-500 text-xs">{p._count.units} birim</span>
                  </div>
                </div>
                {p.units && p.units.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-800">
                    {p.units.map((u) => (
                      <div key={u.id} className="bg-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs">No: {u.number}</span>
                          <span className={`text-xs border rounded-full px-2 py-0.5 ${STATUS_COLORS[u.status]}`}>{STATUS_LABELS[u.status]}</span>
                        </div>
                        <p className="text-white text-sm font-medium">{TYPE_LABELS[u.type]}</p>
                        {u.roomCount && <p className="text-gray-400 text-xs mt-0.5">{u.roomCount} · {u.area}m²</p>}
                        <p className="text-blue-400 text-sm font-semibold mt-2">{u.price.toLocaleString("tr-TR")} ₺</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tüm Birimler */}
        {view === "units" && (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Tüm Durumlar</option>
                {STATUS_GROUPS.map((group) => (
                  <optgroup key={group.label} label={`── ${group.label} ──`}>
                    {group.statuses.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Şehir ara..."
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 flex-1 placeholder-gray-600 min-w-40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.length === 0 ? (
                <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-sm">Birim bulunamadı.</p>
                </div>
              ) : units.map((u) => (
                <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">{u.project?.name}</p>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {u.project?.city} / {u.project?.district}
                      </div>
                    </div>
                    <span className={`text-xs border rounded-full px-3 py-1 ${STATUS_COLORS[u.status]}`}>{STATUS_LABELS[u.status]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-gray-800 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs mb-0.5">Tip</p>
                      <p className="text-white text-xs font-medium">{TYPE_LABELS[u.type]}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs mb-0.5">No / Kat</p>
                      <p className="text-white text-xs font-medium">{u.number} / {u.floor ?? "-"}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs mb-0.5">Alan</p>
                      <p className="text-white text-xs font-medium">{u.area ? `${u.area}m²` : "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    {u.roomCount && <span className="text-gray-400 text-xs">{u.roomCount}</span>}
                    <p className="text-blue-400 font-semibold ml-auto">{u.price.toLocaleString("tr-TR")} ₺</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}