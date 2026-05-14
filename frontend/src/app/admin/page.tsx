"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Stats {
  totalUsers: number; pendingUsers: number; approvedUsers: number;
  totalInvitations: number; pendingDocuments: number;
  pendingNominations: number; pendingApplications: number;
  byRole: { role: string; count: number }[];
}
interface User {
  id: string; firstName: string; lastName: string; email: string;
  phone: string; role: string; isApproved: boolean;
  documents: { id: string; type: string; status: string; fileUrl: string; fileName: string }[];
}
interface Document {
  id: string; type: string; status: string; fileUrl: string; fileName: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}
interface Nomination {
  id: string; candidateName: string; candidateEmail: string; candidatePhone: string;
  candidateRole: string; note?: string; status: string; adminNote?: string;
  createdAt: string; nominator: { firstName: string; lastName: string; email: string; role: string };
}
interface Application {
  id: string; applicantName: string; applicantEmail: string; applicantPhone: string;
  requestedRole: string; message?: string; referralCode?: string; status: string;
  adminNote?: string; createdAt: string;
  referrer?: { firstName: string; lastName: string; email: string; role: string };
}
interface Lead {
  id: string; fullName?: string; phone?: string; email?: string;
  profession?: string; city?: string; interest?: string;
  conversation?: string; source: string; createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit", INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin"
};
const DOC_LABELS: Record<string, string> = {
  VERGI_LEVHASI: "Vergi Levhası", YETKI_BELGESI: "Yetki Belgesi",
  TICARET_SICIL: "Ticaret Sicil", KIMLIK: "Kimlik", DIGER: "Diğer"
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi",
  INVITED: "Davet Gönderildi", REGISTERED: "Kayıt Oldu"
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
  --text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;--red:#C0392B;--green:#2D6A4F;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}

/* NAV */
.an-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.an-nav{padding:0 20px;}}
.an-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.an-logo img{width:34px;height:34px;object-fit:contain;}
.an-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.an-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.an-logo-badge{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.7);border:1px solid rgba(201,168,76,0.3);padding:3px 10px;margin-left:4px;}
.an-nav-links{display:flex;align-items:center;gap:4px;}
.an-nav-item{display:flex;align-items:center;gap:6px;padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.an-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.an-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.an-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.an-logout:hover{border-color:var(--navy);color:var(--navy);}

/* MAIN */
.an-main{padding:48px;max-width:1300px;margin:0 auto;}
@media(max-width:768px){.an-main{padding:24px 20px;}}

/* HEADER */
.an-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--border);}
@media(max-width:768px){.an-header{flex-direction:column;align-items:flex-start;gap:16px;}}
.an-title{font-family:var(--serif);font-size:40px;font-weight:300;color:var(--navy);letter-spacing:-0.5px;line-height:1.1;}
.an-title em{font-style:italic;color:var(--gold);}
.an-sub{font-size:12px;color:var(--muted);margin-top:6px;font-weight:300;}
.an-add-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;}
.an-add-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.an-add-btn:hover::before{left:0;}
.an-add-btn:hover{color:var(--navy);}
.an-add-btn span{position:relative;z-index:1;}

/* STATS */
.an-stats{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);margin-bottom:40px;}
@media(max-width:1100px){.an-stats{grid-template-columns:repeat(4,1fr);}}
@media(max-width:600px){.an-stats{grid-template-columns:repeat(2,1fr);}}
.an-stat{background:#fff;padding:24px 20px;}
.an-stat-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.an-stat-num{font-family:var(--serif);font-size:32px;font-weight:300;color:var(--navy);line-height:1;}
.an-stat-num.gold{color:var(--gold);}
.an-stat-num.green{color:#2D6A4F;}
.an-stat-num.orange{color:#B8860B;}

/* ROLES */
.an-roles{background:#fff;border:1px solid var(--border);padding:20px 24px;margin-bottom:32px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.an-roles-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
.an-role-tag{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid var(--border);padding:4px 12px;color:var(--navy);}

/* TABS */
.an-tabs{display:flex;gap:0;margin-bottom:32px;border-bottom:1px solid var(--border);}
.an-tab{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;display:flex;align-items:center;gap:8px;position:relative;bottom:-1px;}
.an-tab:hover{color:var(--navy);}
.an-tab.active{color:var(--navy);border-bottom-color:var(--gold);}
.an-tab-badge{font-size:8px;background:var(--gold);color:var(--navy);padding:2px 7px;font-weight:500;}

/* FILTERS */
.an-filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.an-filter{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:6px 14px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;}
.an-filter:hover{border-color:var(--navy);color:var(--navy);}
.an-filter.active{border-color:var(--navy);background:var(--navy);color:var(--cream);}

/* TABLE */
.an-table{background:#fff;border:1px solid var(--border);}
.an-table-head{display:grid;padding:14px 24px;background:var(--warm);border-bottom:1px solid var(--border);}
.an-table-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
.an-row{border-bottom:1px solid var(--border);padding:20px 24px;transition:background 0.2s;}
.an-row:hover{background:var(--warm);}
.an-row:last-child{border-bottom:none;}
.an-empty{padding:60px 24px;text-align:center;font-family:var(--serif);font-size:18px;font-style:italic;color:var(--muted);}

/* USER ROW */
.an-user-info{display:flex;align-items:center;gap:14px;}
.an-avatar{width:38px;height:38px;background:var(--navy);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:16px;color:var(--cream);font-weight:400;flex-shrink:0;}
.an-user-name{font-size:14px;font-weight:400;color:var(--navy);}
.an-user-email{font-size:11px;color:var(--muted);font-weight:300;}
.an-user-phone{font-size:10px;color:#B8B2A8;font-weight:300;}

/* STATUS BADGE */
.an-badge{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:4px 10px;font-weight:500;}
.an-badge-pending{border-color:#B8860B;color:#B8860B;background:#FFFBF0;}
.an-badge-approved{border-color:#2D6A4F;color:#2D6A4F;background:#F0FAF4;}
.an-badge-rejected{border-color:var(--red);color:var(--red);background:#FEF0EE;}
.an-badge-invited{border-color:#1A4A7A;color:#1A4A7A;background:#EEF4FF;}
.an-badge-registered{border-color:#5B2D8E;color:#5B2D8E;background:#F5F0FF;}

/* ACTIONS */
.an-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.an-btn{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:none;padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;font-weight:500;}
.an-btn-approve{background:var(--green);color:#fff;}
.an-btn-approve:hover{background:#1F4A35;}
.an-btn-reject{background:transparent;border:1px solid var(--red)!important;color:var(--red);}
.an-btn-reject:hover{background:var(--red);color:#fff;}
.an-btn-warn{background:transparent;border:1px solid #B8860B!important;color:#B8860B;}
.an-btn-warn:hover{background:#B8860B;color:#fff;}
.an-btn-navy{background:var(--navy);color:var(--cream);}
.an-btn-navy:hover{background:#1a3060;}
.an-btn-ghost{background:transparent;border:1px solid var(--border)!important;color:var(--muted);}
.an-btn-ghost:hover{border-color:var(--navy)!important;color:var(--navy);}
.an-btn:disabled{opacity:0.4;cursor:not-allowed;}

/* MODAL */
.an-overlay{position:fixed;inset:0;background:rgba(15,32,68,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.an-modal{background:#fff;width:100%;max-width:460px;padding:40px;position:relative;animation:slideUp 0.3s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.an-modal-title{font-family:var(--serif);font-size:28px;font-weight:400;color:var(--navy);margin-bottom:6px;}
.an-modal-sub{font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:300;}
.an-modal-divider{width:28px;height:2px;background:var(--gold);margin-bottom:28px;}
.an-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;}
.an-field{margin-bottom:18px;}
.an-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:10px;font-weight:500;}
.an-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;font-weight:300;}
.an-input:focus{border-bottom-color:var(--navy);}
.an-select{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;}
.an-textarea{width:100%;background:var(--warm);border:1px solid var(--border);padding:12px;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;resize:none;font-weight:300;}
.an-textarea:focus{border-color:var(--navy);}
.an-modal-actions{display:flex;gap:10px;margin-top:24px;}
.an-modal-submit{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 24px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.an-modal-submit:hover{background:#1a3060;}
.an-modal-submit:disabled{opacity:0.4;cursor:not-allowed;}
.an-modal-cancel{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:12px 20px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;}
.an-modal-cancel:hover{border-color:var(--navy);color:var(--navy);}
.an-modal-error{font-size:11px;color:var(--red);margin-top:8px;}

/* LEAD */
.an-lead-row{border-bottom:1px solid var(--border);padding:20px 24px;transition:background 0.2s;}
.an-lead-row:hover{background:var(--warm);}
.an-lead-conv{margin-top:12px;background:var(--warm);border:1px solid var(--border);padding:16px;max-height:200px;overflow-y:auto;}
.an-conv-msg{display:flex;margin-bottom:8px;}
.an-conv-msg.user{justify-content:flex-end;}
.an-conv-bubble{font-size:11px;padding:8px 12px;max-width:75%;line-height:1.5;}
.an-conv-bubble.assistant{background:#fff;border:1px solid var(--border);color:var(--navy);}
.an-conv-bubble.user{background:var(--navy);color:var(--cream);}
.an-conv-toggle{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);background:none;border:none;cursor:pointer;font-family:var(--sans);margin-top:8px;transition:color 0.2s;}
.an-conv-toggle:hover{color:var(--navy);}

@keyframes spin{to{transform:rotate(360deg)}}
`;

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<"users"|"documents"|"nominations"|"applications"|"leads">("users");
  const [userFilter, setUserFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [nomFilter, setNomFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [noteModal, setNoteModal] = useState<{type:"nomination"|"application";id:string}|null>(null);
  const [noteText, setNoteText] = useState("");
  const [expandedLead, setExpandedLead] = useState<string|null>(null);
  const [roleModal, setRoleModal] = useState<{id:string;currentRole:string}|null>(null);
  const [newRole, setNewRole] = useState("");
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({firstName:"",lastName:"",email:"",phone:"",password:"",role:"EMLAKCI"});
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    if (user.role !== "ADMIN") { router.push("/dashboard"); return; }
    fetchAll();
  }, [hydrated, user]);
  useEffect(() => { if (hydrated && user) fetchUsers(userFilter); }, [userFilter]);
  useEffect(() => { if (hydrated && user) fetchDocuments(docFilter); }, [docFilter]);
  useEffect(() => { if (hydrated && user) fetchNominations(nomFilter); }, [nomFilter]);
  useEffect(() => { if (hydrated && user) fetchApplications(appFilter); }, [appFilter]);

  const fetchAll = async () => {
    try {
      const [s,u,d,n,a,l] = await Promise.all([
        api.get("/admin/stats"), api.get("/admin/users?filter=all"),
        api.get("/admin/documents?filter=all"), api.get("/admin/nominations?status=all"),
        api.get("/admin/applications?status=all"), api.get("/leads"),
      ]);
      setStats(s.data); setUsers(u.data); setDocuments(d.data);
      setNominations(n.data); setApplications(a.data); setLeads(l.data);
    } finally { setLoading(false); }
  };
  const fetchStats = async () => { const r = await api.get("/admin/stats"); setStats(r.data); };
  const fetchUsers = async (f="all") => { const r = await api.get(`/admin/users?filter=${f}`); setUsers(r.data); };
  const fetchDocuments = async (f="all") => { const r = await api.get(`/admin/documents?filter=${f}`); setDocuments(r.data); };
  const fetchNominations = async (f="all") => { const r = await api.get(`/admin/nominations?status=${f}`); setNominations(r.data); };
  const fetchApplications = async (f="all") => { const r = await api.get(`/admin/applications?status=${f}`); setApplications(r.data); };
  const fetchLeads = async () => { const r = await api.get("/leads"); setLeads(r.data); };

  const act = async (id:string, fn:()=>Promise<any>) => {
    setActionLoading(id); try { await fn(); } finally { setActionLoading(null); }
  };

  const getBadge = (status:string) => {
    const map:Record<string,string> = {PENDING:"pending",APPROVED:"approved",REJECTED:"rejected",INVITED:"invited",REGISTERED:"registered"};
    return `an-badge an-badge-${map[status]||"pending"}`;
  };

  if (!hydrated || loading) return (
    <div style={{minHeight:"100vh",background:"#FAFAF8",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div style={{width:32,height:32,border:"2px solid #C9A84C",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* NOT MODAL */}
      {noteModal && (
        <div className="an-overlay" onClick={()=>{setNoteModal(null);setNoteText("");}}>
          <div className="an-modal" onClick={e=>e.stopPropagation()}>
            <button className="an-modal-close" onClick={()=>{setNoteModal(null);setNoteText("");}}>×</button>
            <h3 className="an-modal-title">Admin Notu</h3>
            <p className="an-modal-sub">Bu not sadece admin panelinde görünür.</p>
            <div className="an-modal-divider"/>
            <textarea className="an-textarea" rows={4} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Notunuzu yazın..."/>
            <div className="an-modal-actions">
              <button className="an-modal-submit" disabled={actionLoading===noteModal.id} onClick={async()=>{
                setActionLoading(noteModal.id);
                try {
                  if(noteModal.type==="nomination"){
                    await api.patch(`/admin/nominations/${noteModal.id}/status`,{status:nominations.find(n=>n.id===noteModal.id)?.status,adminNote:noteText});
                    await fetchNominations(nomFilter);
                  } else {
                    await api.patch(`/admin/applications/${noteModal.id}/status`,{status:applications.find(a=>a.id===noteModal.id)?.status,adminNote:noteText});
                    await fetchApplications(appFilter);
                  }
                  setNoteModal(null); setNoteText("");
                } finally { setActionLoading(null); }
              }}>{actionLoading===noteModal.id?"...":"Kaydet"}</button>
              <button className="an-modal-cancel" onClick={()=>{setNoteModal(null);setNoteText("");}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* ROL MODAL */}
      {roleModal && (
        <div className="an-overlay" onClick={()=>{setRoleModal(null);setNewRole("");}}>
          <div className="an-modal" onClick={e=>e.stopPropagation()}>
            <button className="an-modal-close" onClick={()=>{setRoleModal(null);setNewRole("");}}>×</button>
            <h3 className="an-modal-title">Rol Değiştir</h3>
            <p className="an-modal-sub">Üyenin platformdaki rolünü güncelleyin.</p>
            <div className="an-modal-divider"/>
            <div className="an-field">
              <label>Yeni Rol</label>
              <select className="an-select" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
              </select>
            </div>
            <div className="an-modal-actions">
              <button className="an-modal-submit" disabled={!newRole||actionLoading===roleModal.id} onClick={async()=>{
                await act(roleModal.id,async()=>{ await api.patch(`/admin/users/${roleModal.id}/role`,{role:newRole}); await fetchUsers(userFilter); setRoleModal(null); setNewRole(""); });
              }}>{actionLoading===roleModal.id?"...":"Değiştir"}</button>
              <button className="an-modal-cancel" onClick={()=>{setRoleModal(null);setNewRole("");}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* KULLANICI EKLE MODAL */}
      {createUserModal && (
        <div className="an-overlay" onClick={()=>{setCreateUserModal(false);setCreateUserError("");}}>
          <div className="an-modal" onClick={e=>e.stopPropagation()}>
            <button className="an-modal-close" onClick={()=>{setCreateUserModal(false);setCreateUserError("");}}>×</button>
            <h3 className="an-modal-title">Yeni Üye</h3>
            <p className="an-modal-sub">Manuel olarak platforma üye ekleyin.</p>
            <div className="an-modal-divider"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
              {[{ph:"Ad",k:"firstName"},{ph:"Soyad",k:"lastName"}].map(({ph,k})=>(
                <div key={k} className="an-field">
                  <label>{ph}</label>
                  <input className="an-input" placeholder={ph} value={createUserForm[k as keyof typeof createUserForm]}
                    onChange={e=>setCreateUserForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            {[{ph:"E-posta",k:"email",t:"email"},{ph:"Telefon",k:"phone",t:"tel"},{ph:"Şifre",k:"password",t:"password"}].map(({ph,k,t})=>(
              <div key={k} className="an-field">
                <label>{ph}</label>
                <input className="an-input" type={t} placeholder={ph} value={createUserForm[k as keyof typeof createUserForm]}
                  onChange={e=>setCreateUserForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div className="an-field">
              <label>Rol</label>
              <select className="an-select" value={createUserForm.role} onChange={e=>setCreateUserForm(f=>({...f,role:e.target.value}))}>
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {createUserError && <p className="an-modal-error">{createUserError}</p>}
            <div className="an-modal-actions">
              <button className="an-modal-submit" disabled={createUserLoading} onClick={async()=>{
                if(!createUserForm.firstName||!createUserForm.lastName||!createUserForm.email||!createUserForm.phone||!createUserForm.password){setCreateUserError("Tüm alanlar zorunludur.");return;}
                setCreateUserLoading(true); setCreateUserError("");
                try { await api.post("/admin/users",createUserForm); setCreateUserModal(false); setCreateUserForm({firstName:"",lastName:"",email:"",phone:"",password:"",role:"EMLAKCI"}); await Promise.all([fetchUsers(userFilter),fetchStats()]); }
                catch(e:any){ setCreateUserError(e?.response?.data?.message||"Bir hata oluştu."); }
                finally { setCreateUserLoading(false); }
              }}>{createUserLoading?"Ekleniyor...":"Üye Ekle"}</button>
              <button className="an-modal-cancel" onClick={()=>{setCreateUserModal(false);setCreateUserError("");}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="an-nav">
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a href="/dashboard" className="an-logo">
            <img src="/LOGO_EPH.png" alt="EPH"/>
            <div>
              <div className="an-logo-text">EPH Platform</div>
              <div className="an-logo-sub">Emlak Portföy Havuzu</div>
            </div>
          </a>
          <span className="an-logo-badge">Admin</span>
        </div>
        <div className="an-nav-links">
          <Link href="/dashboard" className="an-nav-item">Ana Sayfa</Link>
          <Link href="/stok" className="an-nav-item">Stok</Link>
          <Link href="/admin" className="an-nav-item active">Admin</Link>
        </div>
        <button className="an-logout" onClick={()=>{logout();router.push("/giris");}}>Çıkış</button>
      </nav>

      <main className="an-main">

        {/* HEADER */}
        <div className="an-header">
          <div>
            <h1 className="an-title">Yönetim<br/><em>Paneli</em></h1>
            <p className="an-sub">Üye, belge ve başvuru yönetimi</p>
          </div>
          <button className="an-add-btn" onClick={()=>setCreateUserModal(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{position:"relative",zIndex:1}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Yeni Üye Ekle</span>
          </button>
        </div>

        {/* STATS */}
        {stats && (
          <div className="an-stats">
            {[
              {label:"Toplam Üye",val:stats.totalUsers,cls:""},
              {label:"Onay Bekleyen",val:stats.pendingUsers,cls:"orange"},
              {label:"Onaylanan",val:stats.approvedUsers,cls:"green"},
              {label:"Davet Kodu",val:stats.totalInvitations,cls:"gold"},
              {label:"Bekleyen Belge",val:stats.pendingDocuments,cls:"orange"},
              {label:"Bekleyen Tavsiye",val:stats.pendingNominations,cls:"orange"},
              {label:"Bekleyen Başvuru",val:stats.pendingApplications,cls:"orange"},
            ].map(s=>(
              <div key={s.label} className="an-stat">
                <div className="an-stat-label">{s.label}</div>
                <div className={`an-stat-num ${s.cls}`}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ROL DAĞILIMI */}
        {stats && stats.byRole.length > 0 && (
          <div className="an-roles">
            <span className="an-roles-label">Rol Dağılımı</span>
            {stats.byRole.map(r=>(
              <span key={r.role} className="an-role-tag">{ROLE_LABELS[r.role]}: {r.count}</span>
            ))}
          </div>
        )}

        {/* TABS */}
        <div className="an-tabs">
          {[
            {key:"users",label:"Kullanıcılar",badge:null},
            {key:"documents",label:"Belgeler",badge:stats?.pendingDocuments},
            {key:"nominations",label:"Tavsiyeler",badge:stats?.pendingNominations},
            {key:"applications",label:"Başvurular",badge:stats?.pendingApplications},
            {key:"leads",label:"Lina Leads",badge:leads.length},
          ].map(t=>(
            <button key={t.key} className={`an-tab ${activeTab===t.key?"active":""}`}
              onClick={()=>{setActiveTab(t.key as any); if(t.key==="leads") fetchLeads();}}>
              {t.label}
              {t.badge && t.badge > 0 && <span className="an-tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* KULLANICILAR */}
        {activeTab==="users" && (
          <>
            <div className="an-filters">
              {[["all","Tümü"],["pending","Bekleyen"],["approved","Onaylanan"]].map(([f,l])=>(
                <button key={f} className={`an-filter ${userFilter===f?"active":""}`} onClick={()=>setUserFilter(f)}>{l}</button>
              ))}
            </div>
            <div className="an-table">
              {users.length===0 ? <div className="an-empty">Kullanıcı bulunamadı.</div> :
                users.map(u=>(
                  <div key={u.id} className="an-row">
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div className="an-user-info">
                        <div className="an-avatar">{u.firstName[0]}{u.lastName[0]}</div>
                        <div>
                          <div className="an-user-name">{u.firstName} {u.lastName}</div>
                          <div className="an-user-email">{u.email}</div>
                          <div className="an-user-phone">{u.phone}</div>
                        </div>
                      </div>
                      <div className="an-actions">
                        <span className="an-role-tag" style={{fontSize:"8px"}}>{ROLE_LABELS[u.role]}</span>
                        {u.documents?.length>0 && <span style={{fontSize:10,color:"var(--muted)"}}>{u.documents.length} belge</span>}
                        <span className={`an-badge ${u.isApproved?"an-badge-approved":"an-badge-pending"}`}>
                          {u.isApproved?"Onaylı":"Bekliyor"}
                        </span>
                        {!u.isApproved ? (
                          <button className="an-btn an-btn-approve" disabled={actionLoading===u.id}
                            onClick={()=>act(u.id,async()=>{await api.patch(`/admin/users/${u.id}/approve`);await Promise.all([fetchUsers(userFilter),fetchStats()]);})}> 
                            {actionLoading===u.id?"...":"Onayla"}
                          </button>
                        ) : u.role!=="ADMIN" && (
                          <button className="an-btn an-btn-warn" disabled={actionLoading===u.id}
                            onClick={()=>{if(!confirm("Askıya alınacak."))return; act(u.id,async()=>{await api.patch(`/admin/users/${u.id}/suspend`);await Promise.all([fetchUsers(userFilter),fetchStats()]);});}}>
                            {actionLoading===u.id?"...":"Askıya Al"}
                          </button>
                        )}
                        {u.role!=="ADMIN" && (
                          <button className="an-btn an-btn-ghost" onClick={()=>{setRoleModal({id:u.id,currentRole:u.role});setNewRole(u.role);}}>Rol Değiştir</button>
                        )}
                        {u.role!=="ADMIN" && (
                          <button className="an-btn an-btn-reject" disabled={actionLoading===u.id}
                            onClick={()=>{if(!confirm("Silinecek. Emin misiniz?"))return; act(u.id,async()=>{await api.delete(`/admin/users/${u.id}/reject`);await Promise.all([fetchUsers(userFilter),fetchStats()]);});}}>
                            {actionLoading===u.id?"...":"Sil"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* BELGELER */}
        {activeTab==="documents" && (
          <>
            <div className="an-filters">
              {[["all","Tümü"],["pending","Bekleyen"],["approved","Onaylanan"],["rejected","Reddedilen"]].map(([f,l])=>(
                <button key={f} className={`an-filter ${docFilter===f?"active":""}`} onClick={()=>setDocFilter(f)}>{l}</button>
              ))}
            </div>
            <div className="an-table">
              {documents.length===0 ? <div className="an-empty">Belge bulunamadı.</div> :
                documents.map(doc=>(
                  <div key={doc.id} className="an-row">
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div className="an-user-info">
                        <div className="an-avatar" style={{background:"var(--warm)",border:"1px solid var(--border)"}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div>
                          <div className="an-user-name">{DOC_LABELS[doc.type]??doc.type}</div>
                          <div className="an-user-email">{doc.fileName}</div>
                          {doc.user && <div className="an-user-phone">{doc.user.firstName} {doc.user.lastName} · {ROLE_LABELS[doc.user.role]}</div>}
                        </div>
                      </div>
                      <div className="an-actions">
                        <span className={getBadge(doc.status)}>{STATUS_LABELS[doc.status]}</span>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="an-btn an-btn-ghost" style={{textDecoration:"none",display:"inline-block"}}>Görüntüle</a>
                        {doc.status==="PENDING" && (
                          <>
                            <button className="an-btn an-btn-approve" disabled={actionLoading===doc.id}
                              onClick={()=>act(doc.id,async()=>{await api.patch(`/admin/documents/${doc.id}/approve`);await Promise.all([fetchDocuments(docFilter),fetchStats()]);})}>{actionLoading===doc.id?"...":"Onayla"}</button>
                            <button className="an-btn an-btn-reject" disabled={actionLoading===doc.id}
                              onClick={()=>act(doc.id,async()=>{await api.patch(`/admin/documents/${doc.id}/reject`);await Promise.all([fetchDocuments(docFilter),fetchStats()]);})}>{actionLoading===doc.id?"...":"Reddet"}</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* TAVSİYELER */}
        {activeTab==="nominations" && (
          <>
            <div className="an-filters">
              {[["all","Tümü"],["PENDING","Bekliyor"],["APPROVED","Onaylandı"],["REJECTED","Reddedildi"],["INVITED","Davet Gönderildi"],["REGISTERED","Kayıt Oldu"]].map(([f,l])=>(
                <button key={f} className={`an-filter ${nomFilter===f?"active":""}`} onClick={()=>setNomFilter(f)}>{l}</button>
              ))}
            </div>
            <div className="an-table">
              {nominations.length===0 ? <div className="an-empty">Tavsiye bulunamadı.</div> :
                nominations.map(nom=>(
                  <div key={nom.id} className="an-row">
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div className="an-user-info" style={{alignItems:"flex-start"}}>
                        <div className="an-avatar">{nom.candidateName[0]}</div>
                        <div>
                          <div className="an-user-name">{nom.candidateName}</div>
                          <div className="an-user-email">{nom.candidateEmail} · {nom.candidatePhone}</div>
                          <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                            <span className="an-role-tag" style={{fontSize:"8px"}}>{ROLE_LABELS[nom.candidateRole]}</span>
                            <span className={getBadge(nom.status)}>{STATUS_LABELS[nom.status]}</span>
                          </div>
                          {nom.note && <div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic",marginTop:8}}>"{nom.note}"</div>}
                          {nom.adminNote && <div style={{fontSize:10,color:"#B8860B",marginTop:4}}>📝 {nom.adminNote}</div>}
                          <div style={{fontSize:10,color:"#B8B2A8",marginTop:6}}>Öneren: {nom.nominator.firstName} {nom.nominator.lastName} · {new Date(nom.createdAt).toLocaleDateString("tr-TR")}</div>
                        </div>
                      </div>
                      <div className="an-actions">
                        <button className="an-btn an-btn-ghost" onClick={()=>{setNoteModal({type:"nomination",id:nom.id});setNoteText(nom.adminNote||"");}}>Not</button>
                        {nom.status==="PENDING" && (
                          <>
                            <button className="an-btn an-btn-approve" disabled={actionLoading===nom.id}
                              onClick={()=>act(nom.id,async()=>{await api.patch(`/admin/nominations/${nom.id}/status`,{status:"APPROVED"});await Promise.all([fetchNominations(nomFilter),fetchStats()]);})}>{actionLoading===nom.id?"...":"Onayla"}</button>
                            <button className="an-btn an-btn-reject" disabled={actionLoading===nom.id}
                              onClick={()=>act(nom.id,async()=>{await api.patch(`/admin/nominations/${nom.id}/status`,{status:"REJECTED"});await Promise.all([fetchNominations(nomFilter),fetchStats()]);})}>{actionLoading===nom.id?"...":"Reddet"}</button>
                          </>
                        )}
                        {nom.status==="APPROVED" && (
                          <button className="an-btn an-btn-navy" disabled={actionLoading===nom.id}
                            onClick={()=>act(nom.id,async()=>{await api.patch(`/admin/nominations/${nom.id}/status`,{status:"INVITED"});await Promise.all([fetchNominations(nomFilter),fetchStats()]);})}>{actionLoading===nom.id?"...":"Davet Gönderildi"}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* BAŞVURULAR */}
        {activeTab==="applications" && (
          <>
            <div className="an-filters">
              {[["all","Tümü"],["PENDING","Bekliyor"],["APPROVED","Onaylandı"],["REJECTED","Reddedildi"],["INVITED","Davet Gönderildi"],["REGISTERED","Kayıt Oldu"]].map(([f,l])=>(
                <button key={f} className={`an-filter ${appFilter===f?"active":""}`} onClick={()=>setAppFilter(f)}>{l}</button>
              ))}
            </div>
            <div className="an-table">
              {applications.length===0 ? <div className="an-empty">Başvuru bulunamadı.</div> :
                applications.map(app=>(
                  <div key={app.id} className="an-row">
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                      <div className="an-user-info" style={{alignItems:"flex-start"}}>
                        <div className="an-avatar" style={{background:"#3D1A1A",color:"#F5A0A0"}}>{app.applicantName[0]}</div>
                        <div>
                          <div className="an-user-name">{app.applicantName}</div>
                          <div className="an-user-email">{app.applicantEmail} · {app.applicantPhone}</div>
                          <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                            <span className="an-role-tag" style={{fontSize:"8px"}}>{ROLE_LABELS[app.requestedRole]}</span>
                            <span className={getBadge(app.status)}>{STATUS_LABELS[app.status]}</span>
                            {app.referrer && <span style={{fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:"#2D6A4F",border:"1px solid #2D6A4F",padding:"4px 10px"}}>Referanslı</span>}
                          </div>
                          {app.message && <div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic",marginTop:8}}>"{app.message}"</div>}
                          {app.adminNote && <div style={{fontSize:10,color:"#B8860B",marginTop:4}}>📝 {app.adminNote}</div>}
                          {app.referrer && <div style={{fontSize:10,color:"#B8B2A8",marginTop:4}}>Referans: {app.referrer.firstName} {app.referrer.lastName}</div>}
                          <div style={{fontSize:10,color:"#B8B2A8",marginTop:4}}>{new Date(app.createdAt).toLocaleDateString("tr-TR")}</div>
                        </div>
                      </div>
                      <div className="an-actions">
                        <button className="an-btn an-btn-ghost" onClick={()=>{setNoteModal({type:"application",id:app.id});setNoteText(app.adminNote||"");}}>Not</button>
                        {app.status==="PENDING" && (
                          <>
                            <button className="an-btn an-btn-approve" disabled={actionLoading===app.id}
                              onClick={()=>act(app.id,async()=>{await api.patch(`/admin/applications/${app.id}/status`,{status:"APPROVED"});await Promise.all([fetchApplications(appFilter),fetchStats()]);})}>{actionLoading===app.id?"...":"Onayla"}</button>
                            <button className="an-btn an-btn-reject" disabled={actionLoading===app.id}
                              onClick={()=>act(app.id,async()=>{await api.patch(`/admin/applications/${app.id}/status`,{status:"REJECTED"});await Promise.all([fetchApplications(appFilter),fetchStats()]);})}>{actionLoading===app.id?"...":"Reddet"}</button>
                          </>
                        )}
                        {app.status==="APPROVED" && (
                          <button className="an-btn an-btn-navy" disabled={actionLoading===app.id}
                            onClick={()=>act(app.id,async()=>{await api.patch(`/admin/applications/${app.id}/status`,{status:"INVITED"});await Promise.all([fetchApplications(appFilter),fetchStats()]);})}>{actionLoading===app.id?"...":"Davet Gönderildi"}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* LINA LEADS */}
        {activeTab==="leads" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontFamily:"var(--serif)",fontSize:14,color:"var(--muted)",fontStyle:"italic"}}>{leads.length} lead toplandı</span>
              </div>
              <button className="an-btn an-btn-ghost" onClick={fetchLeads}>Yenile</button>
            </div>
            <div className="an-table">
              {leads.length===0 ? <div className="an-empty">Henüz Lina'dan lead gelmedi.</div> :
                leads.map(lead=>(
                  <div key={lead.id} className="an-lead-row">
                    <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                      <div className="an-avatar" style={{background:"#3D0A1E",color:"#F5A0B8",flexShrink:0}}>
                        {lead.fullName?lead.fullName[0].toUpperCase():"?"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <span className="an-user-name">{lead.fullName||"İsimsiz"}</span>
                          <span style={{fontSize:8,letterSpacing:1.5,textTransform:"uppercase",border:"1px solid #F5A0B8",color:"#C0394F",padding:"3px 8px"}}>Lina</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 24px"}}>
                          {lead.phone && <span className="an-user-email">📞 {lead.phone}</span>}
                          {lead.email && <span className="an-user-email">✉️ {lead.email}</span>}
                          {lead.profession && <span className="an-user-email">💼 {lead.profession}</span>}
                          {lead.city && <span className="an-user-email">📍 {lead.city}</span>}
                          {lead.interest && <span className="an-user-email" style={{gridColumn:"span 2"}}>🎯 {lead.interest}</span>}
                        </div>
                        <div style={{fontSize:10,color:"#B8B2A8",marginTop:8}}>
                          {new Date(lead.createdAt).toLocaleDateString("tr-TR")} · {new Date(lead.createdAt).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                        {lead.conversation && (
                          <>
                            <button className="an-conv-toggle" onClick={()=>setExpandedLead(expandedLead===lead.id?null:lead.id)}>
                              {expandedLead===lead.id?"▲ Konuşmayı Gizle":"▼ Konuşmayı Gör"}
                            </button>
                            {expandedLead===lead.id && (
                              <div className="an-lead-conv">
                                {(()=>{try{const msgs=JSON.parse(lead.conversation);return msgs.map((m:{role:string;content:string},i:number)=>(
                                  <div key={i} className={`an-conv-msg ${m.role}`}>
                                    <div className={`an-conv-bubble ${m.role}`}>{m.content}</div>
                                  </div>
                                ));}catch{return <p style={{fontSize:11,color:"var(--muted)"}}>{lead.conversation}</p>;}})()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

      </main>
    </>
  );
}