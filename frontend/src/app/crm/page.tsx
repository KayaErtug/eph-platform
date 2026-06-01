"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  FileText,
  Home,
  ListFilter,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Target,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import api from "@/lib/api";
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
  return PIPELINE_STAGES.find((item) => item.key === status) || PIPELINE_STAGES[0];
}

function formatDateTime(value?: string) {
  if (!value) return "Tarih yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR")} · ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatShortDate(value?: string) {
  if (!value) return "Plan yok";
  const date = new Date(value);
  return `${date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  })} · ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
      .sort(
        (a, b) =>
          new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime(),
      )[0] ||
    pendingTasks[0] ||
    null
  );
}

function activityTypeLabel(type?: string) {
  if (!type) return "Aktivite yok";
  return ACTIVITY_TYPES.find((item) => item.key === type)?.label || type;
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

  const [taskForm, setTaskForm] = useState({
    title: "",
    dueDate: "",
  });

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

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const handleAddActivity = async () => {
    if (!selectedCustomer || !activityForm.note) return;

    setActivityLoading(true);

    try {
      await api.post(`/crm/customers/${selectedCustomer.id}/activities`, activityForm);
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

  const allTasks = customers.flatMap((customer) =>
    (customer.tasks || []).map((task) => ({
      ...task,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerId: customer.id,
    })),
  );

  const todayTasks = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "TAMAMLANDI") return false;
    const date = new Date(task.dueDate);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
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
    .sort(
      (a, b) => new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime(),
    )
    .slice(0, 5);

  const totalBudget = customers.reduce((sum, customer) => sum + (customer.budget || 0), 0);
  const closedCount = customers.filter((customer) => customer.status === "KAPANDI").length;
  const activeCount = customers.filter(
    (customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status),
  ).length;

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-[#0B1F44]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1D4ED8]" size={34} />
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-500">
            CRM verileri yükleniyor
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#111827]">
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

      <section className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-5">
        <header className="relative mb-5 overflow-hidden rounded-[34px] border border-slate-200 bg-white p-5 pt-20 shadow-sm lg:pt-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
            aria-label="Dashboard'a dön"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="text-center lg:text-left lg:pl-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <BriefcaseBusiness size={14} />
                Müşteri İlişkileri
              </div>

              <h1 className="mt-3 text-[31px] font-black tracking-tight text-[#0B1F44] md:text-[42px]">
                CRM Merkezi
              </h1>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 lg:mx-0">
                Lead, müşteri, aktivite ve görev takibini tek profesyonel ekrandan yönet.
              </p>
            </div>

            <div className="flex justify-center gap-2 lg:justify-end">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex h-12 items-center gap-2 rounded-2xl bg-[#0B1F44] px-4 text-sm font-black text-white"
              >
                <Plus size={18} />
                Müşteri Ekle
              </button>

              <button
                onClick={handleLogout}
                className="h-12 rounded-2xl border border-red-100 bg-red-50 px-4 text-xs font-black text-red-600"
              >
                Çıkış
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard title="Toplam Müşteri" value={String(customers.length)} icon={<UsersRound size={19} />} />
            <KpiCard title="Kapanan İşlem" value={String(closedCount)} icon={<CheckCircle2 size={19} />} />
            <KpiCard title="Aktif Lead" value={String(activeCount)} icon={<Target size={19} />} />
            <KpiCard title="Toplam Bütçe" value={shortMoney(totalBudget)} icon={<WalletCards size={19} />} />
          </div>
        </header>

        <section className="mb-5 rounded-[30px] border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Clock3 size={24} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#0B1F44]">
            CRM Görev Alarm Merkezi
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Bugünkü, geciken ve yaklaşan müşteri görevlerini hızlıca takip et.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <TaskSummaryCard
              title="Bugünkü İşlerim"
              value={String(todayTasks.length)}
              description={todayTasks[0] ? `${todayTasks[0].customerName}: ${todayTasks[0].title}` : "Bugün için planlı görev yok."}
              tone="blue"
            />

            <TaskSummaryCard
              title="Geciken Görevler"
              value={String(overdueTasks.length)}
              description={overdueTasks[0] ? `${overdueTasks[0].customerName}: ${overdueTasks[0].title}` : "Geciken görev yok."}
              tone="red"
            />

            <TaskSummaryCard
              title="Yaklaşan Görevler"
              value={String(upcomingTasks.length)}
              description={upcomingTasks[0] ? `${upcomingTasks[0].customerName}: ${upcomingTasks[0].title}` : "Yaklaşan görev yok."}
              tone="green"
            />
          </div>
        </section>

        <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Müşteri, telefon, şehir veya ilgi alanı ara..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-center text-sm font-bold text-slate-700 outline-none focus:border-[#1D4ED8] lg:text-left"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 lg:flex">
              <button
                onClick={() => setView("pipeline")}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${
                  view === "pipeline"
                    ? "bg-[#1D4ED8] text-white"
                    : "border border-slate-200 bg-white text-slate-500"
                }`}
              >
                <ListFilter size={17} />
                Pipeline
              </button>

              <button
                onClick={() => setView("list")}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${
                  view === "list"
                    ? "bg-[#1D4ED8] text-white"
                    : "border border-slate-200 bg-white text-slate-500"
                }`}
              >
                <FileText size={17} />
                Liste
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0B1F44] px-4 text-sm font-black text-white"
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
                const stageCustomers = (pipeline[stage.key] || []).filter((customer) =>
                  filteredCustomers.some((item) => item.id === customer.id),
                );

                return (
                  <div key={stage.key} className="w-[300px] shrink-0">
                    <div
                      className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ background: stage.bg }}
                    >
                      <span className="text-xs font-black uppercase tracking-wide" style={{ color: stage.color }}>
                        {stage.label}
                      </span>

                      <span className="text-lg font-black" style={{ color: stage.color }}>
                        {stageCustomers.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {stageCustomers.map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          onClick={() => openCustomer(customer.id)}
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
          <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
            {filteredCustomers.length === 0 ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEF4FF] text-[#1D4ED8]">
                  <UsersRound size={30} />
                </div>

                <div className="text-[20px] font-black text-[#0B1F44]">
                  Müşteri bulunamadı
                </div>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Yeni müşteri ekleyebilir veya arama filtresini temizleyebilirsin.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <CustomerListRow
                    key={customer.id}
                    customer={customer}
                    onClick={() => openCustomer(customer.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <BottomItem href="/dashboard" icon={<Home size={21} />} label="Ana Sayfa" />
          <BottomItem href="/stok" icon={<BriefcaseBusiness size={21} />} label="İlanlar" />
          <BottomItem href="/network" icon={<MessageCircle size={21} />} label="Network" />
          <BottomItem active href="/crm" icon={<UsersRound size={21} />} label="CRM" />
          <BottomItem href="/profil" icon={<CircleUserRound size={21} />} label="Profil" />
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

function TaskSummaryCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: "blue" | "red" | "green";
}) {
  const style =
    tone === "red"
      ? "bg-red-50 text-red-700"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-blue-50 text-blue-700";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${style}`}>
        <span className="text-xl font-black">{value}</span>
      </div>

      <h3 className="mt-3 text-sm font-black text-[#0B1F44]">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </div>
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
    <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
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
  const latestActivity = getLatestActivity(customer);
  const nextTask = getNextTask(customer);
  const nextTaskSoon = isTaskSoon(nextTask?.dueDate);

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

      <div className="mt-3 grid gap-2">
        <InsightBox
          title="Son Aktivite"
          badge={activityTypeLabel(latestActivity?.type)}
          text={latestActivity?.note || "Henüz aktivite yok"}
        />

        <InsightBox
          title="Sonraki Görev"
          badge={nextTask?.dueDate ? formatShortDate(nextTask.dueDate) : "Plan yok"}
          text={nextTask?.title || "Planlı görev yok"}
          urgent={nextTaskSoon}
        />
      </div>

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

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <MiniCounter label="Aktivite" value={String(customer._count?.activities || 0)} />
        <MiniCounter label="Görev" value={String(customer._count?.tasks || 0)} />
        <MiniCounter label="Şehir" value={customer.city || "—"} />
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
  const latestActivity = getLatestActivity(customer);
  const nextTask = getNextTask(customer);
  const nextTaskSoon = isTaskSoon(nextTask?.dueDate);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[16px] font-black text-[#0B1F44]">
              {customer.firstName} {customer.lastName}
            </h3>

            <span
              className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black"
              style={{ background: stage.bg, color: stage.color }}
            >
              {stage.label}
            </span>
          </div>

          <p className="mt-1 truncate text-xs font-bold text-slate-500">
            {[customer.phone, customer.city, money(customer.budget)]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <InsightBox
              title="Son Aktivite"
              badge={activityTypeLabel(latestActivity?.type)}
              text={latestActivity?.note || "Aktivite yok"}
            />

            <InsightBox
              title="Sonraki Görev"
              badge={nextTask?.dueDate ? formatShortDate(nextTask.dueDate) : "Plan yok"}
              text={nextTask?.title || "Planlı görev yok"}
              urgent={nextTaskSoon}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:w-[150px]">
          <MiniCounter label="Aktivite" value={String(customer._count?.activities || 0)} />
          <MiniCounter label="Görev" value={String(customer._count?.tasks || 0)} />
        </div>
      </div>
    </button>
  );
}

function InsightBox({
  title,
  badge,
  text,
  urgent,
}: {
  title: string;
  badge: string;
  text: string;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 ${urgent ? "bg-red-50" : "bg-[#F8FAFC]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-black uppercase tracking-wide ${
            urgent ? "text-red-500" : "text-slate-400"
          }`}
        >
          {title}
        </span>

        <span
          className={`rounded-full bg-white px-2 py-1 text-[9px] font-black ${
            urgent ? "text-red-600" : "text-slate-500"
          }`}
        >
          {badge}
        </span>
      </div>

      <p
        className={`mt-2 line-clamp-2 text-xs font-bold leading-5 ${
          urgent ? "text-red-700" : "text-slate-600"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function MiniCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="truncate text-sm font-black text-[#0B1F44]">{value}</p>
      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
    </div>
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
  setForm: React.Dispatch<React.SetStateAction<any>>;
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
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Soyad *">
                <input
                  className="premium-input"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Telefon">
                <input
                  className="premium-input"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="E-posta">
                <input
                  className="premium-input"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Şehir">
                <input
                  className="premium-input"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Meslek">
                <input
                  className="premium-input"
                  value={form.profession}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      profession: event.target.value,
                    }))
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
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      budget: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="İlgilendiği Bölge">
                <input
                  className="premium-input"
                  value={form.interestedArea}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      interestedArea: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Mülk Tipi">
                <input
                  className="premium-input"
                  value={form.interestedType}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      interestedType: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Lead Kaynağı">
                <input
                  className="premium-input"
                  value={form.source}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Durum">
                <select
                  className="premium-input"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current: any) => ({
                      ...current,
                      status: event.target.value,
                    }))
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
                      setForm((current: any) => ({
                        ...current,
                        tags: active
                          ? current.tags.filter((item: string) => item !== tag)
                          : [...current.tags, tag],
                      }))
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-black ${
                      active
                        ? "border-[#1D4ED8] bg-[#EEF4FF] text-[#1D4ED8]"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
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
              onChange={(event) =>
                setForm((current: any) => ({
                  ...current,
                  notes: event.target.value,
                }))
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
  setActivityForm: React.Dispatch<React.SetStateAction<{ type: string; note: string }>>;
  activityLoading: boolean;
  onAddActivity: () => void;
  taskForm: { title: string; dueDate: string };
  setTaskForm: React.Dispatch<React.SetStateAction<{ title: string; dueDate: string }>>;
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

          <div className="mt-4">
            <select
              className="premium-input"
              style={{ color: stage.color }}
              value={customer.status}
              onChange={(event) => onStatusChange(customer.id, event.target.value)}
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
              { label: "İlgilendiği Bölge", value: customer.interestedArea || "—" },
              { label: "Mülk Tipi", value: customer.interestedType || "—" },
              { label: "Kaynak", value: customer.source || "—" },
              { label: "Meslek", value: customer.profession || "—" },
              { label: "Firma", value: customer.company || "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-[#F8FAFC] p-4 text-center">
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
                  setActivityForm((current) => ({
                    ...current,
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
                  setActivityForm((current) => ({
                    ...current,
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
                  <div key={activity.id} className="rounded-2xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
                      {activityTypeLabel(activity.type)}
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
                  setTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />

              <input
                className="premium-input"
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
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
                      onClick={() => task.status !== "TAMAMLANDI" && onTaskDone(task.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                        soon ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-black ${
                            task.status === "TAMAMLANDI"
                              ? "text-slate-400 line-through"
                              : "text-[#0B1F44]"
                          }`}
                        >
                          {task.title}
                        </p>

                        {task.dueDate && (
                          <p className={`mt-2 text-xs font-black ${soon ? "text-red-600" : "text-slate-400"}`}>
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
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 text-center text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
        {title}
      </div>
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
      className={`flex w-16 flex-col items-center gap-1 ${
        active ? "text-[#1D4ED8]" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
