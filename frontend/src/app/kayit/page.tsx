"use client";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { registerSchema, RegisterFormData } from "@/schemas/auth.schema";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin",
};

function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<"idle"|"checking"|"valid"|"invalid">("idle");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const inviteCode = watch("inviteCode");

  useEffect(() => {
    const code = searchParams.get("davet");
    if (code) setValue("inviteCode", code);
  }, [searchParams, setValue]);

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 10) {
      setDetectedRole(null); setCodeStatus("idle"); return;
    }
    const timer = setTimeout(async () => {
      setCodeStatus("checking");
      try {
        const res = await api.get(`/invitations/validate/${inviteCode}`);
        setDetectedRole(res.data.role); setCodeStatus("valid");
      } catch {
        setDetectedRole(null); setCodeStatus("invalid");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true); setServerError("");
    try {
      const res = await api.post("/auth/register", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Bir hata oluştu.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
          --muted:#8A8A8A;--border:#E2DDD5;
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'DM Sans',system-ui,sans-serif;
        }
        body{font-family:var(--sans);background:var(--warm);}

        .kayit-root{min-height:100vh;display:grid;grid-template-columns:5fr 7fr;}
        @media(max-width:900px){.kayit-root{grid-template-columns:1fr;}}

        /* SOL */
        .kayit-left{
          background:var(--navy);padding:56px 52px;
          display:flex;flex-direction:column;justify-content:space-between;
          position:relative;overflow:hidden;
        }
        @media(max-width:900px){.kayit-left{display:none;}}

        .kayit-left::after{
          content:'';position:absolute;
          bottom:-80px;right:-80px;
          width:320px;height:320px;border-radius:50%;
          background:radial-gradient(circle,rgba(201,168,76,0.1) 0%,transparent 70%);
          pointer-events:none;
        }

        .kayit-logo{display:flex;align-items:center;gap:12px;}
        .kayit-logo img{width:38px;height:38px;object-fit:contain;}
        .kayit-logo-text{font-family:var(--serif);font-size:20px;font-weight:500;color:var(--cream);}
        .kayit-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.7);}

        .kayit-hero{position:relative;z-index:1;}
        .kayit-badge{
          display:inline-flex;align-items:center;gap:8px;
          border:1px solid rgba(201,168,76,0.25);padding:6px 14px;
          margin-bottom:28px;width:fit-content;
        }
        .kayit-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:pulse 2s ease infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .kayit-badge-text{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}

        .kayit-headline{
          font-family:var(--serif);font-size:48px;font-weight:300;
          line-height:1.05;color:var(--cream);letter-spacing:-0.5px;margin-bottom:24px;
        }
        .kayit-headline em{font-style:italic;color:var(--gold);}

        .kayit-steps{display:flex;flex-direction:column;gap:0;margin-top:40px;}
        .kayit-step{
          display:flex;align-items:flex-start;gap:20px;
          padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .kayit-step:last-child{border-bottom:none;}
        .kayit-step-num{
          font-family:var(--serif);font-size:13px;color:var(--gold);
          min-width:20px;margin-top:2px;font-weight:300;
        }
        .kayit-step-title{font-size:14px;color:var(--cream);font-weight:400;margin-bottom:4px;}
        .kayit-step-desc{font-size:11px;color:rgba(245,243,239,0.4);font-weight:300;line-height:1.6;}

        .kayit-footer-text{font-size:10px;color:rgba(245,243,239,0.15);letter-spacing:1px;}

        /* SAĞ */
        .kayit-right{
          background:var(--warm);display:flex;align-items:center;
          justify-content:center;padding:60px 80px;position:relative;
        }
        @media(max-width:768px){.kayit-right{padding:40px 24px;}}

        .kayit-right::before{
          content:'';position:absolute;top:0;left:0;right:0;height:3px;
          background:linear-gradient(90deg,var(--gold),var(--navy));
        }

        .kayit-form-wrap{width:100%;max-width:420px;animation:fadeUp 0.5s ease;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

        .kayit-title{font-family:var(--serif);font-size:36px;font-weight:400;color:var(--navy);margin-bottom:6px;letter-spacing:-0.3px;}
        .kayit-sub{font-size:13px;color:var(--muted);margin-bottom:12px;font-weight:300;}
        .kayit-divider{width:36px;height:2px;background:var(--gold);margin-bottom:32px;}

        .kayit-field{margin-bottom:20px;}
        .kayit-label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);font-weight:500;margin-bottom:10px;}
        .kayit-input-wrap{position:relative;}
        .kayit-input{
          width:100%;background:transparent;border:none;
          border-bottom:1.5px solid var(--border);padding:10px 0;
          font-size:14px;color:var(--navy);font-family:var(--sans);
          outline:none;transition:border-color 0.3s;font-weight:300;
        }
        .kayit-input:focus{border-bottom-color:var(--navy);}
        .kayit-input::placeholder{color:#C0BAB0;}
        .kayit-input-line{
          position:absolute;bottom:0;left:0;height:1.5px;width:0;
          background:var(--gold);transition:width 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .kayit-input:focus~.kayit-input-line{width:100%;}
        .kayit-input-status{position:absolute;right:0;top:50%;transform:translateY(-50%);}

        .kayit-code-valid{
          background:#F0FAF4;border-left:3px solid #2D6A4F;
          padding:10px 14px;margin:8px 0;
          font-size:12px;color:#2D6A4F;font-weight:300;
          display:flex;align-items:center;gap:8px;
        }
        .kayit-code-invalid{
          background:#FEF0EE;border-left:3px solid #C0392B;
          padding:10px 14px;margin:8px 0;
          font-size:12px;color:#C0392B;font-weight:300;
        }

        .kayit-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

        .kayit-error{font-size:11px;color:#C0392B;margin-top:6px;}
        .kayit-server-error{background:#FEF0EE;border-left:3px solid #C0392B;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#C0392B;font-weight:300;}

        .kayit-btn{
          width:100%;background:var(--navy);color:var(--cream);border:none;
          padding:16px;font-size:10px;letter-spacing:3px;text-transform:uppercase;
          font-family:var(--sans);font-weight:500;cursor:pointer;margin-top:28px;
          position:relative;overflow:hidden;transition:all 0.3s;
        }
        .kayit-btn::before{
          content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;
          background:var(--gold);transition:left 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .kayit-btn:hover::before{left:0;}
        .kayit-btn:hover{color:var(--navy);}
        .kayit-btn span{position:relative;z-index:1;}
        .kayit-btn:disabled{opacity:0.4;cursor:not-allowed;}
        .kayit-btn:disabled::before{display:none;}

        .kayit-bottom{
          margin-top:28px;text-align:center;
          font-size:12px;color:var(--muted);font-weight:300;
        }
        .kayit-bottom a{
          color:var(--navy);text-decoration:none;font-weight:500;
          border-bottom:1px solid var(--gold);padding-bottom:1px;transition:color 0.2s;
        }
        .kayit-bottom a:hover{color:var(--gold);}
      `}</style>

      <div className="kayit-root">
        {/* SOL */}
        <div className="kayit-left">
          <div className="kayit-logo">
            <img src="/LOGO_EPH.png" alt="EPH" />
            <div>
              <div className="kayit-logo-text">EPH Platform</div>
              <div className="kayit-logo-sub">Emlak Portföy Havuzu</div>
            </div>
          </div>

          <div className="kayit-hero">
            <div className="kayit-badge">
              <div className="kayit-badge-dot" />
              <span className="kayit-badge-text">Davet Kodu ile Kayıt</span>
            </div>
            <h1 className="kayit-headline">
              Platforma<br />
              <em>Katılın</em>
            </h1>
            <div className="kayit-steps">
              {[
                { n: "01", title: "Davet Kodunuzu Girin", desc: "Mevcut bir üyeden aldığınız kodu girin, rolünüz otomatik atanır." },
                { n: "02", title: "Bilgilerinizi Doldurun", desc: "Ad, soyad, e-posta ve şifrenizi kaydedin." },
                { n: "03", title: "Admin Onayını Bekleyin", desc: "Belgelerinizi yükleyin ve hızlıca onay alın." },
                { n: "04", title: "Platforma Erişin", desc: "Onaylanınca tüm özelliklere tam erişim sağlayın." },
              ].map(s => (
                <div key={s.n} className="kayit-step">
                  <div className="kayit-step-num">{s.n}</div>
                  <div>
                    <div className="kayit-step-title">{s.title}</div>
                    <div className="kayit-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="kayit-footer-text">© 2026 EPH Platform — Denizli, Türkiye</p>
        </div>

        {/* SAĞ */}
        <div className="kayit-right">
          <div className="kayit-form-wrap">
            <h2 className="kayit-title">Hesap Oluştur</h2>
            <p className="kayit-sub">Platforma katılmak için formu doldurun</p>
            <div className="kayit-divider" />

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* DAVET KODU */}
              <div className="kayit-field">
                <label className="kayit-label">Davet Kodu *</label>
                <div className="kayit-input-wrap">
                  <input
                    {...register("inviteCode")}
                    placeholder="EMK-XXXX-XXXX"
                    className="kayit-input"
                    style={{ fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}
                  />
                  <div className="kayit-input-line" />
                  <div className="kayit-input-status">
                    {codeStatus === "checking" && <span style={{ fontSize: 10, color: "var(--muted)" }}>kontrol...</span>}
                    {codeStatus === "valid" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    {codeStatus === "invalid" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  </div>
                </div>
                {codeStatus === "valid" && detectedRole && (
                  <div className="kayit-code-valid">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <strong>{ROLE_LABELS[detectedRole]}</strong> olarak kaydoluyorsunuz
                  </div>
                )}
                {codeStatus === "invalid" && <div className="kayit-code-invalid">Geçersiz veya süresi dolmuş davet kodu.</div>}
              </div>

              {/* AD SOYAD */}
              <div className="kayit-grid">
                <div className="kayit-field">
                  <label className="kayit-label">Ad *</label>
                  <div className="kayit-input-wrap">
                    <input {...register("firstName")} placeholder="Ahmet" className="kayit-input" />
                    <div className="kayit-input-line" />
                  </div>
                  {errors.firstName && <p className="kayit-error">{errors.firstName.message}</p>}
                </div>
                <div className="kayit-field">
                  <label className="kayit-label">Soyad *</label>
                  <div className="kayit-input-wrap">
                    <input {...register("lastName")} placeholder="Yılmaz" className="kayit-input" />
                    <div className="kayit-input-line" />
                  </div>
                  {errors.lastName && <p className="kayit-error">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* EMAIL */}
              <div className="kayit-field">
                <label className="kayit-label">E-posta *</label>
                <div className="kayit-input-wrap">
                  <input {...register("email")} type="email" placeholder="ornek@email.com" className="kayit-input" />
                  <div className="kayit-input-line" />
                </div>
                {errors.email && <p className="kayit-error">{errors.email.message}</p>}
              </div>

              {/* TELEFON */}
              <div className="kayit-field">
                <label className="kayit-label">Telefon *</label>
                <div className="kayit-input-wrap">
                  <input {...register("phone")} placeholder="+90 5__ ___ __ __" className="kayit-input" />
                  <div className="kayit-input-line" />
                </div>
                {errors.phone && <p className="kayit-error">{errors.phone.message}</p>}
              </div>

              {/* ŞİFRE */}
              <div className="kayit-field">
                <label className="kayit-label">Şifre *</label>
                <div className="kayit-input-wrap">
                  <input {...register("password")} type="password" placeholder="En az 6 karakter" className="kayit-input" />
                  <div className="kayit-input-line" />
                </div>
                {errors.password && <p className="kayit-error">{errors.password.message}</p>}
              </div>

              {serverError && <div className="kayit-server-error">{serverError}</div>}

              <button
                type="submit"
                disabled={loading || codeStatus !== "valid"}
                className="kayit-btn"
              >
                <span>{loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}</span>
              </button>
            </form>

            <div className="kayit-bottom">
              Zaten hesabınız var mı? <Link href="/giris">Giriş yapın</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function KayitPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "#8A8A8A", fontStyle: "italic" }}>Yükleniyor...</div>
      </div>
    }>
      <KayitForm />
    </Suspense>
  );
}