"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import {
  normalizePhoneForSystem,
  registerSchema,
  RegisterFormData,
  RegistrationType,
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
  EMLAKCI: "Emlak Danışmanı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

const PUBLIC_REGISTRATION_OPTIONS: Array<{
  value: RegistrationType;
  role: Extract<
    RegistrationRole,
    "EMLAKCI" | "MUTEAHHIT" | "INSAAT_FIRMASI"
  >;
  label: string;
  requiredDocuments: string;
  controlPoint: string;
}> = [
  {
    value: "EMLAK_DANISMANI",
    role: "EMLAKCI",
    label: "Emlak Danışmanı",
    requiredDocuments: "MYK Seviye 4 veya Seviye 5 Belgesi",
    controlPoint: "MYK Portal / e-Devlet",
  },
  {
    value: "EMLAK_OFISI",
    role: "EMLAKCI",
    label: "Emlak Ofisi",
    requiredDocuments: "Taşınmaz Ticareti Yetki Belgesi",
    controlPoint: "TTBS Sistemi / e-Devlet",
  },
  {
    value: "MUTEAHHIT",
    role: "MUTEAHHIT",
    label: "Müteahhit (Bireysel)",
    requiredDocuments: "YAMBİS Kayıt Belgesi + Vergi Levhası",
    controlPoint: "ÇŞB Bakanlığı + GİB Doğrulama",
  },
  {
    value: "INSAAT_FIRMASI",
    role: "INSAAT_FIRMASI",
    label: "İnşaat Firması",
    requiredDocuments: "YAMBİS Kayıt Belgesi + Vergi Levhası",
    controlPoint: "ÇŞB Bakanlığı + GİB Doğrulama",
  },
];

function isRegistrationRole(value: unknown): value is RegistrationRole {
  return (
    typeof value === "string" &&
    REGISTRATION_ROLES.includes(value as RegistrationRole)
  );
}

function getRegistrationTypeFromRole(
  role: RegistrationRole,
): RegistrationType | undefined {
  if (role === "EMLAKCI") {
    return "EMLAK_DANISMANI";
  }

  if (role === "MUTEAHHIT") {
    return "MUTEAHHIT";
  }

  if (role === "INSAAT_FIRMASI") {
    return "INSAAT_FIRMASI";
  }

  return undefined;
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
  "Zonguldak",
];

function KayitForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [detectedRole, setDetectedRole] =
    useState<RegistrationRole | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralValid, setReferralValid] = useState(false);

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
      registrationType: undefined,
    },
  });

  const inviteCode = watch("inviteCode");
  const phoneValue = watch("phone") || "";
  const selectedRegistrationType = watch("registrationType");

  const selectedRequirement = useMemo(
    () =>
      PUBLIC_REGISTRATION_OPTIONS.find(
        (option) => option.value === selectedRegistrationType,
      ) || null,
    [selectedRegistrationType],
  );

  useEffect(() => {
    if (!inviteCode || inviteCode.length < 4) {
      setReferralValid(false);
      setDetectedRole(null);
      resetField("role");
      resetField("registrationType");
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

        const referralRole = res.data.role;
        const referralRegistrationType =
          getRegistrationTypeFromRole(referralRole);

        setDetectedRole(referralRole);
        setValue("role", referralRole, {
          shouldValidate: true,
        });

        if (referralRegistrationType) {
          setValue("registrationType", referralRegistrationType, {
            shouldValidate: true,
          });
        } else {
          resetField("registrationType");
        }

        setReferralValid(true);
      } catch {
        setReferralValid(false);
        setDetectedRole(null);
        resetField("role");
        resetField("registrationType");
      } finally {
        setReferralLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [inviteCode, resetField, setValue]);

  const onRegistrationTypeChange = (
    value: RegistrationType | "",
  ) => {
    if (!value) {
      resetField("role");
      resetField("registrationType");
      return;
    }

    const selectedOption = PUBLIC_REGISTRATION_OPTIONS.find(
      (option) => option.value === value,
    );

    if (!selectedOption) {
      resetField("role");
      resetField("registrationType");
      return;
    }

    setValue("registrationType", selectedOption.value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("role", selectedOption.role, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError("");

    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      const resolvedRole = detectedRole || data.role;
      const resolvedRegistrationType = referralValid
        ? getRegistrationTypeFromRole(resolvedRole)
        : data.registrationType;

      const payload = {
        ...data,
        email: normalizedEmail,
        role: resolvedRole,
        registrationType: resolvedRegistrationType,
        phone: normalizePhoneForSystem(data.phone),
      };

      const res = await api.post("/auth/register", payload);

      if (
        res.data?.success &&
        res.data?.pendingRegistrationId &&
        res.data?.requiresPhoneVerification
      ) {
        const params = new URLSearchParams({
          pending: String(res.data.pendingRegistrationId),
          phone: String(res.data.phone || payload.phone),
          email: normalizedEmail,
        });

        router.push(`/kayit/dogrula?${params.toString()}`);
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
        .page{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:#F7FBFF;color:#06194A;overflow-y:auto}
        .shell{width:100%;max-width:1120px;min-height:720px;display:grid;grid-template-columns:.95fr 1.05fr;overflow:hidden;border-radius:32px;background:#fff;border:1px solid #DDE7F3;box-shadow:0 24px 70px rgba(15,23,42,.10)}
        .left{background:linear-gradient(145deg,#06194A,#1557D6);color:#fff;padding:42px;display:flex;flex-direction:column;justify-content:space-between}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{width:44px;height:44px;border-radius:14px;background:#fff}
        .brand-title{font-size:22px;font-weight:900}
        .hero h1{font-size:46px;line-height:1.05;margin:28px 0 0;font-weight:900;letter-spacing:-.055em}
        .hero p{margin-top:18px;line-height:1.7;color:rgba(255,255,255,.78)}
        .pill{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.20);padding:9px 14px;border-radius:999px;font-size:13px;font-weight:900;background:rgba(255,255,255,.08)}
        .feature{margin-top:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);padding:14px 16px;border-radius:18px;font-weight:850;line-height:1.45}
        .trust-box{margin-top:16px;border:1px solid #BFDBFE;background:linear-gradient(135deg,#EFF6FF,#F8FBFF);border-radius:20px;padding:15px 16px;text-align:center;color:#1E3A8A;font-size:12px;font-weight:850;line-height:1.6;box-shadow:0 10px 24px rgba(37,99,235,.08)}
        .trust-title{display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:5px;color:#1557D6;font-size:13px;font-weight:950}
        .verification-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:14px}
        .verification-step{border:1px solid #DBEAFE;background:#FFFFFF;border-radius:15px;padding:10px 7px;text-align:center;color:#475569;font-size:10px;font-weight:900;line-height:1.35}
        .verification-step strong{display:block;margin-bottom:3px;color:#1557D6;font-size:12px}
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
        .input{width:100%;height:42px;border:0;background:transparent;text-align:right;font-size:15px;font-weight:900;color:#06194A;outline:none;min-width:0}
        .input::placeholder{color:#94A3B8}
        select.input{cursor:pointer}
        .lock-dot{display:flex;height:30px;width:30px;align-items:center;justify-content:center;border-radius:999px;background:#E0ECFF;color:#1557D6;font-size:13px;font-weight:950}
        .password-btn{border:0;background:#EFF6FF;color:#1557D6;border-radius:999px;height:32px;width:32px;cursor:pointer}
        .success,.error,.hint{margin-top:10px;border-radius:16px;padding:12px;text-align:center;font-size:13px;font-weight:900;line-height:1.5}
        .success{background:#ECFDF3;border:1px solid #BBF7D0;color:#047857;display:flex;align-items:center;justify-content:center;gap:8px}
        .error{background:#FFF1F2;border:1px solid #FECDD3;color:#BE123C}
        .hint{background:#EFF6FF;border:1px solid #BFDBFE;color:#1557D6}
        .requirements{border:1px solid #BFDBFE;background:#EFF6FF;border-radius:18px;padding:14px 16px}
        .requirements-title{text-align:center;color:#1E3A8A;font-size:13px;font-weight:950}
        .requirements-grid{display:grid;grid-template-columns:116px 1fr;gap:8px 12px;margin-top:10px;font-size:12px;line-height:1.55}
        .requirements-label{color:#64748B;font-weight:800}
        .requirements-value{color:#1F2937;font-weight:900;overflow-wrap:anywhere}
        .submit{width:100%;height:56px;margin-top:18px;border:0;border-radius:20px;background:#1557D6;color:#fff;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 14px 28px rgba(21,87,214,.20)}
        .submit:disabled{opacity:.65;cursor:not-allowed}
        .bottom{margin-top:20px;text-align:center;color:#64748B;font-weight:700}
        .bottom a{color:#1557D6;font-weight:950}
        @media(max-width:900px){
          .page{padding:0}
          .shell{display:block;min-height:100dvh;border-radius:0;box-shadow:none}
          .left{display:none}
          .right{min-height:100dvh;align-items:flex-start;padding:28px 16px calc(28px + env(safe-area-inset-bottom));overflow-y:auto}
          .card{max-width:460px;margin:0 auto}
          .title{font-size:30px}
          .row{grid-template-columns:40px 88px 1fr 30px;gap:8px;padding:9px 10px;border-radius:20px}
          .row-icon{height:38px;width:38px;border-radius:14px}
          .row-label{font-size:11px}
          .input{font-size:14px}
          .requirements-grid{grid-template-columns:96px 1fr}
          .verification-steps{grid-template-columns:repeat(3,minmax(0,1fr))}
          .trust-box{margin-top:14px;padding:14px 12px;font-size:11px}
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
                Referans kodunuz varsa bilgileriniz otomatik doldurulur ve
                başvurunuz referanslı olarak değerlendirilir. Tüm üyeler aynı
                güvenlik ve mesleki doğrulama süreçlerinden geçer.
              </p>

              <div className="feature">
                ✓ Telefon ve e-posta doğrulamalı güvenli kayıt
              </div>
              <div className="feature">
                ✓ Mesleki belge doğrulama ve yönetici onayı
              </div>
              <div className="feature">
                ✓ Sadece doğrulanmış gayrimenkul profesyonelleri
              </div>
            </div>

            <div style={{ opacity: 0.5, fontSize: 13 }}>
              © 2026 EPH Platform
            </div>
          </aside>

          <section className="right">
            <div className="card">
              <div className="title">Hesap oluştur</div>

              <div className="subtitle">
                Bilgilerinizi tamamlayın. Telefonunuza SMS doğrulama kodu,
                e-posta adresinize 6 haneli doğrulama kodu gönderilecektir.
              </div>

              <div className="verification-steps">
                <div className="verification-step">
                  <strong>1</strong>
                  Telefon doğrulama
                </div>
                <div className="verification-step">
                  <strong>2</strong>
                  E-posta doğrulama
                </div>
                <div className="verification-step">
                  <strong>3</strong>
                  Belge inceleme
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-grid">
                  <div>
                    <div className="row ref">
                      <span className="row-icon">
                        <KeyRound size={18} />
                      </span>
                      <input
                        {...register("inviteCode")}
                        placeholder="Referans kodu — isteğe bağlı"
                        className="input"
                        style={{
                          textTransform: "uppercase",
                          textAlign: "center",
                        }}
                      />
                    </div>

                    {referralLoading && (
                      <div className="success">Kontrol ediliyor...</div>
                    )}

                    {referralValid && detectedRole && (
                      <>
                        <div className="success">
                          <CheckCircle2 size={16} />
                          {ROLE_LABELS[detectedRole]} referans kaydı bulundu.
                        </div>
                        <div className="hint">
                          Referans bilgileriniz doğrulandı. Telefon ve e-posta
                          doğrulamasını tamamladıktan sonra başvurunuz mesleki
                          belge inceleme sürecine alınacaktır.
                        </div>
                      </>
                    )}
                  </div>

                  <FormRow
                    icon={<UserRound size={18} />}
                    label="Ad"
                    locked={referralValid}
                  >
                    <input
                      {...register("firstName")}
                      readOnly={referralValid}
                      placeholder="Ad"
                      className="input"
                    />
                  </FormRow>
                  {errors.firstName && (
                    <div className="error">{errors.firstName.message}</div>
                  )}

                  <FormRow
                    icon={<UserRound size={18} />}
                    label="Soyad"
                    locked={referralValid}
                  >
                    <input
                      {...register("lastName")}
                      readOnly={referralValid}
                      placeholder="Soyad"
                      className="input"
                    />
                  </FormRow>
                  {errors.lastName && (
                    <div className="error">{errors.lastName.message}</div>
                  )}

                  <FormRow
                    icon={<Mail size={18} />}
                    label="E-posta"
                    locked={referralValid}
                  >
                    <input
                      {...register("email")}
                      readOnly={referralValid}
                      type="email"
                      placeholder="mail@example.com"
                      className="input"
                    />
                  </FormRow>
                  {errors.email && (
                    <div className="error">{errors.email.message}</div>
                  )}

                  <FormRow icon={<Phone size={18} />} label="Telefon">
                    <input
                      {...register("phone")}
                      value={phoneValue}
                      onChange={(event) =>
                        setValue(
                          "phone",
                          normalizePhoneForSystem(event.target.value),
                          {
                            shouldDirty: true,
                            shouldValidate: true,
                          },
                        )
                      }
                      inputMode="tel"
                      placeholder="+90 532 282 88 75"
                      className="input"
                    />
                  </FormRow>
                  <div className="hint">
                    Nasıl yazarsanız yazın sistem +90 532 282 88 75
                    formatına çevirir.
                  </div>
                  {errors.phone && (
                    <div className="error">{errors.phone.message}</div>
                  )}

                  <FormRow
                    icon={<BriefcaseBusiness size={18} />}
                    label="Üyelik Türü"
                    locked={referralValid}
                  >
                    {referralValid ? (
                      <>
                        <input type="hidden" {...register("role")} />
                        <input
                          type="hidden"
                          {...register("registrationType")}
                        />
                        <input
                          value={
                            detectedRole
                              ? ROLE_LABELS[detectedRole]
                              : ""
                          }
                          readOnly
                          className="input"
                        />
                      </>
                    ) : (
                      <>
                        <input type="hidden" {...register("role")} />
                        <select
                          aria-label="Üyelik Türü"
                          value={selectedRegistrationType || ""}
                          onChange={(event) =>
                            onRegistrationTypeChange(
                              event.target.value as RegistrationType | "",
                            )
                          }
                          className="input"
                        >
                          <option value="" disabled>
                            Üyelik türü seçiniz
                          </option>
                          {PUBLIC_REGISTRATION_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </FormRow>
                  {(errors.role || errors.registrationType) && (
                    <div className="error">
                      {errors.registrationType?.message ||
                        errors.role?.message}
                    </div>
                  )}

                  {selectedRequirement && (
                    <div className="requirements">
                      <div className="requirements-title">
                        {selectedRequirement.label} belge kontrolü
                      </div>
                      <div className="requirements-grid">
                        <div className="requirements-label">
                          Zorunlu belgeler
                        </div>
                        <div className="requirements-value">
                          {selectedRequirement.requiredDocuments}
                        </div>
                        <div className="requirements-label">
                          Kontrol noktası
                        </div>
                        <div className="requirements-value">
                          {selectedRequirement.controlPoint}
                        </div>
                      </div>
                    </div>
                  )}

                  <FormRow icon={<MapPin size={18} />} label="Şehir">
                    <select
                      aria-label="Şehir"
                      {...register("city")}
                      className="input"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Şehir seçiniz
                      </option>
                      {CITY_OPTIONS.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  {errors.city && (
                    <div className="error">{errors.city.message}</div>
                  )}

                  <FormRow
                    icon={<LockKeyhole size={18} />}
                    label="Şifre"
                    action={
                      <button
                        type="button"
                        className="password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? "Şifreyi gizle"
                            : "Şifreyi göster"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    }
                  >
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifre oluştur"
                      className="input"
                    />
                  </FormRow>
                  {errors.password && (
                    <div className="error">{errors.password.message}</div>
                  )}

                  {serverError && (
                    <div className="error">{serverError}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Doğrulama hazırlanıyor..."
                    : "Doğrulamaya Devam Et"}
                </button>
              </form>

              <div className="trust-box">
                <div className="trust-title">
                  <ShieldCheck size={16} />
                  Profesyonel ve kapalı devre platform
                </div>
                EPH Platform kapalı devre çalışan profesyonel bir gayrimenkul
                ağıdır. Platforma yalnız doğrulanmış emlak danışmanları, emlak
                ofisleri, müteahhitler ve inşaat firmaları kabul edilir.
              </div>

              <div className="bottom">
                Zaten hesabınız var mı?{" "}
                <Link href="/giris">Giriş Yap</Link>
              </div>
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
      {action ||
        (locked ? <span className="lock-dot">🔒</span> : <span />)}
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
