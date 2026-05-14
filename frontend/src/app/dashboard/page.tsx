"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin",
};

interface Nomination {
  id: string; candidateName: string; candidateEmail: string;
  candidatePhone: string; candidateRole: string;
  note?: string; status: string; createdAt: string;
}

const NOM_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "İnceleniyor", color: "#B8860B" },
  APPROVED: { label: "Onaylandı", color: "#2D6A4F" },
  REJECTED: { label: "Reddedildi", color: "#C0392B" },
  INVITED: { label: "Davet Gönderildi", color: "#1A4A7A" },
  REGISTERED: { label: "Katıldı", color: "#6B3FA0" },
};

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [showNomForm, setShowNomForm] = useState(false);
  const [nomLoading, setNomLoading] = useState(false);
  const [nomSuccess, setNomSuccess] = useState(false);
  const [nomError, setNomError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [nomForm, setNomForm] = useState({ candidateName: "", candidateEmail: "", candidatePhone: "", candidateRole: "EMLAKCI", note: "" });

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !user) router.push("/giris");
    if (hydrated && user?.isApproved) fetchMyNominations();
  }, [hydrated, user]);

  const fetchMyNominations = async () => {
    try { const r = await api.get("/nominations/my"); setNominations(r.data); } catch {}
  };

  const handleNomSubmit = async () => {
    if (!nomForm.candidateName || !nomForm.candidateEmail || !nomForm.candidatePhone) {
      setNomError("Ad, email ve telefon zorunludur."); return;
    }
    setNomLoading(true); setNomError("");
    try {
      await api.post("/nominations", nomForm);
      setNomSuccess(true);
      setNomForm({ candidateName: "", candidateEmail: "", candidatePhone: "", candidateRole: "EMLAKCI", note: "" });
      setShowNomForm(false);
      await fetchMyNominations();
      setTimeout(() => setNomSuccess(false), 4000);
    } catch (e: any) {
      setNomError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally { setNomLoading(false); }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!hydrated || !user) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const referralLink = user.referralCode ? `https://emlakportfoyhavuzu.com/kayit?davet=${user.referralCode}` : null;
  const remainingQuota = 10 - nominations.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
          --text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'DM Sans',system-ui,sans-serif;
        }
        body{font-family:var(--sans);background:var(--warm);color:var(--text);}
        .db-root{min-height:100vh;display:grid;grid-template-rows:auto 1fr;}
        
        /* NAV */
        .db-nav{
          height:68px;background:#fff;border-bottom:1px solid var(--border);
          display:flex;align-items:center;justify-content:space-between;
          padding:0 48px;position:sticky;top:0;z-index:100;
        }
        @media(max-width:768px){.db-nav{padding:0 20px;}}
        .db-nav-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .db-nav-logo img{width:34px;height:34px;object-fit:contain;}
        .db-nav-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
        .db-nav-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
        .db-nav-links{display:flex;align-items:center;gap:4px;}
        @media(max-width:768px){.db-nav-links .db-nav-lbl{display:none;}}
        .db-nav-item{
          display:flex;align-items:center;gap:8px;padding:8px 16px;
          font-size:11px;letter-spacing:1.5px;text-transform:uppercase;
          color:var(--muted);text-decoration:none;transition:all 0.2s;
          border-bottom:2px solid transparent;font-weight:400;
        }
        .db-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
        .db-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
        .db-nav-right{display:flex;align-items:center;gap:12px;}
        .db-nav-user{
          display:flex;align-items:center;gap:10px;
          font-size:12px;color:var(--muted);font-weight:300;
        }
        .db-nav-avatar{
          width:32px;height:32px;background:var(--navy);
          display:flex;align-items:center;justify-content:center;
          font-family:var(--serif);font-size:14px;color:var(--cream);font-weight:400;
        }
        .db-nav-logout{
          font-size:10px;letter-spacing:2px;text-transform:uppercase;
          color:var(--muted);background:none;border:1px solid var(--border);
          padding:7px 14px;cursor:pointer;font-family:var(--sans);
          transition:all 0.2s;
        }
        .db-nav-logout:hover{border-color:var(--navy);color:var(--navy);}

        /* MAIN */
        .db-main{padding:48px 48px 80px;max-width:1200px;margin:0 auto;width:100%;}
        @media(max-width:768px){.db-main{padding:32px 20px;}}

        /* HEADER */
        .db-header{margin-bottom:48px;padding-bottom:40px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px;}
        @media(max-width:768px){.db-header{grid-template-columns:1fr;}}
        .db-greeting{font-family:var(--serif);font-size:clamp(32px,4vw,48px);font-weight:300;color:var(--navy);line-height:1.1;letter-spacing:-0.5px;}
        .db-greeting em{font-style:italic;color:var(--gold);}
        .db-greeting-sub{font-size:13px;color:var(--muted);margin-top:8px;font-weight:300;}
        .db-status{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;}
        .db-status-dot{width:6px;height:6px;border-radius:50%;}
        .db-role-tag{font-size:9px;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--border);padding:5px 12px;color:var(--navy);font-weight:500;}

        /* CARDS GRID */
        .db-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);margin-bottom:48px;}
        @media(max-width:768px){.db-cards{grid-template-columns:1fr;}}
        .db-card{
          background:#fff;padding:36px 32px;
          display:flex;flex-direction:column;
          cursor:pointer;text-decoration:none;
          transition:background 0.3s;position:relative;overflow:hidden;
        }
        .db-card::before{
          content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
          background:var(--gold);transform:scaleX(0);transform-origin:left;
          transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .db-card:hover{background:var(--warm);}
        .db-card:hover::before{transform:scaleX(1);}
        .db-card-disabled{background:#FAFAF8;opacity:0.5;cursor:not-allowed;}
        .db-card-disabled::before{display:none;}
        .db-card-icon{width:40px;height:40px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin-bottom:24px;}
        .db-card-num{font-family:var(--serif);font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:8px;}
        .db-card-title{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--navy);margin-bottom:8px;}
        .db-card-desc{font-size:12px;color:var(--muted);font-weight:300;line-height:1.6;}

        /* REFERANS */
        .db-ref{background:#fff;border:1px solid var(--border);padding:36px;margin-bottom:32px;}
        .db-ref-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;}
        .db-ref-title{font-family:var(--serif);font-size:24px;font-weight:400;color:var(--navy);}
        .db-ref-sub{font-size:12px;color:var(--muted);font-weight:300;margin-top:4px;}
        .db-ref-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        @media(max-width:768px){.db-ref-grid{grid-template-columns:1fr;}}
        .db-ref-box{background:var(--warm);border:1px solid var(--border);padding:20px 24px;}
        .db-ref-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
        .db-ref-value{font-family:var(--serif);font-size:24px;font-weight:400;color:var(--gold);letter-spacing:2px;margin-bottom:12px;}
        .db-ref-link{font-size:11px;color:var(--muted);font-weight:300;word-break:break-all;margin-bottom:12px;}
        .db-ref-copy{
          font-size:9px;letter-spacing:2px;text-transform:uppercase;
          background:none;border:1px solid var(--border);padding:7px 14px;
          cursor:pointer;font-family:var(--sans);color:var(--navy);
          transition:all 0.2s;display:flex;align-items:center;gap:6px;
        }
        .db-ref-copy:hover{border-color:var(--navy);background:var(--navy);color:var(--cream);}

        /* NOMİNATION */
        .db-nom{background:#fff;border:1px solid var(--border);padding:36px;}
        .db-nom-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
        .db-nom-title{font-family:var(--serif);font-size:24px;font-weight:400;color:var(--navy);}
        .db-nom-quota{font-size:11px;color:var(--muted);font-weight:300;margin-top:4px;}
        .db-nom-btn{
          font-size:9px;letter-spacing:2px;text-transform:uppercase;
          background:var(--navy);color:var(--cream);border:none;
          padding:10px 20px;cursor:pointer;font-family:var(--sans);
          transition:all 0.3s;position:relative;overflow:hidden;
        }
        .db-nom-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
        .db-nom-btn:hover::before{left:0;}
        .db-nom-btn:hover{color:var(--navy);}
        .db-nom-btn span{position:relative;z-index:1;}

        /* NOM FORM */
        .db-nom-form{background:var(--warm);border:1px solid var(--border);padding:32px;margin-bottom:24px;animation:fadeUp 0.3s ease;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .db-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
        @media(max-width:768px){.db-form-grid{grid-template-columns:1fr;}}
        .db-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:10px;font-weight:500;}
        .db-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;font-weight:300;}
        .db-input:focus{border-bottom-color:var(--navy);}
        .db-select{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;}
        .db-textarea{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;resize:none;font-weight:300;}
        .db-form-actions{display:flex;gap:12px;margin-top:24px;}
        .db-form-submit{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 24px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
        .db-form-submit:hover{background:#1a3060;}
        .db-form-cancel{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:12px 20px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;}
        .db-form-cancel:hover{border-color:var(--navy);color:var(--navy);}
        .db-form-error{font-size:11px;color:#C0392B;margin-top:12px;}

        /* NOM LIST */
        .db-nom-list{display:flex;flex-direction:column;gap:1px;background:var(--border);}
        .db-nom-item{background:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
        .db-nom-item:hover{background:var(--warm);}
        .db-nom-avatar{width:36px;height:36px;background:var(--navy);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:16px;color:var(--cream);flex-shrink:0;}
        .db-nom-name{font-size:14px;font-weight:400;color:var(--navy);}
        .db-nom-email{font-size:11px;color:var(--muted);font-weight:300;}
        .db-nom-date{font-size:10px;color:var(--muted);font-weight:300;}

        /* SUCCESS */
        .db-success{background:#F0FAF4;border-left:3px solid #2D6A4F;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:13px;color:#2D6A4F;font-weight:300;}

        /* UYARI */
        .db-warning{background:#FFFBF0;border-left:3px solid var(--gold);padding:16px 20px;margin-bottom:32px;display:flex;align-items:flex-start;gap:12px;}
        .db-warning-text{font-size:13px;color:#7A6020;font-weight:300;line-height:1.6;}
        .db-warning-title{font-size:13px;color:#5A4010;font-weight:500;margin-bottom:4px;}
      `}</style>

      <div className="db-root">
        {/* NAV */}
        <nav className="db-nav">
          <a href="/dashboard" className="db-nav-logo">
            <img src="/LOGO_EPH.png" alt="EPH" />
            <div>
              <div className="db-nav-logo-text">EPH Platform</div>
              <div className="db-nav-logo-sub">Emlak Portföy Havuzu</div>
            </div>
          </a>
          <div className="db-nav-links">
            <Link href="/dashboard" className="db-nav-item active"><span className="db-nav-lbl">Ana Sayfa</span></Link>
            <Link href="/profil" className="db-nav-item"><span className="db-nav-lbl">Profilim</span></Link>
            <Link href="/stok" className="db-nav-item"><span className="db-nav-lbl">Stok</span></Link>
            {user.role === "ADMIN" && <Link href="/admin" className="db-nav-item"><span className="db-nav-lbl">Admin</span></Link>}
          </div>
          <div className="db-nav-right">
            <div className="db-nav-user">
              <div className="db-nav-avatar">{user.firstName[0]}</div>
              <span style={{ display: "none" }}>{user.firstName}</span>
            </div>
            <button className="db-nav-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
          </div>
        </nav>

        <main className="db-main">

          {/* HEADER */}
          <div className="db-header">
            <div>
              <h1 className="db-greeting">
                Hoş geldin,<br />
                <em>{user.firstName} {user.lastName}</em>
              </h1>
              <p className="db-greeting-sub">{user.email}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <span className="db-role-tag">{ROLE_LABELS[user.role]}</span>
              <div className="db-status">
                <div className="db-status-dot" style={{ background: user.isApproved ? "#2D6A4F" : "#B8860B" }} />
                <span style={{ fontSize: 10, color: user.isApproved ? "#2D6A4F" : "#B8860B", letterSpacing: 1.5 }}>
                  {user.isApproved ? "Hesap Onaylı" : "Onay Bekleniyor"}
                </span>
              </div>
            </div>
          </div>

          {/* UYARI */}
          {!user.isApproved && (
            <div className="db-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <div className="db-warning-title">Hesabınız onay bekliyor</div>
                <div className="db-warning-text">Profilinize giderek mesleki belgelerinizi yükleyin ve admin onayını hızlandırın.</div>
              </div>
            </div>
          )}

          {/* KARTLAR */}
          <div className="db-cards">
            <Link href="/profil" className="db-card">
              <div className="db-card-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="db-card-num">01</div>
              <div className="db-card-title">Profilim</div>
              <div className="db-card-desc">Bilgilerini güncelle, mesleki belgelerini yükle</div>
            </Link>

            <Link href="/stok" className="db-card">
              <div className="db-card-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="1"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div className="db-card-num">02</div>
              <div className="db-card-title">Stok Yönetimi</div>
              <div className="db-card-desc">Proje ve daire yönetimi, gerçek zamanlı takip</div>
            </Link>

            {user.role === "ADMIN" ? (
              <Link href="/admin" className="db-card">
                <div className="db-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <div className="db-card-num">03</div>
                <div className="db-card-title">Admin Paneli</div>
                <div className="db-card-desc">Üye ve belge yönetimi</div>
              </Link>
            ) : (
              <div className="db-card db-card-disabled">
                <div className="db-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4CEC4" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div className="db-card-num" style={{ color: "#D4CEC4" }}>03</div>
                <div className="db-card-title" style={{ color: "#D4CEC4" }}>CRM Modülü</div>
                <div className="db-card-desc">Yakında geliyor...</div>
              </div>
            )}
          </div>

          {/* REFERANS KODU */}
          {user.isApproved && user.role !== "ADMIN" && user.referralCode && (
            <div className="db-ref">
              <div className="db-ref-header">
                <div>
                  <div className="db-ref-title">Referans Kodunuz</div>
                  <div className="db-ref-sub">Tanıdıklarınızı platforma davet edin</div>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, color: "var(--muted)", letterSpacing: 1 }}>
                  Aktif
                </div>
              </div>
              <div className="db-ref-grid">
                <div className="db-ref-box">
                  <div className="db-ref-label">Referans Kodunuz</div>
                  <div className="db-ref-value">{user.referralCode}</div>
                  <button className="db-ref-copy" onClick={() => handleCopy(user.referralCode!, "code")}>
                    {copied === "code" ? (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Kopyalandı</>
                    ) : (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Kopyala</>
                    )}
                  </button>
                </div>
                <div className="db-ref-box">
                  <div className="db-ref-label">Davet Linkiniz</div>
                  <div className="db-ref-link">{referralLink}</div>
                  <button className="db-ref-copy" onClick={() => handleCopy(referralLink!, "link")}>
                    {copied === "link" ? (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Kopyalandı</>
                    ) : (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Kopyala</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAVSİYE ET */}
          {user.isApproved && user.role !== "ADMIN" && (
            <div className="db-nom">
              <div className="db-nom-header">
                <div>
                  <div className="db-nom-title">Tanıdık Öner</div>
                  <div className="db-nom-quota">Kalan hak: {remainingQuota}/10</div>
                </div>
                {remainingQuota > 0 && (
                  <button className="db-nom-btn" onClick={() => { setShowNomForm(v => !v); setNomError(""); }}>
                    <span>{showNomForm ? "İptal" : "+ Tavsiye Et"}</span>
                  </button>
                )}
              </div>

              {nomSuccess && (
                <div className="db-success">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Tavsiyeniz iletildi. Admin en kısa sürede inceleyecek.
                </div>
              )}

              {showNomForm && (
                <div className="db-nom-form">
                  <div className="db-form-grid">
                    <div className="db-field">
                      <label>Ad Soyad *</label>
                      <input className="db-input" placeholder="Ahmet Yılmaz" value={nomForm.candidateName} onChange={e => setNomForm(f => ({ ...f, candidateName: e.target.value }))} />
                    </div>
                    <div className="db-field">
                      <label>E-posta *</label>
                      <input className="db-input" placeholder="ahmet@example.com" value={nomForm.candidateEmail} onChange={e => setNomForm(f => ({ ...f, candidateEmail: e.target.value }))} />
                    </div>
                    <div className="db-field">
                      <label>Telefon *</label>
                      <input className="db-input" placeholder="+90 555 000 00 00" value={nomForm.candidatePhone} onChange={e => setNomForm(f => ({ ...f, candidatePhone: e.target.value }))} />
                    </div>
                    <div className="db-field">
                      <label>Rol</label>
                      <select className="db-select" value={nomForm.candidateRole} onChange={e => setNomForm(f => ({ ...f, candidateRole: e.target.value }))}>
                        <option value="EMLAKCI">Emlakçı</option>
                        <option value="MUTEAHHIT">Müteahhit</option>
                        <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                      </select>
                    </div>
                  </div>
                  <div className="db-field">
                    <label>Neden öneriyorsunuz? (isteğe bağlı)</label>
                    <textarea className="db-textarea" rows={2} placeholder="Bu kişiyi tanıyorum, sektörde deneyimli bir profesyonel..." value={nomForm.note} onChange={e => setNomForm(f => ({ ...f, note: e.target.value }))} />
                  </div>
                  {nomError && <div className="db-form-error">{nomError}</div>}
                  <div className="db-form-actions">
                    <button className="db-form-submit" onClick={handleNomSubmit} disabled={nomLoading}>
                      {nomLoading ? "Gönderiliyor..." : "Tavsiyeyi Gönder"}
                    </button>
                    <button className="db-form-cancel" onClick={() => { setShowNomForm(false); setNomError(""); }}>İptal</button>
                  </div>
                </div>
              )}

              {nominations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "var(--muted)", fontStyle: "italic", marginBottom: 8 }}>Henüz tavsiyeniz yok</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 300 }}>Platforma değer katacak profesyonelleri önerin</div>
                </div>
              ) : (
                <div className="db-nom-list" style={{ borderTop: "1px solid var(--border)", marginTop: 8 }}>
                  {nominations.map(nom => (
                    <div key={nom.id} className="db-nom-item">
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="db-nom-avatar">{nom.candidateName[0]}</div>
                        <div>
                          <div className="db-nom-name">{nom.candidateName}</div>
                          <div className="db-nom-email">{nom.candidateEmail}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: NOM_STATUS[nom.status]?.color || "var(--muted)", fontWeight: 500 }}>
                          {NOM_STATUS[nom.status]?.label || nom.status}
                        </div>
                        <div className="db-nom-date">{new Date(nom.createdAt).toLocaleDateString("tr-TR")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}