"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronRight,
  Crown,
  Edit3,
  Headphones,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | string;

type SafeUser = {
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  packageType?: string;
  plan?: string;
  membershipType?: string;
  referralCode?: string;
  referenceCode?: string;
  companyName?: string;
  officeName?: string;
  title?: string;
  memberCode?: string;
  profileImageUrl?: string;
  city?: string;
  district?: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
};

type PresenceStatus = "online" | "away" | "offline";

type PresenceUser = {
  id: string;
  status: PresenceStatus;
  lastPage?: string | null;
  minutesAgo?: number | null;
};

type PresenceResponse = {
  currentUser?: PresenceUser | null;
  online: PresenceUser[];
  away: PresenceUser[];
  offline: PresenceUser[];
};

const roleTheme = {
  SUPER_ADMIN: {
    label: "Yazılım Ekibi",
    color: "#14B8A6",
    bg: "#ECFEFF",
    badge: "Kurucu Erişimi",
  },
  ADMIN: {
    label: "Admin",
    color: "#334155",
    bg: "#F1F5F9",
    badge: "Yönetim Profili",
  },
  EMLAKCI: {
    label: "Gayrimenkul Danışmanı",
    color: "#1557D6",
    bg: "#EFF6FF",
    badge: "EPH Üyesi",
  },
  MUTEAHHIT: {
    label: "Müteahhit",
    color: "#EA580C",
    bg: "#FFF7ED",
    badge: "Proje Profili",
  },
  INSAAT_FIRMASI: {
    label: "İnşaat Firması",
    color: "#B45309",
    bg: "#FFFBEB",
    badge: "Kurumsal Profil",
  },
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getTheme(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return roleTheme.SUPER_ADMIN;
  if (normalizedRole === "ADMIN") return roleTheme.ADMIN;

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return roleTheme.MUTEAHHIT;
  }

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return roleTheme.INSAAT_FIRMASI;
  }

  return roleTheme.EMLAKCI;
}

function isSuperAdmin(role?: string | null) {
  return normalizeRole(role) === "SUPER_ADMIN";
}

function presenceLabel(status?: PresenceStatus) {
  if (status === "online") return "Online";
  if (status === "away") return "Uzakta";
  return "Çevrimdışı";
}

function presenceDotClass(status?: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-400";
  return "bg-slate-400";
}

function shortUserId(value?: string) {
  if (!value) return "EPH-0000";
  return `EPH-${value.slice(0, 4).toUpperCase()}`;
}

function getProfileImageUrl(value?: string) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return value;
}

export default function ProfilPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [presence, setPresence] = useState<PresenceResponse>({
    currentUser: null,
    online: [],
    away: [],
    offline: [],
  });
  const [profile, setProfile] = useState<SafeUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        if (res.data) setProfile(res.data);
      } catch {
        setProfile(user as SafeUser);
      }
    };

    fetchProfile();
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    const fetchPresence = async () => {
      try {
        const res = await api.get("/visits/presence");

        setPresence({
          currentUser: res.data?.currentUser || null,
          online: Array.isArray(res.data?.online) ? res.data.online : [],
          away: Array.isArray(res.data?.away) ? res.data.away : [],
          offline: Array.isArray(res.data?.offline) ? res.data.offline : [],
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchPresence();

    const interval = setInterval(fetchPresence, 30000);

    return () => clearInterval(interval);
  }, [hydrated, user]);

  const safeUser = (profile || user) as SafeUser | null;
  const userRole = normalizeRole(safeUser?.role || "EMLAKCI");
  const theme = getTheme(userRole);
  const superAdmin = isSuperAdmin(userRole);

  const displayName = useMemo(() => {
    const fullNameFromParts = `${safeUser?.firstName || ""} ${
      safeUser?.lastName || ""
    }`.trim();

    return (
      safeUser?.fullName ||
      safeUser?.name ||
      fullNameFromParts ||
      safeUser?.companyName ||
      safeUser?.officeName ||
      "EPH Kullanıcısı"
    );
  }, [safeUser]);

  const initials = useMemo(() => {
    return (
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "EPH"
    );
  }, [displayName]);

  const packageName =
    safeUser?.packageType ||
    safeUser?.plan ||
    safeUser?.membershipType ||
    (superAdmin ? "Kurucu Erişimi" : "Standart");

  const referralCode =
    safeUser?.referralCode || safeUser?.referenceCode || "Henüz tanımlı değil";

  const currentPresence =
    presence.currentUser ||
    [...presence.online, ...presence.away, ...presence.offline].find(
      (item) => item.id === safeUser?.id,
    ) ||
    null;

  const currentPresenceStatus = currentPresence?.status || "offline";
  const profileImageUrl = getProfileImageUrl(safeUser?.profileImageUrl);
  const locationText = [safeUser?.district, safeUser?.city]
    .filter(Boolean)
    .join(" / ");

  const openEditModal = () => {
    setForm({
      firstName: safeUser?.firstName || "",
      lastName: safeUser?.lastName || "",
      phone: safeUser?.phone || "",
      city: safeUser?.city || "",
      district: safeUser?.district || "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setFormError("");
    setFormSuccess("");
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (saveLoading) return;
    setEditOpen(false);
    setAvatarFile(null);
    setAvatarPreview("");
    setFormError("");
    setFormSuccess("");
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setFormError("Profil fotoğrafı JPG, PNG veya WEBP olmalıdır.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setFormError("Profil fotoğrafı en fazla 1 MB olabilir.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setFormError("");
  };

  const handleSaveProfile = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      setFormError("Ad ve soyad zorunludur.");
      return;
    }

    try {
      setSaveLoading(true);
      setFormError("");
      setFormSuccess("");

      let nextProfile = await api.patch("/profile", {
        firstName,
        lastName,
        phone: form.phone.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
      });

      if (avatarFile) {
        const payload = new FormData();
        payload.append("file", avatarFile);
        nextProfile = await api.post("/profile/avatar", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setProfile(nextProfile.data);
      setFormSuccess("Profil bilgileri güncellendi.");

      setTimeout(() => {
        setEditOpen(false);
        setAvatarFile(null);
        setAvatarPreview("");
        setFormSuccess("");
      }, 700);
    } catch (error: any) {
      setFormError(
        error?.response?.data?.message ||
          "Profil güncellenemedi. Lütfen bilgileri kontrol ediniz.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (!hydrated || !safeUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-24 text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Dashboard'a dön"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-base font-black">Profil</h1>
            <p className="text-[11px] font-bold text-[#64748B]">
              Hesap ve erişim merkezi
            </p>
          </div>

          <Link
            href="/notification-settings"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Bildirim ayarları"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#1557D6]" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-5">
        <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="relative mx-auto h-24 w-24">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-sm"
                style={{ backgroundColor: theme.color }}
              >
                {superAdmin ? <Crown size={42} /> : initials}
              </div>
            )}

            <span
              className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white ${presenceDotClass(
                currentPresenceStatus,
              )}`}
            />
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight">
            {displayName}
          </h2>

          <p className="mt-1 text-sm font-bold text-[#64748B]">
            {safeUser.email || "E-posta bilgisi yok"}
          </p>

          {locationText && (
            <p className="mt-1 text-xs font-black text-[#1557D6]">
              {locationText}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Pill text={theme.label} color={theme.color} bg={theme.bg} />
            <Pill text={packageName} color="#1557D6" bg="#EFF6FF" />
            <Pill
              text={presenceLabel(currentPresenceStatus)}
              color={
                currentPresenceStatus === "online"
                  ? "#059669"
                  : currentPresenceStatus === "away"
                    ? "#D97706"
                    : "#64748B"
              }
              bg={
                currentPresenceStatus === "online"
                  ? "#ECFDF5"
                  : currentPresenceStatus === "away"
                    ? "#FFFBEB"
                    : "#F8FAFC"
              }
            />
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(21,87,214,0.22)]"
          >
            <Edit3 size={16} />
            Profili Düzenle
          </button>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat
            label="Üye No"
            value={safeUser.memberCode || shortUserId(safeUser.id)}
          />
          <MiniStat label="Paket" value={packageName} />
        </section>

        <MenuGroup>
          <MenuItem
            href="/profil"
            icon={<UserRound size={18} />}
            title="Hesap Bilgileri"
            value={safeUser.phone || "Telefon eklenmedi"}
            color={theme.color}
          />
          <MenuItem
            href="/notification-settings"
            icon={<Bell size={18} />}
            title="Bildirim Ayarları"
            value="Ses ve uyarılar"
            color="#EA580C"
          />
          <MenuItem
            href="/ucretlendirme"
            icon={<WalletCards size={18} />}
            title="Üyelik ve Paket"
            value={packageName}
            color="#1557D6"
          />
          <MenuItem
            href="/lina"
            icon={<WandSparkles size={18} />}
            title="Lina Asistan"
            value="Akıllı iş desteği"
            color="#7C3AED"
          />
        </MenuGroup>

        <MenuGroup>
          <MenuItem
            href="/stok"
            icon={<Building2 size={18} />}
            title="Portföyüm"
            value="İlan ve stok yönetimi"
            color="#1557D6"
          />
          <MenuItem
            href="/crm"
            icon={<Users size={18} />}
            title="CRM"
            value="Müşteri ve görev takibi"
            color="#0F766E"
          />
          <MenuItem
            href="/messages"
            icon={<MessageCircle size={18} />}
            title="Mesajlar"
            value="Görüşme merkezi"
            color="#7C3AED"
          />
          <MenuItem
            href="/network"
            icon={<BriefcaseBusiness size={18} />}
            title="Forum / Havuz"
            value="Talep ve iş birliği"
            color="#EA580C"
          />
        </MenuGroup>

        <MenuGroup>
          <InfoLine
            icon={<Mail size={18} />}
            title="E-posta"
            value={safeUser.email || "Bilgi yok"}
            color={theme.color}
          />
          <InfoLine
            icon={<Phone size={18} />}
            title="Cep Telefonu"
            value={safeUser.phone || "Bilgi yok"}
            color={theme.color}
          />
          <InfoLine
            icon={<MapPin size={18} />}
            title="İl / İlçe"
            value={locationText || "Bilgi yok"}
            color={theme.color}
          />
          <InfoLine
            icon={<KeyRound size={18} />}
            title="Referans Kodu"
            value={referralCode}
            color={theme.color}
          />
          <InfoLine
            icon={<ShieldCheck size={18} />}
            title="Hesap Durumu"
            value={theme.badge}
            color="#0F766E"
          />
        </MenuGroup>

        {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
          <MenuGroup>
            <MenuItem
              href="/admin"
              icon={<Settings size={18} />}
              title="Yönetim Merkezi"
              value="Kullanıcı ve sistem yönetimi"
              color={superAdmin ? "#14B8A6" : "#334155"}
            />
            <MenuItem
              href="/admin/referrals"
              icon={<Sparkles size={18} />}
              title="Referans Kodları"
              value="Davet ve erişim yönetimi"
              color="#1557D6"
            />
          </MenuGroup>
        )}

        <MenuGroup>
          <MenuItem
            href="/help-center"
            icon={<Headphones size={18} />}
            title="Yardım Merkezi"
            value="Destek ve sık sorulanlar"
            color="#1557D6"
          />
          <button
            onClick={() => {
              logout();
              router.push("/giris");
            }}
            className="flex w-full items-center gap-3 rounded-3xl bg-red-50 px-4 py-4 text-left transition hover:bg-red-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
              <LogOut size={18} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-red-600">
                Güvenli Çıkış Yap
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-red-400">
                Oturumu kapat
              </span>
            </span>

            <ChevronRight size={18} className="text-red-300" />
          </button>
        </MenuGroup>
      </section>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06194A]/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
          <section className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#06194A]">
                  Profili Düzenle
                </h2>
                <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
                  Ad, telefon, konum ve profil fotoğrafını güncelle.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#06194A]"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="mt-4 rounded-[24px] border border-[#DDE7F3] bg-[#F8FAFC] p-3 text-center">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-[#1557D6] text-white">
                {avatarPreview || profileImageUrl ? (
                  <img
                    src={avatarPreview || profileImageUrl}
                    alt="Profil fotoğrafı"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-3 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[15px] bg-white px-4 text-[12px] font-black text-[#1557D6] shadow-sm"
              >
                <Upload size={15} />
                Fotoğraf Seç
              </button>
              <p className="mt-2 text-[10px] font-bold text-[#64748B]">
                JPG, PNG veya WEBP · Maksimum 1 MB
              </p>
            </div>

            {formError && (
              <div className="mt-3 rounded-[16px] border border-red-100 bg-red-50 px-3 py-2 text-center text-[12px] font-black text-red-600">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mt-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-[12px] font-black text-emerald-700">
                {formSuccess}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <ProfileInput
                label="Ad"
                value={form.firstName}
                onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
              />
              <ProfileInput
                label="Soyad"
                value={form.lastName}
                onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
              />
              <ProfileInput
                label="Cep Telefonu"
                value={form.phone}
                onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              />
              <ProfileInput
                label="İl"
                value={form.city}
                onChange={(value) => setForm((current) => ({ ...current, city: value }))}
              />
              <ProfileInput
                label="İlçe"
                value={form.district}
                onChange={(value) => setForm((current) => ({ ...current, district: value }))}
              />
            </div>

            <section className="mt-4 rounded-[22px] border border-[#DDE7F3] bg-[#F8FAFC] p-3">
              <h3 className="text-center text-[13px] font-black text-[#06194A]">
                Değiştirilemeyen Alanlar
              </h3>
              <div className="mt-3 grid gap-2">
                <LockedLine label="E-posta" value={safeUser.email || "Bilgi yok"} />
                <LockedLine label="Üye No" value={safeUser.memberCode || shortUserId(safeUser.id)} />
                <LockedLine label="Rol" value={theme.label} />
                <LockedLine label="Referans Kodu" value={referralCode} />
              </div>
            </section>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saveLoading}
                className="min-h-[46px] rounded-[18px] border border-[#DDE7F3] bg-white text-[13px] font-black text-[#475569] disabled:opacity-60"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saveLoading}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] text-[13px] font-black text-white shadow-[0_12px_26px_rgba(21,87,214,0.24)] disabled:opacity-60"
              >
                {saveLoading ? (
                  "Kaydediliyor..."
                ) : (
                  <>
                    <Save size={16} />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex min-h-8 items-center justify-center rounded-full px-3 text-xs font-black"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-[#06194A]">
        {value}
      </div>
    </div>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function MenuItem({
  href,
  icon,
  title,
  value,
  color,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>

      <ChevronRight size={18} className="text-[#94A3B8]" />
    </Link>
  );
}

function InfoLine({
  icon,
  title,
  value,
  color,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block break-words text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-[#64748B]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[18px] border border-[#DDE7F3] bg-[#F8FAFC] px-3 text-[14px] font-black text-[#06194A] outline-none focus:border-[#1557D6]"
      />
    </label>
  );
}

function LockedLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-0.5 break-words text-[12px] font-black text-[#06194A]">
        {value}
      </p>
    </div>
  );
}
