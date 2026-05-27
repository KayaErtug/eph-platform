"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { THEMES, useTheme } from "../../components/ThemeProvider";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  CircleUserRound,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Palette,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";

const DOC_TYPES = [
  { value: "VERGI_LEVHASI", label: "Vergi Levhası" },
  { value: "YETKI_BELGESI", label: "Yetki Belgesi" },
  { value: "TICARET_SICIL", label: "Ticaret Sicil" },
  { value: "KIMLIK", label: "Kimlik" },
  { value: "DIGER", label: "Diğer" },
];

const DOC_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "İncelemede", color: "#B45309", bg: "#FFFBEB" },
  APPROVED: { label: "Onaylandı", color: "#047857", bg: "#ECFDF5" },
  REJECTED: { label: "Reddedildi", color: "#BE123C", bg: "#FFF1F2" },
};

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
  DENETCI_ADMIN: "Denetçi Admin",
};

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImageUrl?: string | null;
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

interface TrustScore {
  score: number;
  badge: string;
  badgeColor: string;
  breakdown: {
    documentScore: number;
    seniorityScore: number;
    portfolioScore: number;
    activityScore: number;
    profileScore: number;
    approvalScore: number;
  };
  details: {
    approvedDocs: number;
    totalDocs: number;
    daysSinceJoined: number;
    unitCount: number;
    customerCount: number;
    activityCount: number;
    profileComplete: boolean;
  };
}

function getTip(score: number) {
  if (score < 20) return "Hesabınızı onaylayın ve belge yükleyerek skorunuzu artırın.";
  if (score < 40) return "Mesleki belgelerinizi yükleyin ve portföy ekleyerek skorunuzu güçlendirin.";
  if (score < 60) return "CRM’de müşteri takibi yaparak aktivite skorunuzu artırabilirsiniz.";
  if (score < 80) return "Harika! Daha fazla onaylı belge ile Elite Network seviyesine yaklaşabilirsiniz.";
  return "Tebrikler! Platformun en güvenilir üyeleri arasındasınız.";
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] || "E";
  const last = lastName?.trim()?.[0] || "P";
  return `${first}${last}`.toUpperCase();
}

export default function ProfilPage() {
  const { user, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("VERGI_LEVHASI");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchAll();
  }, [hydrated, user]);

  const fetchAll = async () => {
    try {
      const [profileRes, trustRes] = await Promise.all([
        api.get("/profile"),
        api.get("/trust/my"),
      ]);

      setProfile(profileRes.data);
      setTrustScore(trustRes.data);

      setForm({
        firstName: profileRes.data.firstName || "",
        lastName: profileRes.data.lastName || "",
        phone: profileRes.data.phone || "",
      });
    } catch (error) {
      console.error(error);
      alert("Profil bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const syncAuthUser = (nextProfile: Profile) => {
    const authStorage = localStorage.getItem("auth-storage");
    let token = "";

    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || "";
      } catch {
        token = "";
      }
    }

    if (user && token) {
      setAuth({ ...user, ...nextProfile }, token);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);

    try {
      const res = await api.patch("/profile", form);
      const nextProfile = profile ? { ...profile, ...res.data } : res.data;

      setProfile(nextProfile);
      syncAuthUser(nextProfile);

      setEditMode(false);
      setSaveSuccess(true);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Profil güncellenemedi.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setAvatarError("");
    setAvatarSuccess(false);

    if (!file) return;

    if (file.size > 1024 * 1024) {
      setAvatarError("Profil fotoğrafı 1 MB'den büyük olamaz. Lütfen daha küçük bir fotoğraf seçin.");

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Sadece JPG, PNG veya WEBP formatında fotoğraf yükleyebilirsin.");

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      return;
    }

    setAvatarLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const nextProfile = profile ? { ...profile, ...res.data } : res.data;

      setProfile(nextProfile);
      syncAuthUser(nextProfile);

      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: any) {
      setAvatarError(
        err?.response?.data?.message ||
          "Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setAvatarLoading(false);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

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

      await fetchAll();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Yükleme hatası.");
    } finally {
      setUploadLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
      </main>
    );
  }

  const initials = getInitials(profile?.firstName, profile?.lastName);
  const roleLabel = ROLE_LABELS[profile?.role || ""] || "EPH Üyesi";
  const documents = profile?.documents || [];

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#111827]">
      <section className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5">
        <header className="mb-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/dashboard")}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <CircleUserRound size={14} />
                Hesap Yönetimi
              </div>

              <h1 className="mt-3 text-[31px] font-black tracking-tight text-[#0B1F44]">
                Profilim
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Kişisel bilgilerini, profil fotoğrafını, belgelerini, güven skorunu ve görünüm tercihini buradan yönet.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
            >
              Çıkış
            </button>
          </div>
        </header>

        {saveSuccess && (
          <div className="mb-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            Profil başarıyla güncellendi.
          </div>
        )}

        {avatarSuccess && (
          <div className="mb-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            Profil fotoğrafı başarıyla güncellendi.
          </div>
        )}

        {avatarError && (
          <div className="mb-5 rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm font-black text-red-600">
            {avatarError}
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[.95fr_1.05fr]">
          <div className="space-y-5">
            <section className="rounded-[32px] border border-slate-200 bg-white p-5">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0B1F44] via-[#1D4ED8] to-[#60A5FA] text-white shadow-xl shadow-[#1D4ED8]/20">
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt="Profil fotoğrafı"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[30px] font-black">
                      {initials}
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[24px] font-black tracking-tight text-[#0B1F44]">
                    {profile?.firstName} {profile?.lastName}
                  </h2>

                  <p className="mt-1 truncate text-sm font-bold text-slate-500">
                    {profile?.email}
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <span className="rounded-full bg-[#EEF4FF] px-3 py-2 text-xs font-black text-[#1D4ED8]">
                      {roleLabel}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-black ${
                        profile?.isApproved
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {profile?.isApproved ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {profile?.isApproved ? "Onaylı" : "Onay Bekliyor"}
                    </span>
                  </div>

                  <div className="mt-4">
                    <label
                      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white transition ${
                        avatarLoading
                          ? "bg-slate-400"
                          : "bg-[#0B1F44] hover:bg-[#1D4ED8]"
                      }`}
                    >
                      <Camera size={18} />
                      {avatarLoading ? "Yükleniyor..." : "Profil Fotoğrafı Yükle"}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleAvatarUpload}
                        disabled={avatarLoading}
                        className="hidden"
                      />
                    </label>

                    <p className="mt-2 text-xs font-bold text-slate-400">
                      JPG, PNG veya WEBP. Maksimum dosya boyutu: 1 MB.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditMode((value) => !value)}
                className={`mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black ${
                  editMode
                    ? "border border-slate-200 bg-white text-slate-500"
                    : "bg-[#1D4ED8] text-white"
                }`}
              >
                {editMode ? "Vazgeç" : "Bilgileri Düzenle"}
              </button>
            </section>

            {trustScore && (
              <section className="overflow-hidden rounded-[32px] bg-[#0B1F44] text-white">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-blue-100">
                        <ShieldCheck size={14} />
                        Güven Skoru
                      </div>

                      <h2 className="mt-3 text-[24px] font-black tracking-tight">
                        {trustScore.badge}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-blue-100/70">
                        {getTip(trustScore.score)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[52px] font-black leading-none">
                        {trustScore.score}
                      </div>

                      <div className="text-xs font-black text-blue-100/50">
                        / 100
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#60A5FA]"
                      style={{ width: `${trustScore.score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3">
                  <TrustMini title="Belge" value={trustScore.breakdown.documentScore} max={25} />
                  <TrustMini title="Kıdem" value={trustScore.breakdown.seniorityScore} max={10} />
                  <TrustMini title="Portföy" value={trustScore.breakdown.portfolioScore} max={15} />
                  <TrustMini title="Aktivite" value={trustScore.breakdown.activityScore} max={10} />
                  <TrustMini title="Profil" value={trustScore.breakdown.profileScore} max={10} />
                  <TrustMini title="Onay" value={trustScore.breakdown.approvalScore} max={10} />
                </div>
              </section>
            )}
          </div>

          <div className="space-y-5">
            <section className="rounded-[32px] border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                    <BadgeCheck size={14} />
                    Profil Bilgileri
                  </div>

                  <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
                    Kişisel bilgiler
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Ad">
                  {editMode ? (
                    <input
                      className="premium-input"
                      value={form.firstName}
                      onChange={(event) =>
                        setForm({ ...form, firstName: event.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={profile?.firstName} />
                  )}
                </Field>

                <Field label="Soyad">
                  {editMode ? (
                    <input
                      className="premium-input"
                      value={form.lastName}
                      onChange={(event) =>
                        setForm({ ...form, lastName: event.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={profile?.lastName} />
                  )}
                </Field>

                <Field label="E-posta">
                  <ReadValue muted value={profile?.email} />
                </Field>

                <Field label="Telefon">
                  {editMode ? (
                    <input
                      className="premium-input"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={profile?.phone} />
                  )}
                </Field>
              </div>

              {editMode && (
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#1D4ED8] text-sm font-black text-white disabled:opacity-50"
                >
                  {saveLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              )}
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-5">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                  <UploadCloud size={14} />
                  Belge Yükleme
                </div>

                <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
                  Mesleki belgeler
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  PDF, JPG veya PNG yükleyebilirsin.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  className="premium-input"
                  value={selectedDocType}
                  onChange={(event) => setSelectedDocType(event.target.value)}
                >
                  {DOC_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <label
                  className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0B1F44] px-5 text-sm font-black text-white ${
                    uploadLoading ? "opacity-50" : ""
                  }`}
                >
                  <UploadCloud size={18} />
                  {uploadLoading ? "Yükleniyor..." : "Dosya Seç"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUpload}
                    disabled={uploadLoading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadSuccess && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  Belge başarıyla yüklendi.
                </div>
              )}

              {uploadError && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-black text-red-600">
                  {uploadError}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="mt-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
              <Palette size={14} />
              Görünüm Teması
            </div>

            <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
              Tema seçimi
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Platform görünümünü çalışma tarzına göre kişiselleştir.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {THEMES.map((item) => {
              const active = theme === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  className={`rounded-[24px] border p-4 text-center transition ${
                    active
                      ? "border-[#1D4ED8] bg-[#EEF4FF] text-[#1D4ED8]"
                      : "border-slate-200 bg-[#F8FAFC] text-slate-600"
                  }`}
                >
                  <div className="text-[28px]">{item.icon}</div>
                  <div className="mt-2 text-xs font-black">{item.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
              <FileText size={14} />
              Belgelerim
            </div>

            <h2 className="mt-3 text-[24px] font-black tracking-tight text-[#0B1F44]">
              Yüklenen belgeler
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEF4FF] text-[#1D4ED8]">
                <FileText size={30} />
              </div>

              <h3 className="text-[18px] font-black text-[#0B1F44]">
                Henüz belge yüklenmedi
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Onay sürecini hızlandırmak için belgelerini yükleyebilirsin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const status = DOC_STATUS[doc.status] || DOC_STATUS.PENDING;

                return (
                  <article
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1D4ED8]">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-[#0B1F44]">
                          {DOC_TYPES.find((type) => type.value === doc.type)?.label ||
                            doc.type}
                        </h3>

                        <p className="mt-1 truncate text-xs font-bold text-slate-400">
                          {doc.fileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-3 py-2 text-xs font-black"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>

                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
                      >
                        Görüntüle
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem href="/stok" icon={<Building2 size={21} />} label="İlanlar" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Network" />
          <BottomItem href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem href="/market" icon={<WalletCards size={21} />} label="Piyasa" />
          <BottomItem active href="/profil" icon={<CircleUserRound size={21} />} label="Profil" />
        </div>
      </nav>

      <style jsx global>{`
        .premium-input {
          width: 100%;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
        }

        .premium-input:focus {
          border-color: #1d4ed8;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.08);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadValue({
  value,
  muted,
}: {
  value?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex min-h-12 items-center rounded-[18px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-black ${
        muted ? "text-slate-400" : "text-[#0B1F44]"
      }`}
    >
      {value || "—"}
    </div>
  );
}

function TrustMini({
  title,
  value,
  max,
}: {
  title: string;
  value: number;
  max: number;
}) {
  return (
    <div className="bg-white/5 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-blue-100/50">
        {title}
      </p>

      <p className="mt-2 text-[22px] font-black text-white">
        {value}
        <span className="text-xs text-blue-100/40">/{max}</span>
      </p>
    </div>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? "text-[#1D4ED8]" : "text-slate-500"
      }`}
    >
      {icon}

      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
