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
  BadgeCheck,
  Bell,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  HelpCircle,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MODERATOR"
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | "TAKIM_LIDERI"
  | "OFIS_SAHIBI"
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
  title?: string;
  companyName?: string;
  officeName?: string;
  teamName?: string;
  memberCode?: string;
  packageType?: string;
  plan?: string;
  membershipType?: string;
  profileImageUrl?: string;
  city?: string;
  district?: string;
  kontorCuzdani?: {
    bakiye?: number;
    toplamYukleme?: number;
    toplamHarcama?: number;
    toplamHediye?: number;
  } | null;
  currentMembership?: {
    baslangicTarihi?: string;
    bitisTarihi?: string | null;
    paket?: {
      paketKodu?: string;
      paketAdi?: string;
      aktifPortfoyLimiti?: number;
      verilenKontor?: number;
    } | null;
  } | null;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  phoneLocal: string;
  city: string;
  district: string;
};

type GeoOption = {
  id: string;
  name: string;
};

type DetailPanel = "membership" | "organization" | null;

const TURKIYE_API_BASE_URL = "https://api.turkiyeapi.dev/v1";
const KKTC_PROVINCE_NAME = "K.K.T.C.";
const ABROAD_NAME = "YURTDIŞI";

const TURKIYE_PROVINCES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Ankara",
  "Antalya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Isparta",
  "Mersin",
  "İstanbul",
  "İzmir",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Kahramanmaraş",
  "Mardin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Şanlıurfa",
  "Uşak",
  "Van",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
];

const KKTC_DISTRICTS: GeoOption[] = [
  { id: "Lefkoşa", name: "Lefkoşa" },
  { id: "Girne", name: "Girne" },
  { id: "Gazimağusa", name: "Gazimağusa" },
  { id: "İskele", name: "İskele" },
  { id: "Güzelyurt", name: "Güzelyurt" },
  { id: "Lefke", name: "Lefke" },
];

const FALLBACK_PROVINCE_OPTIONS: GeoOption[] = [
  { id: ABROAD_NAME, name: ABROAD_NAME },
  { id: "KKTC", name: KKTC_PROVINCE_NAME },
  ...TURKIYE_PROVINCES.map((city) => ({ id: city, name: city })),
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Yazılım Ekibi",
  ADMIN: "Yönetici",
  MODERATOR: "Moderatör",
  EMLAKCI: "Gayrimenkul Danışmanı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  TAKIM_LIDERI: "Takım Lideri",
  OFIS_SAHIBI: "Ofis Sahibi",
};

function normalizeRole(role?: string | null) {
  return String(role || "EMLAKCI")
    .trim()
    .toUpperCase()
    .replaceAll("İ", "I")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("Ğ", "G")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

function getRoleLabel(role?: string | null) {
  return ROLE_LABELS[normalizeRole(role)] || "EPH Üyesi";
}

function getDisplayName(user?: SafeUser | null) {
  const fromParts = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    user?.fullName ||
    user?.name ||
    fromParts ||
    user?.companyName ||
    user?.officeName ||
    "EPH Kullanıcısı"
  );
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "EPH"
  );
}

function shortUserId(value?: string, memberCode?: string) {
  if (memberCode) return memberCode;
  if (!value) return "EPH-0000";
  return `EPH-${value.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhoneLocal(value?: string) {
  let digits = onlyDigits(value || "");

  if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);

  return digits.slice(0, 10);
}

function formatPhoneLocal(value?: string) {
  const digits = normalizePhoneLocal(value);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);

  return parts.join(" ");
}

function formatPhoneDisplay(value?: string) {
  const local = normalizePhoneLocal(value);
  return local ? `+90 ${formatPhoneLocal(local)}` : "Telefon bilgisi yok";
}

function buildPhoneForSave(value: string) {
  const local = normalizePhoneLocal(value);
  return local ? `+90 ${formatPhoneLocal(local)}` : "";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmedi";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belirtilmedi";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function readGeoItems(payload: unknown): unknown[] {
  const data = payload as Record<string, unknown> | null;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.provinces)) return data.provinces;
  if (Array.isArray(data?.districts)) return data.districts;

  return [];
}

function normalizeGeoOptions(payload: unknown) {
  const seen = new Set<string>();

  return readGeoItems(payload)
    .map((rawItem) => {
      const item = rawItem as Record<string, unknown>;
      const name = String(
        item?.name ||
          item?.province ||
          item?.provinceName ||
          item?.district ||
          item?.districtName ||
          item?.title ||
          "",
      ).trim();

      const id = String(
        item?.id ||
          item?.code ||
          item?.plateNumber ||
          item?.plate ||
          item?.districtId ||
          item?.provinceId ||
          name,
      ).trim();

      return { id, name };
    })
    .filter((item) => item.name)
    .filter((item) => {
      const key = item.name.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

async function fetchGeoUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error("Coğrafi veri yüklenemedi.");
  }

  return normalizeGeoOptions(await response.json());
}

async function fetchProvinceOptions() {
  try {
    const apiOptions = await fetchGeoUrl(
      `${TURKIYE_API_BASE_URL}/provinces?limit=100&sort=name`,
    );

    const merged = [...FALLBACK_PROVINCE_OPTIONS, ...apiOptions];
    const seen = new Set<string>();

    return merged.filter((option) => {
      const key = option.name.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return FALLBACK_PROVINCE_OPTIONS;
  }
}

async function fetchDistrictOptions(city: string) {
  if (!city) return [];
  if (city === ABROAD_NAME) return [{ id: ABROAD_NAME, name: ABROAD_NAME }];
  if (city === KKTC_PROVINCE_NAME || city === "KKTC") return KKTC_DISTRICTS;

  try {
    return await fetchGeoUrl(
      `${TURKIYE_API_BASE_URL}/districts?province=${encodeURIComponent(
        city,
      )}&limit=1000&sort=name`,
    );
  } catch {
    return [];
  }
}

function ensureSelectedOption(options: GeoOption[], selectedValue: string) {
  if (!selectedValue) return options;
  if (options.some((option) => option.name === selectedValue)) return options;

  return [{ id: selectedValue, name: selectedValue }, ...options];
}

export default function ProfilPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<SafeUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<GeoOption[]>(
    FALLBACK_PROVINCE_OPTIONS,
  );
  const [districtOptions, setDistrictOptions] = useState<GeoOption[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phoneLocal: "",
    city: "",
    district: "",
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.replace("/giris");
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    const loadProfile = async () => {
      try {
        const response = await api.get("/profile");
        setProfile(response.data || (user as SafeUser));
      } catch {
        setProfile(user as SafeUser);
      }
    };

    loadProfile();
  }, [hydrated, user]);

  useEffect(() => {
    let active = true;
    setProvinceLoading(true);

    fetchProvinceOptions()
      .then((options) => {
        if (active) setProvinceOptions(options);
      })
      .finally(() => {
        if (active) setProvinceLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.city) {
      setDistrictOptions([]);
      return;
    }

    if (form.city === ABROAD_NAME) {
      setDistrictOptions([{ id: ABROAD_NAME, name: ABROAD_NAME }]);
      setForm((current) => ({ ...current, district: ABROAD_NAME }));
      return;
    }

    setDistrictLoading(true);

    fetchDistrictOptions(form.city)
      .then((options) => {
        if (active) {
          setDistrictOptions(ensureSelectedOption(options, form.district));
        }
      })
      .finally(() => {
        if (active) setDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.city, form.district]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const safeUser = (profile || user) as SafeUser | null;
  const displayName = useMemo(() => getDisplayName(safeUser), [safeUser]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const roleLabel = getRoleLabel(safeUser?.role);
  const normalizedRole = normalizeRole(safeUser?.role);
  const isAdmin =
    normalizedRole === "ADMIN" ||
    normalizedRole === "MODERATOR" ||
    normalizedRole === "SUPER_ADMIN";

  const packageName =
    safeUser?.currentMembership?.paket?.paketAdi ||
    safeUser?.currentMembership?.paket?.paketKodu ||
    safeUser?.packageType ||
    safeUser?.plan ||
    safeUser?.membershipType ||
    "Paket tanımlı değil";

  const officeName =
    safeUser?.officeName ||
    safeUser?.companyName ||
    "Ofis bilgisi tanımlı değil";

  const teamName = safeUser?.teamName || "Takım bilgisi tanımlı değil";
  const locationText = [safeUser?.district, safeUser?.city]
    .filter(Boolean)
    .join(" / ");
  const profileImageUrl = safeUser?.profileImageUrl || "";
  const kontorBalance = safeUser?.kontorCuzdani?.bakiye;

  const openEditModal = () => {
    setForm({
      firstName: (safeUser?.firstName || "").slice(0, 20),
      lastName: (safeUser?.lastName || "").slice(0, 20),
      phoneLocal: normalizePhoneLocal(safeUser?.phone),
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

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Profil fotoğrafı en fazla 5 MB olabilir.");
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setFormError("");
  };

  const handleSaveProfile = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phoneLocal = normalizePhoneLocal(form.phoneLocal);

    if (!firstName || !lastName) {
      setFormError("Ad ve soyad zorunludur.");
      return;
    }

    if (firstName.length > 20 || lastName.length > 20) {
      setFormError("Ad ve soyad en fazla 20 karakter olmalıdır.");
      return;
    }

    if (phoneLocal && (phoneLocal.length !== 10 || !phoneLocal.startsWith("5"))) {
      setFormError("Cep telefonu +90 5xx xxx xx xx formatında olmalıdır.");
      return;
    }

    if (!form.city || !form.district) {
      setFormError("İl ve ilçe seçimi zorunludur.");
      return;
    }

    try {
      setSaveLoading(true);
      setFormError("");
      setFormSuccess("");

      let response = await api.patch("/profile", {
        firstName,
        lastName,
        phone: buildPhoneForSave(phoneLocal),
        city: form.city,
        district: form.city === ABROAD_NAME ? ABROAD_NAME : form.district,
      });

      if (avatarFile) {
        const payload = new FormData();
        payload.append("file", avatarFile);

        response = await api.post("/profile/avatar", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setProfile(response.data);
      setFormSuccess("Profil bilgileri güncellendi.");

      window.setTimeout(() => {
        closeEditModal();
      }, 650);
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { message?: string } };
      };

      setFormError(
        apiError?.response?.data?.message ||
          "Profil güncellenemedi. Bilgileri kontrol ediniz.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (!hydrated || !safeUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF]">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="h-[calc(100dvh-72px)] overflow-hidden bg-[#111318] text-[#1F2937]">
      <section className="mx-auto flex h-full max-w-[430px] flex-col overflow-hidden">
        <section className="relative flex h-[174px] shrink-0 flex-col items-center justify-center overflow-hidden px-5 pb-5 pt-3 text-center text-white">
          <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-[#2563EB]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-52 w-52 rounded-full bg-[#0EA5E9]/15 blur-3xl" />

          <div className="relative">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                className="h-[78px] w-[78px] rounded-full border-[3px] border-white/90 object-cover shadow-[0_14px_34px_rgba(0,0,0,0.32)]"
              />
            ) : (
              <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-[3px] border-white/90 bg-[#2563EB] text-[24px] font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
                {normalizedRole === "SUPER_ADMIN" ? (
                  <Crown size={32} />
                ) : (
                  initials
                )}
              </div>
            )}

            <button
              type="button"
              onClick={openEditModal}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#111318] bg-white text-[#2563EB] shadow-md transition active:scale-95"
              aria-label="Profil bilgilerini düzenle"
            >
              <Camera size={14} strokeWidth={2.5} />
            </button>
          </div>

          <h1 className="mt-2.5 max-w-full truncate text-[18px] font-black tracking-[-0.025em]">
            {displayName}
          </h1>

          <p className="mt-0.5 max-w-full truncate text-[10px] font-semibold text-white/65">
            {safeUser.email || shortUserId(safeUser.id, safeUser.memberCode)}
          </p>

          <button
            type="button"
            onClick={() => setDetailPanel("membership")}
            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white/90 backdrop-blur-sm"
          >
            <BadgeCheck size={13} className="shrink-0 text-[#60A5FA]" />
            <span className="truncate">{roleLabel}</span>
          </button>
        </section>

        <section className="relative -mt-3 flex min-h-0 flex-1 flex-col gap-2.5 rounded-t-[30px] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-14px_36px_rgba(0,0,0,0.12)]">
          <section
            className="grid min-h-0 flex-[4] overflow-hidden rounded-[18px] bg-[#F6F7F9] px-1.5"
            style={{ gridTemplateRows: "repeat(4, minmax(0, 1fr))" }}
          >
            <MenuLink
              href="/kontor"
              icon={<WalletCards size={18} />}
              title="Kontör Cüzdanı"
            />
            <MenuButton
              icon={<UserRound size={18} />}
              title="Profil Bilgileri"
              onClick={openEditModal}
            />
            <MenuButton
              icon={<BadgeCheck size={18} />}
              title="Üyelik ve Rol"
              onClick={() => setDetailPanel("membership")}
            />
            <MenuButton
              icon={<Building2 size={18} />}
              title="Ofis / Takım Bilgileri"
              last
              onClick={() => setDetailPanel("organization")}
            />
          </section>

          <section
            className={`grid min-h-0 overflow-hidden rounded-[18px] bg-[#F6F7F9] px-1.5 ${
              isAdmin ? "flex-[5]" : "flex-[4]"
            }`}
            style={{
              gridTemplateRows: `repeat(${isAdmin ? 5 : 4}, minmax(0, 1fr))`,
            }}
          >
            <MenuLink
              href="/notification-settings"
              icon={<Bell size={18} />}
              title="Bildirim Ayarları"
            />
            <MenuLink
              href="/sifremi-unuttum"
              icon={<KeyRound size={18} />}
              title="Güvenlik ve Şifre"
            />
            <MenuLink
              href="/portfoy/quality"
              icon={<FileText size={18} />}
              title="Belgelerim"
            />
            <MenuLink
              href="/help-center"
              icon={<HelpCircle size={18} />}
              title="Yardım Merkezi"
              last={!isAdmin}
            />

            {isAdmin && (
              <MenuLink
                href="/admin"
                icon={<ShieldCheck size={18} />}
                title="Yönetim Merkezi"
                last
              />
            )}
          </section>

          <section className="h-[46px] shrink-0 overflow-hidden rounded-[18px] bg-red-50/70 px-1.5">
            <MenuButton
              icon={<LogOut size={18} />}
              title="Çıkış Yap"
              tone="danger"
              last
              onClick={() => {
                logout();
                router.replace("/giris");
              }}
            />
          </section>
        </section>
      </section>

      {editOpen && (
        <EditProfileSheet
          avatarInputRef={avatarInputRef}
          avatarPreview={avatarPreview}
          profileImageUrl={profileImageUrl}
          initials={initials}
          form={form}
          formError={formError}
          formSuccess={formSuccess}
          saveLoading={saveLoading}
          provinceLoading={provinceLoading}
          districtLoading={districtLoading}
          provinceOptions={ensureSelectedOption(provinceOptions, form.city)}
          districtOptions={ensureSelectedOption(districtOptions, form.district)}
          email={safeUser.email || "Bilgi yok"}
          onClose={closeEditModal}
          onSave={handleSaveProfile}
          onAvatarChange={handleAvatarChange}
          onAvatarSelect={() => avatarInputRef.current?.click()}
          onFormChange={(nextForm) => setForm(nextForm)}
        />
      )}

      {detailPanel === "membership" && (
        <DetailSheet
          title="Üyelik ve Rol"
          icon={<BadgeCheck size={22} />}
          onClose={() => setDetailPanel(null)}
        >
          <DetailLine label="Rol" value={roleLabel} />
          <DetailLine label="Üyelik Paketi" value={packageName} />
          <DetailLine
            label="Üye Kodu"
            value={shortUserId(safeUser.id, safeUser.memberCode)}
          />
          <DetailLine
            label="Başlangıç"
            value={formatDate(safeUser.currentMembership?.baslangicTarihi)}
          />
          <DetailLine
            label="Bitiş"
            value={formatDate(safeUser.currentMembership?.bitisTarihi)}
            last
          />
        </DetailSheet>
      )}

      {detailPanel === "organization" && (
        <DetailSheet
          title="Ofis / Takım Bilgileri"
          icon={<Building2 size={22} />}
          onClose={() => setDetailPanel(null)}
        >
          <DetailLine label="Ofis / Firma" value={officeName} />
          <DetailLine label="Takım" value={teamName} />
          <DetailLine label="Unvan" value={safeUser.title || roleLabel} />
          <DetailLine
            label="Konum"
            value={locationText || "Konum bilgisi tanımlı değil"}
            last
          />
        </DetailSheet>
      )}
    </main>
  );
}

function MenuRowContent({
  icon,
  title,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";

  return (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
          danger
            ? "bg-white text-red-500"
            : "bg-white text-[#2563EB]"
        }`}
      >
        {icon}
      </span>

      <span
        className={`min-w-0 flex-1 truncate text-[12px] font-bold ${
          danger ? "text-red-500" : "text-[#20242C]"
        }`}
      >
        {title}
      </span>

      <ChevronRight
        size={16}
        className={`shrink-0 ${
          danger ? "text-red-300" : "text-[#A4A8B0]"
        }`}
      />
    </>
  );
}

function MenuButton({
  icon,
  title,
  onClick,
  tone,
  last,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  tone?: "default" | "danger";
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-0 w-full items-center gap-2.5 px-2.5 text-left transition active:bg-white/70 ${
        last ? "" : "border-b border-[#E7E9ED]"
      }`}
    >
      <MenuRowContent icon={icon} title={title} tone={tone} />
    </button>
  );
}

function MenuLink({
  href,
  icon,
  title,
  last,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-0 items-center gap-2.5 px-2.5 text-left transition active:bg-white/70 ${
        last ? "" : "border-b border-[#E7E9ED]"
      }`}
    >
      <MenuRowContent icon={icon} title={title} />
    </Link>
  );
}

function DetailSheet({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
      <section className="w-full max-w-[430px] rounded-[30px] border border-[#C7D6E8] bg-white p-4 shadow-[0_26px_70px_rgba(15,23,42,0.24)]">
        <div className="grid grid-cols-[42px_1fr_42px] items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#2563EB]">
            {icon}
          </span>
          <h2 className="text-center text-[17px] font-black text-[#1F2937]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#475569]"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#D7E2EF] bg-[#F8FAFC] px-3">
          {children}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[48px] w-full rounded-[18px] bg-[#2563EB] text-[13px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
        >
          Tamam
        </button>
      </section>
    </div>
  );
}

function DetailLine({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[58px] items-center justify-between gap-4 ${
        last ? "" : "border-b border-[#E2E8F0]"
      }`}
    >
      <span className="text-[12px] font-bold text-[#64748B]">{label}</span>
      <span className="max-w-[60%] break-words text-right text-[12px] font-black text-[#1F2937]">
        {value}
      </span>
    </div>
  );
}

function EditProfileSheet({
  avatarInputRef,
  avatarPreview,
  profileImageUrl,
  initials,
  form,
  formError,
  formSuccess,
  saveLoading,
  provinceLoading,
  districtLoading,
  provinceOptions,
  districtOptions,
  email,
  onClose,
  onSave,
  onAvatarChange,
  onAvatarSelect,
  onFormChange,
}: {
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  avatarPreview: string;
  profileImageUrl: string;
  initials: string;
  form: ProfileForm;
  formError: string;
  formSuccess: string;
  saveLoading: boolean;
  provinceLoading: boolean;
  districtLoading: boolean;
  provinceOptions: GeoOption[];
  districtOptions: GeoOption[];
  email: string;
  onClose: () => void;
  onSave: () => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarSelect: () => void;
  onFormChange: (form: ProfileForm) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
      <section className="max-h-[94dvh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#C7D6E8] bg-white p-4 shadow-[0_26px_70px_rgba(15,23,42,0.24)]">
        <div className="grid grid-cols-[42px_1fr_42px] items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={saveLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#475569] disabled:opacity-50"
            aria-label="Kapat"
          >
            <X size={19} />
          </button>

          <div className="text-center">
            <h2 className="text-[17px] font-black text-[#1F2937]">
              Profil Bilgileri
            </h2>
            <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
              Bilgilerini güncelle
            </p>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saveLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-white disabled:opacity-50"
            aria-label="Kaydet"
          >
            <Save size={17} />
          </button>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatarChange}
        />

        <div className="mt-5 text-center">
          <div className="relative mx-auto h-24 w-24">
            {avatarPreview || profileImageUrl ? (
              <img
                src={avatarPreview || profileImageUrl}
                alt="Profil fotoğrafı"
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_12px_28px_rgba(31,41,55,0.16)]"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#2563EB] text-2xl font-black text-white shadow-[0_12px_28px_rgba(31,41,55,0.16)]">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={onAvatarSelect}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#EFF6FF] text-[#2563EB] shadow-sm"
              aria-label="Fotoğraf seç"
            >
              <Camera size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={onAvatarSelect}
            className="mt-3 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[15px] bg-[#EFF6FF] px-4 text-[12px] font-black text-[#2563EB]"
          >
            <Upload size={15} />
            Fotoğraf Seç
          </button>

          <p className="mt-2 text-[10px] font-bold text-[#64748B]">
            JPG, PNG veya WEBP · Maksimum 5 MB
          </p>
        </div>

        {formError && (
          <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-3 py-2.5 text-center text-[12px] font-black text-red-600">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-[12px] font-black text-emerald-700">
            {formSuccess}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <TextField
            label="Ad"
            value={form.firstName}
            maxLength={20}
            counter={`${form.firstName.length}/20`}
            onChange={(value) =>
              onFormChange({ ...form, firstName: value.slice(0, 20) })
            }
          />

          <TextField
            label="Soyad"
            value={form.lastName}
            maxLength={20}
            counter={`${form.lastName.length}/20`}
            onChange={(value) =>
              onFormChange({ ...form, lastName: value.slice(0, 20) })
            }
          />

          <PhoneField
            value={form.phoneLocal}
            onChange={(value) =>
              onFormChange({
                ...form,
                phoneLocal: normalizePhoneLocal(value),
              })
            }
          />

          <SelectField
            label="İl"
            value={form.city}
            options={provinceOptions}
            placeholder={provinceLoading ? "İller yükleniyor" : "İl seç"}
            disabled={provinceLoading}
            onChange={(value) =>
              onFormChange({
                ...form,
                city: value,
                district: value === ABROAD_NAME ? ABROAD_NAME : "",
              })
            }
          />

          <SelectField
            label="İlçe"
            value={form.district}
            options={districtOptions}
            placeholder={districtLoading ? "İlçeler yükleniyor" : "İlçe seç"}
            disabled={!form.city || districtLoading || form.city === ABROAD_NAME}
            onChange={(value) => onFormChange({ ...form, district: value })}
          />

          <div className="rounded-[18px] border border-[#D7E2EF] bg-[#F8FAFC] px-3 py-3 text-left">
            <p className="text-[11px] font-black text-[#64748B]">E-posta</p>
            <p className="mt-1 break-words text-[13px] font-black text-[#475569]">
              {email}
            </p>
            <p className="mt-1 text-[10px] font-bold leading-4 text-[#94A3B8]">
              E-posta değişikliği için Yardım Merkezi üzerinden destek alın.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saveLoading}
            className="min-h-[48px] rounded-[18px] border border-[#C7D6E8] bg-white text-[13px] font-black text-[#475569] disabled:opacity-50"
          >
            İptal
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saveLoading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] bg-[#2563EB] text-[13px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] disabled:opacity-50"
          >
            <Save size={16} />
            {saveLoading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  counter,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  counter?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[18px] border border-[#C7D6E8] bg-white px-3 py-2.5 text-left">
      <span className="flex items-center justify-between gap-2 text-[11px] font-black text-[#64748B]">
        {label}
        {counter && <span className="text-[#94A3B8]">{counter}</span>}
      </span>

      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full bg-transparent text-[14px] font-black text-[#1F2937] outline-none"
      />
    </label>
  );
}

function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const local = normalizePhoneLocal(value);

  return (
    <label className="block rounded-[18px] border border-[#C7D6E8] bg-white px-3 py-2.5 text-left">
      <span className="flex items-center justify-between gap-2 text-[11px] font-black text-[#64748B]">
        Telefon
        <span className="text-[#94A3B8]">{local.length}/10</span>
      </span>

      <div className="mt-1 flex h-8 items-center gap-1 text-[14px] font-black">
        <span className="shrink-0 text-[#2563EB]">+90</span>
        <input
          inputMode="numeric"
          value={formatPhoneLocal(local)}
          placeholder="5xx xxx xx xx"
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[#1F2937] outline-none placeholder:text-[#94A3B8]"
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: GeoOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block rounded-[18px] border border-[#C7D6E8] bg-white px-3 py-2.5 text-left">
      <span className="block text-[11px] font-black text-[#64748B]">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full appearance-none bg-transparent pr-8 text-[14px] font-black text-[#1F2937] outline-none disabled:text-[#94A3B8]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={`${option.id}-${option.name}`} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>

      <ChevronDown
        size={17}
        className="pointer-events-none absolute bottom-4 right-3 text-[#64748B]"
      />
    </label>
  );
}

