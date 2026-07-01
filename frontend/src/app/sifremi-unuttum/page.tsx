"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";

type Step = "EMAIL" | "CODE" | "PASSWORD" | "DONE";

function getErrorMessage(error: any) {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    "İşlem tamamlanamadı. Lütfen tekrar deneyin.";

  return message === "Sunucu bağlantısı kurulamadı."
    ? "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin."
    : Array.isArray(message)
      ? message[0]
      : String(message);
}

export default function SifremiUnuttumPage() {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const rememberedEmail =
      window.localStorage.getItem("eph_remembered_email");

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const stepInfo = useMemo(() => {
    if (step === "CODE") {
      return {
        title: "Doğrulama kodunu girin",
        description:
          "E-posta adresinize gönderilen 6 haneli kodu yazın.",
        number: 2,
      };
    }

    if (step === "PASSWORD") {
      return {
        title: "Yeni şifrenizi belirleyin",
        description:
          "En az 6 karakterden oluşan yeni şifrenizi girin.",
        number: 3,
      };
    }

    if (step === "DONE") {
      return {
        title: "Şifreniz yenilendi",
        description:
          "Yeni şifrenizle EPH Platform'a giriş yapabilirsiniz.",
        number: 3,
      };
    }

    return {
      title: "Şifrenizi yenileyin",
      description:
        "EPH hesabınızda kullandığınız e-posta adresini girin.",
      number: 1,
    };
  }, [step]);

  const requestCode = async (isResend = false) => {
    const normalizedEmail = email.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });

      setEmail(normalizedEmail);
      setCode("");
      setResetToken("");
      setResendSeconds(
        Number(response.data?.resendAfterSeconds || 60),
      );
      setMessage(
        isResend
          ? "Yeni kod talebiniz alındı. E-posta kutunuzu kontrol edin."
          : response.data?.message ||
              "E-posta adresiniz kayıtlıysa kod gönderilmiştir.",
      );
      setStep("CODE");
    } catch (requestError: any) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Doğrulama kodu 6 haneli olmalıdır.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.post(
        "/auth/verify-password-reset-code",
        {
          email,
          code,
        },
      );

      const token = String(response.data?.resetToken || "");

      if (!token) {
        throw new Error("Şifre yenileme oturumu oluşturulamadı.");
      }

      setResetToken(token);
      setMessage(
        response.data?.message ||
          "Kod doğrulandı. Yeni şifrenizi belirleyebilirsiniz.",
      );
      setStep("PASSWORD");
    } catch (verifyError: any) {
      setError(getErrorMessage(verifyError));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== newPasswordAgain) {
      setError("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    if (!resetToken) {
      setError("Şifre yenileme oturumu bulunamadı. Yeniden kod isteyin.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });

      setMessage(
        response.data?.message ||
          "Şifreniz başarıyla yenilendi.",
      );
      setNewPassword("");
      setNewPasswordAgain("");
      setResetToken("");
      setStep("DONE");
    } catch (resetError: any) {
      setError(getErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] px-4 py-5 text-[#1F2937] sm:flex sm:items-center sm:justify-center">
      <section className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[30px] border-2 border-[#C7D6E8] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <header className="border-b-2 border-[#E2EAF5] bg-gradient-to-br from-[#EFF6FF] via-white to-[#F8FAFC] px-4 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/giris"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-white text-[#2563EB]"
              aria-label="Giriş sayfasına dön"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0 flex-1 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]">
                {step === "DONE" ? (
                  <CheckCircle2 size={25} />
                ) : (
                  <KeyRound size={24} />
                )}
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
                EPH Güvenli Hesap Kurtarma
              </p>
            </div>

            <div className="h-11 w-11 shrink-0" />
          </div>

          <h1 className="mt-3 text-center text-[23px] font-black tracking-[-0.04em] text-[#06194A]">
            {stepInfo.title}
          </h1>
          <p className="mx-auto mt-2 max-w-[330px] text-center text-[12px] font-bold leading-5 text-[#64748B]">
            {stepInfo.description}
          </p>

          {step !== "DONE" && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((number) => (
                <div
                  key={number}
                  className={`h-2 rounded-full ${
                    number <= stepInfo.number
                      ? "bg-[#2563EB]"
                      : "bg-[#DCE7F4]"
                  }`}
                />
              ))}
            </div>
          )}
        </header>

        <div className="p-4">
          {message && (
            <div className="mb-3 rounded-[17px] border-2 border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-[11px] font-black leading-5 text-emerald-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-[17px] border-2 border-rose-200 bg-rose-50 px-3 py-3 text-center text-[11px] font-black leading-5 text-rose-700">
              {error}
            </div>
          )}

          {step === "EMAIL" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void requestCode();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-[11px] font-black text-[#334155]">
                  E-posta adresi
                </span>
                <div className="flex h-13 min-h-[52px] items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 focus-within:border-[#2563EB]">
                  <Mail size={18} className="shrink-0 text-[#64748B]" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="ornek@email.com"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#2563EB] px-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] disabled:opacity-60"
              >
                <Mail size={17} />
                {loading ? "Kod gönderiliyor..." : "Doğrulama Kodu Gönder"}
              </button>
            </form>
          )}

          {step === "CODE" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCode();
              }}
            >
              <div className="rounded-[17px] border-2 border-[#BFDBFE] bg-[#EFF6FF] px-3 py-3 text-center">
                <p className="text-[10px] font-black text-[#64748B]">
                  Kod gönderilen adres
                </p>
                <p className="mt-1 break-all text-[12px] font-black text-[#1D4ED8]">
                  {email}
                </p>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-[11px] font-black text-[#334155]">
                  6 haneli doğrulama kodu
                </span>
                <div className="flex h-14 items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 focus-within:border-[#2563EB]">
                  <ShieldCheck
                    size={19}
                    className="shrink-0 text-[#64748B]"
                  />
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="min-w-0 flex-1 bg-transparent text-center font-mono text-[25px] font-black tracking-[0.24em] text-[#06194A] outline-none"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#2563EB] px-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] disabled:opacity-60"
              >
                <ShieldCheck size={17} />
                {loading ? "Kod doğrulanıyor..." : "Kodu Doğrula"}
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("EMAIL");
                    setCode("");
                    setMessage("");
                    setError("");
                  }}
                  className="min-h-[44px] rounded-[15px] border-2 border-[#C7D6E8] bg-white px-2 text-[11px] font-black text-[#64748B]"
                >
                  E-postayı Değiştir
                </button>

                <button
                  type="button"
                  disabled={loading || resendSeconds > 0}
                  onClick={() => void requestCode(true)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[15px] border-2 border-[#BFDBFE] bg-[#EFF6FF] px-2 text-[11px] font-black text-[#1D4ED8] disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  {resendSeconds > 0
                    ? `${resendSeconds} sn`
                    : "Kodu Yeniden Gönder"}
                </button>
              </div>
            </form>
          )}

          {step === "PASSWORD" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void resetPassword();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-[11px] font-black text-[#334155]">
                  Yeni şifre
                </span>
                <div className="flex h-13 min-h-[52px] items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 focus-within:border-[#2563EB]">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-[#64748B]"
                  />
                  <input
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="En az 6 karakter"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[#64748B]"
                    aria-label={
                      showPassword ? "Şifreyi gizle" : "Şifreyi göster"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <label className="mt-3 block">
                <span className="mb-2 block text-[11px] font-black text-[#334155]">
                  Yeni şifre tekrar
                </span>
                <div className="flex h-13 min-h-[52px] items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 focus-within:border-[#2563EB]">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-[#64748B]"
                  />
                  <input
                    value={newPasswordAgain}
                    onChange={(event) =>
                      setNewPasswordAgain(event.target.value)
                    }
                    type={showPasswordAgain ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Yeni şifrenizi tekrar yazın"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordAgain((current) => !current)
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[#64748B]"
                    aria-label={
                      showPasswordAgain
                        ? "Şifreyi gizle"
                        : "Şifreyi göster"
                    }
                  >
                    {showPasswordAgain ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <div className="mt-3 rounded-[15px] border border-[#D7E3F2] bg-[#F8FAFC] px-3 py-2 text-center text-[10px] font-bold leading-4 text-[#64748B]">
                Şifreniz en az 6 karakter olmalıdır. Şifrenizi başka
                kişilerle paylaşmayın.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#2563EB] px-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] disabled:opacity-60"
              >
                <LockKeyhole size={17} />
                {loading ? "Şifre yenileniyor..." : "Şifremi Yenile"}
              </button>
            </form>
          )}

          {step === "DONE" && (
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={42} />
              </div>

              <p className="mx-auto mt-4 max-w-[300px] text-[12px] font-bold leading-5 text-[#64748B]">
                Hesabınız hazır. Yeni şifrenizle güvenli biçimde giriş
                yapabilirsiniz.
              </p>

              <Link
                href="/giris"
                className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#2563EB] px-3 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
              >
                Giriş Sayfasına Git
              </Link>
            </div>
          )}
        </div>

        <footer className="border-t-2 border-[#E2EAF5] bg-[#F8FAFC] px-4 py-3 text-center text-[9.5px] font-bold leading-4 text-[#64748B]">
          EPH Platform doğrulama kodunu veya şifrenizi hiçbir zaman
          telefonla istemez.
        </footer>
      </section>
    </main>
  );
}