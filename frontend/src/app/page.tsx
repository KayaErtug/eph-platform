"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const STATS = [
  { label: "Aktif Üye", value: "344+" },
  { label: "Portföy İlanı", value: "8.700+" },
  { label: "Şehir", value: "1" },
  { label: "Başarılı Satış", value: "65+" },
];

const FEATURES = [
  { bg: "#eff6ff", border: "#dbeafe", stroke: "#2563eb", title: "Gerçek Zamanlı Stok", desc: "Tüm portföy ilanları anlık güncellenir. Kaçan fırsat olmaz, doğru mülkü zamanında ulaştırırsınız.", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { bg: "#f5f3ff", border: "#ede9fe", stroke: "#7c3aed", title: "AI Destekli İlan Görseli", desc: "Yapay zeka ile profesyonel görseller oluşturun. WhatsApp, Instagram ve Facebook'ta paylaşın.", path: "M3 3h18v18H3zM3 9h18M9 21V9" },
  { bg: "#f0fdf4", border: "#dcfce7", stroke: "#16a34a", title: "Ortak Satış Sistemi", desc: "Komisyon anlaşmalarınızı dijital ortamda yönetin. Birlikte kazanın, birlikte büyüyün.", path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { bg: "#fffbeb", border: "#fef3c7", stroke: "#d97706", title: "Mobil & Kolay Kullanım", desc: "Sahadayken bile tek elinizle işlem yapın. Veri girişi basit, portföy inceleme hızlı.", path: "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" },
  { bg: "#fef2f2", border: "#fee2e2", stroke: "#dc2626", title: "Kapalı Devre Güven", desc: "Dış müşterilere kapalı, şifre korumalı ağ. Portföyünüzü sadece güvendiğiniz profesyonellerle paylaşın.", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { bg: "#ecfeff", border: "#cffafe", stroke: "#0891b2", title: "CRM & Pipeline", desc: "Müşteri notu, randevu ve satış süreci takibi. Süreçlerinizi sistematik olarak yönetin.", path: "M22 12h-4l-3 9L9 3l-3 9H2" },
];

const TESTIMONIALS = [
  { initials: "VU", name: "Varol U.", role: "Müteahhit — Denizli", grad: "135deg,#2563eb,#7c3aed", featured: true, text: "EPH sayesinde yapay zeka destekli profesyonel ilan görselleri oluşturup müşterilerime WhatsApp, Instagram ve Facebook üzerinden tek tıkla ulaşabiliyorum." },
  { initials: "MC", name: "Mehmet C.", role: "Müteahhit — Ankara", grad: "135deg,#059669,#0891b2", featured: false, text: "Doğru emlakçılara ulaşmak artık çok kolay. Ortak satış sistemi sayesinde projelerim çok daha hızlı satışa çıkıyor. Meslektaşım artık iş ortağım." },
  { initials: "SY", name: "Selin Y.", role: "İnşaat Firması — İzmir", grad: "135deg,#dc2626,#ea580c", featured: false, text: "Gerçek zamanlı stok takibi ve anlık bildirimler sayesinde hiçbir fırsatı kaçırmıyoruz. Sahadayken bile tüm portföyümüze anında ulaşıyoruz." },
];

const EPH_CARDS = [
  { bg: "#eff6ff", border: "#dbeafe", stroke: "#2563eb", title: "Hızlı Eşleştirme", sub: "Doğru gayrimenkul,\ndoğru müşteri", path: "M11 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0zM21 21l-4.35-4.35" },
  { bg: "#f5f3ff", border: "#ede9fe", stroke: "#7c3aed", title: "Kapalı Devre", sub: "Sadece doğrulanmış\nprofesyoneller", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { bg: "#f0fdf4", border: "#dcfce7", stroke: "#16a34a", title: "Anlık Güncelleme", sub: "Gerçek zamanlı\nstok takibi", path: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { bg: "#fffbeb", border: "#fef3c7", stroke: "#d97706", title: "Komisyon Takibi", sub: "Dijital anlaşma\nyönetimi", path: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
];

function KrediHesapla() {
  const [tutar, setTutar] = useState(1000000);
  const [sure, setSure] = useState(120);
  const [faiz, setFaiz] = useState(3.5);
  const f = faiz / 100;
  const taksit = f === 0 ? tutar / sure : tutar * (f * Math.pow(1 + f, sure)) / (Math.pow(1 + f, sure) - 1);
  const topOdeme = taksit * sure;
  const topFaiz = topOdeme - tutar;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Kredi Tutarı (₺)", val: tutar, set: setTutar, step: undefined },
          { label: "Vade (Ay)", val: sure, set: setSure, step: undefined },
          { label: "Aylık Faiz (%)", val: faiz, set: setFaiz, step: 0.1 },
        ].map(({ label, val, set, step }) => (
          <div key={label}>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, marginBottom: 6 }}>{label}</label>
            <input type="number" value={val} step={step} onChange={e => set(Number(e.target.value))}
              style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 11px", color: "#1e3a8a", fontSize: 12, boxSizing: "border-box" as const }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#2563eb", fontSize: 9, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>AYLIK TAKSİT</div>
          <div style={{ color: "#1e3a8a", fontSize: 17, fontWeight: 700 }}>{Math.round(taksit).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#dc2626", fontSize: 9, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>TOPLAM FAİZ</div>
          <div style={{ color: "#1e3a8a", fontSize: 17, fontWeight: 700 }}>{Math.round(topFaiz).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#16a34a", fontSize: 9, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>TOPLAM ÖDEME</div>
          <div style={{ color: "#1e3a8a", fontSize: 17, fontWeight: 700 }}>{Math.round(topOdeme).toLocaleString("tr-TR")} ₺</div>
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

  return (
    <>
      <style>{`
        @keyframes lp-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes lp-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes lp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,.3)}50%{box-shadow:0 0 0 8px rgba(37,99,235,0)}}
        @keyframes lp-fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .lp-hov{transition:all .2s;} .lp-hov:hover{opacity:.88;transform:translateY(-1px);}
        .lp-card{transition:all .3s;} .lp-card:hover{box-shadow:0 6px 28px rgba(37,99,235,.12)!important;border-color:#bfdbfe!important;transform:translateY(-2px);}
        @media(max-width:768px){
          .lp-hero-h1{font-size:28px!important;}
          .lp-stats{grid-template-columns:repeat(2,1fr)!important;}
          .lp-eph-cards{grid-template-columns:1fr 1fr!important;}
          .lp-features{grid-template-columns:1fr!important;}
          .lp-steps{grid-template-columns:1fr!important;}
          .lp-testi{grid-template-columns:1fr!important;}
          .lp-kredi-grid{grid-template-columns:1fr!important;}
          .lp-nav-links{display:none!important;}
          .lp-hero-btns{flex-direction:column!important;}
          .lp-about-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      <div style={{ background: "#f8faff", color: "#0f172a", fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>

        {/* TICKER */}
        <div style={{ background: "#1e3a8a", padding: "5px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", animation: "lp-ticker 35s linear infinite", whiteSpace: "nowrap", width: "200%" }}>
            {[0, 1].map(i => (
              <span key={i} style={{ paddingRight: 40, fontSize: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", marginRight: 5 }}>USD/TRY</span>
                <span style={{ color: "#86efac", fontWeight: 600, marginRight: 24 }}>{dolar} ₺</span>
                <span style={{ color: "rgba(255,255,255,0.5)", marginRight: 5 }}>EUR/TRY</span>
                <span style={{ color: "#86efac", fontWeight: 600, marginRight: 24 }}>{euro} ₺</span>
                <span style={{ color: "rgba(255,255,255,0.5)", marginRight: 5 }}>Altın/gr</span>
                <span style={{ color: "#fcd34d", fontWeight: 600, marginRight: 24 }}>{altin.toLocaleString("tr-TR")} ₺</span>
                <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 24 }}>·</span>
                <span style={{ color: "rgba(255,255,255,0.45)", marginRight: 24 }}>Paylaşan Kazanır · Meslektaşınız Rakibiniz Değil İş Ortağınız Olsun · Birlikte Daha Fazla Portföy Daha Fazla Satış · Emlakta Yeni Nesil İş Birliği · Portföy Gücü Meslektaş Dayanışması</span>
              </span>
            ))}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LOGO_EPH.png" alt="EPH Logo" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#1e3a8a", fontSize: 14, fontWeight: 700, letterSpacing: "-0.3px" }}>EPH Platform</div>
              <div style={{ color: "#3b82f6", fontSize: 8.5, letterSpacing: "1px", fontWeight: 600 }}>EMLAK PORTFÖY HAVUZU</div>
            </div>
          </div>
          <div className="lp-nav-links" style={{ display: "flex", gap: 24 }}>
            {["Özellikler", "Nasıl Çalışır?", "Hakkımızda", "İletişim"].map(l => (
              <a key={l} href="#" style={{ color: "#64748b", fontSize: 12, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/giris" className="lp-hov" style={{ color: "#1e3a8a", fontSize: 12, textDecoration: "none", padding: "8px 18px", border: "1.5px solid #bfdbfe", borderRadius: 8, fontWeight: 500 }}>Giriş Yap</Link>
            <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ color: "#fff", fontSize: 12, padding: "8px 18px", background: "linear-gradient(135deg,#1e3a8a,#2563eb)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Üyelik Talebi</button>
          </div>
        </nav>

        {/* HERO */}
        <div style={{ position: "relative", background: "linear-gradient(135deg,#f0f7ff 0%,#e8f0fe 50%,#f0f7ff 100%)", padding: "80px 40px 60px", textAlign: "center", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, background: "rgba(37,99,235,0.06)", borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, background: "rgba(30,58,138,0.04)", borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(37,99,235,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

          <div style={{ position: "relative", zIndex: 2, animation: "lp-fadeUp 0.8s ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: "lp-pulse 2s infinite" }} />
              <span style={{ color: "#1d4ed8", fontSize: 11, fontWeight: 600 }}>Türkiye&apos;nin İlk Kapalı Devre B2B Emlak Platformu</span>
            </div>

            <h1 className="lp-hero-h1" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-1.5px", marginBottom: 16, color: "#0f172a", maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
              Emlakta Yeni Nesil<br />
              <span style={{ background: "linear-gradient(90deg,#1e3a8a,#2563eb,#7c3aed)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "lp-shimmer 4s linear infinite" }}>
                İş Birliği Platformu
              </span>
            </h1>

            <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.8, maxWidth: 540, margin: "0 auto 10px" }}>
              Emlak ofislerinin en büyük sorunu — <strong style={{ color: "#1e3a8a" }}>müşteriye doğru ilanı zamanında sunamamak.</strong>
            </p>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, maxWidth: 580, margin: "0 auto 32px" }}>
              EPH bu kayıp satışları sıfıra indiren akıllı eşleştirme sistemiyle; emlakçı, müteahhit ve inşaat firmalarının portföy ve taleplerini güvenle paylaştığı kapalı devre profesyonel ağdır.
            </p>

            <div className="lp-hero-btns" style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
              <Link href="/giris" className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", textDecoration: "none", padding: "13px 28px", borderRadius: 9, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(37,99,235,0.3)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                Giriş Yap
              </Link>
              <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#1e3a8a", padding: "13px 28px", borderRadius: 9, fontSize: 13, border: "1.5px solid #bfdbfe", cursor: "pointer", fontWeight: 500 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                Üyelik Talebi
              </button>
            </div>

            {showForm && (
              <div style={{ maxWidth: 420, margin: "0 auto 28px", background: "#fff", border: "1px solid #bfdbfe", borderRadius: 14, padding: 22, textAlign: "left", boxShadow: "0 4px 24px rgba(37,99,235,0.1)", animation: "lp-fadeUp 0.4s ease both" }}>
                <div style={{ color: "#1e3a8a", fontSize: 12, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Üyelik Talebinde Bulunun</div>
                <div style={{ color: "#64748b", fontSize: 10, textAlign: "center", marginBottom: 16 }}>Referans koduyla kayıt sistemi — bilgilerinizi bırakın, sizinle iletişime geçelim.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[{ ph: "Ad Soyad", key: "ad" }, { ph: "Telefon", key: "tel" }, { ph: "Email", key: "email" }].map(({ ph, key }) => (
                    <input key={key} placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 12px", color: "#1e3a8a", fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                  ))}
                  <select value={form.meslek} onChange={e => setForm(f => ({ ...f, meslek: e.target.value }))}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 12px", color: "#64748b", fontSize: 12, width: "100%" }}>
                    <option value="">Mesleğiniz</option>
                    <option>Emlakçı</option>
                    <option>Müteahhit</option>
                    <option>İnşaat Firması</option>
                  </select>
                  <input placeholder="Referans Kodu (varsa)" value={form.kod} onChange={e => setForm(f => ({ ...f, kod: e.target.value }))}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 12px", color: "#1e3a8a", fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                  <button className="lp-hov" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", border: "none", borderRadius: 7, padding: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Talebi Gönder</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
              {["Paylaşan Kazanır", "Meslektaşınız İş Ortağınız", "Rekabeti Değil İş Birliğini Büyütün"].map(s => (
                <span key={s} style={{ color: "#94a3b8", fontSize: 10 }}>· {s}</span>
              ))}
            </div>

            {/* İstatistikler */}
            <div className="lp-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{ padding: "18px 20px", textAlign: "center", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ color: "#1e3a8a", fontSize: 20, fontWeight: 700, letterSpacing: "-1px" }}>{s.value}</div>
                  <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EPH NEDİR */}
        <div style={{ padding: "64px 40px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>EPH NEDİR?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a", marginBottom: 12 }}>Rekabeti Değil, <span style={{ color: "#2563eb" }}>İş Birliğini</span> Büyütün</h2>
              <p style={{ color: "#64748b", fontSize: 13, maxWidth: 540, margin: "0 auto", lineHeight: 1.8 }}>EPH, emlak sektöründeki gerçek ihtiyaçlardan yola çıkılarak geliştirilmiş merkezi bir kapalı devre paylaşım platformudur.</p>
            </div>
            <div className="lp-eph-cards" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "#f1f5f9", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              {EPH_CARDS.map(c => (
                <div key={c.title} style={{ background: "#fff", padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, margin: "0 auto 14px", background: c.bg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${c.border}` }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="1.8"><path d={c.path} /></svg>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 5 }}>{c.title}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6, whiteSpace: "pre-line" }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ÖZELLİKLER */}
        <div style={{ padding: "64px 40px", background: "#f8faff" }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>NEDEN EPH?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a" }}>Platforma özel güçlü özellikler</h2>
            </div>
            <div className="lp-features" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="lp-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 44, height: 44, background: f.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, border: `1px solid ${f.border}` }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="1.8"><path d={f.path} /></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 7 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KREDİ HESAPLAMA */}
        <div style={{ padding: "64px 40px", background: "#fff" }}>
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>ARAÇLAR</div>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a" }}>Kredi Hesaplama Modülü</h2>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Müşterinize anında kredi bilgisi sunun</p>
            </div>
            <KrediHesapla />
          </div>
        </div>

        {/* NASIL ÇALIŞIR */}
        <div style={{ padding: "64px 40px", background: "#f8faff" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>NASIL ÇALIŞIR?</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a" }}>3 adımda platforma katıl</h2>
          </div>
          <div className="lp-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, maxWidth: 660, margin: "0 auto", position: "relative" }}>
            <div style={{ position: "absolute", top: 36, left: "17%", right: "17%", height: "1px", background: "linear-gradient(90deg,transparent,#bfdbfe,transparent)" }} />
            {[
              { n: "1", title: "Davet Kodu Al", desc: "Mevcut bir üyeden referans kodu talep edin", delay: "0s" },
              { n: "2", title: "Kaydol & Doğrula", desc: "Belgelerinizi yükleyin, admin onayını bekleyin", delay: "0.5s" },
              { n: "3", title: "Platforma Başlayın", desc: "İlanlar, stok, CRM — her şey hazır", delay: "1s" },
            ].map(s => (
              <div key={s.n} style={{ textAlign: "center", padding: "0 18px" }}>
                <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, fontWeight: 700, color: "#fff", animation: `lp-float 3s ease ${s.delay} infinite`, boxShadow: "0 4px 20px rgba(37,99,235,0.25)" }}>
                  {s.n}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 7 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HAKKIMIZDA */}
        <div style={{ padding: "64px 40px", background: "#fff" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>HAKKIMIZDA</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a" }}>Biz Kimiz?</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                "EPH (Emlak Portföy Havuzu), gayrimenkul sektörünün gerçek ihtiyaçlarından yola çıkılarak; emlakçı, müteahhit ve yazılım alanlarında uzman dört girişimci tarafından Denizli'de hayata geçirilmiştir. Platform, sektördeki en kritik sorunu — doğru mülkü doğru müşteriye zamanında ulaştıramamayı — çözmek amacıyla geliştirilmiş; kapalı devre, davet bazlı ve yalnızca doğrulanmış profesyonellere açık bir B2B ağ olarak tasarlanmıştır.",
                "Pilot bölge olarak seçilen Denizli'de yürütülen çalışmalar son derece olumlu sonuçlar vermiş; platform kısa sürede emlakçılar, müteahhitler ve inşaat firmaları arasında güvenilir bir iş birliği köprüsüne dönüşmüştür. Gerçek zamanlı stok takibi, yapay zeka destekli ilan görseli oluşturma ve entegre CRM sistemi gibi yenilikçi özellikleriyle EPH, sektörde dijital dönüşümün öncüsü olmayı hedeflemektedir.",
                "2027 yılı itibarıyla Türkiye geneline açılmayı ve en az 10 şehri kapsayan güçlü bir büyüme ivmesi yakalamayı hedefleyen EPH Platform, merkez ofisini Denizli'nin prestijli iş adreslerinden Skycity İş Merkezi'nde konumlandırmıştır. Meslektaşlığı iş ortaklığına, rekabeti iş birliğine dönüştüren bu vizyonla EPH; Türkiye'nin en büyük kapalı devre emlak profesyonelleri ağı olmaya kararlıdır.",
              ].map((p, i) => (
                <p key={i} style={{ color: "#64748b", fontSize: 14, lineHeight: 1.9, borderLeft: "3px solid #bfdbfe", paddingLeft: 20, borderRadius: "0 4px 4px 0" }}>{p}</p>
              ))}
            </div>
            <div style={{ marginTop: 36, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 38, height: 38, background: "#dbeafe", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <div style={{ color: "#1e3a8a", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Merkez Ofis</div>
                <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
                  Skycity İş Merkezi, 4. Kat No:36<br />
                  Sümer Mah. 2482/2 Sok. No:4/1<br />
                  20020 Merkezefendi / Denizli
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TESTİMONİALS */}
        <div style={{ padding: "64px 40px", background: "#f8faff" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>ÜYELERİMİZ NE DİYOR?</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#0f172a" }}>Gerçek deneyimler</h2>
          </div>
          <div className="lp-testi" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 920, margin: "0 auto" }}>
            {TESTIMONIALS.map((tm, i) => (
              <div key={i} className="lp-card" style={{ background: tm.featured ? "#eff6ff" : "#fff", border: tm.featured ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[...Array(5)].map((_, j) => <svg key={j} width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                </div>
                <p style={{ fontSize: 12, color: tm.featured ? "#1e40af" : "#475569", lineHeight: 1.75, marginBottom: 16 }}>&ldquo;{tm.text}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(${tm.grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 700, flexShrink: 0 }}>{tm.initials}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>{tm.name}</div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>{tm.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "72px 40px", background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac" }} />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 10.5, fontWeight: 500 }}>B2B · Şifreli Erişim · Sadece Profesyoneller</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 12, color: "#fff" }}>Platforma katılmaya<br />hazır mısınız?</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 32px" }}>
            Davet kodunuzu alın, belgelerinizi yükleyin ve Türkiye&apos;nin en güçlü emlak ağına katılın.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/giris" className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#1e3a8a", textDecoration: "none", padding: "13px 32px", borderRadius: 9, fontSize: 13, fontWeight: 700 }}>Giriş Yap</Link>
            <button onClick={() => setShowForm(v => !v)} className="lp-hov" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", color: "#fff", padding: "13px 32px", borderRadius: 9, fontSize: 13, border: "1.5px solid rgba(255,255,255,0.3)", cursor: "pointer" }}>Üyelik Talebi</button>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "20px 40px", background: "#f8faff", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/LOGO_EPH.png" alt="EPH" style={{ width: 22, height: 22, objectFit: "contain" }} />
            <span style={{ color: "#94a3b8", fontSize: 10 }}>© 2026 EPH Platform. Tüm hakları saklıdır.</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Gizlilik", "Kullanım Şartları", "İletişim"].map(l => (
              <a key={l} href="#" style={{ color: "#94a3b8", fontSize: 10, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
