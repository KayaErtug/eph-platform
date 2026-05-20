"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import StokStyles from "@/components/stok/StokStyles";
import StokCreateModal from "@/components/stok/StokCreateModal";
import StokProjectCard from "@/components/stok/StokProjectCard";
import StokUnitRow from "@/components/stok/StokUnitRow";
import type { Project, ProjectForm, Unit, UnitForm } from "@/components/stok/stokTypes";
import { STATUS_GROUPS, STATUS_LABELS, TYPE_LABELS } from "@/components/stok/stokConstants";

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [linaOpen, setLinaOpen] = useState(false);
  const [view, setView] = useState<"projects" | "units">("projects");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectForm>({ name: "", city: "Denizli", district: "", address: "" });
  const [unitForm, setUnitForm] = useState<UnitForm>({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const canAddUnit = user?.role === "MUTEAHHIT" || user?.role === "INSAAT_FIRMASI" || user?.role === "ADMIN" || user?.role === "EMLAKCI";

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
      const [projectsResponse, unitsResponse] = await Promise.all([api.get("/projects"), api.get("/units")]);
      setProjects(projectsResponse.data);
      setUnits(unitsResponse.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);
    const response = await api.get(`/units?${params.toString()}`);
    setUnits(response.data);
  };

  const generateAiDescription = async () => {
    setAiLoading(true);
    setAiResult("");
    try {
      const prompt = `Bir emlak ilani icin kisa ve profesyonel Turkce aciklama yaz. Bilgiler: Tip: ${TYPE_LABELS[unitForm.type] || unitForm.type}, Oda: ${unitForm.roomCount}, Alan: ${unitForm.area}m2, Kat: ${unitForm.floor}, Durum: ${STATUS_LABELS[unitForm.status]}, Sehir: ${projectForm.city}, Ilce: ${projectForm.district}. Maksimum 3 cumle.`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      setAiResult(data.reply || "Aciklama olusturulamadi.");
    } catch {
      setAiResult("Baglanti hatasi.");
    } finally {
      setAiLoading(false);
    }
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
        const projectResponse = await api.post("/projects", projectForm);
        projectId = projectResponse.data.id;
      }

      if (!unitForm.number || !unitForm.area || !unitForm.price) {
        setFormError("Birim numarasi, alan ve fiyat zorunludur.");
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
        setFormSuccess(false);
        setProjectForm({ name: "", city: "Denizli", district: "", address: "" });
        setUnitForm({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
        setSelectedProjectId("");
        setAiResult("");
      }, 1500);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata olustu.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StokStyles />
        <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const totalSatilik = units.filter((u) => ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"].includes(u.status)).length;
  const totalKiralik = units.filter((u) => ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"].includes(u.status)).length;
  const totalRezerve = units.filter((u) => u.status === "REZERVE").length;
  const myProjects = projects.filter((p) => p.owner?.role === user?.role || user?.role === "ADMIN");

  return (
    <>
      <StokStyles />

      {showModal && (
        <StokCreateModal
          myProjects={myProjects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          unitForm={unitForm}
          setUnitForm={setUnitForm}
          formSuccess={formSuccess}
          formError={formError}
          formLoading={formLoading}
          aiLoading={aiLoading}
          aiResult={aiResult}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          onGenerateAiDescription={generateAiDescription}
        />
      )}

      <nav className="st-nav">
        <a href="/dashboard" className="st-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="st-logo-text">EPH Platform</div>
            <div className="st-logo-sub">Emlak Portfoy Havuzu</div>
          </div>
        </a>
        <div className="st-nav-links">
          <Link href="/dashboard" className="st-nav-item">Ana Sayfa</Link>
          <Link href="/profil" className="st-nav-item">Profilim</Link>
          <Link href="/stok" className="st-nav-item active">Stok</Link>
          <Link href="/crm" className="st-nav-item">CRM</Link>
          <Link href="/market" className="st-nav-item">Piyasa</Link>
          {user?.role === "ADMIN" && <Link href="/admin" className="st-nav-item">Admin</Link>}
        </div>
        <div className="st-nav-right">
          <button className="st-logout" onClick={() => { logout(); router.push("/giris"); }}>Cikis</button>
        </div>
      </nav>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="st-main">
        <div className="st-header">
          <div>
            <h1 className="st-title">Stok<br /><em>Yonetimi</em></h1>
            <p className="st-sub">Proje ve daire portfoyunuzu yonetin</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>{projects.length} proje · {units.length} birim</div>
            {canAddUnit && (
              <button className="st-add-btn" onClick={() => { setShowModal(true); setFormError(""); setAiResult(""); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "relative", zIndex: 1 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>Ilan Ekle</span>
              </button>
            )}
          </div>
        </div>

        <div className="st-stats">
          {[
            { label: "Toplam Proje", val: projects.length, cls: "" },
            { label: "Satis Ilanlari", val: totalSatilik, cls: "green" },
            { label: "Kiralik Ilanlar", val: totalKiralik, cls: "blue" },
            { label: "Rezerve", val: totalRezerve, cls: "gold" },
          ].map((s) => (
            <div key={s.label} className="st-stat">
              <div className="st-stat-label">{s.label}</div>
              <div className={`st-stat-num ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="st-tabs">
          <button className={`st-tab ${view === "projects" ? "active" : ""}`} onClick={() => setView("projects")}>Projeler</button>
          <button className={`st-tab ${view === "units" ? "active" : ""}`} onClick={() => setView("units")}>Tum Birimler</button>
        </div>

        {view === "projects" && (
          <div>
            {projects.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Henuz proje eklenmemis</div>
                <div className="st-empty-sub">{canAddUnit ? "Sag ustteki Ilan Ekle butonuna tiklayin" : "Portfoyunuzu olusturmaya baslayin"}</div>
              </div>
            ) : (
              projects.map((project) => <StokProjectCard key={project.id} project={project} />)
            )}
          </div>
        )}

        {view === "units" && (
          <div>
            <div className="st-filters">
              <div className="st-filter-wrap">
                <label>Durum</label>
                <select className="st-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Tum Durumlar</option>
                  {STATUS_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="st-filter-wrap">
                <label>Sehir</label>
                <input className="st-filter-input" placeholder="Sehir ara..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
              </div>
            </div>

            {units.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Birim bulunamadi</div>
                <div className="st-empty-sub">Filtre kriterlerinizi degistirmeyi deneyin</div>
              </div>
            ) : (
              <div className="st-all-units">
                {units.map((unit) => <StokUnitRow key={unit.id} unit={unit} />)}
              </div>
            )}
          </div>
        )}
      </main>

      <button
        onClick={() => setLinaOpen(true)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          zIndex: 1000,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#1A3C5E,#C9A84C)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          fontSize: 28,
        }}
        title="Lina AI ile stok ekle"
      >🤖</button>
    </>
  );
}
