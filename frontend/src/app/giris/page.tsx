"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  LockKeyhole,
  Smartphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { paymentReturnPath } from "@/lib/payment-return";
import { loginSchema, LoginFormData, normalizePhoneForSystem } from "@/schemas/auth.schema";

export default function GirisPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const phoneOrEmailValue = watch("phoneOrEmail") || "";

  useEffect(() => {
    const remembered = window.localStorage.getItem("eph_remembered_identifier");

    if (remembered) {
      setValue("phoneOrEmail", remembered);
      setRememberLogin(true);
    }
  }, [setValue]);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Kullanıcı rakamla başlıyorsa telefon formatına dönüştürmeyi dene
    if (/^\d/.test(val) || val.startsWith("+")) {
      const normalized = normalizePhoneForSystem(val);
      setValue("phoneOrEmail", normalized, { shouldValidate: true });
    } else {
      setValue("phoneOrEmail", val, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError("");

    try {
      const response = await api.post("/auth/login", {
        phoneOrEmail: data.phoneOrEmail,
        password: data.password,
      });
      const result = response.data;

      if (rememberLogin) {
        window.localStorage.setItem("eph_remembered_identifier", data.phoneOrEmail);
      } else {
        window.localStorage.removeItem("eph_remembered_identifier");
      }

      setAuth(result.user, result.token);
      router.push(paymentReturnPath(new URLSearchParams(window.location.search).get("next")));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";

      setServerError(
        message === "Sunucu bağlantısı kurulamadı."
          ? "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #F5F7FA;
          color: #111827;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        a { color: inherit; text-decoration: none; }
        .login-page {
          min-height: 100vh;
          background: #F5F7FA;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .login-shell {
          width: 100%;
          max-width: 1080px;
          min-height: 640px;
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          overflow: hidden;
          border: 1px solid #E2E8F0;
          border-radius: 32px;
          background: #FFFFFF;
        }
        .login-info {
          background: linear-gradient(145deg, #1E40AF 0%, #1D4ED8 55%, #2563EB 100%);
          color: #FFFFFF;
          padding: 42px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .login-brand { display: flex; align-items: center; gap: 12px; }
        .login-brand img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 12px;
          background: #FFFFFF;
        }
        .login-brand-title {
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .login-brand-sub {
          margin-top: 2px;
          font-size: 13px;
          color: #FFFFFF;
          opacity: 0.95;
        }
        .login-copy { max-width: 480px; }
        .login-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          border-radius: 999px;
          padding: 8px 14px;
          color: #1E40AF;
          background: #FFFFFF;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .login-copy h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1.04;
          letter-spacing: -0.055em;
          font-weight: 900;
          color: #FFFFFF;
        }
        .login-copy p {
          margin: 18px 0 0;
          max-width: 430px;
          color: #FFFFFF;
          font-size: 16px;
          line-height: 1.65;
        }
        .login-feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 32px;
        }
        .login-feature {
          border: none;
          padding: 8px 0;
          background: transparent;
        }
        .login-feature-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(255,255,255,.22);
          margin-bottom: 12px;
        }
        .login-feature strong {
          display: block;
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
        }
        .login-feature span {
          display: block;
          margin-top: 5px;
          font-size: 13px;
          color: #FFFFFF;
          line-height: 1.45;
        }
        .login-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #FFFFFF;
          font-size: 13px;
        }
        .login-form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px;
          background: #FAFBFC;
        }
        .login-form-card {
          width: 100%;
          max-width: 390px;
        }
        .login-mobile-logo {
          display: none;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .login-mobile-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }
        .login-form-title {
          margin: 0;
          color: #1E3A8A;
          font-size: 31px;
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 900;
          text-align: center;
        }
        .login-form-sub {
          margin: 9px 0 28px;
          color: #64748B;
          font-size: 15px;
          line-height: 1.55;
          text-align: center;
        }
        .login-field { margin-bottom: 18px; }
        .login-field label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .login-remember-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: -2px 0 18px;
        }
        .login-remember-label {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }
        .login-remember-label input {
          width: 17px;
          height: 17px;
          accent-color: #1D4ED8;
        }
        .login-forgot-link {
          color: #1D4ED8;
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }
        .login-forgot-link:hover {
          text-decoration: underline;
        }
        .login-input-wrap { position: relative; }
        .login-input-icon {
          position: absolute;
          left: 14px;
          top: 14px;
          color: #64748B;
        }
        .login-input {
          width: 100%;
          height: 50px;
          border: 1px solid #CBD5E1;
          border-radius: 16px;
          background: #FFFFFF;
          padding: 0 14px 0 44px;
          outline: none;
          color: #111827;
          font-size: 15px;
          font-weight: 650;
        }
        .login-input:focus {
          border-color: #1D4ED8;
          box-shadow: 0 0 0 4px rgba(29,78,216,.10);
        }
        .login-input::placeholder {
          color: #64748B;
          font-weight: 500;
        }
        .login-error {
          margin: 7px 0 0;
          color: #BE123C;
          font-size: 12px;
          font-weight: 700;
        }
        .login-server-error {
          margin: 4px 0 18px;
          border: 1px solid #FECDD3;
          border-radius: 16px;
          background: #FFF1F2;
          padding: 12px 14px;
          color: #BE123C;
          font-size: 13px;
          font-weight: 750;
        }
        .login-submit {
          width: 100%;
          height: 52px;
          margin-top: 8px;
          border: none;
          border-radius: 16px;
          background: #1D4ED8;
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }
        .login-submit:disabled {
          opacity: .65;
          cursor: not-allowed;
        }
        .login-bottom {
          margin-top: 22px;
          text-align: center;
          color: #64748B;
          font-size: 14px;
        }
        .login-bottom a {
          color: #1D4ED8;
          font-weight: 850;
        }
        .login-note {
          margin-top: 28px;
          display: flex;
          gap: 10px;
          border-top: 1px solid #E2E8F0;
          padding-top: 18px;
          color: #64748B;
          font-size: 13px;
          line-height: 1.55;
        }
        .login-note svg {
          color: #1D4ED8;
          flex-shrink: 0;
          margin-top: 2px;
        }
        @media (max-width: 860px) {
          .login-page {
            display: block;
            padding: 0;
            background: #FAFBFC;
          }
          .login-shell {
            min-height: 100vh;
            display: block;
            border: none;
            border-radius: 0;
          }
          .login-info { display: none; }
          .login-form-side {
            min-height: 100vh;
            align-items: flex-start;
            padding: 34px 22px;
          }
          .login-mobile-logo { display: flex; }
          .login-form-card { max-width: none; }
          .login-form-title { font-size: 30px; }
        }
      `}</style>

      <main className="login-page">
        <section className="login-shell">
          <aside className="login-info">
            <div className="login-brand">
              <img src="/LOGO_EPH.png" alt="EPH" />
              <div>
                <div className="login-brand-title">EPH Platform</div>
                <div className="login-brand-sub">Emlak Portföy Havuzu</div>
              </div>
            </div>

            <div className="login-copy">
              <div className="login-label">
                <ShieldCheck size={17} />
                Profesyonellere özel kapalı ağ
              </div>

              <h1>Emlak portföylerini güvenle yönetin.</h1>

              <p>
                Emlakçılar, müteahhitler ve inşaat firmaları için doğrulanmış
                portföy paylaşımı, stok takibi ve müşteri yönetimi.
              </p>

              <div className="login-feature-grid">
                <div className="login-feature">
                  <div className="login-feature-icon">
                    <Building2 size={21} />
                  </div>
                  <strong>Doğrulanmış portföy</strong>
                  <span>Projeler ve bağımsız bölümler tek merkezde.</span>
                </div>

                <div className="login-feature">
                  <div className="login-feature-icon">
                    <UsersRound size={21} />
                  </div>
                  <strong>B2B çalışma ağı</strong>
                  <span>
                    Emlak profesyonelleri arasında kontrollü paylaşım.
                  </span>
                </div>

                <div className="login-feature">
                  <div className="login-feature-icon">
                    <CheckCircle2 size={21} />
                  </div>
                  <strong>Yetki kontrolü</strong>
                  <span>İlan, belge ve portföy doğrulama süreçleri.</span>
                </div>

                <div className="login-feature">
                  <div className="login-feature-icon">
                    <LockKeyhole size={21} />
                  </div>
                  <strong>Güvenli erişim</strong>
                  <span>Sadece kayıtlı profesyoneller için giriş.</span>
                </div>
              </div>
            </div>

            <div className="login-footer">
              <span>© 2026 EPH Platform</span>
              <span>Denizli merkezli Türkiye ağı</span>
            </div>
          </aside>

          <section className="login-form-side">
            <div className="login-form-card">
              <div className="login-mobile-logo">
                <img src="/LOGO_EPH.png" alt="EPH" />
                <div>
                  <div
                    className="login-brand-title"
                    style={{ color: "#0B1F44" }}
                  >
                    EPH Platform
                  </div>
                  <div className="login-brand-sub" style={{ color: "#64748B" }}>
                    Emlak Portföy Havuzu
                  </div>
                </div>
              </div>

              <h2 className="login-form-title">Hesabınıza giriş yapın</h2>

              <p className="login-form-sub">
                Portföy, stok ve müşteri yönetimine devam edin.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
                <div className="login-field">
                  <label htmlFor="phoneOrEmail">Cep Telefonu Numarası veya E-posta</label>
                  <div className="login-input-wrap">
                    <Smartphone className="login-input-icon" size={18} />
                    <input
                      {...register("phoneOrEmail")}
                      id="phoneOrEmail"
                      name="phoneOrEmail"
                      value={phoneOrEmailValue}
                      onChange={handleIdentifierChange}
                      type="text"
                      inputMode="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="05XX XXX XX XX veya ornek@email.com"
                      className="login-input"
                    />
                  </div>
                  {errors.phoneOrEmail && (
                    <p className="login-error">{errors.phoneOrEmail.message}</p>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="password">Şifre</label>
                  <div className="login-input-wrap">
                    <LockKeyhole className="login-input-icon" size={18} />
                    <input
                      {...register("password")}
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Şifrenizi yazın"
                      className="login-input"
                    />
                  </div>
                  {errors.password && (
                    <p className="login-error">{errors.password.message}</p>
                  )}
                </div>

                <div className="login-remember-row">
                  <label
                    className="login-remember-label"
                    htmlFor="rememberLogin"
                  >
                    <input
                      id="rememberLogin"
                      type="checkbox"
                      checked={rememberLogin}
                      onChange={(event) =>
                        setRememberLogin(event.target.checked)
                      }
                    />
                    Beni hatırla
                  </label>
                  <Link
                    href="/sifremi-unuttum"
                    className="login-forgot-link"
                  >
                    Şifremi unuttum
                  </Link>
                </div>

                {serverError && (
                  <div className="login-server-error">{serverError}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>

              <div className="login-bottom">
                Hesabınız yok mu?{" "}
                <Link href="/kayit">Kayıt talebi oluşturun</Link>
              </div>

              <div className="login-note">
                <ShieldCheck size={18} />
                <p>
                  EPH Platform yalnızca doğrulanmış emlak profesyonelleri,
                  müteahhitler ve yetkili kullanıcılar için tasarlanmıştır.
                </p>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
