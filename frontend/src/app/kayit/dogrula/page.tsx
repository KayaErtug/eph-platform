"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";

type VerificationResult = {
  success?: boolean;
  alreadyVerified?: boolean;
  isApproved?: boolean;
  canLogin?: boolean;
  message?: string;
};

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 2);
  const hiddenLength = Math.max(3, localPart.length - 2);

  return `${visibleStart}${"*".repeat(hiddenLength)}@${domain}`;
}

function VerificationContent() {
  const searchParams = useSearchParams();

  const initialEmail = useMemo(
    () => String(searchParams.get("email") || "").trim().toLowerCase(),
    [searchParams],
  );

  const initialMailSent = searchParams.get("sent") !== "0";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(initialMailSent ? 60 : 0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    initialMailSent
      ? "6 haneli doğrulama kodu e-posta adresinize gönderildi."
      : "İlk doğrulama e-postası gönderilemedi. Aşağıdaki butondan yeni kod isteyebilirsiniz.",
  );
  const [result, setResult] = useState<VerificationResult | null>(null);

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

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setError("E-posta adresi bulunamadı. Kayıt ekranına dönerek yeniden deneyin.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Doğrulama kodu 6 haneli olmalıdır.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const response = await api.post<VerificationResult>(
        "/auth/verify-email",
        {
          email,
          code,
        },
      );

      setResult(response.data);
      setInfo(response.data?.message || "E-posta adresiniz doğrulandı.");
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(" • ")
          : message || "Doğrulama işlemi tamamlanamadı.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) {
      return;
    }

    setResending(true);
    setError("");

    try {
      const response = await api.post<VerificationResult & {
        resendAfterSeconds?: number;
      }>("/auth/resend-verification", {
        email,
      });

      setInfo(
        response.data?.message ||
          "Yeni doğrulama kodu e-posta adresinize gönderildi.",
      );
      setCooldown(
        Number(response.data?.resendAfterSeconds) > 0
          ? Number(response.data?.resendAfterSeconds)
          : 60,
      );

      if (response.data?.alreadyVerified) {
        setResult(response.data);
      }
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(" • ")
          : message || "Yeni kod gönderilemedi.",
      );
    } finally {
      setResending(false);
    }
  };

  const isVerified = Boolean(result?.success || result?.alreadyVerified);

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#F4F8FF;font-family:Inter,Arial,sans-serif}
        .verify-page{min-height:100dvh;background:#F4F8FF;color:#1F2937;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
        .verify-shell{width:100%;max-width:560px;background:#FFFFFF;border:1px solid #C7D6E8;border-radius:28px;box-shadow:0 24px 70px rgba(15,23,42,.10);overflow:hidden}
        .verify-head{background:linear-gradient(145deg,#06194A,#2563EB);padding:28px 24px;text-align:center;color:#FFFFFF}
        .verify-logo{width:58px;height:58px;margin:0 auto 14px;border-radius:18px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;color:#2563EB}
        .verify-title{margin:0;font-size:28px;line-height:1.15;font-weight:950;letter-spacing:-.04em}
        .verify-subtitle{margin:10px auto 0;max-width:430px;color:#DBEAFE;font-size:14px;line-height:1.65;font-weight:700}
        .verify-body{padding:24px}
        .status-box{display:flex;gap:12px;align-items:flex-start;border:1px solid #BFDBFE;background:#EFF6FF;border-radius:18px;padding:14px 16px;color:#1E3A8A;font-size:13px;line-height:1.6;font-weight:800}
        .email-box{margin-top:14px;display:flex;align-items:center;gap:12px;border:1px solid #E2E8F0;background:#F8FAFC;border-radius:18px;padding:14px 16px}
        .email-icon{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;background:#DBEAFE;color:#2563EB;flex:0 0 auto}
        .email-label{font-size:11px;color:#64748B;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
        .email-value{margin-top:3px;color:#0F172A;font-size:14px;font-weight:950;overflow-wrap:anywhere}
        .form{margin-top:18px}
        .code-label{text-align:center;font-size:13px;color:#475569;font-weight:900}
        .code-input{width:100%;height:66px;margin-top:10px;border:2px solid #C7D6E8;border-radius:20px;background:#FFFFFF;text-align:center;font-size:30px;font-weight:950;letter-spacing:12px;color:#06194A;outline:none;padding-left:12px}
        .code-input:focus{border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.10)}
        .verify-button{width:100%;height:56px;margin-top:16px;border:0;border-radius:18px;background:#2563EB;color:#FFFFFF;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 14px 28px rgba(37,99,235,.20)}
        .verify-button:disabled{opacity:.6;cursor:not-allowed}
        .resend-row{margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;min-height:42px}
        .resend-button{border:0;background:transparent;color:#2563EB;font-size:13px;font-weight:950;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
        .resend-button:disabled{color:#94A3B8;cursor:not-allowed}
        .cooldown{display:inline-flex;align-items:center;gap:7px;color:#64748B;font-size:13px;font-weight:900}
        .error-box{margin-top:14px;border:1px solid #FECDD3;background:#FFF1F2;color:#BE123C;border-radius:16px;padding:12px;text-align:center;font-size:13px;font-weight:900;line-height:1.55}
        .success-box{margin-top:16px;border:1px solid #BBF7D0;background:#ECFDF5;color:#047857;border-radius:20px;padding:18px;text-align:center}
        .success-icon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;margin:0 auto 10px;border-radius:999px;background:#D1FAE5}
        .success-title{font-size:18px;font-weight:950}
        .success-text{margin-top:8px;font-size:13px;line-height:1.65;font-weight:800}
        .action-link{display:flex;align-items:center;justify-content:center;width:100%;height:52px;margin-top:16px;border-radius:17px;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:950}
        .secondary-link{display:block;margin-top:14px;text-align:center;color:#2563EB;text-decoration:none;font-size:13px;font-weight:950}
        .security-note{margin-top:18px;display:flex;align-items:flex-start;gap:10px;border-top:1px solid #E2E8F0;padding-top:16px;color:#64748B;font-size:12px;line-height:1.6;font-weight:700}
        @media(max-width:640px){
          .verify-page{align-items:flex-start;padding:0;background:#FFFFFF}
          .verify-shell{min-height:100dvh;border:0;border-radius:0;box-shadow:none}
          .verify-head{padding:calc(24px + env(safe-area-inset-top)) 18px 24px}
          .verify-body{padding:20px 16px calc(24px + env(safe-area-inset-bottom))}
          .verify-title{font-size:25px}
          .code-input{font-size:27px;letter-spacing:9px}
        }
      `}</style>

      <main className="verify-page">
        <section className="verify-shell">
          <header className="verify-head">
            <div className="verify-logo">
              <KeyRound size={28} />
            </div>
            <h1 className="verify-title">E-posta doğrulama</h1>
            <p className="verify-subtitle">
              Üyelik başvurunuzu tamamlamak için e-posta adresinize gönderilen
              6 haneli kodu girin.
            </p>
          </header>

          <div className="verify-body">
            <div className="status-box">
              <Mail size={19} />
              <div>{info}</div>
            </div>

            <div className="email-box">
              <div className="email-icon">
                <Mail size={19} />
              </div>
              <div>
                <div className="email-label">Doğrulama adresi</div>
                <div className="email-value">
                  {email ? maskEmail(email) : "E-posta bilgisi bulunamadı"}
                </div>
              </div>
            </div>

            {!email && (
              <div style={{ marginTop: 14 }}>
                <label className="code-label" htmlFor="verification-email">
                  E-posta adresiniz
                </label>
                <input
                  id="verification-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value.trim().toLowerCase())
                  }
                  placeholder="mail@example.com"
                  className="code-input"
                  style={{
                    fontSize: 15,
                    letterSpacing: 0,
                    padding: "0 16px",
                  }}
                />
              </div>
            )}

            {!isVerified ? (
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
                  className="code-input"
                  maxLength={6}
                  aria-label="6 haneli doğrulama kodu"
                />

                <button
                  type="submit"
                  className="verify-button"
                  disabled={verifying || code.length !== 6 || !email}
                >
                  {verifying ? "Doğrulanıyor..." : "E-postamı Doğrula"}
                </button>
              </form>
            ) : (
              <div className="success-box">
                <div className="success-icon">
                  <CheckCircle2 size={26} />
                </div>
                <div className="success-title">
                  E-posta adresiniz doğrulandı
                </div>
                <div className="success-text">{result?.message || info}</div>

                {result?.canLogin ? (
                  <Link href="/giris" className="action-link">
                    Giriş Yap
                  </Link>
                ) : (
                  <Link href="/" className="action-link">
                    Ana Sayfaya Dön
                  </Link>
                )}
              </div>
            )}

            {!isVerified && (
              <div className="resend-row">
                {cooldown > 0 ? (
                  <span className="cooldown">
                    <Clock3 size={16} />
                    Yeni kod için {cooldown} saniye
                  </span>
                ) : (
                  <button
                    type="button"
                    className="resend-button"
                    onClick={handleResend}
                    disabled={resending || !email}
                  >
                    <RefreshCw size={16} />
                    {resending ? "Gönderiliyor..." : "Yeni Kod Gönder"}
                  </button>
                )}
              </div>
            )}

            {error && <div className="error-box">{error}</div>}

            <div className="security-note">
              <ShieldCheck size={18} />
              <span>
                Doğrulama kodunuz 10 dakika geçerlidir. Beş hatalı denemeden
                sonra yeni kod istemeniz gerekir.
              </span>
            </div>

            <Link href="/kayit" className="secondary-link">
              Kayıt ekranına dön
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
