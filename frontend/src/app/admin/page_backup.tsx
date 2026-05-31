"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Crown,
  Database,
  Eye,
  FileText,
  Fingerprint,
  Gauge,
  Globe2,
  LockKeyhole,
  LogOut,
  Mail,
  Network,
  Orbit,
  Plus,
  Radar,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type TabKey =
  | "overview"
  | "users"
  | "applications"
  | "documents"
  | "nominations"
  | "leads"
  | "stock"
  | "trust"
  | "visits";

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalInvitations: number;
  pendingDocuments: number;
  pendingNominations: number;
  pendingApplications: number;
  byRole: { role: string; count: number }[];
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImageUrl?: string | null;
  role: string;
  isApproved: boolean;
  documents?: { id: string; type: string; status: string; fileUrl: string; fileName: string }[];
}

interface DocumentItem {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  fileName: string;
  createdAt?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  };
}

interface NominationItem {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateRole: string;
  note?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  nominator: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  };
}

interface ApplicationItem {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  requestedRole: string;
  message?: string;
  referralCode?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  referrer?: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  };
}

interface LeadItem {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
  profession?: string;
  city?: string;
  interest?: string;
  conversation?: string;
  source: string;
  createdAt: string;
}

interface UnitItem {
  id: string;
  type: string;
  floor?: number;
  number: string;
  roomCount?: string;
  area?: number;
  price: number;
  status: string;
  isVerified: boolean;
  isOffMarket: boolean;
  tapuVerified: boolean;
  photoVerified: boolean;
  yetkiVerified: boolean;
  project: {
    id: string;
    name: string;
    city: string;
    district: string;
    owner: { firstName: string; lastName: string };
  };
}

interface TrustItem {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  role: string;
  score: number;
  badge: string;
  badgeColor: string;
}

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
  SUPER_ADMIN: "Süper Admin",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  INVITED: "Davet Gönderildi",
  REGISTERED: "Kayıt Oldu",
  GORUSME_PLANLANDI: "Görüşme Planlandı",
  EVRAK_BEKLENIYOR: "Evrak Bekleniyor",
};

const DOC_LABELS: Record<string, string> = {
  VERGI_LEVHASI: "Vergi Levhası",
  YETKI_BELGESI: "Yetki Belgesi",
  TICARET_SICIL: "Ticaret Sicil",
  KIMLIK: "Kimlik",
  DIGER: "Diğer",
  MYK_BELGESI: "MYK Belgesi",
  IMZA_SIRKULERI: "İmza Sirküleri",
  FAALIYET_BELGESI: "Faaliyet Belgesi",
  IS_BITIRME_BELGESI: "İş Bitirme Belgesi",
  YAMBIS_BELGESI: "YAMBİS Belgesi",
  REFERANS_PROJE: "Referans Proje",
};

const UNIT_STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
  PASIF: "Pasif",
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  ARSA: "Arsa",
  TARLA: "Tarla",
  OFIS_BURO: "Ofis/Büro",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
};

function fmt(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "EP";
}

function roleClass(role: string) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (role === "MUTEAHHIT" || role === "INSAAT_FIRMASI") return "border-indigo-300/30 bg-indigo-400/10 text-indigo-100";
  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
}

function statusClass(status: string) {
  if (status === "APPROVED" || status === "REGISTERED") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (status === "REJECTED") return "border-rose-300/30 bg-rose-500/10 text-rose-100";
  if (status === "INVITED") return "border-blue-300/30 bg-blue-400/10 text-blue-100";
  if (status === "GORUSME_PLANLANDI") return "border-purple-300/30 bg-purple-400/10 text-purple-100";
  return "border-amber-300/30 bg-amber-400/10 text-amber-100";
}

function money(value?: number) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function Avatar({
  firstName,
  lastName,
  imageUrl,
  big = false,
}: {
  firstName?: string;
  lastName?: string;
  imageUrl?: string | null;
  big?: boolean;
}) {
  return (
    <div className={`${big ? "h-16 w-16 text-xl" : "h-12 w-12 text-base"} shrink-0 overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 shadow-lg shadow-cyan-500/10`}>
      {imageUrl ? (
        <img src={imageUrl} alt={`${firstName || ""} ${lastName || ""}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-black text-cyan-100">
          {initials(firstName, lastName)}
        </div>
      )}
    </div>
  );
}

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "cyber",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "cyber" | "gold" | "ghost" | "danger" | "success";
  icon?: ReactNode;
}) {
  const classes =
    variant === "gold"
      ? "border-amber-300/40 bg-amber-300 text-slate-950 hover:bg-amber-200"
      : variant === "ghost"
        ? "border-cyan-300/20 bg-white/5 text-slate-200 hover:border-cyan-300/50 hover:bg-cyan-300/10"
        : variant === "danger"
          ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
          : variant === "success"
            ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25"
            : "border-cyan-300/35 bg-cyan-400/15 text-cyan-50 hover:bg-cyan-400/25";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-black uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:text-left">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/60">EPH Command Layer</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{title}</h2>
        {desc && <p className="mt-2 text-sm font-semibold text-slate-400">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.04] p-12 text-center text-lg font-black text-slate-400 shadow-2xl shadow-cyan-950/20">
      {children}
    </div>
  );
}

function FilterBar({ value, setValue, items }: { value: string; setValue: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2 lg:justify-start">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setValue(item.value)}
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
            value === item.value ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-50" : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/30 hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Modal({ title, desc, children, onClose }: { title: string; desc?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <section className="w-full max-w-xl rounded-[32px] border border-cyan-300/20 bg-[#071326] p-6 text-white shadow-2xl shadow-cyan-950/40" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-3xl font-black text-white">{title}</h3>
            {desc && <p className="mt-1 text-sm font-semibold text-slate-400">{desc}</p>}
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-3xl border border-cyan-300/15 bg-white/5 px-4 text-sm font-black text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
      />
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [nominations, setNominations] = useState<NominationItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [trust, setTrust] = useState<TrustItem[]>([]);
  const [visits, setVisits] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [userFilter, setUserFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [nomFilter, setNomFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");

  const [noteModal, setNoteModal] = useState<{ type: "nomination" | "application"; id: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [roleModal, setRoleModal] = useState<{ id: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" });
  const [now, setNow] = useState(new Date());
  const [createUserError, setCreateUserError] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/giris");
      return;
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchAll();
  }, [hydrated, user]);

  useEffect(() => {
    if (hydrated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) fetchUsers(userFilter);
  }, [userFilter]);

  useEffect(() => {
    if (hydrated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) fetchDocuments(docFilter);
  }, [docFilter]);

  useEffect(() => {
    if (hydrated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) fetchNominations(nomFilter);
  }, [nomFilter]);

  useEffect(() => {
    if (hydrated && (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")) fetchApplications(appFilter);
  }, [appFilter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, u, d, n, a, l, st] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users?filter=all"),
        api.get("/admin/documents?filter=all"),
        api.get("/admin/nominations?status=all"),
        api.get("/admin/applications?status=all"),
        api.get("/leads"),
        api.get("/units"),
      ]);
      setStats(s.data);
      setUsers(u.data || []);
      setDocuments(d.data || []);
      setNominations(n.data || []);
      setApplications(a.data || []);
      setLeads(l.data || []);
      setUnits(st.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => setStats((await api.get("/admin/stats")).data);
  const fetchUsers = async (f = "all") => setUsers((await api.get(`/admin/users?filter=${f}`)).data || []);
  const fetchDocuments = async (f = "all") => setDocuments((await api.get(`/admin/documents?filter=${f}`)).data || []);
  const fetchNominations = async (f = "all") => setNominations((await api.get(`/admin/nominations?status=${f}`)).data || []);
  const fetchApplications = async (f = "all") => setApplications((await api.get(`/admin/applications?status=${f}`)).data || []);
  const fetchLeads = async () => setLeads((await api.get("/leads")).data || []);
  const fetchUnits = async () => setUnits((await api.get("/units")).data || []);
  const fetchTrust = async () => setTrust((await api.get("/trust/leaderboard")).data || []);

  const fetchVisits = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/visits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setVisits(Array.isArray(data) ? data : []);
  };

  const act = async (id: string, fn: () => Promise<any>) => {
    setActionLoading(id);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  const refreshCurrentTab = async () => {
    if (activeTab === "overview") await fetchAll();
    if (activeTab === "users") await fetchUsers(userFilter);
    if (activeTab === "applications") await fetchApplications(appFilter);
    if (activeTab === "documents") await fetchDocuments(docFilter);
    if (activeTab === "nominations") await fetchNominations(nomFilter);
    if (activeTab === "leads") await fetchLeads();
    if (activeTab === "stock") await fetchUnits();
    if (activeTab === "trust") await fetchTrust();
    if (activeTab === "visits") await fetchVisits();
    await fetchStats();
  };

  const updateApplication = async (id: string, status: string, adminNote?: string) => {
    await api.patch(`/admin/applications/${id}/status`, { status, adminNote });
    await Promise.all([fetchApplications(appFilter), fetchStats()]);
  };

  const updateNomination = async (id: string, status: string, adminNote?: string) => {
    await api.patch(`/admin/nominations/${id}/status`, { status, adminNote });
    await Promise.all([fetchNominations(nomFilter), fetchStats()]);
  };

  const handleVerify = async (id: string, field: string, current: boolean) => {
    setVerifyLoading(id + field);
    try {
      const unit = units.find((item) => item.id === id);
      if (!unit) return;
      await api.patch(`/units/${id}/verify`, {
        tapuVerified: field === "tapu" ? !current : unit.tapuVerified,
        photoVerified: field === "photo" ? !current : unit.photoVerified,
        yetkiVerified: field === "yetki" ? !current : unit.yetkiVerified,
        isOffMarket: field === "offmarket" ? !current : unit.isOffMarket,
      });
      await fetchUnits();
    } finally {
      setVerifyLoading(null);
    }
  };

  const missionSignals = [
    { label: "Bekleyen Başvuru", value: stats?.pendingApplications || 0, icon: <Mail size={18} />, tone: "amber" },
    { label: "Belge İncelemesi", value: stats?.pendingDocuments || 0, icon: <FileText size={18} />, tone: "cyan" },
    { label: "Üye Onayı", value: stats?.pendingUsers || 0, icon: <UserCheck size={18} />, tone: "rose" },
    { label: "Lina Lead", value: leads.length, icon: <Sparkles size={18} />, tone: "violet" },
  ];

  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number | null; onEnter?: () => void }[] = [
    { key: "overview", label: "Core", icon: <Orbit size={17} /> },
    { key: "users", label: "Üyeler", icon: <UsersRound size={17} />, badge: stats?.pendingUsers },
    { key: "applications", label: "Başvurular", icon: <Mail size={17} />, badge: stats?.pendingApplications },
    { key: "documents", label: "Belgeler", icon: <FileText size={17} />, badge: stats?.pendingDocuments },
    { key: "nominations", label: "Tavsiyeler", icon: <UserCheck size={17} />, badge: stats?.pendingNominations },
    { key: "leads", label: "Lina", icon: <Sparkles size={17} />, badge: leads.length, onEnter: fetchLeads },
    { key: "stock", label: "Stok", icon: <Database size={17} />, onEnter: fetchUnits },
    { key: "trust", label: "Skorlar", icon: <Gauge size={17} />, onEnter: fetchTrust },
    { key: "visits", label: "Trafik", icon: <Activity size={17} />, onEnter: fetchVisits },
  ];

  if (!hydrated || loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_35%)]" />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full border border-cyan-300/40" />
            <div className="absolute inset-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            <div className="absolute inset-8 rounded-full bg-cyan-300 shadow-2xl shadow-cyan-300/40" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.38em] text-cyan-100">EPH Command Core Loading</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-40 top-36 h-[500px] w-[500px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      {noteModal && (
        <Modal
          title="Admin Notu"
          desc="Bu not sadece yönetim panelinde görünür."
          onClose={() => {
            setNoteModal(null);
            setNoteText("");
          }}
        >
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={5} placeholder="Notunuzu yazın..." className="w-full resize-none rounded-3xl border border-cyan-300/15 bg-white/5 p-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50" />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setNoteModal(null); setNoteText(""); }}>Vazgeç</Button>
            <Button
              disabled={actionLoading === noteModal.id}
              icon={<Check size={15} />}
              onClick={() =>
                act(noteModal.id, async () => {
                  if (noteModal.type === "application") {
                    const current = applications.find((item) => item.id === noteModal.id);
                    await updateApplication(noteModal.id, current?.status || "PENDING", noteText);
                  } else {
                    const current = nominations.find((item) => item.id === noteModal.id);
                    await updateNomination(noteModal.id, current?.status || "PENDING", noteText);
                  }
                  setNoteModal(null);
                  setNoteText("");
                })
              }
            >
              Kaydet
            </Button>
          </div>
        </Modal>
      )}

      {roleModal && (
        <Modal title="Rol Değiştir" desc="Kullanıcının platform rolünü güncelle." onClose={() => { setRoleModal(null); setNewRole(""); }}>
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Yeni Rol</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="h-12 w-full rounded-3xl border border-cyan-300/15 bg-[#071326] px-4 text-sm font-black text-white outline-none focus:border-cyan-300/50">
            <option value="">Seçiniz</option>
            <option value="EMLAKCI">Emlakçı</option>
            <option value="MUTEAHHIT">Müteahhit</option>
            <option value="INSAAT_FIRMASI">İnşaat Firması</option>
          </select>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setRoleModal(null); setNewRole(""); }}>Vazgeç</Button>
            <Button
              disabled={!newRole || actionLoading === roleModal.id}
              icon={<UserCog size={15} />}
              onClick={() =>
                act(roleModal.id, async () => {
                  await api.patch(`/admin/users/${roleModal.id}/role`, { role: newRole });
                  await Promise.all([fetchUsers(userFilter), fetchStats()]);
                  setRoleModal(null);
                  setNewRole("");
                })
              }
            >
              Güncelle
            </Button>
          </div>
        </Modal>
      )}

      {createUserModal && (
        <Modal title="Yeni Üye Ekle" desc="Manuel olarak onaylı kullanıcı oluştur." onClose={() => { setCreateUserModal(false); setCreateUserError(""); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Ad" value={createUserForm.firstName} onChange={(v) => setCreateUserForm((c) => ({ ...c, firstName: v }))} />
            <Input label="Soyad" value={createUserForm.lastName} onChange={(v) => setCreateUserForm((c) => ({ ...c, lastName: v }))} />
          </div>
          <div className="mt-4 grid gap-4">
            <Input label="E-posta" type="email" value={createUserForm.email} onChange={(v) => setCreateUserForm((c) => ({ ...c, email: v }))} />
            <Input label="Telefon" value={createUserForm.phone} onChange={(v) => setCreateUserForm((c) => ({ ...c, phone: v }))} />
            <Input label="Şifre" type="password" value={createUserForm.password} onChange={(v) => setCreateUserForm((c) => ({ ...c, password: v }))} />
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Rol</label>
              <select value={createUserForm.role} onChange={(e) => setCreateUserForm((c) => ({ ...c, role: e.target.value }))} className="h-12 w-full rounded-3xl border border-cyan-300/15 bg-[#071326] px-4 text-sm font-black text-white outline-none focus:border-cyan-300/50">
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          {createUserError && <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-100">{createUserError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setCreateUserModal(false); setCreateUserError(""); }}>Vazgeç</Button>
            <Button
              disabled={createUserLoading}
              icon={<Plus size={15} />}
              onClick={async () => {
                if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.phone || !createUserForm.password) {
                  setCreateUserError("Tüm alanlar zorunludur.");
                  return;
                }
                setCreateUserLoading(true);
                setCreateUserError("");
                try {
                  await api.post("/admin/users", createUserForm);
                  setCreateUserModal(false);
                  setCreateUserForm({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" });
                  await Promise.all([fetchUsers(userFilter), fetchStats()]);
                } catch (error: any) {
                  setCreateUserError(error?.response?.data?.message || "Bir hata oluştu.");
                } finally {
                  setCreateUserLoading(false);
                }
              }}
            >
              Üye Ekle
            </Button>
          </div>
        </Modal>
      )}

      <header className="sticky top-0 z-40 border-b border-cyan-300/15 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/5 text-cyan-100 shadow-lg shadow-cyan-500/10 transition hover:border-amber-300/60 hover:text-amber-100"
              title="Geri Dön"
            >
              <ArrowLeft size={19} />
            </button>
            <Link href="/admin" className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-xl" />
                <img src="/LOGO_EPH.png" alt="EPH" className="relative h-11 w-11 object-contain" />
              </div>
              <div>
                <p className="text-xl font-black text-white">EPH CORE</p>
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-200">Admin Command Center</p>
              </div>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            {[
                { href: "/dashboard", label: "Ana Sayfa" },
		{ href: "/network", label: "Network" },
		{ href: "/stok", label: "Stok" },
		{ href: "/crm", label: "CRM" },
		{ href: "/market", label: "Piyasa" },
		{ href: "/admin/system-messages", label: "Kurumsal İletişim" },
		{ href: "/profil", label: "Profil" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 shadow-sm transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { logout(); router.push("/giris"); }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 shadow-sm transition hover:bg-rose-500/20"
            >
              <LogOut size={14} />
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-[42px] border border-cyan-300/20 bg-[#061126]/90 p-6 shadow-2xl shadow-cyan-950/40 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_90%_22%,rgba(245,158,11,0.18),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="absolute right-8 top-8 hidden h-52 w-52 rounded-full border border-cyan-300/15 lg:block">
              <div className="absolute inset-8 rounded-full border border-cyan-300/10" />
              <div className="absolute inset-16 rounded-full border border-amber-300/15" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-2xl shadow-cyan-300" />
            </div>
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
                  <Crown size={16} />
                  Super Admin Layer
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Sistem Aktif
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">
                  <LockKeyhole size={15} />
                  Privacy Guard
                </span>
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
                EPH
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-amber-200 bg-clip-text text-transparent">
                  Mission Control
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
                Burası kullanıcı alanı değil; platformun operasyon, güvenlik, başvuru ve denetim katmanıdır. Admin hesabı oyun kurucudur, oyuncu değildir.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <CockpitMini title="Canlı Saat" value={now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} icon={<Satellite size={18} />} />
                <CockpitMini title="Çekirdek" value="Online" icon={<Zap size={18} />} />
                <CockpitMini title="Mahremiyet" value="Kilitli" icon={<Fingerprint size={18} />} />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="gold" icon={<Plus size={15} />} onClick={() => setCreateUserModal(true)}>Yeni Üye Ekle</Button>
                <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={refreshCurrentTab}>Verileri Yenile</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <HoloPanel title="Operasyon Radarı" icon={<Radar size={22} />}>
              <div className="grid gap-3">
                {missionSignals.map((item) => (
                  <CockpitSignal key={item.label} label={item.label} value={item.value} icon={item.icon} tone={item.tone} />
                ))}
              </div>
            </HoloPanel>

            <HoloPanel title="Güvenlik Protokolü" icon={<ShieldCheck size={22} />}>
              <div className="space-y-3">
                <SecurityLine label="Dashboard veri izolasyonu" value="Aktif" />
                <SecurityLine label="CRM mahremiyet filtresi" value="Aktif" />
                <SecurityLine label="Avatar public image endpoint" value="Aktif" />
                <SecurityLine label="Admin operasyon modu" value="Ayrı katman" />
              </div>
            </HoloPanel>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <CommandMetric title="Toplam Üye" value={stats?.totalUsers || 0} icon={<UsersRound size={20} />} />
          <CommandMetric title="Onaylanan Üye" value={stats?.approvedUsers || 0} icon={<UserCheck size={20} />} />
          <CommandMetric title="Davet Kodu" value={stats?.totalInvitations || 0} icon={<Mail size={20} />} />
          <CommandMetric title="Platform Modu" value="CORE" icon={<Globe2 size={20} />} textValue />
        </div>

        {stats && stats.byRole.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[28px] border border-cyan-300/15 bg-white/[0.04] p-4 shadow-2xl shadow-cyan-950/20">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Rol Dağılımı</span>
            {stats.byRole.map((item) => (
              <Pill key={item.role} className={roleClass(item.role)}>{ROLE_LABELS[item.role] || item.role}: {item.count}</Pill>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2 overflow-x-auto rounded-[28px] border border-cyan-300/15 bg-white/[0.04] p-2 shadow-2xl shadow-cyan-950/20">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const badge = tab.badge || 0;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); tab.onEnter?.(); }}
                className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition-all ${active ? "bg-cyan-300/15 text-cyan-50 shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-300/25" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                {tab.icon}
                {tab.label}
                {badge > 0 && <span className="ml-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-slate-950">{badge}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          {activeTab === "overview" && (
            <Overview users={users} applications={applications} documents={documents} setActiveTab={setActiveTab} />
          )}

          {activeTab === "users" && (
            <UsersTab
              users={users}
              filter={userFilter}
              setFilter={setUserFilter}
              actionLoading={actionLoading}
              onApprove={(id) => act(id, async () => { await api.patch(`/admin/users/${id}/approve`); await Promise.all([fetchUsers(userFilter), fetchStats()]); })}
              onSuspend={(id) => act(id, async () => { await api.patch(`/admin/users/${id}/suspend`); await Promise.all([fetchUsers(userFilter), fetchStats()]); })}
              onDelete={(id) => act(id, async () => { await api.delete(`/admin/users/${id}/reject`); await Promise.all([fetchUsers(userFilter), fetchStats()]); })}
              onRole={(item) => { setRoleModal({ id: item.id, role: item.role }); setNewRole(item.role); }}
            />
          )}

          {activeTab === "applications" && (
            <ApplicationsTab
              applications={applications}
              filter={appFilter}
              setFilter={setAppFilter}
              actionLoading={actionLoading}
              onNote={(item) => { setNoteModal({ type: "application", id: item.id }); setNoteText(item.adminNote || ""); }}
              onStatus={(id, status) => act(id, () => updateApplication(id, status))}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              filter={docFilter}
              setFilter={setDocFilter}
              actionLoading={actionLoading}
              onApprove={(id) => act(id, async () => { await api.patch(`/admin/documents/${id}/approve`); await Promise.all([fetchDocuments(docFilter), fetchStats()]); })}
              onReject={(id) => act(id, async () => { await api.patch(`/admin/documents/${id}/reject`); await Promise.all([fetchDocuments(docFilter), fetchStats()]); })}
            />
          )}

          {activeTab === "nominations" && (
            <NominationsTab
              nominations={nominations}
              filter={nomFilter}
              setFilter={setNomFilter}
              actionLoading={actionLoading}
              onNote={(item) => { setNoteModal({ type: "nomination", id: item.id }); setNoteText(item.adminNote || ""); }}
              onStatus={(id, status) => act(id, () => updateNomination(id, status))}
            />
          )}

          {activeTab === "leads" && (
            <LeadsTab leads={leads} expandedLead={expandedLead} setExpandedLead={setExpandedLead} onRefresh={fetchLeads} />
          )}

          {activeTab === "stock" && (
            <StockTab units={units} verifyLoading={verifyLoading} handleVerify={handleVerify} onRefresh={fetchUnits} />
          )}

          {activeTab === "trust" && <TrustTab trust={trust} onRefresh={fetchTrust} />}

          {activeTab === "visits" && <VisitsTab visits={visits} onRefresh={fetchVisits} />}
        </div>
      </section>
    </main>
  );
}

function HoloPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[34px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/50">Live Module</p>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function CockpitMini({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-cyan-300/15 bg-white/[0.07] p-4 backdrop-blur">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function CockpitSignal({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  const colors =
    tone === "amber"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
      : tone === "rose"
        ? "border-rose-300/25 bg-rose-500/10 text-rose-100"
        : tone === "violet"
          ? "border-violet-300/25 bg-violet-500/10 text-violet-100"
          : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100";

  return (
    <div className={`flex items-center justify-between rounded-[22px] border p-4 ${colors}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.14em]">{label}</span>
      </div>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}

function SecurityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-cyan-300/10 bg-white/[0.045] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-xs font-black text-emerald-200">{value}</span>
    </div>
  );
}

function CommandMetric({ title, value, icon, textValue }: { title: string; value: number | string; icon: ReactNode; textValue?: boolean }) {
  return (
    <div className="rounded-[28px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{icon}</div>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className={`mt-2 font-black text-white ${textValue ? "text-3xl" : "text-4xl"}`}>{value}</p>
    </div>
  );
}

function Overview({ users, applications, documents, setActiveTab }: { users: UserItem[]; applications: ApplicationItem[]; documents: DocumentItem[]; setActiveTab: (tab: TabKey) => void }) {
  const cards = [
    { title: "Üye Onayı", value: users.filter((u) => !u.isApproved).length, tab: "users" as TabKey, icon: <UsersRound size={22} /> },
    { title: "Başvuru Hattı", value: applications.filter((a) => a.status === "PENDING").length, tab: "applications" as TabKey, icon: <Mail size={22} /> },
    { title: "Belge Kapısı", value: documents.filter((d) => d.status === "PENDING").length, tab: "documents" as TabKey, icon: <FileText size={22} /> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Core Operasyon Özeti" desc="Kullanıcı değil, platform seviyesinde yönetim ekranı." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button key={card.title} onClick={() => setActiveTab(card.tab)} className="group rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-6 text-left shadow-2xl shadow-cyan-950/20 transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{card.icon}</div>
            <p className="text-5xl font-black text-white">{card.value}</p>
            <h3 className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">{card.title}</h3>
            <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
              Aç <ChevronRight size={15} />
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-6 shadow-2xl shadow-cyan-950/20">
        <SectionTitle title="Son Sinyaller" desc="Son kullanıcı ve başvuru hareketleri." />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            {users.slice(0, 5).map((u) => (
              <PersonLine key={u.id} firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} sub={u.email} right={<Pill className={u.isApproved ? statusClass("APPROVED") : statusClass("PENDING")}>{u.isApproved ? "Onaylı" : "Bekliyor"}</Pill>} />
            ))}
            {users.length === 0 && <Empty>Kullanıcı yok.</Empty>}
          </div>
          <div className="space-y-3">
            {applications.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-3xl border border-cyan-300/10 bg-white/[0.04] p-4">
                <p className="font-black text-white">{a.applicantName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{a.applicantEmail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill className={roleClass(a.requestedRole)}>{ROLE_LABELS[a.requestedRole] || a.requestedRole}</Pill>
                  <Pill className={statusClass(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill>
                </div>
              </div>
            ))}
            {applications.length === 0 && <Empty>Başvuru yok.</Empty>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonLine({ firstName, lastName, imageUrl, sub, right }: { firstName?: string; lastName?: string; imageUrl?: string | null; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-cyan-300/10 bg-white/[0.04] p-4">
      <Avatar firstName={firstName} lastName={lastName} imageUrl={imageUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{firstName} {lastName}</p>
        {sub && <p className="truncate text-xs font-semibold text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function UsersTab({ users, filter, setFilter, actionLoading, onApprove, onSuspend, onDelete, onRole }: { users: UserItem[]; filter: string; setFilter: (v: string) => void; actionLoading: string | null; onApprove: (id: string) => void; onSuspend: (id: string) => void; onDelete: (id: string) => void; onRole: (u: UserItem) => void }) {
  return (
    <section>
      <SectionTitle title="Üye Kontrol Kulesi" desc="Üyelik durumları, roller ve doğrulama süreçleri." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekleyen", value: "pending" }, { label: "Onaylanan", value: "approved" }]} />
      {users.length === 0 ? <Empty>Kullanıcı bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} big />
                  <div>
                    <h3 className="text-lg font-black text-white">{u.firstName} {u.lastName}</h3>
                    <p className="text-sm font-semibold text-slate-400">{u.email}</p>
                    <p className="text-xs font-semibold text-slate-500">{u.phone}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(u.role)}>{ROLE_LABELS[u.role] || u.role}</Pill>
                      <Pill className={u.isApproved ? statusClass("APPROVED") : statusClass("PENDING")}>{u.isApproved ? "Onaylı" : "Bekliyor"}</Pill>
                      {(u.documents?.length || 0) > 0 && <Pill className="border-slate-300/20 bg-white/5 text-slate-300">{u.documents?.length} belge</Pill>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!u.isApproved && <Button variant="success" disabled={actionLoading === u.id} icon={<Check size={15} />} onClick={() => onApprove(u.id)}>Onayla</Button>}
                  {u.role !== "ADMIN" && u.role !== "SUPER_ADMIN" && (
                    <>
                      {u.isApproved && <Button variant="gold" disabled={actionLoading === u.id} onClick={() => { if (confirm("Kullanıcı askıya alınacak. Emin misiniz?")) onSuspend(u.id); }}>Askıya Al</Button>}
                      <Button variant="ghost" icon={<UserCog size={15} />} onClick={() => onRole(u)}>Rol Değiştir</Button>
                      <Button variant="danger" disabled={actionLoading === u.id} icon={<Trash2 size={15} />} onClick={() => { if (confirm("Kullanıcı silinecek. Emin misiniz?")) onDelete(u.id); }}>Sil</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ApplicationsTab({ applications, filter, setFilter, actionLoading, onNote, onStatus }: { applications: ApplicationItem[]; filter: string; setFilter: (v: string) => void; actionLoading: string | null; onNote: (a: ApplicationItem) => void; onStatus: (id: string, status: string) => void }) {
  return (
    <section>
      <SectionTitle title="Başvuru Hattı" desc="Aday başvurularını değerlendir, davet sürecini yönet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekliyor", value: "PENDING" }, { label: "Onaylandı", value: "APPROVED" }, { label: "Reddedildi", value: "REJECTED" }, { label: "Davet", value: "INVITED" }, { label: "Kayıt Oldu", value: "REGISTERED" }]} />
      {applications.length === 0 ? <Empty>Başvuru bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {applications.map((a) => (
            <div key={a.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 text-xl font-black text-rose-100">{a.applicantName?.[0] || "A"}</div>
                  <div>
                    <h3 className="text-lg font-black text-white">{a.applicantName}</h3>
                    <p className="text-sm font-semibold text-slate-400">{a.applicantEmail} · {a.applicantPhone}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{fmt(a.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(a.requestedRole)}>{ROLE_LABELS[a.requestedRole] || a.requestedRole}</Pill>
                      <Pill className={statusClass(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill>
                      {a.referrer && <Pill className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">Referanslı</Pill>}
                    </div>
                    {a.message && <p className="mt-4 max-w-3xl rounded-3xl border border-cyan-300/10 bg-white/[0.04] p-4 text-sm font-medium leading-7 text-slate-300">{a.message}</p>}
                    {a.adminNote && <p className="mt-3 text-sm font-black text-amber-200">📝 {a.adminNote}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="ghost" icon={<FileText size={15} />} onClick={() => onNote(a)}>Not</Button>
                  {a.status === "PENDING" && (
                    <>
                      <Button variant="success" disabled={actionLoading === a.id} icon={<Check size={15} />} onClick={() => onStatus(a.id, "APPROVED")}>Onayla</Button>
                      <Button variant="danger" disabled={actionLoading === a.id} icon={<X size={15} />} onClick={() => onStatus(a.id, "REJECTED")}>Reddet</Button>
                    </>
                  )}
                  {a.status === "APPROVED" && <Button disabled={actionLoading === a.id} icon={<Mail size={15} />} onClick={() => onStatus(a.id, "INVITED")}>Davet Gönder</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentsTab({ documents, filter, setFilter, actionLoading, onApprove, onReject }: { documents: DocumentItem[]; filter: string; setFilter: (v: string) => void; actionLoading: string | null; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <section>
      <SectionTitle title="Belge Kapısı" desc="Yüklenen belgeleri görüntüle, onayla veya reddet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekleyen", value: "pending" }, { label: "Onaylanan", value: "approved" }, { label: "Reddedilen", value: "rejected" }]} />
      {documents.length === 0 ? <Empty>Belge bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {documents.map((d) => (
            <div key={d.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar firstName={d.user?.firstName} lastName={d.user?.lastName} imageUrl={d.user?.profileImageUrl} big />
                  <div>
                    <h3 className="text-lg font-black text-white">{DOC_LABELS[d.type] || d.type}</h3>
                    <p className="text-sm font-semibold text-slate-400">{d.fileName}</p>
                    <p className="text-xs font-semibold text-slate-500">{d.user ? `${d.user.firstName} ${d.user.lastName} · ${ROLE_LABELS[d.user.role] || d.user.role}` : "Kullanıcı yok"}</p>
                    <div className="mt-3"><Pill className={statusClass(d.status)}>{STATUS_LABELS[d.status] || d.status}</Pill></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer"><Button variant="ghost" icon={<Eye size={15} />}>Görüntüle</Button></a>
                  {d.status === "PENDING" && (
                    <>
                      <Button variant="success" disabled={actionLoading === d.id} icon={<Check size={15} />} onClick={() => onApprove(d.id)}>Onayla</Button>
                      <Button variant="danger" disabled={actionLoading === d.id} icon={<X size={15} />} onClick={() => onReject(d.id)}>Reddet</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NominationsTab({ nominations, filter, setFilter, actionLoading, onNote, onStatus }: { nominations: NominationItem[]; filter: string; setFilter: (v: string) => void; actionLoading: string | null; onNote: (n: NominationItem) => void; onStatus: (id: string, status: string) => void }) {
  return (
    <section>
      <SectionTitle title="Tavsiye Kanalı" desc="Üyeler tarafından önerilen adayları yönet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekliyor", value: "PENDING" }, { label: "Onaylandı", value: "APPROVED" }, { label: "Reddedildi", value: "REJECTED" }, { label: "Davet", value: "INVITED" }, { label: "Kayıt Oldu", value: "REGISTERED" }]} />
      {nominations.length === 0 ? <Empty>Tavsiye bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {nominations.map((n) => (
            <div key={n.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-xl font-black text-cyan-100">{n.candidateName?.[0] || "A"}</div>
                  <div>
                    <h3 className="text-lg font-black text-white">{n.candidateName}</h3>
                    <p className="text-sm font-semibold text-slate-400">{n.candidateEmail} · {n.candidatePhone}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Öneren: {n.nominator.firstName} {n.nominator.lastName} · {fmt(n.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(n.candidateRole)}>{ROLE_LABELS[n.candidateRole] || n.candidateRole}</Pill>
                      <Pill className={statusClass(n.status)}>{STATUS_LABELS[n.status] || n.status}</Pill>
                    </div>
                    {n.note && <p className="mt-4 max-w-3xl rounded-3xl border border-cyan-300/10 bg-white/[0.04] p-4 text-sm font-medium leading-7 text-slate-300">{n.note}</p>}
                    {n.adminNote && <p className="mt-3 text-sm font-black text-amber-200">📝 {n.adminNote}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="ghost" icon={<FileText size={15} />} onClick={() => onNote(n)}>Not</Button>
                  {n.status === "PENDING" && (
                    <>
                      <Button variant="success" disabled={actionLoading === n.id} icon={<Check size={15} />} onClick={() => onStatus(n.id, "APPROVED")}>Onayla</Button>
                      <Button variant="danger" disabled={actionLoading === n.id} icon={<X size={15} />} onClick={() => onStatus(n.id, "REJECTED")}>Reddet</Button>
                    </>
                  )}
                  {n.status === "APPROVED" && <Button disabled={actionLoading === n.id} icon={<Mail size={15} />} onClick={() => onStatus(n.id, "INVITED")}>Davet Gönder</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeadsTab({ leads, expandedLead, setExpandedLead, onRefresh }: { leads: LeadItem[]; expandedLead: string | null; setExpandedLead: (id: string | null) => void; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Lina Intelligence" desc={`${leads.length} aday kaydı toplandı.`} action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {leads.length === 0 ? <Empty>Henüz Lina lead kaydı yok.</Empty> : (
        <div className="grid gap-4">
          {leads.map((l) => (
            <div key={l.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-pink-300/20 bg-pink-500/10 text-lg font-black text-pink-100">{l.fullName?.[0]?.toUpperCase() || "?"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">{l.fullName || "İsimsiz Lead"}</h3>
                    <Pill className="border-pink-300/30 bg-pink-500/10 text-pink-100">Lina</Pill>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-400 md:grid-cols-2">
                    {l.phone && <span>📞 {l.phone}</span>}
                    {l.email && <span>✉️ {l.email}</span>}
                    {l.profession && <span>💼 {l.profession}</span>}
                    {l.city && <span>📍 {l.city}</span>}
                    {l.interest && <span className="md:col-span-2">🎯 {l.interest}</span>}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{fmt(l.createdAt)}</p>
                  {l.conversation && (
                    <>
                      <button onClick={() => setExpandedLead(expandedLead === l.id ? null : l.id)} className="mt-4 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">
                        {expandedLead === l.id ? "Konuşmayı Gizle" : "Konuşmayı Gör"}
                      </button>
                      {expandedLead === l.id && <ConversationBox conversation={l.conversation} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ConversationBox({ conversation }: { conversation: string }) {
  return (
    <div className="mt-4 max-h-72 overflow-auto rounded-3xl border border-cyan-300/10 bg-black/20 p-4">
      {(() => {
        try {
          const messages = JSON.parse(conversation || "[]");
          return messages.map((m: { role: string; content: string }, i: number) => (
            <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm font-semibold leading-6 ${m.role === "user" ? "bg-cyan-300/15 text-cyan-50" : "bg-white/10 text-slate-200"}`}>{m.content}</div>
            </div>
          ));
        } catch {
          return <p className="text-sm font-semibold text-slate-300">{conversation}</p>;
        }
      })()}
    </div>
  );
}

function StockTab({ units, verifyLoading, handleVerify, onRefresh }: { units: UnitItem[]; verifyLoading: string | null; handleVerify: (id: string, field: string, current: boolean) => void; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Stok Güvenlik Izgarası" desc={`${units.length} birim · ${units.filter((u) => u.isVerified).length} doğrulanmış`} action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {units.length === 0 ? <Empty>Birim bulunamadı.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => (
            <div key={u.id} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-cyan-950/20">
              <h3 className="text-2xl font-black text-white">{u.project?.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-400">{u.project?.city} / {u.project?.district} · {u.project?.owner?.firstName} {u.project?.owner?.lastName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StockInfo label="Tip" value={TYPE_LABELS[u.type] || u.type} />
                <StockInfo label="Durum" value={UNIT_STATUS_LABELS[u.status] || u.status} />
                <StockInfo label="No / Kat" value={`${u.number} / ${u.floor ?? "—"}`} />
                <StockInfo label="Alan" value={u.area ? `${u.area} m²` : "—"} />
              </div>
              <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-2xl font-black text-amber-100">{money(u.price)}</div>
              <div className="mt-4 space-y-2">
                {[
                  { key: "tapu", label: "Tapu Doğrulandı", value: u.tapuVerified },
                  { key: "photo", label: "Fotoğraf Doğrulandı", value: u.photoVerified },
                  { key: "yetki", label: "Yetki Belgesi Doğrulandı", value: u.yetkiVerified },
                  { key: "offmarket", label: "Off-Market", value: u.isOffMarket },
                ].map((item) => (
                  <button key={item.key} onClick={() => { if (!verifyLoading) handleVerify(u.id, item.key, item.value); }} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black ${item.value ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-cyan-300/10 bg-white/[0.04] text-slate-400"}`}>
                    {item.label}
                    <span>{verifyLoading === u.id + item.key ? "..." : item.value ? "✓ Aktif" : "Kapalı"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StockInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-cyan-300/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function TrustTab({ trust, onRefresh }: { trust: TrustItem[]; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Üye Güven Skoru İzleme" desc="Bu alan admin skoru değildir; üyelerin platform güven göstergeleridir." action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {trust.length === 0 ? <Empty>Henüz güven skoru verisi yok.</Empty> : (
        <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.045] p-4 shadow-2xl shadow-cyan-950/20">
          {trust.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4 border-b border-cyan-300/10 p-4 last:border-b-0">
              <div className="text-3xl font-black text-amber-200">#{i + 1}</div>
              <Avatar firstName={t.firstName} lastName={t.lastName} imageUrl={t.profileImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{t.firstName} {t.lastName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill className={roleClass(t.role)}>{ROLE_LABELS[t.role] || t.role}</Pill>
                  <span className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: t.badgeColor }}>{t.badge}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${t.score}%`, background: t.badgeColor }} />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{t.score}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VisitsTab({ visits, onRefresh }: { visits: any[]; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Canlı Trafik İzleme" desc="Kim, ne zaman, hangi sayfayı ziyaret etti." action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {visits.length === 0 ? <Empty>Henüz ziyaret yok.</Empty> : (
        <div className="overflow-hidden rounded-[32px] border border-cyan-300/15 bg-white/[0.045] shadow-2xl shadow-cyan-950/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-cyan-300/10 bg-cyan-300/10 text-left text-cyan-50">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Kullanıcı</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Sayfa</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">IP</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b border-cyan-300/10 last:border-b-0">
                    <td className="px-5 py-4"><p className="font-black text-white">{v.user ? `${v.user.firstName} ${v.user.lastName}` : "Misafir"}</p><p className="text-xs font-semibold text-slate-400">{v.user?.email}</p></td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-300">{v.page}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-400">{v.ip}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-400">{fmt(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}


