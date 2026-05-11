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
  const [showPassword, setShowPassword] = useState(false);

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
      setServerError(err.response?.data?.message || "Email veya sifre hatali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#0a0a0f",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Sol panel */}
      <div style={{
        width: "45%",
        background: "linear-gradient(135deg, #0f1729 0%, #0a0a0f 50%, #0d1f0d 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        borderRight: "1px solid #1a1a2e",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Dekoratif arka plan */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{
              width: "40px", height: "40px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ color: "#fff", fontSize: "20px", fontWeight: "600", letterSpacing: "-0.3px" }}>SM Platform</span>
          </div>
          <p style={{ color: "#4b5563", fontSize: "13px", margin: 0 }}>Kapali Devre Profesyonel Emlak Agi</p>
        </div>

        {/* Ana mesaj */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(37, 99, 235, 0.1)", border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "20px", padding: "4px 12px", marginBottom: "24px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ color: "#60a5fa", fontSize: "12px", fontWeight: "500" }}>Sadece davetli profesyoneller</span>
          </div>

          <h1 style={{
            color: "#fff", fontSize: "36px", fontWeight: "700",
            lineHeight: "1.2", margin: "0 0 16px", letterSpacing: "-0.5px",
          }}>
            Turkiye'nin<br />
            <span style={{ color: "#3b82f6" }}>B2B Emlak</span><br />
            Ekosistemi
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: "1.7", margin: 0 }}>
            Dogrulanmis emlakci, muteahhit ve insaat firmalarinin bir arada calistigi kapali devre profesyonel ag.
          </p>

          {/* Ozellikler */}
          <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { icon: "🔒", text: "Sadece dogrulanmis uyeler" },
              { icon: "⚡", text: "Gercek zamanli stok guncellemesi" },
              { icon: "🤝", text: "Ortak satis & komisyon sistemi" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: "16px",
                }}>{f.icon}</div>
                <span style={{ color: "#9ca3af", fontSize: "14px" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alt bilgi */}
        <p style={{ color: "#374151", fontSize: "12px", margin: 0 }}>
          © 2026 SM Platform. Tum haklari saklıdır.
        </p>
      </div>

      {/* Sag panel - Form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: "600", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
              Tekrar hosgeldiniz
            </h2>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
              Hesabiniza giris yapin
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", color: "#9ca3af", fontSize: "13px", fontWeight: "500", marginBottom: "8px" }}>
                Email adresi
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="ornek@email.com"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "#111827", border: "1px solid #1f2937",
                  borderRadius: "10px", color: "#fff", fontSize: "14px",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#1f2937"}
              />
              {errors.email && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px" }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={{ display: "block", color: "#9ca3af", fontSize: "13px", fontWeight: "500", marginBottom: "8px" }}>
                Sifre
              </label>
              <div style={{ position: "relative" }}>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "12px 44px 12px 16px",
                    background: "#111827", border: "1px solid #1f2937",
                    borderRadius: "10px", color: "#fff", fontSize: "14px",
                    outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e => e.target.style.borderColor = "#1f2937"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#6b7280", fontSize: "18px", padding: "0",
                  }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px" }}>{errors.password.message}</p>}
            </div>

            {serverError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px", padding: "12px 16px",
              }}>
                <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "#1f2937" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                border: "none", borderRadius: "10px",
                color: loading ? "#6b7280" : "#fff",
                fontSize: "15px", fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                letterSpacing: "0.1px",
              }}
            >
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#6b7280", fontSize: "13px", marginTop: "24px" }}>
            Hesabiniz yok mu?{" "}
            <Link href="/kayit" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: "500" }}>
              Kayit olun
            </Link>
          </p>

          <div style={{
            marginTop: "40px", padding: "16px",
            background: "rgba(255,255,255,0.03)", borderRadius: "10px",
            border: "1px solid #1a1a2e",
          }}>
            <p style={{ color: "#4b5563", fontSize: "12px", margin: "0 0 4px" }}>Platform erisimi</p>
            <p style={{ color: "#6b7280", fontSize: "12px", margin: 0, lineHeight: "1.6" }}>
              SM Platform'a erisim yalnizca davet koduyla mumkundur. Davet kodu almak icin mevcut bir uyeden referans almaniz gerekmektedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}