"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

const DOC_TYPES = [
  { value: "VERGI_LEVHASI", label: "Vergi Levhası" },
  { value: "YETKI_BELGESI", label: "Yetki Belgesi" },
  { value: "TICARET_SICIL", label: "Ticaret Sicil" },
  { value: "KIMLIK", label: "Kimlik" },
  { value: "DIGER", label: "Diğer" },
];

const DOC_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-950 text-yellow-300 border-yellow-800",
  APPROVED: "bg-green-950 text-green-300 border-green-800",
  REJECTED: "bg-red-950 text-red-300 border-red-800",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  PENDING: "İncelemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

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

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isApproved: boolean;
  documents: {
    id: string;
    type: string;
    status: string;
    fileUrl: string;
    fileName: string;
    createdAt: string;
  }[];
}

export default function ProfilPage() {
  const { user, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("VERGI_LEVHASI");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchProfile();
  }, [hydrated, user]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
      setForm({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone });
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const res = await api.patch("/profile", form);
      setProfile((prev) => prev ? { ...prev, ...res.data } : prev);
      setAuth({ ...user!, ...res.data }, localStorage.getItem("token")!);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally { setSaveLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess(false);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selectedDocType);
    try {
      await api.post("/profile/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      fetchProfile();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || "Yükleme hatası.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!hydrated || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-semibold">EPH</span>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Ana Sayfa</Link>
            <Link href="/profil" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-800">Profilim</Link>
            <Link href="/stok" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Stok</Link>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Admin</Link>
            )}
          </nav>

          <button onClick={() => { logout(); router.push("/giris"); }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Çıkış
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-white mb-1">Profilim</h1>
          <p className="text-gray-500 text-sm">Hesap bilgilerinizi yönetin</p>
        </div>

        {/* Profil Kartı */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-xl font-semibold">
                {profile?.firstName[0]}{profile?.lastName[0]}
              </div>
              <div>
                <h2 className="text-white font-semibold">{profile?.firstName} {profile?.lastName}</h2>
                <p className="text-gray-500 text-sm">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 ${ROLE_COLORS[profile?.role || ""]}`}>
                    {ROLE_LABELS[profile?.role || ""]}
                  </span>
                  {profile?.isApproved ? (
                    <span className="flex items-center gap-1 text-green-400 text-xs">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Onaylandı
                    </span>
                  ) : (
                    <span className="text-yellow-500 text-xs">Onay bekliyor</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setEditMode(!editMode)}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${editMode ? "border-gray-700 text-gray-400 hover:text-white" : "border-blue-800 text-blue-400 hover:text-blue-300"}`}>
              {editMode ? "Vazgeç" : "Düzenle"}
            </button>
          </div>

          {saveSuccess && (
            <div className="bg-green-950 border border-green-900 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <p className="text-green-400 text-sm">Profil başarıyla güncellendi.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">Ad</label>
              {editMode ? (
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              ) : (
                <p className="bg-gray-800 rounded-xl px-4 py-3 text-white text-sm">{profile?.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">Soyad</label>
              {editMode ? (
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              ) : (
                <p className="bg-gray-800 rounded-xl px-4 py-3 text-white text-sm">{profile?.lastName}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">Email</label>
              <p className="bg-gray-800 rounded-xl px-4 py-3 text-gray-500 text-sm">{profile?.email}</p>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">Telefon</label>
              {editMode ? (
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              ) : (
                <p className="bg-gray-800 rounded-xl px-4 py-3 text-white text-sm">{profile?.phone}</p>
              )}
            </div>
          </div>

          {editMode && (
            <button onClick={handleSave} disabled={saveLoading}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors text-sm">
              {saveLoading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          )}
        </div>

        {/* Belge Yükleme */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-1">Belge Yükle</h3>
          <p className="text-gray-500 text-xs mb-4">PDF, JPG veya PNG · Maks 50MB</p>

          <div className="flex gap-3">
            <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium cursor-pointer transition-colors text-sm ${uploadLoading ? "bg-gray-700 text-gray-500" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {uploadLoading ? "Yükleniyor..." : "Dosya Seç"}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploadLoading} className="hidden" />
            </label>
          </div>

          {uploadSuccess && (
            <div className="bg-green-950 border border-green-900 rounded-xl px-4 py-3 mt-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <p className="text-green-400 text-sm">Belge başarıyla yüklendi.</p>
            </div>
          )}
          {uploadError && (
            <div className="bg-red-950 border border-red-900 rounded-xl px-4 py-3 mt-3">
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          )}
        </div>

        {/* Belgelerim */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-4">Belgelerim</h3>
          {!profile?.documents || profile.documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-gray-600 text-sm">Henüz belge yüklenmedi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{DOC_TYPES.find((t) => t.value === doc.type)?.label}</p>
                      <p className="text-gray-500 text-xs">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
                      {DOC_STATUS_LABELS[doc.status]}
                    </span>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Görüntüle
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}