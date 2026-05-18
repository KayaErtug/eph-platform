"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Customer {
  id: string; firstName: string; lastName: string; phone?: string;
  email?: string; city?: string; profession?: string; company?: string;
  budget?: number; interestedArea?: string; interestedType?: string;
  source?: string; status: string; tags: string[]; notes?: string;
  lastContactedAt?: string; updatedAt: string;
  _count?: { activities: number; tasks: number };
  activities?: any[]; tasks?: any[];
  owner?: { firstName: string; lastName: string; role: string };
}

const PIPELINE_STAGES = [
  { key: "YENI_LEAD",            label: "Yeni Lead",            color: "#1A4A7A", bg: "#EEF4FF" },
  { key: "ILK_GORUSME",          label: "İlk Görüşme",          color: "#5B2D8E", bg: "#F5F0FF" },
  { key: "PORTFOLYO_GONDERILDI", label: "Portföy Gönderildi",   color: "#B8560B", bg: "#FFF5ED" },
  { key: "YER_GOSTERIMI",        label: "Yer Gösterimi",        color: "#B8860B", bg: "#FFFBF0" },
  { key: "TEKLIF_SURECI",        label: "Teklif Süreci",        color: "#0F2044", bg: "#E8EEFF" },
  { key: "PAZARLIK",             label: "Pazarlık",             color: "#C9A84C", bg: "#FFFDF0" },
  { key: "KAPANDI",              label: "Kapandı ✓",            color: "#2D6A4F", bg: "#F0FAF4" },
  { key: "KAYBEDILDI",           label: "Kaybedildi",           color: "#8A8A8A", bg: "#F5F5F5" },
];

const ACTIVITY_TYPES = [
  { key: "TELEFON", label: "Telefon" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "EMAIL", label: "E-posta" },
  { key: "YER_GOSTERIMI", label: "Yer Gösterimi" },
  { key: "TEKLIF", label: "Teklif" },
  { key: "NOT", label: "Not" },
  { key: "DIGER", label: "Diğer" },
];

const TAGS = ["Yatırımcı","Acil Alıcı","Nakit Hazır","Takas","Yüksek Bütçe","Sıcak Lead","Soğuk Lead"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;--text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;--serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.crm-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.crm-nav{padding:0 20px;}}
.crm-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.crm-logo img{width:34px;height:34px;object-fit:contain;}
.crm-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.crm-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.crm-nav-links{display:flex;align-items:center;gap:4px;}
.crm-nav-item{padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.crm-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.crm-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.crm-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.crm-logout:hover{border-color:var(--navy);color:var(--navy);}

.crm-main{padding:48px;max-width:1400px;margin:0 auto;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.crm-main{padding:24px 20px;}}

.crm-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--border);}
.crm-title{font-family:var(--serif);font-size:40px;font-weight:300;color:var(--navy);line-height:1.1;}
.crm-title em{font-style:italic;color:var(--gold);}
.crm-sub{font-size:12px;color:var(--muted);margin-top:6px;font-weight:300;}
.crm-add-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;}
.crm-add-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.crm-add-btn:hover::before{left:0;}
.crm-add-btn:hover{color:var(--navy);}
.crm-add-btn span{position:relative;z-index:1;}

.crm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:32px;}
@media(max-width:768px){.crm-stats{grid-template-columns:1fr 1fr;}}
.crm-stat{background:#fff;padding:20px;}
.crm-stat-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.crm-stat-num{font-family:var(--serif);font-size:32px;font-weight:300;color:var(--navy);}
.crm-stat-num.gold{color:var(--gold);}
.crm-stat-num.green{color:#2D6A4F;}

.crm-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:28px;}
.crm-tab{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;position:relative;bottom:-1px;}
.crm-tab:hover{color:var(--navy);}
.crm-tab.active{color:var(--navy);border-bottom-color:var(--gold);}

/* PIPELINE */
.crm-pipeline{display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;}
.crm-col{min-width:220px;flex-shrink:0;}
.crm-col-header{padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.crm-col-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:500;}
.crm-col-count{font-family:var(--serif);font-size:18px;font-weight:300;}
.crm-card{background:#fff;border:1px solid var(--border);padding:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;}
.crm-card:hover{border-color:var(--navy);transform:translateY(-1px);}
.crm-card-name{font-size:13px;font-weight:500;color:var(--navy);margin-bottom:4px;}
.crm-card-phone{font-size:11px;color:var(--muted);margin-bottom:6px;}
.crm-card-budget{font-family:var(--serif);font-size:14px;color:var(--gold);}
.crm-card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.crm-tag{font-size:7px;letter-spacing:1px;text-transform:uppercase;border:1px solid var(--border);padding:2px 6px;color:var(--muted);}
.crm-card-meta{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);}
.crm-card-city{font-size:10px;color:var(--muted);}
.crm-card-activity{font-size:9px;color:var(--muted);}

/* LIST */
.crm-list{background:#fff;border:1px solid var(--border);}
.crm-list-row{border-bottom:1px solid var(--border);padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;transition:background 0.2s;}
.crm-list-row:hover{background:var(--warm);}
.crm-list-row:last-child{border-bottom:none;}
.crm-list-name{font-size:14px;font-weight:400;color:var(--navy);}
.crm-list-sub{font-size:11px;color:var(--muted);margin-top:2px;}
.crm-list-status{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:3px 8px;}

/* MODAL */
.crm-overlay{position:fixed;inset:0;background:rgba(15,32,68,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease;}
.crm-modal{background:#fff;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:slideUp 0.3s ease;position:relative;}
.crm-modal-header{padding:28px 32px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:#fff;z-index:1;}
.crm-modal-title{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--navy);}
.crm-modal-divider{width:28px;height:2px;background:var(--gold);margin-top:10px;}
.crm-modal-close{position:absolute;top:16px;right:20px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;}
.crm-modal-body{padding:24px 32px;}
.crm-modal-section{margin-bottom:20px;}
.crm-modal-section-title{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.crm-modal-section-title::after{content:'';flex:1;height:1px;background:var(--border);}
.crm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:500px){.crm-form-grid{grid-template-columns:1fr;}}
.crm-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:8px;font-weight:500;}
.crm-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;}
.crm-input:focus{border-bottom-color:var(--navy);}
.crm-input::placeholder{color:#C0BAB0;}
.crm-select{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;}
.crm-select:focus{border-bottom-color:var(--navy);}
.crm-textarea{width:100%;background:var(--warm);border:1px solid var(--border);padding:10px;font-size:12px;color:var(--navy);font-family:var(--sans);outline:none;resize:none;}
.crm-modal-footer{padding:16px 32px 24px;border-top:1px solid var(--border);display:flex;gap:10px;}
.crm-submit{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 24px;cursor:pointer;font-family:var(--sans);flex:1;transition:all 0.2s;}
.crm-submit:hover{background:#1a3060;}
.crm-submit:disabled{opacity:0.4;cursor:not-allowed;}
.crm-cancel{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:12px 18px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;}
.crm-cancel:hover{border-color:var(--navy);color:var(--navy);}

/* DETAIL MODAL */
.crm-detail-modal{background:#fff;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;animation:slideUp 0.3s ease;position:relative;}
.crm-detail-header{padding:28px 32px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;}
.crm-detail-name{font-family:var(--serif);font-size:28px;font-weight:400;color:var(--navy);}
.crm-detail-sub{font-size:12px;color:var(--muted);margin-top:4px;}
.crm-detail-body{padding:24px 32px;}
.crm-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin-bottom:20px;}
.crm-detail-cell{background:#fff;padding:14px;}
.crm-detail-cell-label{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
.crm-detail-cell-val{font-size:13px;color:var(--navy);}
.crm-status-select{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:5px 12px;cursor:pointer;font-family:var(--sans);background:transparent;outline:none;appearance:none;}
.crm-activity-form{display:flex;gap:8px;margin-bottom:16px;}
.crm-activity-list{display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;}
.crm-activity-item{background:var(--warm);padding:10px 14px;border-left:2px solid var(--gold);}
.crm-activity-type{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:4px;}
.crm-activity-note{font-size:12px;color:var(--navy);}
.crm-activity-date{font-size:10px;color:var(--muted);margin-top:4px;}
.crm-task-form{display:flex;gap:8px;margin-bottom:12px;}
.crm-task-list{display:flex;flex-direction:column;gap:6px;}
.crm-task-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid var(--border);}
.crm-task-check{width:16px;height:16px;border:1.5px solid var(--border);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.crm-task-check.done{background:var(--navy);border-color:var(--navy);}
.crm-task-title{font-size:12px;color:var(--navy);flex:1;}
.crm-task-title.done{text-decoration:line-through;color:var(--muted);}
.crm-task-due{font-size:10px;color:var(--muted);}
.crm-btn-sm{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:7px 14px;cursor:pointer;font-family:var(--sans);white-space:nowrap;}
.crm-btn-sm:disabled{opacity:0.4;}
.crm-empty{padding:60px;text-align:center;font-family:var(--serif);font-size:18px;font-style:italic;color:var(--muted);}
`;

export default function CrmPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, Customer[]>>({});
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"pipeline"|"list">("pipeline");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer|null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", city: "",
    profession: "", company: "", budget: "", interestedArea: "",
    interestedType: "", source: "", notes: "", status: "YENI_LEAD", tags: [] as string[],
  });
  const [activityForm, setActivityForm] = useState({ type: "TELEFON", note: "" });
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "" });

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchAll();
  }, [hydrated, user]);

  const fetchAll = async () => {
    try {
      const [c, p] = await Promise.all([api.get("/crm/customers"), api.get("/crm/pipeline")]);
      setCustomers(c.data);
      setPipeline(p.data);
    } finally { setLoading(false); }
  };

  const handleAddCustomer = async () => {
    setFormLoading(true);
    try {
      await api.post("/crm/customers", {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
      });
      await fetchAll();
      setShowAddModal(false);
      setForm({ firstName:"",lastName:"",phone:"",email:"",city:"",profession:"",company:"",budget:"",interestedArea:"",interestedType:"",source:"",notes:"",status:"YENI_LEAD",tags:[] });
    } finally { setFormLoading(false); }
  };

  const handleStatusChange = async (customerId: string, status: string) => {
    await api.patch(`/crm/customers/${customerId}/status`, { status });
    await fetchAll();
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleAddActivity = async () => {
    if (!selectedCustomer || !activityForm.note) return;
    setActivityLoading(true);
    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/activities`, activityForm);
      const r = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(r.data);
      setActivityForm({ type: "TELEFON", note: "" });
      await fetchAll();
    } finally { setActivityLoading(false); }
  };

  const handleAddTask = async () => {
    if (!selectedCustomer || !taskForm.title) return;
    setTaskLoading(true);
    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/tasks`, taskForm);
      const r = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(r.data);
      setTaskForm({ title: "", dueDate: "" });
    } finally { setTaskLoading(false); }
  };

  const handleTaskDone = async (taskId: string) => {
    await api.patch(`/crm/tasks/${taskId}`, { status: "TAMAMLANDI" });
    if (selectedCustomer) {
      const r = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(r.data);
    }
  };

  const openCustomer = async (id: string) => {
    const r = await api.get(`/crm/customers/${id}`);
    setSelectedCustomer(r.data);
  };

  if (!hydrated || loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const totalBudget = customers.reduce((sum, c) => sum + (c.budget || 0), 0);
  const kapandi = customers.filter(c => c.status === "KAPANDI").length;
  const getStage = (key: string) => PIPELINE_STAGES.find(s => s.key === key);

  return (
    <>
      <style>{CSS}</style>

      {/* MÜŞTERİ EKLE MODAL */}
      {showAddModal && (
        <div className="crm-overlay" onClick={() => setShowAddModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <button className="crm-modal-close" onClick={() => setShowAddModal(false)}>×</button>
              <h2 className="crm-modal-title">Yeni Müşteri</h2>
              <div className="crm-modal-divider" />
            </div>
            <div className="crm-modal-body">
              <div className="crm-modal-section">
                <div className="crm-modal-section-title">Temel Bilgiler</div>
                <div className="crm-form-grid">
                  <div className="crm-field">
                    <label>Ad *</label>
                    <input className="crm-input" placeholder="Ahmet" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Soyad *</label>
                    <input className="crm-input" placeholder="Yılmaz" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Telefon</label>
                    <input className="crm-input" placeholder="0530..." value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>E-posta</label>
                    <input className="crm-input" placeholder="ahmet@..." value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Şehir</label>
                    <input className="crm-input" placeholder="Denizli" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Meslek</label>
                    <input className="crm-input" placeholder="Esnaf" value={form.profession} onChange={e => setForm(f => ({...f, profession: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="crm-modal-section">
                <div className="crm-modal-section-title">İlgi & Bütçe</div>
                <div className="crm-form-grid">
                  <div className="crm-field">
                    <label>Bütçe (₺)</label>
                    <input className="crm-input" type="number" placeholder="2500000" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>İlgilendiği Bölge</label>
                    <input className="crm-input" placeholder="Merkezefendi" value={form.interestedArea} onChange={e => setForm(f => ({...f, interestedArea: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Mülk Tipi</label>
                    <input className="crm-input" placeholder="Daire, Villa..." value={form.interestedType} onChange={e => setForm(f => ({...f, interestedType: e.target.value}))} />
                  </div>
                  <div className="crm-field">
                    <label>Lead Kaynağı</label>
                    <select className="crm-select" value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))}>
                      <option value="">Seçiniz</option>
                      {["Referans","Instagram","Web Sitesi","Sahibinden","EPH Platform","Diger"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="crm-field">
                    <label>Durum</label>
                    <select className="crm-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="crm-modal-section">
                <div className="crm-modal-section-title">Etiketler</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TAGS.map(tag => (
                    <button key={tag} onClick={() => setForm(f => ({...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]}))}
                      style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", border: `1px solid ${form.tags.includes(tag) ? "var(--navy)" : "var(--border)"}`, background: form.tags.includes(tag) ? "var(--navy)" : "transparent", color: form.tags.includes(tag) ? "var(--cream)" : "var(--muted)", padding: "5px 12px", cursor: "pointer", fontFamily: "var(--sans)" }}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="crm-modal-section">
                <div className="crm-modal-section-title">Not</div>
                <textarea className="crm-textarea" rows={3} placeholder="Müşteri hakkında not..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-submit" onClick={handleAddCustomer} disabled={formLoading || !form.firstName || !form.lastName}>
                {formLoading ? "Kaydediliyor..." : "Müşteri Ekle"}
              </button>
              <button className="crm-cancel" onClick={() => setShowAddModal(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ DETAY MODAL */}
      {selectedCustomer && (
        <div className="crm-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="crm-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-detail-header">
              <div>
                <div className="crm-detail-name">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                <div className="crm-detail-sub">{selectedCustomer.phone} {selectedCustomer.city && `· ${selectedCustomer.city}`}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select className="crm-status-select"
                  style={{ borderColor: getStage(selectedCustomer.status)?.color, color: getStage(selectedCustomer.status)?.color, background: getStage(selectedCustomer.status)?.bg }}
                  value={selectedCustomer.status}
                  onChange={e => handleStatusChange(selectedCustomer.id, e.target.value)}>
                  {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <button className="crm-modal-close" style={{ position: "static" }} onClick={() => setSelectedCustomer(null)}>×</button>
              </div>
            </div>
            <div className="crm-detail-body">
              <div className="crm-detail-grid">
                {[
                  { label: "Bütçe", val: selectedCustomer.budget ? `${selectedCustomer.budget.toLocaleString("tr-TR")} ₺` : "—" },
                  { label: "İlgilendiği Bölge", val: selectedCustomer.interestedArea || "—" },
                  { label: "Mülk Tipi", val: selectedCustomer.interestedType || "—" },
                  { label: "Kaynak", val: selectedCustomer.source || "—" },
                  { label: "Meslek", val: selectedCustomer.profession || "—" },
                  { label: "Firma", val: selectedCustomer.company || "—" },
                ].map(item => (
                  <div key={item.label} className="crm-detail-cell">
                    <div className="crm-detail-cell-label">{item.label}</div>
                    <div className="crm-detail-cell-val">{item.val}</div>
                  </div>
                ))}
              </div>

              {selectedCustomer.tags?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="crm-modal-section-title" style={{ fontSize: 8, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>Etiketler</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedCustomer.tags.map(tag => <span key={tag} className="crm-tag">{tag}</span>)}
                  </div>
                </div>
              )}

              {selectedCustomer.notes && (
                <div style={{ marginBottom: 20, background: "var(--warm)", padding: "12px 16px", borderLeft: "2px solid var(--gold)" }}>
                  <div style={{ fontSize: 8, letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Not</div>
                  <div style={{ fontSize: 12, color: "var(--navy)" }}>{selectedCustomer.notes}</div>
                </div>
              )}

              {/* AKTİVİTE */}
              <div style={{ marginBottom: 20 }}>
                <div className="crm-modal-section-title" style={{ fontSize: 8, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  Aktivite Ekle
                  <span style={{ flex: 1, height: 1, background: "var(--border)", display: "block" }} />
                </div>
                <div className="crm-activity-form">
                  <select className="crm-select" style={{ minWidth: 120 }} value={activityForm.type} onChange={e => setActivityForm(f => ({...f, type: e.target.value}))}>
                    {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <input className="crm-input" style={{ flex: 1 }} placeholder="Not ekle..." value={activityForm.note} onChange={e => setActivityForm(f => ({...f, note: e.target.value}))} />
                  <button className="crm-btn-sm" onClick={handleAddActivity} disabled={activityLoading || !activityForm.note}>
                    {activityLoading ? "..." : "Ekle"}
                  </button>
                </div>
                <div className="crm-activity-list">
                  {selectedCustomer.activities?.map(a => (
                    <div key={a.id} className="crm-activity-item">
                      <div className="crm-activity-type">{ACTIVITY_TYPES.find(t => t.key === a.type)?.label || a.type}</div>
                      <div className="crm-activity-note">{a.note}</div>
                      <div className="crm-activity-date">
                        {a.user?.firstName} {a.user?.lastName} · {new Date(a.createdAt).toLocaleDateString("tr-TR")} {new Date(a.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                  {(!selectedCustomer.activities || selectedCustomer.activities.length === 0) && (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Henüz aktivite yok</div>
                  )}
                </div>
              </div>

              {/* GÖREVLER */}
              <div>
                <div className="crm-modal-section-title" style={{ fontSize: 8, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  Görevler
                  <span style={{ flex: 1, height: 1, background: "var(--border)", display: "block" }} />
                </div>
                <div className="crm-task-form">
                  <input className="crm-input" style={{ flex: 1 }} placeholder="Görev ekle..." value={taskForm.title} onChange={e => setTaskForm(f => ({...f, title: e.target.value}))} />
                  <input className="crm-input" type="date" style={{ width: 140 }} value={taskForm.dueDate} onChange={e => setTaskForm(f => ({...f, dueDate: e.target.value}))} />
                  <button className="crm-btn-sm" onClick={handleAddTask} disabled={taskLoading || !taskForm.title}>
                    {taskLoading ? "..." : "Ekle"}
                  </button>
                </div>
                <div className="crm-task-list">
                  {selectedCustomer.tasks?.map(t => (
                    <div key={t.id} className="crm-task-item">
                      <div className={`crm-task-check ${t.status === "TAMAMLANDI" ? "done" : ""}`} onClick={() => t.status !== "TAMAMLANDI" && handleTaskDone(t.id)}>
                        {t.status === "TAMAMLANDI" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span className={`crm-task-title ${t.status === "TAMAMLANDI" ? "done" : ""}`}>{t.title}</span>
                      {t.dueDate && <span className="crm-task-due">{new Date(t.dueDate).toLocaleDateString("tr-TR")}</span>}
                    </div>
                  ))}
                  {(!selectedCustomer.tasks || selectedCustomer.tasks.length === 0) && (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Henüz görev yok</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="crm-nav">
        <a href="/dashboard" className="crm-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="crm-logo-text">EPH Platform</div>
            <div className="crm-logo-sub">Emlak Portföy Havuzu</div>
          </div>
        </a>
        <div className="crm-nav-links">
          <Link href="/dashboard" className="crm-nav-item">Ana Sayfa</Link>
          <Link href="/profil" className="crm-nav-item">Profilim</Link>
          <Link href="/stok" className="crm-nav-item">Stok</Link>
          <Link href="/crm" className="crm-nav-item active">CRM</Link>
          <Link href="/market" className="crm-nav-item">Piyasa</Link>
          {user?.role === "ADMIN" && <Link href="/admin" className="crm-nav-item">Admin</Link>}
        </div>
        <button className="crm-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
      </nav>

      <main className="crm-main">
        <div className="crm-header">
          <div>
            <h1 className="crm-title">Müşteri<br /><em>Yönetimi</em></h1>
            <p className="crm-sub">{customers.length} müşteri · Pipeline ve lead takibi</p>
          </div>
          <button className="crm-add-btn" onClick={() => setShowAddModal(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: "relative", zIndex: 1 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Müşteri Ekle</span>
          </button>
        </div>

        <div className="crm-stats">
          {[
            { label: "Toplam Müşteri", val: customers.length, cls: "" },
            { label: "Kapanan İşlem", val: kapandi, cls: "green" },
            { label: "Aktif Lead", val: customers.filter(c => !["KAPANDI","KAYBEDILDI"].includes(c.status)).length, cls: "gold" },
            { label: "Toplam Bütçe", val: totalBudget > 0 ? `${(totalBudget/1000000).toFixed(1)}M ₺` : "—", cls: "" },
          ].map(s => (
            <div key={s.label} className="crm-stat">
              <div className="crm-stat-label">{s.label}</div>
              <div className={`crm-stat-num ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="crm-tabs">
          <button className={`crm-tab ${view==="pipeline"?"active":""}`} onClick={() => setView("pipeline")}>Pipeline</button>
          <button className={`crm-tab ${view==="list"?"active":""}`} onClick={() => setView("list")}>Liste</button>
        </div>

        {/* PİPELİNE */}
        {view === "pipeline" && (
          <div className="crm-pipeline">
            {PIPELINE_STAGES.map(stage => {
              const cols = pipeline[stage.key] || [];
              return (
                <div key={stage.key} className="crm-col">
                  <div className="crm-col-header" style={{ background: stage.bg }}>
                    <span className="crm-col-label" style={{ color: stage.color }}>{stage.label}</span>
                    <span className="crm-col-count" style={{ color: stage.color }}>{cols.length}</span>
                  </div>
                  {cols.map(c => (
                    <div key={c.id} className="crm-card" onClick={() => openCustomer(c.id)}>
                      <div className="crm-card-name">{c.firstName} {c.lastName}</div>
                      {c.phone && <div className="crm-card-phone">{c.phone}</div>}
                      {c.budget && <div className="crm-card-budget">{c.budget.toLocaleString("tr-TR")} ₺</div>}
                      {c.tags?.length > 0 && (
                        <div className="crm-card-tags">
                          {c.tags.slice(0,2).map(t => <span key={t} className="crm-tag">{t}</span>)}
                        </div>
                      )}
                      <div className="crm-card-meta">
                        <span className="crm-card-city">{c.city || "—"}</span>
                        <span className="crm-card-activity">
                          {(c._count?.activities || 0)} aktivite
                        </span>
                      </div>
                    </div>
                  ))}
                  {cols.length === 0 && <div style={{ padding: "20px 14px", fontSize: 11, color: "var(--muted)", fontStyle: "italic", textAlign: "center" }}>Boş</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* LİSTE */}
        {view === "list" && (
          <div className="crm-list">
            {customers.length === 0 ? (
              <div className="crm-empty">Henüz müşteri eklenmemiş</div>
            ) : customers.map(c => {
              const stage = getStage(c.status);
              return (
                <div key={c.id} className="crm-list-row" onClick={() => openCustomer(c.id)}>
                  <div>
                    <div className="crm-list-name">{c.firstName} {c.lastName}</div>
                    <div className="crm-list-sub">{c.phone} {c.city && `· ${c.city}`} {c.budget && `· ${c.budget.toLocaleString("tr-TR")} ₺`}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {c.tags?.slice(0,2).map(t => <span key={t} className="crm-tag">{t}</span>)}
                    <span className="crm-list-status" style={{ borderColor: stage?.color, color: stage?.color, background: stage?.bg }}>{stage?.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}