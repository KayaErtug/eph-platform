"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  ListFilter,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  WalletCards,
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

type GeoOption = {
  id: string;
  name: string;
};

const TURKIYE_API_BASE_URL = "https://turkiyeapi.dev/api/v1";

const TURKIYE_KKTC_CITIES = [
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
  "Lefkoşa",
  "Girne",
  "Gazimağusa",
  "İskele",
  "Güzelyurt",
  "Lefke",
];

const KKTC_CITIES = new Set(["Lefkoşa", "Girne", "Gazimağusa", "İskele", "Güzelyurt", "Lefke"]);

const FALLBACK_PROVINCE_OPTIONS = TURKIYE_KKTC_CITIES.map((city) => ({
  id: city,
  name: city,
})).sort((a, b) => a.name.localeCompare(b.name, "tr"));

function uniqueSortedGeoOptions(options: GeoOption[]) {
  const seen = new Set<string>();

  return options
    .filter((option) => option.name.trim())
    .filter((option) => {
      const key = option.name.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
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
      item?.mahalle ||
      item?.mahalleAdi ||
      item?.title ||
      "",
  ).trim();
}

function readGeoOptionId(item: any, fallbackName: string) {
  return String(item?.id || item?.code || item?.plateNumber || item?.plate || fallbackName).trim();
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

async function fetchGeoOptions(path: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`${TURKIYE_API_BASE_URL}${path}?${searchParams.toString()}`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Coğrafi veri yüklenemedi.");
  }

  return normalizeGeoOptions(await response.json());
}

function ensureSelectedOption(options: GeoOption[], selectedValue: string) {
  if (!selectedValue) return options;
  if (options.some((option) => option.name === selectedValue)) return options;
  return uniqueSortedGeoOptions([{ id: selectedValue, name: selectedValue }, ...options]);
}

function fallbackDistrictOptions(city: string): GeoOption[] {
  if (!city) return [];
  if (KKTC_CITIES.has(city)) return [{ id: "Merkez", name: "Merkez" }];
  return [];
}

function fallbackNeighborhoodOptions(city: string, district: string): GeoOption[] {
  if (!city || !district) return [];
  if (KKTC_CITIES.has(city)) return [{ id: "Merkez", name: "Merkez" }];
  return [];
}


function money(value?: number) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
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
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [showAddModal, setShowAddModal] = useState(false);
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

    fetchGeoOptions("/provinces", { limit: 100, sort: "name" })
      .then((options) => {
        if (!active) return;
        const mergedOptions = uniqueSortedGeoOptions([...options, ...FALLBACK_PROVINCE_OPTIONS]);
        setProvinceOptions(mergedOptions.length ? mergedOptions : FALLBACK_PROVINCE_OPTIONS);
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

    const fallbackOptions = fallbackDistrictOptions(interestForm.city);
    setDistrictLoading(true);

    fetchGeoOptions("/districts", { province: interestForm.city, limit: 1000, sort: "name" })
      .then((options) => {
        if (!active) return;
        const mergedOptions = uniqueSortedGeoOptions([...options, ...fallbackOptions]);
        setDistrictOptionsList(ensureSelectedOption(mergedOptions, interestForm.district));
      })
      .catch(() => {
        if (active) setDistrictOptionsList(ensureSelectedOption(fallbackOptions, interestForm.district));
      })
      .finally(() => {
        if (active) setDistrictLoading(false);
      });

    return () => {
      active = false;
    };
  }, [interestForm.city]);

  useEffect(() => {
    let active = true;

    setNeighborhoodOptionsList([]);

    if (!interestForm.city || !interestForm.district) return;

    const fallbackOptions = fallbackNeighborhoodOptions(interestForm.city, interestForm.district);
    setNeighborhoodLoading(true);

    fetchGeoOptions("/neighborhoods", {
      province: interestForm.city,
      district: interestForm.district,
      limit: 5000,
      sort: "name",
    })
      .then((options) => {
        if (!active) return;
        const mergedOptions = uniqueSortedGeoOptions([...options, ...fallbackOptions]);
        setNeighborhoodOptionsList(ensureSelectedOption(mergedOptions, interestForm.neighborhood));
      })
      .catch(() => {
        if (active) setNeighborhoodOptionsList(ensureSelectedOption(fallbackOptions, interestForm.neighborhood));
      })
      .finally(() => {
        if (active) setNeighborhoodLoading(false);
      });

    return () => {
      active = false;
    };
  }, [interestForm.city, interestForm.district]);

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
      await api.post("/crm/customers", { ...form, budget: form.budget ? parseFloat(form.budget) : undefined });
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

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return customers;

    return customers.filter((customer) =>
      [
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
        .includes(keyword),
    );
  }, [customers, search]);

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

  const totalBudget = customers.reduce((sum, customer) => sum + (customer.budget || 0), 0);
  const closedCount = customers.filter((customer) => customer.status === "KAPANDI").length;
  const activeCount = customers.filter((customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status)).length;
  const interestCount = customers.reduce((sum, customer) => sum + (customer._count?.interests || customer.interests?.length || 0), 0);

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

  return (
    <main className="eph-v4-shell min-h-screen bg-[#F4F8FF] text-[#27364F]">
      {showAddModal && <AddCustomerModal form={form} setForm={setForm} formLoading={formLoading} onSubmit={handleAddCustomer} onClose={() => setShowAddModal(false)} />}

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

      <section className="mx-auto min-h-screen max-w-7xl px-4 pb-8 pt-5">
        <header className="mb-5 overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_42px_rgba(15,23,42,0.075)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#1557D6]">
                <BriefcaseBusiness size={14} />
                Müşteri İlişkileri V2
              </div>

              <h1 className="mt-3 text-[31px] font-black tracking-tight text-[#06194A] md:text-[42px]">CRM Merkezi</h1>

              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">
                Müşteri rolleri, talep profilleri, ilgi bölgeleri ve gayrimenkul ilişkilerini tek ekrandan yönet.
              </p>
            </div>

            <div className="flex justify-center gap-2 lg:justify-end">
              <button onClick={() => setShowAddModal(true)} className="flex h-12 items-center gap-2 rounded-2xl bg-[#1557D6] px-4 text-sm font-black text-white">
                <Plus size={18} />
                Müşteri Ekle
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard title="Toplam Müşteri" value={String(customers.length)} icon={<UsersRound size={19} />} />
            <KpiCard title="Kapanan İşlem" value={String(closedCount)} icon={<CheckCircle2 size={19} />} />
            <KpiCard title="Aktif Lead" value={String(activeCount)} icon={<Target size={19} />} />
            <KpiCard title="Talep Profili" value={String(interestCount)} icon={<Sparkles size={19} />} />
            <KpiCard title="Toplam Bütçe" value={shortMoney(totalBudget)} icon={<WalletCards size={19} />} />
          </div>
        </header>

        <section className="mb-5 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Clock3 size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#06194A]">CRM Görev Alarm Merkezi</h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Bugünkü, geciken ve yaklaşan müşteri görevlerini hızlıca takip et.</p>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <TaskSummaryCard title="Bugünkü İşlerim" value={String(todayTasks.length)} description={todayTasks[0] ? `${todayTasks[0].customerName}: ${todayTasks[0].title}` : "Bugün için planlı görev yok."} tone="blue" />
            <TaskSummaryCard title="Geciken Görevler" value={String(overdueTasks.length)} description={overdueTasks[0] ? `${overdueTasks[0].customerName}: ${overdueTasks[0].title}` : "Geciken görev yok."} tone="red" />
            <TaskSummaryCard title="Yaklaşan Görevler" value={String(upcomingTasks.length)} description={upcomingTasks[0] ? `${upcomingTasks[0].customerName}: ${upcomingTasks[0].title}` : "Yaklaşan görev yok."} tone="green" />
          </div>
        </section>

        <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Müşteri, telefon, şehir, rol veya ilgi bölgesi ara..." className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-center text-sm font-bold text-slate-700 outline-none focus:border-[#1557D6] lg:text-left" />
            </div>

            <div className="grid grid-cols-3 gap-2 lg:flex">
              <button onClick={() => setView("pipeline")} className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${view === "pipeline" ? "bg-[#1557D6] text-white" : "border border-slate-200 bg-white text-slate-500"}`}>
                <ListFilter size={17} />
                Pipeline
              </button>

              <button onClick={() => setView("list")} className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${view === "list" ? "bg-[#1557D6] text-white" : "border border-slate-200 bg-white text-slate-500"}`}>
                <FileText size={17} />
                Liste
              </button>

              <button onClick={() => setShowAddModal(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#06194A] px-4 text-sm font-black text-white">
                <Plus size={18} />
                Ekle
              </button>
            </div>
          </div>
        </section>

        {view === "pipeline" ? (
          <section className="overflow-x-auto pb-4">
            <div className="flex gap-4">
              {PIPELINE_STAGES.map((stage) => {
                const stageCustomers = (pipeline[stage.key] || []).filter((customer) => filteredCustomers.some((item) => item.id === customer.id));

                return (
                  <div key={stage.key} className="w-[300px] shrink-0">
                    <div className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: stage.bg }}>
                      <span className="text-xs font-black uppercase tracking-wide" style={{ color: stage.color }}>{stage.label}</span>
                      <span className="text-lg font-black" style={{ color: stage.color }}>{stageCustomers.length}</span>
                    </div>

                    <div className="space-y-3">
                      {stageCustomers.map((customer) => <CustomerCard key={customer.id} customer={customer} onClick={() => openCustomer(customer.id)} />)}
                      {stageCustomers.length === 0 && <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-400">Boş</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
            {filteredCustomers.length === 0 ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EFF6FF] text-[#1557D6]"><UsersRound size={30} /></div>
                <div className="text-[20px] font-black text-[#06194A]">Müşteri bulunamadı</div>
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
      `}</style>
    </main>
  );
}

function TaskSummaryCard({ title, value, description, tone }: { title: string; value: string; description: string; tone: "blue" | "red" | "green" }) {
  const style = tone === "red" ? "bg-red-50 text-red-700" : tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${style}`}><span className="text-xl font-black">{value}</span></div>
      <h3 className="mt-3 text-sm font-black text-[#06194A]">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1557D6]">{icon}</div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-[25px] font-black text-[#06194A]">{value}</p>
    </div>
  );
}

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const stage = stageInfo(customer.status);
  const latestActivity = getLatestActivity(customer);
  const nextTask = getNextTask(customer);
  const nextTaskSoon = isTaskSoon(nextTask?.dueDate);

  return (
    <button onClick={onClick} className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1557D6] hover:bg-[#F8FAFC]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-[#06194A]">{customer.firstName} {customer.lastName}</h3>
          {customer.phone && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500"><Phone size={13} />{customer.phone}</p>}
        </div>

        <span className="rounded-full px-2 py-1 text-[10px] font-black" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {(customer.roles || []).slice(0, 3).map((role) => <RolePill key={role} role={role} />)}
        {!customer.roles?.length && <RolePill role="BELIRSIZ" label="Rol Yok" />}
      </div>

      <p className="mt-3 text-[18px] font-black text-[#1557D6]">{money(customer.budget)}</p>

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
    <button onClick={onClick} className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1557D6] hover:bg-[#F8FAFC]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[16px] font-black text-[#06194A]">{customer.firstName} {customer.lastName}</h3>
            <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
            {(customer.roles || []).slice(0, 3).map((role) => <RolePill key={role} role={role} />)}
          </div>

          <p className="mt-1 truncate text-xs font-bold text-slate-500">{[customer.phone, customer.city, money(customer.budget)].filter(Boolean).join(" · ")}</p>

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
  return <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{label || roleLabel(role)}</span>;
}

function InsightBox({ title, badge, text, urgent }: { title: string; badge: string; text: string; urgent?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${urgent ? "bg-red-50" : "bg-[#F8FAFC]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black uppercase tracking-wide ${urgent ? "text-red-500" : "text-slate-400"}`}>{title}</span>
        <span className={`rounded-full bg-white px-2 py-1 text-[9px] font-black ${urgent ? "text-red-600" : "text-slate-500"}`}>{badge}</span>
      </div>
      <p className={`mt-2 line-clamp-2 text-xs font-bold leading-5 ${urgent ? "text-red-700" : "text-slate-600"}`}>{text}</p>
    </div>
  );
}

function MiniCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="truncate text-sm font-black text-[#06194A]">{value}</p>
      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function AddCustomerModal({ form, setForm, formLoading, onSubmit, onClose }: { form: any; setForm: React.Dispatch<React.SetStateAction<any>>; formLoading: boolean; onSubmit: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#06194A]/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1557D6]">CRM V2</p>
            <h2 className="mt-1 text-[25px] font-black tracking-tight text-[#06194A]">Yeni Müşteri Ekle</h2>
          </div>

          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>

        <div className="space-y-6 p-5">
          <FormSection title="Temel Bilgiler">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ad *"><input className="premium-input" value={form.firstName} onChange={(event) => setForm((current: any) => ({ ...current, firstName: event.target.value }))} /></Field>
              <Field label="Soyad *"><input className="premium-input" value={form.lastName} onChange={(event) => setForm((current: any) => ({ ...current, lastName: event.target.value }))} /></Field>
              <Field label="Telefon"><input className="premium-input" value={form.phone} onChange={(event) => setForm((current: any) => ({ ...current, phone: event.target.value }))} /></Field>
              <Field label="E-posta"><input className="premium-input" value={form.email} onChange={(event) => setForm((current: any) => ({ ...current, email: event.target.value }))} /></Field>
              <Field label="Şehir"><input className="premium-input" value={form.city} onChange={(event) => setForm((current: any) => ({ ...current, city: event.target.value }))} /></Field>
              <Field label="Meslek"><input className="premium-input" value={form.profession} onChange={(event) => setForm((current: any) => ({ ...current, profession: event.target.value }))} /></Field>
            </div>
          </FormSection>

          <FormSection title="Müşteri Rolleri">
            <MultiOptionGrid options={CUSTOMER_ROLES} value={form.roles} onChange={(roles) => setForm((current: any) => ({ ...current, roles }))} />
          </FormSection>

          <FormSection title="İlgi & Bütçe">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bütçe"><input className="premium-input" type="number" value={form.budget} onChange={(event) => setForm((current: any) => ({ ...current, budget: event.target.value }))} /></Field>
              <Field label="İlgilendiği Bölge"><input className="premium-input" value={form.interestedArea} onChange={(event) => setForm((current: any) => ({ ...current, interestedArea: event.target.value }))} /></Field>
              <Field label="Mülk Tipi"><input className="premium-input" value={form.interestedType} onChange={(event) => setForm((current: any) => ({ ...current, interestedType: event.target.value }))} /></Field>
              <Field label="Lead Kaynağı"><input className="premium-input" value={form.source} onChange={(event) => setForm((current: any) => ({ ...current, source: event.target.value }))} /></Field>
              <Field label="Durum"><select className="premium-input" value={form.status} onChange={(event) => setForm((current: any) => ({ ...current, status: event.target.value }))}>{PIPELINE_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></Field>
            </div>
          </FormSection>

          <FormSection title="Etiketler">
            <MultiOptionGrid options={TAGS.map((tag) => ({ key: tag, label: tag }))} value={form.tags} onChange={(tags) => setForm((current: any) => ({ ...current, tags }))} />
          </FormSection>

          <FormSection title="Not">
            <textarea className="premium-input min-h-[100px] resize-none py-3" value={form.notes} onChange={(event) => setForm((current: any) => ({ ...current, notes: event.target.value }))} />
          </FormSection>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-5">
          <button onClick={onSubmit} disabled={formLoading || !form.firstName || !form.lastName} className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#1557D6] text-sm font-black text-white disabled:opacity-50">{formLoading ? "Kaydediliyor..." : "Müşteri Ekle"}</button>
          <button onClick={onClose} className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-500">İptal</button>
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#06194A]/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[26px] font-black tracking-tight text-[#06194A]">{customer.firstName} {customer.lastName}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{[customer.phone, customer.city].filter(Boolean).join(" · ")}</p>
            </div>

            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><X size={20} /></button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <select className="premium-input" style={{ color: stage.color }} value={customer.status} onChange={(event) => onStatusChange(customer.id, event.target.value)}>
              {PIPELINE_STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-xs font-black text-blue-700">
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

        <div className="space-y-6 p-5">
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
            <p className="mt-2 text-sm font-black text-[#06194A]">{item.value}</p>
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
          <div className="flex flex-wrap justify-center gap-2">{customer.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-500">{tag}</span>)}</div>
        </FormSection>
      )}

      {customer.notes && (
        <FormSection title="Not">
          <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-semibold leading-6 text-slate-600">{customer.notes}</div>
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#06194A]">{interest.title || "Talep Profili"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500"><MapPin size={13} />{[interest.city, interest.district, interest.neighborhood].filter(Boolean).join(" / ") || "Bölge belirtilmedi"}</p>
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

      {interest.notes && <p className="mt-3 rounded-2xl bg-[#F8FAFC] p-3 text-xs font-semibold leading-5 text-slate-600">{interest.notes}</p>}
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-[#06194A]"><Home size={17} />{project?.name || "Portföy"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{[project?.city, project?.district, unit?.number ? `No: ${unit.number}` : null].filter(Boolean).join(" / ")}</p>
        </div>
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={16} /></button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniCounter label="İlişki" value={property.relationType} />
        <MiniCounter label="Tip" value={unit?.type || "—"} />
        <MiniCounter label="Durum" value={unit?.status || "—"} />
        <MiniCounter label="Fiyat" value={money(unit?.price)} />
      </div>

      {property.notes && <p className="mt-3 rounded-2xl bg-[#F8FAFC] p-3 text-xs font-semibold leading-5 text-slate-600">{property.notes}</p>}
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
            <p className="mt-2 text-sm font-semibold text-[#06194A]">{activity.note}</p>
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
            <button key={task.id} onClick={() => task.status !== "TAMAMLANDI" && onTaskDone(task.id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${soon ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div>
                <p className={`text-sm font-black ${task.status === "TAMAMLANDI" ? "text-slate-400 line-through" : "text-[#06194A]"}`}>{task.title}</p>
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
          <button key={option.key} type="button" onClick={() => onChange(active ? value.filter((item) => item !== option.key) : [...value, option.key])} className={`rounded-2xl border px-3 py-3 text-center text-xs font-black ${active ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-slate-200 bg-white text-slate-500"}`}>
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
  return <span className="rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-[11px] font-black text-slate-600">{children}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[#F8FAFC] p-4 text-center text-sm font-bold text-slate-400">{text}</div>;
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
      <span className="mb-2 block text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}
