"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

const DOC_TYPES = [
  { value: "VERGI_LEVHASI", label: "Vergi Levhası" },
  { value: "YETKI_BELGESI", label: "Yetki Belgesi" },
  { value: "TICARET_SICIL", label: "Ticaret Sicil" },
  { value: "KIMLIK", label: "Kimlik" },
  { value: "DIGER", label: "Diğer" },
];

const DOC_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: "İncelemede", color: "#B8860B", bg: "#FFFBF0" },
  APPROVED: { label: "Onaylandı",  color: "#2D6A4F", bg: "#F0FAF4" },
  REJECTED: { label: "Reddedildi", color: "#C0392B", bg: "#FEF0EE" },
};

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin",
};

interface Profile {
  id: string; firstName: string; lastName: string;
  email: string; phone: string; role: string; isApproved: boolean;
  documents: { id: string; type: string; status: string; fileUrl: string; fileName: string; createdAt: string }[];
}

interface TrustScore {
  score: number; badge: string; badgeColor: string;
  breakdown: { documentScore: number; seniorityScore: number; portfolioScore: number; activityScore: number; profileScore: number; approvalScore: number };
  details: { approvedDocs: number; totalDocs: number; daysSinceJoined: number; unitCount: number; customerCount: number; activityCount: number; profileComplete: boolean };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;--text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;--serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}
.pr-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.pr-nav{padding:0 20px;}}
.pr-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.pr-logo img{width:34px;height:34px;object-fit:contain;}
.pr-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.pr-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.pr-nav-links{display:flex;align-items:center;gap:4px;}
.pr-nav-item{padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.pr-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.pr-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.pr-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.pr-logout:hover{border-color:var(--navy);color:var(--navy);}
.pr-main{max-width:800px;margin:0 auto;padding:56px 48px 100px;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.pr-main{padding:32px 20px;}}
.pr-header{margin-bottom:48px;padding-bottom:40px;border-bottom:1px solid var(--border);}
.pr-title{font-family:var(--serif);font-size:clamp(36px,4vw,52px);font-weight:300;color:var(--navy);letter-spacing:-0.5px;line-height:1.1;}
.pr-title em{font-style:italic;color:var(--gold);}
.pr-sub{font-size:13px;color:var(--muted);margin-top:8px;font-weight:300;}
.pr-card{background:#fff;border:1px solid var(--border);margin-bottom:24px;}
.pr-card-header{padding:32px 36px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:20px;}
@media(max-width:600px){.pr-card-header{flex-direction:column;align-items:flex-start;}}
.pr-avatar{width:56px;height:56px;background:var(--navy);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--cream);font-weight:400;flex-shrink:0;}
.pr-user-name{font-family:var(--serif);font-size:24px;font-weight:400;color:var(--navy);margin-bottom:4px;}
.pr-user-email{font-size:12px;color:var(--muted);font-weight:300;}
.pr-user-meta{display:flex;align-items:center;gap:12px;margin-top:8px;}
.pr-role-tag{font-size:8px;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--border);padding:4px 12px;color:var(--navy);}
.pr-status{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase;}
.pr-status-dot{width:5px;height:5px;border-radius:50%;}
.pr-edit-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:8px 16px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;flex-shrink:0;}
.pr-edit-btn:hover{border-color:var(--navy);color:var(--navy);}
.pr-edit-btn.active{border-color:var(--navy);background:var(--navy);color:var(--cream);}
.pr-card-body{padding:32px 36px;}
.pr-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
@media(max-width:600px){.pr-grid{grid-template-columns:1fr;}}
.pr-field{margin-bottom:0;}
.pr-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;font-weight:500;}
.pr-field-value{font-size:14px;color:var(--navy);padding:10px 0;border-bottom:1.5px solid var(--border);font-weight:300;}
.pr-field-value.muted{color:var(--muted);}
.pr-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;font-weight:300;}
.pr-input:focus{border-bottom-color:var(--navy);}
.pr-save-btn{margin-top:32px;width:100%;background:var(--navy);color:var(--cream);border:none;padding:14px;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:var(--sans);cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden;}
.pr-save-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.pr-save-btn:hover::before{left:0;}
.pr-save-btn:hover{color:var(--navy);}
.pr-save-btn span{position:relative;z-index:1;}
.pr-save-btn:disabled{opacity:0.4;cursor:not-allowed;}
.pr-save-btn:disabled::before{display:none;}
.pr-success{background:#F0FAF4;border-left:3px solid #2D6A4F;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px;font-size:12px;color:#2D6A4F;font-weight:300;}
.pr-error{background:#FEF0EE;border-left:3px solid #C0392B;padding:14px 18px;margin-top:16px;font-size:12px;color:#C0392B;font-weight:300;}
.pr-upload-card{background:#fff;border:1px solid var(--border);margin-bottom:24px;}
.pr-upload-header{padding:24px 36px;border-bottom:1px solid var(--border);}
.pr-upload-title{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--navy);margin-bottom:4px;}
.pr-upload-sub{font-size:11px;color:var(--muted);font-weight:300;}
.pr-upload-body{padding:24px 36px;display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;}
.pr-select{background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;min-width:200px;}
.pr-upload-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 22px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;display:flex;align-items:center;gap:8px;white-space:nowrap;}
.pr-upload-btn:hover{background:#1a3060;}
.pr-docs-card{background:#fff;border:1px solid var(--border);margin-bottom:24px;}
.pr-docs-header{padding:24px 36px;border-bottom:1px solid var(--border);}
.pr-docs-title{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--navy);}
.pr-docs-list{padding:0;}
.pr-doc-item{padding:20px 36px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:16px;transition:background 0.2s;}
.pr-doc-item:hover{background:var(--warm);}
.pr-doc-item:last-child{border-bottom:none;}
.pr-doc-icon{width:36px;height:36px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.pr-doc-name{font-size:13px;color:var(--navy);font-weight:400;margin-bottom:3px;}
.pr-doc-file{font-size:10px;color:var(--muted);font-weight:300;}
.pr-doc-status{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid;padding:4px 10px;font-weight:500;}
.pr-doc-view{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--navy);text-decoration:none;border:1px solid var(--border);padding:6px 14px;transition:all 0.2s;}
.pr-doc-view:hover{border-color:var(--navy);background:var(--navy);color:var(--cream);}
.pr-docs-empty{padding:60px 36px;text-align:center;}
.pr-docs-empty-text{font-family:var(--serif);font-size:18px;font-style:italic;color:var(--muted);margin-bottom:6px;}
.pr-docs-empty-sub{font-size:12px;color:#B8B2A8;font-weight:300;}
.trust-card{background:var(--navy);margin-bottom:24px;overflow:hidden;position:relative;}
.trust-card::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:rgba(201,168,76,0.05);}
.trust-header{padding:32px 36px 24px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;}
.trust-title{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(245,243,239,0.5);margin-bottom:8px;}
.trust-badge{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--gold);}
.trust-score-wrap{text-align:right;}
.trust-score-num{font-family:var(--serif);font-size:56px;font-weight:300;color:#fff;line-height:1;}
.trust-score-max{font-size:11px;color:rgba(245,243,239,0.4);margin-top:4px;}
.trust-bar-wrap{padding:0 36px 28px;}
.trust-bar-bg{height:3px;background:rgba(255,255,255,0.1);}
.trust-bar-fill{height:3px;background:var(--gold);transition:width 1s ease;}
.trust-breakdown{padding:0 36px 28px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.05);}
.trust-item{background:rgba(255,255,255,0.02);padding:14px 16px;}
.trust-item-label{font-size:7px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,243,239,0.4);margin-bottom:6px;}
.trust-item-val{font-family:var(--serif);font-size:20px;font-weight:300;color:#fff;}
.trust-item-max{font-size:9px;color:rgba(245,243,239,0.3);}
.trust-details{padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:20px;flex-wrap:wrap;}
.trust-detail-item{display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(245,243,239,0.6);}
.trust-detail-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);flex-shrink:0;}
.trust-tip{padding:16px 36px;background:rgba(201,168,76,0.08);border-top:1px solid rgba(201,168,76,0.15);}
.trust-tip-text{font-size:11px;color:rgba(201,168,76,0.8);line-height:1.6;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
`;

export default function ProfilPage() {
  const { user, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("VERGI_LEVHASI");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchAll();
  }, [hydrated, user]);

  const fetchAll = async () => {
    try {
      const [profileRes, trustRes] = await Promise.all([
        api.get("/profile"),
        api.get("/trust/my"),
      ]);
      setProfile(profileRes.data);
      setForm({ firstName: profileRes.data.firstName, lastName: profileRes.data.lastName, phone: profileRes.data.phone });
      setTrustScore(trustRes.data);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaveLoading(true); setSaveSuccess(false);
    try {
      const res = await api.patch("/profile", form);
      setProfile(prev => prev ? { ...prev, ...res.data } : prev);
      setAuth({ ...user!, ...res.data }, localStorage.getItem("token")!);
      setEditMode(false); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally { setSaveLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true); setUploadError(""); setUploadSuccess(false);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selectedDocType);
    try {
      await api.post("/profile/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      fetchAll();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || "Yükleme hatası.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getTip = (score: number) => {
    if (score < 20) return "Hesabınızı onaylayın ve belge yükleyerek skorunuzu artırın.";
    if (score < 40) return "Mesleki belgelerinizi yükleyin ve portföy ekleyerek skorunuzu güçlendirin.";
    if (score < 60) return "CRM'de müşteri takibi yaparak aktivite skorunuzu artırabilirsiniz.";
    if (score < 80) return "Harika! Daha fazla onaylı belge ile Elite Network'e ulaşabilirsiniz.";
    return "Tebrikler! Platform'un en güvenilir üyeleri arasındasınız.";
  };

  if (!hydrated || loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <nav className="pr-nav">
        <a href="/dashboard" className="pr-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="pr-logo-text">EPH Platform</div>
            <div className="pr-logo-sub">Emlak Portföy Havuzu</div>
          </div>
        </a>
        <div className="pr-nav-links">
          <Link href="/dashboard" className="pr-nav-item">Ana Sayfa</Link>
          <Link href="/profil" className="pr-nav-item active">Profilim</Link>
          <Link href="/stok" className="pr-nav-item">Stok</Link>
          <Link href="/crm" className="pr-nav-item">CRM</Link>
          {user?.role === "ADMIN" && <Link href="/admin" className="pr-nav-item">Admin</Link>}
        </div>
        <button className="pr-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
      </nav>

      <main className="pr-main">
        <div className="pr-header">
          <h1 className="pr-title">Profilim<br /><em style={{ fontSize: "0.7em" }}>Hesap Yönetimi</em></h1>
          <p className="pr-sub">Kişisel bilgilerinizi güncelleyin ve belgelerinizi yönetin</p>
        </div>

        {saveSuccess && (
          <div className="pr-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            Profil başarıyla güncellendi.
          </div>
        )}

        {/* GÜVEN SKORU */}
        {trustScore && (
          <div className="trust-card">
            <div className="trust-header">
              <div>
                <div className="trust-title">Güven Skoru</div>
                <div className="trust-badge">{trustScore.badge}</div>
              </div>
              <div className="trust-score-wrap">
                <div className="trust-score-num">{trustScore.score}</div>
                <div className="trust-score-max">/ 100</div>
              </div>
            </div>
            <div className="trust-bar-wrap">
              <div className="trust-bar-bg">
                <div className="trust-bar-fill" style={{ width: `${trustScore.score}%` }} />
              </div>
            </div>
            <div className="trust-breakdown">
              {[
                { label: "Belge", val: trustScore.breakdown.documentScore, max: 25 },
                { label: "Kıdem", val: trustScore.breakdown.seniorityScore, max: 10 },
                { label: "Portföy", val: trustScore.breakdown.portfolioScore, max: 15 },
                { label: "Aktivite", val: trustScore.breakdown.activityScore, max: 10 },
                { label: "Profil", val: trustScore.breakdown.profileScore, max: 10 },
                { label: "Onay", val: trustScore.breakdown.approvalScore, max: 10 },
              ].map(item => (
                <div key={item.label} className="trust-item">
                  <div className="trust-item-label">{item.label}</div>
                  <div className="trust-item-val">{item.val}<span className="trust-item-max">/{item.max}</span></div>
                </div>
              ))}
            </div>
            <div className="trust-details">
              <div className="trust-detail-item"><div className="trust-detail-dot" />{trustScore.details.approvedDocs} onaylı belge</div>
              <div className="trust-detail-item"><div className="trust-detail-dot" />{trustScore.details.unitCount} portföy ilanı</div>
              <div className="trust-detail-item"><div className="trust-detail-dot" />{trustScore.details.daysSinceJoined} gündür aktif</div>
              <div className="trust-detail-item"><div className="trust-detail-dot" />{trustScore.details.customerCount} CRM müşterisi</div>
            </div>
            <div className="trust-tip">
              <div className="trust-tip-text">💡 {getTip(trustScore.score)}</div>
            </div>
          </div>
        )}

        {/* PROFİL KARTI */}
        <div className="pr-card">
          <div className="pr-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div className="pr-avatar">{profile?.firstName[0]}{profile?.lastName[0]}</div>
              <div>
                <div className="pr-user-name">{profile?.firstName} {profile?.lastName}</div>
                <div className="pr-user-email">{profile?.email}</div>
                <div className="pr-user-meta">
                  <span className="pr-role-tag">{ROLE_LABELS[profile?.role || ""]}</span>
                  <div className="pr-status">
                    <div className="pr-status-dot" style={{ background: profile?.isApproved ? "#2D6A4F" : "#B8860B" }} />
                    <span style={{ color: profile?.isApproved ? "#2D6A4F" : "#B8860B" }}>
                      {profile?.isApproved ? "Onaylı" : "Onay Bekliyor"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button className={`pr-edit-btn ${editMode ? "active" : ""}`} onClick={() => setEditMode(!editMode)}>
              {editMode ? "Vazgeç" : "Düzenle"}
            </button>
          </div>
          <div className="pr-card-body">
            <div className="pr-grid">
              <div className="pr-field">
                <label>Ad</label>
                {editMode ? <input className="pr-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /> : <div className="pr-field-value">{profile?.firstName}</div>}
              </div>
              <div className="pr-field">
                <label>Soyad</label>
                {editMode ? <input className="pr-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /> : <div className="pr-field-value">{profile?.lastName}</div>}
              </div>
              <div className="pr-field">
                <label>E-posta</label>
                <div className="pr-field-value muted">{profile?.email}</div>
              </div>
              <div className="pr-field">
                <label>Telefon</label>
                {editMode ? <input className="pr-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /> : <div className="pr-field-value">{profile?.phone}</div>}
              </div>
            </div>
            {editMode && (
              <button className="pr-save-btn" onClick={handleSave} disabled={saveLoading}>
                <span>{saveLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
              </button>
            )}
          </div>
        </div>

        {/* BELGE YÜKLEME */}
        <div className="pr-upload-card">
          <div className="pr-upload-header">
            <div className="pr-upload-title">Belge Yükle</div>
            <div className="pr-upload-sub">PDF, JPG veya PNG — Maksimum 50MB</div>
          </div>
          <div className="pr-upload-body">
            <div>
              <label style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 10 }}>Belge Türü</label>
              <select className="pr-select" value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <label className="pr-upload-btn" style={{ cursor: uploadLoading ? "not-allowed" : "pointer", opacity: uploadLoading ? 0.5 : 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadLoading ? "Yükleniyor..." : "Dosya Seç"}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploadLoading} style={{ display: "none" }} />
            </label>
          </div>
          {uploadSuccess && (
            <div className="pr-success" style={{ margin: "0 36px 24px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Belge başarıyla yüklendi.
            </div>
          )}
          {uploadError && <div className="pr-error" style={{ margin: "0 36px 24px" }}>{uploadError}</div>}
        </div>

        {/* BELGELERİM */}
        <div className="pr-docs-card">
          <div className="pr-docs-header">
            <div className="pr-docs-title">Belgelerim</div>
          </div>
          {!profile?.documents || profile.documents.length === 0 ? (
            <div className="pr-docs-empty">
              <div className="pr-docs-empty-text">Henüz belge yüklenmedi</div>
              <div className="pr-docs-empty-sub">Onay sürecinizi hızlandırmak için belgelerinizi yükleyin</div>
            </div>
          ) : (
            <div className="pr-docs-list">
              {profile.documents.map(doc => {
                const ds = DOC_STATUS[doc.status] || DOC_STATUS.PENDING;
                return (
                  <div key={doc.id} className="pr-doc-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div className="pr-doc-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div>
                        <div className="pr-doc-name">{DOC_TYPES.find(t => t.value === doc.type)?.label}</div>
                        <div className="pr-doc-file">{doc.fileName}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="pr-doc-status" style={{ borderColor: ds.color, color: ds.color, background: ds.bg }}>{ds.label}</span>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="pr-doc-view">Görüntüle</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}