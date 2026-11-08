"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import {
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";
import { getFirebasePhoneAuth } from "@/lib/firebase-phone-auth";

type Step = "phone" | "email" | "complete";

type StoredPhoneSession = {
  sessionInfo: string;
  sessionExpiresAt: string;
  nextSmsAllowedAt?: string;
};

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10) {
    return phone;
  }

  return `+90 5** *** ** ${digits.slice(-2)}`;
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(3, localPart.length - 2))}@${domain}`;
}

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;

  return Array.isArray(message) ? message.join(" • ") : message || fallback;
}

function getFirebaseErrorMessage(error: any, fallback: string) {
  const backendMessage = getErrorMessage(error, "");

  if (backendMessage) {
    return backendMessage;
  }

  const firebaseErrorCode = String(error?.code || "");

  const firebaseMessages: Record<string, string> = {
    "auth/invalid-phone-number":
      "Telefon numarası Firebase tarafından geçersiz bulundu.",
    "auth/missing-phone-number":
      "Telefon numarası doğrulama işlemine gönderilemedi.",
    "auth/too-many-requests":
      "Bu telefon numarası veya cihaz için çok fazla SMS isteği yapıldı. Lütfen daha sonra tekrar deneyiniz.",
    "auth/quota-exceeded":
      "Firebase SMS gönderim kotasına ulaşıldı. Lütfen daha sonra tekrar deneyiniz.",
    "auth/captcha-check-failed":
      "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyiniz.",
    "auth/network-request-failed":
      "İnternet bağlantısı nedeniyle Firebase SMS isteği tamamlanamadı.",
    "auth/app-not-authorized":
      "Bu alan adı Firebase telefon doğrulaması için yetkilendirilmemiş.",
    "auth/operation-not-allowed":
      "Firebase telefon doğrulama hizmeti şu anda aktif değil.",
  };

  return firebaseMessages[firebaseErrorCode] || error?.message || fallback;
}

function getSecondsUntil(value: string | null | undefined, fallback: number) {
  const timestamp = Date.parse(String(value || ""));

  if (!Number.isFinite(timestamp)) {
    return fallback;
  }

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function readStoredPhoneSession(storageKey: string): StoredPhoneSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const stored = JSON.parse(rawValue) as StoredPhoneSession;

    const sessionInfo = String(stored.sessionInfo || "").trim();

    const expiresAt = Date.parse(String(stored.sessionExpiresAt || ""));

    if (
      !sessionInfo ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return {
      sessionInfo,
      sessionExpiresAt: stored.sessionExpiresAt,
      nextSmsAllowedAt: stored.nextSmsAllowedAt,
    };
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function VerificationContent() {
  const searchParams = useSearchParams();

  const pendingRegistrationId = useMemo(
    () => String(searchParams.get("pending") || "").trim(),
    [searchParams],
  );

  const phone = useMemo(
    () => String(searchParams.get("phone") || "").trim(),
    [searchParams],
  );

  const email = useMemo(
    () =>
      String(searchParams.get("email") || "")
        .trim()
        .toLowerCase(),
    [searchParams],
  );

  const phoneSessionStorageKey = useMemo(
    () => `eph:firebase-phone-session:${pendingRegistrationId}`,
    [pendingRegistrationId],
  );

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const automaticSmsRequestRef = useRef("");

  const [step, setStep] = useState<Step>("phone");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [initializingPhone, setInitializingPhone] = useState(true);
  const [phoneSessionReady, setPhoneSessionReady] = useState(false);
  const [phoneSessionInfo, setPhoneSessionInfo] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    "Güvenli telefon doğrulama işlemi hazırlanıyor.",
  );
  const [completedMessage, setCompletedMessage] = useState("");

  const clearRecaptchaVerifier = useCallback(() => {
    const verifier = recaptchaVerifierRef.current;
    recaptchaVerifierRef.current = null;

    if (verifier) {
      try {
        verifier.clear();
      } catch {
        // Daha önce temizlenmiş Firebase doğrulayıcısı.
      }
    }

    const recaptchaHost = document.getElementById("firebase-phone-recaptcha");

    if (recaptchaHost) {
      recaptchaHost.innerHTML = "";
    }
  }, []);

  const sendPhoneCode = useCallback(
    async (isResend: boolean) => {
      if (!pendingRegistrationId) {
        setError("Kayıt doğrulama oturumu bulunamadı.");
        return false;
      }

      if (!phone) {
        setError("Doğrulanacak telefon numarası bulunamadı.");
        return false;
      }

      setError("");
      setPhoneSessionReady(false);
      setPhoneSessionInfo("");

      window.sessionStorage.removeItem(phoneSessionStorageKey);

      try {
        const prepareResponse = await api.post(
          "/auth/prepare-firebase-phone-verification",
          {
            pendingRegistrationId,
          },
        );

        const verificationPhone = String(
          prepareResponse.data?.phone || phone,
        ).trim();

        if (!verificationPhone) {
          throw new Error(
            "Firebase doğrulaması için telefon numarası hazırlanamadı.",
          );
        }

        clearRecaptchaVerifier();

        const auth = getFirebasePhoneAuth();

        const verifier = new RecaptchaVerifier(
          auth,
          "firebase-phone-recaptcha",
          {
            size: "invisible",
          },
        );

        recaptchaVerifierRef.current = verifier;

        await verifier.render();

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          verificationPhone,
          verifier,
        );

        const verificationId = String(
          confirmationResult.verificationId || "",
        ).trim();

        if (!verificationId) {
          throw new Error("Firebase doğrulama oturumu oluşturulamadı.");
        }

        const bindResponse = await api.post(
          "/auth/bind-firebase-phone-session",
          {
            pendingRegistrationId,
            sessionInfo: verificationId,
          },
        );

        const sessionExpiresAt = String(
          bindResponse.data?.sessionExpiresAt || "",
        );

        const nextSmsAllowedAt = String(
          bindResponse.data?.nextSmsAllowedAt || "",
        );

        setPhoneSessionInfo(verificationId);
        setPhoneSessionReady(true);

        window.sessionStorage.setItem(
          phoneSessionStorageKey,
          JSON.stringify({
            sessionInfo: verificationId,
            sessionExpiresAt,
            nextSmsAllowedAt,
          } satisfies StoredPhoneSession),
        );

        setCooldown(getSecondsUntil(nextSmsAllowedAt, 120));

        setInfo(
          isResend
            ? "Yeni Firebase doğrulama kodu telefonunuza gönderildi."
            : "Telefonunuza gönderilen 6 haneli Firebase doğrulama kodunu girin.",
        );

        return true;
      } catch (requestError: any) {
        setInfo("Telefon doğrulama kodu gönderilemedi.");

        setError(
          getFirebaseErrorMessage(
            requestError,
            "Firebase doğrulama kodu gönderilemedi.",
          ),
        );

        return false;
      } finally {
        clearRecaptchaVerifier();
      }
    },
    [
      clearRecaptchaVerifier,
      pendingRegistrationId,
      phone,
      phoneSessionStorageKey,
    ],
  );

  useEffect(() => {
    if (!pendingRegistrationId || !phone) {
      setInitializingPhone(false);

      setError(
        "Telefon doğrulama bilgileri eksik. Üyelik formuna dönerek yeniden başlayınız.",
      );

      return;
    }

    const storedSession = readStoredPhoneSession(phoneSessionStorageKey);

    if (storedSession) {
      setPhoneSessionInfo(storedSession.sessionInfo);
      setPhoneSessionReady(true);

      setCooldown(getSecondsUntil(storedSession.nextSmsAllowedAt, 0));

      setInfo(
        "Telefonunuza gönderilen 6 haneli Firebase doğrulama kodunu girin.",
      );

      setInitializingPhone(false);
      return;
    }

    const automaticRequestKey = `${pendingRegistrationId}:${phone}`;

    if (automaticSmsRequestRef.current === automaticRequestKey) {
      return;
    }

    automaticSmsRequestRef.current = automaticRequestKey;

    setInitializingPhone(true);

    void sendPhoneCode(false).finally(() => {
      setInitializingPhone(false);
    });
  }, [pendingRegistrationId, phone, phoneSessionStorageKey, sendPhoneCode]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const sendEmailCode = async () => {
    await api.post("/auth/send-email-code", {
      pendingRegistrationId,
    });

    setStep("email");
    setCode("");
    setCooldown(60);

    setInfo("E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.");
  };

  const completeRegistration = async () => {
    const response = await api.post("/auth/complete-registration", {
      pendingRegistrationId,
    });

    setCompletedMessage(
      response.data?.message ||
        "Üyelik kaydınız tamamlandı. Mesleki belge onay sürecine geçebilirsiniz.",
    );

    setStep("complete");
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingRegistrationId) {
      setError("Kayıt doğrulama oturumu bulunamadı.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Doğrulama kodu 6 haneli olmalıdır.");
      return;
    }

    if (step === "phone" && (!phoneSessionReady || !phoneSessionInfo)) {
      setError(
        "Firebase telefon doğrulama oturumu hazır değil. Yeni kod gönderiniz.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (step === "phone") {
        await api.post("/auth/verify-firebase-phone-otp", {
          pendingRegistrationId,
          sessionInfo: phoneSessionInfo,
          code,
        });

        window.sessionStorage.removeItem(phoneSessionStorageKey);

        setPhoneSessionInfo("");
        setPhoneSessionReady(false);

        await sendEmailCode();
        return;
      }

      await api.post("/auth/verify-email-v2", {
        pendingRegistrationId,
        code,
      });

      await completeRegistration();
    } catch (requestError: any) {
      setError(
        getErrorMessage(requestError, "Doğrulama işlemi tamamlanamadı."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (
      !pendingRegistrationId ||
      cooldown > 0 ||
      resending ||
      initializingPhone ||
      step === "complete"
    ) {
      return;
    }

    setResending(true);
    setError("");

    try {
      if (step === "phone") {
        const sent = await sendPhoneCode(true);

        if (sent) {
          setCode("");
        }
      } else {
        await api.post("/auth/send-email-code", {
          pendingRegistrationId,
        });

        setInfo("Yeni e-posta doğrulama kodu gönderildi.");

        setCode("");
        setCooldown(60);
      }
    } catch (requestError: any) {
      setError(
        getErrorMessage(requestError, "Yeni doğrulama kodu gönderilemedi."),
      );
    } finally {
      setResending(false);
    }
  };

  const isPhoneStep = step === "phone";

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#F4F8FF;font-family:Inter,Arial,sans-serif}
        .page{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px;background:#F4F8FF;color:#1F2937}
        .shell{width:100%;max-width:560px;overflow:hidden;border:1px solid #C7D6E8;border-radius:28px;background:#FFFFFF;box-shadow:0 24px 70px rgba(15,23,42,.10)}
        .head{padding:28px 24px;text-align:center;color:#FFFFFF;background:linear-gradient(145deg,#06194A,#2563EB)}
        .logo{display:flex;align-items:center;justify-content:center;width:58px;height:58px;margin:0 auto 14px;border-radius:18px;background:#FFFFFF;color:#2563EB}
        .title{margin:0;font-size:28px;line-height:1.15;font-weight:950;letter-spacing:-.04em}
        .subtitle{max-width:430px;margin:10px auto 0;color:#DBEAFE;font-size:14px;line-height:1.65;font-weight:700}
        .steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:18px}
        .step{padding:9px 6px;border:1px solid rgba(255,255,255,.18);border-radius:13px;background:rgba(255,255,255,.08);font-size:10px;font-weight:900;opacity:.62}
        .step.active,.step.done{opacity:1;background:rgba(255,255,255,.17)}
        .body{padding:24px}
        .status{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1px solid #BFDBFE;border-radius:18px;background:#EFF6FF;color:#1E3A8A;font-size:13px;line-height:1.6;font-weight:800}
        .target{display:flex;align-items:center;gap:12px;margin-top:14px;padding:14px 16px;border:1px solid #E2E8F0;border-radius:18px;background:#F8FAFC}
        .target-icon{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;background:#DBEAFE;color:#2563EB}
        .target-label{font-size:11px;color:#64748B;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
        .target-value{margin-top:3px;color:#0F172A;font-size:14px;font-weight:950;overflow-wrap:anywhere}
        .form{margin-top:18px}
        .code-label{display:block;text-align:center;font-size:13px;color:#475569;font-weight:900}
        .code{width:100%;height:66px;margin-top:10px;padding-left:12px;border:2px solid #C7D6E8;border-radius:20px;background:#FFFFFF;text-align:center;font-size:30px;font-weight:950;letter-spacing:12px;color:#06194A;outline:none}
        .code:focus{border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.10)}
        .button{width:100%;height:56px;margin-top:16px;border:0;border-radius:18px;background:#2563EB;color:#FFFFFF;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 14px 28px rgba(37,99,235,.20)}
        .button:disabled{opacity:.6;cursor:not-allowed}
        .resend{display:flex;align-items:center;justify-content:center;gap:8px;min-height:42px;margin-top:14px}
        .resend-button{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:#2563EB;font-size:13px;font-weight:950;cursor:pointer}
        .resend-button:disabled{color:#94A3B8;cursor:not-allowed}
        .cooldown{display:inline-flex;align-items:center;gap:7px;color:#64748B;font-size:13px;font-weight:900}
        .error{margin-top:14px;padding:12px;border:1px solid #FECDD3;border-radius:16px;background:#FFF1F2;color:#BE123C;text-align:center;font-size:13px;font-weight:900;line-height:1.55}
        .success{padding:18px;border:1px solid #BBF7D0;border-radius:20px;background:#ECFDF5;color:#047857;text-align:center}
        .success-icon{display:flex;align-items:center;justify-content:center;width:52px;height:52px;margin:0 auto 12px;border-radius:999px;background:#D1FAE5}
        .success-title{font-size:19px;font-weight:950}
        .success-text{margin-top:8px;font-size:13px;line-height:1.7;font-weight:800}
        .action{display:flex;align-items:center;justify-content:center;width:100%;height:52px;margin-top:16px;border-radius:17px;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:950}
        .security{display:flex;align-items:flex-start;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;line-height:1.6;font-weight:700}
        .recaptcha-host{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}
        @media(max-width:640px){
          .page{align-items:flex-start;padding:0;background:#FFFFFF}
          .shell{min-height:100dvh;border:0;border-radius:0;box-shadow:none}
          .head{padding:calc(24px + env(safe-area-inset-top)) 18px 24px}
          .body{padding:20px 16px calc(24px + env(safe-area-inset-bottom))}
          .title{font-size:25px}
          .code{font-size:27px;letter-spacing:9px}
        }
      `}</style>

      <main className="page">
        <section className="shell">
          <header className="head">
            <div className="logo">
              <ShieldCheck size={29} />
            </div>

            <h1 className="title">
              {step === "complete"
                ? "Başvurunuz oluşturuldu"
                : isPhoneStep
                  ? "Telefon doğrulama"
                  : "E-posta doğrulama"}
            </h1>

            <p className="subtitle">
              Telefon ve e-posta doğrulamasını tamamlayarak güvenli üyelik
              başvurunuzu oluşturun.
            </p>

            <div className="steps">
              <div className={`step ${step === "phone" ? "active" : "done"}`}>
                1 · Telefon
              </div>

              <div
                className={`step ${
                  step === "email"
                    ? "active"
                    : step === "complete"
                      ? "done"
                      : ""
                }`}
              >
                2 · E-posta
              </div>

              <div className={`step ${step === "complete" ? "active" : ""}`}>
                3 · Belge onayı
              </div>
            </div>
          </header>

          <div className="body">
            <button
              id="firebase-phone-recaptcha"
              type="button"
              className="recaptcha-host"
              aria-hidden="true"
              tabIndex={-1}
            />

            {step !== "complete" ? (
              <>
                <div className="status">
                  {isPhoneStep ? <Phone size={19} /> : <Mail size={19} />}
                  <div>{info}</div>
                </div>

                <div className="target">
                  <div className="target-icon">
                    {isPhoneStep ? <Phone size={19} /> : <Mail size={19} />}
                  </div>

                  <div>
                    <div className="target-label">
                      {isPhoneStep
                        ? "Doğrulama telefonu"
                        : "Doğrulama e-postası"}
                    </div>

                    <div className="target-value">
                      {isPhoneStep ? maskPhone(phone) : maskEmail(email)}
                    </div>
                  </div>
                </div>

                <form className="form" onSubmit={handleVerify}>
                  <label className="code-label" htmlFor="verification-code">
                    6 haneli doğrulama kodu
                  </label>

                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    placeholder="000000"
                    className="code"
                    maxLength={6}
                  />

                  <button
                    type="submit"
                    className="button"
                    disabled={
                      loading ||
                      code.length !== 6 ||
                      !pendingRegistrationId ||
                      (isPhoneStep && (!phoneSessionReady || initializingPhone))
                    }
                  >
                    {initializingPhone && isPhoneStep
                      ? "SMS Gönderiliyor..."
                      : loading
                        ? "Doğrulanıyor..."
                        : isPhoneStep
                          ? "Telefonumu Doğrula"
                          : "E-postamı Doğrula"}
                  </button>
                </form>

                <div className="resend">
                  {isPhoneStep && initializingPhone ? (
                    <span className="cooldown">
                      <RefreshCw size={16} />
                      Güvenli SMS gönderiliyor
                    </span>
                  ) : cooldown > 0 ? (
                    <span className="cooldown">
                      <Clock3 size={16} />
                      Yeni kod için {cooldown} saniye
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="resend-button"
                      onClick={handleResend}
                      disabled={resending || initializingPhone}
                    >
                      <RefreshCw size={16} />
                      {resending ? "Gönderiliyor..." : "Yeni kod gönder"}
                    </button>
                  )}
                </div>

                {error && <div className="error">{error}</div>}
              </>
            ) : (
              <div className="success">
                <div className="success-icon">
                  <CheckCircle2 size={28} />
                </div>

                <div className="success-title">Doğrulamalar tamamlandı</div>

                <div className="success-text">{completedMessage}</div>

                <Link href="/giris" className="action">
                  Giriş ekranına git
                </Link>
              </div>
            )}

            <div className="security">
              <ShieldCheck size={18} />
              <span>
                Doğrulama kodları tek kullanımlıktır. Kodları EPH personeli
                dahil hiç kimseyle paylaşmayınız.
              </span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
