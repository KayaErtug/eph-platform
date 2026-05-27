"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  Home,
  ListFilter,
  Loader2,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

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
  tags: string[];
  notes?: string;
  lastContactedAt?: string;
  updatedAt: string;
  _count?: { activities: number; tasks: number };
  activities?: Activity[];
  tasks?: Task[];
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

const PIPELINE_STAGES = [
  { key: "YENI_LEAD", label: "Yeni Lead", color: "#38BDF8", bg: "#E0F2FE" },
  { key: "ILK_GORUSME", label: "İlk Görüşme", color: "#A78BFA", bg: "#F5F3FF" },
  {
    key: "PORTFOLYO_GONDERILDI",
    label: "Portföy",
    color: "#FB923C",
    bg: "#FFF7ED",
  },
  {
    key: "YER_GOSTERIMI",
    label: "Yer Gösterimi",
    color: "#EAB308",
    bg: "#FEFCE8",
  },
  { key: "TEKLIF_SURECI", label: "Teklif", color: "#0F172A", bg: "#F1F5F9" },
  { key: "PAZARLIK", label: "Pazarlık", color: "#D97706", bg: "#FFFBEB" },
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

const TAGS = [
  "Yatırımcı",
  "Acil Alıcı",
  "Nakit Hazır",
  "Takas",
  "Yüksek Bütçe",
  "Sıcak Lead",
  "Soğuk Lead",
];

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
  return (
    PIPELINE_STAGES.find((item) => item.key === status) || PIPELINE_STAGES[0]
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Tarih yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

function isTaskSoon(value?: string) {
  if (!value) return false;
  const dueDate = new Date(value);
  const diffHours = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours <= 1 && diffHours > 0;
}

export default function CrmPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, Customer[]>>({});
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [formLoading, setFormLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
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
    tags: [] as string[],
  });

  const [activityForm, setActivityForm] = useState({
    type: "TELEFON",
    note: "",
  });
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "" });

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
      setLoading(true);
      const [customersRes, pipelineRes] = await Promise.all([
        api.get("/crm/customers"),
        api.get("/crm/pipeline"),
      ]);
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      setPipeline(pipelineRes.data || {});
    } catch (error) {
      console.error(error);
      alert("CRM bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
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
      tags: [],
    });
  };

  const handleAddCustomer = async () => {
    if (!form.firstName || !form.lastName) return;
    setFormLoading(true);
    try {
      await api.post("/crm/customers", {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
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
    if (selectedCustomer?.id === customerId)
      setSelectedCustomer((prev) => (prev ? { ...prev, status } : null));
  };

  const handleAddActivity = async () => {
    if (!selectedCustomer || !activityForm.note) return;
    setActivityLoading(true);
    try {
      await api.post(
        `/crm/customers/${selectedCustomer.id}/activities`,
        activityForm,
      );
      const res = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(res.data);
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
      await api.post(`/crm/customers/${selectedCustomer.id}/tasks`, {
        title: taskForm.title,
        dueDate: taskForm.dueDate || undefined,
      });
      const res = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(res.data);
      setTaskForm({ title: "", dueDate: "" });
      await fetchAll();
    } finally {
      setTaskLoading(false);
    }
  };

  const handleTaskDone = async (taskId: string) => {
    await api.patch(`/crm/tasks/${taskId}`, { status: "TAMAMLANDI" });
    if (selectedCustomer) {
      const res = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(res.data);
    }
    await fetchAll();
  };

  const openCustomer = async (id: string) => {
    const res = await api.get(`/crm/customers/${id}`);
    setSelectedCustomer(res.data);
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [customers, search]);

  const totalBudget = customers.reduce(
    (sum, customer) => sum + (customer.budget || 0),
    0,
  );
  const closedCount = customers.filter(
    (customer) => customer.status === "KAPANDI",
  ).length;
  const activeCount = customers.filter(
    (customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status),
  ).length;

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-cyan-200" size={34} />
          <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-100">
            CRM verileri yükleniyor
          </p>
        </div>
      </main>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <main
      className={
        isAdmin
          ? "min-h-screen bg-[#020617] text-white"
          : "min-h-screen bg-[#F4F7FB] text-[#111827]"
      }
    >
      {showAddModal && (
        <AddCustomerModal
          form={form}
          setForm={setForm}
          formLoading={formLoading}
          onSubmit={handleAddCustomer}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onStatusChange={handleStatusChange}
          activityForm={activityForm}
          setActivityForm={setActivityForm}
          activityLoading={activityLoading}
          onAddActivity={handleAddActivity}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          taskLoading={taskLoading}
          onAddTask={handleAddTask}
          onTaskDone={handleTaskDone}
        />
      )}

      {isAdmin ? (
        <AdminCrmIntelligenceCenter
          userName={`${user?.firstName || "Admin"} ${user?.lastName || ""}`.trim()}
          customers={customers}
          pipeline={pipeline}
          totalBudget={totalBudget}
          closedCount={closedCount}
          activeCount={activeCount}
          onBack={() => router.push("/dashboard")}
          onAdmin={() => router.push("/admin")}
          onAddCustomer={() => setShowAddModal(true)}
          onRefresh={fetchAll}
          onLogout={handleLogout}
        />
      ) : (
        <UserCrmWorkspace
          customers={customers}
          pipeline={pipeline}
          filteredCustomers={filteredCustomers}
          search={search}
          setSearch={setSearch}
          view={view}
          setView={setView}
          totalBudget={totalBudget}
          closedCount={closedCount}
          activeCount={activeCount}
          onBack={() => router.push("/dashboard")}
          onLogout={handleLogout}
          onAddCustomer={() => setShowAddModal(true)}
          onOpenCustomer={openCustomer}
        />
      )}
    </main>
  );
}

function AdminCrmIntelligenceCenter({
  userName,
  customers,
  pipeline,
  totalBudget,
  closedCount,
  activeCount,
  onBack,
  onAdmin,
  onAddCustomer,
  onRefresh,
  onLogout,
}: {
  userName: string;
  customers: Customer[];
  pipeline: Record<string, Customer[]>;
  totalBudget: number;
  closedCount: number;
  activeCount: number;
  onBack: () => void;
  onAdmin: () => void;
  onAddCustomer: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const hotLeads = customers.filter((customer) =>
    customer.tags?.some((tag) =>
      ["Sıcak Lead", "Acil Alıcı", "Nakit Hazır"].includes(tag),
    ),
  );
  const newLeads = pipeline.YENI_LEAD?.length || 0;
  const negotiationLeads =
    (pipeline.TEKLIF_SURECI?.length || 0) + (pipeline.PAZARLIK?.length || 0);
  const lostCount = customers.filter(
    (customer) => customer.status === "KAYBEDILDI",
  ).length;
  const conversionRate = customers.length
    ? Math.round((closedCount / customers.length) * 100)
    : 0;
  const latestCustomers = customers.slice(0, 6);
  const topCities = Object.entries(
    customers.reduce<Record<string, number>>((acc, customer) => {
      const city = customer.city || "Şehir Yok";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-120px] top-20 h-[420px] w-[420px] rounded-full bg-blue-700/25 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-[460px] w-[460px] rounded-full bg-[#C9A84C]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.055)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <header className="relative z-10 border-b border-cyan-300/15 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 text-cyan-100 transition hover:border-[#C9A84C]/60 hover:text-[#F7DFA3]"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#C9A84C]">
                EPH Intelligence Center
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
                CRM Command Grid
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAdmin}
              className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100"
            >
              Admin Merkezi
            </button>
            <button
              onClick={onRefresh}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-200"
            >
              Verileri Yenile
            </button>
            <button
              onClick={onLogout}
              className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-200"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[42px] border border-cyan-300/20 bg-white/[0.055] p-7 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(201,168,76,0.22),transparent_26%)]" />
            <div className="relative">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  CRM Grid Aktif
                </span>
                <span className="rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#F7DFA3]">
                  Admin Katmanı
                </span>
              </div>

              <h2 className="max-w-3xl text-[42px] font-black leading-[0.95] tracking-tight md:text-[64px]">
                Müşteri
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-[#F7DFA3] bg-clip-text text-transparent">
                  İstihbarat Merkezi
                </span>
              </h2>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
                Hoş geldin {userName}. Bu ekran normal CRM değil; tüm müşteri
                akışını, sıcak lead yoğunluğunu ve satış operasyonunu üst
                katmandan izleyen admin kontrol merkezidir.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <AdminIntelMini
                  title="Aktif Lead"
                  value={String(activeCount)}
                  icon={<Target size={19} />}
                />
                <AdminIntelMini
                  title="Sıcak Sinyal"
                  value={String(hotLeads.length)}
                  icon={<BriefcaseBusiness size={19} />}
                />
                <AdminIntelMini
                  title="Dönüşüm"
                  value={`%${conversionRate}`}
                  icon={<CheckCircle2 size={19} />}
                />
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onAddCustomer}
                  className="rounded-2xl bg-[#C9A84C] px-5 py-3 text-sm font-black text-[#020617] shadow-lg shadow-[#C9A84C]/20 transition hover:scale-[1.02]"
                >
                  Yeni Müşteri Ekle
                </button>
                <button
                  onClick={onAdmin}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  Komuta Paneline Dön
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
                    AI Lead Radar
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    Öncelikli Sinyaller
                  </h3>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <Radar size={25} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <AdminSignal
                  label="Yeni Lead Akışı"
                  value={newLeads}
                  tone="cyan"
                />
                <AdminSignal
                  label="Teklif / Pazarlık"
                  value={negotiationLeads}
                  tone="gold"
                />
                <AdminSignal
                  label="Kaybedilen İşlem"
                  value={lostCount}
                  tone="rose"
                />
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C9A84C]">
                Veri Mahremiyeti
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                Admin bu ekranda operasyonu izler. Müşteri verileri kullanıcı
                sahipliğiyle korunur; özel kayıtlar yalnızca yetkili kapsamda
                açılır.
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric
            title="Toplam Müşteri"
            value={customers.length}
            icon={<UsersRound size={21} />}
          />
          <AdminMetric
            title="Aktif Operasyon"
            value={activeCount}
            icon={<Target size={21} />}
            tone="cyan"
          />
          <AdminMetric
            title="Kapanan İşlem"
            value={closedCount}
            icon={<CheckCircle2 size={21} />}
            tone="green"
          />
          <AdminMetric
            title="Toplam Bütçe"
            value={shortMoney(totalBudget)}
            icon={<WalletCards size={21} />}
            tone="gold"
            textValue
          />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
                  Bölgesel Radar
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  Şehir Yoğunluğu
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]">
                <Target size={25} />
              </div>
            </div>

            <div className="space-y-3">
              {topCities.length > 0 ? (
                topCities.map(([city, count], index) => (
                  <div
                    key={city}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm font-black">
                      <span className="text-white">
                        #{index + 1} {city}
                      </span>
                      <span className="text-[#F7DFA3]">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-[#C9A84C]"
                        style={{
                          width: `${Math.min(100, (count / Math.max(1, customers.length)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm font-bold text-slate-400">
                  Henüz şehir verisi yok.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C9A84C]">
                  Live Customer Stream
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  Son Müşteri Akışı
                </h3>
              </div>
              <button
                onClick={onAddCustomer}
                className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15"
              >
                Yeni Kayıt
              </button>
            </div>

            <div className="space-y-3">
              {latestCustomers.length > 0 ? (
                latestCustomers.map((customer) => {
                  const stage = stageInfo(customer.status);
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-black text-[#020617]">
                        {customer.firstName?.[0]}
                        {customer.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {[customer.city, money(customer.budget)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-black"
                        style={{ background: stage.bg, color: stage.color }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm font-bold text-slate-400">
                  Henüz müşteri akışı yok.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
                Pipeline Matrix
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                Satış Aşamaları
              </h3>
            </div>
            <button
              onClick={onRefresh}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100"
            >
              Yenile
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PIPELINE_STAGES.map((stage) => {
              const count = pipeline[stage.key]?.length || 0;
              return (
                <div
                  key={stage.key}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                      {stage.label}
                    </span>
                    <span
                      className="rounded-2xl px-3 py-1 text-sm font-black"
                      style={{ background: stage.bg, color: stage.color }}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                      style={{
                        width: `${Math.min(100, (count / Math.max(1, customers.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </>
  );
}

function AdminIntelMini({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-cyan-300/15 bg-white/[0.07] p-4 backdrop-blur">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function AdminSignal({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "gold" | "rose";
}) {
  const toneClass =
    tone === "gold"
      ? "from-[#C9A84C] to-amber-300 text-[#020617]"
      : tone === "rose"
        ? "from-rose-400 to-red-500 text-white"
        : "from-cyan-300 to-blue-400 text-[#020617]";
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.06] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
        {label}
      </span>
      <span
        className={`rounded-2xl bg-gradient-to-r px-4 py-2 text-lg font-black ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function AdminMetric({
  title,
  value,
  icon,
  tone = "blue",
  textValue,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  tone?: "blue" | "cyan" | "green" | "gold";
  textValue?: boolean;
}) {
  const toneClass =
    tone === "gold"
      ? "bg-[#C9A84C]/15 text-[#F7DFA3] border-[#C9A84C]/25"
      : tone === "green"
        ? "bg-emerald-400/10 text-emerald-200 border-emerald-300/20"
        : tone === "cyan"
          ? "bg-cyan-300/10 text-cyan-100 border-cyan-300/20"
          : "bg-blue-400/10 text-blue-100 border-blue-300/20";
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>
      <p
        className={`${textValue ? "text-[26px]" : "text-[38px]"} mt-2 font-black leading-none text-white`}
      >
        {value}
      </p>
    </div>
  );
}

function UserCrmWorkspace({
  customers,
  pipeline,
  filteredCustomers,
  search,
  setSearch,
  view,
  setView,
  totalBudget,
  closedCount,
  activeCount,
  onBack,
  onLogout,
  onAddCustomer,
  onOpenCustomer,
}: {
  customers: Customer[];
  pipeline: Record<string, Customer[]>;
  filteredCustomers: Customer[];
  search: string;
  setSearch: (value: string) => void;
  view: "pipeline" | "list";
  setView: (value: "pipeline" | "list") => void;
  totalBudget: number;
  closedCount: number;
  activeCount: number;
  onBack: () => void;
  onLogout: () => void;
  onAddCustomer: () => void;
  onOpenCustomer: (id: string) => void;
}) {
  return (
    <>
      <section className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5">
        <header className="mb-5 rounded-[32px] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                onClick={onBack}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <BriefcaseBusiness size={14} />
                Müşteri İlişkileri
              </div>
              <h1 className="mt-3 text-[31px] font-black tracking-tight text-[#0B1F44]">
                CRM Merkezi
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Lead, müşteri, aktivite ve görev takibini tek ekrandan yönet.
              </p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
            >
              Çıkış
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              title="Toplam Müşteri"
              value={String(customers.length)}
              icon={<UsersRound size={19} />}
            />
            <KpiCard
              title="Kapanan İşlem"
              value={String(closedCount)}
              icon={<CheckCircle2 size={19} />}
            />
            <KpiCard
              title="Aktif Lead"
              value={String(activeCount)}
              icon={<Target size={19} />}
            />
            <KpiCard
              title="Toplam Bütçe"
              value={shortMoney(totalBudget)}
              icon={<WalletCards size={19} />}
            />
          </div>
        </header>

        <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Müşteri, telefon, şehir veya ilgi alanı ara..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView("pipeline")}
                className={`flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black ${view === "pipeline" ? "bg-[#1D4ED8] text-white" : "border border-slate-200 bg-white text-slate-500"}`}
              >
                <ListFilter size={17} />
                Pipeline
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black ${view === "list" ? "bg-[#1D4ED8] text-white" : "border border-slate-200 bg-white text-slate-500"}`}
              >
                <FileText size={17} />
                Liste
              </button>
              <button
                onClick={onAddCustomer}
                className="flex h-12 items-center gap-2 rounded-2xl bg-[#0B1F44] px-4 text-sm font-black text-white"
              >
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
                const stageCustomers = (pipeline[stage.key] || []).filter(
                  (customer) =>
                    filteredCustomers.some((item) => item.id === customer.id),
                );
                return (
                  <div key={stage.key} className="w-[260px] shrink-0">
                    <div
                      className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ background: stage.bg }}
                    >
                      <span
                        className="text-xs font-black uppercase tracking-wide"
                        style={{ color: stage.color }}
                      >
                        {stage.label}
                      </span>
                      <span
                        className="text-lg font-black"
                        style={{ color: stage.color }}
                      >
                        {stageCustomers.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {stageCustomers.map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          onClick={() => onOpenCustomer(customer.id)}
                        />
                      ))}
                      {stageCustomers.length === 0 && (
                        <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-400">
                          Boş
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white p-3">
            {filteredCustomers.length === 0 ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEF4FF] text-[#1D4ED8]">
                  <UsersRound size={30} />
                </div>
                <div className="text-[20px] font-black text-[#0B1F44]">
                  Müşteri bulunamadı
                </div>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Yeni müşteri ekleyebilir veya arama filtresini
                  temizleyebilirsin.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <CustomerListRow
                    key={customer.id}
                    customer={customer}
                    onClick={() => onOpenCustomer(customer.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem
            href="/dashboard"
            icon={<Home size={21} />}
            label="Ana Sayfa"
          />
          <BottomItem
            href="/stok"
            icon={<BriefcaseBusiness size={21} />}
            label="İlanlar"
          />
          <BottomItem
            href="/network"
            icon={<MessageCircle size={21} />}
            label="Network"
          />
          <BottomItem
            active
            href="/crm"
            icon={<UsersRound size={21} />}
            label="CRM"
          />
          <BottomItem
            href="/profil"
            icon={<CircleUserRound size={21} />}
            label="Profil"
          />
        </div>
      </nav>
    </>
  );
}

function AddCustomerModal({
  form,
  setForm,
  formLoading,
  onSubmit,
  onClose,
}: {
  form: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    city: string;
    profession: string;
    company: string;
    budget: string;
    interestedArea: string;
    interestedType: string;
    source: string;
    notes: string;
    status: string;
    tags: string[];
  };
  setForm: Dispatch<SetStateAction<any>>;
  formLoading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1F44]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
              CRM
            </p>
            <h2 className="mt-1 text-[25px] font-black tracking-tight text-[#0B1F44]">
              Yeni Müşteri Ekle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <FormSection title="Temel Bilgiler">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ad *">
                <input
                  className="premium-input"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Soyad *">
                <input
                  className="premium-input"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Telefon">
                <input
                  className="premium-input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, phone: e.target.value }))
                  }
                />
              </Field>
              <Field label="E-posta">
                <input
                  className="premium-input"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, email: e.target.value }))
                  }
                />
              </Field>
              <Field label="Şehir">
                <input
                  className="premium-input"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, city: e.target.value }))
                  }
                />
              </Field>
              <Field label="Meslek">
                <input
                  className="premium-input"
                  value={form.profession}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, profession: e.target.value }))
                  }
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="İlgi & Bütçe">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bütçe">
                <input
                  className="premium-input"
                  type="number"
                  value={form.budget}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, budget: e.target.value }))
                  }
                />
              </Field>
              <Field label="İlgilendiği Bölge">
                <input
                  className="premium-input"
                  value={form.interestedArea}
                  onChange={(e) =>
                    setForm((f: any) => ({
                      ...f,
                      interestedArea: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Mülk Tipi">
                <input
                  className="premium-input"
                  value={form.interestedType}
                  onChange={(e) =>
                    setForm((f: any) => ({
                      ...f,
                      interestedType: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Lead Kaynağı">
                <input
                  className="premium-input"
                  value={form.source}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, source: e.target.value }))
                  }
                />
              </Field>
              <Field label="Durum">
                <select
                  className="premium-input"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, status: e.target.value }))
                  }
                >
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection title="Etiketler">
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setForm((f: any) => ({
                        ...f,
                        tags: active
                          ? f.tags.filter((item: string) => item !== tag)
                          : [...f.tags, tag],
                      }))
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-black ${active ? "border-[#1D4ED8] bg-[#EEF4FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-500"}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="Not">
            <textarea
              className="premium-input min-h-[100px] resize-none py-3"
              value={form.notes}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, notes: e.target.value }))
              }
            />
          </FormSection>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-5">
          <button
            onClick={onSubmit}
            disabled={formLoading || !form.firstName || !form.lastName}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#1D4ED8] text-sm font-black text-white disabled:opacity-50"
          >
            {formLoading ? "Kaydediliyor..." : "Müşteri Ekle"}
          </button>
          <button
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-500"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-[25px] font-black text-[#0B1F44]">{value}</p>
    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick: () => void;
}) {
  const stage = stageInfo(customer.status);
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-[#0B1F44]">
            {customer.firstName} {customer.lastName}
          </h3>
          {customer.phone && (
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
              <Phone size={13} />
              {customer.phone}
            </p>
          )}
        </div>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-black"
          style={{ background: stage.bg, color: stage.color }}
        >
          {stage.label}
        </span>
      </div>
      <p className="text-[18px] font-black text-[#1D4ED8]">
        {money(customer.budget)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {customer.tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-500"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
        <span>{customer.city || "Şehir yok"}</span>
        <span>{customer._count?.activities || 0} aktivite</span>
      </div>
    </button>
  );
}

function CustomerListRow({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick: () => void;
}) {
  const stage = stageInfo(customer.status);
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-black text-[#0B1F44]">
            {customer.firstName} {customer.lastName}
          </h3>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">
            {[customer.phone, customer.city, money(customer.budget)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black"
          style={{ background: stage.bg, color: stage.color }}
        >
          {stage.label}
        </span>
      </div>
    </button>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
  onStatusChange,
  activityForm,
  setActivityForm,
  activityLoading,
  onAddActivity,
  taskForm,
  setTaskForm,
  taskLoading,
  onAddTask,
  onTaskDone,
}: {
  customer: Customer;
  onClose: () => void;
  onStatusChange: (customerId: string, status: string) => void;
  activityForm: { type: string; note: string };
  setActivityForm: Dispatch<SetStateAction<{ type: string; note: string }>>;
  activityLoading: boolean;
  onAddActivity: () => void;
  taskForm: { title: string; dueDate: string };
  setTaskForm: Dispatch<SetStateAction<{ title: string; dueDate: string }>>;
  taskLoading: boolean;
  onAddTask: () => void;
  onTaskDone: (taskId: string) => void;
}) {
  const stage = stageInfo(customer.status);
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1F44]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[26px] font-black tracking-tight text-[#0B1F44]">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {[customer.phone, customer.city].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <select
              className="premium-input"
              style={{ color: stage.color }}
              value={customer.status}
              onChange={(event) =>
                onStatusChange(customer.id, event.target.value)
              }
            >
              {PIPELINE_STAGES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Bütçe", value: money(customer.budget) },
              {
                label: "İlgilendiği Bölge",
                value: customer.interestedArea || "—",
              },
              { label: "Mülk Tipi", value: customer.interestedType || "—" },
              { label: "Kaynak", value: customer.source || "—" },
              { label: "Meslek", value: customer.profession || "—" },
              { label: "Firma", value: customer.company || "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-black text-[#0B1F44]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {customer.tags?.length > 0 && (
            <FormSection title="Etiketler">
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </FormSection>
          )}
          {customer.notes && (
            <FormSection title="Not">
              <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-semibold leading-6 text-slate-600">
                {customer.notes}
              </div>
            </FormSection>
          )}

          <FormSection title="Aktivite Ekle">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_auto]">
              <select
                className="premium-input"
                value={activityForm.type}
                onChange={(event) =>
                  setActivityForm((form) => ({
                    ...form,
                    type: event.target.value,
                  }))
                }
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                className="premium-input"
                placeholder="Not ekle..."
                value={activityForm.note}
                onChange={(event) =>
                  setActivityForm((form) => ({
                    ...form,
                    note: event.target.value,
                  }))
                }
              />
              <button
                onClick={onAddActivity}
                disabled={activityLoading || !activityForm.note}
                className="h-12 rounded-2xl bg-[#1D4ED8] px-5 text-sm font-black text-white disabled:opacity-50"
              >
                Ekle
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {customer.activities?.length ? (
                customer.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl bg-[#F8FAFC] p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
                      {ACTIVITY_TYPES.find((item) => item.key === activity.type)
                        ?.label || activity.type}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#0B1F44]">
                      {activity.note}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-slate-400">
                  Henüz aktivite yok
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Görevler">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto]">
              <input
                className="premium-input"
                placeholder="Görev ekle..."
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((form) => ({
                    ...form,
                    title: event.target.value,
                  }))
                }
              />
              <input
                className="premium-input"
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm((form) => ({
                    ...form,
                    dueDate: event.target.value,
                  }))
                }
              />
              <button
                onClick={onAddTask}
                disabled={taskLoading || !taskForm.title}
                className="h-12 rounded-2xl bg-[#0B1F44] px-5 text-sm font-black text-white disabled:opacity-50"
              >
                Ekle
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {customer.tasks?.length ? (
                customer.tasks.map((task) => {
                  const soon = isTaskSoon(task.dueDate);
                  return (
                    <button
                      key={task.id}
                      onClick={() =>
                        task.status !== "TAMAMLANDI" && onTaskDone(task.id)
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${soon ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}
                    >
                      <div>
                        <p
                          className={`text-sm font-black ${task.status === "TAMAMLANDI" ? "text-slate-400 line-through" : "text-[#0B1F44]"}`}
                        >
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p
                            className={`mt-2 text-xs font-black ${soon ? "text-red-600" : "text-slate-400"}`}
                          >
                            {formatDateTime(task.dueDate)}
                          </p>
                        )}
                      </div>
                      {task.status === "TAMAMLANDI" && (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm font-bold text-slate-400">
                  Henüz görev yok
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </div>

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
    </div>
  );
}

function BottomItem({
  icon,
  label,
  active,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 ${active ? "text-[#1D4ED8]" : "text-slate-500"}`}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
