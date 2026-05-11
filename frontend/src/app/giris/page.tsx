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
            <span className="text-blue-400 text-xs font-medium">Sadece davetli profesyoneller</span>
          </div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Turkiye nin<br/>
            <span className="text-blue-400">B2B Emlak</span><br/>
            Ekosistemi
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Dogrulanmis emlakci, muteahhit ve insaat firmalarinin bir arada calistigi kapali devre profesyonel ag.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-950 border border-blue-900 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <span className="text-gray-400 text-sm">Sadece dogrulanmis uyeler</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-950 border border-blue-900 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <span className="text-gray-400 text-sm">Gercek zamanli stok guncellemesi</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-950 border border-blue-900 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className="text-gray-400 text-sm">Ortak satis ve komisyon sistemi</span>
            </div>
          </div>
        </div>

        <p className="text-gray-700 text-xs">2026 EPH. Tum haklari saklidir.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-white text-2xl font-semibold mb-1">Tekrar hosgeldiniz</h2>
            <p className="text-gray-500 text-sm">Hesabiniza giris yapin</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Email adresi</label>
              <input {...register("email")} type="email" placeholder="ornek@email.com"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Sifre</label>
              <input {...register("password")} type="password" placeholder="Sifreniz"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="bg-red-950 border border-red-900 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{serverError}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Hesabiniz yok mu?{" "}
            <Link href="/kayit" className="text-blue-400 hover:text-blue-300 font-medium">Kayit olun</Link>
          </p>

          <div className="mt-8 p-4 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-600 text-xs mb-1">Platform erisimi</p>
            <p className="text-gray-700 text-xs leading-relaxed">
              EPH a erisim yalnizca davet koduyla mumkundur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
