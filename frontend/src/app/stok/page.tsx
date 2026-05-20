"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useState } from "react";
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
  isVerified?: boolean;
  isOffMarket?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
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

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  SATILIK: { color: "#0F7A4F", bg: "#ECFDF3", border: "#BCE7CE" },
  KIRALIK: { color: "#175CD3", bg: "#EFF6FF", border: "#BFDBFE" },
  GUNLUK_KIRALIK: { color: "#175CD3", bg: "#EFF6FF", border: "#BFDBFE" },
  DEVREN_SATILIK: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  DEVREN_KIRALIK: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  INSAAT_PROJESI: { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" },
  KAT_KARSILIGI: { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" },
  REZERVE: { color: "#A16207", bg: "#FEFCE8", border: "#FDE68A" },
  SATILDI: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
  KIRALANDII: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
  PASIF: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı",
  CIFTLIK_EVI: "Çiftlik Evi",
  PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
  OFIS_BURO: "Ofis/Büro",
  PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo",
  FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon",
  DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa",
  TARLA: "Tarla",
  BAHCE: "Bahçe",
  ZEYTINLIK: "Zeytinlik",
  ADA: "Ada",
  DEVRE_MULK: "Devre Mülk",
  TURISTIK_TESIS: "Turistik Tesis",
};

const STATUS_GROUPS = [
  { label: "Satış", statuses: ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"] },
  { label: "Kiralık", statuses: ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"] },
  { label: "Diğer", statuses: ["REZERVE", "SATILDI", "KIRALANDII", "PASIF"] },
];

const CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","İçel","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f5f6f8;color:#111827;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{text-decoration:none;color:inherit}
.stock-shell{min-height:100vh;background:radial-gradient(circle at top left,#fff7df 0,#f5f6f8 33%,#eef1f6 100%)}
.stock-topbar{height:72px;background:rgba(255,255,255,.86);backdrop-filter:blur(18px);border-bottom:1px solid rgba(15,23,42,.08);display:flex;align-items:center;justify-content:space-between;padding:0 42px;position:sticky;top:0;z-index:50}
.stock-brand{display:flex;align-items:center;gap:12px}
.stock-brand img{width:38px;height:38px;object-fit:contain}
.stock-brand-title{font-size:17px;font-weight:800;letter-spacing:-.03em;color:#111827}
.stock-brand-sub{font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#b08a2e;margin-top:2px}
.stock-nav{display:flex;align-items:center;gap:6px}
.stock-nav a{font-size:12px;font-weight:700;color:#667085;padding:10px 14px;border-radius:999px;transition:.2s}
.stock-nav a:hover,.stock-nav a.active{background:#111827;color:#fff}
.stock-logout{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;color:#475467;cursor:pointer}
.stock-main{max-width:1320px;margin:0 auto;padding:38px 32px 110px}
.stock-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:24px;margin-bottom:24px}
.stock-hero-card{background:linear-gradient(135deg,#111827 0%,#1f2937 52%,#3b2f17 100%);border:1px solid rgba(255,255,255,.15);border-radius:30px;padding:34px;box-shadow:0 24px 70px rgba(15,23,42,.18);overflow:hidden;position:relative;color:#fff}
.stock-hero-card:before{content:"";position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;background:rgba(201,168,76,.28);filter:blur(8px)}
.stock-eyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#d6b35a;margin-bottom:14px}
.stock-title{font-size:48px;line-height:.96;letter-spacing:-.06em;margin:0;font-weight:900;max-width:620px}
.stock-title span{color:#f4d77a}
.stock-sub{font-size:15px;line-height:1.7;color:rgba(255,255,255,.72);max-width:650px;margin:18px 0 0}
.stock-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.stock-primary,.stock-secondary{border:none;border-radius:16px;padding:14px 18px;font-weight:900;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.stock-primary{background:#f4d77a;color:#111827}
.stock-secondary{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.16)}
.stock-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.stock-kpi{background:rgba(255,255,255,.9);border:1px solid rgba(15,23,42,.08);border-radius:24px;padding:24px;box-shadow:0 14px 40px rgba(15,23,42,.08)}
.stock-kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#98a2b3;font-weight:900}
.stock-kpi-value{font-size:38px;font-weight:950;letter-spacing:-.06em;color:#111827;margin-top:8px}
.stock-kpi-note{font-size:12px;color:#667085;margin-top:4px}
.stock-panel{background:rgba(255,255,255,.92);border:1px solid rgba(15,23,42,.08);border-radius:28px;box-shadow:0 18px 55px rgba(15,23,42,.08);overflow:hidden}
.stock-toolbar{padding:22px;display:flex;align-items:end;justify-content:space-between;gap:16px;border-bottom:1px solid #eef0f3;background:rgba(255,255,255,.7)}
.stock-toolbar-left{display:flex;gap:12px;flex-wrap:wrap;align-items:end}
.stock-field label{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#98a2b3;font-weight:900;margin-bottom:8px}
.stock-input,.stock-select{height:42px;border:1px solid #e4e7ec;background:#fff;border-radius:14px;padding:0 14px;min-width:185px;color:#111827;outline:none;font-weight:700}
.stock-input:focus,.stock-select:focus{border-color:#c9a84c;box-shadow:0 0 0 4px rgba(201,168,76,.13)}
.stock-count-pill{background:#111827;color:#fff;border-radius:999px;padding:11px 15px;font-size:12px;font-weight:900;white-space:nowrap}
.stock-table-wrap{overflow-x:auto}
.stock-table{width:100%;border-collapse:separate;border-spacing:0}
.stock-table thead th{position:sticky;top:72px;background:#fbfcfd;z-index:3;text-align:left;padding:14px 18px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#98a2b3;border-bottom:1px solid #e4e7ec;white-space:nowrap}
.stock-row{display:table-row;transition:.18s}
.stock-row:hover{background:#fffaf0}
.stock-row td{padding:16px 18px;border-bottom:1px solid #eef0f3;vertical-align:middle}
.stock-property{display:flex;align-items:center;gap:14px;min-width:320px}
.stock-thumb{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#fff7df,#f2f4f7);border:1px solid #e8dcc0;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.65)}
.stock-name{font-size:15px;font-weight:950;letter-spacing:-.02em;color:#111827;margin-bottom:5px}
.stock-address{font-size:12px;color:#667085;line-height:1.35}
.stock-meta{display:flex;gap:6px;flex-wrap:wrap}
.stock-tag{display:inline-flex;align-items:center;border:1px solid #e4e7ec;border-radius:999px;background:#fff;padding:6px 9px;font-size:12px;color:#475467;font-weight:800;white-space:nowrap}
.stock-price{font-size:16px;font-weight:950;color:#111827;white-space:nowrap}
.stock-status{display:inline-flex;align-items:center;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:950;white-space:nowrap;border:1px solid}
.stock-owner{font-size:13px;font-weight:900;color:#344054;white-space:nowrap}
.stock-date{font-size:12px;color:#667085;white-space:nowrap}
.stock-open{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:14px;background:#111827;color:#fff;font-weight:950}
.stock-empty{padding:70px 24px;text-align:center}
.stock-empty-title{font-size:24px;font-weight:950;color:#111827;margin-bottom:8px}
.stock-empty-sub{font-size:14px;color:#667085}
.stock-modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.58);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.stock-modal{width:100%;max-width:720px;max-height:90vh;overflow:auto;background:#fff;border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.28)}
.stock-modal-head{padding:24px 28px;border-bottom:1px solid #eef0f3;display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
.stock-modal-title{font-size:26px;font-weight:950;letter-spacing:-.04em;margin:0}
.stock-modal-sub{font-size:13px;color:#667085;margin-top:6px}
.stock-close{width:40px;height:40px;border:none;border-radius:14px;background:#f2f4f7;cursor:pointer;font-size:22px;color:#475467}
.stock-modal-body{padding:26px 28px}
.stock-form-section{margin-bottom:24px}
.stock-section-title{font-size:11px;font-weight:950;letter-spacing:.16em;color:#b08a2e;text-transform:uppercase;margin-bottom:14px}
.stock-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.stock-form-field label{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#667085;font-weight:950;margin-bottom:8px}
.stock-form-field input,.stock-form-field select,.stock-form-field textarea{width:100%;border:1px solid #e4e7ec;border-radius:14px;padding:12px 14px;outline:none;font:inherit;font-weight:700}
.stock-form-field textarea{min-height:100px;resize:vertical}
.stock-full{grid-column:1/-1}
.stock-error{background:#fff1f3;border:1px solid #fecdd6;color:#b42318;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800}
.stock-success{background:#ecfdf3;border:1px solid #bce7ce;color:#067647;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800}
.stock-modal-foot{padding:20px 28px;border-top:1px solid #eef0f3;display:flex;gap:12px}
.stock-save{flex:1;border:none;background:#111827;color:#fff;border-radius:16px;padding:14px 18px;font-size:13px;font-weight:950;cursor:pointer}
.stock-cancel{border:1px solid #e4e7ec;background:#fff;color:#475467;border-radius:16px;padding:14px 18px;font-size:13px;font-weight:950;cursor:pointer}
.stock-lina{position:fixed;right:22px;bottom:82px;z-index:80;width:62px;height:62px;border:none;border-radius:22px;background:linear-gradient(135deg,#111827,#d6b35a);box-shadow:0 18px 44px rgba(15,23,42,.32);font-size:28px;cursor:pointer}
@media(max-width:900px){
  .stock-topbar{display:none}
  .stock-main{padding:22px 14px 100px}
  .stock-hero{grid-template-columns:1fr}
  .stock-title{font-size:38px}
  .stock-kpi-grid{grid-template-columns:1fr 1fr}
  .stock-toolbar{align-items:stretch;flex-direction:column}
  .stock-toolbar-left{display:grid;grid-template-columns:1fr;gap:12px}
  .stock-input,.stock-select{width:100%;min-width:0}
  .stock-table thead{display:none}
  .stock-table,.stock-table tbody,.stock-row,.stock-row td{display:block;width:100%}
  .stock-row{border-bottom:1px solid #eef0f3;padding:14px}
  .stock-row td{border:0;padding:8px 0}
  .stock-property{min-width:0}
  .stock-form-grid{grid-template-columns:1fr}
}
`;

function Spinner() {
  return (
    <div className="stock-shell" style={{ display: "grid", placeItems: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 36, height: 36, border: "3px solid #d6b35a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function statusStyle(status: string) {
  return STATUS_COLORS[status] || { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" };
}

function formatMoney(value?: number) {
  if (value == null) return "-";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

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
  const [projectForm, setProjectForm] = useState({ name: "", city: "Denizli", district: "", address: "" });
  const [unitForm, setUnitForm] = useState({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit = user?.role === "MUTEAHHIT" || user?.role === "INSAAT_FIRMASI" || user?.role === "ADMIN" || user?.role === "EMLAKCI";

  useEffect(() => setHydrated(true), []);

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
      const [p, u] = await Promise.all([api.get("/projects"), api.get("/units")]);
      setProjects(p.data || []);
      setUnits(u.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);
    const r = await api.get(`/units?${params.toString()}`);
    setUnits(r.data || []);
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return units;
    return units.filter((u) => {
      const haystack = [
        u.project?.name,
        u.project?.city,
        u.project?.district,
        u.project?.address,
        u.number,
        TYPE_LABELS[u.type] || u.type,
        STATUS_LABELS[u.status] || u.status,
      ].join(" ").toLocaleLowerCase("tr-TR");
      return haystack.includes(q);
    });
  }, [units, search]);

  const totalSatilik = units.filter((u) => ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"].includes(u.status)).length;
  const totalKiralik = units.filter((u) => ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"].includes(u.status)).length;
  const totalRezerve = units.filter((u) => u.status === "REZERVE").length;
  const portfolioValue = units.reduce((sum, u) => sum + (Number(u.price) || 0), 0);
  const myProjects = projects.filter((p) => p.owner?.role === user?.role || user?.role === "ADMIN");

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
        const pr = await api.post("/projects", projectForm);
        projectId = pr.data.id;
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
        setFormSuccess(false);
        setSelectedProjectId("");
        setProjectForm({ name: "", city: "Denizli", district: "", address: "" });
        setUnitForm({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
      }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!hydrated || loading) return <Spinner />;

  return (
    <div className="stock-shell">
      <style>{CSS}</style>

      <header className="stock-topbar">
        <Link href="/dashboard" className="stock-brand">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="stock-brand-title">EPH Platform</div>
            <div className="stock-brand-sub">Portföy Havuzu</div>
          </div>
        </Link>

        <nav className="stock-nav">
          <Link href="/dashboard">Ana Sayfa</Link>
          <Link href="/profil">Profilim</Link>
          <Link href="/stok" className="active">Stok</Link>
          <Link href="/crm">CRM</Link>
          <Link href="/market">Piyasa</Link>
          {user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        </nav>

        <button className="stock-logout" onClick={() => { logout(); router.push("/giris"); }}>
          Çıkış
        </button>
      </header>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="stock-main">
        <section className="stock-hero">
          <div className="stock-hero-card">
            <div className="stock-eyebrow">Premium Stok Merkezi</div>
            <h1 className="stock-title">
              Portföyü tek ekranda <span>yönet.</span>
            </h1>
            <p className="stock-sub">
              Proje, konum, fiyat, durum ve danışman bilgilerini CRM standardında hızlıca takip edin. Eski kart görünümü kaldırıldı; artık tüm ilan satırı tek parça tıklanabilir.
            </p>
            <div className="stock-hero-actions">
              {canAddUnit && (
                <button className="stock-primary" onClick={() => { setShowModal(true); setFormError(""); }}>
                  + Yeni İlan Ekle
                </button>
              )}
              <button className="stock-secondary" onClick={() => setLinaOpen(true)}>
                🤖 Lina ile Ekle
              </button>
            </div>
          </div>

          <div className="stock-kpi-grid">
            <div className="stock-kpi">
              <div className="stock-kpi-label">Toplam Birim</div>
              <div className="stock-kpi-value">{units.length}</div>
              <div className="stock-kpi-note">{projects.length} proje içinde</div>
            </div>
            <div className="stock-kpi">
              <div className="stock-kpi-label">Satış</div>
              <div className="stock-kpi-value">{totalSatilik}</div>
              <div className="stock-kpi-note">Aktif satış stoğu</div>
            </div>
            <div className="stock-kpi">
              <div className="stock-kpi-label">Kiralık</div>
              <div className="stock-kpi-value">{totalKiralik}</div>
              <div className="stock-kpi-note">Kiralık portföy</div>
            </div>
            <div className="stock-kpi">
              <div className="stock-kpi-label">Portföy Değeri</div>
              <div className="stock-kpi-value" style={{ fontSize: 26 }}>{formatMoney(portfolioValue)}</div>
              <div className="stock-kpi-note">{totalRezerve} rezerve</div>
            </div>
          </div>
        </section>

        <section className="stock-panel">
          <div className="stock-toolbar">
            <div className="stock-toolbar-left">
              <div className="stock-field">
                <label>Arama</label>
                <input className="stock-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Proje, mahalle, no..." />
              </div>

              <div className="stock-field">
                <label>Durum</label>
                <select className="stock-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Tüm Durumlar</option>
                  {STATUS_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="stock-field">
                <label>Şehir</label>
                <input className="stock-input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Denizli" />
              </div>
            </div>

            <div className="stock-count-pill">{filteredUnits.length} ilan listeleniyor</div>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="stock-empty">
              <div className="stock-empty-title">İlan bulunamadı</div>
              <div className="stock-empty-sub">Arama veya filtre kriterlerini değiştirip tekrar deneyin.</div>
            </div>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>İlan</th>
                    <th>Özellikler</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                    <th>Danışman</th>
                    <th>Tarih</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((u) => {
                    const ss = statusStyle(u.status);
                    return (
                      <tr
                        key={u.id}
                        className="stock-row"
                        onClick={() => router.push(`/stok/${u.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="stock-property">
                            <div className="stock-thumb">🏠</div>
                            <div>
                              <div className="stock-name">{u.project?.name || "Proje"} · {TYPE_LABELS[u.type] || u.type}</div>
                              <div className="stock-address">📍 {u.project?.city} / {u.project?.district}{u.project?.address ? ` — ${u.project.address}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="stock-meta">
                            {u.roomCount && <span className="stock-tag">{u.roomCount}</span>}
                            {u.area && <span className="stock-tag">{u.area} m²</span>}
                            {u.floor != null && <span className="stock-tag">Kat {u.floor}</span>}
                            {u.number && <span className="stock-tag">No: {u.number}</span>}
                            {u.tapuVerified && <span className="stock-tag">✓ Tapu</span>}
                            {u.photoVerified && <span className="stock-tag">✓ Foto</span>}
                            {u.yetkiVerified && <span className="stock-tag">✓ Yetki</span>}
                          </div>
                        </td>
                        <td><div className="stock-price">{formatMoney(u.price)}</div></td>
                        <td>
                          <span className="stock-status" style={{ color: ss.color, background: ss.bg, borderColor: ss.border }}>
                            {STATUS_LABELS[u.status] || u.status}
                          </span>
                        </td>
                        <td>
                          <div className="stock-owner">
                            {u.project?.owner?.firstName || "-"} {u.project?.owner?.lastName || ""}
                          </div>
                        </td>
                        <td><div className="stock-date">{formatDate(u.createdAt)}</div></td>
                        <td><span className="stock-open">›</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="stock-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stock-modal-head">
              <div>
                <h2 className="stock-modal-title">Yeni İlan Ekle</h2>
                <div className="stock-modal-sub">Proje ve mülk bilgilerini girin.</div>
              </div>
              <button className="stock-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="stock-modal-body">
              {formSuccess && <div className="stock-success">İlan başarıyla eklendi.</div>}
              {formError && <div className="stock-error">{formError}</div>}

              <div className="stock-form-section">
                <div className="stock-section-title">Proje</div>
                <div className="stock-form-grid">
                  {myProjects.length > 0 && (
                    <div className="stock-form-field stock-full">
                      <label>Mevcut Projeye Ekle</label>
                      <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                        <option value="">Yeni Proje Oluştur</option>
                        {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                      </select>
                    </div>
                  )}

                  {!selectedProjectId && (
                    <>
                      <div className="stock-form-field">
                        <label>Proje Adı *</label>
                        <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div className="stock-form-field">
                        <label>Şehir *</label>
                        <select value={projectForm.city} onChange={(e) => setProjectForm((f) => ({ ...f, city: e.target.value }))}>
                          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="stock-form-field">
                        <label>İlçe *</label>
                        <input value={projectForm.district} onChange={(e) => setProjectForm((f) => ({ ...f, district: e.target.value }))} />
                      </div>
                      <div className="stock-form-field">
                        <label>Adres *</label>
                        <input value={projectForm.address} onChange={(e) => setProjectForm((f) => ({ ...f, address: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="stock-form-section">
                <div className="stock-section-title">Mülk Bilgileri</div>
                <div className="stock-form-grid">
                  <div className="stock-form-field">
                    <label>Mülk Tipi *</label>
                    <select value={unitForm.type} onChange={(e) => setUnitForm((f) => ({ ...f, type: e.target.value }))}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="stock-form-field">
                    <label>Durum *</label>
                    <select value={unitForm.status} onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="stock-form-field">
                    <label>Oda Sayısı</label>
                    <select value={unitForm.roomCount} onChange={(e) => setUnitForm((f) => ({ ...f, roomCount: e.target.value }))}>
                      {["Studio", "1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "5+2", "6+1", "6+2"].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="stock-form-field">
                    <label>Alan (m²) *</label>
                    <input type="number" value={unitForm.area} onChange={(e) => setUnitForm((f) => ({ ...f, area: e.target.value }))} />
                  </div>
                  <div className="stock-form-field">
                    <label>Kat</label>
                    <input type="number" value={unitForm.floor} onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} />
                  </div>
                  <div className="stock-form-field">
                    <label>Daire No *</label>
                    <input value={unitForm.number} onChange={(e) => setUnitForm((f) => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div className="stock-form-field stock-full">
                    <label>Fiyat (TL) *</label>
                    <input type="number" value={unitForm.price} onChange={(e) => setUnitForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="stock-form-field stock-full">
                    <label>İlan Açıklaması</label>
                    <textarea value={unitForm.description} onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="stock-modal-foot">
              <button className="stock-save" onClick={handleSubmit} disabled={formLoading}>
                {formLoading ? "Kaydediliyor..." : "İlanı Kaydet"}
              </button>
              <button className="stock-cancel" onClick={() => setShowModal(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      <button className="stock-lina" onClick={() => setLinaOpen(true)} title="Lina AI ile stok ekle">🤖</button>
    </div>
  );
}
