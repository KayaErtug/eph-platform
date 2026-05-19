"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({ units: 0, projects: 0, customers: 0 });
  const [activeTab, setActiveTab] = useState("Satılık Portföy");

  useEffect(() => {
    if (!user) { router.push("/giris"); return; }
    api.get("/units").then(r => setStats(s => ({ ...s, units: r.data?.length || 0 }))).catch(() => {});
    api.get("/projects").then(r => setStats(s => ({ ...s, projects: r.data?.length || 0 }))).catch(() => {});
    api.get("/crm/customers").then(r => setStats(s => ({ ...s, customers: r.data?.length || 0 }))).catch(() => {});
  }, [user]);

  const TABS = ["Satılık Portföy", "Kiralık Portföy", "Özel Projeler", "Arsa"];

  const CARDS = [
    { title: "Portföyüm", sub: "Düzenle & İstatistikler", icon: "👤", bg: "linear-gradient(135deg,#1a2e4a,#0D2137)", href: "/profil" },
    { title: "İş Ortaklıkları", sub: "CRM & Müşteriler", icon: "🤝", bg: "linear-gradient(135deg,#1a3a2a,#2D6A4F)", href: "/crm" },
    { title: "Piyasa Verileri", sub: "Anlık Analizler", icon: "📈", bg: "linear-gradient(135deg,#3a2a10,#B8943F)", href: "/market" },
    { title: "Lina AI", sub: "Sesli İlan Girişi", icon: "🤖", bg: "linear-gradient(135deg,#0D2137,#1a3c5e)", href: "/stok" },
  ];

  const PRICES = [
    { val: "₺4.400.000", addr: "Pamukkale, Denizli", tag: "Satılık" },
    { val: "₺2.750.000", addr: "Servergazi, Denizli", tag: "Kiralık" },
    { val: "₺6.800.000", addr: "Merkezefendi, Denizli", tag: "Satılık" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .db { min-height: 100vh; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        /* TOP NAV - desktop */
        .db-topnav { background: #fff; border-bottom: 1px solid #E8E4DC; padding: 0 48px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .db-logo { display: flex; align-items: center; gap: 8px; }
        .db-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #B8943F; }
        .db-logo-txt { font-size: 15px; letter-spacing: 3px; font-weight: 700; color: #0D2137; }
        .db-nav-links { display: flex; gap: 4px; }
        .db-nav-link { padding: 8px 16px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8E8E93; cursor: pointer; border-radius: 8px; background: none; border: none; font-family: inherit; transition: all 0.2s; }
        .db-nav-link:hover { color: #0D2137; background: #F5F3EF; }
        .db-nav-link.active { color: #0D2137; font-weight: 600; }
        .db-nav-right { display: flex; align-items: center; gap: 12px; }
        .db-avatar { width: 36px; height: 36px; border-radius: 50%; background: #0D2137; display: flex; align-items: center; justify-content: center; color: #B8943F; font-size: 13px; font-weight: 700; cursor: pointer; }
        .db-logout { font-size: 11px; letter-spacing: 1px; color: #8E8E93; background: none; border: 1px solid #E8E4DC; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .db-logout:hover { border-color: #0D2137; color: #0D2137; }

        /* MOBILE NAV */
        .db-mobile-header { display: none; }
        @media(max-width:768px) {
          .db-topnav { display: none; }
          .db-mobile-header { display: block; background: #F2F2F7; padding: 12px 16px 0; position: sticky; top: 0; z-index: 100; }
          .db-mobile-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .db-mobile-search { display: flex; gap: 8px; margin-bottom: 10px; }
          .db-sbox { flex: 1; background: #fff; border-radius: 12px; border: 0.5px solid #D8D5D0; display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
          .db-sbox-txt { font-size: 13px; color: #AEAEB2; }
          .db-fbtn { width: 40px; height: 40px; background: #fff; border-radius: 12px; border: 0.5px solid #D8D5D0; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; flex-shrink: 0; }
          .db-tabs-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; }
          .db-tabs-row::-webkit-scrollbar { display: none; }
        }

        /* BODY */
        .db-body { padding: 40px 48px 40px; max-width: 1400px; margin: 0 auto; }
        @media(max-width:768px) { .db-body { padding: 0 16px 80px; } }

        /* DESKTOP TABS */
        .db-desktop-tabs { display: flex; gap: 8px; margin-bottom: 32px; }
        @media(max-width:768px) { .db-desktop-tabs { display: none; } }
        .db-dtab { padding: 8px 20px; border-radius: 22px; font-size: 12px; cursor: pointer; font-weight: 500; border: none; font-family: inherit; transition: all 0.2s; }
        .db-dtab.on { background: #0D2137; color: #fff; }
        .db-dtab.off { background: #fff; color: #3C3C3C; border: 1px solid #E8E4DC; }
        .db-dtab.off:hover { border-color: #0D2137; }

        /* GRID */
        .db-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
        @media(max-width:1100px) { .db-grid { grid-template-columns: 1fr; } }

        /* HERO */
        .db-hero { background: #0D2137; border-radius: 24px; padding: 36px; margin-bottom: 24px; }
        .db-hero-tag { display: inline-flex; align-items: center; gap: 6px; border: 0.5px solid rgba(184,148,63,0.5); border-radius: 20px; padding: 4px 14px; margin-bottom: 16px; }
        .db-hero-dot { width: 5px; height: 5px; border-radius: 50%; background: #B8943F; }
        .db-hero-tag-txt { font-size: 9px; letter-spacing: 2px; color: #B8943F; font-weight: 600; }
        .db-hero-title { color: #fff; font-size: 36px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
        .db-hero-title em { color: #B8943F; font-style: italic; }
        .db-hero-sub { color: rgba(255,255,255,0.4); font-size: 13px; margin-bottom: 28px; }
        .db-hero-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .db-hstat { background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; text-align: center; }
        .db-hstat-icon { font-size: 24px; margin-bottom: 8px; }
        .db-hstat-val { color: #fff; font-size: 28px; font-weight: 700; }
        .db-hstat-lbl { color: rgba(255,255,255,0.35); font-size: 10px; letter-spacing: 1.5px; margin-top: 4px; }

        /* PRICES */
        .db-prices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        @media(max-width:768px) { .db-prices { display: flex; overflow-x: auto; gap: 10px; } .db-prices::-webkit-scrollbar { display: none; } }
        .db-pc { background: #fff; border-radius: 16px; border: 1px solid #E8E4DC; padding: 16px 18px; cursor: pointer; transition: all 0.2s; }
        .db-pc:hover { border-color: #B8943F; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .db-pc-tag { font-size: 9px; letter-spacing: 1.5px; color: #B8943F; font-weight: 600; margin-bottom: 6px; }
        .db-pc-val { font-size: 18px; font-weight: 700; color: #0D2137; }
        .db-pc-addr { font-size: 11px; color: #AEAEB2; margin-top: 4px; }

        /* QUICK ACCESS */
        .db-sec-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .db-sec-txt { font-size: 10px; letter-spacing: 2px; color: #8E8E93; font-weight: 600; }
        .db-sec-lnk { font-size: 12px; color: #B8943F; font-weight: 500; cursor: pointer; background: none; border: none; font-family: inherit; }
        .db-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .db-card { border-radius: 20px; overflow: hidden; cursor: pointer; height: 130px; position: relative; transition: transform 0.2s; }
        .db-card:hover { transform: translateY(-3px); }
        .db-card-bg { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: 18px; }
        .db-card-icon { font-size: 32px; position: absolute; top: 16px; right: 16px; opacity: 0.8; }
        .db-card-title { color: #fff; font-size: 14px; font-weight: 600; }
        .db-card-sub { color: rgba(255,255,255,0.55); font-size: 11px; margin-top: 2px; }

        /* SIDEBAR */
        .db-sidebar { display: flex; flex-direction: column; gap: 16px; }
        @media(max-width:1100px) { .db-sidebar { display: none; } }
        .db-widget { background: #fff; border-radius: 20px; border: 1px solid #E8E4DC; padding: 20px; }
        .db-widget-title { font-size: 10px; letter-spacing: 2px; color: #8E8E93; font-weight: 600; margin-bottom: 14px; }
        .db-activity { display: flex; flex-direction: column; gap: 10px; }
        .db-act-item { display: flex; align-items: center; gap: 10px; }
        .db-act-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .db-act-text { flex: 1; font-size: 12px; color: #1A1208; }
        .db-act-sub { font-size: 10px; color: #AEAEB2; }
        .db-act-time { font-size: 10px; color: #AEAEB2; }
        .db-user-card { background: #0D2137; border-radius: 20px; padding: 20px; }
        .db-user-name { color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 4px; }
        .db-user-role { color: #B8943F; font-size: 10px; letter-spacing: 1.5px; }
        .db-user-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
        .db-ustat { background: rgba(255,255,255,0.07); border-radius: 10px; padding: 10px; }
        .db-ustat-val { color: #fff; font-size: 18px; font-weight: 700; }
        .db-ustat-lbl { color: rgba(255,255,255,0.4); font-size: 9px; letter-spacing: 1px; margin-top: 2px; }
      `}</style>

      <div className="db">
        {/* Desktop Nav */}
        <nav className="db-topnav">
          <div className="db-logo">
            <div className="db-logo-dot" />
            <span className="db-logo-txt">EPH</span>
          </div>
          <div className="db-nav-links">
            {["Anasayfa","Stok","CRM","Piyasa","Profil"].map((l,i) => (
              <button key={l} className={`db-nav-link ${i===0?"active":""}`}
                onClick={() => router.push(["/dashboard","/stok","/crm","/market","/profil"][i])}>
                {l}
              </button>
            ))}
          </div>
          <div className="db-nav-right">
            <div className="db-avatar">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            <button className="db-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
          </div>
        </nav>

        {/* Mobile Header */}
        <div className="db-mobile-header">
          <div className="db-mobile-topbar">
            <div className="db-logo"><div className="db-logo-dot" /><span className="db-logo-txt">EPH</span></div>
            <div style={{display:"flex",gap:8}}>
              <div className="db-fbtn">🔔</div>
              <div className="db-fbtn" onClick={() => { logout(); router.push("/giris"); }}>⎋</div>
            </div>
          </div>
          <div className="db-mobile-search">
            <div className="db-sbox"><span style={{fontSize:16}}>🔍</span><span className="db-sbox-txt">Proje, konum, ilan ara...</span></div>
            <div className="db-fbtn">⚙️</div>
          </div>
          <div className="db-tabs-row">
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{padding:"8px 18px",borderRadius:22,fontSize:12,whiteSpace:"nowrap",cursor:"pointer",fontWeight:500,border:"none",fontFamily:"inherit",
                  background:activeTab===t?"#0D2137":"#fff",color:activeTab===t?"#fff":"#3C3C3C",
                  borderWidth:activeTab===t?0:1,borderStyle:"solid",borderColor:"#E8E4DC"}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="db-body">
          {/* Desktop tabs */}
          <div className="db-desktop-tabs">
            {TABS.map(t => (
              <button key={t} className={`db-dtab ${activeTab===t?"on":"off"}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>

          <div className="db-grid">
            <div>
              {/* Hero */}
              <div className="db-hero">
                <div className="db-hero-tag"><div className="db-hero-dot" /><span className="db-hero-tag-txt">YALNIZCA ONAYLI PROFESYONELLER</span></div>
                <div className="db-hero-title">Türkiye'nin<br /><em>B2B Emlak</em><br />Ekosistemi</div>
                <div className="db-hero-sub">Kapalı devre · Güvenli · Denizli & Türkiye</div>
                <div className="db-hero-stats">
                  <div className="db-hstat"><div className="db-hstat-icon">🏢</div><div className="db-hstat-val">{stats.units}</div><div className="db-hstat-lbl">İLAN</div></div>
                  <div className="db-hstat"><div className="db-hstat-icon">🏗️</div><div className="db-hstat-val">{stats.projects}</div><div className="db-hstat-lbl">PROJE</div></div>
                  <div className="db-hstat"><div className="db-hstat-icon">👥</div><div className="db-hstat-val">{stats.customers}</div><div className="db-hstat-lbl">MÜŞTERİ</div></div>
                </div>
              </div>

              {/* Prices */}
              <div className="db-prices">
                {PRICES.map(p => (
                  <div key={p.val} className="db-pc">
                    <div className="db-pc-tag">{p.tag}</div>
                    <div className="db-pc-val">{p.val}</div>
                    <div className="db-pc-addr">{p.addr}</div>
                  </div>
                ))}
              </div>

              {/* Quick Access */}
              <div className="db-sec-hdr">
                <span className="db-sec-txt">HIZLI ERİŞİM</span>
                <button className="db-sec-lnk" onClick={() => router.push("/stok")}>Tümünü gör →</button>
              </div>
              <div className="db-cards">
                {CARDS.map(c => (
                  <div key={c.title} className="db-card" onClick={() => router.push(c.href)}>
                    <div className="db-card-bg" style={{background:c.bg}}>
                      <div className="db-card-icon">{c.icon}</div>
                      <div className="db-card-title">{c.title}</div>
                      <div className="db-card-sub">{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="db-sidebar">
              <div className="db-user-card">
                <div className="db-user-name">{user?.firstName} {user?.lastName}</div>
                <div className="db-user-role">{user?.role === "ADMIN" ? "YÖNETİCİ" : user?.role === "EMLAKCI" ? "EMLAKÇI" : "MÜTEAHHİT"}</div>
                <div className="db-user-stats">
                  <div className="db-ustat"><div className="db-ustat-val">{stats.units}</div><div className="db-ustat-lbl">İLAN</div></div>
                  <div className="db-ustat"><div className="db-ustat-val">{stats.projects}</div><div className="db-ustat-lbl">PROJE</div></div>
                </div>
              </div>

              <div className="db-widget">
                <div className="db-widget-title">SON HAREKETLEr</div>
                <div className="db-activity">
                  {[
                    {dot:"#2D6A4F",text:"Yeni ilan eklendi",sub:"3+1 Daire · Pamukkale",time:"2 dk"},
                    {dot:"#B8943F",text:"Üye girişi",sub:"Ahmet K. · Müteahhit",time:"15 dk"},
                    {dot:"#0D2137",text:"Stok güncellendi",sub:"Villa Arsası · Servergazi",time:"1 sa"},
                  ].map((a,i) => (
                    <div key={i} className="db-act-item">
                      <div className="db-act-dot" style={{background:a.dot}} />
                      <div className="db-act-text">
                        <div>{a.text}</div>
                        <div className="db-act-sub">{a.sub}</div>
                      </div>
                      <div className="db-act-time">{a.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="db-widget">
                <div className="db-widget-title">HAVA DURUMU · DENİZLİ</div>
                <div style={{textAlign:"center",padding:"10px 0"}}>
                  <div style={{fontSize:40}}>☀️</div>
                  <div style={{fontSize:28,fontWeight:700,color:"#0D2137"}}>24°C</div>
                  <div style={{fontSize:12,color:"#AEAEB2",marginTop:4}}>Güneşli · Denizli</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
