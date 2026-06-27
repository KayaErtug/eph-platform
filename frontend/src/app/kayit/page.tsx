"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  normalizePhoneForSystem,
  registerSchema,
  RegisterFormData,
} from "@/schemas/auth.schema";

const REGISTRATION_ROLES = [
  "EMLAKCI",
  "MUTEAHHIT",
  "INSAAT_FIRMASI",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

const ROLE_LABELS: Record<RegistrationRole, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

const PUBLIC_ROLE_OPTIONS: Array<{
  value: Extract<
    RegistrationRole,
    "EMLAKCI" | "MUTEAHHIT" | "INSAAT_FIRMASI"
  >;
  label: string;
}> = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
];

function isRegistrationRole(value: unknown): value is RegistrationRole {
  return (
    typeof value === "string" &&
    REGISTRATION_ROLES.includes(value as RegistrationRole)
  );
}

const CITY_OPTIONS = [
  "KKTC",
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kilis",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şanlıurfa",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak"
];

function KayitForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [detectedRole, setDetectedRole] =
    useState<RegistrationRole | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralValid, setReferralValid] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState<{
    email: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: undefined,
    },
  });

  const inviteCode = watch("inviteCode");
  const phoneValue = watch("phone") || "";

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 4) {
      setReferralValid(false);
      setDetectedRole(null);
      resetField("role");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setReferralLoading(true);

        const res = await api.get(`/referral/${inviteCode}`);

        setValue("firstName", res.data.firstName || "");
        setValue("lastName", res.data.lastName || "");
        setValue("email", res.data.email || "");
        setValue("phone", normalizePhoneForSystem(res.data.phone), {
          shouldValidate: true,
        });

        if (!isRegistrationRole(res.data.role)) {
          throw new Error("Geçersiz referans rolü");
        }

        setDetectedRole(res.data.role);
        setValue("role", res.data.role, {
          shouldValidate: true,
        });
        setReferralValid(true);
      } catch {
        setReferralValid(false);
        setDetectedRole(null);
        resetField("role");
      } finally {
        setReferralLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [inviteCode, resetField, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError("");
    setApplicationSuccess(null);

    try {
      const payload = {
        ...data,
        role: detectedRole || data.role,
        phone: normalizePhoneForSystem(data.phone),
      };

      const res = await api.post("/auth/register", payload);

      if (res.data?.token && res.data?.user) {
        setAuth(res.data.user, res.data.token);
        router.push("/dashboard");
        return;
      }

      if (res.data?.success) {
        setApplicationSuccess({
          email: data.email.trim().toLowerCase(),
        });

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      setServerError(
        "Başvurunuz tamamlanamadı. Lütfen bilgilerinizi kontrol ederek tekrar deneyin.",
      );
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setServerError(
        Array.isArray(message)
          ? message.join(" • ")
          : message || "Bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#F7FBFF;font-family:Inter,Arial,sans-serif}
        .page{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#F7FBFF;color:#06194A}
        .shell{width:100%;max-width:1120px;min-height:720px;display:grid;grid-template-columns:.95fr 1.05fr;overflow:hidden;border-radius:32px;background:#fff;border:1px solid #DDE7F3;box-shadow:0 24px 70px rgba(15,23,42,.10)}
        .left{background:linear-gradient(145deg,#06194A,#1557D6);color:#fff;padding:42px;display:flex;flex-direction:column;justify-content:space-between}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{width:44px;height:44px;border-radius:14px;background:#fff}
        .brand-title{font-size:22px;font-weight:900}
        .hero h1{font-size:46px;line-height:1.05;margin:28px 0 0;font-weight:900;letter-spacing:-.055em}
        .hero p{margin-top:18px;line-height:1.7;color:rgba(255,255,255,.78)}
        .pill{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.20);padding:9px 14px;border-radius:999px;font-size:13px;font-weight:900;background:rgba(255,255,255,.08)}
        .feature{margin-top:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);padding:16px;border-radius:20px;font-weight:800}
        .right{display:flex;align-items:center;justify-content:center;padding:42px;background:#FAFCFF}
        .card{width:100%;max-width:500px}
        .title{text-align:center;font-size:34px;font-weight:950;color:#06194A;letter-spacing:-.045em}
        .subtitle{margin:8px auto 0;max-width:420px;text-align:center;color:#64748B;line-height:1.6;font-weight:700}
        form{margin-top:22px}
        .form-grid{display:grid;gap:12px}
        .row{display:grid;grid-template-columns:44px 112px 1fr 34px;align-items:center;gap:10px;min-height:66px;border:1px solid #DDE7F3;background:#fff;border-radius:22px;padding:10px 12px;box-shadow:0 10px 24px rgba(15,23,42,.04)}
        .row.ref{grid-template-columns:44px 1fr}
        .row.locked{background:#F4F8FF;border-color:#C7DDFF}
        .row-icon{display:flex;height:42px;width:42px;align-items:center;justify-content:center;border-radius:16px;background:#EFF6FF;color:#1557D6}
        .row-label{text-align:left;font-size:12px;font-weight:950;color:#475569;letter-spacing:.02em}
        .input{width:100%;height:42px;border:0;background:transparent;text-align:right;font-size:15px;font-weight:900;color:#06194A;outline:none}
        .input::placeholder{color:#94A3B8}
        select.input{cursor:pointer}
        .lock-dot{display:flex;height:30px;width:30px;align-items:center;justify-content:center;border-radius:999px;background:#E0ECFF;color:#1557D6;font-size:13px;font-weight:950}
        .password-btn{border:0;background:#EFF6FF;color:#1557D6;border-radius:999px;height:32px;width:32px;cursor:pointer}
        .success,.error,.hint{margin-top:10px;border-radius:16px;padding:12px;text-align:center;font-size:13px;font-weight:900;line-height:1.5}
        .success{background:#ECFDF3;border:1px solid #BBF7D0;color:#047857;display:flex;align-items:center;justify-content:center;gap:8px}
        .error{background:#FFF1F2;border:1px solid #FECDD3;color:#BE123C}
        .hint{background:#EFF6FF;border:1px solid #BFDBFE;color:#1557D6}
        .submit{width:100%;height:56px;margin-top:18px;border:0;border-radius:20px;background:#1557D6;color:#fff;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 14px 28px rgba(21,87,214,.20)}
        .submit:disabled{opacity:.65;cursor:not-allowed}
        .application-success{margin-top:24px;border:2px solid #A7F3D0;background:#F0FDF4;border-radius:26px;padding:24px;text-align:center;box-shadow:0 18px 40px rgba(5,150,105,.10)}
        .application-success-icon{width:64px;height:64px;margin:0 auto 16px;border-radius:999px;background:#DCFCE7;color:#059669;display:flex;align-items:center;justify-content:center}
        .application-success-title{font-size:24px;font-weight:950;color:#065F46;letter-spacing:-.025em}
        .application-success-text{margin:12px auto 0;max-width:420px;color:#334155;font-size:14px;font-weight:750;line-height:1.7}
        .application-success-email{margin-top:14px;border:1px solid #BBF7D0;background:#FFFFFF;border-radius:16px;padding:12px;color:#065F46;font-size:13px;font-weight:950;overflow-wrap:anywhere}
        .application-success-note{margin-top:14px;color:#64748B;font-size:12px;font-weight:750;line-height:1.6}
        .application-success-link{margin-top:20px;width:100%;min-height:52px;border-radius:18px;background:#1557D6;color:#FFFFFF;text-decoration:none;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:950;box-shadow:0 12px 24px rgba(21,87,214,.18)}
        .bottom{margin-top:20px;text-align:center;color:#64748B;font-weight:700}
        .bottom a{color:#1557D6;font-weight:950}
        @media(max-width:900px){
          .page{padding:0}
          .shell{display:block;min-height:100dvh;border-radius:0;box-shadow:none}
          .left{display:none}
          .right{min-height:100dvh;align-items:flex-start;padding:28px 16px calc(28px + env(safe-area-inset-bottom))}
          .card{max-width:460px;margin:0 auto}
          .title{font-size:30px}
          .row{grid-template-columns:40px 88px 1fr 30px;gap:8px;padding:9px 10px;border-radius:20px}
          .row-icon{height:38px;width:38px;border-radius:14px}
          .row-label{font-size:11px}
          .input{font-size:14px}
        }
      `}</style>

      <main className="page">
        <section className="shell">
          <aside className="left">
            <div className="brand">
              <img src="/LOGO_EPH.png" alt="EPH" />
              <div>
                <div className="brand-title">EPH Platform</div>
                <div style={{ opacity: 0.7 }}>Emlak Portföy Havuzu</div>
              </div>
            </div>

            <div className="hero">
              <div className="pill">
                <ShieldCheck size={16} />
                Profesyonel Üyelik Sistemi
              </div>

              <h1>Türkiye’nin yeni nesil emlak ağına katılın.</h1>

              <p>
                Referans kodunuz varsa bilgileriniz otomatik doldurulur. Referansınız yoksa normal üyelik başvurusu yapabilirsiniz.
              </p>

              <div className="feature">✓ Referanslı VIP kayıt</div>
              <div className="feature">✓ Admin onaylı güvenli üyelik</div>
              <div className="feature">✓ Profesyonel emlak ağı</div>
            </div>

            <div style={{ opacity: 0.5, fontSize: 13 }}>© 2026 EPH Platform</div>
          </aside>

          <section className="right">
            <div className="card">
              {applicationSuccess ? (
                <>
                  <div className="title">Başvurunuz alındı</div>

                  <div
                    className="application-success"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="application-success-icon">
                      <CheckCircle2 size={34} strokeWidth={2.5} />
                    </div>

                    <div className="application-success-title">
                      Üyelik talebiniz başarıyla oluşturuldu
                    </div>

                    <div className="application-success-text">
                      Başvurunuz inceleme sırasına alınmıştır. İnceleme
                      tamamlandığında hesabınız kullanıma açılacaktır. Gerekli
                      görülmesi hâlinde Yazılım Ekibi, kayıt sırasında
                      paylaştığınız telefon veya e-posta üzerinden sizinle
                      iletişime geçebilir.
                    </div>

                    <div className="application-success-email">
                      Kayıt e-postası: {applicationSuccess.email}
                    </div>

                    <div className="application-success-note">
                      Lütfen aynı e-posta adresiyle tekrar başvuru yapmayın.
                      Başvurunuz onaylandığında giriş yapabilirsiniz.
                    </div>

                    <Link href="/giris" className="application-success-link">
                      Giriş sayfasına dön
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="title">Hesap oluştur</div>

                  <div className="subtitle">
                    Referans kodunuz varsa girin. Yoksa normal üyelik başvurusu yapabilirsiniz.
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="form-grid">
                      <div>
                        <div className="row ref">
                          <span className="row-icon"><KeyRound size={18} /></span>
                          <input
                            {...register("inviteCode")}
                            placeholder="EPH-05-ADM08-1524XXXXXXX"
                            className="input"
                            style={{ textTransform: "uppercase", textAlign: "center" }}
                          />
                        </div>

                        {referralLoading && <div className="success">Kontrol ediliyor...</div>}

                        {referralValid && detectedRole && (
                          <>
                            <div className="success">
                              <CheckCircle2 size={16} />
                              {ROLE_LABELS[detectedRole]} referans kaydı bulundu.
                            </div>
                            <div className="hint">
                              Ad, soyad, e-posta ve meslek bilgisi güvenlik için kilitlendi. Telefon ve şifre alanını siz belirleyebilirsiniz.
                            </div>
                          </>
                        )}
                      </div>

                      <FormRow icon={<UserRound size={18} />} label="Ad" locked={referralValid}>
                        <input {...register("firstName")} readOnly={referralValid} placeholder="Ad" className="input" />
                      </FormRow>
                      {errors.firstName && <div className="error">{errors.firstName.message}</div>}

                      <FormRow icon={<UserRound size={18} />} label="Soyad" locked={referralValid}>
                        <input {...register("lastName")} readOnly={referralValid} placeholder="Soyad" className="input" />
                      </FormRow>
                      {errors.lastName && <div className="error">{errors.lastName.message}</div>}

                      <FormRow icon={<Mail size={18} />} label="E-posta" locked={referralValid}>
                        <input {...register("email")} readOnly={referralValid} type="email" placeholder="mail@example.com" className="input" />
                      </FormRow>
                      {errors.email && <div className="error">{errors.email.message}</div>}

                      <FormRow icon={<Phone size={18} />} label="Telefon">
                        <input
                          {...register("phone")}
                          value={phoneValue}
                          onChange={(event) =>
                            setValue("phone", normalizePhoneForSystem(event.target.value), {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          inputMode="tel"
                          placeholder="+90 532 282 88 75"
                          className="input"
                        />
                      </FormRow>
                      <div className="hint">Nasıl yazarsanız yazın sistem +90 532 282 88 75 formatına çevirir.</div>
                      {errors.phone && <div className="error">{errors.phone.message}</div>}

                      <FormRow
                        icon={<BriefcaseBusiness size={18} />}
                        label="Meslek"
                        locked={referralValid}
                      >
                        {referralValid ? (
                          <>
                            <input type="hidden" {...register("role")} />
                            <input
                              value={
                                detectedRole ? ROLE_LABELS[detectedRole] : ""
                              }
                              readOnly
                              className="input"
                            />
                          </>
                        ) : (
                          <select {...register("role")} className="input">
                            <option value="" disabled>Meslek seçiniz</option>
                            {PUBLIC_ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </FormRow>
                      {errors.role && <div className="error">{errors.role.message}</div>}

                      <FormRow icon={<MapPin size={18} />} label="Şehir">
                        <select {...register("city")} className="input" defaultValue="">
                          <option value="" disabled>Şehir seçiniz</option>
                          {CITY_OPTIONS.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </FormRow>
                      {errors.city && <div className="error">{errors.city.message}</div>}

                      <FormRow icon={<LockKeyhole size={18} />} label="Şifre" action={
                        <button type="button" className="password-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }>
                        <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Şifre oluştur" className="input" />
                      </FormRow>
                      {errors.password && <div className="error">{errors.password.message}</div>}

                      {serverError && <div className="error">{serverError}</div>}
                    </div>

                    <button type="submit" className="submit" disabled={loading}>
                      {loading ? "Hesap oluşturuluyor..." : "Üyelik Başvurusu Gönder"}
                    </button>
                  </form>

                  <div className="bottom">
                    Zaten hesabınız var mı? <Link href="/giris">Giriş Yap</Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

function FormRow({
  icon,
  label,
  locked,
  action,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  locked?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`row ${locked ? "locked" : ""}`}>
      <span className="row-icon">{icon}</span>
      <span className="row-label">{label}</span>
      {children}
      {action || (locked ? <span className="lock-dot">🔒</span> : <span />)}
    </div>
  );
}

export default function KayitPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <KayitForm />
    </Suspense>
  );
}
