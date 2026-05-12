"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { loginSchema, LoginFormData } from "@/schemas/auth.schema";

const testimonials = [
  {
    text: "EPH sayesinde portföyümdeki ilanlar için yapay zeka destekli profesyonel ilan görselleri oluşturup, bunları müşterilerimle, WhatsApp, Instagram ve Facebook gruplarında tek tıkla paylaşabiliyorum.",
    name: "Varol U.",
    role: "Müteahhit — Denizli",
    initials: "VU",
    showSocial: true,
  },
  {
    text: "Müteahhit olarak doğru emlakçılara ulaşmak artık çok kolay. Ortak satış sistemi sayesinde projelerim çok hızlı satışa çıkıyor.",
    name: "Mehmet C.",
    role: "Müteahhit — Ankara",
    initials: "MC",
    showSocial: false,
  },
  {
    text: "Projelerimizi platforma ekledik, gerçek zamanlı stok takibi ve anlık bildirimler sayesinde hiçbir fırsatı kaçırmıyoruz.",
    name: "Selin Y.",
    role: "İnşaat Firması — İzmir",
    initials: "SY",
    showSocial: false,
  },
];

const STATS = [
  { label: "Üye", target: 9240, suffix: "+" },
  { label: "Aktif İlan", target: 18700, suffix: "+" },
  { label: "Şehir", target: 81, suffix: "" },
];

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const raf = requestAnimationFrame(function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({ label, target, suffix }: { label: string; target: number; suffix: string }) {
  const value = useCountUp(target);
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
      <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 500 }}>{value.toLocaleString("tr-TR")}{suffix}</div>
      <div style={{ color: "#475569", fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Particles() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ps: HTMLDivElement[] = [];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      const sz = Math.random() * 2.5 + 1;
      p.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;background:rgba(59,130,246,${Math.random()*0.35+0.05});border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100+100}%;--dx:${(Math.random()-0.5)*120}px;animation:eph-particle ${Math.random()*10+7}s linear ${Math.random()*5}s infinite;pointer-events:none;`;
      el.appendChild(p); ps.push(p);
    }
    return () => ps.forEach(p => p.remove());
  }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} />;
}

export default function GirisPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tIdx, setTIdx] = useState(0);
  const [tVisible, setTVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true); setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Email veya şifre hatalı.");
    } finally { setLoading(false); }
  };

  const goTo = (idx: number) => {
    setTVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setTIdx(idx); setTVisible(true); }, 400);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTVisible(false);
      timerRef.current = setTimeout(() => {
        setTIdx(i => (i + 1) % testimonials.length);
        setTVisible(true);
      }, 400);
    }, 5000);
    return () => { clearInterval(interval); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const t = testimonials[tIdx];

  return (
    <>
      <style>{`
        @keyframes eph-particle { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-700px) translateX(var(--dx));opacity:0} }
        @keyframes eph-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes eph-logoBeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes eph-fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes eph-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        .eph-btn:hover{opacity:0.9;transform:translateY(-1px)} .eph-btn{transition:all 0.2s}
        .eph-input:focus{border-color:#2563eb!important;outline:none}
        .eph-dot{cursor:pointer;transition:all 0.3s}

        /* DESKTOP */
        .eph-left { display: flex; }
        .eph-right { flex: 1; }
        .eph-mobile-header { display: none; }

        /* MOBILE */
        @media (max-width: 768px) {
          .eph-left { display: none !important; }
          .eph-right { width: 100% !important; min-height: 100vh; padding: 24px 20px !important; }
          .eph-mobile-header { display: flex !important; }
          .eph-wrapper { flex-direction: column; }
        }
      `}</style>

      <div className="eph-wrapper" style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', system-ui, sans-serif", background: "#060d1f" }}>

        {/* SOL PANEL - Sadece desktop */}
        <div className="eph-left" style={{ width: "46%", background: "#060d1f", position: "relative", overflow: "hidden", flexDirection: "column", justifyContent: "space-between", padding: "32px" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.08 }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
          <div style={{ position: "absolute", top: -80, left: -80, width: 250, height: 250, background: "radial-gradient(circle,rgba(37,99,235,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
          <Particles />

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 2, animation: "eph-fadeInUp 0.5s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#2563eb,#1e40af)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", animation: "eph-logoBeat 4s ease infinite" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <div>
                <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 500 }}>EPH Platform</div>
                <div style={{ color: "#3b82f6", fontSize: 10, letterSpacing: "0.5px" }}>EMLAK PORTFÖY HAVUZU</div>
              </div>
            </div>
          </div>

          {/* Orta */}
          <div style={{ position: "relative", zIndex: 2, animation: "eph-fadeInUp 0.7s ease 0.15s both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: 20, padding: "3px 10px", marginBottom: 14 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "eph-pulse 2s infinite" }} />
              <span style={{ color: "#93c5fd", fontSize: 10, fontWeight: 500 }}>Sadece davetli profesyoneller</span>
            </div>
            <h1 style={{ color: "#f1f5f9", fontSize: 26, fontWeight: 500, lineHeight: 1.25, marginBottom: 10, letterSpacing: "-0.5px" }}>
              Türkiye&apos;nin<br />
              <span style={{ background: "linear-gradient(90deg,#3b82f6,#60a5fa,#3b82f6)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "eph-shimmer 3s linear infinite" }}>B2B Emlak</span><br />
              Ekosistemi
            </h1>
            <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7, marginBottom: 18 }}>
              Doğrulanmış emlakçı, müteahhit ve inşaat firmalarının bir arada çalıştığı kapalı devre profesyonel ağ.
            </p>

            {/* İstatistikler */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 16 }}>
              {STATS.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Testimonial */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, opacity: tVisible ? 1 : 0, transform: tVisible ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.4s, transform 0.4s" }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                {[...Array(5)].map((_, i) => <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
              </div>
              <p style={{ color: "#cbd5e1", fontSize: 11, lineHeight: 1.6, marginBottom: 8 }}>&ldquo;{t.text}&rdquo;</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 500, flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 500 }}>{t.name}</div>
                  <div style={{ color: "#475569", fontSize: 9 }}>{t.role}</div>
                </div>
                {t.showSocial && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                )}
              </div>
              {/* Dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
                {testimonials.map((_, i) => (
                  <div key={i} className="eph-dot" onClick={() => goTo(i)} style={{ width: i === tIdx ? 16 : 5, height: 5, borderRadius: 3, background: i === tIdx ? "#3b82f6" : "rgba(255,255,255,0.15)" }} />
                ))}
              </div>
            </div>
          </div>

          <p style={{ position: "relative", zIndex: 2, color: "#1e293b", fontSize: 10 }}>© 2026 EPH. Tüm hakları saklıdır.</p>
        </div>

        {/* SAĞ PANEL */}
        <div className="eph-right" style={{ background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", position: "relative" }}>

          {/* Üst mavi çizgi */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#2563eb,#60a5fa,#2563eb)" }} />

          {/* MOBİL HEADER - Sadece mobilde görünür */}
          <div className="eph-mobile-header" style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 24, alignSelf: "flex-start" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#1e40af)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div>
              <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 500 }}>EPH Platform</div>
              <div style={{ color: "#3b82f6", fontSize: 9, letterSpacing: "0.5px" }}>EMLAK PORTFÖY HAVUZU</div>
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 300, animation: "eph-fadeInUp 0.7s ease 0.3s both" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "0.5px solid #bfdbfe", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4, color: "#0f172a" }}>Tekrar hoşgeldiniz</h2>
              <p style={{ color: "#64748b", fontSize: 12 }}>Hesabınıza güvenli giriş yapın</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 500, marginBottom: 5 }}>Email adresi</label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <input {...register("email")} type="email" placeholder="ornek@email.com" className="eph-input"
                    style={{ width: "100%", padding: "9px 11px 9px 34px", border: "0.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" }} />
                </div>
                {errors.email && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
              </div>

              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 500, marginBottom: 5 }}>Şifre</label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="eph-input"
                    style={{ width: "100%", padding: "9px 34px 9px 34px", border: "0.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                    {showPassword
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>
                {errors.password && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.password.message}</p>}
              </div>

              {serverError && (
                <div style={{ background: "#fef2f2", border: "0.5px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{serverError}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="eph-btn"
                style={{ width: "100%", padding: "10px", background: loading ? "#94a3b8" : "#2563eb", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "#e2e8f0" }} />
              <span style={{ color: "#94a3b8", fontSize: 10 }}>veya</span>
              <div style={{ flex: 1, height: "0.5px", background: "#e2e8f0" }} />
            </div>

            <p style={{ textAlign: "center", color: "#64748b", fontSize: 11, marginBottom: 16 }}>
              Hesabınız yok mu?{" "}
              <Link href="/kayit" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>Kayıt olun</Link>
            </p>

            <div style={{ background: "#f8fafc", border: "0.5px solid #e2e8f0", borderRadius: 8, padding: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <p style={{ color: "#94a3b8", fontSize: 10, lineHeight: 1.6, margin: 0 }}>Yalnızca davet koduyla erişilebilir. Referans için mevcut bir üyeyle iletişime geçin.</p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
              {[
                { d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Güvenli" },
                { d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", label: "Doğrulanmış" },
                { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8z", label: "Davetli" },
                { d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2", label: "7/24 Aktif" },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d={item.d} /></svg>
                  <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
