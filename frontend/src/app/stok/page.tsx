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
const CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","İçel","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];

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
.st-add-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;}
.st-add-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.st-add-btn:hover::before{left:0;}
.st-add-btn:hover{color:var(--navy);}
.st-add-btn span{position:relative;z-index:1;}
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
.st-badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}
.st-badge-verified{font-size:7px;letter-spacing:1px;text-transform:uppercase;border:1px solid #2D6A4F;color:#2D6A4F;background:#F0FAF4;padding:2px 7px;display:inline-flex;align-items:center;gap:3px;}
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
.st-overlay{position:fixed;inset:0;background:rgba(15,32,68,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.st-modal{background:#fff;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;position:relative;animation:slideUp 0.3s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.st-modal-header{padding:32px 36px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:#fff;z-index:1;}
.st-modal-title{font-family:var(--serif);font-size:28px;font-weight:400;color:var(--navy);}
.st-modal-sub{font-size:12px;color:var(--muted);margin-top:4px;font-weight:300;}
.st-modal-divider{width:28px;height:2px;background:var(--gold);margin-top:12px;}
.st-modal-close{position:absolute;top:20px;right:24px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:22px;}
.st-modal-body{padding:28px 36px 36px;}
.st-modal-section{margin-bottom:24px;}
.st-modal-section-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.st-modal-section-title::after{content:'';flex:1;height:1px;background:var(--border);}
.st-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:500px){.st-form-grid{grid-template-columns:1fr;}}
.st-field{margin-bottom:0;}
.st-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:10px;font-weight:500;}
.st-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;font-weight:300;}
.st-input:focus{border-bottom-color:var(--navy);}
.st-input::placeholder{color:#C0BAB0;}
.st-fselect{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;}
.st-fselect:focus{border-bottom-color:var(--navy);}
.st-ai-box{background:var(--navy);padding:20px 24px;margin-bottom:16px;}
.st-ai-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.st-ai-title{font-size:11px;color:var(--gold);letter-spacing:1px;font-weight:500;display:flex;align-items:center;gap:8px;}
.st-ai-btn{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:var(--gold);color:var(--navy);border:none;padding:8px 16px;cursor:pointer;font-family:var(--sans);font-weight:500;transition:all 0.2s;}
.st-ai-btn:hover{background:#B8962A;}
.st-ai-btn:disabled{opacity:0.5;cursor:not-allowed;}
.st-ai-desc{font-size:11px;color:rgba(245,243,239,0.5);font-weight:300;line-height:1.5;}
.st-ai-loading{display:flex;align-items:center;gap:8px;margin-top:12px;}
.st-ai-loading-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:bounce 1s ease infinite;}
.st-ai-loading-dot:nth-child(2){animation-delay:0.15s;}
.st-ai-loading-dot:nth-child(3){animation-delay:0.3s;}
@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.5}50%{transform:translateY(-4px);opacity:1}}
.st-ai-result{margin-top:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.2);padding:14px;font-size:12px;color:rgba(245,243,239,0.8);line-height:1.7;font-weight:300;}
.st-ai-use-btn{margin-top:10px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:transparent;border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:7px 16px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.st-ai-use-btn:hover{background:rgba(201,168,76,0.1);}
.st-textarea{width:100%;background:var(--warm);border:1px solid var(--border);padding:12px;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;resize:vertical;font-weight:300;min-height:100px;}
.st-textarea:focus{border-color:var(--navy);}
.st-modal-footer{padding:20px 36px 28px;border-top:1px solid var(--border);display:flex;gap:12px;}
.st-submit-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:14px 28px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;flex:1;}
.st-submit-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.st-submit-btn:hover::before{left:0;}
.st-submit-btn:hover{color:var(--navy);}
.st-submit-btn span{position:relative;z-index:1;}
.st-submit-btn:disabled{opacity:0.4;cursor:not-allowed;}
.st-submit-btn:disabled::before{display:none;}
.st-cancel-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:14px 20px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;}
.st-cancel-btn:hover{border-color:var(--navy);color:var(--navy);}
.st-form-error{font-size:11px;color:#C0392B;margin-top:8px;}
.st-form-success{background:#F0FAF4;border-left:3px solid #2D6A4F;padding:14px 18px;margin-bottom:16px;font-size:12px;color:#2D6A4F;font-weight:300;}
`;

function VerifiedBadges({ u }: { u: Unit }) {
  if (!u.tapuVerified && !u.photoVerified && !u.yetkiVerified) return null;
  return (
    <div className="st-badges">
      {u.tapuVerified && <span className="st-badge-verified">✓ Tapu</span>}
      {u.photoVerified && <span className="st-badge-verified">✓ Fotoğraf</span>}
      {u.yetkiVerified && <span className="st-badge-verified">✓ Yetki</span>}
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
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState({ name: "", city: "Denizli", district: "", address: "" });
  const [unitForm, setUnitForm] = useState({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const canAddUnit = user?.role === "MUTEAHHIT" || user?.role === "INSAAT_FIRMASI" || user?.role === "ADMIN";

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

  const generateAiDescription = async () => {
    setAiLoading(true);
    setAiResult("");
    try {
      const prompt = `Bir emlak ilani icin kisa ve profesyonel Turkce aciklama yaz. Bilgiler: Tip: ${TYPE_LABELS[unitForm.type] || unitForm.type}, Oda: ${unitForm.roomCount}, Alan: ${unitForm.area}m2, Kat: ${unitForm.floor}, Durum: ${STATUS_LABELS[unitForm.status]}, Sehir: ${projectForm.city}, Ilce: ${projectForm.district}. Maksimum 3 cumle, samimi ve dogal bir dil kullan.`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      setAiResult(data.reply || "Aciklama olusturulamadi.");
    } catch {
      setAiResult("Baglanti hatasi. Lutfen tekrar deneyin.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(""); setFormLoading(true);
    try {
      let projectId = selectedProjectId;
      if (!selectedProjectId) {
        if (!projectForm.name || !projectForm.city || !projectForm.district || !projectForm.address) {
          setFormError("Proje bilgilerini eksiksiz doldurun."); setFormLoading(false); return;
        }
        const pr = await api.post("/projects", projectForm);
        projectId = pr.data.id;
      }
      if (!unitForm.number || !unitForm.area || !unitForm.price) {
        setFormError("Birim numarasi, alan ve fiyat zorunludur."); setFormLoading(false); return;
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
        setShowModal(false); setFormSuccess(false);
        setProjectForm({ name: "", city: "Denizli", district: "", address: "" });
        setUnitForm({ type: "DAIRE", floor: "", number: "", roomCount: "3+1", area: "", price: "", status: "SATILIK", description: "" });
        setSelectedProjectId(""); setAiResult("");
      }, 1500);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata olustu.");
    } finally { setFormLoading(false); }
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
  const myProjects = projects.filter(p => p.owner?.role === user?.role || user?.role === "ADMIN");

  return (
    <>
      <style>{CSS}</style>

      {showModal && (
        <div className="st-overlay" onClick={() => setShowModal(false)}>
          <div className="st-modal" onClick={e => e.stopPropagation()}>
            <div className="st-modal-header">
              <button className="st-modal-close" onClick={() => setShowModal(false)}>x</button>
              <h2 className="st-modal-title">Yeni Ilan Ekle</h2>
              <p className="st-modal-sub">Bilgileri girin, AI size aciklama yazsin</p>
              <div className="st-modal-divider" />
            </div>
            <div className="st-modal-body">
              {formSuccess && <div className="st-form-success">Ilan basariyla eklendi!</div>}
              <div className="st-modal-section">
                <div className="st-modal-section-title">Proje</div>
                {myProjects.length > 0 && (
                  <div className="st-field" style={{ marginBottom: 16 }}>
                    <label>Mevcut Projeye Ekle</label>
                    <select className="st-fselect" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                      <option value="">Yeni Proje Olustur</option>
                      {myProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                    </select>
                  </div>
                )}
                {!selectedProjectId && (
                  <div className="st-form-grid">
                    <div className="st-field">
                      <label>Proje Adi *</label>
                      <input className="st-input" placeholder="Denizli Merkez" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="st-field">
                      <label>Sehir *</label>
                      <select className="st-fselect" value={projectForm.city} onChange={e => setProjectForm(f => ({ ...f, city: e.target.value }))}>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="st-field">
                      <label>Ilce *</label>
                      <input className="st-input" placeholder="Merkezefendi" value={projectForm.district} onChange={e => setProjectForm(f => ({ ...f, district: e.target.value }))} />
                    </div>
                    <div className="st-field">
                      <label>Adres *</label>
                      <input className="st-input" placeholder="Mahalle, Cadde, No" value={projectForm.address} onChange={e => setProjectForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="st-modal-section">
                <div className="st-modal-section-title">Mulk Bilgileri</div>
                <div className="st-form-grid">
                  <div className="st-field">
                    <label>Mulk Tipi *</label>
                    <select className="st-fselect" value={unitForm.type} onChange={e => setUnitForm(f => ({ ...f, type: e.target.value }))}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="st-field">
                    <label>Durum *</label>
                    <select className="st-fselect" value={unitForm.status} onChange={e => setUnitForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="st-field">
                    <label>Oda Sayisi</label>
                    <select className="st-fselect" value={unitForm.roomCount} onChange={e => setUnitForm(f => ({ ...f, roomCount: e.target.value }))}>
                      {["Studio","1+0","1+1","2+1","3+1","4+1","5+1","5+2","6+1","6+2"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="st-field">
                    <label>Alan (m2) *</label>
                    <input className="st-input" type="number" placeholder="120" value={unitForm.area} onChange={e => setUnitForm(f => ({ ...f, area: e.target.value }))} />
                  </div>
                  <div className="st-field">
                    <label>Kat</label>
                    <input className="st-input" type="number" placeholder="3" value={unitForm.floor} onChange={e => setUnitForm(f => ({ ...f, floor: e.target.value }))} />
                  </div>
                  <div className="st-field">
                    <label>Daire No *</label>
                    <input className="st-input" placeholder="301" value={unitForm.number} onChange={e => setUnitForm(f => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div className="st-field" style={{ gridColumn: "span 2" }}>
                    <label>Fiyat (TL) *</label>
                    <input className="st-input" type="number" placeholder="2500000" value={unitForm.price} onChange={e => setUnitForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="st-modal-section">
                <div className="st-modal-section-title">AI Destekli Aciklama</div>
                <div className="st-ai-box">
                  <div className="st-ai-header">
                    <div className="st-ai-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                      Yapay Zeka Aciklama Yazar
                    </div>
                    <button className="st-ai-btn" onClick={generateAiDescription} disabled={aiLoading || !unitForm.area}>
                      {aiLoading ? "Yaziliyor..." : "Aciklama Olustur"}
                    </button>
                  </div>
                  <p className="st-ai-desc">Bilgileri girdikten sonra butona basin, AI sizin icin profesyonel aciklama yazsin.</p>
                  {aiLoading && (
                    <div className="st-ai-loading">
                      <div className="st-ai-loading-dot" />
                      <div className="st-ai-loading-dot" />
                      <div className="st-ai-loading-dot" />
                      <span style={{ fontSize: 11, color: "rgba(245,243,239,0.5)" }}>Aciklama yaziliyor...</span>
                    </div>
                  )}
                  {aiResult && (
                    <div>
                      <div className="st-ai-result">{aiResult}</div>
                      <button className="st-ai-use-btn" onClick={() => setUnitForm(f => ({ ...f, description: aiResult }))}>
                        Bu aciklamayi kullan
                      </button>
                    </div>
                  )}
                </div>
                <div className="st-field">
                  <label>Ilan Aciklamasi</label>
                  <textarea className="st-textarea" placeholder="Mulk hakkinda kisa aciklama..." value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              {formError && <div className="st-form-error">{formError}</div>}
            </div>
            <div className="st-modal-footer">
              <button className="st-submit-btn" onClick={handleSubmit} disabled={formLoading}>
                <span>{formLoading ? "Kaydediliyor..." : "Ilani Kaydet"}</span>
              </button>
              <button className="st-cancel-btn" onClick={() => setShowModal(false)}>Iptal</button>
            </div>
          </div>
        </div>
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

      <main className="st-main">
        <div className="st-header">
          <div>
            <h1 className="st-title">Stok<br /><em>Yonetimi</em></h1>
            <p className="st-sub">Proje ve daire portfoyunuzu yonetin</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              {projects.length} proje · {units.length} birim
            </div>
            {canAddUnit && (
              <button className="st-add-btn" onClick={() => { setShowModal(true); setFormError(""); setAiResult(""); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "relative", zIndex: 1 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
          <button className={`st-tab ${view==="units"?"active":""}`} onClick={() => setView("units")}>Tum Birimler</button>
        </div>

        {view === "projects" && (
          <div>
            {projects.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Henuz proje eklenmemis</div>
                <div className="st-empty-sub">{canAddUnit ? "Sag ustteki Ilan Ekle butonuna tiklayin" : "Portfoyunuzu olusturmaya baslayin"}</div>
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
                            <span className="st-unit-status" style={{ borderColor: ss.color, color: ss.color, background: ss.bg }}>{STATUS_LABELS[u.status]}</span>
                            <div className="st-unit-type">{TYPE_LABELS[u.type] || u.type}</div>
                            <div className="st-unit-detail">{u.roomCount && `${u.roomCount} · `}{u.area ? `${u.area}m2` : ""}</div>
                            <VerifiedBadges u={u} />
                            <div className="st-unit-price">{u.price.toLocaleString("tr-TR")} TL</div>
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

        {view === "units" && (
          <div>
            <div className="st-filters">
              <div className="st-filter-wrap">
                <label>Durum</label>
                <select className="st-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Tum Durumlar</option>
                  {STATUS_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="st-filter-wrap">
                <label>Sehir</label>
                <input className="st-filter-input" placeholder="Sehir ara..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
              </div>
            </div>
            {units.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-text">Birim bulunamadi</div>
                <div className="st-empty-sub">Filtre kriterlerinizi degistirmeyi deneyin</div>
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
                        <span className="st-unit-status" style={{ borderColor: ss.color, color: ss.color, background: ss.bg, flexShrink: 0 }}>{STATUS_LABELS[u.status]}</span>
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
                          <div className="st-unit-big-cell-val">{u.area ? `${u.area}m2` : "—"}</div>
                        </div>
                      </div>
                      <div className="st-unit-big-footer">
                        <span className="st-unit-big-room">{u.roomCount || "—"}</span>
                        <span className="st-unit-big-price">{u.price.toLocaleString("tr-TR")} TL</span>
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