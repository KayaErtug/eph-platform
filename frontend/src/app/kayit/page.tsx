"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { registerSchema, RegisterFormData } from "@/schemas/auth.schema";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
};

function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const inviteCode = watch("inviteCode");

  useEffect(() => {
    const code = searchParams.get("davet");

    if (code) {
      setValue("inviteCode", code);
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 10) {
      setDetectedRole(null);
      setCodeStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setCodeStatus("checking");

      try {
        const res = await api.get(`/invitations/validate/${inviteCode}`);
        setDetectedRole(res.data.role);
        setCodeStatus("valid");
      } catch {
        setDetectedRole(null);
        setCodeStatus("invalid");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError("");

    try {
      const res = await api.post("/auth/register", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #F5F7FA;
          color: #111827;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .register-page {
          min-height: 100vh;
          background: #F5F7FA;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .register-shell {
          width: 100%;
          max-width: 1120px;
          min-height: 680px;
          display: grid;
          grid-template-columns: .95fr 1.05fr;
          overflow: hidden;
          border: 1px solid #E2E8F0;
          border-radius: 32px;
          background: #FFFFFF;
        }

        .register-info {
          background: #0B1F44;
          color: #FFFFFF;
          padding: 42px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .register-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .register-brand img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 12px;
          background: #FFFFFF;
        }

        .register-brand-title {
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .register-brand-sub {
          margin-top: 2px;
          font-size: 13px;
          color: rgba(255,255,255,.62);
        }

        .register-copy {
          max-width: 480px;
        }

        .register-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 999px;
          padding: 8px 12px;
          color: rgba(255,255,255,.76);
          font-size: 13px;
          font-weight: 700;
        }

        .register-copy h1 {
          margin: 0;
          font-size: 42px;
          line-height: 1.05;
          letter-spacing: -0.055em;
          font-weight: 900;
        }

        .register-copy p {
          margin: 18px 0 0;
          color: rgba(255,255,255,.68);
          font-size: 16px;
          line-height: 1.65;
        }

        .register-steps {
          display: grid;
          gap: 12px;
          margin-top: 30px;
        }

        .register-step {
          display: flex;
          gap: 12px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,.05);
        }

        .register-step-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 13px;
          background: rgba(255,255,255,.10);
        }

        .register-step strong {
          display: block;
          font-size: 14px;
          font-weight: 850;
        }

        .register-step span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.58);
          font-size: 13px;
          line-height: 1.45;
        }

        .register-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: rgba(255,255,255,.45);
          font-size: 13px;
        }

        .register-form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px;
          background: #FAFBFC;
        }

        .register-form-card {
          width: 100%;
          max-width: 460px;
        }

        .register-mobile-logo {
          display: none;
          align-items: center;
          gap: 12px;
          margin-bottom: 26px;
        }

        .register-mobile-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .register-title {
          margin: 0;
          color: #0B1F44;
          font-size: 31px;
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 900;
        }

        .register-sub {
          margin: 9px 0 26px;
          color: #64748B;
          font-size: 15px;
          line-height: 1.55;
        }

        .register-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .register-field {
          margin-bottom: 16px;
        }

        .register-field.full {
          grid-column: 1 / -1;
        }

        .register-field label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .register-input-wrap {
          position: relative;
        }

        .register-input-icon {
          position: absolute;
          left: 14px;
          top: 14px;
          color: #64748B;
        }

        .register-input {
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

        .register-input:focus {
          border-color: #1D4ED8;
          box-shadow: 0 0 0 4px rgba(29,78,216,.10);
        }

        .register-input::placeholder {
          color: #94A3B8;
          font-weight: 500;
        }

        .register-code-status {
          position: absolute;
          right: 14px;
          top: 14px;
          color: #64748B;
          font-size: 12px;
          font-weight: 800;
        }

        .register-message {
          margin-top: 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 750;
        }

        .register-message.success {
          background: #ECFDF3;
          color: #047857;
          border: 1px solid #BBF7D0;
        }

        .register-message.error {
          background: #FFF1F2;
          color: #BE123C;
          border: 1px solid #FECDD3;
        }

        .register-error {
          margin: 7px 0 0;
          color: #BE123C;
          font-size: 12px;
          font-weight: 700;
        }

        .register-server-error {
          margin: 4px 0 16px;
          border: 1px solid #FECDD3;
          border-radius: 16px;
          background: #FFF1F2;
          padding: 12px 14px;
          color: #BE123C;
          font-size: 13px;
          font-weight: 750;
        }

        .register-submit {
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

        .register-submit:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .register-bottom {
          margin-top: 20px;
          text-align: center;
          color: #64748B;
          font-size: 14px;
        }

        .register-bottom a {
          color: #1D4ED8;
          font-weight: 850;
        }

        .register-note {
          margin-top: 24px;
          display: flex;
          gap: 10px;
          border-top: 1px solid #E2E8F0;
          padding-top: 18px;
          color: #64748B;
          font-size: 13px;
          line-height: 1.55;
        }

        .register-note svg {
          color: #1D4ED8;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .register-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAFBFC;
          color: #64748B;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .register-page {
            display: block;
            padding: 0;
            background: #FAFBFC;
          }

          .register-shell {
            min-height: 100vh;
            display: block;
            border: none;
            border-radius: 0;
          }

          .register-info {
            display: none;
          }

          .register-form-side {
            min-height: 100vh;
            align-items: flex-start;
            padding: 34px 22px;
          }

          .register-mobile-logo {
            display: flex;
          }

          .register-form-card {
            max-width: none;
          }

          .register-title {
            font-size: 30px;
          }

          .register-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
      `}</style>

      <main className="register-page">
        <section className="register-shell">
          <aside className="register-info">
            <div className="register-brand">
              <img src="/LOGO_EPH.png" alt="EPH" />

              <div>
                <div className="register-brand-title">EPH Platform</div>
                <div className="register-brand-sub">Emlak Portföy Havuzu</div>
              </div>
            </div>

            <div className="register-copy">
              <div className="register-label">
                <ShieldCheck size={17} />
                Davet kodu ile güvenli kayıt
              </div>

              <h1>Profesyonel emlak ağına katılın.</h1>

              <p>
                Davet kodunuzu girin, bilgilerinizle hesabınızı oluşturun ve
                EPH içerisindeki portföy yönetimine başlayın.
              </p>

              <div className="register-steps">
                <div className="register-step">
                  <div className="register-step-icon">
                    <KeyRound size={19} />
                  </div>
                  <div>
                    <strong>Davet kodunu doğrulayın</strong>
                    <span>Rolünüz kodunuza göre otomatik belirlenir.</span>
                  </div>
                </div>

                <div className="register-step">
                  <div className="register-step-icon">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <strong>Bilgilerinizi tamamlayın</strong>
                    <span>İletişim ve hesap bilgilerinizi girin.</span>
                  </div>
                </div>

                <div className="register-step">
                  <div className="register-step-icon">
                    <CheckCircle2 size={19} />
                  </div>
                  <div>
                    <strong>Platforma giriş yapın</strong>
                    <span>Onaylı kullanıcı olarak portföylerinizi yönetin.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="register-footer">
              <span>© 2026 EPH Platform</span>
              <span>Denizli merkezli Türkiye ağı</span>
            </div>
          </aside>

          <section className="register-form-side">
            <div className="register-form-card">
              <div className="register-mobile-logo">
                <img src="/LOGO_EPH.png" alt="EPH" />

                <div>
                  <div className="register-brand-title" style={{ color: "#0B1F44" }}>
                    EPH Platform
                  </div>
                  <div className="register-brand-sub" style={{ color: "#64748B" }}>
                    Emlak Portföy Havuzu
                  </div>
                </div>
              </div>

              <h2 className="register-title">Hesap oluşturun</h2>

              <p className="register-sub">
                Kayıt için geçerli davet kodu gereklidir.
              </p>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="register-field">
                  <label>Davet kodu</label>

                  <div className="register-input-wrap">
                    <KeyRound className="register-input-icon" size={18} />

                    <input
                      {...register("inviteCode")}
                      placeholder="EMK-XXXX-XXXX"
                      className="register-input"
                      style={{
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                        paddingRight: 86,
                      }}
                    />

                    <div className="register-code-status">
                      {codeStatus === "checking" && "kontrol"}
                      {codeStatus === "valid" && (
                        <CheckCircle2 size={18} color="#047857" />
                      )}
                      {codeStatus === "invalid" && (
                        <XCircle size={18} color="#BE123C" />
                      )}
                    </div>
                  </div>

                  {codeStatus === "valid" && detectedRole && (
                    <div className="register-message success">
                      <CheckCircle2 size={17} />
                      <span>
                        {ROLE_LABELS[detectedRole]} olarak kaydoluyorsunuz.
                      </span>
                    </div>
                  )}

                  {codeStatus === "invalid" && (
                    <div className="register-message error">
                      <XCircle size={17} />
                      <span>Geçersiz veya süresi dolmuş davet kodu.</span>
                    </div>
                  )}

                  {errors.inviteCode && (
                    <p className="register-error">{errors.inviteCode.message}</p>
                  )}
                </div>

                <div className="register-grid">
                  <div className="register-field">
                    <label>Ad</label>

                    <div className="register-input-wrap">
                      <UserRound className="register-input-icon" size={18} />

                      <input
                        {...register("firstName")}
                        placeholder="Ahmet"
                        className="register-input"
                      />
                    </div>

                    {errors.firstName && (
                      <p className="register-error">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="register-field">
                    <label>Soyad</label>

                    <div className="register-input-wrap">
                      <UserRound className="register-input-icon" size={18} />

                      <input
                        {...register("lastName")}
                        placeholder="Yılmaz"
                        className="register-input"
                      />
                    </div>

                    {errors.lastName && (
                      <p className="register-error">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="register-field">
                  <label>E-posta adresi</label>

                  <div className="register-input-wrap">
                    <Mail className="register-input-icon" size={18} />

                    <input
                      {...register("email")}
                      type="email"
                      placeholder="ornek@email.com"
                      className="register-input"
                    />
                  </div>

                  {errors.email && (
                    <p className="register-error">{errors.email.message}</p>
                  )}
                </div>

                <div className="register-field">
                  <label>Telefon</label>

                  <div className="register-input-wrap">
                    <Phone className="register-input-icon" size={18} />

                    <input
                      {...register("phone")}
                      placeholder="+90 5__ ___ __ __"
                      className="register-input"
                    />
                  </div>

                  {errors.phone && (
                    <p className="register-error">{errors.phone.message}</p>
                  )}
                </div>

                <div className="register-field">
                  <label>Şifre</label>

                  <div className="register-input-wrap">
                    <LockKeyhole className="register-input-icon" size={18} />

                    <input
                      {...register("password")}
                      type="password"
                      placeholder="En az 6 karakter"
                      className="register-input"
                    />
                  </div>

                  {errors.password && (
                    <p className="register-error">{errors.password.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="register-server-error">{serverError}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || codeStatus !== "valid"}
                  className="register-submit"
                >
                  {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                </button>
              </form>

              <div className="register-bottom">
                Zaten hesabınız var mı? <Link href="/giris">Giriş yapın</Link>
              </div>

              <div className="register-note">
                <ShieldCheck size={18} />

                <p>
                  EPH Platform yalnızca doğrulanmış emlak profesyonelleri,
                  müteahhitler ve yetkili kullanıcılar için kullanılır.
                </p>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

export default function KayitPage() {
  return (
    <Suspense fallback={<div className="register-loading">Yükleniyor...</div>}>
      <KayitForm />
    </Suspense>
  );
}