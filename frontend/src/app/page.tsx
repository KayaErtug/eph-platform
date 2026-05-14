"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import FinancialTicker from "@/components/FinancialTicker";

const STATS = [
  { label: "Aktif Üye", value: "344+" },
  { label: "Portföy İlanı", value: "8.700+" },
  { label: "Şehir", value: "1" },
  { label: "Başarılı Satış", value: "65+" },
];

const FEATURES = [
  { color: "#E8380D", bg: "#FFF0ED", title: "Gerçek Zamanlı Stok", desc: "Tüm portföy ilanları anlık güncellenir. Kaçan fırsat olmaz, doğru mülkü zamanında ulaştırırsınız.", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { color: "#2563EB", bg: "#EFF6FF", title: "AI Destekli Görsel", desc: "Yapay zeka ile profesyonel görseller oluşturun. WhatsApp, Instagram ve Facebook'ta paylaşın.", icon: "M3 3h18v18H3zM3 9h18M9 21V9" },
  { color: "#16A34A", bg: "#F0FDF4", title: "Ortak Satış Sistemi", desc: "Komisyon anlaşmalarınızı dijital ortamda yönetin. Birlikte kazanın, birlikte büyüyün.", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { color: "#D97706", bg: "#FFFBEB", title: "Mobil & Kolay Kullanım", desc: "Sahadayken bile tek elinizle işlem yapın. Veri girişi basit, portföy inceleme hızlı.", icon: "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" },
  { color: "#7C3AED", bg: "#F5F3FF", title: "Kapalı Devre Güven", desc: "Dış müşterilere kapalı, şifre korumalı ağ. Portföyünüzü sadece güvendiğiniz profesyonellerle paylaşın.", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { color: "#0891B2", bg: "#ECFEFF", title: "CRM & Pipeline", desc: "Müşteri notu, randevu ve satış süreci takibi. Süreçlerinizi sistematik olarak yönetin.", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
];

const TESTIMONIALS = [
  { initials: "VU", name: "Varol U.", role: "Müteahhit — Denizli", text: "EPH sayesinde yapay zeka destekli profesyonel ilan görselleri oluşturup müşterilerime WhatsApp, Instagram ve Facebook üzerinden tek tıkla ulaşabiliyorum.", featured: true },
  { initials: "MC", name: "Mehmet C.", role: "Müteahhit — Ankara", text: "Doğru emlakçılara ulaşmak artık çok kolay. Ortak satış sistemi sayesinde projelerim çok daha hızlı satışa çıkıyor.", featured: false },
  { initials: "SY", name: "Selin Y.", role: "İnşaat Firması — İzmir", text: "Gerçek zamanlı stok takibi ve anlık bildirimler sayesinde hiçbir fırsatı kaçırmıyoruz. Sahadayken bile tüm portföyümüze anında ulaşıyoruz.", featured: false },
];

const AVATAR = "https://aday.segem.org.tr/files/image/avatar.png";

function KrediHesapla() {
  const [tutar, setTutar] = useState(1000000);
  const [sure, setSure] = useState(120);
  const [faiz, setFaiz] = useState(3.5);
  const f = faiz / 100;
  const taksit = f === 0 ? tutar / sure : tutar * (f * Math.pow(1 + f, sure)) / (Math.pow(1 + f, sure) - 1);
  const topOdeme = taksit * sure;
  const topFaiz = topOdeme - tutar;
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Kredi Tutarı (₺)", val: tutar, set: setTutar, step: undefined },
          { label: "Vade (Ay)", val: sure, set: setSure, step: undefined },
          { label: "Aylık Faiz (%)", val: faiz, set: setFaiz, step: 0.1 },
        ].map(({ label, val, set, step }) => (
          <div key={label}>
            <label style={{ display: "block", color: "#6B7280", fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</label>
            <input type="number" value={val} step={step} onChange={e => set(Number(e.target.value))}
              style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", color: "#111827", fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <div style={{ background: "#FFF0ED", border: "1px solid #FECDC5", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#E8380D", fontSize: 10, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>AYLIK TAKSİT</div>
          <div style={{ color: "#1A1A1A", fontSize: 18, fontWeight: 700 }}>{Math.round(taksit).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#DC2626", fontSize: 10, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>TOPLAM FAİZ</div>
          <div style={{ color: "#1A1A1A", fontSize: 18, fontWeight: 700 }}>{Math.round(topFaiz).toLocaleString("tr-TR")} ₺</div>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 16, textAlign: "center" as const }}>
          <div style={{ color: "#16A34A", fontSize: 10, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>TOPLAM ÖDEME</div>
          <div style={{ color: "#1A1A1A", fontSize: 18, fontWeight: 700 }}>{Math.round(topOdeme).toLocaleString("tr-TR")} ₺</div>
        </div>
      </div>
    </div>
  );
}

function AiChat() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Merhaba! 👋 Ben Lina, EPH Platform'un asistanıyım. Size nasıl yardımcı olabilirim?" }
  ]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const t1 = setTimeout(() => setShown(true), 5000);
    const t2 = setTimeout(() => setBubble(true), 6500);
    const t3 = setTimeout(() => setBubble(false), 11000);
    const t4 = setTimeout(() => setGlowing(true), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  useEffect(() => {
    if (!glowing || !shown) return;
    const stop = setTimeout(() => setGlowing(false), 10000);
    return () => clearTimeout(stop);
  }, [glowing, shown]);

  useEffect(() => {
    if (glowing || !shown) return;
    const restart = setTimeout(() => setGlowing(true), 20000);
    return () => clearTimeout(restart);
  }, [glowing, shown]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: newMessages.slice(0, -1).slice(-40),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Bir hata oluştu, lütfen tekrar deneyin." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Bağlantı hatası oluştu, lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!shown) return null;

  const chatWidth = isMobile ? "100vw" : "360px";
  const chatHeight = isMobile ? "100dvh" : "520px";
  const chatBottom = isMobile ? "0" : "110px";
  const chatRight = isMobile ? "0" : "0";
  const chatBorderRadius = isMobile ? "0" : "16px";

  return (
    <>
      <style>{`
        @keyframes neonPulse {
          0% { box-shadow: 0 0 0 0 rgba(232,56,13,0.9), 0 0 15px rgba(232,56,13,0.5); }
          50% { box-shadow: 0 0 0 14px rgba(232,56,13,0), 0 0 40px rgba(232,56,13,0.7); }
          100% { box-shadow: 0 0 0 0 rgba(232,56,13,0.9), 0 0 15px rgba(232,56,13,0.5); }
        }
        @keyframes neonRing {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes bounce {
          0%,100%{transform:translateY(0)}
          30%{transform:translateY(-14px)}
          60%{transform:translateY(-6px)}
        }
        @keyframes slideInBubble {
          from{opacity:0;transform:translateX(20px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes avatarAppear {
          from{opacity:0;transform:scale(0.4) translateY(40px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
        @keyframes slideUp {
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes typingDot {
          0%,100%{opacity:0.3;transform:translateY(0)}
          50%{opacity:1;transform:translateY(-3px)}
        }
        .ai-avatar-img {
          animation: avatarAppear 0.7s cubic-bezier(0.34,1.56,0.64,1) both, bounce 1s ease 1s 3;
          width: 90px; height: 90px; border-radius: 50%; object-fit: cover;
          border: 3px solid #E8380D; display: block; position: relative; z-index: 2;
        }
        .neon-ring { position:absolute;inset:-8px;border-radius:50%;border:2.5px solid #E8380D;animation:neonRing 1.5s ease-out infinite; }
        .neon-ring-2 { position:absolute;inset:-8px;border-radius:50%;border:2px solid #FF6B35;animation:neonRing 1.5s ease-out 0.5s infinite; }
        .neon-ring-3 { position:absolute;inset:-8px;border-radius:50%;border:2px solid #FFB347;animation:neonRing 1.5s ease-out 1s infinite; }
        .neon-glow { animation: neonPulse 1.5s ease-in-out infinite !important; }
        .chat-scroll::-webkit-scrollbar{width:4px}
        .chat-scroll::-webkit-scrollbar-track{background:#f1f1f1}
        .chat-scroll::-webkit-scrollbar-thumb{background:#E8380D;border-radius:2px}
        .chat-input:focus { border-color: #E8380D !important; outline: none; }
      `}</style>

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>

        {bubble && !open && (
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "16px 16px 4px 16px", padding: "12px 16px", fontSize: 13, color: "#374151", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxWidth: 220, lineHeight: 1.6, animation: "slideInBubble 0.4s ease", fontWeight: 500 }}>
            👋 Merhaba! Size nasıl yardımcı olabilirim?
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>Lina • EPH Asistan</div>
          </div>
        )}

        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => { setOpen(v => !v); setBubble(false); }}>
          {glowing && (
            <>
              <div className="neon-ring" />
              <div className="neon-ring-2" />
              <div className="neon-ring-3" />
            </>
          )}
          <img src={AVATAR} alt="Lina - EPH Asistan" className={`ai-avatar-img${glowing ? " neon-glow" : ""}`} />
          <div style={{ position: "absolute", bottom: 4, right: 4, width: 18, height: 18, background: "#22C55E", borderRadius: "50%", border: "3px solid #fff", zIndex: 3 }} />
        </div>

        {open && (
          <div style={{
            position: "fixed",
            bottom: chatBottom,
            right: chatRight,
            width: chatWidth,
            height: chatHeight,
            background: "#fff",
            border: isMobile ? "none" : "1px solid #E5E7EB",
            borderRadius: chatBorderRadius,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            overflow: "hidden",
            animation: isMobile ? "slideUp 0.3s ease" : "slideInBubble 0.3s ease",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}>
            {/* Header */}
            <div style={{ background: "#E8380D", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <img src={AVATAR} alt="Lina" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.5)" }} />
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Lina</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%" }} />
                  <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11 }}>EPH Asistan • Çevrimiçi</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "4px 8px" }}>×</button>
            </div>

            {/* Mesajlar */}
            <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                  {m.role === "assistant" && (
                    <img src={AVATAR} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{
                    background: m.role === "user" ? "#E8380D" : "#F3F4F6",
                    color: m.role === "user" ? "#fff" : "#374151",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    fontSize: isMobile ? 14 : 12,
                    lineHeight: 1.6,
                    maxWidth: isMobile ? "80%" : "75%",
                    whiteSpace: "pre-wrap",
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <img src={AVATAR} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                  <div style={{ background: "#F3F4F6", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 5 }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div key={i} style={{ width: 8, height: 8, background: "#9CA3AF", borderRadius: "50%", animation: `typingDot 1s ease ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Hızlı sorular */}
            {messages.length === 1 && (
              <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {["Üyelik nasıl olur?", "Platform ne işe yarar?", "Ücretli mi?"].map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{ background: "#FFF0ED", border: "1px solid #FECDC5", color: "#E8380D", fontSize: isMobile ? 12 : 10, padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 500 }}>{q}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "10px 16px 16px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                className="chat-input"
                placeholder="Bir şeyler yazın..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                style={{ flex: 1, border: "1.5px solid #E5E7EB", borderRadius: 24, padding: isMobile ? "12px 18px" : "9px 14px", fontSize: isMobile ? 14 : 12, outline: "none", transition: "border-color 0.2s" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? "#D1D5DB" : "#E8380D", border: "none", borderRadius: "50%", width: isMobile ? 48 : 40, height: isMobile ? 48 : 40, cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ad: "", tel: "", email: "", meslek: "", kod: "" });

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .hov{transition:all .2s;} .hov:hover{opacity:.88;transform:translateY(-1px);}
        .card{transition:all .3s;} .card:hover{box-shadow:0 8px 32px rgba(232,56,13,.1)!important;transform:translateY(-2px);}
        .nav-link{color:#374151;font-size:13px;text-decoration:none;font-weight:500;transition:color .2s;}
        .nav-link:hover{color:#E8380D;}
        @media(max-width:768px){
          .lp-hero-grid{grid-template-columns:1fr!important;}
          .lp-stats{grid-template-columns:repeat(2,1fr)!important;}
          .lp-features{grid-template-columns:1fr!important;}
          .lp-steps{grid-template-columns:1fr!important;}
          .lp-testi{grid-template-columns:1fr!important;}
          .lp-nav-links{display:none!important;}
          .lp-kredi{grid-template-columns:1fr!important;}
        }
      `}</style>

      <div style={{ background: "#fff", color: "#111827", fontFamily: "system-ui,-apple-system,sans-serif", overflowX: "hidden" }}>

        <FinancialTicker />

        <nav style={{ background: "#fff", borderBottom: "1px solid #F3F4F6", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, height: 68, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LOGO_EPH.png" alt="EPH" style={{ width: 44, height: 44, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#111827", fontSize: 15, fontWeight: 700 }}>EPH Platform</div>
              <div style={{ color: "#E8380D", fontSize: 8, letterSpacing: "1.5px", fontWeight: 600 }}>EMLAK PORTFÖY HAVUZU</div>
            </div>
          </div>
          <div className="lp-nav-links" style={{ display: "flex", gap: 28 }}>
            {["Özellikler", "Nasıl Çalışır?", "Hakkımızda", "İletişim"].map(l => (
              <a key={l} href="#" className="nav-link">{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/giris" className="hov" style={{ color: "#E8380D", fontSize: 13, textDecoration: "none", padding: "8px 18px", border: "1.5px solid #E8380D", borderRadius: 6, fontWeight: 600 }}>Giriş Yap</Link>
            <button onClick={() => setShowForm(v => !v)} className="hov" style={{ color: "#fff", fontSize: 13, padding: "8px 18px", background: "#E8380D", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Üyelik Talebi</button>
          </div>
        </nav>

        <div style={{ background: "linear-gradient(160deg,#FFF5F3 0%,#fff 60%)", padding: "72px 40px 56px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "3rem", alignItems: "center" }} className="lp-hero-grid">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#FFF0ED", border: "1px solid #FECDC5", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8380D" }} />
                <span style={{ color: "#C42A0A", fontSize: 11, fontWeight: 600 }}>Türkiye&apos;nin İlk Kapalı Devre B2B Emlak Platformu</span>
              </div>
              <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-1px", marginBottom: 16, color: "#111827" }}>
                Emlakta Yeni Nesil<br />
                <span style={{ color: "#E8380D" }}>İş Birliği Platformu</span>
              </h1>
              <p style={{ color: "#4B5563", fontSize: 15, lineHeight: 1.8, marginBottom: 8 }}>
                Emlak ofislerinin en büyük sorunu — <strong style={{ color: "#111827" }}>müşteriye doğru ilanı zamanında sunamamak.</strong>
              </p>
              <p style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.8, marginBottom: 28 }}>
                EPH bu kayıp satışları sıfıra indiren akıllı eşleştirme sistemiyle; emlakçı, müteahhit ve inşaat firmalarının portföy ve taleplerini güvenle paylaştığı kapalı devre profesyonel ağdır.
              </p>
              <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" as const }}>
                <button onClick={() => setShowForm(v => !v)} className="hov" style={{ background: "#E8380D", color: "#fff", border: "none", padding: "12px 26px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Üyelik Talebinde Bulun →
                </button>
                <Link href="/giris" className="hov" style={{ border: "1.5px solid #D1D5DB", color: "#374151", padding: "12px 22px", borderRadius: 6, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Giriş Yap
                </Link>
              </div>
              {showForm && (
                <div style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 20, marginBottom: 24, animation: "fadeUp 0.3s ease" }}>
                  <div style={{ color: "#111827", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Üyelik Talebinde Bulunun</div>
                  <div style={{ color: "#6B7280", fontSize: 11, marginBottom: 14 }}>Bilgilerinizi bırakın, sizinle iletişime geçelim.</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    {[{ ph: "Ad Soyad", key: "ad" }, { ph: "Telefon", key: "tel" }, { ph: "Email", key: "email" }].map(({ ph, key }) => (
                      <input key={key} placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 6, padding: "9px 12px", fontSize: 12, width: "100%", boxSizing: "border-box" as const, outline: "none" }} />
                    ))}
                    <select value={form.meslek} onChange={e => setForm(f => ({ ...f, meslek: e.target.value }))}
                      style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 6, padding: "9px 12px", fontSize: 12 }}>
                      <option value="">Mesleğiniz</option>
                      <option>Emlakçı</option><option>Müteahhit</option><option>İnşaat Firması</option>
                    </select>
                    <input placeholder="Referans Kodu (varsa)" value={form.kod} onChange={e => setForm(f => ({ ...f, kod: e.target.value }))}
                      style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 6, padding: "9px 12px", fontSize: 12, boxSizing: "border-box" as const, outline: "none" }} />
                    <button style={{ background: "#E8380D", color: "#fff", border: "none", borderRadius: 6, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Talebi Gönder</button>
                  </div>
                </div>
              )}
              <div className="lp-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{ padding: "16px 12px", textAlign: "center" as const, borderRight: i < 3 ? "1px solid #E5E7EB" : "none" }}>
                    <div style={{ color: "#E8380D", fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: "#9CA3AF", fontSize: 9, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
              {[
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "#E8380D", bg: "#FFF0ED", title: "Doğrulanmış Üyelik", desc: "Yetki belgesi ve mesleki belgeler ile doğrulanmış profesyoneller" },
                { icon: "M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z", color: "#2563EB", bg: "#EFF6FF", title: "Canlı Stok Takibi", desc: "Gerçek zamanlı proje ve birim bilgileri, anlık piyasa verileri" },
                { icon: "M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197", color: "#16A34A", bg: "#F0FDF4", title: "Ortak Satış & Komisyon", desc: "Portföyünü paylaş, komisyon kazan. Güvenli ve şeffaf iş birliği" },
              ].map(item => (
                <div key={item.title} className="card" style={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14, borderLeft: `4px solid ${item.color}` }}>
                  <div style={{ width: 38, height: 38, background: item.bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8"><path d={item.icon}/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6", padding: "10px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.5px", whiteSpace: "nowrap" as const }}>CANLI PİYASA</span>
            {[
              { label: "USD/TRY", val: "38.42", up: true },
              { label: "EUR/TRY", val: "41.85", up: false },
              { label: "Gram Altın", val: "3.840 ₺", up: true },
              { label: "BIST 100", val: "9.240", up: true },
              { label: "BTC", val: "$94.200", up: true },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#4B5563" }}>{p.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: p.up ? "#16A34A" : "#DC2626" }}>{p.val} {p.up ? "▲" : "▼"}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "64px 40px", background: "#fff", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center" as const, marginBottom: 48 }}>
              <div style={{ color: "#E8380D", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>NASIL ÇALIŞIR?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 10 }}>4 adımda platforma katıl</h2>
              <p style={{ color: "#6B7280", fontSize: 13 }}>Hızlı, güvenli ve profesyonel</p>
            </div>
            <div className="lp-steps" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
              {[
                { n: "1", title: "Başvur", desc: "Üyelik talebi oluştur veya davet kodu ile kayıt ol", color: "#E8380D" },
                { n: "2", title: "Belgele", desc: "Mesleki belgelerini yükle, kimliğini doğrulat", color: "#2563EB" },
                { n: "3", title: "Onayla", desc: "Admin onayının ardından platforma erişim sağla", color: "#16A34A" },
                { n: "4", title: "Kazan", desc: "Stok paylaş, ortak sat, komisyon kazan", color: "#D97706" },
              ].map((s, i) => (
                <div key={s.n} style={{ textAlign: "center" as const, padding: "0 10px" }}>
                  <div style={{ width: 56, height: 56, background: s.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, fontWeight: 700, color: "#fff", animation: `float 3s ease ${i * 0.3}s infinite` }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "64px 40px", background: "#F9FAFB" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center" as const, marginBottom: 44 }}>
              <div style={{ color: "#E8380D", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>NEDEN EPH?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>Platforma özel güçlü özellikler</h2>
            </div>
            <div className="lp-features" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="card" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "22px 20px", borderTop: `3px solid ${f.color}` }}>
                  <div style={{ width: 42, height: 42, background: f.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8"><path d={f.icon} /></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "64px 40px", background: "#fff", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ textAlign: "center" as const, marginBottom: 32 }}>
              <div style={{ color: "#E8380D", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>ARAÇLAR</div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>Kredi Hesaplama Modülü</h2>
              <p style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>Müşterinize anında kredi bilgisi sunun</p>
            </div>
            <KrediHesapla />
          </div>
        </div>

        <div style={{ padding: "64px 40px", background: "#F9FAFB" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center" as const, marginBottom: 44 }}>
              <div style={{ color: "#E8380D", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>ÜYELERİMİZ NE DİYOR?</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>Gerçek deneyimler</h2>
            </div>
            <div className="lp-testi" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {TESTIMONIALS.map((tm, i) => (
                <div key={i} className="card" style={{ background: "#fff", border: tm.featured ? "2px solid #E8380D" : "1px solid #E5E7EB", borderRadius: 12, padding: 24 }}>
                  {tm.featured && <div style={{ background: "#E8380D", color: "#fff", fontSize: 9, fontWeight: 600, padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 12, letterSpacing: "0.5px" }}>ÖNE ÇIKAN</div>}
                  <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                    {[...Array(5)].map((_, j) => <svg key={j} width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                  </div>
                  <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.75, marginBottom: 16 }}>&ldquo;{tm.text}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: tm.featured ? "#E8380D" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tm.featured ? "#fff" : "#374151", fontWeight: 700 }}>{tm.initials}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{tm.name}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{tm.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "64px 40px", background: "#fff" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center" as const, marginBottom: 40 }}>
              <div style={{ color: "#E8380D", fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 10 }}>HAKKIMIZDA</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>Biz Kimiz?</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {[
                "EPH (Emlak Portföy Havuzu), gayrimenkul sektörünün gerçek ihtiyaçlarından yola çıkılarak; emlakçı, müteahhit ve yazılım alanlarında uzman dört girişimci tarafından Denizli'de hayata geçirilmiştir. Platform, sektördeki en kritik sorunu — doğru mülkü doğru müşteriye zamanında ulaştıramamayı — çözmek amacıyla geliştirilmiş; kapalı devre, davet bazlı ve yalnızca doğrulanmış profesyonellere açık bir B2B ağ olarak tasarlanmıştır.",
                "Pilot bölge olarak seçilen Denizli'de yürütülen çalışmalar son derece olumlu sonuçlar vermiş; platform kısa sürede emlakçılar, müteahhitler ve inşaat firmaları arasında güvenilir bir iş birliği köprüsüne dönüşmüştür. Gerçek zamanlı stok takibi, yapay zeka destekli ilan görseli oluşturma ve entegre CRM sistemi gibi yenilikçi özellikleriyle EPH, sektörde dijital dönüşümün öncüsü olmayı hedeflemektedir.",
                "2027 yılı itibarıyla Türkiye geneline açılmayı ve en az 10 şehri kapsayan güçlü bir büyüme ivmesi yakalamayı hedefleyen EPH Platform, merkez ofisini Denizli'nin prestijli iş adreslerinden Skycity İş Merkezi'nde konumlandırmıştır.",
              ].map((p, i) => (
                <p key={i} style={{ color: "#4B5563", fontSize: 14, lineHeight: 1.9, borderLeft: "3px solid #E8380D", paddingLeft: 18, margin: 0 }}>{p}</p>
              ))}
            </div>
            <div style={{ marginTop: 32, background: "#FFF5F3", border: "1px solid #FECDC5", borderRadius: 12, padding: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 40, height: 40, background: "#FFF0ED", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8380D" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div style={{ color: "#111827", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Merkez Ofis</div>
                <div style={{ color: "#4B5563", fontSize: 12, lineHeight: 1.8 }}>
                  Skycity İş Merkezi, 4. Kat No:36<br />
                  Sümer Mah. 2482/2 Sok. No:4/1<br />
                  20020 Merkezefendi / Denizli
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "72px 40px", background: "#E8380D", textAlign: "center" as const }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#86EFAC" }} />
            <span style={{ color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: 500 }}>B2B · Şifreli Erişim · Sadece Profesyoneller</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, color: "#fff" }}>Platforma katılmaya<br />hazır mısınız?</h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 32px" }}>
            Davet kodunuzu alın, belgelerinizi yükleyin ve Türkiye&apos;nin en güçlü emlak ağına katılın.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
            <button onClick={() => setShowForm(v => !v)} className="hov" style={{ background: "#fff", color: "#E8380D", border: "none", padding: "13px 32px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Üyelik Talebinde Bulun</button>
            <Link href="/giris" className="hov" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", padding: "13px 32px", borderRadius: 6, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Giriş Yap</Link>
          </div>
        </div>

        <div style={{ padding: "24px 40px", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LOGO_EPH.png" alt="EPH" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ color: "#6B7280", fontSize: 11 }}>© 2026 EPH Platform. Tüm hakları saklıdır.</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Gizlilik", "Kullanım Şartları", "KVKK", "İletişim"].map(l => (
              <a key={l} href="#" style={{ color: "#6B7280", fontSize: 11, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>

        <AiChat />
      </div>
    </>
  );
}