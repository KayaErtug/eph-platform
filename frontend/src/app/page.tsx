"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import FinancialTicker from "@/components/FinancialTicker";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://emlakportfoyhavuzu.com/api";
const AVATAR = "https://aday.segem.org.tr/files/image/avatar.png";

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
        body: JSON.stringify({ message: msg, history: newMessages.slice(0, -1).slice(-40) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Bir hata oluştu." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Bağlantı hatası." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!shown) return null;

  return (
    <>
      <style>{`
        @keyframes neonPulse {
          0% { box-shadow: 0 0 0 0 rgba(201,168,76,0.9), 0 0 15px rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 0 14px rgba(201,168,76,0), 0 0 40px rgba(201,168,76,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.9), 0 0 15px rgba(201,168,76,0.4); }
        }
        @keyframes neonRing { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-14px)} 60%{transform:translateY(-6px)} }
        @keyframes slideInBubble { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes avatarAppear { from{opacity:0;transform:scale(0.4) translateY(40px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typingDot { 0%,100%{opacity:0.3;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }
        .ai-avatar-img { animation: avatarAppear 0.7s cubic-bezier(0.34,1.56,0.64,1) both, bounce 1s ease 1s 3; width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #C9A84C;display:block;position:relative;z-index:2; }
        .neon-ring { position:absolute;inset:-8px;border-radius:50%;border:2.5px solid #C9A84C;animation:neonRing 1.5s ease-out infinite; }
        .neon-ring-2 { position:absolute;inset:-8px;border-radius:50%;border:2px solid #0F2044;animation:neonRing 1.5s ease-out 0.5s infinite; }
        .neon-ring-3 { position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(201,168,76,0.5);animation:neonRing 1.5s ease-out 1s infinite; }
        .neon-glow { animation: neonPulse 1.5s ease-in-out infinite !important; }
        .chat-scroll::-webkit-scrollbar{width:3px} .chat-scroll::-webkit-scrollbar-thumb{background:#C9A84C;border-radius:2px}
      `}</style>

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
        {bubble && !open && (
          <div style={{ background: "#fff", border: "1px solid #E8E4DC", padding: "12px 16px", fontSize: 13, color: "#0F2044", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", maxWidth: 220, lineHeight: 1.6, animation: "slideInBubble 0.4s ease", fontFamily: "'DM Sans', sans-serif" }}>
            👋 Merhaba! Nasıl yardımcı olabilirim?
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>Lina · EPH Asistan</div>
          </div>
        )}
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => { setOpen(v => !v); setBubble(false); }}>
          {glowing && (<><div className="neon-ring" /><div className="neon-ring-2" /><div className="neon-ring-3" /></>)}
          <img src={AVATAR} alt="Lina" className={`ai-avatar-img${glowing ? " neon-glow" : ""}`} />
          <div style={{ position: "absolute", bottom: 4, right: 4, width: 18, height: 18, background: "#22C55E", borderRadius: "50%", border: "3px solid #fff", zIndex: 3 }} />
        </div>
        {open && (
          <div style={{ position: "fixed", bottom: isMobile ? 0 : 110, right: isMobile ? 0 : 0, width: isMobile ? "100vw" : "360px", height: isMobile ? "100dvh" : "520px", background: "#fff", border: isMobile ? "none" : "1px solid #E8E4DC", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", overflow: "hidden", animation: isMobile ? "slideUp 0.3s ease" : "slideInBubble 0.3s ease", display: "flex", flexDirection: "column", zIndex: 1000 }}>
            <div style={{ background: "#0F2044", padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <img src={AVATAR} alt="Lina" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(201,168,76,0.5)" }} />
              <div>
                <div style={{ color: "#F5F3EF", fontSize: 14, fontWeight: 500, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.3 }}>Lina</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%" }} />
                  <span style={{ color: "rgba(245,243,239,0.7)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>EPH Asistan</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#F5F3EF", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>
            <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                  {m.role === "assistant" && <img src={AVATAR} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ background: m.role === "user" ? "#0F2044" : "#F5F3EF", color: m.role === "user" ? "#F5F3EF" : "#0F2044", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, maxWidth: "78%", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <img src={AVATAR} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                  <div style={{ background: "#F5F3EF", padding: "12px 16px", display: "flex", gap: 5 }}>
                    {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 7, height: 7, background: "#C9A84C", borderRadius: "50%", animation: `typingDot 1s ease ${d}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {messages.length === 1 && (
              <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {["Üyelik nasıl olur?", "Platform ne işe yarar?", "Ücretli mi?"].map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{ background: "transparent", border: "1px solid #C9A84C", color: "#0F2044", fontSize: 11, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5 }}>{q}</button>
                ))}
              </div>
            )}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E8E4DC", display: "flex", gap: 8, flexShrink: 0 }}>
              <input placeholder="Bir şeyler yazın..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                style={{ flex: 1, border: "none", borderBottom: "1.5px solid #D4CEC4", padding: "8px 0", fontSize: 13, outline: "none", background: "transparent", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }} />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? "#D4CEC4" : "#0F2044", border: "none", width: 36, height: 36, cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
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
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleFormSubmit = async () => {
    if (!form.ad || !form.tel || !form.email || !form.meslek) {
      setFormError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const ROLE_MAP: Record<string, string> = { "Emlakçı": "EMLAKCI", "Müteahhit": "MUTEAHHIT", "İnşaat Firması": "INSAAT_FIRMASI" };
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantName: form.ad, applicantPhone: form.tel, applicantEmail: form.email, requestedRole: ROLE_MAP[form.meslek] || "EMLAKCI", referralCode: form.kod || undefined, message: "" }),
      });
      if (!res.ok) throw new Error();
      setFormSuccess(true);
      setForm({ ad: "", tel: "", email: "", meslek: "", kod: "" });
      setShowForm(false);
    } catch {
      setFormError("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #0F2044;
          --gold: #C9A84C;
          --cream: #F5F3EF;
          --warm-white: #FAFAF8;
          --text: #1A1A2E;
          --muted: #8A8A8A;
          --border: #E2DDD5;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans: 'DM Sans', system-ui, sans-serif;
        }

        body { font-family: var(--sans); background: var(--warm-white); color: var(--text); }

        .lp { overflow-x: hidden; }

        /* NAV */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 0 60px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(250,250,248,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        @media (max-width: 768px) { .lp-nav { padding: 0 24px; } }

        .lp-nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .lp-nav-logo img { width: 38px; height: 38px; object-fit: contain; }

        .lp-nav-logo-text {
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 500;
          color: var(--navy);
          letter-spacing: 0.3px;
        }

        .lp-nav-logo-sub {
          font-size: 8px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 400;
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 36px;
        }

        @media (max-width: 768px) { .lp-nav-links { display: none; } }

        .lp-nav-link {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--navy);
          text-decoration: none;
          font-weight: 400;
          transition: color 0.2s;
          opacity: 0.7;
        }

        .lp-nav-link:hover { opacity: 1; color: var(--gold); }

        .lp-nav-cta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lp-btn-outline {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--navy);
          text-decoration: none;
          border: 1px solid var(--navy);
          padding: 9px 20px;
          font-family: var(--sans);
          transition: all 0.3s;
        }

        .lp-btn-outline:hover { background: var(--navy); color: var(--cream); }

        .lp-btn-solid {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--cream);
          background: var(--navy);
          border: none;
          padding: 10px 22px;
          font-family: var(--sans);
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .lp-btn-solid::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: var(--gold);
          transition: left 0.4s cubic-bezier(0.4,0,0.2,1);
        }

        .lp-btn-solid:hover::before { left: 0; }
        .lp-btn-solid:hover { color: var(--navy); }
        .lp-btn-solid span { position: relative; z-index: 1; }

        /* HERO */
        .lp-hero {
          padding-top: 72px;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
        }

        @media (max-width: 768px) { .lp-hero { grid-template-columns: 1fr; } }

        .lp-hero-left {
          background: var(--navy);
          padding: 100px 80px 80px 60px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) { .lp-hero-left { padding: 60px 24px; } }

        .lp-hero-left::before {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 1px; height: 100%;
          background: linear-gradient(to bottom, transparent, rgba(201,168,76,0.4), transparent);
        }

        .lp-hero-number {
          font-family: var(--serif);
          font-size: 200px;
          font-weight: 300;
          color: rgba(201,168,76,0.06);
          line-height: 1;
          position: absolute;
          bottom: -20px;
          right: -10px;
          pointer-events: none;
          user-select: none;
        }

        .lp-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(201,168,76,0.3);
          padding: 6px 16px;
          width: fit-content;
          margin-bottom: 40px;
        }

        .lp-hero-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--gold);
          animation: pulse-gold 2s ease infinite;
        }

        @keyframes pulse-gold {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.5;transform:scale(0.8)}
        }

        .lp-hero-badge-text {
          font-size: 9px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 400;
        }

        .lp-hero-h1 {
          font-family: var(--serif);
          font-size: clamp(48px, 5vw, 72px);
          font-weight: 300;
          line-height: 1.05;
          color: var(--cream);
          margin-bottom: 32px;
          letter-spacing: -1px;
        }

        .lp-hero-h1 em {
          font-style: italic;
          color: var(--gold);
        }

        .lp-hero-desc {
          font-size: 14px;
          line-height: 1.8;
          color: rgba(245,243,239,0.5);
          max-width: 380px;
          font-weight: 300;
          margin-bottom: 48px;
        }

        .lp-hero-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .lp-hero-btn-primary {
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--navy);
          background: var(--gold);
          border: none;
          padding: 14px 28px;
          font-family: var(--sans);
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
        }

        .lp-hero-btn-primary:hover { background: #B8962A; }

        .lp-hero-btn-secondary {
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(245,243,239,0.6);
          background: transparent;
          border: 1px solid rgba(245,243,239,0.2);
          padding: 14px 28px;
          font-family: var(--sans);
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s;
        }

        .lp-hero-btn-secondary:hover { border-color: rgba(245,243,239,0.5); color: var(--cream); }

        .lp-hero-stats {
          display: flex;
          gap: 40px;
          padding-top: 48px;
          border-top: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 1;
        }

        .lp-hero-stat-num {
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 400;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 4px;
        }

        .lp-hero-stat-label {
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(245,243,239,0.35);
        }

        .lp-hero-right {
          background: var(--cream);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 100px 60px 80px 80px;
          position: relative;
        }

        @media (max-width: 768px) { .lp-hero-right { padding: 60px 24px; display: none; } }

        .lp-ticker-wrapper {
          background: var(--navy);
          padding: 0;
          overflow: hidden;
        }

        /* FORM OVERLAY */
        .lp-form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,32,68,0.7);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .lp-form-box {
          background: var(--warm-white);
          width: 100%;
          max-width: 480px;
          padding: 48px;
          position: relative;
          animation: slideUp 0.4s ease;
        }

        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        .lp-form-close {
          position: absolute;
          top: 20px; right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          font-size: 20px;
        }

        .lp-form-title {
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 400;
          color: var(--navy);
          margin-bottom: 8px;
        }

        .lp-form-sub {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 32px;
          font-weight: 300;
        }

        .lp-form-divider {
          width: 32px; height: 2px;
          background: var(--gold);
          margin-bottom: 32px;
        }

        .lp-form-field { margin-bottom: 20px; }

        .lp-form-label {
          display: block;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--navy);
          font-weight: 500;
          margin-bottom: 10px;
        }

        .lp-form-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--border);
          padding: 10px 0;
          font-size: 14px;
          color: var(--navy);
          font-family: var(--sans);
          outline: none;
          transition: border-color 0.3s;
          font-weight: 300;
        }

        .lp-form-input:focus { border-bottom-color: var(--navy); }

        .lp-form-select {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--border);
          padding: 10px 0;
          font-size: 14px;
          color: var(--navy);
          font-family: var(--sans);
          outline: none;
          appearance: none;
          cursor: pointer;
          font-weight: 300;
        }

        .lp-form-error { font-size: 11px; color: #C0392B; margin-top: 6px; }

        .lp-form-submit {
          width: 100%;
          background: var(--navy);
          color: var(--cream);
          border: none;
          padding: 16px;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-family: var(--sans);
          cursor: pointer;
          margin-top: 24px;
          transition: all 0.3s;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }

        .lp-form-submit::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: var(--gold);
          transition: left 0.4s;
        }

        .lp-form-submit:hover::before { left: 0; }
        .lp-form-submit:hover { color: var(--navy); }
        .lp-form-submit span { position: relative; z-index: 1; }
        .lp-form-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .lp-form-submit:disabled::before { display: none; }

        /* SECTIONS */
        .lp-section { padding: 120px 60px; }
        @media (max-width: 768px) { .lp-section { padding: 80px 24px; } }

        .lp-section-label {
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 500;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lp-section-label::after {
          content: '';
          flex: 1;
          max-width: 40px;
          height: 1px;
          background: var(--gold);
        }

        .lp-section-h2 {
          font-family: var(--serif);
          font-size: clamp(36px, 4vw, 54px);
          font-weight: 300;
          line-height: 1.1;
          color: var(--navy);
          letter-spacing: -0.5px;
        }

        .lp-section-h2 em { font-style: italic; color: var(--gold); }

        /* NASIL ÇALIŞIR */
        .lp-how {
          background: var(--cream);
          padding: 120px 60px;
        }

        .lp-how-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
          margin-top: 64px;
        }

        @media (max-width: 768px) { .lp-how-grid { grid-template-columns: 1fr 1fr; } }

        .lp-how-item {
          background: var(--cream);
          padding: 40px 32px;
          position: relative;
          transition: background 0.3s;
        }

        .lp-how-item:hover { background: var(--warm-white); }

        .lp-how-num {
          font-family: var(--serif);
          font-size: 64px;
          font-weight: 300;
          color: rgba(201,168,76,0.15);
          line-height: 1;
          margin-bottom: 20px;
        }

        .lp-how-title {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--navy);
          margin-bottom: 12px;
        }

        .lp-how-desc {
          font-size: 13px;
          line-height: 1.7;
          color: var(--muted);
          font-weight: 300;
        }

        /* ÖZELLIKLER */
        .lp-features {
          background: var(--warm-white);
          padding: 120px 60px;
        }

        .lp-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px 100px;
          margin-top: 80px;
        }

        @media (max-width: 768px) { .lp-features-grid { grid-template-columns: 1fr; gap: 48px; } }

        .lp-feature-item { border-top: 1px solid var(--border); padding-top: 32px; }

        .lp-feature-icon {
          width: 40px; height: 40px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .lp-feature-title {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--navy);
          margin-bottom: 12px;
        }

        .lp-feature-desc {
          font-size: 13px;
          line-height: 1.8;
          color: var(--muted);
          font-weight: 300;
        }

        /* KREDİ */
        .lp-kredi {
          background: var(--navy);
          padding: 120px 60px;
        }

        .lp-kredi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          margin-top: 64px;
          align-items: start;
        }

        @media (max-width: 768px) { .lp-kredi-grid { grid-template-columns: 1fr; } }

        .lp-kredi-desc {
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245,243,239,0.5);
          font-weight: 300;
          margin-top: 24px;
        }

        .lp-kredi-form { display: flex; flex-direction: column; gap: 20px; }

        .lp-kredi-field label {
          display: block;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.7);
          margin-bottom: 10px;
        }

        .lp-kredi-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          padding: 10px 0;
          font-size: 14px;
          color: var(--cream);
          font-family: var(--sans);
          outline: none;
          font-weight: 300;
        }

        .lp-kredi-results {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.06);
          margin-top: 8px;
        }

        .lp-kredi-result {
          background: rgba(15,32,68,0.8);
          padding: 20px 16px;
        }

        .lp-kredi-result-label {
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.6);
          margin-bottom: 8px;
        }

        .lp-kredi-result-value {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--gold);
        }

        /* TESTİMONYALS */
        .lp-testimonials {
          background: var(--cream);
          padding: 120px 60px;
        }

        .lp-testi-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1px;
          background: var(--border);
          margin-top: 64px;
        }

        @media (max-width: 768px) { .lp-testi-grid { grid-template-columns: 1fr; } }

        .lp-testi-item {
          background: var(--cream);
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .lp-testi-featured { background: var(--navy); }

        .lp-testi-quote {
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 300;
          line-height: 1.6;
          color: var(--navy);
          font-style: italic;
          margin-bottom: 32px;
        }

        .lp-testi-featured .lp-testi-quote { color: rgba(245,243,239,0.8); }

        .lp-testi-author {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        .lp-testi-featured .lp-testi-author { border-top-color: rgba(255,255,255,0.08); }

        .lp-testi-avatar {
          width: 36px; height: 36px;
          background: var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--serif);
          font-size: 16px;
          color: var(--navy);
          font-weight: 400;
        }

        .lp-testi-name {
          font-size: 13px;
          color: var(--navy);
          font-weight: 500;
        }

        .lp-testi-featured .lp-testi-name { color: var(--cream); }

        .lp-testi-role {
          font-size: 11px;
          color: var(--muted);
          font-weight: 300;
          margin-top: 2px;
        }

        .lp-testi-featured .lp-testi-role { color: rgba(245,243,239,0.4); }

        /* HAKKIMIZDA */
        .lp-about {
          background: var(--warm-white);
          padding: 120px 60px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 100px;
          align-items: start;
        }

        @media (max-width: 768px) { .lp-about { grid-template-columns: 1fr; gap: 48px; } }

        .lp-about-left { position: sticky; top: 100px; }

        .lp-about-text {
          font-size: 15px;
          line-height: 1.9;
          color: var(--muted);
          font-weight: 300;
          margin-bottom: 24px;
        }

        .lp-about-address {
          border-left: 2px solid var(--gold);
          padding-left: 20px;
          margin-top: 40px;
        }

        .lp-about-address-title {
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 10px;
        }

        .lp-about-address-text {
          font-size: 13px;
          line-height: 1.8;
          color: var(--muted);
          font-weight: 300;
        }

        /* CTA */
        .lp-cta {
          background: var(--navy);
          padding: 120px 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) { .lp-cta { grid-template-columns: 1fr; gap: 48px; padding: 80px 24px; } }

        .lp-cta::before {
          content: 'EPH';
          position: absolute;
          right: -40px;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--serif);
          font-size: 300px;
          font-weight: 300;
          color: rgba(201,168,76,0.03);
          pointer-events: none;
          user-select: none;
        }

        .lp-cta-h2 {
          font-family: var(--serif);
          font-size: clamp(40px, 4vw, 64px);
          font-weight: 300;
          line-height: 1.05;
          color: var(--cream);
          letter-spacing: -0.5px;
        }

        .lp-cta-h2 em { font-style: italic; color: var(--gold); }

        .lp-cta-right { position: relative; z-index: 1; }

        .lp-cta-desc {
          font-size: 14px;
          line-height: 1.8;
          color: rgba(245,243,239,0.45);
          font-weight: 300;
          margin-bottom: 36px;
        }

        .lp-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }

        /* FOOTER */
        .lp-footer {
          background: #0A1628;
          padding: 40px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }

        @media (max-width: 768px) { .lp-footer { padding: 32px 24px; } }

        .lp-footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .lp-footer-logo img { width: 24px; height: 24px; object-fit: contain; }

        .lp-footer-logo-text {
          font-family: var(--serif);
          font-size: 16px;
          color: rgba(245,243,239,0.5);
        }

        .lp-footer-copy {
          font-size: 11px;
          color: rgba(245,243,239,0.2);
          font-weight: 300;
        }

        .lp-footer-links {
          display: flex;
          gap: 24px;
        }

        .lp-footer-link {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(245,243,239,0.25);
          text-decoration: none;
          transition: color 0.2s;
        }

        .lp-footer-link:hover { color: var(--gold); }

        /* SUCCESS */
        .lp-success {
          background: #F0FDF4;
          border-left: 3px solid #16A34A;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .lp-success-text { font-size: 13px; color: #15803D; font-weight: 400; }
      `}</style>

      <div className="lp">
        {/* TICKER */}
        <div className="lp-ticker-wrapper">
          <FinancialTicker />
        </div>

        {/* NAV */}
        <nav className="lp-nav">
          <a href="#" className="lp-nav-logo">
            <img src="/LOGO_EPH.png" alt="EPH" />
            <div>
              <div className="lp-nav-logo-text">EPH Platform</div>
              <div className="lp-nav-logo-sub">Emlak Portföy Havuzu</div>
            </div>
          </a>
          <div className="lp-nav-links">
            {["Platform", "Nasıl Çalışır?", "Hakkımızda", "İletişim"].map(l => (
              <a key={l} href="#" className="lp-nav-link">{l}</a>
            ))}
          </div>
          <div className="lp-nav-cta">
            <Link href="/giris" className="lp-btn-outline">Giriş Yap</Link>
            <button onClick={() => setShowForm(true)} className="lp-btn-solid">
              <span>Üyelik Talebi</span>
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-left">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="lp-hero-badge">
                <div className="lp-hero-badge-dot" />
                <span className="lp-hero-badge-text">Türkiye&apos;nin İlk Kapalı Devre B2B Emlak Platformu</span>
              </div>
              <h1 className="lp-hero-h1">
                Emlakta<br />
                <em>Yeni Nesil</em><br />
                İş Birliği
              </h1>
              <p className="lp-hero-desc">
                Doğrulanmış emlakçı, müteahhit ve inşaat firmalarının portföylerini güvenle paylaştığı, ortak satış yaptığı kapalı devre profesyonel ekosistem.
              </p>
              <div className="lp-hero-actions">
                <button onClick={() => setShowForm(true)} className="lp-hero-btn-primary">
                  Üyelik Talebinde Bulun
                </button>
                <Link href="/giris" className="lp-hero-btn-secondary">
                  Giriş Yap
                </Link>
              </div>
            </div>
            <div className="lp-hero-stats" style={{ position: "relative", zIndex: 1 }}>
              {[["344+", "Aktif Üye"], ["8.700+", "Portföy İlanı"], ["65+", "Başarılı Satış"]].map(([num, label]) => (
                <div key={label}>
                  <div className="lp-hero-stat-num">{num}</div>
                  <div className="lp-hero-stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="lp-hero-number">01</div>
          </div>

          <div className="lp-hero-right">
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: -20, left: -20, width: 2, height: 60, background: "var(--gold)" }} />
              <p style={{ fontFamily: "var(--serif)", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 24 }}>Platform Özellikleri</p>
              {[
                { title: "Kapalı Devre Ağ", desc: "Sadece doğrulanmış profesyonellere açık, güvenli iş birliği platformu." },
                { title: "Gerçek Zamanlı Stok", desc: "Tüm portföy ilanları anlık güncellenir. Doğru mülkü zamanında sunun." },
                { title: "Ortak Satış Sistemi", desc: "Komisyon anlaşmalarını dijital ortamda yönetin. Birlikte büyüyün." },
                { title: "AI Destekli Görsel", desc: "Yapay zeka ile profesyonel ilan görselleri oluşturun, hızla paylaşın." },
              ].map((f, i) => (
                <div key={f.title} style={{ borderBottom: "1px solid var(--border)", padding: "24px 0", display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--gold)", minWidth: 20, marginTop: 2, fontWeight: 300 }}>0{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 400, color: "var(--navy)", marginBottom: 6 }}>{f.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--muted)", fontWeight: 300 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NASIL ÇALIŞIR */}
        <section className="lp-how">
          <div className="lp-section-label">Süreç</div>
          <h2 className="lp-section-h2">
            4 Adımda<br />
            <em>Platforma Katıl</em>
          </h2>
          <div className="lp-how-grid">
            {[
              { n: "01", title: "Başvur", desc: "Üyelik talebi oluştur veya referans koduyla kayıt ol." },
              { n: "02", title: "Belgele", desc: "Mesleki belgelerini yükle, kimliğini doğrulat." },
              { n: "03", title: "Onayla", desc: "Admin onayının ardından platforma erişim sağla." },
              { n: "04", title: "Kazan", desc: "Stok paylaş, ortak sat, komisyon kazan." },
            ].map(s => (
              <div key={s.n} className="lp-how-item">
                <div className="lp-how-num">{s.n}</div>
                <div className="lp-how-title">{s.title}</div>
                <div className="lp-how-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ÖZELLİKLER */}
        <section className="lp-features">
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="lp-section-label">Neden EPH?</div>
            <h2 className="lp-section-h2">
              Platforma Özel<br />
              <em>Güçlü Özellikler</em>
            </h2>
            <div className="lp-features-grid">
              {[
                { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "Doğrulanmış Üyelik", desc: "Yetki belgesi ve mesleki belgeler ile doğrulanmış profesyoneller. Güvenli ve şeffaf iş birliği ortamı." },
                { icon: "M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z", title: "Canlı Stok Takibi", desc: "Gerçek zamanlı proje ve birim bilgileri. Anlık piyasa verileri ile her zaman güncel kalın." },
                { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", title: "Ortak Satış & Komisyon", desc: "Portföyünü paylaş, komisyon kazan. Güvenli ve şeffaf iş birliği altyapısı." },
                { icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", title: "AI Destekli Görsel", desc: "Yapay zeka ile profesyonel ilan görselleri oluşturun. WhatsApp, Instagram'da tek tıkla paylaşın." },
                { icon: "M22 12h-4l-3 9L9 3l-3 9H2", title: "CRM & Pipeline", desc: "Müşteri notu, randevu ve satış süreci takibi. Süreçlerinizi sistematik olarak yönetin." },
                { icon: "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01", title: "Mobil & Hızlı", desc: "Sahadayken bile tek elinizle işlem yapın. Veri girişi basit, portföy inceleme hızlı." },
              ].map(f => (
                <div key={f.title} className="lp-feature-item">
                  <div className="lp-feature-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><path d={f.icon} /></svg>
                  </div>
                  <div className="lp-feature-title">{f.title}</div>
                  <div className="lp-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KREDİ HESAPLAMA */}
        <KrediSection />

        {/* TESTİMONYALS */}
        <section className="lp-testimonials">
          <div className="lp-section-label">Üyelerimiz</div>
          <h2 className="lp-section-h2">
            Gerçek<br />
            <em>Deneyimler</em>
          </h2>
          <div className="lp-testi-grid">
            <div className="lp-testi-item lp-testi-featured">
              <p className="lp-testi-quote">&ldquo;EPH sayesinde yapay zeka destekli profesyonel ilan görselleri oluşturup müşterilerime tek tıkla ulaşabiliyorum. Platform, iş yapma şeklimi tamamen değiştirdi.&rdquo;</p>
              <div className="lp-testi-author">
                <div className="lp-testi-avatar" style={{ background: "var(--gold)" }}>V</div>
                <div>
                  <div className="lp-testi-name">Varol U.</div>
                  <div className="lp-testi-role">Müteahhit — Denizli</div>
                </div>
              </div>
            </div>
            {[
              { i: "M", n: "Mehmet C.", r: "Müteahhit — Ankara", q: "Doğru emlakçılara ulaşmak artık çok kolay. Ortak satış sistemi sayesinde projelerim çok daha hızlı satışa çıkıyor." },
              { i: "S", n: "Selin Y.", r: "İnşaat Firması — İzmir", q: "Gerçek zamanlı stok takibi sayesinde hiçbir fırsatı kaçırmıyoruz. Sahadayken bile tüm portföyümüze anında ulaşıyoruz." },
            ].map(t => (
              <div key={t.n} className="lp-testi-item">
                <p className="lp-testi-quote">&ldquo;{t.q}&rdquo;</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar" style={{ background: "var(--navy)", color: "var(--cream)" }}>{t.i}</div>
                  <div>
                    <div className="lp-testi-name">{t.n}</div>
                    <div className="lp-testi-role">{t.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HAKKIMIZDA */}
        <section className="lp-about">
          <div className="lp-about-left">
            <div className="lp-section-label">Hakkımızda</div>
            <h2 className="lp-section-h2" style={{ fontSize: 40 }}>
              Biz<br />
              <em>Kimiz?</em>
            </h2>
            <div className="lp-about-address" style={{ marginTop: 40 }}>
              <div className="lp-about-address-title">Merkez Ofis</div>
              <div className="lp-about-address-text">
                Skycity İş Merkezi<br />
                4. Kat No:36<br />
                Merkezefendi / Denizli
              </div>
            </div>
          </div>
          <div>
            {[
              "EPH (Emlak Portföy Havuzu), gayrimenkul sektörünün gerçek ihtiyaçlarından yola çıkılarak; emlakçı, müteahhit ve yazılım alanlarında uzman dört girişimci tarafından Denizli'de hayata geçirilmiştir.",
              "Platform, sektördeki en kritik sorunu — doğru mülkü doğru müşteriye zamanında ulaştıramamayı — çözmek amacıyla geliştirilmiş; kapalı devre, davet bazlı ve yalnızca doğrulanmış profesyonellere açık bir B2B ağ olarak tasarlanmıştır.",
              "2027 yılı itibarıyla Türkiye geneline açılmayı ve en az 10 şehri kapsayan güçlü bir büyüme ivmesi yakalamayı hedefleyen EPH Platform, sektörde dijital dönüşümün öncüsü olmayı hedeflemektedir.",
            ].map((p, i) => (
              <p key={i} className="lp-about-text">{p}</p>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta">
          <h2 className="lp-cta-h2">
            Platforma<br />
            Katılmaya<br />
            <em>Hazır mısınız?</em>
          </h2>
          <div className="lp-cta-right">
            <p className="lp-cta-desc">
              Referans kodunuzu alın veya üyelik talebinde bulunun. Türkiye&apos;nin en güçlü emlak profesyonel ağına katılın.
            </p>
            <div className="lp-cta-actions">
              <button onClick={() => setShowForm(true)} className="lp-hero-btn-primary">
                Üyelik Talebinde Bulun
              </button>
              <Link href="/giris" className="lp-hero-btn-secondary">
                Giriş Yap
              </Link>
            </div>
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 32 }}>
              {[["B2B", "Kapalı Devre"], ["Güvenli", "Şifreli Erişim"], ["Premium", "Profesyonel Ağ"]].map(([t, s]) => (
                <div key={t}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 11, color: "rgba(245,243,239,0.3)", fontWeight: 300 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-logo">
            <img src="/LOGO_EPH.png" alt="EPH" />
            <span className="lp-footer-logo-text">EPH Platform</span>
          </div>
          <span className="lp-footer-copy">© 2026 EPH Platform. Tüm hakları saklıdır.</span>
          <div className="lp-footer-links">
            {["Gizlilik", "KVKK", "İletişim"].map(l => (
              <a key={l} href="#" className="lp-footer-link">{l}</a>
            ))}
          </div>
        </footer>

        {/* FORM OVERLAY */}
        {showForm && (
          <div className="lp-form-overlay" onClick={() => setShowForm(false)}>
            <div className="lp-form-box" onClick={e => e.stopPropagation()}>
              <button className="lp-form-close" onClick={() => setShowForm(false)}>×</button>
              {formSuccess ? (
                <div>
                  <div className="lp-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="lp-success-text">Talebiniz alındı! En kısa sürede sizinle iletişime geçeceğiz.</span>
                  </div>
                  <button onClick={() => { setFormSuccess(false); setShowForm(false); }} className="lp-form-submit"><span>Kapat</span></button>
                </div>
              ) : (
                <>
                  <h2 className="lp-form-title">Üyelik Talebi</h2>
                  <p className="lp-form-sub">Bilgilerinizi bırakın, sizinle iletişime geçelim.</p>
                  <div className="lp-form-divider" />
                  <div className="lp-form-field">
                    <label className="lp-form-label">Ad Soyad *</label>
                    <input className="lp-form-input" placeholder="Adınız Soyadınız" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} />
                  </div>
                  <div className="lp-form-field">
                    <label className="lp-form-label">Telefon *</label>
                    <input className="lp-form-input" placeholder="+90 5__ ___ __ __" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} />
                  </div>
                  <div className="lp-form-field">
                    <label className="lp-form-label">E-posta *</label>
                    <input className="lp-form-input" placeholder="ornek@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="lp-form-field">
                    <label className="lp-form-label">Meslek *</label>
                    <select className="lp-form-select" value={form.meslek} onChange={e => setForm(f => ({ ...f, meslek: e.target.value }))}>
                      <option value="">Seçiniz</option>
                      <option>Emlakçı</option>
                      <option>Müteahhit</option>
                      <option>İnşaat Firması</option>
                    </select>
                  </div>
                  <div className="lp-form-field">
                    <label className="lp-form-label">Referans Kodu (varsa)</label>
                    <input className="lp-form-input" placeholder="EPH-XXXX-XXXX" value={form.kod} onChange={e => setForm(f => ({ ...f, kod: e.target.value }))} />
                  </div>
                  {formError && <p className="lp-form-error">{formError}</p>}
                  <button className="lp-form-submit" onClick={handleFormSubmit} disabled={formLoading}>
                    <span>{formLoading ? "Gönderiliyor..." : "Talebi Gönder"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <AiChat />
      </div>
    </>
  );
}

function KrediSection() {
  const [tutar, setTutar] = useState(1000000);
  const [sure, setSure] = useState(120);
  const [faiz, setFaiz] = useState(3.5);
  const f = faiz / 100;
  const taksit = f === 0 ? tutar / sure : tutar * (f * Math.pow(1 + f, sure)) / (Math.pow(1 + f, sure) - 1);
  const topOdeme = taksit * sure;
  const topFaiz = topOdeme - tutar;

  return (
    <section className="lp-kredi">
      <div className="lp-section-label" style={{ color: "rgba(201,168,76,0.7)" }}>Araçlar</div>
      <h2 className="lp-section-h2" style={{ color: "var(--cream)" }}>
        Kredi<br />
        <em>Hesaplama</em>
      </h2>
      <div className="lp-kredi-grid">
        <div>
          <p className="lp-kredi-desc">Müşterinize anında kredi bilgisi sunun. Taksit, faiz ve toplam ödeme tutarlarını gerçek zamanlı hesaplayın.</p>
        </div>
        <div>
          <div className="lp-kredi-form">
            {[
              { label: "Kredi Tutarı (₺)", val: tutar, set: setTutar, step: 50000 },
              { label: "Vade (Ay)", val: sure, set: setSure, step: 6 },
              { label: "Aylık Faiz (%)", val: faiz, set: setFaiz, step: 0.1 },
            ].map(({ label, val, set, step }) => (
              <div key={label} className="lp-kredi-field">
                <label>{label}</label>
                <input type="number" value={val} step={step} onChange={e => set(Number(e.target.value))} className="lp-kredi-input" />
              </div>
            ))}
          </div>
          <div className="lp-kredi-results" style={{ marginTop: 24 }}>
            {[
              { label: "Aylık Taksit", val: Math.round(taksit).toLocaleString("tr-TR") + " ₺" },
              { label: "Toplam Faiz", val: Math.round(topFaiz).toLocaleString("tr-TR") + " ₺" },
              { label: "Toplam Ödeme", val: Math.round(topOdeme).toLocaleString("tr-TR") + " ₺" },
            ].map(r => (
              <div key={r.label} className="lp-kredi-result">
                <div className="lp-kredi-result-label">{r.label}</div>
                <div className="lp-kredi-result-value">{r.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}