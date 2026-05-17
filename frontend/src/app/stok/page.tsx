"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Unit {
  id: string; type: string; floor?: number; number: string;
  roomCount?: string; area?: number; price: number; status: string; description?: string;
  isVerified?: boolean; isOffMarket?: boolean;
  tapuVerified?: boolean; photoVerified?: boolean; yetkiVerified?: boolean;
  project: { id: string; name: string; city: string; district: string; address: string; owner: { firstName: string; lastName: string } };
}
interface Project {
  id: string; name: string; city: string; district: string; address: string; isActive: boolean;
  owner: { firstName: string; lastName: string; role: string };
  units: Unit[]; _count: { units: number };
}

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık", KIRALIK: "Kiralık", GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık", DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi", KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve", SATILDI: "Satıldı", KIRALANDII: "Kiralandı", PASIF: "Pasif",
};
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  SATILIK:        { color: "#2D6A4F", bg: "#F0FAF4" },
  KIRALIK:        { color: "#1A4A7A", bg: "#EEF4FF" },
  GUNLUK_KIRALIK: { color: "#1A4A7A", bg: "#EEF4FF" },
  DEVREN_SATILIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  DEVREN_KIRALIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  INSAAT_PROJESI: { color: "#B8560B", bg: "#FFF5ED" },
  KAT_KARSILIGI:  { color: "#B8860B", bg: "#FFFBF0" },
  REZERVE:        { color: "#B8860B", bg: "#FFFBF0" },
  SATILDI:        { color: "#8A8A8A", bg: "#F5F5F5" },
  KIRALANDII:     { color: "#8A8A8A", bg: "#F5F5F5" },
  PASIF:          { color: "#8A8A8A", bg: "#F5F5F5" },
};
const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", REZIDANS: "Rezidans", MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı", CIFTLIK_EVI: "Çiftlik Evi", PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza", OFIS_BURO: "Ofis/Büro", PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo", FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon", DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa", TARLA: "Tarla", BAHCE: "Bahçe", ZEYTINLIK: "Zeytinlik",
  ADA: "Ada", DEVRE_MULK: "Devre Mülk", TURISTIK_TESIS: "Turistik Tesis",
};
const STATUS_GROUPS = [
  { label: "Satış", statuses: ["SATILIK","DEVREN_SATILIK","INSAAT_PROJESI","KAT_KARSILIGI"] },
  { label: "Kiralık", statuses: ["KIRALIK","GUNLUK_KIRALIK","DEVREN_KIRALIK"] },
  { label: "Diğer", statuses: ["REZERVE","SATILDI","KIRALANDII","PASIF"] },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
  --text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}

.st-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.st-nav{padding:0 20px;}}
.st-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.st-logo img{width:34px;height:34px;object-fit:contain;}
.st-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.st-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.st-nav-links{display:flex;align-items:center;gap:4px;}
.st-nav-item{padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.st-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.st-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.st-nav-right{display:flex;align-items:center;gap:10px;}
.st-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.st-logout:hover{border-color:var(--navy);color:var(--navy);}

.st-main{max-width:1200px;margin:0 auto;padding:56px 48px 100px;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.st-main{padding:32px 20px;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}

.st-header{margin-bottom:48px;padding-bottom:40px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px;}
@media(max-width:768px){.st-header{grid-template-columns:1fr;}}
.st-title{font-family:var(--serif);font-size:clamp(36px,4vw,52px);font-weight:300;color:var(--navy);letter-spacing:-0.5px;line-height:1.1;}
.st-title em{font-style:italic;color:var(--gold);}
.st-sub{font-size:13px;color:var(--muted);margin-top:8px;font-weight:300;}

.st-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:40px;}
@media(max-width:768px){.st-stats{grid-template-columns:1fr 1fr;}}
.st-stat{background:#fff;padding:24px;}
.st-stat-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.st-stat-num{font-family:var(--serif);font-size:36px;font-weight:300;color:var(--navy);line-height:1;}
.st-stat-num.gold{color:var(--gold);}
.st-stat-num.green{color:#2D6A4F;}
.st-stat-num.blue{color:#1A4A7A;}

.st-tabs{display:flex;gap:0;margin-bottom:32px;border-bottom:1px solid var(--border);}
.st-tab{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;position:relative;bottom:-1px;}
.st-tab:hover{color:var(--navy);}
.st-tab.active{color:var(--navy);border-bottom-color:var(--gold);}

.st-filters{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;align-items:flex-end;}
.st-filter-wrap label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.st-select{background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;min-width:180px;}
.st-filter-input{background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;font-weight:300;min-width:160px;}
.st-filter-input::placeholder{color:#C0BAB0;}
.st-filter-input:focus,.st-select:focus{border-bottom-color:var(--navy);}

.st-project{background:#fff;border:1px solid var(--border);margin-bottom:16px;transition:border-color 0.3s;}
.st-project:hover{border-color:var(--navy);}
.st-project-header{padding:28px 32px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;}
.st-project-name{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--navy);margin-bottom:6px;}
.st-project-loc{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);font-weight:300;margin-bottom:4px;}
.st-project-owner{font-size:10px;color:#B8B2A8;font-weight:300;}
.st-project-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.st-active-badge{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:4px 10px;}
.st-unit-count{font-family:var(--serif);font-size:13px;color:var(--muted);font-style:italic;}

.st-units-grid{padding:24px 32px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.st-unit-card{border:1px solid var(--border);padding:16px;transition:all 0.2s;}
.st-unit-card:hover{border-color:var(--navy);background:var(--warm);}
.st-unit-number{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.st-unit-type{font-family:var(--serif);font-size:16px;font-weight:400;color:var(--navy);margin-bottom:4px;}
.st-unit-detail{font-size:10px;color:var(--muted);font-weight:300;margin-bottom:8px;}
.st-unit-price{font-family:var(--serif);font-size:18px;font-weight:400;color:var(--gold);}
.st-unit-status{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:3px 8px;display:inline-block;margin-bottom:8px;}

/* DOĞRULAMA BADGELERİ */
.st-badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}
.st-badge-verified{font-size:7px;letter-spacing:1px;text-transform:uppercase;border:1px solid #2D6A4F;color:#2D6A4F;background:#F0FAF4;padding:2px 7px;display:inline-flex;align-items:center;gap:3px;}
.st-badge-offmarket{font-size:7px;letter-spacing:1px;text-transform:uppercase;border:1px solid var(--navy);color:var(--navy);background:#EEF2FF;padding:2px 7px;display:inline-flex;align-items:center;gap:3px;}

.st-all-units{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;}
@media(max-width:768px){.st-all-units{grid-template-columns:1fr;}}
.st-unit-big{background:#fff;border:1px solid var(--border);padding:24px;transition:border-color 0.3s;}
.st-unit-big:hover{border-color:var(--navy);}
.st-unit-big-project{font-family:var(--serif);font-size:18px;font-weight:400;color:var(--navy);margin-bottom:4px;}
.st-unit-big-loc{font-size:11px;color:var(--muted);font-weight:300;margin-bottom:12px;}
.st-unit-big-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);margin-bottom:14px;}
.st-unit-big-cell{background:#fff;padding:12px;}
.st-unit-big-cell:hover{background:var(--warm);}
.st-unit-big-cell-label{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
.st-unit-big-cell-val{font-size:13px;color:var(--navy);font-weight:400;}
.st-unit-big-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--border);}
.st-unit-big-room{font-size:11px;color:var(--muted);font-weight:300;}
.st-unit-big-price{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--gold);}

.st-empty{background:#fff;border:1px solid var(--border);padding:80px;text-align:center;}
.st-empty-text{font-family:var(--serif);font-size:22px;font-style:italic;color:var(--muted);margin-bottom:6px;}
.st-empty-sub{font-size:12px;color:#B8B2A8;font-weight:300;}
`;

function VerifiedBadges({ u }: { u: Unit }) {
  if (!u.tapuVerified && !u.photoVerified && !u.yetkiVerified && !u.isOffMarket) return null;
  return (
    <div className="st-badges">
      {u.tapuVerified && <span className="st-badge-verified">✓ Tapu</span>}
      {u.photoVerified && <span className="st-badge-verified">✓ Fotoğraf</span>}
      {u.yetkiVerified && <span className="st-badge-verified">✓ Yetki</span>}
      {u.isOffMarket && <span className="st-badge-offmarket">⬤ Off-Market</span>}
    </div>
  );
}

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"projects"|"units">("projects");
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
      const [p, u] = await Promise.all([api.get("/projects"), api.get("/units")]);
      setProjects(p.data); setUnits(u.data);
    } finally { setLoading(false); }
  };
  const fetchUnits = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);
    const r = await api.get(`/units?${params.toString()}`);
    setUnits(r.data);
  };

  if (!hydrated || loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const totalSatilik = units.filter(u => ["SATILIK","DEVREN_SATILIK","INSAAT_PROJESI","KAT_KARSILIGI"].includes(u.status)).length;
  const totalKiralik = units.filter(u => ["KIRALIK","GUNLUK_KIRALIK","DEVREN_KIRALIK"].includes(u.status)).length;
  const totalRezeve = units.filter(u => u.status === "REZERVE").length;
  const getStatusStyle = (s: string) => STATUS_COLORS[s] || { color: "#8A8A8A", bg: "#F5F5F5" };

  return (
    <>
      <style>{CSS}</style>

      <nav className="st-nav">
        <a href="/dashboard" className="st-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="st-logo-text">EPH Platform</div>
            <div className="st-logo-sub">Emlak Portföy Havuzu</div>
          </div>
        </a>
        <div className="st-nav-links">
          <Link href="/dashboard" className="st-nav-item">Ana Sayfa</Link>
          <Link href="/profil" className="st-nav-item">Profilim</Link>
          <Link href="/stok" className="st-nav-item active">Stok</Link>
          {user?.role === "ADMIN" && <Link href="/admin" className="st-nav-item">Admin</Link>}
        </div>
        <div className="st-nav-right">
          <button className="st-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
        </div>
      </nav>

      <main className="st-main">
        <div className="st-header">
          <div>
            <h1 className="st-title">Stok<br /><em>Yönetimi</em></h1>
            <p className="st-sub">Proje ve daire portföyünüzü yönetin</p>
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
            {projects.length} proje · {units.length} birim
          </div>
        </div>

        <div className="st-stats">
          {[
            { label: "Toplam Proje", val: projects.length, cls: "" },
            { label: "Satış İlanları", val: totalSatilik, cls: "green" },
            { label: "Kiralık İlanlar", val: totalKiralik, cls: "blue" },
            { label: "Rezerve", val: totalRezeve, cls: "gold" },
          ].map(s => (
            <div key={s.label} className="st-stat">
              <div className="st-stat-label">{s.label}</div>
              <div className={`st-stat-num ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="st-tabs">
          <button className={`st-tab ${view==="projects"?"active":""}`} onClick={() => setView("projects")}>Projeler</button>
          <button className={`st-tab ${view==="units"?"active":""}`} onClick={() => setView("units")}>Tüm Birimler</button>
        </div>

        {/* PROJELER */}
        {view === "projects" && (
          <div>
            {projects.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Henüz proje eklenmemiş</div>
                <div className="st-empty-sub">Portföyünüzü oluşturmaya başlayın</div>
              </div>
            ) : projects.map(p => {
              const activeStyle = p.isActive ? { color: "#2D6A4F", bg: "#F0FAF4" } : { color: "#8A8A8A", bg: "#F5F5F5" };
              return (
                <div key={p.id} className="st-project">
                  <div className="st-project-header">
                    <div>
                      <div className="st-project-name">{p.name}</div>
                      <div className="st-project-loc">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {p.city} / {p.district} — {p.address}
                      </div>
                      <div className="st-project-owner">{p.owner.firstName} {p.owner.lastName}</div>
                    </div>
                    <div className="st-project-meta">
                      <span className="st-active-badge" style={{ borderColor: activeStyle.color, color: activeStyle.color, background: activeStyle.bg }}>
                        {p.isActive ? "Aktif" : "Pasif"}
                      </span>
                      <span className="st-unit-count">{p._count.units} birim</span>
                    </div>
                  </div>
                  {p.units && p.units.length > 0 && (
                    <div className="st-units-grid">
                      {p.units.map(u => {
                        const ss = getStatusStyle(u.status);
                        return (
                          <div key={u.id} className="st-unit-card">
                            <div className="st-unit-number">No: {u.number}{u.floor ? ` · Kat ${u.floor}` : ""}</div>
                            <span className="st-unit-status" style={{ borderColor: ss.color, color: ss.color, background: ss.bg }}>
                              {STATUS_LABELS[u.status]}
                            </span>
                            <div className="st-unit-type">{TYPE_LABELS[u.type] || u.type}</div>
                            <div className="st-unit-detail">{u.roomCount && `${u.roomCount} · `}{u.area ? `${u.area}m²` : ""}</div>
                            <VerifiedBadges u={u} />
                            <div className="st-unit-price">{u.price.toLocaleString("tr-TR")} ₺</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TÜM BİRİMLER */}
        {view === "units" && (
          <div>
            <div className="st-filters">
              <div className="st-filter-wrap">
                <label>Durum</label>
                <select className="st-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Tüm Durumlar</option>
                  {STATUS_GROUPS.map(g => (
                    <optgroup key={g.label} label={`── ${g.label} ──`}>
                      {g.statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="st-filter-wrap">
                <label>Şehir</label>
                <input className="st-filter-input" placeholder="Şehir ara..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
              </div>
            </div>

            {units.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Birim bulunamadı</div>
                <div className="st-empty-sub">Filtre kriterlerinizi değiştirmeyi deneyin</div>
              </div>
            ) : (
              <div className="st-all-units">
                {units.map(u => {
                  const ss = getStatusStyle(u.status);
                  return (
                    <div key={u.id} className="st-unit-big">
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                        <div>
                          <div className="st-unit-big-project">{u.project?.name}</div>
                          <div className="st-unit-big-loc">{u.project?.city} / {u.project?.district}</div>
                        </div>
                        <span className="st-unit-status" style={{ borderColor: ss.color, color: ss.color, background: ss.bg, flexShrink: 0 }}>
                          {STATUS_LABELS[u.status]}
                        </span>
                      </div>
                      <VerifiedBadges u={u} />
                      <div className="st-unit-big-grid">
                        <div className="st-unit-big-cell">
                          <div className="st-unit-big-cell-label">Tip</div>
                          <div className="st-unit-big-cell-val">{TYPE_LABELS[u.type] || u.type}</div>
                        </div>
                        <div className="st-unit-big-cell">
                          <div className="st-unit-big-cell-label">No / Kat</div>
                          <div className="st-unit-big-cell-val">{u.number} / {u.floor ?? "—"}</div>
                        </div>
                        <div className="st-unit-big-cell">
                          <div className="st-unit-big-cell-label">Alan</div>
                          <div className="st-unit-big-cell-val">{u.area ? `${u.area}m²` : "—"}</div>
                        </div>
                      </div>
                      <div className="st-unit-big-footer">
                        <span className="st-unit-big-room">{u.roomCount || "—"}</span>
                        <span className="st-unit-big-price">{u.price.toLocaleString("tr-TR")} ₺</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}