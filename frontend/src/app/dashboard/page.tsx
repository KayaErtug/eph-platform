"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

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

const NOM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  INVITED: "Davet Gönderildi",
  REGISTERED: "Platforma Katıldı 🎉",
};

const NOM_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400",
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
  INVITED: "text-blue-400",
  REGISTERED: "text-purple-400",
};

interface Nomination {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateRole: string;
  note?: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [showNomForm, setShowNomForm] = useState(false);
  const [nomLoading, setNomLoading] = useState(false);
  const [nomSuccess, setNomSuccess] = useState(false);
  const [nomError, setNomError] = useState("");
  const [nomForm, setNomForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    candidateRole: "EMLAKCI",
    note: "",
  });

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !user) router.push("/giris");
    if (hydrated && user?.isApproved) fetchMyNominations();
  }, [hydrated, user]);

  const fetchMyNominations = async () => {
    try {
      const r = await api.get("/nominations/my");
      setNominations(r.data);
    } catch {}
  };

  const handleNomSubmit = async () => {
    if (!nomForm.candidateName || !nomForm.candidateEmail || !nomForm.candidatePhone) {
      setNomError("Ad, email ve telefon zorunludur.");
      return;
    }
    setNomLoading(true);
    setNomError("");
    try {
      await api.post("/nominations", nomForm);
      setNomSuccess(true);
      setNomForm({ candidateName: "", candidateEmail: "", candidatePhone: "", candidateRole: "EMLAKCI", note: "" });
      setShowNomForm(false);
      await fetchMyNominations();
      setTimeout(() => setNomSuccess(false), 4000);
    } catch (e: any) {
      setNomError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setNomLoading(false);
    }
  };

  if (!hydrated || !user) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  const remainingQuota = 10 - nominations.length;

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

        {/* TAVSİYE ET BÖLÜMÜ — Sadece onaylı üyeler */}
        {user.isApproved && user.role !== "ADMIN" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-950 border border-indigo-900 rounded-xl flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <h2 className="text-white font-medium">Tanıdık Öner</h2>
                  <p className="text-gray-500 text-xs">Platforma değer katacak profesyonelleri tavsiye edin</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-indigo-300 text-sm font-semibold">{remainingQuota}/10</p>
                  <p className="text-gray-600 text-xs">kalan hak</p>
                </div>
                {remainingQuota > 0 && (
                  <button onClick={() => { setShowNomForm(v => !v); setNomError(""); setNomSuccess(false); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tavsiye Et
                  </button>
                )}
              </div>
            </div>

            {/* Başarı mesajı */}
            {nomSuccess && (
              <div className="bg-green-950 border border-green-900 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <p className="text-green-400 text-sm">Tavsiyeniz iletildi! Admin inceleyecek.</p>
              </div>
            )}

            {/* Tavsiye formu */}
            {showNomForm && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-5">
                <h3 className="text-white text-sm font-medium mb-4">Yeni Tavsiye</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Ad Soyad *</label>
                    <input placeholder="Ahmet Yılmaz" value={nomForm.candidateName}
                      onChange={e => setNomForm(f => ({ ...f, candidateName: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Email *</label>
                    <input placeholder="ahmet@example.com" value={nomForm.candidateEmail}
                      onChange={e => setNomForm(f => ({ ...f, candidateEmail: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Telefon *</label>
                    <input placeholder="+90 555 000 00 00" value={nomForm.candidatePhone}
                      onChange={e => setNomForm(f => ({ ...f, candidatePhone: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Rol</label>
                    <select value={nomForm.candidateRole}
                      onChange={e => setNomForm(f => ({ ...f, candidateRole: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
                      <option value="EMLAKCI">Emlakçı</option>
                      <option value="MUTEAHHIT">Müteahhit</option>
                      <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs mb-1 block">Neden öneriyorsunuz? (isteğe bağlı)</label>
                  <textarea placeholder="Bu kişiyi tanıyorum, sektörde deneyimli bir profesyonel..." value={nomForm.note}
                    onChange={e => setNomForm(f => ({ ...f, note: e.target.value }))} rows={2}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
                </div>
                {nomError && <p className="text-red-400 text-xs mb-3">{nomError}</p>}
                <div className="flex gap-3">
                  <button onClick={handleNomSubmit} disabled={nomLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium">
                    {nomLoading ? "Gönderiliyor..." : "Tavsiyeyi Gönder"}
                  </button>
                  <button onClick={() => { setShowNomForm(false); setNomError(""); }}
                    className="text-gray-400 border border-gray-700 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* Tavsiye listesi */}
            {nominations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Henüz tavsiyeniz yok.</p>
                <p className="text-gray-700 text-xs mt-1">Platforma değer katacak profesyonelleri önerin!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nominations.map((nom) => (
                  <div key={nom.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-900 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300 flex-shrink-0">
                        {nom.candidateName[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{nom.candidateName}</p>
                        <p className="text-gray-500 text-xs">{nom.candidateEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${NOM_STATUS_COLORS[nom.status]}`}>
                        {NOM_STATUS_LABELS[nom.status]}
                      </span>
                      <span className="text-gray-700 text-xs">{new Date(nom.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alt bilgi */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-gray-700 text-xs text-center">EPH — Emlak Portföy Havuzu © 2026</p>
        </div>
      </div>
    </div>
  );
}