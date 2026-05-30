"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import StokPremiumStyles from "@/components/stok/StokPremiumStyles";
import StokKpiCards from "@/components/stok/StokKpiCards";
import StokToolbar from "@/components/stok/StokToolbar";
import StokTable from "@/components/stok/StokTable";
import StokCreateModal from "@/components/stok/StokCreateModal";
import type {
  Project,
  ProjectFormState,
  Unit,
  UnitFormState,
} from "@/components/stok/stokTypes";

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linaOpen, setLinaOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: "",
    city: "Denizli",
    district: "",
    address: "",
  });

  const [unitForm, setUnitForm] = useState<UnitFormState>({
    type: "DAIRE",
    floor: "",
    number: "",
    roomCount: "3+1",
    area: "",
    price: "",
    status: "SATILIK",
    description: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "ADMIN" ||
    user?.role === "EMLAKCI";

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

  useEffect(() => {
    if (!hydrated || !user) return;

    fetchUnits();
  }, [statusFilter, cityFilter]);

  const fetchData = async () => {
    try {
      const [projectRes, unitRes] = await Promise.all([
        api.get("/projects"),
        api.get("/units"),
      ]);

      setProjects(projectRes.data || []);
      setUnits(unitRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);

    const res = await api.get(`/units?${params.toString()}`);

    setUnits(res.data || []);
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    if (!q) return units;

    return units.filter((unit) => {
      const text = [
        unit.project?.name,
        unit.project?.city,
        unit.project?.district,
        unit.project?.address,
        unit.number,
        unit.type,
        unit.status,
        unit.roomCount,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return text.includes(q);
    });
  }, [units, search]);

  const myProjects = user?.role === "ADMIN" ? projects : [];

  // Not: Emlakçı/Müteahhit kendi projesini yeni kayıt olarak açabilir.
  // Rol bazlı proje filtreleme, aynı role sahip başka kullanıcının projesini seçtirip
  // /units/project/:id endpointinde 403 Forbidden hatasına yol açıyordu.

  const resetForm = () => {
    setSelectedProjectId("");

    setProjectForm({
      name: "",
      city: "Denizli",
      district: "",
      address: "",
    });

    setUnitForm({
      type: "DAIRE",
      floor: "",
      number: "",
      roomCount: "3+1",
      area: "",
      price: "",
      status: "SATILIK",
      description: "",
    });

    setFormError("");
    setFormSuccess(false);
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (
          !projectForm.name ||
          !projectForm.city ||
          !projectForm.district ||
          !projectForm.address
        ) {
          setFormError("Proje bilgilerini eksiksiz doldurun.");
          setFormLoading(false);
          return;
        }

        const projectRes = await api.post("/projects", projectForm);

        projectId = projectRes.data.id;
      }

      if (!unitForm.number || !unitForm.area || !unitForm.price) {
        setFormError("Birim numarası, alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      await api.post(`/units/project/${projectId}`, {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        number: unitForm.number,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: parseFloat(unitForm.price),
        status: unitForm.status,
        description: unitForm.description || undefined,
      });

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdminVerify = async (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => {
    try {
      await api.patch(`/units/${unitId}/verify`, payload);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Doğrulama işlemi yapılamadı.");
    }
  };

  if (!hydrated || loading) {
    return (
      <div
        className="stock-page-v2"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <StokPremiumStyles />

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid #1D4ED8",
            borderTopColor: "transparent",
            animation: "spin .8s linear infinite",
          }}
        />

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (user?.role === "ADMIN") {
    return (
      <>
        <AdminInventoryCommandCenter
          units={filteredUnits}
          allUnits={units}
          projects={projects}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          onBack={() => router.push("/dashboard")}
          onLogout={() => {
            logout();
            router.push("/giris");
          }}
          onAdd={() => {
            resetForm();
            setShowModal(true);
          }}
          onLina={() => setLinaOpen(true)}
          onVerify={handleAdminVerify}
        />
        <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />
        <StokCreateModal
          open={showModal}
          onClose={() => setShowModal(false)}
          projects={myProjects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          unitForm={unitForm}
          setUnitForm={setUnitForm}
          formError={formError}
          formSuccess={formSuccess}
          formLoading={formLoading}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  return (
    <div className="stock-page-v2">
      <StokPremiumStyles />

      <header className="stock-appbar-v2">
        <Link href="/dashboard" className="stock-brand-v2">
          <img src="/LOGO_EPH.png" alt="EPH" />

          <div>
            <div className="stock-brand-name">EPH Platform</div>
            <div className="stock-brand-sub">Emlak Portföy Havuzu</div>
          </div>
        </Link>

        <nav className="stock-nav-v2">
          <Link href="/dashboard">Ana Sayfa</Link>

          <Link href="/stok" className="active">
            Stok
          </Link>

          <Link href="/network">Network</Link>

          <Link href="/crm">CRM</Link>

          <Link href="/market">Piyasa</Link>

          <Link href="/profil">Profil</Link>

          {user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        </nav>

        <button
          className="stock-logout-v2"
          onClick={() => {
            logout();
            router.push("/giris");
          }}
        >
          Çıkış
        </button>
      </header>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="stock-main-v2">
        <section className="stock-hero-v2">
          <div className="stock-hero-left-v2">
            <div className="stock-section-kicker">Portföy Yönetimi</div>

            <h1>Stok ve İlanlar</h1>

            <p>
              Proje, bağımsız bölüm ve portföy kayıtlarını tek ekrandan
              yönetin.
            </p>
          </div>

          <div className="stock-hero-card-v2">
            <span>Aktif Kullanıcı</span>

            <strong>
              {user?.firstName || "EPH"} {user?.lastName || ""}
            </strong>
          </div>
        </section>

        <StokKpiCards units={units} projects={projects} />

        <section className="stock-panel-v2">
          <StokToolbar
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            visibleCount={filteredUnits.length}
            totalCount={units.length}
            onAdd={() => {
              resetForm();
              setShowModal(true);
            }}
            onLina={() => setLinaOpen(true)}
            canAddUnit={canAddUnit}
          />

          <StokTable units={filteredUnits} />
        </section>
      </main>

      <StokCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projects={myProjects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        unitForm={unitForm}
        setUnitForm={setUnitForm}
        formError={formError}
        formSuccess={formSuccess}
        formLoading={formLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function AdminInventoryCommandCenter({
  units,
  allUnits,
  projects,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  onBack,
  onLogout,
  onAdd,
  onLina,
  onVerify,
}: {
  units: Unit[];
  allUnits: Unit[];
  projects: Project[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  cityFilter: string;
  setCityFilter: (value: string) => void;
  onBack: () => void;
  onLogout: () => void;
  onAdd: () => void;
  onLina: () => void;
  onVerify: (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => void;
}) {
  const totalValue = allUnits.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0);
  const verifiedUnits = allUnits.filter((unit) => unit.isVerified).length;
  const offMarketUnits = allUnits.filter((unit) => unit.isOffMarket).length;
  const unverifiedUnits = allUnits.filter((unit) => !unit.isVerified).length;
  const hotUnits = allUnits.filter((unit) => ["SATILIK", "KIRALIK", "ON_SATIS", "PROJE_ASAMASI", "YAKINDA_SATISTA", "INSAAT_PROJESI", "HEMEN_TESLIM"].includes(unit.status)).length;

  const cityCounts = allUnits.reduce<Record<string, number>>((acc, unit) => {
    const city = unit.project?.city || "Bilinmeyen";
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(201,168,76,0.22),transparent_28%),radial-gradient(circle_at_50%_92%,rgba(59,130,246,0.22),transparent_36%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:46px_46px]" />

      <header className="sticky top-0 z-50 border-b border-cyan-300/15 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 text-cyan-100 transition hover:border-[#C9A84C] hover:text-[#F7DFA3]">←</button>
            <Link href="/dashboard" className="flex items-center gap-3 no-underline">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-xl" />
                <img src="/LOGO_EPH.png" alt="EPH" className="relative h-11 w-11 object-contain" />
              </div>
              <div>
                <div className="font-serif text-xl font-semibold text-white">EPH Inventory Core</div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">Admin Command Layer</div>
              </div>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            {[["/dashboard","Mission"],["/admin","Admin"],["/network","Network"],["/crm","CRM"],["/market","Piyasa"],["/profil","Profil"]].map(([href,label]) => (
              <Link key={href} href={href} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 no-underline transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white">{label}</Link>
            ))}
            <button onClick={onLogout} className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 transition hover:bg-rose-500/20">Çıkış</button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8 pb-24">
        <section className="relative overflow-hidden rounded-[44px] border border-cyan-300/20 bg-[#061126]/90 p-6 shadow-2xl shadow-cyan-950/50 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(201,168,76,0.22),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(29,78,216,0.30),transparent_38%)]" />
          <div className="absolute left-8 top-8 h-40 w-40 rounded-full border border-cyan-300/10" />
          <div className="absolute right-8 top-10 h-28 w-28 rounded-full border border-[#C9A84C]/10" />

          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">◉ Inventory Mission Control</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />Sistem Aktif</span>
              </div>
              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">Portföy<span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">Komuta Merkezi</span></h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">Tüm stok akışı, proje yoğunluğu, doğrulama sinyalleri ve off-market fırsatları admin katmanında izlenir. Admin kullanıcı operasyonu yönetir; bireysel kullanıcı panelinden ayrıdır.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <AdminSignal title="Toplam Değer" value={totalValue ? `${(totalValue / 1000000).toFixed(1)}M ₺` : "0 ₺"} />
                <AdminSignal title="Riskli / Onaysız" value={String(unverifiedUnits)} />
                <AdminSignal title="Sıcak Stok" value={String(hotUnits)} />
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button onClick={onAdd} className="rounded-2xl bg-[#C9A84C] px-5 py-3 text-sm font-black text-[#061126] shadow-xl shadow-[#C9A84C]/20 transition hover:scale-[1.02]">+ Yeni Stok Kaydı</button>
                <button onClick={onLina} className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15">Lina AI Analiz</button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[34px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">Radar Sinyalleri</p><h2 className="mt-2 text-2xl font-black text-white">Portföy Sağlığı</h2></div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]">⌁</div>
                </div>
                <div className="mt-5 grid gap-3">
                  <RadarLine label="Doğrulanmış Envanter" value={verifiedUnits} total={Math.max(allUnits.length, 1)} tone="cyan" />
                  <RadarLine label="Off-Market Sinyali" value={offMarketUnits} total={Math.max(allUnits.length, 1)} tone="gold" />
                  <RadarLine label="Onay Bekleyen Stok" value={unverifiedUnits} total={Math.max(allUnits.length, 1)} tone="rose" />
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">Bölgesel Isı Haritası</p>
                <div className="mt-4 grid gap-2">
                  {topCities.length > 0 ? topCities.map(([city,count]) => (
                    <div key={city} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"><span className="text-sm font-bold text-slate-200">{city}</span><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{count} kayıt</span></div>
                  )) : <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-400">Henüz bölgesel veri yok.</div>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Toplam Stok" value={allUnits.length} note="Canlı envanter" tone="cyan" />
          <AdminMetric label="Proje Sayısı" value={projects.length} note="Aktif proje ağı" tone="gold" />
          <AdminMetric label="Doğrulanmış" value={verifiedUnits} note="Güvenli portföy" tone="green" />
          <AdminMetric label="Off-Market" value={offMarketUnits} note="Gizli fırsatlar" tone="violet" />
        </section>

        <section className="mt-6 rounded-[34px] border border-cyan-300/15 bg-[#061126]/85 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">Inventory Grid</p><h2 className="mt-2 font-serif text-3xl font-semibold text-white">Canlı Portföy Radarı</h2></div>
            <div className="flex flex-col gap-2 lg:flex-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Proje, şehir, no veya durum ara..." className="h-12 min-w-[260px] rounded-2xl border border-cyan-300/15 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-2xl border border-cyan-300/15 bg-[#08172D] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300/40">
                <option value="">Tüm Durumlar</option><option value="SATILIK">Satılık</option><option value="KIRALIK">Kiralık</option><option value="ON_SATIS">Ön Satış</option><option value="PROJE_ASAMASI">Proje Aşaması</option><option value="YAKINDA_SATISTA">Yakında Satışta</option><option value="INSAAT_HALINDE">İnşaat Halinde</option><option value="HEMEN_TESLIM">Hemen Teslim</option><option value="INSAAT_PROJESI">İnşaat Projesi</option><option value="SATILDI">Satıldı</option><option value="PASIF">Pasif</option>
              </select>
              <input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Şehir filtrele" className="h-12 rounded-2xl border border-cyan-300/15 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {units.length === 0 ? <div className="rounded-[28px] border border-dashed border-cyan-300/20 bg-white/[0.04] p-10 text-center text-sm font-bold text-slate-400 xl:col-span-2">Portföy kaydı bulunamadı.</div> : units.slice(0, 24).map((unit) => (
                <AdminUnitCard key={unit.id} unit={unit} onVerify={onVerify} />
              ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function AdminSignal({ title, value }: { title: string; value: string }) {
  return <div className="rounded-[24px] border border-cyan-300/15 bg-white/[0.07] p-4 backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{title}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>;
}

function RadarLine({ label, value, total, tone }: { label: string; value: number; total: number; tone: "cyan" | "gold" | "rose" }) {
  const width = Math.min(100, Math.round((value / total) * 100));
  const bar = tone === "gold" ? "bg-[#C9A84C]" : tone === "rose" ? "bg-rose-400" : "bg-cyan-300";
  return <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4"><div className="mb-3 flex items-center justify-between gap-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{label}</span><span className="text-sm font-black text-white">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} /></div></div>;
}

function AdminMetric({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) {
  const colors: Record<string, string> = { cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100", gold: "border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]", green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100", violet: "border-violet-300/20 bg-violet-400/10 text-violet-100" };
  return <div className={`rounded-[30px] border p-5 shadow-xl shadow-black/20 ${colors[tone] || colors.cyan}`}><p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">{label}</p><p className="mt-3 font-serif text-5xl font-semibold">{value}</p><p className="mt-3 text-xs font-bold opacity-70">{note}</p></div>;
}

function AdminUnitCard({
  unit,
  onVerify,
}: {
  unit: Unit;
  onVerify: (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => void;
}) {
  const verified = unit.isVerified || (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified);
  const price = Number(unit.price || 0);

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-white/[0.06] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.09]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {unit.status || "Durum Yok"}
            </span>

            {unit.isOffMarket && (
              <span className="rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F7DFA3]">
                Off-Market
              </span>
            )}

            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                verified
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-300/25 bg-rose-400/10 text-rose-100"
              }`}
            >
              {verified ? "Doğrulandı" : "Kontrol"}
            </span>
          </div>

          <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
            {unit.project?.name || "EPH Portföy"}
          </h3>

          <p className="mt-1 text-sm font-semibold text-slate-400">
            {[unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") || "Konum yok"} · No {unit.number || "—"}
          </p>
        </div>

        <div className="rounded-[22px] border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-5 py-4 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F7DFA3]/70">
            Değer
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#F7DFA3]">
            {price ? `${price.toLocaleString("tr-TR")} ₺` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <AdminUnitMini label="Tip" value={unit.type || "—"} />
        <AdminUnitMini label="Oda" value={unit.roomCount || "—"} />
        <AdminUnitMini label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
        <AdminUnitMini label="Kat" value={unit.floor != null ? String(unit.floor) : "—"} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <AdminCheck label="Tapu" active={Boolean(unit.tapuVerified)} />
        <AdminCheck label="Fotoğraf" active={Boolean(unit.photoVerified)} />
        <AdminCheck label="Yetki" active={Boolean(unit.yetkiVerified)} />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9A84C]">
          Admin Doğrulama
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: !unit.tapuVerified,
                photoVerified: unit.photoVerified,
                yetkiVerified: unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl border px-4 py-3 text-xs font-black transition ${
              unit.tapuVerified
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/[0.06] text-slate-300 hover:border-emerald-300/30 hover:text-emerald-100"
            }`}
          >
            {unit.tapuVerified ? "Tapu Onaylı" : "Tapu Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: unit.tapuVerified,
                photoVerified: !unit.photoVerified,
                yetkiVerified: unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl border px-4 py-3 text-xs font-black transition ${
              unit.photoVerified
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/[0.06] text-slate-300 hover:border-emerald-300/30 hover:text-emerald-100"
            }`}
          >
            {unit.photoVerified ? "Fotoğraf Onaylı" : "Fotoğraf Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: unit.tapuVerified,
                photoVerified: unit.photoVerified,
                yetkiVerified: !unit.yetkiVerified,
                isOffMarket: unit.isOffMarket,
              })
            }
            className={`rounded-2xl border px-4 py-3 text-xs font-black transition ${
              unit.yetkiVerified
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/[0.06] text-slate-300 hover:border-emerald-300/30 hover:text-emerald-100"
            }`}
          >
            {unit.yetkiVerified ? "Yetki Onaylı" : "Yetki Onayla"}
          </button>

          <button
            onClick={() =>
              onVerify(unit.id, {
                tapuVerified: true,
                photoVerified: true,
                yetkiVerified: true,
                isOffMarket: unit.isOffMarket,
              })
            }
            className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C] px-4 py-3 text-xs font-black text-[#061126] transition hover:scale-[1.02]"
          >
            Tümünü Doğrula
          </button>
        </div>
      </div>
    </article>
  );
}


function AdminUnitMini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-1 text-sm font-black text-slate-100">{value}</p></div>;
}

function AdminCheck({ label, active }: { label: string; active: boolean }) {
  return <div className={`rounded-2xl border px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] ${active ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-rose-300/25 bg-rose-400/10 text-rose-100"}`}>{active ? "✓" : "!"} {label}</div>;
}
