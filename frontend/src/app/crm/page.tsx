"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Home,
  ListFilter,
  Loader2,
  MapPin,
  Mic,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";

import api from "@/lib/api";
import GoogleGeoPicker from "@/components/stok/GoogleGeoPicker";
import { useAuthStore } from "@/store/auth.store";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  city?: string;
  profession?: string;
  company?: string;
  budget?: number;
  interestedArea?: string;
  interestedType?: string;
  source?: string;
  status: string;
  roles?: string[];
  tags: string[];
  notes?: string;
  lastContactedAt?: string;
  updatedAt: string;
  _count?: { activities: number; tasks: number; interests?: number; properties?: number };
  activities?: Activity[];
  tasks?: Task[];
  interests?: CustomerInterest[];
  properties?: CustomerProperty[];
  owner?: { firstName: string; lastName: string; role: string };
}

interface Activity {
  id: string;
  type: string;
  note: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
}

interface CustomerInterest {
  id: string;
  title?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  propertyTypes?: string[];
  statuses?: string[];
  minBudget?: number;
  maxBudget?: number;
  priceCurrency?: string;
  minArea?: number;
  maxArea?: number;
  roomCounts?: string[];
  features?: string[];
  purchaseIntent: string;
  priority: string;
  notes?: string;
  isActive: boolean;
  lastMatchedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface CustomerProperty {
  id: string;
  relationType: string;
  notes?: string;
  createdAt?: string;
  unit?: {
    id: string;
    type?: string;
    number?: string;
    roomCount?: string;
    area?: number;
    price?: number;
    status?: string;
    isPoolVisible?: boolean;
    approvalStatus?: string;
    yetkiVerified?: boolean;
    project?: {
      id: string;
      name?: string;
      city?: string;
      district?: string;
      address?: string;
    };
    images?: { url?: string; supabaseUrl?: string }[];
  };
}

const PIPELINE_STAGES = [
  { key: "YENI_LEAD", label: "Yeni Lead", color: "#0284C7", bg: "#E0F2FE" },
  { key: "ILK_GORUSME", label: "İlk Görüşme", color: "#7C3AED", bg: "#F5F3FF" },
  { key: "PORTFOLYO_GONDERILDI", label: "Portföy", color: "#EA580C", bg: "#FFF7ED" },
  { key: "YER_GOSTERIMI", label: "Yer Gösterimi", color: "#CA8A04", bg: "#FEFCE8" },
  { key: "TEKLIF_SURECI", label: "Teklif", color: "#0F172A", bg: "#F1F5F9" },
  { key: "PAZARLIK", label: "Pazarlık", color: "#B45309", bg: "#FFFBEB" },
  { key: "KAPANDI", label: "Kapandı", color: "#059669", bg: "#ECFDF5" },
  { key: "KAYBEDILDI", label: "Kaybedildi", color: "#64748B", bg: "#F8FAFC" },
];

const ACTIVITY_TYPES = [
  { key: "TELEFON", label: "Telefon" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "EMAIL", label: "E-posta" },
  { key: "YER_GOSTERIMI", label: "Yer Gösterimi" },
  { key: "TEKLIF", label: "Teklif" },
  { key: "NOT", label: "Not" },
  { key: "DIGER", label: "Diğer" },
];

const CUSTOMER_ROLES = [
  { key: "ALICI", label: "Alıcı" },
  { key: "SATICI", label: "Satıcı" },
  { key: "KIRACI", label: "Kiracı" },
  { key: "MAL_SAHIBI", label: "Mal Sahibi" },
  { key: "YATIRIMCI", label: "Yatırımcı" },
  { key: "MUTEAHHIT", label: "Müteahhit" },
  { key: "INSAAT_FIRMASI", label: "İnşaat Firması" },
  { key: "ARSA_SAHIBI", label: "Arsa Sahibi" },
];

const PROPERTY_TYPE_OPTIONS = [
  { key: "DAIRE", label: "Daire" },
  { key: "VILLA", label: "Villa" },
  { key: "REZIDANS", label: "Rezidans" },
  { key: "ARSA", label: "Arsa" },
  { key: "TARLA", label: "Tarla" },
  { key: "DUKKAN_MAGAZA", label: "Dükkan" },
  { key: "OFIS_BURO", label: "Ofis" },
  { key: "FABRIKA_URETIM_TESISI", label: "Fabrika" },
  { key: "OTEL", label: "Otel" },
];

const UNIT_STATUS_OPTIONS = [
  { key: "SATILIK", label: "Satılık" },
  { key: "KIRALIK", label: "Kiralık" },
  { key: "KAT_KARSILIGI", label: "Kat Karşılığı" },
  { key: "DEVREN_SATILIK", label: "Devren Satılık" },
  { key: "DEVREN_KIRALIK", label: "Devren Kiralık" },
];

const PURCHASE_INTENTS = [
  { key: "BELIRSIZ", label: "Belirsiz" },
  { key: "SATIN_ALMA", label: "Satın Alma" },
  { key: "KIRALAMA", label: "Kiralama" },
  { key: "YATIRIM", label: "Yatırım" },
  { key: "ARSA_GELISTIRME", label: "Arsa Geliştirme" },
  { key: "KAT_KARSILIGI", label: "Kat Karşılığı" },
];

const PRIORITIES = [
  { key: "DUSUK", label: "Düşük" },
  { key: "NORMAL", label: "Normal" },
  { key: "YUKSEK", label: "Yüksek" },
  { key: "ACIL", label: "Acil" },
];

const ROOM_OPTIONS = ["1+1", "2+1", "3+1", "4+1", "5+1", "Villa", "Stüdyo"];
const FEATURE_OPTIONS = ["Asansör", "Kapalı Otopark", "Güvenlik", "Site İçerisinde", "Yerden Isıtma", "Jeneratör", "Havuz", "Spa", "Köşe Parsel"];

const TAGS = ["Yatırımcı", "Acil Alıcı", "Nakit Hazır", "Takas", "Yüksek Bütçe", "Sıcak Lead", "Soğuk Lead"];

const LEAD_SOURCE_OPTIONS = [
  "Referans",
  "Telefon",
  "WhatsApp",
  "Saha Görüşmesi",
  "Tabela",
  "Sosyal Medya",
  "Web Sitesi",
  "Eski Müşteri",
  "Diğer",
];

const BUDGET_PRESETS = [
  { label: "1M", value: "1000000" },
  { label: "2.5M", value: "2500000" },
  { label: "5M", value: "5000000" },
  { label: "10M", value: "10000000" },
  { label: "25M", value: "25000000" },
  { label: "50M+", value: "50000000" },
];

const CRM_QUICK_AREA_HINTS = ["Denizli", "İzmir", "İstanbul", "Muğla", "Antalya", "K.K.T.C."];

type GeoOption = {
  id: string;
  name: string;
};

const TURKIYE_API_BASE_URL = "https://api.turkiyeapi.dev/v1";
const KKTC_PROVINCE_NAME = "K.K.T.C.";

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

const KKTC_PLACES: Record<string, GeoOption[]> = {
  Lefkoşa: [{ id: "Merkez", name: "Merkez" }],
  Girne: [{ id: "Merkez", name: "Merkez" }],
  Gazimağusa: [{ id: "Merkez", name: "Merkez" }],
  İskele: [{ id: "Merkez", name: "Merkez" }],
  Güzelyurt: [{ id: "Merkez", name: "Merkez" }],
  Lefke: [{ id: "Merkez", name: "Merkez" }],
};

const FALLBACK_PROVINCE_OPTIONS: GeoOption[] = [
  { id: "KKTC", name: KKTC_PROVINCE_NAME },
  ...TURKIYE_PROVINCES.map((city) => ({ id: city, name: city })),
];

function sortGeoOptions(options: GeoOption[]) {
  return [...options].sort((a, b) => {
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

function readGeoPayloadItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.provinces)) return payload.provinces;
  if (Array.isArray(payload?.districts)) return payload.districts;
  if (Array.isArray(payload?.neighborhoods)) return payload.neighborhoods;
  if (Array.isArray(payload?.villages)) return payload.villages;
  if (Array.isArray(payload?.towns)) return payload.towns;
  return [];
}

function readGeoOptionName(item: any) {
  return String(
    item?.name ||
      item?.province ||
      item?.provinceName ||
      item?.district ||
      item?.districtName ||
      item?.neighborhood ||
      item?.neighborhoodName ||
      item?.village ||
      item?.villageName ||
      item?.town ||
      item?.townName ||
      item?.mahalle ||
      item?.mahalleAdi ||
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

function normalizeGeoOptions(payload: any) {
  const items = readGeoPayloadItems(payload);

  return uniqueSortedGeoOptions(
    items
      .map((item) => {
        const name = readGeoOptionName(item);
        return { id: readGeoOptionId(item, name), name };
      })
      .filter((item) => item.name),
  );
}

async function fetchGeoUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error("Coğrafi veri yüklenemedi.");
  }

  return normalizeGeoOptions(await response.json());
}

async function fetchGeoOptions(path: string, params: Record<string, string | number | undefined>) {
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
    const apiOptions = await fetchGeoOptions("/provinces", { limit: 100, sort: "name" });
    return uniqueSortedGeoOptions([...FALLBACK_PROVINCE_OPTIONS, ...apiOptions]);
  } catch {
    return FALLBACK_PROVINCE_OPTIONS;
  }
}

async function fetchDistrictOptionsForCity(city: string) {
  if (!city) return [];
  if (city === KKTC_PROVINCE_NAME || city === "KKTC") return KKTC_DISTRICTS;

  return fetchGeoOptions("/districts", {
    province: city,
    limit: 1000,
    sort: "name",
  });
}

async function fetchPlaceOptionsForDistrict(city: string, district: string, districtId?: string) {
  if (!city || !district) return [];
  if (city === KKTC_PROVINCE_NAME || city === "KKTC") return KKTC_PLACES[district] || [{ id: "Merkez", name: "Merkez" }];

  const provinceQuery = `province=${encodeURIComponent(city)}`;
  const districtQuery = districtId
    ? `districtId=${encodeURIComponent(districtId)}`
    : `district=${encodeURIComponent(district)}`;
  const baseQuery = `${provinceQuery}&${districtQuery}&sort=name`;

  const [neighborhoodPayload, villagePayload, townPayload] = await Promise.allSettled([
    fetchGeoUrl(`${TURKIYE_API_BASE_URL}/neighborhoods?${baseQuery}`),
    fetchGeoUrl(`${TURKIYE_API_BASE_URL}/villages?${baseQuery}`),
    fetchGeoUrl(`${TURKIYE_API_BASE_URL}/towns?${baseQuery}`),
  ]);

  const neighborhoods = neighborhoodPayload.status === "fulfilled" ? neighborhoodPayload.value : [];
  const villages = villagePayload.status === "fulfilled" ? villagePayload.value : [];
  const towns = townPayload.status === "fulfilled" ? townPayload.value : [];

  return uniqueSortedGeoOptions([...neighborhoods, ...villages, ...towns]);
}

function money(value?: number) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatBudgetInput(value?: string | number | null) {
  const digits = onlyDigits(String(value || ""));
  if (!digits) return "";

  return `${Number(digits).toLocaleString("tr-TR")} TL`;
}

function buildInterestedArea(city?: string, district?: string, neighborhood?: string) {
  return [city, district, neighborhood].filter(Boolean).join(" / ");
}

function shortMoney(value: number) {
  if (!value) return "—";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ₺`;
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function stageInfo(status: string) {
  return PIPELINE_STAGES.find((item) => item.key === status) || PIPELINE_STAGES[0];
}

function roleLabel(role?: string) {
  if (!role) return "—";
  return CUSTOMER_ROLES.find((item) => item.key === role)?.label || role;
}

function optionLabel(options: { key: string; label: string }[], key?: string) {
  if (!key) return "—";
  return options.find((item) => item.key === key)?.label || key;
}

function formatDateTime(value?: string) {
  if (!value) return "Tarih yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatShortDate(value?: string) {
  if (!value) return "Plan yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} · ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

function isTaskSoon(value?: string) {
  if (!value) return false;
  const dueDate = new Date(value);
  const diffHours = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours <= 1 && diffHours > 0;
}

function getLatestActivity(customer: Customer) {
  return customer.activities?.[0] || null;
}

function getNextTask(customer: Customer) {
  const pendingTasks = (customer.tasks || []).filter((task) => task.status !== "TAMAMLANDI");
  return (
    pendingTasks
      .filter((task) => Boolean(task.dueDate))
      .sort((a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime())[0] ||
    pendingTasks[0] ||
    null
  );
}

function activityTypeLabel(type?: string) {
  if (!type) return "Aktivite yok";
  return ACTIVITY_TYPES.find((item) => item.key === type)?.label || type;
}

function emptyInterestForm() {
  return {
    title: "",
    city: "",
    district: "",
    neighborhood: "",
    propertyTypes: [] as string[],
    statuses: ["SATILIK"] as string[],
    minBudget: "",
    maxBudget: "",
    minArea: "",
    maxArea: "",
    roomCounts: [] as string[],
    features: [] as string[],
    purchaseIntent: "BELIRSIZ",
    priority: "NORMAL",
    notes: "",
  };
}

export default function CrmPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, Customer[]>>({});
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"pipeline" | "list">("list");
  const [timeRange, setTimeRange] = useState<"today" | "7" | "15" | "30">("today");
  const [roleFilter, setRoleFilter] = useState<string>("TUMU");
  const [developerSegment, setDeveloperSegment] = useState<string>("ALICI_ADAYI");
  const [quickFilter, setQuickFilter] = useState<"TUMU" | "EKSIK" | "SICAK">("TUMU");
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickPickMode, setQuickPickMode] = useState<"GORUSME" | "GOREV" | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    profession: "",
    company: "",
    budget: "",
    interestedArea: "",
    interestedCity: "",
    interestedDistrict: "",
    interestedNeighborhood: "",
    interestedType: "",
    source: "",
    notes: "",
    status: "YENI_LEAD",
    roles: [] as string[],
    tags: [] as string[],
  });

  const [activityForm, setActivityForm] = useState({ type: "TELEFON", note: "" });
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "" });
  const [interestForm, setInterestForm] = useState(emptyInterestForm());
  const [provinceOptions, setProvinceOptions] = useState<GeoOption[]>(FALLBACK_PROVINCE_OPTIONS);
  const [districtOptionsList, setDistrictOptionsList] = useState<GeoOption[]>([]);
  const [neighborhoodOptionsList, setNeighborhoodOptionsList] = useState<GeoOption[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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

    setDistrictOptionsList([]);
    setNeighborhoodOptionsList([]);

    if (!interestForm.city) return;

    setDistrictLoading(true);

    fetchDistrictOptionsForCity(interestForm.city)
      .then((options) => {
        if (!active) return;
        setDistrictOptionsList(ensureSelectedOption(options, interestForm.district));
      })
      .catch(() => {
        if (active) setDistrictOptionsList(ensureSelectedOption([], interestForm.district));
      })
      .finally(() => {
        if (active) setDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [interestForm.city, interestForm.district]);

  useEffect(() => {
    let active = true;

    setNeighborhoodOptionsList([]);

    if (!interestForm.city || !interestForm.district) return;

    const selectedDistrict = districtOptionsList.find((district) => district.name === interestForm.district);
    setNeighborhoodLoading(true);

    fetchPlaceOptionsForDistrict(interestForm.city, interestForm.district, selectedDistrict?.id)
      .then((options) => {
        if (!active) return;
        setNeighborhoodOptionsList(ensureSelectedOption(options, interestForm.neighborhood));
      })
      .catch(() => {
        if (active) setNeighborhoodOptionsList(ensureSelectedOption([], interestForm.neighborhood));
      })
      .finally(() => {
        if (active) setNeighborhoodLoading(false);
      });

    return () => {
      active = false;
    };
  }, [interestForm.city, interestForm.district, interestForm.neighborhood, districtOptionsList]);

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
      setLoading(true);
      const [customersRes, pipelineRes] = await Promise.all([api.get("/crm/customers"), api.get("/crm/pipeline")]);
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      setPipeline(pipelineRes.data || {});
    } catch (error) {
      console.error(error);
      alert("CRM bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedCustomer = async (customerId?: string) => {
    const id = customerId || selectedCustomer?.id;
    if (!id) return;
    const res = await api.get(`/crm/customers/${id}`);
    setSelectedCustomer(res.data);
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      city: "",
      profession: "",
      company: "",
      budget: "",
      interestedArea: "",
      interestedCity: "",
      interestedDistrict: "",
      interestedNeighborhood: "",
      interestedType: "",
      source: "",
      notes: "",
      status: "YENI_LEAD",
      roles: [],
      tags: [],
    });
  };

  const handleAddCustomer = async () => {
    if (!form.firstName || !form.lastName) return;
    setFormLoading(true);

    try {
      const { interestedCity, interestedDistrict, interestedNeighborhood, ...payload } = form;
      await api.post("/crm/customers", {
        ...payload,
        interestedArea: form.interestedArea || buildInterestedArea(interestedCity, interestedDistrict, interestedNeighborhood),
        budget: form.budget ? Number(onlyDigits(form.budget)) : undefined,
      });
      await fetchAll();
      setShowAddModal(false);
      resetForm();
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (customerId: string, status: string) => {
    await api.patch(`/crm/customers/${customerId}/status`, { status });
    await fetchAll();
    if (selectedCustomer?.id === customerId) {
      await refreshSelectedCustomer(customerId);
    }
  };

  const handleUpdateRoles = async (roles: string[]) => {
    if (!selectedCustomer) return;
    await api.patch(`/crm/customers/${selectedCustomer.id}`, { roles });
    await refreshSelectedCustomer(selectedCustomer.id);
    await fetchAll();
  };

  const handleAddActivity = async () => {
    if (!selectedCustomer || !activityForm.note) return;
    setActivityLoading(true);

    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/activities`, activityForm);
      await refreshSelectedCustomer(selectedCustomer.id);
      setActivityForm({ type: "TELEFON", note: "" });
      await fetchAll();
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSaveCreditCalculation = async (note: string) => {
    if (!selectedCustomer) return;
    setActivityLoading(true);

    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/activities`, { type: "NOT", note });
      await refreshSelectedCustomer(selectedCustomer.id);
      await fetchAll();
    } finally {
      setActivityLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedCustomer || !taskForm.title) return;
    setTaskLoading(true);

    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/tasks`, { title: taskForm.title, dueDate: taskForm.dueDate || undefined });
      await refreshSelectedCustomer(selectedCustomer.id);
      setTaskForm({ title: "", dueDate: "" });
      await fetchAll();
    } finally {
      setTaskLoading(false);
    }
  };

  const handleTaskDone = async (taskId: string) => {
    await api.patch(`/crm/tasks/${taskId}`, { status: "TAMAMLANDI" });
    await refreshSelectedCustomer();
    await fetchAll();
  };

  const handleAddInterest = async () => {
    if (!selectedCustomer) return;
    const hasLocation = interestForm.city || interestForm.district || interestForm.neighborhood;
    const hasProfile = interestForm.propertyTypes.length || interestForm.minBudget || interestForm.maxBudget || interestForm.roomCounts.length;
    if (!hasLocation && !hasProfile) return;

    setInterestLoading(true);

    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/interests`, {
        ...interestForm,
        minBudget: interestForm.minBudget ? Number(interestForm.minBudget) : undefined,
        maxBudget: interestForm.maxBudget ? Number(interestForm.maxBudget) : undefined,
        minArea: interestForm.minArea ? Number(interestForm.minArea) : undefined,
        maxArea: interestForm.maxArea ? Number(interestForm.maxArea) : undefined,
      });
      setInterestForm(emptyInterestForm());
      await refreshSelectedCustomer(selectedCustomer.id);
      await fetchAll();
    } finally {
      setInterestLoading(false);
    }
  };

  const handleDeleteInterest = async (interestId: string) => {
    if (!selectedCustomer) return;
    await api.delete(`/crm/interests/${interestId}`);
    await refreshSelectedCustomer(selectedCustomer.id);
    await fetchAll();
  };

  const handleDeleteCustomerProperty = async (propertyId: string) => {
    if (!selectedCustomer) return;
    await api.delete(`/crm/customer-properties/${propertyId}`);
    await refreshSelectedCustomer(selectedCustomer.id);
    await fetchAll();
  };

  const openCustomer = async (id: string) => {
    const res = await api.get(`/crm/customers/${id}`);
    setSelectedCustomer(res.data);
    setInterestForm(emptyInterestForm());
  };

  const showAllCustomers = () => {
    setQuickFilter("TUMU");
    setRoleFilter("TUMU");
    setSearch("");
    setView("list");
  };

  const showIncompleteCustomers = () => {
    setQuickFilter("EKSIK");
    setRoleFilter("TUMU");
    setSearch("");
    setView("list");
  };

  const showWarmLeadCustomers = () => {
    setQuickFilter("SICAK");
    setRoleFilter("TUMU");
    setSearch("");
    setView("list");
  };

  const handleRoleFilterChange = (role: string) => {
    setQuickFilter("TUMU");
    setRoleFilter(role);
    setView("list");
  };

  const handleOpenCustomerForAction = async (customerId: string) => {
    const mode = quickPickMode;
    setQuickPickMode(null);
    await openCustomer(customerId);

    if (mode === "GORUSME") {
      setActivityForm({ type: "TELEFON", note: "Görüşme notu: " });
    }

    if (mode === "GOREV") {
      setTaskForm({ title: "Takip görüşmesi", dueDate: "" });
    }
  };

  const handleSaveQuickNote = async (customerId: string, note: string) => {
    if (!customerId || !note.trim()) return;
    setActivityLoading(true);

    try {
      await api.post(`/crm/customers/${customerId}/activities`, { type: "NOT", note: note.trim() });
      setShowQuickNoteModal(false);
      await fetchAll();
      if (selectedCustomer?.id === customerId) {
        await refreshSelectedCustomer(customerId);
      }
    } finally {
      setActivityLoading(false);
    }
  };

  const roleTabs = useMemo(
    () => [
      { key: "ALICI", label: "Alıcılar", icon: <UsersRound size={16} />, tone: "blue" },
      { key: "SATICI", label: "Satıcılar", icon: <WalletCards size={16} />, tone: "green" },
      { key: "KIRACI", label: "Kiracılar", icon: <Wrench size={16} />, tone: "orange" },
      { key: "MUTEAHHIT", label: "Müteahhitler", icon: <Building2 size={16} />, tone: "sky" },
      { key: "INSAAT_FIRMASI", label: "İnşaat Firmaları", icon: <Home size={16} />, tone: "purple" },
    ],
    [],
  );

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return customers.filter((customer) => {
      const hasContact = Boolean(customer.phone || customer.email);
      const hasRole = Boolean(customer.roles?.length);
      const hasNeedProfile = Boolean(customer._count?.interests || customer.interests?.length || customer.interestedArea || customer.interestedType);
      const isIncomplete = !hasContact || !hasRole || !hasNeedProfile;

      const lastTouch = customer.lastContactedAt || getLatestActivity(customer)?.createdAt || customer.updatedAt;
      const warmDiffHours = lastTouch ? (Date.now() - new Date(lastTouch).getTime()) / (1000 * 60 * 60) : 0;
      const isWarm = !["KAPANDI", "KAYBEDILDI"].includes(customer.status) && warmDiffHours >= 48;

      if (quickFilter === "EKSIK" && !isIncomplete) return false;
      if (quickFilter === "SICAK" && !isWarm) return false;

      const roleMatched = roleFilter === "TUMU" || (customer.roles || []).includes(roleFilter);
      if (!roleMatched) return false;
      if (!keyword) return true;

      return [
        customer.firstName,
        customer.lastName,
        customer.phone,
        customer.email,
        customer.city,
        customer.profession,
        customer.company,
        customer.interestedArea,
        customer.interestedType,
        ...(customer.roles || []).map(roleLabel),
        ...(customer.interests || []).flatMap((interest) => [interest.city, interest.district, interest.neighborhood, interest.title]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [customers, search, roleFilter, quickFilter]);


  const developerCustomers = useMemo(() => {
    const hasTag = (customer: Customer, keywords: string[]) =>
      [customer.profession, customer.company, customer.source, customer.notes, ...(customer.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .split(/\s+/)
        .some((token) => keywords.some((keyword) => token.includes(keyword)));

    const hasAnyText = (customer: Customer, keywords: string[]) =>
      [customer.profession, customer.company, customer.source, customer.notes, ...(customer.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(keywords.join(" "));

    return customers.filter((customer) => {
      const roles = customer.roles || [];
      if (developerSegment === "ALICI_ADAYI") return roles.includes("ALICI");
      if (developerSegment === "ARSA_SAHIBI") return roles.includes("ARSA_SAHIBI") || roles.includes("MAL_SAHIBI");
      if (developerSegment === "PORTFOY_ORTAGI") return roles.includes("MUTEAHHIT") || roles.includes("INSAAT_FIRMASI") || hasAnyText(customer, ["portföy ortağı"]);
      if (developerSegment === "ALT_YUKLENICI") return hasTag(customer, ["yüklenici", "tasaron", "taşeron", "tedarik", "usta"]);
      if (developerSegment === "YATIRIMCI") return roles.includes("YATIRIMCI");
      return true;
    });
  }, [customers, developerSegment]);

  const soldCustomers = useMemo(
    () =>
      customers
        .filter((customer) => customer.status === "KAPANDI")
        .slice(0, 5),
    [customers],
  );

  const activeProjectCount = useMemo(() => {
    const projectIds = new Set<string>();
    customers.forEach((customer) => {
      (customer.properties || []).forEach((property) => {
        if (property.unit?.project?.id) projectIds.add(property.unit.project.id);
      });
    });
    return projectIds.size || Math.max(1, Math.min(4, customers.filter((customer) => (customer._count?.properties || 0) > 0).length));
  }, [customers]);

  const totalIndependentSectionCount = useMemo(
    () => customers.reduce((sum, customer) => sum + (customer._count?.properties || customer.properties?.length || 0), 0),
    [customers],
  );

  const allTasks = customers.flatMap((customer) =>
    (customer.tasks || []).map((task) => ({ ...task, customerName: `${customer.firstName} ${customer.lastName}`, customerId: customer.id })),
  );

  const todayTasks = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "TAMAMLANDI") return false;
    const date = new Date(task.dueDate);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  });

  const overdueTasks = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "TAMAMLANDI") return false;
    return new Date(task.dueDate).getTime() < Date.now();
  });

  const upcomingTasks = allTasks
    .filter((task) => {
      if (!task.dueDate || task.status === "TAMAMLANDI") return false;
      return new Date(task.dueDate).getTime() >= Date.now();
    })
    .sort((a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime())
    .slice(0, 5);

  const plannedCallsToday = todayTasks.filter((task) => task.title.toLocaleLowerCase("tr-TR").includes("görüş")).length;
  const warmLeadCustomers = customers.filter((customer) => {
    if (["KAPANDI", "KAYBEDILDI"].includes(customer.status)) return false;
    const lastTouch = customer.lastContactedAt || getLatestActivity(customer)?.createdAt || customer.updatedAt;
    if (!lastTouch) return false;
    const diffHours = (Date.now() - new Date(lastTouch).getTime()) / (1000 * 60 * 60);
    return diffHours >= 48;
  });

  const selectedRangeDays = timeRange === "today" ? 1 : Number(timeRange);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - selectedRangeDays + 1);
  rangeStart.setHours(0, 0, 0, 0);

  const rangeCustomers = customers.filter((customer) => new Date(customer.updatedAt).getTime() >= rangeStart.getTime());
  const rangeClosedCount = rangeCustomers.filter((customer) => customer.status === "KAPANDI").length;
  const rangeActiveCount = rangeCustomers.filter((customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status)).length;
  const targetRate = rangeActiveCount + rangeClosedCount > 0 ? Math.round((rangeClosedCount / (rangeActiveCount + rangeClosedCount)) * 100) : 0;

  const totalBudget = customers.reduce((sum, customer) => sum + (customer.budget || 0), 0);
  const closedCount = customers.filter((customer) => customer.status === "KAPANDI").length;
  const activeCount = customers.filter((customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status)).length;
  const incompleteCount = customers.filter((customer) => {
    const hasContact = Boolean(customer.phone || customer.email);
    const hasRole = Boolean(customer.roles?.length);
    const hasNeedProfile = Boolean(customer._count?.interests || customer.interests?.length || customer.interestedArea || customer.interestedType);
    return !hasContact || !hasRole || !hasNeedProfile;
  }).length;

  if (!hydrated || loading) {
    return (
      <main className="eph-v4-shell flex min-h-screen items-center justify-center bg-[#F4F8FF] text-[#06194A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1557D6]" size={34} />
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-500">CRM verileri yükleniyor</p>
        </div>
      </main>
    );
  }

  const currentUserRole = String(user?.role || "").toUpperCase();

  if (currentUserRole === "MUTEAHHIT") {
    return (
      <main className="eph-v4-shell min-h-screen bg-[#F4F8FF] text-[#1F2937]">
        {showAddModal && <AddCustomerModal form={form} setForm={setForm} formLoading={formLoading} provinceOptions={provinceOptions} provinceLoading={provinceLoading} onSubmit={handleAddCustomer} onClose={() => setShowAddModal(false)} />}
        {showCreditModal && <CreditCalculatorModal selectedCustomer={selectedCustomer} saving={activityLoading} onSave={handleSaveCreditCalculation} onClose={() => setShowCreditModal(false)} />}
        {quickPickMode && <QuickPickCustomerModal mode={quickPickMode} customers={customers} onSelect={handleOpenCustomerForAction} onClose={() => setQuickPickMode(null)} />}
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onStatusChange={handleStatusChange}
            onUpdateRoles={handleUpdateRoles}
            activityForm={activityForm}
            setActivityForm={setActivityForm}
            activityLoading={activityLoading}
            onAddActivity={handleAddActivity}
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            taskLoading={taskLoading}
            onAddTask={handleAddTask}
            onTaskDone={handleTaskDone}
            interestForm={interestForm}
            setInterestForm={setInterestForm}
            interestLoading={interestLoading}
            onAddInterest={handleAddInterest}
            onDeleteInterest={handleDeleteInterest}
            onDeleteCustomerProperty={handleDeleteCustomerProperty}
            provinceOptions={provinceOptions}
            districtOptions={districtOptionsList}
            neighborhoodOptions={neighborhoodOptionsList}
            provinceLoading={provinceLoading}
            districtLoading={districtLoading}
            neighborhoodLoading={neighborhoodLoading}
          />
        )}

        <section className="eph-crm-page mx-auto min-h-screen max-w-7xl px-3 pb-8 pt-3 md:px-4 md:pt-5">
          <header className="mb-3 rounded-[26px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Rol Bazlı CRM</p>
              <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-[#1F2937] md:text-[34px]">CRM Müteahhit</h1>
              <p className="mx-auto mt-1 max-w-xl text-[12px] font-bold leading-5 text-[#64748B]">
                {activeProjectCount} proje • {Math.max(totalIndependentSectionCount, customers.length)} bağımsız bölüm • {customers.length} bağlantı
              </p>
            </div>
          </header>

          <section className="mb-3 overflow-hidden rounded-[26px] border border-[#C7D6E8] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between gap-2 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#2563EB]">
                  <Sparkles size={21} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-black leading-tight text-[#1F2937]">Lina Öneriyor</h2>
                  <p className="text-[11px] font-bold text-[#64748B]">Proje, alıcı ve tapu takibi</p>
                </div>
              </div>
              <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black text-[#2563EB]">Akıllı CRM</span>
            </div>

            <div className="mt-3 grid gap-2">
              <DeveloperLinaRow icon={<Flame size={18} />} text="Kaya Residence'ta 3 alıcı adayı 5 gündür bekliyor." />
              <DeveloperLinaRow icon={<Clock3 size={18} />} text="Ali Kaya ile tapu devri süreci takip bekliyor." />
              <DeveloperLinaRow icon={<Target size={18} />} text="Merkez Lofts'ta kalan stok kritik seviyeye yaklaştı." />
            </div>
          </section>

          <section className="mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
            <div className="grid grid-cols-4 gap-2">
              <DeveloperStatCard title="Aktif Proje" value={String(activeProjectCount)} subtitle="Devam eden" icon={<Building2 size={18} />} />
              <DeveloperStatCard title="Toplam BB" value={String(Math.max(totalIndependentSectionCount, customers.length))} subtitle="Bağımsız bölüm" icon={<Home size={18} />} />
              <DeveloperStatCard title="Satılan BB" value={String(closedCount)} subtitle="CRM satış" icon={<CheckCircle2 size={18} />} />
              <DeveloperStatCard title="Kalan Stok" value={String(Math.max(Math.max(totalIndependentSectionCount, customers.length) - closedCount, 0))} subtitle="Satışa hazır" icon={<BriefcaseBusiness size={18} />} />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <DeveloperStatCard title="Arsa Sahibi" value={String(customers.filter((customer) => (customer.roles || []).includes("ARSA_SAHIBI") || (customer.roles || []).includes("MAL_SAHIBI")).length)} subtitle="Bağlantı" icon={<UsersRound size={18} />} />
              <DeveloperStatCard title="Alıcı Adayı" value={String(customers.filter((customer) => (customer.roles || []).includes("ALICI")).length)} subtitle="Aktif lead" icon={<Target size={18} />} />
              <DeveloperStatCard title="Portföy Ortağı" value={String(customers.filter((customer) => (customer.roles || []).includes("MUTEAHHIT") || (customer.roles || []).includes("INSAAT_FIRMASI")).length)} subtitle="İş ortağı" icon={<BriefcaseBusiness size={18} />} />
              <DeveloperStatCard title="Toplam Ciro" value={shortMoney(totalBudget)} subtitle="CRM potansiyeli" icon={<WalletCards size={18} />} />
            </div>
          </section>

          <section className="mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
            <h2 className="mb-2 text-center text-[15px] font-black uppercase tracking-[0.08em] text-[#1F2937]">Hızlı İşlemler</h2>
            <div className="grid grid-cols-5 gap-2">
              <DeveloperActionButton title="Proje Ekle" icon={<Building2 size={23} />} tone="blue" onClick={() => router.push("/portfoy")} />
              <DeveloperActionButton title="Alıcı Ekle" icon={<UsersRound size={23} />} tone="pistachio" onClick={() => { setForm((current) => ({ ...current, roles: ["ALICI"] })); setShowAddModal(true); }} />
              <DeveloperActionButton title="Arsa Sahibi Ekle" icon={<Home size={23} />} tone="leaf" onClick={() => { setForm((current) => ({ ...current, roles: ["ARSA_SAHIBI"] })); setShowAddModal(true); }} />
              <DeveloperActionButton title="Görüşme Ekle" icon={<PhoneCall size={23} />} tone="pink" onClick={() => setQuickPickMode("GORUSME")} />
              <DeveloperActionButton title="Kredi Hesapla" icon={<WalletCards size={23} />} tone="navy" onClick={() => setShowCreditModal(true)} />
            </div>
          </section>

          <section className="mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
            <h2 className="mb-2 text-center text-[15px] font-black uppercase tracking-[0.08em] text-[#1F2937]">Segmentler</h2>
            <div className="grid grid-cols-6 gap-2">
              {[
                { key: "ALICI_ADAYI", label: "Alıcı Adayları", count: customers.filter((customer) => (customer.roles || []).includes("ALICI")).length, icon: <UsersRound size={20} /> },
                { key: "ARSA_SAHIBI", label: "Arsa Sahipleri", count: customers.filter((customer) => (customer.roles || []).includes("ARSA_SAHIBI") || (customer.roles || []).includes("MAL_SAHIBI")).length, icon: <Home size={20} /> },
                { key: "PORTFOY_ORTAGI", label: "Portföy Ortakları", count: customers.filter((customer) => (customer.roles || []).includes("MUTEAHHIT") || (customer.roles || []).includes("INSAAT_FIRMASI")).length, icon: <BriefcaseBusiness size={20} /> },
                { key: "ALT_YUKLENICI", label: "Alt Yükleniciler", count: developerCustomers.filter((customer) => String(customer.profession || "").toLocaleLowerCase("tr-TR").includes("yüklenici")).length, icon: <Wrench size={20} /> },
                { key: "YATIRIMCI", label: "Yatırımcılar", count: customers.filter((customer) => (customer.roles || []).includes("YATIRIMCI")).length, icon: <WalletCards size={20} /> },
              ].map((segment, index) => {
                const gridClass = index === 3 ? "col-span-3" : index === 4 ? "col-span-3" : "col-span-2";
                return (
                  <button
                    key={segment.key}
                    onClick={() => setDeveloperSegment(segment.key)}
                    className={`${gridClass} flex min-h-[86px] flex-col items-center justify-center rounded-[20px] border px-2 py-3 text-center shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition ${developerSegment === segment.key ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#C7D6E8] bg-white text-[#1F2937]"}`}
                  >
                    <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#2563EB]">{segment.icon}</span>
                    <span className="line-clamp-2 min-h-[30px] text-center text-[11px] font-black leading-[15px]">{segment.label}</span>
                    <span className="mt-1 text-[18px] font-black leading-none">{segment.count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-black text-[#1F2937]">Bağlantılarım</h2>
              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#F8FAFC] p-1">
                {[
                  { key: "today", label: "Bugün" },
                  { key: "7", label: "7 Gün" },
                  { key: "15", label: "15 Gün" },
                  { key: "30", label: "30 Gün" },
                ].map((item) => (
                  <button key={item.key} onClick={() => setTimeRange(item.key as "today" | "7" | "15" | "30")} className={`rounded-xl px-2 py-1 text-[10px] font-black ${timeRange === item.key ? "bg-[#2563EB] text-white" : "text-[#64748B]"}`}>{item.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {developerCustomers.slice(0, 4).map((customer) => (
                <DeveloperConnectionRow key={customer.id} customer={customer} onOpen={() => openCustomer(customer.id)} />
              ))}
              {developerCustomers.length === 0 && <div className="rounded-[20px] border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-5 text-center text-sm font-bold text-[#64748B]">Bu segmentte kayıt yok.</div>}
            </div>
          </section>

          <section className="mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-black text-[#1F2937]">Satılan Daire Raporu</h2>
              <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[10px] font-black text-emerald-700">CRM Kaydı görünür</span>
            </div>
            <div className="space-y-2">
              {soldCustomers.map((customer) => {
                const property = customer.properties?.[0];
                const unit = property?.unit;
                return (
                  <button key={customer.id} onClick={() => openCustomer(customer.id)} className="w-full rounded-[20px] border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#1F2937]">{unit?.project?.name || customer.company || "CRM Satış Kaydı"}</p>
                        <p className="mt-1 text-xs font-bold text-[#64748B]">{unit?.number || "BB No yok"} • {unit?.roomCount || customer.interestedType || "Tip belirtilmedi"} • {unit?.area ? `${unit.area} m²` : customer.city || "Konum yok"}</p>
                        <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white px-3 py-1 text-xs font-black text-emerald-700">
                          <UsersRound size={14} />
                          <span className="truncate">{customer.firstName} {customer.lastName} • CRM Kaydı</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-emerald-700">{money(unit?.price || customer.budget)}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#64748B]">{formatShortDate(customer.updatedAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {soldCustomers.length === 0 && <div className="rounded-[20px] border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-5 text-center text-sm font-bold text-[#64748B]">Satılmış daire CRM kaydı henüz yok.</div>}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="eph-v4-shell min-h-screen bg-[#F4F8FF] text-[#27364F]">
      {showAddModal && <AddCustomerModal form={form} setForm={setForm} formLoading={formLoading} provinceOptions={provinceOptions} provinceLoading={provinceLoading} onSubmit={handleAddCustomer} onClose={() => setShowAddModal(false)} />}
      {showCreditModal && <CreditCalculatorModal selectedCustomer={selectedCustomer} saving={activityLoading} onSave={handleSaveCreditCalculation} onClose={() => setShowCreditModal(false)} />}
      {showQuickNoteModal && <QuickNoteModal customers={customers} saving={activityLoading} onSave={handleSaveQuickNote} onClose={() => setShowQuickNoteModal(false)} />}
      {quickPickMode && <QuickPickCustomerModal mode={quickPickMode} customers={customers} onSelect={handleOpenCustomerForAction} onClose={() => setQuickPickMode(null)} />}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onStatusChange={handleStatusChange}
          onUpdateRoles={handleUpdateRoles}
          activityForm={activityForm}
          setActivityForm={setActivityForm}
          activityLoading={activityLoading}
          onAddActivity={handleAddActivity}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          taskLoading={taskLoading}
          onAddTask={handleAddTask}
          onTaskDone={handleTaskDone}
          interestForm={interestForm}
          setInterestForm={setInterestForm}
          interestLoading={interestLoading}
          onAddInterest={handleAddInterest}
          onDeleteInterest={handleDeleteInterest}
          onDeleteCustomerProperty={handleDeleteCustomerProperty}
          provinceOptions={provinceOptions}
          districtOptions={districtOptionsList}
          neighborhoodOptions={neighborhoodOptionsList}
          provinceLoading={provinceLoading}
          districtLoading={districtLoading}
          neighborhoodLoading={neighborhoodLoading}
        />
      )}

      <section className="eph-crm-page mx-auto min-h-screen max-w-7xl px-3 pb-8 pt-3 md:px-4 md:pt-5">
        <header className="eph-crm-compact-head mb-3 overflow-hidden rounded-[26px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07)] md:p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6]">
              <BriefcaseBusiness size={13} />
              CRM V1.1
            </div>
          </div>

          <div className="mt-2 text-center">
            <h1 className="text-[23px] font-black leading-tight tracking-tight text-[#06194A] md:text-[32px]">CRM Merkezi</h1>
            <p className="mx-auto mt-1 max-w-xl text-[11px] font-bold leading-5 text-[#64748B] md:text-sm">
              {customers.length} müşteri • {activeCount} aktif lead • {shortMoney(totalBudget)} toplam bütçe
            </p>
          </div>

          <div className="eph-crm-top-grid mt-3 grid grid-cols-5 gap-1.5">
            <TopCrmCard title="Toplam Kayıt" value={String(customers.length)} icon={<UsersRound size={16} />} onClick={showAllCustomers} />
            <TopCrmCard title="Eksik Bilgili" value={String(incompleteCount)} icon={<Target size={16} />} onClick={showIncompleteCustomers} />
            <TopCrmCard title="Hızlı Not" value="Sesli Not" icon={<FileText size={16} />} onClick={() => setShowQuickNoteModal(true)} />
            <TopCrmCard title="Akbank Kredi" value="Hesapla" icon={<WalletCards size={16} />} onClick={() => setShowCreditModal(true)} highlight />
            <TopCrmCard title="Yeni Kayıt" value="Ekle" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)} />
          </div>

          <CrmSmartBand todayTasks={todayTasks.length} plannedCalls={plannedCallsToday} overdueTasks={overdueTasks.length} warmLeadCount={warmLeadCustomers.length} onShowCustomers={showWarmLeadCustomers} onAddCustomer={() => setShowAddModal(true)} />

          <div className="mt-3 grid grid-cols-4 gap-2">
            <QuickActionCard icon={<Flame size={18} />} title="Sıcak Lead" subtitle="Liste" onClick={showWarmLeadCustomers} />
            <QuickActionCard icon={<PhoneCall size={18} />} title="Görüşme" subtitle="Müşteri seç" onClick={() => setQuickPickMode("GORUSME")} />
            <QuickActionCard icon={<Clock3 size={18} />} title="Görev" subtitle="Müşteri seç" onClick={() => setQuickPickMode("GOREV")} />
            <QuickActionCard icon={<ListFilter size={18} />} title={view === "pipeline" ? "Liste" : "Pipeline"} subtitle="Görünüm" onClick={() => setView(view === "pipeline" ? "list" : "pipeline")} />
          </div>
        </header>

        <section className="eph-crm-time-panel mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "today", label: "Bugün" },
              { key: "7", label: "7 Gün" },
              { key: "15", label: "15 Gün" },
              { key: "30", label: "30 Gün" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeRange(item.key as "today" | "7" | "15" | "30")}
                className={`flex h-10 items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition ${timeRange === item.key ? "bg-[#1557D6] text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]" : "bg-[#F8FAFC] text-slate-600"}`}
              >
                <CalendarDays size={14} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-2 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-[11px] font-black text-slate-600">
            Bu ay: <span className="text-[#1557D6]">{rangeClosedCount} kapandı</span> • <span className="text-emerald-600">{rangeActiveCount} aktif</span> • Hedef: <span className="text-[#06194A]">%{targetRate}</span>
          </div>
        </section>

        {warmLeadCustomers.length > 0 && (
          <button
            onClick={() => {
              setView("list");
              setRoleFilter("TUMU");
            }}
            className="eph-crm-hotlead-card mb-3 flex w-full items-center justify-between gap-3 rounded-[22px] border border-orange-200 bg-[#FFF7ED] px-4 py-3 text-left shadow-[0_8px_24px_rgba(234,88,12,0.08)]"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-black text-orange-700">
              <Flame size={18} className="shrink-0" />
              <span className="line-clamp-2">{warmLeadCustomers.length} müşteri 48 saattir bekliyor</span>
            </span>
            <span className="shrink-0 text-xs font-black text-orange-600">Görüntüle →</span>
          </button>
        )}

        <section className="eph-crm-segments mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_9px_26px_rgba(15,23,42,0.07)]">
          <div className="grid grid-cols-6 gap-2">
            {roleTabs.map((tab, index) => {
              const count = customers.filter((customer) => (customer.roles || []).includes(tab.key)).length;
              const gridClass = index === 3 ? "col-span-2 col-start-2" : "col-span-2";
              return (
                <div key={tab.key} className={gridClass}>
                  <RoleSegmentButton
                    label={tab.label}
                    count={count}
                    icon={tab.icon}
                    active={roleFilter === tab.key}
                    tone={tab.tone}
                    onClick={() => handleRoleFilterChange(tab.key)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {quickFilter !== "TUMU" && (
          <button type="button" onClick={showAllCustomers} className="mb-3 flex w-full items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white px-3 py-2 text-xs font-black text-[#1557D6] shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
            {quickFilter === "EKSIK" ? "Eksik bilgili kayıtlar gösteriliyor" : "Sıcak lead listesi gösteriliyor"} • Filtreyi temizle
          </button>
        )}

        <section className="eph-crm-filterbar mb-3 rounded-[24px] border border-[#C7D6E8] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Müşteri ara..." className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] pl-10 pr-3 text-sm font-bold text-slate-700 outline-none focus:border-[#1557D6]" />
            </div>

            <button type="button" onClick={() => alert("Sesli arama tarayıcı desteği kontrol ediliyor. Bu özellik CRM V1.2 fazında aktif edilecek.")} className="flex h-11 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#06194A]">
              <Mic size={18} />
            </button>

            <button onClick={() => setView(view === "pipeline" ? "list" : "pipeline")} className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-2xl border border-[#C7D6E8] bg-white px-3 text-xs font-black text-[#06194A]">
              {view === "pipeline" ? <FileText size={16} /> : <ListFilter size={16} />}
              {view === "pipeline" ? "Liste" : "Pipeline"}
            </button>
          </div>
        </section>

        {view === "pipeline" ? (
          <section className="eph-crm-pipeline overflow-x-auto pb-4">
            <div className="eph-crm-pipeline-track flex gap-3">
              {PIPELINE_STAGES.map((stage) => {
                const stageCustomers = (pipeline[stage.key] || []).filter((customer) => filteredCustomers.some((item) => item.id === customer.id));

                return (
                  <div key={stage.key} className="eph-crm-stage w-[280px] shrink-0">
                    <div className="mb-2 flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: stage.bg }}>
                      <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: stage.color }}>{stage.label}</span>
                      <span className="text-base font-black" style={{ color: stage.color }}>{stageCustomers.length}</span>
                    </div>

                    <div className="space-y-2">
                      {stageCustomers.map((customer) => <CustomerCard key={customer.id} customer={customer} onClick={() => openCustomer(customer.id)} />)}
                      {stageCustomers.length === 0 && <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-400">Boş</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="eph-crm-list rounded-[24px] border border-[#C7D6E8] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
            {filteredCustomers.length === 0 ? (
              <div className="flex h-[240px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EFF6FF] text-[#1557D6]"><UsersRound size={26} /></div>
                <div className="text-lg font-black text-[#06194A]">Müşteri bulunamadı</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Yeni müşteri ekleyebilir veya arama filtresini temizleyebilirsin.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => <CustomerListRow key={customer.id} customer={customer} onClick={() => openCustomer(customer.id)} />)}
              </div>
            )}
          </section>
        )}
      </section>

      <style jsx global>{`
        .premium-input {
          width: 100%;
          border-radius: 18px;
          border: 2px solid #c7d6e8;
          background: #eef3f8;
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

        .eph-v4-shell .premium-input {
          border-color: #c7d6e8;
          background: #eef3f8;
        }

        .eph-v4-shell .premium-input:disabled {
          background: #e6eef9;
          color: #64748b;
          cursor: not-allowed;
        }

        .eph-v4-shell .border,
        .eph-v4-shell .border-slate-100,
        .eph-v4-shell .border-slate-200,
        .eph-v4-shell .border-blue-100,
        .eph-v4-shell .border-red-200 {
          border-width: 1.5px;
          border-color: #c7d6e8;
        }

        .eph-v4-shell .bg-\[\#F8FAFC\] {
          background-color: #f8fafc;
        }

        .eph-v4-shell .bg-blue-50\/60,
        .eph-v4-shell .bg-\[\#EFF6FF\] {
          border-color: #c7d6e8;
        }



        .eph-v4-shell,
        .eph-v4-shell * {
          min-width: 0;
        }

        .eph-crm-customer-card,
        .eph-crm-list-row,
        .eph-crm-modal-panel,
        .eph-crm-modal-body,
        .eph-crm-task-center,
        .eph-crm-filterbar,
        .eph-crm-list {
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .eph-crm-modal-body p,
        .eph-crm-modal-body span,
        .eph-crm-modal-body div,
        .eph-crm-customer-card p,
        .eph-crm-customer-card span,
        .eph-crm-list-row p,
        .eph-crm-list-row span {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .eph-crm-segments {
          max-width: 100%;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .eph-crm-page {
            padding-left: 12px;
            padding-right: 12px;
            padding-top: 12px;
            padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px));
          }

          .eph-crm-hero {
            border-radius: 26px;
            padding: 14px;
          }

          .eph-crm-hero h1 {
            margin-top: 8px;
            font-size: 27px;
            line-height: 1.05;
          }

          .eph-crm-hero p {
            font-size: 12px;
            line-height: 1.55;
          }

          .eph-crm-kpi-grid {
            gap: 8px;
          }

          .eph-crm-kpi-grid > div {
            border-radius: 20px;
            padding: 10px 8px;
          }

          .eph-crm-kpi-grid > div:last-child:nth-child(odd) {
            grid-column: 1 / -1;
            width: calc(50% - 4px);
            justify-self: center;
          }

          .eph-crm-kpi-grid p:first-of-type {
            font-size: 9px;
            line-height: 1.2;
          }

          .eph-crm-kpi-grid p:last-of-type {
            font-size: 20px;
          }

          .eph-crm-task-center {
            border-radius: 24px;
            padding: 14px;
          }

          .eph-crm-task-center h2 {
            font-size: 20px;
            line-height: 1.15;
          }

          .eph-crm-filterbar {
            border-radius: 24px;
            padding: 12px;
          }

          .eph-crm-filterbar input {
            height: 46px;
            font-size: 12px;
            padding-left: 42px;
            padding-right: 10px;
          }

          .eph-crm-filterbar .grid.grid-cols-3 {
            gap: 8px;
          }

          .eph-crm-filterbar button {
            height: 46px;
            border-radius: 16px;
            padding-left: 8px;
            padding-right: 8px;
            font-size: 11px;
          }

          .eph-crm-pipeline {
            margin-left: -12px;
            margin-right: -12px;
            padding-left: 12px;
            padding-right: 12px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }

          .eph-crm-pipeline-track {
            gap: 10px;
          }

          .eph-crm-stage {
            width: min(84vw, 300px);
            scroll-snap-align: start;
          }

          .eph-crm-customer-card,
          .eph-crm-list-row {
            border-radius: 20px;
            padding: 12px;
          }

          .eph-crm-list {
            border-radius: 24px;
            padding: 10px;
          }

          .eph-crm-modal-overlay {
            align-items: flex-end;
            padding: 0;
            background: rgba(6, 25, 74, 0.5);
          }

          .eph-crm-modal-panel {
            width: 100%;
            max-width: none;
            max-height: min(92dvh, var(--eph-vvh, 92vh));
            border-radius: 26px 26px 0 0;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          }

          .eph-crm-detail-panel {
            max-height: min(94dvh, var(--eph-vvh, 94vh));
          }

          .eph-crm-modal-header {
            padding: 14px 14px 12px;
            text-align: center;
          }

          .eph-crm-modal-header > div:first-child,
          .eph-crm-modal-header .flex > div:first-child {
            min-width: 0;
            flex: 1;
            text-align: center;
          }

          .eph-crm-modal-header h2 {
            font-size: 22px;
            line-height: 1.1;
          }

          .eph-crm-modal-body {
            padding: 14px;
            padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
            gap: 14px;
          }

          .eph-crm-modal-body .grid {
            gap: 10px;
          }

          .premium-input {
            min-height: 46px;
            border-radius: 16px;
            padding: 11px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}



function DeveloperLinaRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2 text-left shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
      <span className="flex min-w-0 items-center gap-2 text-sm font-black text-[#1F2937]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB]">{icon}</span>
        <span className="line-clamp-2">{text}</span>
      </span>
      <span className="shrink-0 text-[#64748B]">›</span>
    </button>
  );
}

function DeveloperStatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: ReactNode }) {
  return (
    <button type="button" className="flex min-h-[96px] flex-col items-center justify-center rounded-[20px] border border-[#C7D6E8] bg-white px-2 py-3 text-center shadow-[0_8px_22px_rgba(15,23,42,0.055)]">
      <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">{icon}</span>
      <span className="line-clamp-2 min-h-[28px] text-center text-[10px] font-black leading-[14px] text-[#1F2937]">{title}</span>
      <span className="mt-1 text-[22px] font-black leading-none text-[#1F2937]">{value}</span>
      <span className="mt-1 line-clamp-1 text-[10px] font-bold text-[#64748B]">{subtitle}</span>
    </button>
  );
}

function DeveloperActionButton({ title, icon, tone, onClick }: { title: string; icon: ReactNode; tone: "blue" | "pistachio" | "leaf" | "pink" | "navy"; onClick: () => void }) {
  const toneClass = {
    blue: "from-[#2563EB] to-[#1D4ED8] shadow-[0_14px_24px_rgba(37,99,235,0.26)]",
    pistachio: "from-[#84CC16] to-[#65A30D] shadow-[0_14px_24px_rgba(101,163,13,0.26)]",
    leaf: "from-[#22C55E] to-[#16A34A] shadow-[0_14px_24px_rgba(22,163,74,0.26)]",
    pink: "from-[#EC4899] to-[#DB2777] shadow-[0_14px_24px_rgba(219,39,119,0.25)]",
    navy: "from-[#1E40AF] to-[#0F172A] shadow-[0_14px_24px_rgba(30,64,175,0.25)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[82px] flex-col items-center justify-center rounded-[20px] bg-gradient-to-br px-2 py-3 text-center text-white ${toneClass}`}
    >
      <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/16">{icon}</span>
      <span className="line-clamp-2 text-center text-[11px] font-black leading-[15px]">{title}</span>
    </button>
  );
}

function DeveloperConnectionRow({ customer, onOpen }: { customer: Customer; onOpen: () => void }) {
  const latestActivity = getLatestActivity(customer);
  const projectName = customer.properties?.[0]?.unit?.project?.name || customer.company || customer.interestedArea || "Proje bağlantısı yok";
  const roleText = (customer.roles || []).map(roleLabel).filter(Boolean).slice(0, 2).join(" / ") || "Bağlantı";

  return (
    <button onClick={onOpen} className="w-full rounded-[20px] border border-[#C7D6E8] bg-white p-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-black text-[#2563EB]">
              {customer.firstName?.[0] || "?"}{customer.lastName?.[0] || ""}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black text-[#1F2937]">{customer.firstName} {customer.lastName}</h3>
              <p className="truncate text-xs font-bold text-[#64748B]">{roleText} • {customer.city || "Konum yok"}</p>
            </div>
          </div>
          <div className="mt-2 grid gap-1 pl-[52px] text-xs font-bold text-[#64748B]">
            <p className="line-clamp-1"><span className="font-black text-[#2563EB]">Proje:</span> {projectName}</p>
            <p className="line-clamp-1"><span className="font-black text-[#1F2937]">Son temas:</span> {latestActivity?.note || "Aktivite yok"}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]"><Phone size={17} /></span>
          <span className="text-[10px] font-black text-[#64748B]">Aç</span>
        </div>
      </div>
    </button>
  );
}

function CreditCalculatorModal({
  selectedCustomer,
  saving,
  onSave,
  onClose,
}: {
  selectedCustomer: Customer | null;
  saving: boolean;
  onSave: (note: string) => Promise<void>;
  onClose: () => void;
}) {
  const [propertyValue, setPropertyValue] = useState("4000000");
  const [downPayment, setDownPayment] = useState("1000000");
  const [months, setMonths] = useState("120");
  const [monthlyRate, setMonthlyRate] = useState("2.89");
  const [saved, setSaved] = useState(false);

  const propertyAmount = Number(onlyDigits(propertyValue));
  const downPaymentAmount = Number(onlyDigits(downPayment));
  const principal = Math.max(propertyAmount - downPaymentAmount, 0);
  const n = Math.max(Number(months) || 0, 1);
  const r = Math.max(Number(monthlyRate.replace(",", ".")) || 0, 0) / 100;
  const monthlyPayment = r > 0 ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : principal / n;
  const totalPayment = monthlyPayment * n;
  const totalInterest = Math.max(totalPayment - principal, 0);
  const downPaymentRate = propertyAmount > 0 ? Math.round((downPaymentAmount / propertyAmount) * 100) : 0;

  const handleSave = async () => {
    if (!selectedCustomer || saving) return;

    const note = [
      "Konut kredisi hesaplama notu:",
      `Konut Değeri: ${money(propertyAmount)}`,
      `Peşinat: ${money(downPaymentAmount)}`,
      `Kullanılacak Kredi: ${money(principal)}`,
      `Vade: ${n} Ay`,
      `Tahmini Aylık Faiz: %${monthlyRate}`,
      `Tahmini Aylık Taksit: ${money(Math.round(monthlyPayment))}`,
      `Tahmini Toplam Geri Ödeme: ${money(Math.round(totalPayment))}`,
      `Tahmini Toplam Faiz: ${money(Math.round(totalInterest))}`,
      "Not: Hesaplama bilgilendirme amaçlıdır; kesin koşullar banka değerlendirmesine göre değişebilir.",
    ].join("\n");

    await onSave(note);
    setSaved(true);
  };

  return (
    <div className="eph-crm-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center bg-[#1F2937]/45 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div
        className="eph-crm-modal-panel flex h-[min(92dvh,860px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-[#C7D6E8] bg-white shadow-[0_-18px_48px_rgba(31,41,55,0.18)] md:h-auto md:max-h-[90dvh] md:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 border-b border-[#C7D6E8] bg-white/95 px-4 pb-4 pt-[calc(14px+env(safe-area-inset-top,0px))] text-center backdrop-blur">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#C7D6E8] md:hidden" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#64748B] shadow-sm">
            <X size={18} />
          </button>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#C7D6E8] bg-[#F8FAFC] text-center shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
            <span className="text-[25px] font-black leading-none text-[#D71920]">A</span>
          </div>

          <h2 className="mx-auto mt-3 max-w-[280px] text-[24px] font-black leading-tight tracking-tight text-[#1F2937] md:max-w-none md:text-[28px]">
            Akbank Konut Kredisi Hesaplayıcı
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs font-bold leading-5 text-[#64748B]">
            Bu hesaplama tahmini bilgilendirme amaçlıdır. Kesin oran ve ödeme planı bankanın güncel koşullarına göre değişebilir.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-[calc(22px+env(safe-area-inset-bottom,0px))]">
          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
            <MortgageInputRow
              icon={<Home size={21} />}
              title="Konut Değeri"
              helper="500.000 ₺ - 20.000.000 ₺"
              value={propertyValue}
              onChange={setPropertyValue}
              suffix="₺"
            />

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <MortgageInputRow
              icon={<WalletCards size={21} />}
              title="Peşinat Tutarı"
              helper={`Peşinat oranı: %${downPaymentRate}`}
              value={downPayment}
              onChange={setDownPayment}
              suffix="₺"
            />

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <div className="grid grid-cols-[48px_1fr] gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <CalendarDays size={21} />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-black text-[#1F2937]">Vade</p>
                    <p className="text-[11px] font-bold text-[#64748B]">12 - 240 ay</p>
                  </div>
                  <select
                    className="h-11 min-w-[148px] rounded-2xl border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-center text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
                    value={months}
                    onChange={(event) => setMonths(event.target.value)}
                  >
                    {[12, 24, 36, 48, 60, 84, 120, 180, 240].map((month) => (
                      <option key={month} value={String(month)}>{month} Ay</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[60, 120, 180].map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setMonths(String(month))}
                      className={`h-9 rounded-2xl border text-[11px] font-black ${months === String(month) ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"}`}
                    >
                      {month} Ay
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="my-3 h-px bg-[#E5EDF7]" />

            <div className="grid grid-cols-[48px_1fr] gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Target size={21} />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-left">
                    <p className="text-sm font-black text-[#1F2937]">Tahmini Aylık Faiz</p>
                    <p className="text-[11px] font-bold text-[#64748B]">Manuel güncellenebilir</p>
                  </div>
                  <div className="relative w-[128px]">
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#EEF3F8] pl-3 pr-8 text-center text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
                      inputMode="decimal"
                      value={monthlyRate}
                      onChange={(event) => setMonthlyRate(event.target.value)}
                    />
                    <span className="absolute right-3 top-3 text-sm font-black text-[#64748B]">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#C7D6E8] bg-[#F8FAFC] px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-wide text-[#64748B]">Kredi Tutarı</p>
                  <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">Konut değeri - peşinat</p>
                </div>
                <p className="shrink-0 text-[21px] font-black text-[#2563EB]">{money(principal)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.055)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-left text-sm font-black text-[#1F2937]">Hesaplama Sonucu</h3>
              <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black text-[#2563EB]">Tahmini</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MortgageResult title="Aylık Taksit" value={money(Math.round(monthlyPayment))} />
              <MortgageResult title="Toplam Ödeme" value={money(Math.round(totalPayment))} tone="green" />
              <MortgageResult title="Faiz Oranı" value={`%${monthlyRate}`} tone="purple" />
            </div>

            <div className="mt-3 rounded-[20px] bg-[#F8FAFC] px-3 py-3 text-left">
              <p className="text-xs font-black text-[#1F2937]">Bilgilendirme</p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-[#64748B]">
                Hesaplama yalnızca hızlı satış görüşmesi için tahmini sonuç üretir. Masraf, sigorta, ekspertiz ve banka onay koşulları dahil değildir.
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedCustomer || saving}
            className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border px-4 text-center text-sm font-black shadow-[0_10px_24px_rgba(15,23,42,0.055)] ${selectedCustomer ? "border-[#2563EB] bg-white text-[#2563EB]" : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"}`}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <UsersRound size={18} />}
            {selectedCustomer ? (saved ? "CRM Kaydına İşlendi" : "CRM Kaydına İşle") : "Müşteri seçince CRM kaydına işlenir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MortgageInputRow({
  icon,
  title,
  helper,
  value,
  onChange,
  suffix,
}: {
  icon: ReactNode;
  title: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <div className="grid grid-cols-[48px_1fr] gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 text-left">
            <p className="text-sm font-black text-[#1F2937]">{title}</p>
            <p className="text-[11px] font-bold text-[#64748B]">{helper}</p>
          </div>
          <div className="relative w-[164px] max-w-[56%]">
            <input
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#EEF3F8] pl-3 pr-8 text-right text-sm font-black text-[#1F2937] outline-none focus:border-[#2563EB]"
              inputMode="numeric"
              value={formatBudgetInput(value).replace(" TL", "")}
              onChange={(event) => onChange(onlyDigits(event.target.value))}
            />
            <span className="absolute right-3 top-3 text-sm font-black text-[#64748B]">{suffix}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MortgageResult({ title, value, tone = "blue" }: { title: string; value: string; tone?: "blue" | "green" | "purple" }) {
  const toneClass = tone === "green" ? "text-emerald-600 bg-emerald-50" : tone === "purple" ? "text-violet-700 bg-violet-50" : "text-[#2563EB] bg-[#EFF6FF]";

  return (
    <div className="min-w-0 rounded-[20px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
        <WalletCards size={18} />
      </div>
      <p className="min-h-[28px] text-[10px] font-black uppercase leading-[1.25] text-[#64748B]">{title}</p>
      <p className="mt-1 break-words text-[15px] font-black leading-tight text-[#1F2937]">{value}</p>
    </div>
  );
}



function QuickNoteModal({
  customers,
  saving,
  onSave,
  onClose,
}: {
  customers: Customer[];
  saving: boolean;
  onSave: (customerId: string, note: string) => void;
  onClose: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [note, setNote] = useState("");

  return (
    <div className="eph-crm-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/60 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div className="eph-crm-modal-panel flex w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] border border-[#C7D6E8] bg-white shadow-2xl md:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#C7D6E8] px-4 py-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1557D6]">CRM Hızlı Not</p>
          <h2 className="mt-1 text-[22px] font-black text-[#06194A]">Sesli / Yazılı Not</h2>
          <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-slate-500"><X size={18} /></button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <Field label="Müşteri">
            <select className="premium-input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
            </select>
          </Field>

          <Field label="Not">
            <textarea className="premium-input min-h-[120px] resize-none" placeholder="Görüşme notu, sesli not metni veya hızlı hatırlatma..." value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>

          <button type="button" disabled={!customerId || !note.trim() || saving} onClick={() => onSave(customerId, note)} className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-black text-white disabled:opacity-50">
            {saving ? "Kaydediliyor..." : "CRM Kaydına İşle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickPickCustomerModal({
  mode,
  customers,
  onSelect,
  onClose,
}: {
  mode: "GORUSME" | "GOREV";
  customers: Customer[];
  onSelect: (customerId: string) => void;
  onClose: () => void;
}) {
  const title = mode === "GORUSME" ? "Görüşme Ekle" : "Görev Ekle";
  const description = mode === "GORUSME" ? "Müşteri seçilince detay açılır ve görüşme notu hazır gelir." : "Müşteri seçilince detay açılır ve takip görevi hazır gelir.";

  return (
    <div className="eph-crm-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/60 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div className="eph-crm-modal-panel flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] border border-[#C7D6E8] bg-white shadow-2xl md:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#C7D6E8] px-4 py-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1557D6]">CRM Hızlı İşlem</p>
          <h2 className="mt-1 text-[22px] font-black text-[#06194A]">{title}</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs font-bold leading-5 text-[#64748B]">{description}</p>
          <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-slate-500"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {customers.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#64748B]">Önce müşteri ekleyiniz.</div>
          ) : (
            customers.map((customer) => (
              <button key={customer.id} type="button" onClick={() => onSelect(customer.id)} className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[#C7D6E8] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#06194A]">{customer.firstName} {customer.lastName}</span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-[#64748B]">{[customer.phone, customer.city, roleLabel(customer.roles?.[0])].filter(Boolean).join(" • ")}</span>
                </span>
                <span className="shrink-0 text-xs font-black text-[#1557D6]">Seç →</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TopCrmCard({
  title,
  value,
  icon,
  onClick,
  highlight,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const className = `min-w-0 rounded-[18px] border px-1.5 py-2 text-center shadow-[0_8px_20px_rgba(15,23,42,0.045)] transition ${
    highlight ? "border-[#8B5CF6] bg-white text-[#6D28D9]" : "border-[#C7D6E8] bg-[#F8FAFC] text-[#1557D6]"
  }`;

  const content = (
    <>
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-white shadow-sm">{icon}</div>
      <p className="mx-auto min-h-[24px] max-w-full text-[8px] font-black uppercase leading-[1.15] text-slate-500">{title}</p>
      <p className="mt-1 text-[12px] font-black leading-tight text-[#06194A]">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function CrmSmartBand({
  todayTasks,
  plannedCalls,
  overdueTasks,
  warmLeadCount,
  onShowCustomers,
  onAddCustomer,
}: {
  todayTasks: number;
  plannedCalls: number;
  overdueTasks: number;
  warmLeadCount: number;
  onShowCustomers: () => void;
  onAddCustomer: () => void;
}) {
  const hasWork = todayTasks > 0 || plannedCalls > 0 || overdueTasks > 0;

  if (hasWork) {
    return (
      <div className="mt-3 flex min-h-9 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2 text-center text-[11px] font-black leading-5 text-[#06194A] shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
        <span className="line-clamp-2">
          ⏰ Bugün {todayTasks} görev <span className="text-slate-400">•</span> {plannedCalls} görüşme <span className="text-slate-400">•</span> {overdueTasks} takip gecikti
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-[22px] border border-[#D8CCFF] bg-white px-3 py-3 text-left shadow-[0_10px_28px_rgba(109,40,217,0.09)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#6D28D9] shadow-sm">
          <Sparkles size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-black text-[#6D28D9]">Lina'dan Öneri</p>
            <span className="rounded-full bg-[#F5F3FF] px-2 py-1 text-[9px] font-black text-[#6D28D9]">Akıllı CRM</span>
          </div>

          <p className="mt-1 text-[12px] font-bold leading-5 text-[#06194A]">
            Bugün planlanmış göreviniz yok. {warmLeadCount > 0 ? `${warmLeadCount} sıcak lead bekliyor; önce onları arayabilirsiniz.` : "Yeni müşteri ekleyip sıcak lead listenizi güçlendirebilirsiniz."}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onShowCustomers} className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D8CCFF] bg-white px-2 text-[11px] font-black text-[#6D28D9]">
          <PhoneCall size={15} />
          Sıcak Lead'ler
        </button>
        <button type="button" onClick={onAddCustomer} className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D8CCFF] bg-white px-2 text-[11px] font-black text-[#6D28D9]">
          <Plus size={15} />
          Yeni Müşteri
        </button>
      </div>
    </div>
  );
}

function segmentToneClasses(tone?: string, active?: boolean) {
  if (active) return "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]";

  if (tone === "green") return "border-[#C7D6E8] bg-white text-emerald-700";
  if (tone === "orange") return "border-[#C7D6E8] bg-white text-orange-700";
  if (tone === "purple") return "border-[#C7D6E8] bg-white text-purple-700";
  if (tone === "red") return "border-[#C7D6E8] bg-white text-red-600";
  if (tone === "sky") return "border-[#C7D6E8] bg-white text-sky-700";
  if (tone === "emerald") return "border-[#C7D6E8] bg-white text-emerald-700";

  return "border-[#C7D6E8] bg-white text-[#1557D6]";
}

function RoleSegmentButton({
  label,
  count,
  icon,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  icon: ReactNode;
  active: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[78px] w-full min-w-0 flex-col items-center justify-center rounded-[20px] border px-2.5 py-3 text-center shadow-[0_9px_24px_rgba(15,23,42,0.07)] transition ${segmentToneClasses(tone, active)}`}
    >
      <span className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] shadow-sm">{icon}</span>
      <span className="block w-full min-w-0 text-center text-[10.5px] font-black leading-[1.15] text-[#06194A]">{label}</span>
      <span className="mt-1 block text-center text-[12px] font-black leading-none opacity-75">({count})</span>
    </button>
  );
}

function QuickActionCard({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-w-0 rounded-[20px] border border-[#C7D6E8] bg-[#F8FAFC] px-2 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.045)] transition hover:border-[#1557D6] hover:bg-white">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#1557D6] shadow-sm">{icon}</div>
      <p className="mt-2 truncate text-[11px] font-black leading-tight text-[#06194A]">{title}</p>
      <p className="mt-0.5 truncate text-[10px] font-black leading-tight text-slate-400">{subtitle}</p>
    </button>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[#C7D6E8] bg-[#F8FAFC] px-2 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#1557D6] shadow-sm">{icon}</div>
      <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 truncate text-[18px] font-black leading-tight text-[#06194A] md:text-[22px]">{value}</p>
    </div>
  );
}

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const stage = stageInfo(customer.status);
  const latestActivity = getLatestActivity(customer);
  const nextTask = getNextTask(customer);
  const nextTaskSoon = isTaskSoon(nextTask?.dueDate);

  return (
    <button onClick={onClick} className="eph-crm-customer-card w-full max-w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1557D6] hover:bg-[#F8FAFC]">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-[16px] font-black leading-tight text-[#06194A]">{customer.firstName} {customer.lastName}</h3>
          {customer.phone && <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-bold text-slate-500"><Phone size={13} className="shrink-0" /><span className="min-w-0 truncate">{customer.phone}</span></p>}
        </div>

        <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {(customer.roles || []).slice(0, 3).map((role) => <RolePill key={role} role={role} />)}
        {!customer.roles?.length && <RolePill role="BELIRSIZ" label="Rol Yok" />}
      </div>

      <p className="mt-3 break-words text-[18px] font-black leading-tight text-[#1557D6]">{money(customer.budget)}</p>

      <div className="mt-3 grid gap-2">
        <InsightBox title="Son Aktivite" badge={activityTypeLabel(latestActivity?.type)} text={latestActivity?.note || "Henüz aktivite yok"} />
        <InsightBox title="Sonraki Görev" badge={nextTask?.dueDate ? formatShortDate(nextTask.dueDate) : "Plan yok"} text={nextTask?.title || "Planlı görev yok"} urgent={nextTaskSoon} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
        <MiniCounter label="Aktivite" value={String(customer._count?.activities || 0)} />
        <MiniCounter label="Görev" value={String(customer._count?.tasks || 0)} />
        <MiniCounter label="Talep" value={String(customer._count?.interests || 0)} />
        <MiniCounter label="Portföy" value={String(customer._count?.properties || 0)} />
      </div>
    </button>
  );
}

function CustomerListRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const stage = stageInfo(customer.status);
  const latestActivity = getLatestActivity(customer);
  const nextTask = getNextTask(customer);
  const nextTaskSoon = isTaskSoon(nextTask?.dueDate);

  return (
    <button onClick={onClick} className="eph-crm-list-row w-full max-w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1557D6] hover:bg-[#F8FAFC]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-[16px] font-black leading-tight text-[#06194A]">{customer.firstName} {customer.lastName}</h3>
            <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
            {(customer.roles || []).slice(0, 3).map((role) => <RolePill key={role} role={role} />)}
          </div>

          <p className="mt-1 line-clamp-2 break-words text-xs font-bold leading-5 text-slate-500">{[customer.phone, customer.city, money(customer.budget)].filter(Boolean).join(" · ")}</p>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <InsightBox title="Son Aktivite" badge={activityTypeLabel(latestActivity?.type)} text={latestActivity?.note || "Aktivite yok"} />
            <InsightBox title="Sonraki Görev" badge={nextTask?.dueDate ? formatShortDate(nextTask.dueDate) : "Plan yok"} text={nextTask?.title || "Planlı görev yok"} urgent={nextTaskSoon} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 lg:w-[300px]">
          <MiniCounter label="Aktivite" value={String(customer._count?.activities || 0)} />
          <MiniCounter label="Görev" value={String(customer._count?.tasks || 0)} />
          <MiniCounter label="Talep" value={String(customer._count?.interests || 0)} />
          <MiniCounter label="Portföy" value={String(customer._count?.properties || 0)} />
        </div>
      </div>
    </button>
  );
}

function RolePill({ role, label }: { role: string; label?: string }) {
  return <span className="max-w-full break-words rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-black leading-4 text-blue-700">{label || roleLabel(role)}</span>;
}

function InsightBox({ title, badge, text, urgent }: { title: string; badge: string; text: string; urgent?: boolean }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl p-3 ${urgent ? "bg-red-50" : "bg-[#F8FAFC]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`min-w-0 truncate text-[10px] font-black uppercase tracking-wide ${urgent ? "text-red-500" : "text-slate-400"}`}>{title}</span>
        <span className={`max-w-[52%] shrink-0 truncate rounded-full bg-white px-2 py-1 text-[9px] font-black ${urgent ? "text-red-600" : "text-slate-500"}`}>{badge}</span>
      </div>
      <p className={`mt-2 line-clamp-2 break-words text-xs font-bold leading-5 ${urgent ? "text-red-700" : "text-slate-600"}`}>{text}</p>
    </div>
  );
}

function MiniCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="line-clamp-2 break-words text-sm font-black leading-tight text-[#06194A]">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function AddCustomerModal({
  form,
  setForm,
  formLoading,
  provinceOptions,
  provinceLoading,
  onSubmit,
  onClose,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  formLoading: boolean;
  provinceOptions: GeoOption[];
  provinceLoading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const selectedStatus = PIPELINE_STAGES.find((stage) => stage.key === form.status) || PIPELINE_STAGES[0];

  const [customerDistrictOptions, setCustomerDistrictOptions] = useState<GeoOption[]>([]);
  const [customerNeighborhoodOptions, setCustomerNeighborhoodOptions] = useState<GeoOption[]>([]);
  const [customerDistrictLoading, setCustomerDistrictLoading] = useState(false);
  const [customerNeighborhoodLoading, setCustomerNeighborhoodLoading] = useState(false);

  const setField = (key: string, value: string) => {
    setForm((current: any) => ({ ...current, [key]: value }));
  };

  const setInterestedGeo = (patch: Partial<{ interestedCity: string; interestedDistrict: string; interestedNeighborhood: string }>) => {
    setForm((current: any) => {
      const next = {
        ...current,
        ...patch,
      };

      next.interestedArea = buildInterestedArea(next.interestedCity, next.interestedDistrict, next.interestedNeighborhood);

      return next;
    });
  };

  useEffect(() => {
    let active = true;

    setCustomerDistrictOptions([]);
    setCustomerNeighborhoodOptions([]);

    if (!form.interestedCity) return;

    setCustomerDistrictLoading(true);

    fetchDistrictOptionsForCity(form.interestedCity)
      .then((options) => {
        if (!active) return;
        setCustomerDistrictOptions(ensureSelectedOption(options, form.interestedDistrict));
      })
      .catch(() => {
        if (active) setCustomerDistrictOptions(ensureSelectedOption([], form.interestedDistrict));
      })
      .finally(() => {
        if (active) setCustomerDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.interestedCity, form.interestedDistrict]);

  useEffect(() => {
    let active = true;

    setCustomerNeighborhoodOptions([]);

    if (!form.interestedCity || !form.interestedDistrict) return;

    const selectedDistrict = customerDistrictOptions.find((district) => district.name === form.interestedDistrict);
    setCustomerNeighborhoodLoading(true);

    fetchPlaceOptionsForDistrict(form.interestedCity, form.interestedDistrict, selectedDistrict?.id)
      .then((options) => {
        if (!active) return;
        setCustomerNeighborhoodOptions(ensureSelectedOption(options, form.interestedNeighborhood));
      })
      .catch(() => {
        if (active) setCustomerNeighborhoodOptions(ensureSelectedOption([], form.interestedNeighborhood));
      })
      .finally(() => {
        if (active) setCustomerNeighborhoodLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.interestedCity, form.interestedDistrict, form.interestedNeighborhood, customerDistrictOptions]);

  return (
    <div className="eph-crm-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/60 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div
        className="eph-crm-modal-panel flex h-[min(94dvh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[92dvh] md:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="eph-crm-modal-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 pb-4 pt-[calc(14px+env(safe-area-inset-top,0px))] backdrop-blur md:p-5">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-200 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1557D6]">CRM V2</p>
              <h2 className="mt-1 text-[22px] font-black tracking-tight text-[#06194A] md:text-[25px]">Yeni Müşteri Ekle</h2>
              <p className="mx-auto mt-2 max-w-xl text-xs font-bold leading-5 text-slate-500">
                Önce kimlik ve iletişim, sonra rol + talep profili. Boş bırakılan alanlar CRM kartında gizlenir.
              </p>
            </div>

            <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 md:static">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="eph-crm-modal-body flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
          <FormSection title="1. Temel Bilgiler">
            <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-3 md:p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Ad *"><input className="premium-input" placeholder="Örn. Ahmet" value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} /></Field>
                <Field label="Soyad *"><input className="premium-input" placeholder="Örn. Yılmaz" value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} /></Field>
                <Field label="Telefon"><input className="premium-input" inputMode="tel" placeholder="05xx xxx xx xx" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
                <Field label="E-posta"><input className="premium-input" type="email" inputMode="email" placeholder="ornek@mail.com" value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field>
                <Field label="Şehir">
                  <select className="premium-input" value={form.city} onChange={(event) => setField("city", event.target.value)}>
                    <option value="">{provinceLoading ? "Şehirler yükleniyor..." : "Şehir seç"}</option>
                    {provinceOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
                  </select>
                </Field>
                <Field label="Meslek / Ünvan"><input className="premium-input" placeholder="Örn. Öğretmen, yatırımcı" value={form.profession} onChange={(event) => setField("profession", event.target.value)} /></Field>
                <div className="md:col-span-2">
                  <Field label="Firma"><input className="premium-input" placeholder="Varsa firma / ofis adı" value={form.company} onChange={(event) => setField("company", event.target.value)} /></Field>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="2. Müşteri Rolleri">
            <div className="rounded-[24px] border border-slate-200 bg-white p-3 md:p-4">
              <p className="mb-3 text-center text-xs font-bold leading-5 text-slate-500">Bir müşteri aynı anda alıcı, satıcı, yatırımcı veya mal sahibi olabilir.</p>
              <MultiOptionGrid options={CUSTOMER_ROLES} value={form.roles} onChange={(roles) => setForm((current: any) => ({ ...current, roles }))} />
            </div>
          </FormSection>

          <FormSection title="3. İlgi & Bütçe">
            <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-3 md:p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Bütçe">
                  <input
                    className="premium-input"
                    inputMode="numeric"
                    type="text"
                    placeholder="Örn. 5.000.000 TL"
                    value={formatBudgetInput(form.budget)}
                    onChange={(event) => setField("budget", onlyDigits(event.target.value))}
                  />
                </Field>
                <Field label="İlgilendiği İl">
                  <select
                    className="premium-input"
                    value={form.interestedCity}
                    onChange={(event) => setInterestedGeo({ interestedCity: event.target.value, interestedDistrict: "", interestedNeighborhood: "" })}
                  >
                    <option value="">{provinceLoading ? "İller yükleniyor..." : "İl seç"}</option>
                    {provinceOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
                  </select>
                </Field>
                <Field label="İlgilendiği İlçe">
                  <select
                    className="premium-input"
                    value={form.interestedDistrict}
                    onChange={(event) => setInterestedGeo({ interestedDistrict: event.target.value, interestedNeighborhood: "" })}
                    disabled={!form.interestedCity || customerDistrictLoading}
                  >
                    <option value="">{customerDistrictLoading ? "İlçeler yükleniyor..." : "İlçe seç"}</option>
                    {customerDistrictOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
                  </select>
                </Field>
                <Field label="İlgilendiği Mahalle">
                  <select
                    className="premium-input"
                    value={form.interestedNeighborhood}
                    onChange={(event) => setInterestedGeo({ interestedNeighborhood: event.target.value })}
                    disabled={!form.interestedCity || !form.interestedDistrict || customerNeighborhoodLoading}
                  >
                    <option value="">{customerNeighborhoodLoading ? "Mahalleler yükleniyor..." : "Mahalle seç"}</option>
                    {customerNeighborhoodOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-xs font-black text-slate-500">
                Seçili bölge: <span className="text-[#1557D6]">{form.interestedArea || "Henüz seçilmedi"}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
                {BUDGET_PRESETS.map((preset) => (
                  <button key={preset.value} type="button" onClick={() => setField("budget", preset.value)} className={`rounded-2xl border px-2 py-2 text-xs font-black ${form.budget === preset.value ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-slate-200 bg-white text-slate-500"}`}>
                    {preset.label}
                  </button>
                ))}
              </div>


              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Mülk Tipi">
                  <select className="premium-input" value={form.interestedType} onChange={(event) => setField("interestedType", event.target.value)}>
                    <option value="">Mülk tipi seç</option>
                    {PROPERTY_TYPE_OPTIONS.map((item) => <option key={item.key} value={item.label}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="Lead Kaynağı">
                  <select className="premium-input" value={form.source} onChange={(event) => setField("source", event.target.value)}>
                    <option value="">Kaynak seç</option>
                    {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Durum">
                    <select className="premium-input" value={form.status} onChange={(event) => setField("status", event.target.value)}>
                      {PIPELINE_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                    </select>
                  </Field>
                  <div className="mt-2 rounded-2xl px-3 py-2 text-center text-xs font-black" style={{ backgroundColor: selectedStatus.bg, color: selectedStatus.color }}>
                    CRM aşaması: {selectedStatus.label}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="4. Etiketler">
            <div className="rounded-[24px] border border-slate-200 bg-white p-3 md:p-4">
              <MultiOptionGrid options={TAGS.map((tag) => ({ key: tag, label: tag }))} value={form.tags} onChange={(tags) => setForm((current: any) => ({ ...current, tags }))} />
            </div>
          </FormSection>

          <FormSection title="5. Not">
            <textarea className="premium-input min-h-[104px] resize-none py-3 text-left" placeholder="Müşterinin özel notu, beklentisi, randevu bilgisi..." value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-4 backdrop-blur md:p-5">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button onClick={onSubmit} disabled={formLoading || !form.firstName || !form.lastName} className="flex h-12 items-center justify-center rounded-2xl bg-[#1557D6] px-4 text-sm font-black text-white disabled:opacity-50">
              {formLoading ? "Kaydediliyor..." : "Müşteri Ekle"}
            </button>
            <button onClick={onClose} className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-500">İptal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
  onStatusChange,
  onUpdateRoles,
  activityForm,
  setActivityForm,
  activityLoading,
  onAddActivity,
  taskForm,
  setTaskForm,
  taskLoading,
  onAddTask,
  onTaskDone,
  interestForm,
  setInterestForm,
  interestLoading,
  onAddInterest,
  onDeleteInterest,
  onDeleteCustomerProperty,
  provinceOptions,
  districtOptions,
  neighborhoodOptions,
  provinceLoading,
  districtLoading,
  neighborhoodLoading,
}: {
  customer: Customer;
  onClose: () => void;
  onStatusChange: (customerId: string, status: string) => void;
  onUpdateRoles: (roles: string[]) => void;
  activityForm: { type: string; note: string };
  setActivityForm: React.Dispatch<React.SetStateAction<{ type: string; note: string }>>;
  activityLoading: boolean;
  onAddActivity: () => void;
  taskForm: { title: string; dueDate: string };
  setTaskForm: React.Dispatch<React.SetStateAction<{ title: string; dueDate: string }>>;
  taskLoading: boolean;
  onAddTask: () => void;
  onTaskDone: (taskId: string) => void;
  interestForm: ReturnType<typeof emptyInterestForm>;
  setInterestForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyInterestForm>>>;
  interestLoading: boolean;
  onAddInterest: () => void;
  onDeleteInterest: (interestId: string) => void;
  onDeleteCustomerProperty: (propertyId: string) => void;
  provinceOptions: GeoOption[];
  districtOptions: GeoOption[];
  neighborhoodOptions: GeoOption[];
  provinceLoading: boolean;
  districtLoading: boolean;
  neighborhoodLoading: boolean;
}) {
  const stage = stageInfo(customer.status);
  const [activeTab, setActiveTab] = useState<"genel" | "roller" | "ilgiler" | "gayrimenkuller" | "aktiviteler" | "gorevler">("genel");

  const tabs = [
    { key: "genel", label: "Genel" },
    { key: "roller", label: "Roller" },
    { key: "ilgiler", label: "İlgi Bölgeleri" },
    { key: "gayrimenkuller", label: "Gayrimenkuller" },
    { key: "aktiviteler", label: "Aktivite" },
    { key: "gorevler", label: "Görev" },
  ] as const;

  return (
    <div className="eph-crm-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-[#06194A]/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="eph-crm-modal-panel eph-crm-detail-panel max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="eph-crm-modal-header sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 break-words text-[26px] font-black leading-tight tracking-tight text-[#06194A]">{customer.firstName} {customer.lastName}</h2>
              <p className="mt-1 line-clamp-2 break-words text-sm font-bold leading-5 text-slate-500">{[customer.phone, customer.city].filter(Boolean).join(" · ")}</p>
            </div>

            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><X size={20} /></button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <select className="premium-input" style={{ color: stage.color }} value={customer.status} onChange={(event) => onStatusChange(customer.id, event.target.value)}>
              {PIPELINE_STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <div className="min-w-0 rounded-2xl bg-blue-50 px-4 py-3 text-center text-xs font-black text-blue-700">
              Lina Talep Profili: {(customer.interests || []).filter((item) => item.isActive).length}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-2xl px-2 py-3 text-[11px] font-black ${activeTab === tab.key ? "bg-[#1557D6] text-white" : "bg-[#F8FAFC] text-slate-500"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="eph-crm-modal-body space-y-6 p-5">
          {activeTab === "genel" && <GeneralTab customer={customer} />}
          {activeTab === "roller" && <RolesTab customer={customer} onUpdateRoles={onUpdateRoles} />}
          {activeTab === "ilgiler" && (
            <InterestsTab
              customer={customer}
              interestForm={interestForm}
              setInterestForm={setInterestForm}
              interestLoading={interestLoading}
              onAddInterest={onAddInterest}
              onDeleteInterest={onDeleteInterest}
              provinceOptions={provinceOptions}
              districtOptions={districtOptions}
              neighborhoodOptions={neighborhoodOptions}
              provinceLoading={provinceLoading}
              districtLoading={districtLoading}
              neighborhoodLoading={neighborhoodLoading}
            />
          )}
          {activeTab === "gayrimenkuller" && <PropertiesTab customer={customer} onDeleteCustomerProperty={onDeleteCustomerProperty} />}
          {activeTab === "aktiviteler" && <ActivitiesTab customer={customer} activityForm={activityForm} setActivityForm={setActivityForm} activityLoading={activityLoading} onAddActivity={onAddActivity} />}
          {activeTab === "gorevler" && <TasksTab customer={customer} taskForm={taskForm} setTaskForm={setTaskForm} taskLoading={taskLoading} onAddTask={onAddTask} onTaskDone={onTaskDone} />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab({ customer }: { customer: Customer }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { label: "Bütçe", value: money(customer.budget) },
          { label: "İlgilendiği Bölge", value: customer.interestedArea || "—" },
          { label: "Mülk Tipi", value: customer.interestedType || "—" },
          { label: "Kaynak", value: customer.source || "—" },
          { label: "Meslek", value: customer.profession || "—" },
          { label: "Firma", value: customer.company || "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-[#F8FAFC] p-4 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-2 break-words text-sm font-black leading-5 text-[#06194A]">{item.value}</p>
          </div>
        ))}
      </div>

      <FormSection title="Roller">
        <div className="flex flex-wrap justify-center gap-2">
          {customer.roles?.length ? customer.roles.map((role) => <RolePill key={role} role={role} />) : <span className="text-sm font-bold text-slate-400">Rol seçilmemiş</span>}
        </div>
      </FormSection>

      {customer.tags?.length > 0 && (
        <FormSection title="Etiketler">
          <div className="flex flex-wrap justify-center gap-2">{customer.tags.map((tag) => <span key={tag} className="max-w-full break-words rounded-full border border-slate-200 px-3 py-2 text-xs font-black leading-4 text-slate-500">{tag}</span>)}</div>
        </FormSection>
      )}

      {customer.notes && (
        <FormSection title="Not">
          <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-semibold leading-6 text-slate-600 break-words whitespace-pre-line">{customer.notes}</div>
        </FormSection>
      )}
    </>
  );
}

function RolesTab({ customer, onUpdateRoles }: { customer: Customer; onUpdateRoles: (roles: string[]) => void }) {
  const selectedRoles = customer.roles || [];
  return (
    <FormSection title="Müşteri Rolleri">
      <p className="mb-4 text-center text-sm font-semibold leading-6 text-slate-500">Bir müşteri aynı anda alıcı, satıcı, yatırımcı veya mal sahibi olabilir. Lina eşleşme motoru bu rolleri dikkate alır.</p>
      <MultiOptionGrid options={CUSTOMER_ROLES} value={selectedRoles} onChange={onUpdateRoles} />
    </FormSection>
  );
}

function InterestsTab({
  customer,
  interestForm,
  setInterestForm,
  interestLoading,
  onAddInterest,
  onDeleteInterest,
  provinceOptions,
  districtOptions,
  neighborhoodOptions,
  provinceLoading,
  districtLoading,
  neighborhoodLoading,
}: {
  customer: Customer;
  interestForm: ReturnType<typeof emptyInterestForm>;
  setInterestForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyInterestForm>>>;
  interestLoading: boolean;
  onAddInterest: () => void;
  onDeleteInterest: (interestId: string) => void;
  provinceOptions: GeoOption[];
  districtOptions: GeoOption[];
  neighborhoodOptions: GeoOption[];
  provinceLoading: boolean;
  districtLoading: boolean;
  neighborhoodLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-blue-100 bg-blue-50/60 p-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700"><Sparkles size={22} /></div>
        <h3 className="mt-3 text-lg font-black text-[#06194A]">Lina Talep Profili</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Müşterinin aradığı bölge, bütçe, mülk tipi ve özellikleri burada tutulur. İleride havuza uygun portföy düştüğünde Lina bu profillerden eşleşme üretecek.</p>
      </section>

      <FormSection title="Yeni İlgi Bölgesi / Talep Profili">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Başlık"><input className="premium-input" placeholder="Örn: Bostanlı 3+1 yatırım" value={interestForm.title} onChange={(event) => setInterestForm((current) => ({ ...current, title: event.target.value }))} /></Field>

          <Field label={provinceLoading ? "İl yükleniyor..." : "İl"}>
            <select
              className="premium-input"
              value={interestForm.city}
              onChange={(event) =>
                setInterestForm((current) => ({
                  ...current,
                  city: event.target.value,
                  district: "",
                  neighborhood: "",
                }))
              }
            >
              <option value="">İl seçiniz</option>
              {ensureSelectedOption(provinceOptions, interestForm.city).map((province) => (
                <option key={province.id || province.name} value={province.name}>{province.name}</option>
              ))}
            </select>
          </Field>

          <Field label={districtLoading ? "İlçe yükleniyor..." : "İlçe"}>
            <select
              className="premium-input"
              value={interestForm.district}
              disabled={!interestForm.city || districtLoading}
              onChange={(event) =>
                setInterestForm((current) => ({
                  ...current,
                  district: event.target.value,
                  neighborhood: "",
                }))
              }
            >
              <option value="">İlçe seçiniz</option>
              {ensureSelectedOption(districtOptions, interestForm.district).map((district) => (
                <option key={district.id || district.name} value={district.name}>{district.name}</option>
              ))}
            </select>
          </Field>

          <Field label={neighborhoodLoading ? "Mahalle / Muhit yükleniyor..." : "Mahalle / Muhit"}>
            <select
              className="premium-input"
              value={interestForm.neighborhood}
              disabled={!interestForm.city || !interestForm.district || neighborhoodLoading}
              onChange={(event) => setInterestForm((current) => ({ ...current, neighborhood: event.target.value }))}
            >
              <option value="">Mahalle / muhit seçiniz</option>
              {ensureSelectedOption(neighborhoodOptions, interestForm.neighborhood).map((neighborhood) => (
                <option key={neighborhood.id || neighborhood.name} value={neighborhood.name}>{neighborhood.name}</option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Haritadan Bölge İşaretle">
              <GoogleGeoPicker
                city={interestForm.city}
                district={interestForm.district}
                address={interestForm.neighborhood}
                title="Talep Bölgesi"
                subtitle="İstersen yukarıdan manuel seç, istersen haritadan işaretle."
                buttonLabel="Haritadan Seç"
                modalTitle="CRM Talep Bölgesi"
                modalSubtitle="Adres, mahalle veya muhit ara; doğru noktayı seç; Lina eşleşmesi için kaydet."
                selectedLabel="Seçilen Talep Bölgesi"
                emptyText="Manuel seçim yapabilir veya haritadan bölge işaretleyebilirsin."
                confirmMessageTitle="Bu bölgeyi müşteri talep profiline eklemek istediğinizden emin misiniz?"
                onChange={(location) =>
                  setInterestForm((current) => ({
                    ...current,
                    city: location.city || current.city,
                    district: location.district || current.district,
                    neighborhood: location.address || current.neighborhood,
                  }))
                }
              />
            </Field>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MiniCounter label="İl" value={interestForm.city || "Seçilmedi"} />
              <MiniCounter label="İlçe" value={interestForm.district || "Seçilmedi"} />
              <MiniCounter label="Mahalle" value={interestForm.neighborhood || "Seçilmedi"} />
            </div>
          </div>
          <Field label="Min Bütçe"><input className="premium-input" type="number" value={interestForm.minBudget} onChange={(event) => setInterestForm((current) => ({ ...current, minBudget: event.target.value }))} /></Field>
          <Field label="Max Bütçe"><input className="premium-input" type="number" value={interestForm.maxBudget} onChange={(event) => setInterestForm((current) => ({ ...current, maxBudget: event.target.value }))} /></Field>
          <Field label="Min m²"><input className="premium-input" type="number" value={interestForm.minArea} onChange={(event) => setInterestForm((current) => ({ ...current, minArea: event.target.value }))} /></Field>
          <Field label="Max m²"><input className="premium-input" type="number" value={interestForm.maxArea} onChange={(event) => setInterestForm((current) => ({ ...current, maxArea: event.target.value }))} /></Field>
          <Field label="Niyet"><select className="premium-input" value={interestForm.purchaseIntent} onChange={(event) => setInterestForm((current) => ({ ...current, purchaseIntent: event.target.value }))}>{PURCHASE_INTENTS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></Field>
          <Field label="Öncelik"><select className="premium-input" value={interestForm.priority} onChange={(event) => setInterestForm((current) => ({ ...current, priority: event.target.value }))}>{PRIORITIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></Field>
        </div>

        <div className="mt-4 space-y-4">
          <ChoiceBlock title="Mülk Tipleri"><MultiOptionGrid options={PROPERTY_TYPE_OPTIONS} value={interestForm.propertyTypes} onChange={(propertyTypes) => setInterestForm((current) => ({ ...current, propertyTypes }))} /></ChoiceBlock>
          <ChoiceBlock title="Durum"><MultiOptionGrid options={UNIT_STATUS_OPTIONS} value={interestForm.statuses} onChange={(statuses) => setInterestForm((current) => ({ ...current, statuses }))} /></ChoiceBlock>
          <ChoiceBlock title="Oda Sayısı"><MultiOptionGrid options={ROOM_OPTIONS.map((item) => ({ key: item, label: item }))} value={interestForm.roomCounts} onChange={(roomCounts) => setInterestForm((current) => ({ ...current, roomCounts }))} /></ChoiceBlock>
          <ChoiceBlock title="Ek Özellikler"><MultiOptionGrid options={FEATURE_OPTIONS.map((item) => ({ key: item, label: item }))} value={interestForm.features} onChange={(features) => setInterestForm((current) => ({ ...current, features }))} /></ChoiceBlock>
        </div>

        <div className="mt-4">
          <textarea className="premium-input min-h-[90px] resize-none py-3" placeholder="Talep notu..." value={interestForm.notes} onChange={(event) => setInterestForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>

        <button onClick={onAddInterest} disabled={interestLoading} className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#1557D6] text-sm font-black text-white disabled:opacity-50">
          {interestLoading ? "Kaydediliyor..." : "Talep Profilini Kaydet"}
        </button>
      </FormSection>

      <FormSection title="Kayıtlı İlgi Bölgeleri">
        <div className="space-y-3">
          {customer.interests?.length ? customer.interests.map((interest) => <InterestCard key={interest.id} interest={interest} onDelete={() => onDeleteInterest(interest.id)} />) : <EmptyBox text="Henüz ilgi bölgesi veya talep profili yok." />}
        </div>
      </FormSection>
    </div>
  );
}

function InterestCard({ interest, onDelete }: { interest: CustomerInterest; onDelete: () => void }) {
  return (
    <div className={`rounded-[24px] border p-4 ${interest.isActive ? "border-blue-100 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-black leading-tight text-[#06194A]">{interest.title || "Talep Profili"}</p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-xs font-bold leading-5 text-slate-500"><MapPin size={13} className="shrink-0" /><span className="min-w-0 break-words">{[interest.city, interest.district, interest.neighborhood].filter(Boolean).join(" / ") || "Bölge belirtilmedi"}</span></p>
        </div>
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={16} /></button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniCounter label="Niyet" value={optionLabel(PURCHASE_INTENTS, interest.purchaseIntent)} />
        <MiniCounter label="Öncelik" value={optionLabel(PRIORITIES, interest.priority)} />
        <MiniCounter label="Min" value={money(interest.minBudget)} />
        <MiniCounter label="Max" value={money(interest.maxBudget)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(interest.propertyTypes || []).map((item) => <Chip key={item}>{optionLabel(PROPERTY_TYPE_OPTIONS, item)}</Chip>)}
        {(interest.roomCounts || []).map((item) => <Chip key={item}>{item}</Chip>)}
        {(interest.features || []).map((item) => <Chip key={item}>{item}</Chip>)}
      </div>

      {interest.notes && <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-[#F8FAFC] p-3 text-xs font-semibold leading-5 text-slate-600">{interest.notes}</p>}
    </div>
  );
}

function PropertiesTab({ customer, onDeleteCustomerProperty }: { customer: Customer; onDeleteCustomerProperty: (propertyId: string) => void }) {
  return (
    <FormSection title="Sahip Olduğu / İlişkili Gayrimenkuller">
      <div className="space-y-3">
        {customer.properties?.length ? customer.properties.map((property) => <PropertyCard key={property.id} property={property} onDelete={() => onDeleteCustomerProperty(property.id)} />) : <EmptyBox text="Bu müşteri ile ilişkilendirilmiş gayrimenkul yok. Portföy bağlantısı API altyapısı hazır; seçim ekranı sonraki pakette eklenecek." />}
      </div>
    </FormSection>
  );
}

function PropertyCard({ property, onDelete }: { property: CustomerProperty; onDelete: () => void }) {
  const unit = property.unit;
  const project = unit?.project;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-sm font-black text-[#06194A]"><Home size={17} className="shrink-0" /><span className="line-clamp-2 break-words">{project?.name || "Portföy"}</span></p>
          <p className="mt-1 line-clamp-2 break-words text-xs font-bold leading-5 text-slate-500">{[project?.city, project?.district, unit?.number ? `No: ${unit.number}` : null].filter(Boolean).join(" / ")}</p>
        </div>
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={16} /></button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniCounter label="İlişki" value={property.relationType} />
        <MiniCounter label="Tip" value={unit?.type || "—"} />
        <MiniCounter label="Durum" value={unit?.status || "—"} />
        <MiniCounter label="Fiyat" value={money(unit?.price)} />
      </div>

      {property.notes && <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-[#F8FAFC] p-3 text-xs font-semibold leading-5 text-slate-600">{property.notes}</p>}
    </div>
  );
}

function ActivitiesTab({ customer, activityForm, setActivityForm, activityLoading, onAddActivity }: { customer: Customer; activityForm: { type: string; note: string }; setActivityForm: React.Dispatch<React.SetStateAction<{ type: string; note: string }>>; activityLoading: boolean; onAddActivity: () => void }) {
  return (
    <FormSection title="Aktivite Ekle">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_auto]">
        <select className="premium-input" value={activityForm.type} onChange={(event) => setActivityForm((current) => ({ ...current, type: event.target.value }))}>{ACTIVITY_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select>
        <input className="premium-input" placeholder="Not ekle..." value={activityForm.note} onChange={(event) => setActivityForm((current) => ({ ...current, note: event.target.value }))} />
        <button onClick={onAddActivity} disabled={activityLoading || !activityForm.note} className="h-12 rounded-2xl bg-[#1557D6] px-5 text-sm font-black text-white disabled:opacity-50">Ekle</button>
      </div>

      <div className="mt-3 space-y-2">
        {customer.activities?.length ? customer.activities.map((activity) => (
          <div key={activity.id} className="rounded-2xl bg-[#F8FAFC] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#1557D6]">{activityTypeLabel(activity.type)}</p>
            <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#06194A]">{activity.note}</p>
            <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(activity.createdAt)}</p>
          </div>
        )) : <EmptyBox text="Henüz aktivite yok" />}
      </div>
    </FormSection>
  );
}

function TasksTab({ customer, taskForm, setTaskForm, taskLoading, onAddTask, onTaskDone }: { customer: Customer; taskForm: { title: string; dueDate: string }; setTaskForm: React.Dispatch<React.SetStateAction<{ title: string; dueDate: string }>>; taskLoading: boolean; onAddTask: () => void; onTaskDone: (taskId: string) => void }) {
  return (
    <FormSection title="Görevler">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto]">
        <input className="premium-input" placeholder="Görev ekle..." value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
        <input className="premium-input" type="datetime-local" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
        <button onClick={onAddTask} disabled={taskLoading || !taskForm.title} className="h-12 rounded-2xl bg-[#06194A] px-5 text-sm font-black text-white disabled:opacity-50">Ekle</button>
      </div>

      <div className="mt-3 space-y-2">
        {customer.tasks?.length ? customer.tasks.map((task) => {
          const soon = isTaskSoon(task.dueDate);
          return (
            <button key={task.id} onClick={() => task.status !== "TAMAMLANDI" && onTaskDone(task.id)} className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border p-4 text-left ${soon ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm font-black leading-5 ${task.status === "TAMAMLANDI" ? "text-slate-400 line-through" : "text-[#06194A]"}`}>{task.title}</p>
                {task.dueDate && <p className={`mt-2 text-xs font-black ${soon ? "text-red-600" : "text-slate-400"}`}>{formatDateTime(task.dueDate)}</p>}
              </div>
              {task.status === "TAMAMLANDI" && <CheckCircle2 size={20} className="text-emerald-600" />}
            </button>
          );
        }) : <EmptyBox text="Henüz görev yok" />}
      </div>
    </FormSection>
  );
}

function MultiOptionGrid({ options, value, onChange }: { options: { key: string; label: string }[]; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const active = value.includes(option.key);
        return (
          <button key={option.key} type="button" onClick={() => onChange(active ? value.filter((item) => item !== option.key) : [...value, option.key])} className={`min-h-[42px] rounded-2xl border px-2 py-2 text-center text-[11px] font-black leading-4 md:px-3 md:py-3 md:text-xs ${active ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-slate-200 bg-white text-slate-500"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="max-w-full break-words rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-[11px] font-black leading-4 text-slate-600">{children}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[#F8FAFC] p-4 text-center text-sm font-bold leading-6 text-slate-400 break-words">{text}</div>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 text-center text-xs font-black uppercase tracking-wide text-[#1557D6]">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-center text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}
