"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { loginSchema, LoginFormData } from "@/schemas/auth.schema";

export default function GirisPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Email veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .giris-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #F5F3EF;
        }

        @media (max-width: 768px) {
          .giris-root { grid-template-columns: 1fr; }
          .giris-left { display: none !important; }
        }

        .giris-left {
          background: #0F2044;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
        }

        .giris-left::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .giris-left::after {
          content: '';
          position: absolute;
          bottom: -50px;
          left: -50px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .giris-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .giris-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .giris-logo-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 500;
          color: #F5F3EF;
          letter-spacing: 0.5px;
        }

        .giris-tagline {
          color: rgba(201,168,76,0.8);
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 400;
          margin-top: 2px;
        }

        .giris-hero {
          position: relative;
          z-index: 1;
        }

        .giris-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25);
          padding: 6px 14px;
          margin-bottom: 32px;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #C9A84C;
          font-weight: 500;
        }

        .giris-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #C9A84C;
          animation: pulse-gold 2s ease infinite;
        }

        @keyframes pulse-gold {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .giris-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 52px;
          font-weight: 300;
          line-height: 1.1;
          color: #F5F3EF;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }

        .giris-headline em {
          font-style: italic;
          color: #C9A84C;
        }

        .giris-desc {
          font-size: 13px;
          line-height: 1.8;
          color: rgba(245,243,239,0.45);
          max-width: 340px;
          font-weight: 300;
        }

        .giris-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.06);
          margin-top: 48px;
          position: relative;
          z-index: 1;
        }

        .giris-stat {
          padding: 20px 16px;
          background: rgba(15,32,68,0.8);
        }

        .giris-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          color: #C9A84C;
          line-height: 1;
          margin-bottom: 4px;
        }

        .giris-stat-label {
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(245,243,239,0.35);
          font-weight: 400;
        }

        .giris-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .giris-footer-text {
          font-size: 10px;
          color: rgba(245,243,239,0.2);
          letter-spacing: 1px;
        }

        .giris-footer-line {
          width: 40px;
          height: 1px;
          background: rgba(201,168,76,0.3);
        }

        /* RIGHT SIDE */
        .giris-right {
          background: #F5F3EF;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 60px 80px;
          position: relative;
        }

        .giris-right::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #C9A84C, #0F2044);
        }

        .giris-form-wrap {
          width: 100%;
          max-width: 360px;
          animation: fadeUp 0.6s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .giris-form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 400;
          color: #0F2044;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
        }

        .giris-form-sub {
          font-size: 13px;
          color: #8A8A8A;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .giris-divider {
          width: 36px;
          height: 2px;
          background: #C9A84C;
          margin-bottom: 36px;
        }

        .giris-field {
          margin-bottom: 20px;
        }

        .giris-label {
          display: block;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #0F2044;
          font-weight: 500;
          margin-bottom: 10px;
        }

        .giris-input-wrap {
          position: relative;
        }

        .giris-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid #D4CEC4;
          padding: 12px 0;
          font-size: 14px;
          color: #0F2044;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.3s;
          font-weight: 300;
        }

        .giris-input::placeholder {
          color: #B8B2A8;
          font-weight: 300;
        }

        .giris-input:focus {
          border-bottom-color: #0F2044;
        }

        .giris-input-line {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 1.5px;
          width: 0;
          background: #C9A84C;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .giris-input:focus ~ .giris-input-line {
          width: 100%;
        }

        .giris-error {
          font-size: 11px;
          color: #C0392B;
          margin-top: 6px;
          font-weight: 300;
        }

        .giris-server-error {
          background: #FEF0EE;
          border-left: 3px solid #C0392B;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #C0392B;
          font-weight: 300;
        }

        .giris-btn {
          width: 100%;
          background: #0F2044;
          color: #F5F3EF;
          border: none;
          padding: 16px;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          margin-top: 32px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }

        .giris-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: #C9A84C;
          transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
        }

        .giris-btn:hover::before {
          left: 0;
        }

        .giris-btn:hover {
          color: #0F2044;
        }

        .giris-btn span {
          position: relative;
          z-index: 1;
        }

        .giris-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .giris-btn:disabled::before {
          display: none;
        }

        .giris-bottom {
          margin-top: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: #8A8A8A;
          font-weight: 300;
        }

        .giris-bottom a {
          color: #0F2044;
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid #C9A84C;
          padding-bottom: 1px;
          transition: color 0.2s;
        }

        .giris-bottom a:hover {
          color: #C9A84C;
        }

        .giris-notice {
          margin-top: 40px;
          padding: 16px 0;
          border-top: 1px solid #E8E4DC;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .giris-notice-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 1px;
          opacity: 0.4;
        }

        .giris-notice-text {
          font-size: 11px;
          color: #8A8A8A;
          line-height: 1.6;
          font-weight: 300;
        }
      `}</style>

      <div className="giris-root">
        {/* SOL PANEL */}
        <div className="giris-left">
          <div className="giris-logo">
            <img src="/LOGO_EPH.png" alt="EPH" />
            <div>
              <div className="giris-logo-text">EPH Platform</div>
              <div className="giris-tagline">Emlak Portföy Havuzu</div>
            </div>
          </div>

          <div className="giris-hero">
            <div className="giris-badge">
              <div className="giris-badge-dot" />
              Sadece Davetli Profesyoneller
            </div>
            <h1 className="giris-headline">
              Türkiye&apos;nin<br />
              <em>B2B Emlak</em><br />
              Ekosistemi
            </h1>
            <p className="giris-desc">
              Doğrulanmış emlakçı, müteahhit ve inşaat firmalarının birlikte çalıştığı kapalı devre profesyonel ağ.
            </p>

            <div className="giris-stats">
              <div className="giris-stat">
                <div className="giris-stat-num">344+</div>
                <div className="giris-stat-label">Aktif Üye</div>
              </div>
              <div className="giris-stat">
                <div className="giris-stat-num">8.7K+</div>
                <div className="giris-stat-label">Portföy</div>
              </div>
              <div className="giris-stat">
                <div className="giris-stat-num">65+</div>
                <div className="giris-stat-label">Satış</div>
              </div>
            </div>
          </div>

          <div className="giris-footer">
            <span className="giris-footer-text">© 2026 EPH Platform</span>
            <div className="giris-footer-line" />
            <span className="giris-footer-text">Denizli, Türkiye</span>
          </div>
        </div>

        {/* SAĞ PANEL */}
        <div className="giris-right">
          <div className="giris-form-wrap">
            <h2 className="giris-form-title">Hoş Geldiniz</h2>
            <p className="giris-form-sub">Hesabınıza güvenli giriş yapın</p>
            <div className="giris-divider" />

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="giris-field">
                <label className="giris-label">E-posta Adresi</label>
                <div className="giris-input-wrap">
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="ornek@email.com"
                    className="giris-input"
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                  />
                  <div className="giris-input-line" />
                </div>
                {errors.email && <p className="giris-error">{errors.email.message}</p>}
              </div>

              <div className="giris-field">
                <label className="giris-label">Şifre</label>
                <div className="giris-input-wrap">
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    className="giris-input"
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                  />
                  <div className="giris-input-line" />
                </div>
                {errors.password && <p className="giris-error">{errors.password.message}</p>}
              </div>

              {serverError && (
                <div className="giris-server-error">{serverError}</div>
              )}

              <button type="submit" disabled={loading} className="giris-btn">
                <span>{loading ? "Giriş yapılıyor..." : "Giriş Yap"}</span>
              </button>
            </form>

            <div className="giris-bottom">
              <span>Hesabınız yok mu?</span>
              <Link href="/kayit">Kayıt olun</Link>
            </div>

            <div className="giris-notice">
              <svg className="giris-notice-icon" viewBox="0 0 24 24" fill="none" stroke="#0F2044" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p className="giris-notice-text">
                EPH Platform&apos;a erişim yalnızca davet koduyla mümkündür. Üyelik için ana sayfadaki talep formunu doldurunuz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}