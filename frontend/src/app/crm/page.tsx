"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  MessageCircle,
  Phone,
  Plus,
  Search,
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
  activities?: any[];
  tasks?: any[];
  owner?: { firstName: string; lastName: string; role: string };
}

const PIPELINE_STAGES = [
  { key: "YENI_LEAD", label: "Yeni Lead", color: "#1D4ED8", bg: "#EEF4FF" },
  { key: "ILK_GORUSME", label: "İlk Görüşme", color: "#7C3AED", bg: "#F5F3FF" },
  { key: "PORTFOLYO_GONDERILDI", label: "Portföy", color: "#EA580C", bg: "#FFF7ED" },
  { key: "YER_GOSTERIMI", label: "Yer Gösterimi", color: "#CA8A04", bg: "#FEFCE8" },
  { key: "TEKLIF_SURECI", label: "Teklif", color: "#0F172A", bg: "#F1F5F9" },
  { key: "PAZARLIK", label: "Pazarlık", color: "#B45309", bg: "#FFFBEB" },
  { key: "KAPANDI", label: "Kapandı", color: "#047857", bg: "#ECFDF5" },
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

  const [activityForm, setActivityForm] = useState({ type: "TELEFON", note: "" });
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
      const [customersRes, pipelineRes] = await Promise.all([
        api.get("/crm/customers"),
        api.get("/crm/pipeline"),
      ]);

      setCustomers(customersRes.data || []);
      setPipeline(pipelineRes.data || {});
    } catch (error) {
      console.error(error);
      alert("CRM bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    setFormLoading(true);

    try {
      await api.post("/crm/customers", {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
      });

      await fetchAll();
      setShowAddModal(false);

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
      await api.post(`/crm/customers/${selectedCustomer.id}/tasks`, taskForm);

      const res = await api.get(`/crm/customers/${selectedCustomer.id}`);
      setSelectedCustomer(res.data);
      setTaskForm({ title: "", dueDate: "" });
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
  };

  const openCustomer = async (id: string) => {
    const res = await api.get(`/crm/customers/${id}`);
    setSelectedCustomer(res.data);
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.toLowerCase().trim();

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
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  const totalBudget = customers.reduce((sum, customer) => sum + (customer.budget || 0), 0);
  const closedCount = customers.filter((customer) => customer.status === "KAPANDI").length;
  const activeCount = customers.filter(
    (customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status)
  ).length;

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#111827]">
      {showAddModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1F44]/60 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
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
                onClick={() => setShowAddModal(false)}
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
                      placeholder="Ahmet"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </Field>

                  <Field label="Soyad *">
                    <input
                      className="premium-input"
                      placeholder="Yılmaz"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </Field>

                  <Field label="Telefon">
                    <input
                      className="premium-input"
                      placeholder="0530..."
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </Field>

                  <Field label="E-posta">
                    <input
                      className="premium-input"
                      placeholder="ahmet@email.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </Field>

                  <Field label="Şehir">
                    <input
                      className="premium-input"
                      placeholder="Denizli"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </Field>

                  <Field label="Meslek">
                    <input
                      className="premium-input"
                      placeholder="Esnaf"
                      value={form.profession}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, profession: e.target.value }))
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
                      placeholder="2500000"
                      value={form.budget}
                      onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    />
                  </Field>

                  <Field label="İlgilendiği Bölge">
                    <input
                      className="premium-input"
                      placeholder="Merkezefendi"
                      value={form.interestedArea}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, interestedArea: e.target.value }))
                      }
                    />
                  </Field>

                  <Field label="Mülk Tipi">
                    <input
                      className="premium-input"
                      placeholder="Daire, Villa..."
                      value={form.interestedType}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, interestedType: e.target.value }))
                      }
                    />
                  </Field>

                  <Field label="Lead Kaynağı">
                    <select
                      className="premium-input"
                      value={form.source}
                      onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    >
                      <option value="">Seçiniz</option>
                      {[
                        "Referans",
                        "Instagram",
                        "Web Sitesi",
                        "Sahibinden",
                        "EPH Platform",
                        "Diger",
                      ].map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Durum">
                    <select
                      className="premium-input"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
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
                          setForm((f) => ({
                            ...f,
                            tags: active
                              ? f.tags.filter((item) => item !== tag)
                              : [...f.tags, tag],
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
                  placeholder="Müşteri hakkında not..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </FormSection>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-5">
              <button
                onClick={handleAddCustomer}
                disabled={formLoading || !form.firstName || !form.lastName}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#1D4ED8] text-sm font-black text-white disabled:opacity-50"
              >
                {formLoading ? "Kaydediliyor..." : "Müşteri Ekle"}
              </button>

              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-500"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
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
              onClick={handleLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
            >
              Çıkış
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard title="Toplam Müşteri" value={String(customers.length)} icon={<UsersRound size={19} />} />
            <KpiCard title="Kapanan İşlem" value={String(closedCount)} icon={<CheckCircle2 size={19} />} />
            <KpiCard title="Aktif Lead" value={String(activeCount)} icon={<Target size={19} />} />
            <KpiCard title="Toplam Bütçe" value={shortMoney(totalBudget)} icon={<WalletCards size={19} />} />
          </div>
        </header>

        <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
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
                className={`flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black ${
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
                className={`flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black ${
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
                const stageCustomers = (pipeline[stage.key] || []).filter((customer) =>
                  filteredCustomers.some((item) => item.id === customer.id)
                );

                return (
                  <div key={stage.key} className="w-[260px] shrink-0">
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
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

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
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

function CustomerListRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
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

          <div className="mt-4 flex items-center gap-3">
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
                  setActivityForm((form) => ({ ...form, type: event.target.value }))
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
                  setActivityForm((form) => ({ ...form, note: event.target.value }))
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
                      {ACTIVITY_TYPES.find((item) => item.key === activity.type)?.label ||
                        activity.type}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#0B1F44]">
                      {activity.note}
                    </p>

                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {new Date(activity.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                      {new Date(activity.createdAt).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input
                className="premium-input"
                placeholder="Görev ekle..."
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((form) => ({ ...form, title: event.target.value }))
                }
              />

              <input
                className="premium-input"
                type="date"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm((form) => ({ ...form, dueDate: event.target.value }))
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
                customer.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => task.status !== "TAMAMLANDI" && onTaskDone(task.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left"
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
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {new Date(task.dueDate).toLocaleDateString("tr-TR")}
                        </p>
                      )}
                    </div>

                    {task.status === "TAMAMLANDI" && (
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    )}
                  </button>
                ))
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