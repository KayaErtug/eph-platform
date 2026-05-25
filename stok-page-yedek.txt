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
import type { Project, ProjectFormState, Unit, UnitFormState } from "@/components/stok/stokTypes";

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
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ name: "", city: "Denizli", district: "", address: "" });
  const [unitForm, setUnitForm] = useState<UnitFormState>({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit = user?.role === "MUTEAHHIT" || user?.role === "INSAAT_FIRMASI" || user?.role === "ADMIN" || user?.role === "EMLAKCI";

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
      const [projectRes, unitRes] = await Promise.all([api.get("/projects"), api.get("/units")]);
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
      const text = [unit.project?.name, unit.project?.city, unit.project?.district, unit.project?.address, unit.number, unit.type, unit.status, unit.roomCount].join(" ").toLocaleLowerCase("tr-TR");
      return text.includes(q);
    });
  }, [units, search]);

  const myProjects = projects.filter((project) => project.owner?.role === user?.role || user?.role === "ADMIN");

  const resetForm = () => {
    setSelectedProjectId("");
    setProjectForm({ name: "", city: "Denizli", district: "", address: "" });
    setUnitForm({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
    setFormError("");
    setFormSuccess(false);
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);
    try {
      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (!projectForm.name || !projectForm.city || !projectForm.district || !projectForm.address) {
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
      setTimeout(() => { setShowModal(false); resetForm(); }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="stock-page-v2" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <StokPremiumStyles />
        <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid #D6B35A", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
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
            <div className="stock-brand-sub">Portföy Havuzu</div>
          </div>
        </Link>

        <nav className="stock-nav-v2">
          <Link href="/dashboard">Ana Sayfa</Link>
          <Link href="/profil">Profilim</Link>
          <Link href="/stok" className="active">Stok</Link>
          <Link href="/crm">CRM</Link>
          <Link href="/market">Piyasa</Link>
          {user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        </nav>

        <button className="stock-logout-v2" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
      </header>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="stock-main-v2">
        <section className="stock-hero-v2">
          <div className="stock-hero-left-v2">
            <div className="stock-section-kicker">Premium Data Table</div>
            <h1>Stok Yönetimi</h1>
            <p>Portföyleri Airtable / Linear tarzında hızlı, temiz ve kurumsal bir tablo üzerinden yönetin. Tüm satır tıklanabilir, filtreler sade, ekran yoğun veri için optimize edildi.</p>
          </div>

          <div className="stock-hero-card-v2">
            <span>Aktif Oturum</span>
            <strong>{user?.firstName || "EPH"} {user?.lastName || ""}</strong>
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
            onAdd={() => { resetForm(); setShowModal(true); }}
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

      <button className="stock-lina-v2" onClick={() => setLinaOpen(true)} title="Lina AI ile stok ekle">🤖</button>
    </div>
  );
}
