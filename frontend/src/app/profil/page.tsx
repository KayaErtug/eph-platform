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
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  Crown,
  Gift,
  Headphones,
  Home,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  WalletCards,
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
  nominationPoints?: number;
  companyName?: string;
  officeName?: string;
  title?: string;
  memberCode?: string;
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

type GeoOption = {
  id: string;
  name: string;
};

type ProfileMetrics = {
  portfolioCount: string;
  crmCount: string;
  poolCount: string;
};

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
  "Hakkari",
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

const FALLBACK_DISTRICTS: Record<string, GeoOption[]> = {
  Denizli: [
    { id: "Pamukkale", name: "Pamukkale" },
    { id: "Merkezefendi", name: "Merkezefendi" },
    { id: "Acıpayam", name: "Acıpayam" },
    { id: "Babadağ", name: "Babadağ" },
    { id: "Baklan", name: "Baklan" },
    { id: "Bekilli", name: "Bekilli" },
    { id: "Beyağaç", name: "Beyağaç" },
    { id: "Bozkurt", name: "Bozkurt" },
    { id: "Buldan", name: "Buldan" },
    { id: "Çal", name: "Çal" },
    { id: "Çameli", name: "Çameli" },
    { id: "Çardak", name: "Çardak" },
    { id: "Çivril", name: "Çivril" },
    { id: "Güney", name: "Güney" },
    { id: "Honaz", name: "Honaz" },
    { id: "Kale", name: "Kale" },
    { id: "Sarayköy", name: "Sarayköy" },
    { id: "Serinhisar", name: "Serinhisar" },
    { id: "Tavas", name: "Tavas" },
  ],
  [KKTC_PROVINCE_NAME]: KKTC_DISTRICTS,
  KKTC: KKTC_DISTRICTS,
  [ABROAD_NAME]: [{ id: ABROAD_NAME, name: ABROAD_NAME }],
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function formatPhoneLocal(localDigits: string) {
  const digits = normalizePhoneLocal(localDigits);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 8);
  const part4 = digits.slice(8, 10);
  return [part1, part2, part3, part4].filter(Boolean).join(" ");
}

function formatPhoneDisplay(value?: string) {
  const local = normalizePhoneLocal(value);
  if (!local) return "Telefon eklenmedi";
  return `+90 ${formatPhoneLocal(local)}`;
}

function buildPhoneForSave(localDigits: string) {
  const local = normalizePhoneLocal(localDigits);
  if (!local) return "";
  return `+90 ${formatPhoneLocal(local)}`;
}

function readGeoPayloadItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.provinces)) return payload.provinces;
  if (Array.isArray(payload?.districts)) return payload.districts;
  return [];
}

function readGeoOptionName(item: any) {
  return String(
    item?.name ||
      item?.province ||
      item?.provinceName ||
      item?.district ||
      item?.districtName ||
      item?.title ||
      "",
  ).trim();
}

function readGeoOptionId(item: any, fallbackName: string) {
  return String(
    item?.id ||
      item?.code ||
      item?.plateNumber ||
      item?.plate ||
      item?.districtId ||
      item?.provinceId ||
      fallbackName,
  ).trim();
}

function sortGeoOptions(options: GeoOption[]) {
  return [...options].sort((a, b) => {
    if (a.name === ABROAD_NAME) return -1;
    if (b.name === ABROAD_NAME) return 1;
    if (a.name === KKTC_PROVINCE_NAME) return -1;
    if (b.name === KKTC_PROVINCE_NAME) return 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

function uniqueSortedGeoOptions(options: GeoOption[]) {
  const seen = new Set<string>();

  return sortGeoOptions(
    options
      .filter((option) => option.name.trim())
      .filter((option) => {
        const key = option.name.toLocaleLowerCase("tr-TR");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
  );
}

function normalizeGeoOptions(payload: any) {
  return uniqueSortedGeoOptions(
    readGeoPayloadItems(payload)
      .map((item) => {
        const name = readGeoOptionName(item);
        return { id: readGeoOptionId(item, name), name };
      })
      .filter((item) => item.name),
  );
}

async function fetchGeoUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error("Coğrafi veri yüklenemedi.");
  return normalizeGeoOptions(await response.json());
}

async function fetchGeoOptions(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });

  return fetchGeoUrl(`${TURKIYE_API_BASE_URL}${path}?${searchParams.toString()}`);
}

function ensureSelectedOption(options: GeoOption[], selectedValue: string) {
  if (!selectedValue) return options;
  if (options.some((option) => option.name === selectedValue)) return options;
  return uniqueSortedGeoOptions([{ id: selectedValue, name: selectedValue }, ...options]);
}

async function fetchProvinceOptions() {
  try {
    const apiOptions = await fetchGeoOptions("/provinces", {
      limit: 100,
      sort: "name",
    });
    return uniqueSortedGeoOptions([...FALLBACK_PROVINCE_OPTIONS, ...apiOptions]);
  } catch {
    return FALLBACK_PROVINCE_OPTIONS;
  }
}

async function fetchDistrictOptionsForCity(city: string) {
  if (!city) return [];
  if (city === ABROAD_NAME) return [{ id: ABROAD_NAME, name: ABROAD_NAME }];
  if (city === KKTC_PROVINCE_NAME || city === "KKTC") return KKTC_DISTRICTS;

  try {
    return await fetchGeoOptions("/districts", {
      province: city,
      limit: 1000,
      sort: "name",
    });
  } catch {
    return FALLBACK_DISTRICTS[city] || [];
  }
}

function pickNumber(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number") return value;
    if (value != null && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
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
  const [metrics, setMetrics] = useState<ProfileMetrics>({
    portfolioCount: "—",
    crmCount: "—",
    poolCount: "—",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phoneLocal: "",
    city: "",
    district: "",
  });
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

    const fetchMetrics = async () => {
      try {
        const res = await api.get("/dashboard/summary");
        const data = res.data || {};
        const portfolio = pickNumber(data, [
          "portfolioCount",
          "portfoyCount",
          "totalPortfolios",
          "totalUnits",
          "unitCount",
        ]);
        const crm = pickNumber(data, [
          "crmCount",
          "customerCount",
          "totalCustomers",
          "activeCustomers",
        ]);
        const pool = pickNumber(data, [
          "poolCount",
          "havuzCount",
          "poolVisibleCount",
          "activePoolCount",
        ]);

        setMetrics({
          portfolioCount: portfolio == null ? "—" : String(portfolio),
          crmCount: crm == null ? "—" : String(crm),
          poolCount: pool == null ? "—" : String(pool),
        });
      } catch {
        setMetrics({ portfolioCount: "—", crmCount: "—", poolCount: "—" });
      }
    };

    fetchProfile();
    fetchMetrics();
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

  useEffect(() => {
    let active = true;
    setProvinceLoading(true);

    fetchProvinceOptions()
      .then((options) => {
        if (!active) return;
        setProvinceOptions(options.length ? options : FALLBACK_PROVINCE_OPTIONS);
      })
      .catch(() => {
        if (active) setProvinceOptions(FALLBACK_PROVINCE_OPTIONS);
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
    setDistrictOptions([]);

    if (!form.city) return;

    if (form.city === ABROAD_NAME) {
      setForm((current) => ({ ...current, district: ABROAD_NAME }));
      setDistrictOptions([{ id: ABROAD_NAME, name: ABROAD_NAME }]);
      return;
    }

    setDistrictLoading(true);

    fetchDistrictOptionsForCity(form.city)
      .then((options) => {
        if (!active) return;
        setDistrictOptions(ensureSelectedOption(options, form.district));
      })
      .catch(() => {
        if (active) setDistrictOptions(ensureSelectedOption([], form.district));
      })
      .finally(() => {
        if (active) setDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.city, form.district]);

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
    safeUser?.currentMembership?.paket?.paketAdi ||
    safeUser?.currentMembership?.paket?.paketKodu ||
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
  const kontorBalance = safeUser?.kontorCuzdani?.bakiye;
  const membershipStart = formatDate(safeUser?.currentMembership?.baslangicTarihi);
  const membershipEnd = formatDate(safeUser?.currentMembership?.bitisTarihi);
  const referenceCount = Number(safeUser?.nominationPoints || 0);

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

      let nextProfile = await api.patch("/profile", {
        firstName,
        lastName,
        phone: buildPhoneForSave(phoneLocal),
        city: form.city,
        district: form.city === ABROAD_NAME ? ABROAD_NAME : form.district,
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
    <main className="min-h-screen bg-[#F7FBFF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[430px] items-center justify-between px-4 py-3">
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

      <section className="mx-auto max-w-[430px] px-4 py-5">
        <section className="rounded-[32px] border border-[#DDE7F3] bg-white p-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="relative mx-auto -mt-1 h-24 w-24">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-3xl font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                style={{ backgroundColor: theme.color }}
              >
                {superAdmin ? <Crown size={42} /> : initials}
              </div>
            )}

            <button
              type="button"
              onClick={openEditModal}
              className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#F8FAFC] text-[#06194A] shadow-md"
              aria-label="Profil fotoğrafını güncelle"
            >
              <Camera size={15} />
            </button>

            <span
              className={`absolute bottom-2 left-1 h-4 w-4 rounded-full border-4 border-white ${presenceDotClass(
                currentPresenceStatus,
              )}`}
            />
          </div>

          <h2 className="mt-4 break-words text-[25px] font-black tracking-[-0.04em]">
            {displayName}
          </h2>

          <p className="mt-1 text-[13px] font-bold text-[#64748B]">
            {theme.label}
          </p>

          {locationText && (
            <p className="mt-1 text-[11px] font-black text-[#1557D6]">
              {locationText}
            </p>
          )}

          <section className="mt-4 rounded-[22px] border border-[#E4ECF7] bg-[#FBFDFF] p-3">
            <PremiumLine
              icon={<WalletCards size={15} />}
              label="Kalan Kontör"
              value={kontorBalance == null ? "—" : String(kontorBalance)}
            />
            <PremiumLine
              icon={<Crown size={15} />}
              label="Üyelik Paketi"
              value={String(packageName).toLocaleUpperCase("tr-TR")}
            />
            <PremiumLine
              icon={<CalendarDays size={15} />}
              label="Başlangıç Tarihi"
              value={membershipStart}
            />
            <PremiumLine
              icon={<CalendarDays size={15} />}
              label="Bitiş Tarihi"
              value={membershipEnd}
              last
            />
          </section>
        </section>

        <section className="mt-4 grid grid-cols-4 gap-2">
          <ProfileMetric icon={<BriefcaseBusiness size={18} />} value={metrics.portfolioCount} label="Portföy" />
          <ProfileMetric icon={<Users size={18} />} value={metrics.crmCount} label="CRM Kaydı" />
          <ProfileMetric icon={<Home size={18} />} value={metrics.poolCount} label="Havuzdaki İlan" />
          <ProfileMetric icon={<Gift size={18} />} value={String(referenceCount)} label="Referans" />
        </section>

        <MenuGroup>
          <button
            type="button"
            onClick={openEditModal}
            className="flex w-full items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
          >
            <MenuIcon color={theme.color}>{<UserRound size={18} />}</MenuIcon>
            <MenuText title="Profil Bilgileri" value="Ad, telefon, e-posta ve adres bilgileri" />
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>
          <MenuItem
            href="/notification-settings"
            icon={<ShieldCheck size={18} />}
            title="Güvenlik"
            value="Şifre değiştirme ve güvenlik ayarları"
            color="#1557D6"
          />
          <MenuItem
            href="/ucretlendirme"
            icon={<WalletCards size={18} />}
            title="Üyelik & Kontör"
            value="Paket detayları ve kontör işlemleri"
            color="#1557D6"
          />
          <MenuItem
            href="/portfoy/quality"
            icon={<Building2 size={18} />}
            title="Belge Merkezi"
            value="Sözleşmeler ve belgeleriniz"
            color="#1557D6"
          />
          <MenuItem
            href="/notification-settings"
            icon={<Settings size={18} />}
            title="Ayarlar"
            value="Bildirim ve uygulama ayarları"
            color="#1557D6"
          />
          <MenuItem
            href="/help-center"
            icon={<Headphones size={18} />}
            title="Bize Ulaşın"
            value="Destek ve iletişim kanalları"
            color="#1557D6"
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
            value={formatPhoneDisplay(safeUser.phone)}
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
          </MenuGroup>
        )}

        <MenuGroup>
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

      <BottomNav />

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06194A]/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
          <section className="max-h-[94dvh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#06194A]"
                aria-label="Geri"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0 text-center">
                <h2 className="text-[18px] font-black tracking-[-0.04em] text-[#06194A]">
                  Profil Bilgileri
                </h2>
                <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                  Kişisel bilgilerini güncelle
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saveLoading}
                className="min-h-10 rounded-[14px] bg-[#1557D6] px-3 text-[12px] font-black text-white disabled:opacity-60"
              >
                {saveLoading ? "..." : "Kaydet"}
              </button>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="mt-5 text-center">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-[#1557D6] text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
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
                className="mt-3 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[15px] bg-[#EFF6FF] px-4 text-[12px] font-black text-[#1557D6] shadow-sm"
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
                maxLength={20}
                counter={`${form.firstName.length}/20`}
                onChange={(value) =>
                  setForm((current) => ({ ...current, firstName: value.slice(0, 20) }))
                }
              />
              <ProfileInput
                label="Soyad"
                value={form.lastName}
                maxLength={20}
                counter={`${form.lastName.length}/20`}
                onChange={(value) =>
                  setForm((current) => ({ ...current, lastName: value.slice(0, 20) }))
                }
              />
              <PhoneInput
                value={form.phoneLocal}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    phoneLocal: normalizePhoneLocal(value),
                  }))
                }
              />
              <SelectInput
                label="İl"
                value={form.city}
                disabled={provinceLoading}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    city: value,
                    district: value === ABROAD_NAME ? ABROAD_NAME : "",
                  }))
                }
                options={provinceOptions}
                placeholder={provinceLoading ? "İller yükleniyor" : "İl seç"}
              />
              <SelectInput
                label="İlçe"
                value={form.district}
                disabled={!form.city || districtLoading || form.city === ABROAD_NAME}
                onChange={(value) =>
                  setForm((current) => ({ ...current, district: value }))
                }
                options={districtOptions}
                placeholder={districtLoading ? "İlçeler yükleniyor" : "İlçe seç"}
              />
              <LockedSoftLine label="E-posta" value={safeUser.email || "Bilgi yok"} />
            </div>

            <section className="mt-4 rounded-[18px] bg-[#F8FAFC] px-3 py-3">
              <div className="flex items-start gap-2 text-left">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#1557D6] shadow-sm">
                  <KeyRound size={15} />
                </span>
                <div>
                  <p className="text-[12px] font-black text-[#06194A]">
                    E-posta adresiniz değiştirilemez.
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
                    E-posta değişikliği için Bize Ulaşın bölümünden iletişime geçin.
                  </p>
                </div>
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

function PremiumLine({
  icon,
  label,
  value,
  last,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[36px] items-center justify-between gap-3 text-left ${
        last ? "" : "border-b border-[#EDF2F8]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 text-[12px] font-black text-[#06194A]">
        <span className="text-[#1557D6]">{icon}</span>
        {label}
      </span>
      <span className="shrink-0 text-right text-[12px] font-black text-[#1557D6]">
        {value}
      </span>
    </div>
  );
}

function ProfileMetric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#DDE7F3] bg-white p-2 text-center shadow-sm">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>
      <div className="mt-1 text-[17px] font-black text-[#06194A]">{value}</div>
      <div className="mt-0.5 min-h-[24px] text-[9px] font-bold leading-3 text-[#64748B]">
        {label}
      </div>
    </div>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[26px] border border-[#DDE7F3] bg-white p-2 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <div className="grid gap-1">{children}</div>
    </section>
  );
}

function MenuIcon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
      style={{ color }}
    >
      {children}
    </span>
  );
}

function MenuText({ title, value }: { title: string; value: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-black text-[#06194A]">{title}</span>
      <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
        {value}
      </span>
    </span>
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
      <MenuIcon color={color}>{icon}</MenuIcon>
      <MenuText title={title} value={value} />
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
      <MenuIcon color={color}>{icon}</MenuIcon>
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
    <label className="block rounded-[18px] border border-[#DDE7F3] bg-white px-3 py-2 text-left">
      <span className="flex items-center justify-between gap-2 text-[11px] font-black text-[#64748B]">
        {label}
        {counter && <span className="text-[#94A3B8]">{counter}</span>}
      </span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full bg-transparent text-[14px] font-black text-[#06194A] outline-none"
      />
    </label>
  );
}

function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const local = normalizePhoneLocal(value);

  return (
    <label className="block rounded-[18px] border border-[#DDE7F3] bg-white px-3 py-2 text-left">
      <span className="flex items-center justify-between gap-2 text-[11px] font-black text-[#64748B]">
        Telefon
        <span className="text-[#94A3B8]">{local.length}/10</span>
      </span>
      <div className="mt-1 flex h-8 items-center gap-1 text-[14px] font-black">
        <span className="shrink-0 text-[#1557D6]">+90</span>
        <input
          inputMode="numeric"
          value={formatPhoneLocal(local)}
          placeholder="5xx xxx xx xx"
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[#06194A] outline-none placeholder:text-[#94A3B8]"
        />
      </div>
    </label>
  );
}

function SelectInput({
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
    <label className="relative block rounded-[18px] border border-[#DDE7F3] bg-white px-3 py-2 text-left">
      <span className="block text-[11px] font-black text-[#64748B]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full appearance-none bg-transparent pr-8 text-[14px] font-black text-[#06194A] outline-none disabled:text-[#94A3B8]"
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

function LockedSoftLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#E4ECF7] bg-[#F8FAFC] px-3 py-3 text-left">
      <p className="text-[11px] font-black text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-[13px] font-black text-[#64748B]">
        {value}
      </p>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE7F3] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-5 px-2 text-[10px] font-bold text-[#64748B]">
        <BottomNavItem href="/dashboard" icon={<Home size={19} />} label="Anasayfa" />
        <BottomNavItem href="/portfoy" icon={<Building2 size={19} />} label="Portföy" />
        <BottomNavItem href="/crm" icon={<Users size={19} />} label="CRM" />
        <BottomNavItem href="/havuz" icon={<BriefcaseBusiness size={19} />} label="Havuz" />
        <BottomNavItem href="/profil" icon={<UserRound size={19} />} label="Profil" active />
      </div>
    </nav>
  );
}

function BottomNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? "text-[#1557D6]" : "text-[#64748B]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
