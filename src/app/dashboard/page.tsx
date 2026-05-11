"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakci",
  MUTEAHHIT: "Muteahhit",
  INSAAT_FIRMASI: "Insaat Firmasi",
  ADMIN: "Admin",
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
      <p className="text-gray-400">Yukleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">SM Platform</h1>
        <button onClick={() => { logout(); router.push("/giris"); }}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
          Cikis
        </button>
      </div>

      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-1">
          <Link href="/dashboard" className="px-4 py-3 text-sm font-medium text-white border-b-2 border-blue-500">Ana Sayfa</Link>
          <Link href="/profil" className="px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors">Profilim</Link>
          <Link href="/stok" className="px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors">Stok</Link>
          {user.role === "ADMIN" && (
            <Link href="/admin" className="px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors">Admin Paneli</Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Hos geldin, {user.firstName}!</h2>
              <p className="text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800 rounded-full px-3 py-0.5">
                  {ROLE_LABELS[user.role]}
                </span>
                {user.isApproved
                  ? <span className="text-xs text-green-400">Hesap onaylandi</span>
                  : <span className="text-xs text-yellow-400">Admin onayi bekleniyor</span>
                }
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/profil" className="bg-gray-900 border border-gray-800 hover:border-blue-800 rounded-2xl p-6 transition-colors group">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-semibold group-hover:text-blue-400 transition-colors">Profilim</h3>
            <p className="text-gray-400 text-sm mt-1">Bilgilerini guncelle, belge yukle</p>
          </Link>

          <Link href="/stok" className="bg-gray-900 border border-gray-800 hover:border-green-800 rounded-2xl p-6 transition-colors group">
            <div className="text-3xl mb-3">🏢</div>
            <h3 className="font-semibold group-hover:text-green-400 transition-colors">Stok Yonetimi</h3>
            <p className="text-gray-400 text-sm mt-1">Proje ve daire yonetimi</p>
          </Link>

          {user.role === "ADMIN" && (
            <Link href="/admin" className="bg-gray-900 border border-gray-800 hover:border-purple-800 rounded-2xl p-6 transition-colors group">
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="font-semibold group-hover:text-purple-400 transition-colors">Admin Paneli</h3>
              <p className="text-gray-400 text-sm mt-1">Uye ve belge yonetimi</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}