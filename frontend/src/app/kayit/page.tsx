"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { registerSchema, RegisterFormData } from "@/schemas/auth.schema";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakci",
  MUTEAHHIT: "Muteahhit",
  INSAAT_FIRMASI: "Insaat Firmasi",
  ADMIN: "Admin",
};

export default function KayitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<"idle"|"checking"|"valid"|"invalid">("idle");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const inviteCode = watch("inviteCode");

  useEffect(() => {
    const code = searchParams.get("davet");
    if (code) setValue("inviteCode", code);
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
      setServerError(err.response?.data?.message || "Bir hata olustu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <div className="hidden lg:flex w-5/12 bg-gray-900 border-r border-gray-800 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white text-xl font-semibold">EPH</span>
          </div>
          <p className="text-gray-500 text-sm">Emlak Portfoy Havuzu</p>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-900 rounded-full px-3 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-blue-400 text-xs font-medium">Davet koduyla kayit</span>
          </div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Platforma<br/>
            <span className="text-blue-400">Katıl</span>
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Davet kodunuzu girin, rol otomatik atansin ve hemen baslayin.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-white text-sm font-medium">Davet kodunuzu girin</p>
                <p className="text-gray-500 text-xs mt-0.5">Mevcut bir uyeden davet kodu alin</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-white text-sm font-medium">Rolunuz otomatik atanir</p>
                <p className="text-gray-500 text-xs mt-0.5">Emlakci, Muteahhit veya Insaat Firmasi</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-white text-sm font-medium">Admin onayini bekleyin</p>
                <p className="text-gray-500 text-xs mt-0.5">Belgelerinizi yukleyin ve onay alin</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-700 text-xs">2026 EPH. Tum haklari saklidir.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-white text-2xl font-semibold mb-1">Hesap olustur</h2>
            <p className="text-gray-500 text-sm">Platforma katılmak icin formu doldurun</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Davet Kodu</label>
              <div className="relative">
                <input {...register("inviteCode")} placeholder="EMK-XXXX-XXXX"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-wider uppercase" />
                {codeStatus === "checking" && <span className="absolute right-3 top-3 text-gray-500 text-xs">kontrol...</span>}
                {codeStatus === "valid" && (
                  <span className="absolute right-3 top-3 text-green-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
                {codeStatus === "invalid" && (
                  <span className="absolute right-3 top-3 text-red-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </span>
                )}
              </div>
              {codeStatus === "invalid" && <p className="text-red-400 text-xs mt-1.5">Gecersiz veya suresi dolmus davet kodu.</p>}
            </div>

            {detectedRole && (
              <div className="bg-blue-950 border border-blue-900 rounded-xl px-4 py-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-blue-300 text-sm">
                  <span className="font-semibold">{ROLE_LABELS[detectedRole]}</span> olarak kaydoluyorsunuz
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Ad</label>
                <input {...register("firstName")} placeholder="Ahmet"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Soyad</label>
                <input {...register("lastName")} placeholder="Yilmaz"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Email</label>
              <input {...register("email")} type="email" placeholder="ornek@email.com"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Telefon</label>
              <input {...register("phone")} placeholder="+90 5__ ___ __ __"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Sifre</label>
              <input {...register("password")} type="password" placeholder="En az 6 karakter"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="bg-red-950 border border-red-900 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{serverError}</p>
              </div>
            )}

            <button type="submit" disabled={loading || codeStatus !== "valid"}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {loading ? "Kayit olunuyor..." : "Kayit Ol"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Zaten hesabiniz var mi?{" "}
            <Link href="/giris" className="text-blue-400 hover:text-blue-300 font-medium">Giris yapin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}