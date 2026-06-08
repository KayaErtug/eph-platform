"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { registerSchema, RegisterFormData } from "@/schemas/auth.schema";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

function normalizePhoneForForm(value?: string | null) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  let local = digits;

  if (local.startsWith("0090")) local = local.slice(4);
  if (local.startsWith("90")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.length > 10) local = local.slice(-10);

  if (local.length !== 10 || !local.startsWith("5")) return raw;

  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}

function KayitForm() {
  const router = useRouter();

  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState(false);

  const [serverError, setServerError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const [referralLoading, setReferralLoading] = useState(false);

  const [referralValid, setReferralValid] = useState(false);

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
  const phoneValue = watch("phone") || "";

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 4) {
      setReferralValid(false);
      setDetectedRole(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setReferralLoading(true);

        const res = await api.get(`/referral/${inviteCode}`);

        setValue("firstName", res.data.firstName || "");
        setValue("lastName", res.data.lastName || "");
        setValue("email", res.data.email || "");
        setValue("phone", normalizePhoneForForm(res.data.phone), {
          shouldValidate: true,
        });

        setDetectedRole(res.data.role);

        setReferralValid(true);
      } catch {
        setReferralValid(false);
        setDetectedRole(null);
      } finally {
        setReferralLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [inviteCode, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);

    setServerError("");

    try {
      const payload = {
        ...data,
        phone: normalizePhoneForForm(data.phone),
      };

      const res = await api.post("/auth/register", payload);

      setAuth(res.data.user, res.data.token);

      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
        }

        body{
          margin:0;
          background:#F5F7FA;
          font-family:Inter,sans-serif;
        }

        .page{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:#F5F7FA;
        }

        .shell{
          width:100%;
          max-width:1120px;
          min-height:720px;
          display:grid;
          grid-template-columns:.95fr 1.05fr;
          overflow:hidden;
          border-radius:32px;
          background:#fff;
          border:1px solid #E2E8F0;
        }

        .left{
          background:#0B1F44;
          color:#fff;
          padding:42px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }

        .brand{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .brand img{
          width:42px;
          height:42px;
          border-radius:12px;
          background:#fff;
        }

        .brand-title{
          font-size:22px;
          font-weight:900;
        }

        .hero h1{
          font-size:48px;
          line-height:1.05;
          margin-top:24px;
          font-weight:900;
        }

        .hero p{
          margin-top:18px;
          line-height:1.7;
          color:rgba(255,255,255,.72);
        }

        .feature{
          margin-top:16px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.05);
          padding:16px;
          border-radius:18px;
        }

        .right{
          display:flex;
          align-items:center;
          justify-content:center;
          padding:42px;
          background:#FAFBFC;
        }

        .card{
          width:100%;
          max-width:460px;
        }

        .title{
          text-align:center;
          font-size:34px;
          font-weight:900;
          color:#0B1F44;
        }

        .subtitle{
          margin-top:8px;
          text-align:center;
          color:#64748B;
          line-height:1.6;
        }

        .field{
          margin-top:18px;
        }

        .field label{
          display:block;
          margin-bottom:8px;
          text-align:center;
          font-size:13px;
          font-weight:900;
          color:#334155;
        }

        .input-wrap{
          position:relative;
        }

        .icon{
          position:absolute;
          left:14px;
          top:14px;
          color:#64748B;
        }

        .input{
          width:100%;
          height:52px;
          border-radius:16px;
          border:1px solid #CBD5E1;
          background:#fff;
          padding:0 14px 0 46px;
          text-align:center;
          font-size:15px;
          font-weight:800;
          color:#06194A;
          outline:none;
        }

        .input:focus{
          border-color:#1D4ED8;
          box-shadow:0 0 0 4px rgba(29,78,216,.10);
        }

        .input.locked{
          background:#EEF6FF;
          border-color:#BBD7FF;
          color:#0B1F44;
          cursor:not-allowed;
        }

        .password-btn{
          position:absolute;
          right:14px;
          top:13px;
          border:none;
          background:none;
          cursor:pointer;
          color:#64748B;
        }

        .success{
          margin-top:10px;
          background:#ECFDF3;
          border:1px solid #BBF7D0;
          color:#047857;
          padding:12px;
          border-radius:14px;
          font-size:13px;
          font-weight:800;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          text-align:center;
        }

        .error{
          margin-top:10px;
          background:#FFF1F2;
          border:1px solid #FECDD3;
          color:#BE123C;
          padding:12px;
          border-radius:14px;
          text-align:center;
          font-size:13px;
          font-weight:800;
        }

        .hint{
          margin-top:10px;
          background:#EFF6FF;
          border:1px solid #BFDBFE;
          color:#1557D6;
          padding:12px;
          border-radius:14px;
          text-align:center;
          font-size:12px;
          font-weight:800;
          line-height:1.5;
        }

        .submit{
          width:100%;
          height:54px;
          margin-top:24px;
          border:none;
          border-radius:16px;
          background:#1D4ED8;
          color:#fff;
          font-size:15px;
          font-weight:900;
          cursor:pointer;
        }

        .submit:disabled{
          opacity:.65;
          cursor:not-allowed;
        }

        .bottom{
          margin-top:20px;
          text-align:center;
          color:#64748B;
        }

        .bottom a{
          color:#1D4ED8;
          font-weight:800;
        }

        @media(max-width:900px){

          .page{
            padding:0;
          }

          .shell{
            display:block;
            min-height:100vh;
            border-radius:0;
          }

          .left{
            display:none;
          }

          .right{
            min-height:100vh;
            align-items:flex-start;
            padding:32px 22px;
          }

          .card{
            max-width:460px;
            margin:0 auto;
          }
        }
      `}</style>

      <main className="page">
        <section className="shell">
          <aside className="left">
            <div className="brand">
              <img src="/LOGO_EPH.png" alt="EPH" />

              <div>
                <div className="brand-title">EPH Platform</div>

                <div style={{ opacity: 0.65 }}>
                  Emlak Portföy Havuzu
                </div>
              </div>
            </div>

            <div className="hero">
              <div
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,.15)",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={16} />
                Profesyonel Üyelik Sistemi
              </div>

              <h1>
                Türkiye’nin yeni nesil emlak ağına katılın.
              </h1>

              <p>
                Referans kodunuz varsa bilgileriniz otomatik doldurulur.
                Referansınız yoksa normal başvuru oluşturabilirsiniz.
              </p>

              <div className="feature">
                <strong>✓ Referanslı VIP kayıt</strong>
              </div>

              <div className="feature">
                <strong>✓ Admin onaylı güvenli üyelik</strong>
              </div>

              <div className="feature">
                <strong>✓ Profesyonel emlak ağı</strong>
              </div>
            </div>

            <div style={{ opacity: 0.45, fontSize: 13 }}>
              © 2026 EPH Platform
            </div>
          </aside>

          <section className="right">
            <div className="card">
              <div className="title">Hesap oluştur</div>

              <div className="subtitle">
                Referans kodunuz varsa girin. Yoksa normal üyelik başvurusu yapabilirsiniz.
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="field">
                  <label>Referans kodu (opsiyonel)</label>

                  <div className="input-wrap">
                    <KeyRound className="icon" size={18} />

                    <input
                      {...register("inviteCode")}
                      placeholder="EPH-05-ADM08-1524XXXXXXX"
                      className="input"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  {referralLoading && (
                    <div className="success">
                      Kontrol ediliyor...
                    </div>
                  )}

                  {referralValid && detectedRole && (
                    <>
                      <div className="success">
                        <CheckCircle2 size={16} />
                        {ROLE_LABELS[detectedRole]} referans kaydı bulundu.
                      </div>

                      <div className="hint">
                        Referanslı kayıtta ad, soyad ve e-posta bilgileri güvenlik için kilitlenir.
                        Telefon ve şifre alanını siz belirleyebilirsiniz.
                      </div>
                    </>
                  )}
                </div>

                <div className="field">
                  <label>Ad</label>

                  <div className="input-wrap">
                    <UserRound className="icon" size={18} />

                    <input
                      {...register("firstName")}
                      readOnly={referralValid}
                      placeholder="Ad"
                      className={`input ${referralValid ? "locked" : ""}`}
                    />
                  </div>

                  {errors.firstName && (
                    <div className="error">
                      {errors.firstName.message}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Soyad</label>

                  <div className="input-wrap">
                    <UserRound className="icon" size={18} />

                    <input
                      {...register("lastName")}
                      readOnly={referralValid}
                      placeholder="Soyad"
                      className={`input ${referralValid ? "locked" : ""}`}
                    />
                  </div>

                  {errors.lastName && (
                    <div className="error">
                      {errors.lastName.message}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>E-posta</label>

                  <div className="input-wrap">
                    <Mail className="icon" size={18} />

                    <input
                      {...register("email")}
                      readOnly={referralValid}
                      type="email"
                      placeholder="mail@example.com"
                      className={`input ${referralValid ? "locked" : ""}`}
                    />
                  </div>

                  {errors.email && (
                    <div className="error">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Telefon</label>

                  <div className="input-wrap">
                    <Phone className="icon" size={18} />

                    <input
                      {...register("phone")}
                      value={phoneValue}
                      onChange={(event) =>
                        setValue("phone", normalizePhoneForForm(event.target.value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      inputMode="tel"
                      placeholder="+90 532 340 50 50"
                      className="input"
                    />
                  </div>

                  <div className="hint">
                    Nasıl yazarsanız yazın sistem +90 532 340 50 50 formatına çevirir.
                  </div>

                  {errors.phone && (
                    <div className="error">
                      {errors.phone.message}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Şifre</label>

                  <div className="input-wrap">
                    <LockKeyhole className="icon" size={18} />

                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifre oluştur"
                      className="input"
                      style={{ paddingRight: 48 }}
                    />

                    <button
                      type="button"
                      className="password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <div className="error">
                      {errors.password.message}
                    </div>
                  )}
                </div>

                {serverError && (
                  <div className="error">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Hesap oluşturuluyor..."
                    : "Üyelik Başvurusu Gönder"}
                </button>
              </form>

              <div className="bottom">
                Zaten hesabınız var mı?{" "}
                <Link href="/giris">
                  Giriş Yap
                </Link>
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
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <KayitForm />
    </Suspense>
  );
}
