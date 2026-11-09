"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Filter,
  ListChecks,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

type CrmTask = {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
};

type CrmActivity = {
  createdAt: string;
};

type CrmCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  city?: string;
  company?: string;
  budget?: number;
  status: string;
  roles?: string[];
  tags?: string[];
  updatedAt: string;
  lastContactedAt?: string;
  tasks?: CrmTask[];
  activities?: CrmActivity[];
  _count?: {
    activities?: number;
    tasks?: number;
    interests?: number;
    properties?: number;
  };
};

type CrmPremiumWorkspaceProps = {
  customers: CrmCustomer[];
  pipeline: Record<string, CrmCustomer[]>;
  search: string;
  currentUserRole: string;
  onSearchChange: (value: string) => void;
  onAddCustomer: () => void;
  onOpenCustomer: (customerId: string) => void | Promise<void>;
  onCompleteTask: (taskId: string) => void | Promise<void>;
};

type WorkspaceScreen = "home" | "customers" | "tasks";
type TaskView = "today" | "overdue" | "upcoming";

const SALES_STAGES = [
  { key: "YENI_LEAD", label: "Potansiyel Müşteri" },
  { key: "ILK_GORUSME", label: "İlk Görüşme" },
  { key: "PORTFOLYO_GONDERILDI", label: "Portföy Gönderildi" },
  { key: "YER_GOSTERIMI", label: "Yer Gösterimi" },
  { key: "TEKLIF_SURECI", label: "Teklif" },
  { key: "PAZARLIK", label: "Pazarlık" },
  { key: "KAPANDI", label: "Kapandı" },
];

const ROLE_LABELS: Record<string, string> = {
  ALICI: "Alıcı",
  SATICI: "Satıcı",
  KIRACI: "Kiracı",
  KIRAYA_VEREN: "Kiraya Veren",
  YATIRIMCI: "Yatırımcı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ARSA_SAHIBI: "Arsa Sahibi",
  MAL_SAHIBI: "Mal Sahibi",
};

const STATUS_LABELS: Record<string, string> = {
  YENI_LEAD: "Potansiyel Müşteri",
  ILK_GORUSME: "İlk Görüşme",
  PORTFOLYO_GONDERILDI: "Portföy Gönderildi",
  YER_GOSTERIMI: "Yer Gösterimi",
  TEKLIF_SURECI: "Teklif Süreci",
  PAZARLIK: "Pazarlık",
  KAPANDI: "Kapandı",
  KAYBEDILDI: "Kaybedildi",
};

function roleLabel(role?: string) {
  if (!role) return "Müşteri";
  return ROLE_LABELS[role] || role.replaceAll("_", " ");
}

function statusLabel(status?: string) {
  if (!status) return "Durum belirtilmedi";
  return STATUS_LABELS[status] || status.replaceAll("_", " ");
}

function initials(customer: CrmCustomer) {
  return `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase() || "M";
}

function fullName(customer: CrmCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "İsimsiz müşteri";
}

function money(value?: number) {
  if (!value) return "Bütçe belirtilmedi";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function isToday(value?: string) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= startOfToday().getTime() && time <= endOfToday().getTime();
}

function dateTime(value?: string) {
  if (!value) return "Tarih belirtilmedi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih belirtilmedi";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function relativeDate(value?: string) {
  if (!value) return "Görüşme kaydı yok";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Görüşme kaydı yok";

  const diff = Date.now() - date.getTime();
  const day = Math.floor(diff / 86_400_000);

  if (day <= 0) return "Bugün";
  if (day == 1) return "Dün";
  if (day < 30) return `${day} gün önce`;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function latestContact(customer: CrmCustomer) {
  return customer.lastContactedAt || customer.activities?.[0]?.createdAt || customer.updatedAt;
}

function customerRoleTone(role?: string) {
  if (role === "YATIRIMCI") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (role === "ARSA_SAHIBI" || role === "MAL_SAHIBI") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function statusTone(status?: string) {
  if (status === "KAPANDI") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "KAYBEDILDI") return "border-slate-200 bg-slate-50 text-slate-600";
  if (status === "PAZARLIK") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function CrmPremiumWorkspace({
  customers,
  pipeline,
  search,
  currentUserRole,
  onSearchChange,
  onAddCustomer,
  onOpenCustomer,
  onCompleteTask,
}: CrmPremiumWorkspaceProps) {
  const [screen, setScreen] = useState<WorkspaceScreen>("home");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("TUMU");
  const [statusFilter, setStatusFilter] = useState("TUMU");
  const [taskView, setTaskView] = useState<TaskView>("today");

  const tasks = useMemo(
    () =>
      customers.flatMap((customer) =>
        (customer.tasks || []).map((task) => ({
          ...task,
          customerId: customer.id,
          customerName: fullName(customer),
        })),
      ),
    [customers],
  );

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "TAMAMLANDI" && isToday(task.dueDate))
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()),
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.status !== "TAMAMLANDI" &&
            Boolean(task.dueDate) &&
            new Date(task.dueDate || 0).getTime() < startOfToday().getTime(),
        )
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()),
    [tasks],
  );

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.status !== "TAMAMLANDI" &&
            Boolean(task.dueDate) &&
            new Date(task.dueDate || 0).getTime() > endOfToday().getTime(),
        )
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()),
    [tasks],
  );

  const roleOptions = useMemo(
    () =>
      Array.from(new Set(customers.flatMap((customer) => customer.roles || []))).sort((a, b) =>
        roleLabel(a).localeCompare(roleLabel(b), "tr"),
      ),
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("tr-TR");

    return customers.filter((customer) => {
      const roles = customer.roles || [];

      if (roleFilter !== "TUMU" && !roles.includes(roleFilter)) return false;
      if (statusFilter !== "TUMU" && customer.status !== statusFilter) return false;

      if (!keyword) return true;

      return [
        fullName(customer),
        customer.phone,
        customer.email,
        customer.city,
        customer.company,
        customer.budget,
        ...roles.map(roleLabel),
        statusLabel(customer.status),
        ...(customer.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(keyword);
    });
  }, [customers, roleFilter, search, statusFilter]);

  const recentCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [customers],
  );

  const activeCustomerCount = customers.filter(
    (customer) => !["KAPANDI", "KAYBEDILDI"].includes(customer.status),
  ).length;

  const potentialCustomerCount = customers.filter((customer) => customer.status === "YENI_LEAD").length;

  const inSalesProcessCount = customers.filter(
    (customer) => !["YENI_LEAD", "KAPANDI", "KAYBEDILDI"].includes(customer.status),
  ).length;

  const callsToday = todayTasks.filter((task) =>
    ["ara", "telefon", "görüş"].some((word) => task.title.toLocaleLowerCase("tr-TR").includes(word)),
  ).length;

  const staleCustomers = customers.filter((customer) => {
    if (["KAPANDI", "KAYBEDILDI"].includes(customer.status)) return false;
    const lastContact = new Date(latestContact(customer)).getTime();
    if (Number.isNaN(lastContact)) return false;
    return Date.now() - lastContact >= 7 * 86_400_000;
  });

  const shownTasks =
    taskView === "today" ? todayTasks : taskView === "overdue" ? overdueTasks : upcomingTasks;

  const resetFilters = () => {
    setRoleFilter("TUMU");
    setStatusFilter("TUMU");
    onSearchChange("");
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-3 pb-24 pt-3 sm:px-5 lg:px-6">
      <header className="rounded-[24px] border border-[#C7D6E8] bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-[minmax(0,1fr)_44px_44px] items-center gap-2">
          {screen === "home" ? (
            <button
              type="button"
              onClick={onAddCustomer}
              className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(21,87,214,0.20)]"
            >
              <Plus size={18} strokeWidth={3} />
              <span className="truncate">Yeni Müşteri</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-[12px] font-black text-[#06194A]"
            >
              <ArrowLeft size={18} />
              <span className="truncate">CRM Ana Ekranı</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setScreen("customers");
              window.setTimeout(
                () =>
                  document
                    .getElementById("crm-premium-search")
                    ?.focus(),
                50,
              );
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#06194A]"
            aria-label="Müşteri ara"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
              showFilters ||
              roleFilter !== "TUMU" ||
              statusFilter !== "TUMU"
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-[#C7D6E8] bg-white text-[#06194A]"
            }`}
            aria-label="Filtreleri aç"
          >
            <Filter size={20} />
          </button>
        </div>

        {screen !== "home" && (
          <p className="mt-2 text-center text-[11px] font-black text-[#64748B]">
            {screen === "customers"
              ? `${filteredCustomers.length} müşteri kaydı`
              : `${shownTasks.length} görev`}
          </p>
        )}
      </header>

      {currentUserRole === "SUPER_ADMIN" && (
        <section className="mt-3 rounded-[22px] border border-[#B7CCE4] bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8F0FF] text-[#1557D6]">
              <ShieldCheck size={22} />
            </span>

            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#06194A]">
                Yazılım Ekibi
              </p>
              <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#64748B]">
                Kullanıcılar, onaylar, raporlar ve sistem ayarları
              </p>
            </div>
          </div>

          <a
            href="/admin"
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#06194A] px-4 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(6,25,74,0.22)]"
          >
            <ShieldCheck size={18} />
            Yönetim Paneline Git
            <ChevronRight size={17} />
          </a>
        </section>
      )}

      {screen === "home" && (
        <div className="mt-3 space-y-3">
          <section>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[14px] font-black text-[#1F2937]">Bugünkü İşler</h2>
              <button
                type="button"
                onClick={() => setScreen("tasks")}
                className="text-[11px] font-black text-[#1557D6]"
              >
                Tümünü Gör
              </button>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#C7D6E8] bg-white shadow-sm">
              <TodayRow
                icon={<Clock3 size={17} />}
                label={`${overdueTasks.length} geciken görev`}
                alert={overdueTasks.length > 0}
                onClick={() => {
                  setTaskView("overdue");
                  setScreen("tasks");
                }}
              />
              <TodayRow
                icon={<Phone size={17} />}
                label={`${callsToday} bugün aranacak müşteri`}
                onClick={() => {
                  setTaskView("today");
                  setScreen("tasks");
                }}
              />
              <TodayRow
                icon={<BellRing size={17} />}
                label={`${upcomingTasks.length} yaklaşan hatırlatma`}
                onClick={() => {
                  setTaskView("upcoming");
                  setScreen("tasks");
                }}
                last
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryCard
              icon={<UsersRound size={20} />}
              label="Aktif Müşteri"
              value={activeCustomerCount}
              onClick={() => setScreen("customers")}
            />
            <SummaryCard
              icon={<UserRound size={20} />}
              label="Potansiyel Müşteri"
              value={potentialCustomerCount}
              onClick={() => {
                setStatusFilter("YENI_LEAD");
                setScreen("customers");
              }}
            />
            <SummaryCard
              icon={<ClipboardList size={20} />}
              label="Bugünkü Görev"
              value={todayTasks.length}
              onClick={() => {
                setTaskView("today");
                setScreen("tasks");
              }}
            />
            <SummaryCard
              icon={<WalletCards size={20} />}
              label="Satış Sürecinde"
              value={inSalesProcessCount}
              onClick={() => setScreen("customers")}
            />
          </section>

          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-black text-[#1F2937]">Son Güncellenen Müşteriler</h2>
              <button
                type="button"
                onClick={() => setScreen("customers")}
                className="text-[11px] font-black text-[#1557D6]"
              >
                Tümünü Gör
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {recentCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onOpenCustomer(customer.id)}
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 text-left"
                >
                  <CustomerAvatar customer={customer} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black text-[#1F2937]">
                      {fullName(customer)}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-bold text-[#64748B]">
                      {customer.city || "Konum belirtilmedi"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`block rounded-full border px-2 py-1 text-[9px] font-black ${customerRoleTone(customer.roles?.[0])}`}
                    >
                      {roleLabel(customer.roles?.[0])}
                    </span>
                    <span className="mt-1 block text-[9px] font-bold text-[#64748B]">
                      {relativeDate(latestContact(customer))}
                    </span>
                  </span>
                </button>
              ))}

              {recentCustomers.length === 0 && (
                <EmptyState title="Henüz müşteri kaydı yok" description="İlk müşteri kaydınızı oluşturarak başlayın." />
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <h2 className="text-[14px] font-black text-[#1F2937]">Satış Süreci</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {SALES_STAGES.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(stage.key);
                    setScreen("customers");
                  }}
                  className="min-w-[102px] rounded-[18px] border border-[#C7D6E8] bg-[#F8FAFC] px-2.5 py-3 text-center"
                >
                  <span className="block text-[18px] font-black text-[#1557D6]">
                    {pipeline[stage.key]?.length || 0}
                  </span>
                  <span className="mt-1 block text-[9px] font-black leading-3 text-[#475569]">{stage.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-[#B45309]">
              <Sparkles size={18} />
              <h2 className="text-[13px] font-black text-[#1F2937]">Bugün Dikkat Edilmesi Gerekenler</h2>
            </div>
            <div className="mt-2 space-y-2">
              <AttentionRow
                text={
                  overdueTasks.length > 0
                    ? `${overdueTasks.length} görev gecikmiş durumda. Önceliklendirme yapın.`
                    : "Geciken görev bulunmuyor."
                }
              />
              <AttentionRow
                text={
                  staleCustomers.length > 0
                    ? `${staleCustomers.length} müşteriyle 7 gündür iletişim kurulmamış.`
                    : "Uzun süredir iletişim kurulmamış aktif müşteri bulunmuyor."
                }
              />
            </div>
          </section>
        </div>
      )}

      {screen === "customers" && (
        <div className="mt-3 space-y-3">
          <section className="rounded-[24px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} />
              <input
                id="crm-premium-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="İsim, telefon veya bölge ara"
                className="h-12 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] pl-10 pr-10 text-[13px] font-bold text-[#1F2937] outline-none focus:border-[#2563EB]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                  aria-label="Aramayı temizle"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black ${
                  showFilters
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-white text-[#334155]"
                }`}
              >
                <SlidersHorizontal size={14} />
                Filtreler
              </button>

              {roleFilter !== "TUMU" && (
                <FilterChip label={roleLabel(roleFilter)} onRemove={() => setRoleFilter("TUMU")} />
              )}
              {statusFilter !== "TUMU" && (
                <FilterChip label={statusLabel(statusFilter)} onRemove={() => setStatusFilter("TUMU")} />
              )}
              {(roleFilter !== "TUMU" || statusFilter !== "TUMU" || search) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-9 shrink-0 rounded-full border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-[10px] font-black text-[#64748B]"
                >
                  Temizle
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-3 space-y-3 border-t border-[#E2E8F0] pt-3">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#64748B]">
                    Müşteri türü
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <ChoiceChip active={roleFilter === "TUMU"} label="Tümü" onClick={() => setRoleFilter("TUMU")} />
                    {roleOptions.map((role) => (
                      <ChoiceChip
                        key={role}
                        active={roleFilter === role}
                        label={roleLabel(role)}
                        onClick={() => setRoleFilter(role)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#64748B]">
                    Satış süreci
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <ChoiceChip
                      active={statusFilter === "TUMU"}
                      label="Tümü"
                      onClick={() => setStatusFilter("TUMU")}
                    />
                    {SALES_STAGES.map((stage) => (
                      <ChoiceChip
                        key={stage.key}
                        active={statusFilter === stage.key}
                        label={stage.label}
                        onClick={() => setStatusFilter(stage.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            {filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} onOpen={() => onOpenCustomer(customer.id)} />
            ))}

            {filteredCustomers.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-[#C7D6E8] bg-white p-6">
                <EmptyState title="Müşteri bulunamadı" description="Arama veya filtre seçimini değiştirin." />
              </div>
            )}
          </section>
        </div>
      )}

      {screen === "tasks" && (
        <div className="mt-3 space-y-3">
          <section className="rounded-[22px] border border-[#C7D6E8] bg-white p-1.5 shadow-sm">
            <div className="grid grid-cols-3 gap-1">
              <TaskTab
                active={taskView === "today"}
                label="Bugün"
                count={todayTasks.length}
                onClick={() => setTaskView("today")}
              />
              <TaskTab
                active={taskView === "overdue"}
                label="Geciken"
                count={overdueTasks.length}
                onClick={() => setTaskView("overdue")}
              />
              <TaskTab
                active={taskView === "upcoming"}
                label="Yaklaşan"
                count={upcomingTasks.length}
                onClick={() => setTaskView("upcoming")}
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[14px] font-black text-[#1F2937]">
                {taskView === "today"
                  ? "Bugünkü Görevler"
                  : taskView === "overdue"
                    ? "Geciken Görevler"
                    : "Yaklaşan Hatırlatmalar"}
              </h2>
              <span className="text-[10px] font-black text-[#64748B]">{shownTasks.length} kayıt</span>
            </div>

            <div className="space-y-2">
              {shownTasks.map((task) => (
                <article key={task.id} className="rounded-[22px] border border-[#C7D6E8] bg-white p-3 shadow-sm">
                  <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onCompleteTask(task.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB]"
                      aria-label="Görevi tamamla"
                    >
                      <CheckCircle2 size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCustomer(task.customerId)}
                      className="min-w-0 text-left"
                    >
                      <span className="block break-words text-[13px] font-black text-[#1F2937]">{task.title}</span>
                      <span className="mt-1 block truncate text-[11px] font-bold text-[#64748B]">
                        {task.customerName}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#64748B]">
                        <CalendarClock size={13} />
                        {dateTime(task.dueDate)}
                      </span>
                    </button>

                    <span
                      className={`rounded-full border px-2 py-1 text-[9px] font-black ${
                        taskView === "overdue"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {taskView === "overdue" ? "Gecikmiş" : "Bekliyor"}
                    </span>
                  </div>
                </article>
              ))}

              {shownTasks.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-[#C7D6E8] bg-white p-6">
                  <EmptyState title="Görev bulunmuyor" description="Seçilen zaman aralığında bekleyen görev yok." />
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function TodayRow({
  icon,
  label,
  alert = false,
  last = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  alert?: boolean;
  last?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-12 w-full grid-cols-[34px_minmax(0,1fr)_22px] items-center gap-2 px-3 text-left ${
        last ? "" : "border-b border-[#E2E8F0]"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          alert ? "bg-red-50 text-red-600" : "bg-blue-50 text-[#1557D6]"
        }`}
      >
        {icon}
      </span>
      <span className="text-[12px] font-black text-[#1F2937]">{label}</span>
      <ChevronRight size={17} className="text-[#94A3B8]" />
    </button>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[92px] rounded-[22px] border border-[#C7D6E8] bg-white p-3 text-left shadow-sm"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-[#1557D6]">{icon}</span>
      <span className="mt-2 block text-[10px] font-black leading-4 text-[#64748B]">{label}</span>
      <span className="block text-[20px] font-black text-[#06194A]">{value}</span>
    </button>
  );
}

function CustomerAvatar({ customer }: { customer: CrmCustomer }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F0FF] text-[12px] font-black text-[#1557D6]">
      {initials(customer)}
    </span>
  );
}

function CustomerCard({ customer, onOpen }: { customer: CrmCustomer; onOpen: () => void }) {
  const primaryRole = customer.roles?.[0];

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#C7D6E8] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.055)]">
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-2 p-3 text-left"
      >
        <CustomerAvatar customer={customer} />

        <span className="min-w-0">
          <span className="block truncate text-[14px] font-black text-[#1F2937]">{fullName(customer)}</span>
          <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-[#64748B]">
            <Phone size={12} />
            {customer.phone || "Telefon belirtilmedi"}
          </span>
          <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-[#64748B]">
            <MapPin size={12} />
            {customer.city || "Konum belirtilmedi"}
          </span>
          <span className="mt-2 flex items-center gap-1 text-[11px] font-black text-[#1557D6]">
            <CircleDollarSign size={14} />
            {money(customer.budget)}
          </span>
        </span>

        <span className="flex max-w-[116px] flex-col items-end gap-1.5 text-right">
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-black ${customerRoleTone(primaryRole)}`}
          >
            {roleLabel(primaryRole)}
          </span>
          <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${statusTone(customer.status)}`}>
            {statusLabel(customer.status)}
          </span>
          <span className="mt-1 text-[9px] font-bold text-[#64748B]">
            Son görüşme: {relativeDate(latestContact(customer))}
          </span>
        </span>
      </button>

      <div className="grid grid-cols-3 border-t border-[#E2E8F0]">
        <a
          href={customer.phone ? `tel:${customer.phone}` : undefined}
          className={`flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-black ${
            customer.phone ? "text-[#1557D6]" : "pointer-events-none text-[#94A3B8]"
          }`}
        >
          <Phone size={15} />
          Ara
        </a>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 items-center justify-center gap-1.5 border-x border-[#E2E8F0] text-[11px] font-black text-[#334155]"
        >
          <UserRound size={15} />
          Detay
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-black text-[#334155]"
        >
          <MessageSquareText size={15} />
          Not
        </button>
      </div>
    </article>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 text-[10px] font-black text-blue-700"
    >
      {label}
      <X size={13} />
    </button>
  );
}

function ChoiceChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 text-[10px] font-black ${
        active
          ? "border-[#2563EB] bg-[#2563EB] text-white"
          : "border-[#C7D6E8] bg-white text-[#475569]"
      }`}
    >
      {label}
    </button>
  );
}

function TaskTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-[16px] px-2 text-[11px] font-black ${
        active ? "bg-[#1557D6] text-white" : "text-[#475569]"
      }`}
    >
      {label}
      <span className={`ml-1 ${active ? "text-blue-100" : "text-[#94A3B8]"}`}>{count}</span>
    </button>
  );
}

function AttentionRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-[#F8FAFC] px-3 py-2.5">
      <ListChecks size={16} className="mt-0.5 shrink-0 text-[#1557D6]" />
      <p className="text-[11px] font-bold leading-5 text-[#475569]">{text}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-5 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1557D6]">
        <ClipboardList size={21} />
      </span>
      <p className="mt-2 text-[13px] font-black text-[#1F2937]">{title}</p>
      <p className="mt-1 text-[11px] font-bold text-[#64748B]">{description}</p>
    </div>
  );
}
