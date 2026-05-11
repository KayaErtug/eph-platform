"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  EMLAKCI: "bg-blue-950 text-blue-300 border-blue-800",
  MUTEAHHIT: "bg-green-950 text-green-300 border-green-800",
  INSAAT_FIRMASI: "bg-orange-950 text-orange-300 border-orange-800",
  ADMIN: "bg-purple-950 text-purple-300 border-purple-800",
};

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !user) router.push("/giris");
  }, [hydrated, user]);

  if (!hydrated || !user) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-semibold">EPH</span>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-800">Ana Sayfa</Link>
            <Link href="/profil" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Profilim</Link>
            <Link href="/stok" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Stok</Link>
            {user.role === "ADMIN" && (
              <Link href="/admin" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Admin</Link>
            )}
          </nav>

          <button onClick={() => { logout(); router.push("/giris"); }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-4 py-2 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Çıkış
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Karşılama */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-1">Hoş geldin, {user.firstName}!</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs border rounded-full px-3 py-1 font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              {user.isApproved
                ? <span className="flex items-center gap-1.5 text-green-400 text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Hesap onaylı
                  </span>
                : <span className="flex items-center gap-1.5 text-yellow-400 text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Admin onayı bekleniyor
                  </span>
              }
            </div>
          </div>
        </div>

        {/* Onay uyarısı */}
        {!user.isApproved && (
          <div className="bg-yellow-950 border border-yellow-900 rounded-xl px-5 py-4 mb-8 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <p className="text-yellow-300 text-sm font-medium">Hesabınız onay bekliyor</p>
              <p className="text-yellow-700 text-xs mt-0.5">Profilinize giderek belgelerinizi yükleyin ve admin onayını hızlandırın.</p>
            </div>
          </div>
        )}

        {/* Hızlı erişim kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link href="/profil" className="bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl p-6 transition-all group">
            <div className="w-10 h-10 bg-blue-950 border border-blue-900 rounded-xl flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="text-white font-medium mb-1 group-hover:text-blue-400 transition-colors">Profilim</h3>
            <p className="text-gray-500 text-sm">Bilgilerini güncelle, belge yükle</p>
          </Link>

          <Link href="/stok" className="bg-gray-900 border border-gray-800 hover:border-green-700 rounded-2xl p-6 transition-all group">
            <div className="w-10 h-10 bg-green-950 border border-green-900 rounded-xl flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3 className="text-white font-medium mb-1 group-hover:text-green-400 transition-colors">Stok Yönetimi</h3>
            <p className="text-gray-500 text-sm">Proje ve daire yönetimi</p>
          </Link>

          {user.role === "ADMIN" ? (
            <Link href="/admin" className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-2xl p-6 transition-all group">
              <div className="w-10 h-10 bg-purple-950 border border-purple-900 rounded-xl flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              </div>
              <h3 className="text-white font-medium mb-1 group-hover:text-purple-400 transition-colors">Admin Paneli</h3>
              <p className="text-gray-500 text-sm">Üye ve belge yönetimi</p>
            </Link>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 opacity-40">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="text-white font-medium mb-1">CRM Modülü</h3>
              <p className="text-gray-500 text-sm">Yakında geliyor...</p>
            </div>
          )}
        </div>

        {/* Alt bilgi */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-gray-700 text-xs text-center">EPH — Emlak Portföy Havuzu © 2026</p>
        </div>
      </div>
    </div>
  );
}