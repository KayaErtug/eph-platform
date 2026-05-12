"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const STATS = [
  { label: "Aktif Üye", value: "9.240+" },
  { label: "Portföy İlanı", value: "18.700+" },
  { label: "Şehir", value: "81" },
  { label: "Başarılı Satış", value: "3.200+" },
];

const FEATURES = [
  { color: "rgba(37,99,235,0.12)", stroke: "#3b82f6", title: "Gerçek Zamanlı Stok", desc: "Tüm portföy ilanları anlık güncellenir. Kaçan fırsat olmaz, doğru mülkü doğru müşteriye zamanında ulaştırırsınız.", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { color: "rgba(168,85,247,0.12)", stroke: "#a855f7", title: "AI Destekli İlan Görseli", desc: "Yapay zeka ile profesyonel ilan görselleri oluşturun. WhatsApp, Instagram ve Facebook'ta tek tıkla paylaşın.", path: "M3 3h18v18H3zM3 9h18M9 21V9" },
  { color: "rgba(34,197,94,0.10)", stroke: "#22c55e", title: "Ortak Satış Sistemi", desc: "Komisyon anlaşmalarınızı dijital ortamda yönetin. Emlakçı, müteahhit ve inşaat firmalarıyla birlikte kazanın.", path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { color: "rgba(245,158,11,0.10)", stroke: "#f59e0b", title: "Mobil & Kolay Kullanım", desc: "Sahadayken bile tek elinizle işlem yapın. Veri girişi basit, portföy inceleme hızlı — her yerde çalışır.", path: "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" },
  { color: "rgba(239,68,68,0.10)", stroke: "#ef4444", title: "Kapalı Devre Güven", desc: "Dış müşterilere kapalı, şifre korumalı ağ. Portföyünüzü sadece güvendiğiniz profesyonellerle paylaşın.", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { color: "rgba(6,182,212,0.10)", stroke: "#06b6d4", title: "CRM & Pipeline", desc: "Müşteri notu, randevu ve satış süreci takibi. Potansiyel müşterilerinizi sistematik olarak yönetin.", path: "M22 12h-4l-3 9L9 3l-3 9H2" },
];

const TESTIMONIALS = [
  { initials: "VU", name: "Varol U.", role: "Müteahhit — Denizli", grad: "135deg,#2563eb,#7c3aed", text: "EPH sayesinde yapay zeka destekli profesyonel ilan görselleri oluşturup müşterilerime WhatsApp, Instagram ve Facebook üzerinden tek tıkla ulaşabiliyorum." },
  { initials: "MC", name: "Mehmet C.", role: "Müteahhit — Ankara", grad: "135deg,#059669,#0891b2", text: "Doğru emlakçılara ulaşmak artık çok kolay. Ortak satış sistemi sayesinde projelerim çok daha hızlı satışa çıkıyor. Meslektaşım artık iş ortağım." },
  { initials: "SY", name: "Selin Y.", role: "İnşaat Firması — İzmir", grad: "135deg,#dc2626,#ea580c", text: "Gerçek zamanlı stok takibi ve anlık bildirimler sayesinde hiçbir fırsatı kaçırmıyoruz. Sahadayken bile tüm portföyümüze anında ulaşıyoruz." },
];

const EPH_LOGO = (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <defs>
      <linearGradient id="ephLg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1d4ed8" /><stop offset="1" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#ephLg)" />
    <path d="M18 7L7 15.5V29h7v-7h8v7h7V15.5L18 7z" fill="white" opacity={0.95} />
  </svg>
);

function KrediHesapla() {
  const [tutar, setTutar] = useState(1000000);
  const [sure, setSure] = useState(120);
  const [faiz, setFaiz] = useState(3.5);
  const f = faiz / 100;
  const taksit = f === 0 ? tutar / sure : tutar * (f * Math.pow(1 + f, sure)) / (Math.pow(1 + f, sure) - 1);
  const topOdeme = taksit * sure;
  const topFaiz = topOdeme - tutar;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Kredi Tutarı (₺)", val: tutar, set: setTutar, step: undefined },
          { label: "Vade (Ay)", val: sure, set: setSure, step: undefined },
          { label: "Aylık Faiz (%)", val: faiz, set: setFaiz, step: 0.1 },
        ].map(({ label, val, set, step }) => (
          <div key={label}>
            <label style={{ display: "block", color: "#475569", fontSize: 11, marginBottom: 6 }}>{label}</label>
            <input type="number" value={val} step={step} onChange={e => set(Number(e.target.value))}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 11px", color: "#f1f5f9", fontSize: 12, boxSizing: "border-box" as const }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <div style={{ background: "rgba(37,99,235,0.08)", border: "0.5px solid rgba(37,99,235,0.18)", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#60a5fa", fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>AYLIK TAKSİT</div>
          <div style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>{Math.round(taksit).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "rgba(239,68,68,0.07)", border: "0.5px solid rgba(239,68,68,0.18)", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#f87171", fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>TOPLAM FAİZ</div>
          <div style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>{Math.round(topFaiz).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "rgba(34,197,94,0.07)", border: "0.5px solid rgba(34,197,94,0.18)", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#4ade80", fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>TOPLAM ÖDEME</div>
          <div style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>{Math.round(topOdeme).toLocaleString("tr-TR")} ₺</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [dolar, setDolar] = useState(32.84);
  const [euro, setEuro] = useState(35.21);
  const [altin, setAltin] = useState(2847);
  const [form, setForm] = useState({ ad: "", tel: "", email: "", meslek: "", kod: "" });

  useEffect(() => {
    const iv = setInterval(() => {
      setDolar(v => parseFloat((v + (Math.random() - 0.5) * 0.03).toFixed(2)));
      setEuro(v => parseFloat((v + (Math.random() - 0.5) * 0.03).toFixed(2)));
      setAltin(v => Math.round(v + (Math.random() - 0.5) * 2));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const tickerText = `USD/TRY ${dolar} ₺  ·  EUR/TRY ${euro} ₺  ·  Altın/gr ${altin.toLocaleString("tr-TR")} ₺  ·  Paylaşan Kazanır  ·  Meslektaşınız Rakibiniz Değil İş Ortağınız Olsun  ·  Birlikte Daha Fazla Portföy Daha Fazla Satış  ·  Emlakta Yeni Nesil İş Birliği  ·  Portföy Gücü Meslektaş Dayanışması  ·  Rekabeti Değil İş Birliğini Büyütün  ·  `;

  return (
    <>
      <style>{`
        @keyframes lp-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes lp-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes lp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
        @keyframes lp-fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes lp-scroll{0%{transform:translateY(0);opacity:.7}100%{transform:translateY(9px);opacity:0}}
        .lp-hov{transition:all .2s;} .lp-hov:hover{opacity:.88;transform:translateY(-1px);}
        .lp-card{transition:all .3s;} .lp-card:hover{border-color:rgba(37,99,235,.35)!important;transform:translateY(-3px);}
        @media(max-width:768px){
          .lp-hero-title{font-size:28px!important;}
          .lp-stats{grid-template-columns:repeat(2,1fr)!important;}
          .lp-features{grid-template-columns:1fr!important;}
          .lp-steps{grid-template-columns:1fr!important;}
          .lp-testi{grid-template-columns:1fr!important;}
          .lp-eph-grid{grid-template-columns:1fr 1fr!important;}
          .lp-nav-links{display:none!important;}
          .lp-kredi{grid-template-columns:1fr!important;}
          .lp-hero-btns{flex-direction:column!important;align-items:stretch!important;}
        }
      `}</style>

      <div style={{ background: "#04080f", color: "#fff", fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>

        {/* TICKER */}
        <div style={{ background: "#020509", borderBottom: "0.5px solid rgba(255,255,255,0.04)", padding: "5px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", animation: "lp-ticker 35s linear infinite", whiteSpace: "nowrap", width: "200%" }}>
            {[0, 1].map(i => (
              <span key={i} style={{ paddingRight: 40, fontSize: 10, color: "#1e3a5f" }}>{tickerText}</span>
            ))}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(4,8,15,0.93)", backdropFilter: "blur(16px)", borderBottom: "0.5px solid rgba(255,255,255,0.05)", padding: "13px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {EPH_LOGO}
            <div>
              <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, letterSpacing: "-0.2px" }}>EPH Platform</div>
              <div style={{ color: "#3b82f6", fontSize: 8.5, letterSpacing: "1px", fontWeight: 500 }}>EMLAK PORTFÖY HAVUZU</div>
            </div>
          </div>
          <div className="lp-nav-links" style={{ display: "flex", gap: 24 }}>
            {["Özellikler", "Nasıl Çalışır?", "Üyeler", "İletişim"].map(l => (
              <a key={l} href="#" style={{ color: "#475569", fontSize: 11, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/giris" className="lp-hov" style={{ color: "#94a3b8", fontSize: 11, textDecoration: "none", padding: "7px 16px", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 7 }}>Giriş Yap</Link>
            <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ color: "#fff", fontSize: 11, padding: "7px 16px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>Üyelik Talebi</button>
          </div>
        </nav>

        {/* HERO */}
        <div style={{ position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
          <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}>
            <source src="https://videos.pexels.com/video-files/3214305/3214305-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.1 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(4,8,15,0.98) 0%,rgba(4,8,15,0.72) 50%,rgba(4,8,15,0.98) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 60%,rgba(4,8,15,1) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(37,99,235,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.035) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
          <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse,rgba(37,99,235,0.1) 0%,transparent 65%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 5, width: "100%", padding: "80px 40px 60px", textAlign: "center", animation: "lp-fadeUp 0.9s ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.22)", borderRadius: 20, padding: "5px 14px", marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "lp-pulse 2s infinite" }} />
              <span style={{ color: "#93c5fd", fontSize: 10.5, fontWeight: 500 }}>Türkiye&apos;nin İlk Kapalı Devre B2B Emlak Platformu</span>
            </div>

            <h1 className="lp-hero-title" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-1.5px", marginBottom: 18, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
              Emlakta Yeni Nesil<br />
              <span style={{ background: "linear-gradient(90deg,#60a5fa,#a78bfa,#60a5fa)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "lp-shimmer 4s linear infinite" }}>
                İş Birliği Platformu
              </span>
            </h1>

            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.75, maxWidth: 560, margin: "0 auto 10px" }}>
              Emlak ofislerinin en büyük sorunu — <span style={{ color: "#94a3b8" }}>müşteriye doğru ilanı zamanında sunamamak.</span>
            </p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.8, maxWidth: 580, margin: "0 auto 36px" }}>
              EPH bu kayıp satışları sıfıra indiren akıllı eşleştirme sistemiyle; emlakçı, müteahhit ve inşaat firmalarının portföy ve taleplerini güvenle paylaştığı kapalı devre profesyonel ağdır.
            </p>

            <div className="lp-hero-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <Link href="/giris" className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", textDecoration: "none", padding: "13px 28px", borderRadius: 9, fontSize: 13, fontWeight: 600, boxShadow: "0 0 32px rgba(37,99,235,0.25)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                Giriş Yap
              </Link>
              <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 9, fontSize: 13, border: "0.5px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                Üyelik Talebi
              </button>
            </div>

            {/* Üyelik Formu */}
            {showForm && (
              <div style={{ maxWidth: 420, margin: "0 auto 28px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(37,99,235,0.25)", borderRadius: 14, padding: 22, textAlign: "left", animation: "lp-fadeUp 0.4s ease both" }}>
                <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Üyelik Talebinde Bulunun</div>
                <div style={{ color: "#475569", fontSize: 10, textAlign: "center", marginBottom: 16 }}>Referans koduyla kayıt sistemi — bilgilerinizi bırakın, sizinle iletişime geçelim.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { ph: "Ad Soyad", key: "ad" },
                    { ph: "Telefon", key: "tel" },
                    { ph: "Email", key: "email" },
                  ].map(({ ph, key }) => (
                    <input key={key} placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#f1f5f9", fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                  ))}
                  <select value={form.meslek} onChange={e => setForm(f => ({ ...f, meslek: e.target.value }))}
                    style={{ background: "#0a1628", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#94a3b8", fontSize: 12, width: "100%" }}>
                    <option value="">Mesleğiniz</option>
                    <option>Emlakçı</option>
                    <option>Müteahhit</option>
                    <option>İnşaat Firması</option>
                  </select>
                  <input placeholder="Referans Kodu (varsa)" value={form.kod} onChange={e => setForm(f => ({ ...f, kod: e.target.value }))}
                    style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#f1f5f9", fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                  <button className="lp-hov" style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 7, padding: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Talebi Gönder
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
              {["Paylaşan Kazanır", "Meslektaşınız İş Ortağınız", "Rekabeti Değil İş Birliğini Büyütün"].map(s => (
                <span key={s} style={{ color: "#1e3a5f", fontSize: 10 }}>· {s}</span>
              ))}
            </div>

            {/* İstatistikler */}
            <div className="lp-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, maxWidth: 560, margin: "0 auto", background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{ padding: "16px 20px", textAlign: "center", borderRight: i < 3 ? "0.5px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, letterSpacing: "-1px" }}>{s.value}</div>
                  <div style={{ color: "#334155", fontSize: 9, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ color: "#0f172a", fontSize: 8, letterSpacing: "2px" }}>KEŞFET</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" style={{ animation: "lp-scroll 1.5s ease infinite" }}><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>

        {/* EPH NEDİR */}
        <div style={{ padding: "64px 40px", background: "#060b16", borderTop: "0.5px solid rgba(255,255,255,0.04)" }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, letterSpacing: "2px", marginBottom: 10 }}>EPH NEDİR?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 12 }}>Rekabeti Değil, <span style={{ color: "#3b82f6" }}>İş Birliğini</span> Büyütün</h2>
              <p style={{ color: "#475569", fontSize: 13, maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>
                EPH, emlak sektöründeki gerçek ihtiyaçlardan yola çıkılarak geliştirilmiş merkezi bir kapalı devre paylaşım platformudur. Gayrimenkul bilgilerinin güvenle paylaşıldığı bu sistem, mülklerin çok daha hızlı ve etkili biçimde alıcısına ulaşmasını sağlar.
              </p>
            </div>
            <div className="lp-eph-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              {[
                { color: "rgba(37,99,235,0.15)", ring: "rgba(37,99,235,0.2)", stroke: "#3b82f6", title: "Akıllı Eşleştirme", sub: "Doğru mülk,\ndoğru müşteri", path: "M11 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0zM21 21l-4.35-4.35" },
                { color: "rgba(168,85,247,0.12)", ring: "rgba(168,85,247,0.2)", stroke: "#a855f7", title: "Kapalı Devre", sub: "Sadece doğrulanmış\nprofesyoneller", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                { color: "rgba(34,197,94,0.10)", ring: "rgba(34,197,94,0.2)", stroke: "#22c55e", title: "Anlık Güncelleme", sub: "Gerçek zamanlı\nstok takibi", path: "M22 12h-4l-3 9L9 3l-3 9H2" },
                { color: "rgba(245,158,11,0.10)", ring: "rgba(245,158,11,0.2)", stroke: "#f59e0b", title: "Komisyon Takibi", sub: "Dijital anlaşma\nyönetimi", path: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
              ].map(item => (
                <div key={item.title} style={{ background: "#060b16", padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, margin: "0 auto 14px", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: item.color, borderRadius: 12 }} />
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: "relative" }}>
                      <circle cx="24" cy="24" r="23" stroke={item.ring} strokeWidth="1" fill="none" />
                      <g transform="translate(13,13)">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={item.stroke} strokeWidth="1.8">
                          <path d={item.path} />
                        </svg>
                      </g>
                    </svg>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#e2e8f0" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line" }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ÖZELLİKLER */}
        <div style={{ padding: "64px 40px", background: "#04080f" }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, letterSpacing: "2px", marginBottom: 10 }}>NEDEN EPH?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>Platforma özel güçlü özellikler</h2>
            </div>
            <div className="lp-features" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="lp-card" style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
                  <div style={{ width: 42, height: 42, background: f.color, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="1.8"><path d={f.path} /></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KREDİ HESAPLAMA */}
        <div style={{ padding: "64px 40px", background: "#060b16" }}>
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, letterSpacing: "2px", marginBottom: 10 }}>ARAÇLAR</div>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>Kredi Hesaplama Modülü</h2>
              <p style={{ color: "#334155", fontSize: 12, marginTop: 8 }}>Müşterinize anında kredi bilgisi sunun</p>
            </div>
            <KrediHesapla />
          </div>
        </div>

        {/* NASIL ÇALIŞIR */}
        <div style={{ padding: "64px 40px", background: "#04080f" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, letterSpacing: "2px", marginBottom: 10 }}>NASIL ÇALIŞIR?</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>3 adımda platforma katıl</h2>
          </div>
          <div className="lp-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, maxWidth: 660, margin: "0 auto", position: "relative" }}>
            <div style={{ position: "absolute", top: 36, left: "17%", right: "17%", height: "0.5px", background: "linear-gradient(90deg,transparent,rgba(37,99,235,0.4),transparent)" }} />
            {[
              { n: "1", title: "Davet Kodu Al", desc: "Mevcut bir üyeden referans kodu talep edin", delay: "0s" },
              { n: "2", title: "Kaydol & Doğrula", desc: "Belgelerinizi yükleyin, admin onayını bekleyin", delay: "0.5s" },
              { n: "3", title: "Platforma Başlayın", desc: "İlanlar, stok, CRM — her şey hazır", delay: "1s" },
            ].map(s => (
              <div key={s.n} style={{ textAlign: "center", padding: "0 18px" }}>
                <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, fontWeight: 700, animation: `lp-float 3s ease ${s.delay} infinite` }}>
                  {s.n}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TESTİMONİALS */}
        <div style={{ padding: "64px 40px", background: "#060b16" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ color: "#3b82f6", fontSize: 10, fontWeight: 600, letterSpacing: "2px", marginBottom: 10 }}>ÜYELERİMİZ NE DİYOR?</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>Gerçek deneyimler</h2>
          </div>
          <div className="lp-testi" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 920, margin: "0 auto" }}>
            {TESTIMONIALS.map((tm, i) => (
              <div key={i} className="lp-card" style={{ background: i === 0 ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.025)", border: i === 0 ? "0.5px solid rgba(37,99,235,0.2)" : "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.75, marginBottom: 16 }}>&ldquo;{tm.text}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(${tm.grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{tm.initials}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{tm.name}</div>
                    <div style={{ fontSize: 9, color: "#334155" }}>{tm.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "72px 40px", background: "#04080f", textAlign: "center", borderTop: "0.5px solid rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 450, background: "radial-gradient(ellipse,rgba(37,99,235,0.07) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "lp-pulse 2s infinite" }} />
              <span style={{ color: "#93c5fd", fontSize: 10.5, fontWeight: 500 }}>B2B · Şifreli Erişim · Sadece Profesyoneller</span>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 12 }}>Platforma katılmaya<br />hazır mısınız?</h2>
            <p style={{ color: "#334155", fontSize: 13, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 32px" }}>
              Davet kodunuzu alın, belgelerinizi yükleyin ve Türkiye&apos;nin en güçlü emlak ağına katılın.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link href="/giris" className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", textDecoration: "none", padding: "13px 32px", borderRadius: 9, fontSize: 13, fontWeight: 600, boxShadow: "0 0 28px rgba(37,99,235,0.2)" }}>Giriş Yap</Link>
              <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", color: "#e2e8f0", padding: "13px 32px", borderRadius: 9, fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Üyelik Talebi</button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "20px 40px", background: "#020509", borderTop: "0.5px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 36 36"><rect width="36" height="36" rx="7" fill="#1d4ed8" /><path d="M18 7L7 15.5V29h7v-7h8v7h7V15.5L18 7z" fill="white" opacity={0.9} /></svg>
            <span style={{ color: "#1e293b", fontSize: 10 }}>© 2026 EPH Platform. Tüm hakları saklıdır.</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Gizlilik", "Kullanım Şartları", "İletişim"].map(l => (
              <a key={l} href="#" style={{ color: "#1e293b", fontSize: 10, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
