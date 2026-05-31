"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  Check,
  Database,
  Eye,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type TabKey = "overview" | "users" | "traffic" | "messages" | "applications" | "documents" | "leads" | "stock" | "trust";

type Stats = {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalInvitations: number;
  pendingDocuments: number;
  pendingNominations: number;
  pendingApplications: number;
  byRole: { role: string; count: number }[];
};

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: string;
  memberCode?: string | null;
  memberSince?: string | null;
  city?: string | null;
  district?: string | null;
  cityPlateCode?: string | null;
  isApproved: boolean;
  isVerified?: boolean;
  documents?: { id: string; type: string; status: string; fileUrl: string; fileName: string }[];
};

type DocumentItem = {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  fileName: string;
  createdAt?: string;
  user?: { firstName: string; lastName: string; email: string; profileImageUrl?: string | null; role: string };
};

type ApplicationItem = {
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
};

type LeadItem = { id: string; fullName?: string; phone?: string; email?: string; profession?: string; city?: string; interest?: string; conversation?: string; source: string; createdAt: string };

type UnitItem = {
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
  project: { id: string; name: string; city: string; district: string; owner: { firstName: string; lastName: string } };
};

type TrustItem = { id: string; firstName: string; lastName: string; profileImageUrl?: string | null; role: string; score: number; badge: string; badgeColor: string };

type VisitItem = { id?: string; userId?: string; page?: string; ip?: string; createdAt?: string; user?: { id?: string; firstName?: string; lastName?: string; email?: string; role?: string } };


type TopPageItem = { page: string; count: number };

type TopMemberItem = {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  profileImageUrl?: string | null;
  memberCode?: string | null;
  city?: string | null;
  district?: string | null;
  count: number;
  lastSeen?: string | null;
};

type TrafficSummary = {
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  onlineUsers: number;
  awayUsers: number;
  offlineUsers: number;
  topPages: TopPageItem[];
  topUsers: TopMemberItem[];
};

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

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "EP";
}

function fullName(user?: { firstName?: string; lastName?: string }) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "İsimsiz Kullanıcı";
}

function roleLabel(role?: string) {
  return ROLE_LABELS[role || ""] || role || "Rol yok";
}

function money(value?: number) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function roleClass(role: string) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "border-amber-200 bg-amber-50 text-amber-800";
  if (role === "MUTEAHHIT" || role === "INSAAT_FIRMASI") return "border-indigo-200 bg-indigo-50 text-indigo-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function statusClass(status: string) {
  if (status === "APPROVED" || status === "REGISTERED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "INVITED") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function presenceFromDate(value?: string | null) {
  if (!value) return { label: "Offline", dot: "bg-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-700" };
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 1000 * 60 * 5) return { label: "Online", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (diff < 1000 * 60 * 20) return { label: "Away", dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: "Offline", dot: "bg-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-700" };
}


function numberFromAny(source: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

function normalizeTrafficSummary(data: any): TrafficSummary {
  const counts = data?.counts || data?.summary || data?.metrics || data || {};
  const rawTopPages = data?.topPages || data?.mostVisitedPages || data?.activePages || data?.pages || [];
  const rawTopUsers = data?.topUsers || data?.topMembers || data?.activeUsers || data?.activeMembers || data?.members || [];

  return {
    todayVisits: numberFromAny(counts, ["todayVisits", "today", "dailyVisits", "visitsToday", "todayCount"]),
    weekVisits: numberFromAny(counts, ["weekVisits", "thisWeek", "weeklyVisits", "visitsThisWeek", "weekCount"]),
    monthVisits: numberFromAny(counts, ["monthVisits", "thisMonth", "monthlyVisits", "visitsThisMonth", "monthCount"]),
    onlineUsers: numberFromAny(counts, ["onlineUsers", "online", "onlineCount"]),
    awayUsers: numberFromAny(counts, ["awayUsers", "away", "awayCount", "idleUsers", "idleCount"]),
    offlineUsers: numberFromAny(counts, ["offlineUsers", "offline", "offlineCount"]),
    topPages: Array.isArray(rawTopPages)
      ? rawTopPages.map((item: any) => ({
          page: item?.page || item?.path || item?.url || item?.name || "Bilinmeyen sayfa",
          count: numberFromAny(item, ["count", "visits", "total", "value"]),
        })).filter((item: TopPageItem) => item.count > 0).slice(0, 8)
      : [],
    topUsers: Array.isArray(rawTopUsers)
      ? rawTopUsers.map((item: any) => {
          const source = item?.user || item;
          return {
            id: source?.id || item?.id || item?.userId,
            userId: item?.userId || source?.userId || source?.id,
            firstName: source?.firstName || item?.firstName,
            lastName: source?.lastName || item?.lastName,
            email: source?.email || item?.email,
            role: source?.role || item?.role,
            profileImageUrl: source?.profileImageUrl || item?.profileImageUrl || null,
            memberCode: source?.memberCode || item?.memberCode || null,
            city: source?.city || item?.city || null,
            district: source?.district || item?.district || null,
            count: numberFromAny(item, ["count", "visits", "total", "value"]),
            lastSeen: item?.lastSeen || item?.lastVisitAt || item?.lastActivityAt || item?.createdAt || null,
          };
        }).filter((item: TopMemberItem) => item.count > 0).slice(0, 8)
      : [],
  };
}

function Avatar({ firstName, lastName, imageUrl, size = "md" }: { firstName?: string; lastName?: string; imageUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";
  const safeImageUrl = imageUrl && !imageFailed ? imageUrl : null;

  useEffect(() => setImageFailed(false), [imageUrl]);

  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-100 to-indigo-100 shadow-sm`}>
      {safeImageUrl ? <img src={safeImageUrl} alt={`${firstName || ""} ${lastName || ""}`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : <div className="flex h-full w-full items-center justify-center font-black text-slate-700">{initials(firstName, lastName)}</div>}
    </div>
  );
}

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${className}`}>{children}</span>;
}

function PrimaryButton({ children, onClick, disabled, tone = "dark", icon }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "dark" | "light" | "danger" | "success"; icon?: ReactNode }) {
  const toneClass = tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : tone === "light" ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-900 bg-slate-950 text-white hover:bg-slate-800";
  return <button onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}>{icon}{children}</button>;
}

function StatCard({ title, value, icon, desc }: { title: string; value: number | string; icon: ReactNode; desc?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p>{desc && <p className="mt-1 text-xs font-semibold text-slate-500">{desc}</p>}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">{children}</div>;
}

function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">EPH Yönetim</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>{desc && <p className="mt-1 text-sm font-semibold text-slate-500">{desc}</p>}</div>{action}</div>;
}

function Modal({ title, desc, children, onClose }: { title: string; desc?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md" onClick={onClose}>
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-2xl font-black">{title}</h3>{desc && <p className="mt-1 text-sm font-semibold text-slate-500">{desc}</p>}</div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"><X size={18} /></button></div>
        {children}
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400" /></div>;
}

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [trust, setTrust] = useState<TrustItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [trafficFilter, setTrafficFilter] = useState("all");
  const [roleModal, setRoleModal] = useState<{ id: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" });
  const [createUserError, setCreateUserError] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") { router.push("/dashboard"); return; }
    fetchAll();
  }, [hydrated, user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, u, d, a, l, st] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users?filter=all"), api.get("/admin/documents?filter=all"), api.get("/admin/applications?status=all"), api.get("/leads"), api.get("/units")]);
      setStats(s.data); setUsers(u.data || []); setDocuments(d.data || []); setApplications(a.data || []); setLeads(l.data || []); setUnits(st.data || []);
      await Promise.allSettled([fetchVisits(), fetchTrafficSummary(), fetchTrust()]);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => setStats((await api.get("/admin/stats")).data);
  const fetchUsers = async () => setUsers((await api.get("/admin/users?filter=all")).data || []);
  const fetchDocuments = async () => setDocuments((await api.get("/admin/documents?filter=all")).data || []);
  const fetchApplications = async () => setApplications((await api.get("/admin/applications?status=all")).data || []);
  const fetchLeads = async () => setLeads((await api.get("/leads")).data || []);
  const fetchUnits = async () => setUnits((await api.get("/units")).data || []);
  const fetchTrust = async () => setTrust((await api.get("/trust/leaderboard")).data || []);
  const fetchVisits = async () => { try { const res = await api.get("/visits"); setVisits(Array.isArray(res.data) ? res.data : []); } catch { setVisits([]); } };
  const fetchTrafficSummary = async () => { try { const res = await api.get("/admin/traffic-summary"); setTrafficSummary(normalizeTrafficSummary(res.data)); } catch { setTrafficSummary(null); } };

  const refreshCurrentTab = async () => {
    if (activeTab === "overview") await fetchAll();
    if (activeTab === "users") await fetchUsers();
    if (activeTab === "traffic") await Promise.allSettled([fetchVisits(), fetchTrafficSummary()]);
    if (activeTab === "applications") await fetchApplications();
    if (activeTab === "documents") await fetchDocuments();
    if (activeTab === "leads") await fetchLeads();
    if (activeTab === "stock") await fetchUnits();
    if (activeTab === "trust") await fetchTrust();
    await fetchStats();
  };
  const act = async (id: string, fn: () => Promise<any>) => { setActionLoading(id); try { await fn(); } finally { setActionLoading(null); } };

  const cityOptions = useMemo(() => Array.from(new Set(users.map((u) => u.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr")), [users]);
  const visitByUser = useMemo(() => {
    const map = new Map<string, VisitItem>();
    for (const visit of visits) {
      const id = visit.user?.id || visit.userId;
      if (!id) continue;
      const current = map.get(id);
      if (!current || new Date(visit.createdAt || 0).getTime() > new Date(current.createdAt || 0).getTime()) map.set(id, visit);
    }
    return map;
  }, [visits]);
  const usersWithPresence = useMemo(() => users.map((u) => ({ ...u, lastVisit: visitByUser.get(u.id), presence: presenceFromDate(visitByUser.get(u.id)?.createdAt) })), [users, visitByUser]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLocaleLowerCase("tr-TR");
    return usersWithPresence.filter((u) => {
      const haystack = `${u.firstName} ${u.lastName} ${u.email} ${u.phone || ""} ${u.memberCode || ""} ${u.city || ""} ${u.district || ""}`.toLocaleLowerCase("tr-TR");
      return (!q || haystack.includes(q)) && (roleFilter === "all" || u.role === roleFilter) && (cityFilter === "all" || u.city === cityFilter);
    });
  }, [usersWithPresence, userSearch, roleFilter, cityFilter]);
  const trafficRows = useMemo(() => {
    const rows = usersWithPresence.map((u) => ({ user: u, visit: u.lastVisit, presence: u.presence }));
    if (trafficFilter === "online") return rows.filter((r) => r.presence.label === "Online");
    if (trafficFilter === "away") return rows.filter((r) => r.presence.label === "Away");
    if (trafficFilter === "offline") return rows.filter((r) => r.presence.label === "Offline");
    return rows;
  }, [usersWithPresence, trafficFilter]);

  const navItems: { key: TabKey; label: string; icon: ReactNode; badge?: number }[] = [
    { key: "overview", label: "Özet", icon: <LayoutDashboard size={18} /> },
    { key: "users", label: "Üyeler", icon: <UsersRound size={18} />, badge: stats?.pendingUsers || 0 },
    { key: "traffic", label: "Canlı Trafik", icon: <Activity size={18} /> },
    { key: "messages", label: "Kurumsal Mesajlar", icon: <MessageSquareText size={18} /> },
    { key: "applications", label: "Başvurular", icon: <Mail size={18} />, badge: stats?.pendingApplications || 0 },
    { key: "documents", label: "Belgeler", icon: <FileText size={18} />, badge: stats?.pendingDocuments || 0 },
    { key: "leads", label: "Lina", icon: <Sparkles size={18} />, badge: leads.length },
    { key: "stock", label: "Stok", icon: <Database size={18} /> },
    { key: "trust", label: "Skorlar", icon: <ShieldCheck size={18} /> },
  ];

  if (!hydrated || loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950"><div className="text-center"><div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" /><p className="mt-5 text-sm font-black uppercase tracking-[0.24em] text-slate-500">EPH Yönetim Merkezi açılıyor</p></div></main>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      {roleModal && <Modal title="Rol Değiştir" desc="Kullanıcının platform rolünü güncelle." onClose={() => { setRoleModal(null); setNewRole(""); }}><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Yeni Rol</label><select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 outline-none focus:border-sky-400"><option value="">Seçiniz</option><option value="EMLAKCI">Emlakçı</option><option value="MUTEAHHIT">Müteahhit</option><option value="INSAAT_FIRMASI">İnşaat Firması</option></select><div className="mt-5 flex justify-end gap-3"><PrimaryButton tone="light" onClick={() => { setRoleModal(null); setNewRole(""); }}>Vazgeç</PrimaryButton><PrimaryButton disabled={!newRole || actionLoading === roleModal.id} icon={<UserCog size={15} />} onClick={() => act(roleModal.id, async () => { await api.patch(`/admin/users/${roleModal.id}/role`, { role: newRole }); await Promise.all([fetchUsers(), fetchStats()]); setRoleModal(null); setNewRole(""); })}>Güncelle</PrimaryButton></div></Modal>}

      {createUserModal && <Modal title="Yeni Üye Ekle" desc="Manuel olarak onaylı kullanıcı oluştur." onClose={() => { setCreateUserModal(false); setCreateUserError(""); }}><div className="grid gap-4 sm:grid-cols-2"><Input label="Ad" value={createUserForm.firstName} onChange={(v) => setCreateUserForm((c) => ({ ...c, firstName: v }))} /><Input label="Soyad" value={createUserForm.lastName} onChange={(v) => setCreateUserForm((c) => ({ ...c, lastName: v }))} /></div><div className="mt-4 grid gap-4"><Input label="E-posta" type="email" value={createUserForm.email} onChange={(v) => setCreateUserForm((c) => ({ ...c, email: v }))} /><Input label="Telefon" value={createUserForm.phone} onChange={(v) => setCreateUserForm((c) => ({ ...c, phone: v }))} /><Input label="Şifre" type="password" value={createUserForm.password} onChange={(v) => setCreateUserForm((c) => ({ ...c, password: v }))} /><div><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rol</label><select value={createUserForm.role} onChange={(e) => setCreateUserForm((c) => ({ ...c, role: e.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 outline-none focus:border-sky-400"><option value="EMLAKCI">Emlakçı</option><option value="MUTEAHHIT">Müteahhit</option><option value="INSAAT_FIRMASI">İnşaat Firması</option><option value="ADMIN">Admin</option></select></div></div>{createUserError && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{createUserError}</p>}<div className="mt-5 flex justify-end gap-3"><PrimaryButton tone="light" onClick={() => { setCreateUserModal(false); setCreateUserError(""); }}>Vazgeç</PrimaryButton><PrimaryButton disabled={createUserLoading} icon={<Plus size={15} />} onClick={async () => { if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.phone || !createUserForm.password) { setCreateUserError("Tüm alanlar zorunludur."); return; } setCreateUserLoading(true); setCreateUserError(""); try { await api.post("/admin/users", createUserForm); setCreateUserModal(false); setCreateUserForm({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" }); await Promise.all([fetchUsers(), fetchStats()]); } catch (error: any) { setCreateUserError(error?.response?.data?.message || "Bir hata oluştu."); } finally { setCreateUserLoading(false); } }}>Üye Ekle</PrimaryButton></div></Modal>}

      <div className="lg:flex">
        <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:block"><AdminBrand /><nav className="mt-8 space-y-2">{navItems.map((item) => <NavButton key={item.key} item={item} active={activeTab === item.key} onClick={() => setActiveTab(item.key)} />)}</nav><div className="mt-8 rounded-3xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Mobil Öncelikli</p><p className="mt-2 text-sm font-bold leading-6 text-slate-200">EPH yönetimi telefon ekranından rahat kullanılacak şekilde yenileniyor.</p></div></aside>
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-8"><div className="flex items-center justify-between gap-3"><button onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"><Menu size={20} /></button><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">EPH Yönetim Merkezi</p><h1 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{navItems.find((i) => i.key === activeTab)?.label || "Özet"}</h1></div><div className="flex items-center gap-2"><Link href="/dashboard" className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 sm:inline-flex">Ana Sayfa</Link><button onClick={refreshCurrentTab} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"><RefreshCw size={18} /></button><button onClick={() => { logout(); router.push("/giris"); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"><LogOut size={18} /></button></div></div></header>
          {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}><aside className="h-full w-[86%] max-w-sm bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><AdminBrand /><button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200"><X size={18} /></button></div><nav className="mt-6 space-y-2">{navItems.map((item) => <NavButton key={item.key} item={item} active={activeTab === item.key} onClick={() => { setActiveTab(item.key); setMenuOpen(false); }} />)}</nav></aside></div>}
          <div className="px-4 py-5 pb-24 lg:px-8 lg:py-8">
            {activeTab === "overview" && <OverviewTab stats={stats} users={usersWithPresence} trafficSummary={trafficSummary} applications={applications} documents={documents} leads={leads} units={units} setActiveTab={setActiveTab} />}
            {activeTab === "users" && <UsersTab users={filteredUsers} allUsers={usersWithPresence} search={userSearch} setSearch={setUserSearch} roleFilter={roleFilter} setRoleFilter={setRoleFilter} cityFilter={cityFilter} setCityFilter={setCityFilter} cityOptions={cityOptions} actionLoading={actionLoading} onCreate={() => setCreateUserModal(true)} onApprove={(id) => act(id, async () => { await api.patch(`/admin/users/${id}/approve`); await Promise.all([fetchUsers(), fetchStats()]); })} onSuspend={(id) => act(id, async () => { await api.patch(`/admin/users/${id}/suspend`); await Promise.all([fetchUsers(), fetchStats()]); })} onDelete={(id) => act(id, async () => { await api.delete(`/admin/users/${id}/reject`); await Promise.all([fetchUsers(), fetchStats()]); })} onRole={(item) => { setRoleModal({ id: item.id, role: item.role }); setNewRole(item.role); }} />}
            {activeTab === "traffic" && <TrafficTab rows={trafficRows} trafficSummary={trafficSummary} trafficFilter={trafficFilter} setTrafficFilter={setTrafficFilter} onRefresh={async () => { await Promise.allSettled([fetchVisits(), fetchTrafficSummary()]); }} />}
            {activeTab === "messages" && <SystemMessagesTab />}
            {activeTab === "applications" && <ApplicationsTab applications={applications} actionLoading={actionLoading} refresh={async () => { await Promise.all([fetchApplications(), fetchStats()]); }} act={act} />}
            {activeTab === "documents" && <DocumentsTab documents={documents} actionLoading={actionLoading} refresh={async () => { await Promise.all([fetchDocuments(), fetchStats()]); }} act={act} />}
            {activeTab === "leads" && <LeadsTab leads={leads} onRefresh={fetchLeads} />}
            {activeTab === "stock" && <StockTab units={units} onRefresh={fetchUnits} />}
            {activeTab === "trust" && <TrustTab trust={trust} onRefresh={fetchTrust} />}
          </div>
          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl lg:hidden"><div className="grid grid-cols-5 gap-1">{navItems.slice(0, 5).map((item) => <button key={item.key} onClick={() => setActiveTab(item.key)} className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-black ${activeTab === item.key ? "bg-slate-950 text-white" : "text-slate-500"}`}>{item.icon}<span className="mt-1 truncate">{item.label}</span>{(item.badge || 0) > 0 && <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-rose-500" />}</button>)}</div></nav>
        </section>
      </div>
    </main>
  );
}

function AdminBrand() { return <Link href="/admin" className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 p-2"><img src="/LOGO_EPH.png" alt="EPH" className="h-full w-full object-contain" /></div><div><p className="text-lg font-black tracking-tight text-slate-950">EPH Admin</p><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Yönetim Merkezi</p></div></Link>; }
function NavButton({ item, active, onClick }: { item: { key: TabKey; label: string; icon: ReactNode; badge?: number }; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-lg shadow-slate-200" : "text-slate-600 hover:bg-slate-100"}`}><span className="flex items-center gap-3">{item.icon}{item.label}</span>{(item.badge || 0) > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white text-slate-950" : "bg-rose-100 text-rose-700"}`}>{item.badge}</span>}</button>; }
function QuickLine({ title, value, icon }: { title: string; value: number; icon: ReactNode }) { return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">{icon}</div><p className="text-sm font-black text-slate-700">{title}</p></div><p className="text-2xl font-black text-slate-950">{value}</p></div>; }
function MemberMini({ user }: { user: UserItem & { presence?: any } }) { const presence = user.presence || presenceFromDate(null); return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="relative"><Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.profileImageUrl} /><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presence.dot}`} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{fullName(user)}</p><p className="truncate text-xs font-bold text-slate-500">{user.memberCode || "Üye No bekleniyor"}</p></div><Pill className={roleClass(user.role)}>{roleLabel(user.role)}</Pill></div>; }
function InfoLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span><span className={`text-right text-xs ${strong ? "font-black text-slate-950" : "font-bold text-slate-600"}`}>{value}</span></div>; }

function OverviewTab({ stats, users, trafficSummary, applications, documents, leads, units, setActiveTab }: { stats: Stats | null; users: (UserItem & { presence: any })[]; trafficSummary: TrafficSummary | null; applications: ApplicationItem[]; documents: DocumentItem[]; leads: LeadItem[]; units: UnitItem[]; setActiveTab: (tab: TabKey) => void }) {
  const onlineCount = trafficSummary?.onlineUsers ?? users.filter((u) => u.presence.label === "Online").length;
  const awayCount = trafficSummary?.awayUsers ?? users.filter((u) => u.presence.label === "Away").length;
  const offlineCount = trafficSummary?.offlineUsers ?? users.filter((u) => u.presence.label === "Offline").length;
  return <div className="space-y-5"><div className="rounded-[32px] bg-slate-950 p-5 text-white shadow-sm lg:p-8"><p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Komuta Merkezi</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Platformu cebinden yönet.</h2><p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">Üye yönetimi, canlı trafik, başvurular ve kurumsal mesajlar tek merkezde toplandı.</p><div className="mt-6 flex flex-wrap gap-2"><PrimaryButton tone="light" icon={<UsersRound size={16} />} onClick={() => setActiveTab("users")}>Üyelere Git</PrimaryButton><PrimaryButton tone="light" icon={<Activity size={16} />} onClick={() => setActiveTab("traffic")}>Canlı Trafik</PrimaryButton><Link href="/admin/system-messages"><PrimaryButton tone="light" icon={<MessageSquareText size={16} />}>Kurumsal Mesaj</PrimaryButton></Link></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Bugünkü Ziyaret" value={trafficSummary?.todayVisits ?? 0} icon={<Eye size={20} />} desc="Trafik merkezi" /><StatCard title="Bu Hafta" value={trafficSummary?.weekVisits ?? 0} icon={<Activity size={20} />} desc="Toplam ziyaret" /><StatCard title="Bu Ay" value={trafficSummary?.monthVisits ?? 0} icon={<Globe2 size={20} />} desc="Aylık hareket" /><StatCard title="Online Üye" value={onlineCount} icon={<Wifi size={20} />} desc="Son 5 dakika" /></div><div className="grid gap-3 sm:grid-cols-3"><StatCard title="Online" value={onlineCount} icon={<Wifi size={20} />} desc="Aktif kullanıcı" /><StatCard title="Away" value={awayCount} icon={<Timer size={20} />} desc="Kısa süre pasif" /><StatCard title="Offline" value={offlineCount} icon={<UsersRound size={20} />} desc="Çevrimdışı" /></div><div className="grid gap-5 xl:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><SectionHeader title="Son Üyeler" desc="Üye no ve şehir bilgileriyle birlikte." action={<button onClick={() => setActiveTab("users")} className="text-sm font-black text-sky-700">Tümünü Gör</button>} /><div className="space-y-3">{users.slice(0, 5).map((u) => <MemberMini key={u.id} user={u} />)}{users.length === 0 && <Empty>Üye yok.</Empty>}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><SectionHeader title="Bekleyen İşler" desc="Başvuru ve belge kontrol listesi." /><div className="space-y-3"><QuickLine title="Bekleyen başvurular" value={applications.filter((a) => a.status === "PENDING").length} icon={<Mail size={18} />} /><QuickLine title="Bekleyen belgeler" value={documents.filter((d) => d.status === "PENDING").length} icon={<FileText size={18} />} /><QuickLine title="Lina aday kayıtları" value={leads.length} icon={<Sparkles size={18} />} /></div></div></div></div>;
}

function UsersTab({ users, allUsers, search, setSearch, roleFilter, setRoleFilter, cityFilter, setCityFilter, cityOptions, actionLoading, onCreate, onApprove, onSuspend, onDelete, onRole }: { users: (UserItem & { lastVisit?: VisitItem; presence: any })[]; allUsers: (UserItem & { lastVisit?: VisitItem; presence: any })[]; search: string; setSearch: (v: string) => void; roleFilter: string; setRoleFilter: (v: string) => void; cityFilter: string; setCityFilter: (v: string) => void; cityOptions: string[]; actionLoading: string | null; onCreate: () => void; onApprove: (id: string) => void; onSuspend: (id: string) => void; onDelete: (id: string) => void; onRole: (u: UserItem) => void }) {
  return <section><SectionHeader title="Üyeler" desc={`${users.length} kayıt gösteriliyor. Toplam ${allUsers.length} üye.`} action={<PrimaryButton icon={<Plus size={16} />} onClick={onCreate}>Yeni Üye</PrimaryButton>} /><div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, e-posta, şehir veya üye no ara..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none focus:border-sky-400" /></div><select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-sky-400"><option value="all">Tüm Şehirler</option>{cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}</select><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-sky-400"><option value="all">Tüm Roller</option><option value="EMLAKCI">Emlakçı</option><option value="MUTEAHHIT">Müteahhit</option><option value="INSAAT_FIRMASI">İnşaat Firması</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Süper Admin</option></select></div>{users.length === 0 ? <Empty>Kullanıcı bulunamadı.</Empty> : <div className="space-y-3">{users.map((u) => <div key={u.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"><div className="flex items-start gap-3"><div className="relative"><Avatar firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} size="lg" /><span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${u.presence.dot}`} /></div><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{u.firstName} {u.lastName}</h3><p className="truncate text-sm font-bold text-slate-500">{u.email}</p><p className="text-xs font-bold text-slate-400">{u.phone || "Telefon yok"}</p><div className="mt-2 flex flex-wrap gap-2"><Pill className={roleClass(u.role)}>{roleLabel(u.role)}</Pill><Pill className={u.isApproved ? statusClass("APPROVED") : statusClass("PENDING")}>{u.isApproved ? "Onaylı" : "Bekliyor"}</Pill><Pill className={u.presence.badge}>{u.presence.label}</Pill></div></div></div><div className="grid gap-2 rounded-2xl bg-slate-50 p-3"><InfoLine label="Üye No" value={u.memberCode || "Atanmadı"} strong /><InfoLine label="Konum" value={`${u.city || "Şehir yok"}${u.district ? ` / ${u.district}` : ""}`} /><InfoLine label="Bölge Kodu" value={u.cityPlateCode ? `TR ${u.cityPlateCode}` : "—"} /><InfoLine label="Son Aktivite" value={fmt(u.lastVisit?.createdAt)} /></div><div className="flex flex-wrap gap-2 lg:justify-end">{!u.isApproved && <PrimaryButton tone="success" disabled={actionLoading === u.id} icon={<Check size={15} />} onClick={() => onApprove(u.id)}>Onayla</PrimaryButton>}{u.role !== "ADMIN" && u.role !== "SUPER_ADMIN" && <>{u.isApproved && <PrimaryButton tone="light" disabled={actionLoading === u.id} onClick={() => { if (confirm("Kullanıcı askıya alınacak. Emin misiniz?")) onSuspend(u.id); }}>Askıya Al</PrimaryButton>}<PrimaryButton tone="light" icon={<UserCog size={15} />} onClick={() => onRole(u)}>Rol</PrimaryButton><PrimaryButton tone="danger" disabled={actionLoading === u.id} icon={<Trash2 size={15} />} onClick={() => { if (confirm("Kullanıcı silinecek. Emin misiniz?")) onDelete(u.id); }}>Sil</PrimaryButton></>}{(u.role === "ADMIN" || u.role === "SUPER_ADMIN") && <PrimaryButton tone="light" icon={<ShieldCheck size={15} />}>Yetkili</PrimaryButton>}</div></div></div>)}</div>}</section>;
}

function TrafficTab({ rows, trafficSummary, trafficFilter, setTrafficFilter, onRefresh }: { rows: { user: UserItem; visit?: VisitItem; presence: any }[]; trafficSummary: TrafficSummary | null; trafficFilter: string; setTrafficFilter: (v: string) => void; onRefresh: () => void }) {
  const onlineCount = trafficSummary?.onlineUsers ?? rows.filter((r) => r.presence.label === "Online").length;
  const awayCount = trafficSummary?.awayUsers ?? rows.filter((r) => r.presence.label === "Away").length;
  const offlineCount = trafficSummary?.offlineUsers ?? rows.filter((r) => r.presence.label === "Offline").length;

  return <section className="space-y-5"><SectionHeader title="Admin Trafik Merkezi" desc="Yeni trafik API'sinden gelen ziyaret, durum ve aktiflik verileri." action={<PrimaryButton tone="light" icon={<RefreshCw size={16} />} onClick={onRefresh}>Yenile</PrimaryButton>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Bugünkü Ziyaret" value={trafficSummary?.todayVisits ?? 0} icon={<Eye size={20} />} desc="Bugün gelen toplam hareket" />
      <StatCard title="Bu Hafta" value={trafficSummary?.weekVisits ?? 0} icon={<Activity size={20} />} desc="Haftalık trafik" />
      <StatCard title="Bu Ay" value={trafficSummary?.monthVisits ?? 0} icon={<Globe2 size={20} />} desc="Aylık trafik" />
      <StatCard title="Online" value={onlineCount} icon={<Wifi size={20} />} desc="Son 5 dakika" />
      <StatCard title="Away" value={awayCount} icon={<Timer size={20} />} desc="5-20 dakika arası" />
      <StatCard title="Offline" value={offlineCount} icon={<UsersRound size={20} />} desc="20 dakika üstü" />
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title="En Aktif Sayfalar" desc="Trafik özet API'sinden gelen sayfa sıralaması." />
        {trafficSummary?.topPages?.length ? <div className="space-y-3">{trafficSummary.topPages.map((item, index) => <div key={`${item.page}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{item.page}</p><p className="text-xs font-bold text-slate-400">#{index + 1} aktif sayfa</p></div><Pill className="border-sky-200 bg-sky-50 text-sky-800">{item.count} ziyaret</Pill></div>)}</div> : <Empty>Henüz aktif sayfa özeti yok.</Empty>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader title="En Aktif Üyeler" desc="Üye bazlı ziyaret yoğunluğu." />
        {trafficSummary?.topUsers?.length ? <div className="space-y-3">{trafficSummary.topUsers.map((item, index) => <div key={`${item.userId || item.id || item.email || index}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><Avatar firstName={item.firstName} lastName={item.lastName} imageUrl={item.profileImageUrl} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{fullName(item)}</p><p className="truncate text-xs font-bold text-slate-500">{item.email || item.memberCode || "Üye bilgisi bekleniyor"}</p><p className="text-xs font-bold text-slate-400">Son aktivite: {fmt(item.lastSeen)}</p></div><div className="text-right"><Pill className={roleClass(item.role || "")}>{roleLabel(item.role)}</Pill><p className="mt-2 text-sm font-black text-slate-950">{item.count} ziyaret</p></div></div>)}</div> : <Empty>Henüz aktif üye özeti yok.</Empty>}
      </div>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <SectionHeader title="Kullanıcı Durumları" desc="Eski /visits verisiyle son aktif üyeler listesi. Filtreler burada çalışmaya devam eder." />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">{[{ value: "all", label: "Tümü" }, { value: "online", label: "Online" }, { value: "away", label: "Away" }, { value: "offline", label: "Offline" }].map((item) => <button key={item.value} onClick={() => setTrafficFilter(item.value)} className={`rounded-2xl border px-4 py-3 text-xs font-black ${trafficFilter === item.value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>)}</div>
      {rows.length === 0 ? <Empty>Trafik verisi bulunamadı.</Empty> : <div className="space-y-3">{rows.map(({ user, visit, presence }) => <div key={user.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center"><div className="flex items-center gap-3"><div className="relative"><Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.profileImageUrl} /><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presence.dot}`} /></div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{fullName(user)}</p><p className="truncate text-xs font-bold text-slate-500">{user.email}</p></div></div><div className="grid gap-1 text-xs font-bold text-slate-600"><p>Son Sayfa: <span className="font-black text-slate-950">{visit?.page || "—"}</span></p><p>Son Aktivite: <span className="font-black text-slate-950">{fmt(visit?.createdAt)}</span></p></div><div className="flex justify-start lg:justify-end"><Pill className={presence.badge}>{presence.label}</Pill></div></div></div>)}</div>}
    </div>
  </section>;
}
function SystemMessagesTab() { return <section><SectionHeader title="Kurumsal Mesajlar" desc="Şehir ve rol bazlı duyuru gönderim merkezi." /><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-2xl font-black text-slate-950">Kurumsal İletişim Merkezi</h3><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Bu bölüm ayrı ekranda çalışıyor. Admin V2 içinde hızlı erişim kartı olarak konumlandırıldı.</p></div><Link href="/admin/system-messages"><PrimaryButton icon={<MessageSquareText size={16} />}>Mesaj Merkezini Aç</PrimaryButton></Link></div></div></section>; }
function ApplicationsTab({ applications, actionLoading, refresh, act }: { applications: ApplicationItem[]; actionLoading: string | null; refresh: () => Promise<void>; act: (id: string, fn: () => Promise<any>) => Promise<void> }) { return <section><SectionHeader title="Başvurular" desc={`${applications.length} başvuru · ${applications.filter((a) => a.status === "PENDING").length} bekleyen.`} />{applications.length === 0 ? <Empty>Başvuru bulunamadı.</Empty> : <div className="space-y-3">{applications.map((a) => <div key={a.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><h3 className="text-lg font-black text-slate-950">{a.applicantName}</h3><p className="text-sm font-bold text-slate-500">{a.applicantEmail} · {a.applicantPhone}</p><p className="mt-1 text-xs font-bold text-slate-400">{fmt(a.createdAt)}</p><div className="mt-3 flex flex-wrap gap-2"><Pill className={roleClass(a.requestedRole)}>{roleLabel(a.requestedRole)}</Pill><Pill className={statusClass(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill></div>{a.message && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">{a.message}</p>}</div><div className="flex flex-wrap gap-2 lg:justify-end">{a.status === "PENDING" && <><PrimaryButton tone="success" disabled={actionLoading === a.id} onClick={() => act(a.id, async () => { await api.patch(`/admin/applications/${a.id}/status`, { status: "APPROVED" }); await refresh(); })}>Onayla</PrimaryButton><PrimaryButton tone="danger" disabled={actionLoading === a.id} onClick={() => act(a.id, async () => { await api.patch(`/admin/applications/${a.id}/status`, { status: "REJECTED" }); await refresh(); })}>Reddet</PrimaryButton></>}{a.status === "APPROVED" && <PrimaryButton disabled={actionLoading === a.id} onClick={() => act(a.id, async () => { await api.patch(`/admin/applications/${a.id}/status`, { status: "INVITED" }); await refresh(); })}>Davet Gönder</PrimaryButton>}</div></div></div>)}</div>}</section>; }
function DocumentsTab({ documents, actionLoading, refresh, act }: { documents: DocumentItem[]; actionLoading: string | null; refresh: () => Promise<void>; act: (id: string, fn: () => Promise<any>) => Promise<void> }) { return <section><SectionHeader title="Belgeler" desc={`${documents.length} belge kaydı.`} />{documents.length === 0 ? <Empty>Belge bulunamadı.</Empty> : <div className="space-y-3">{documents.map((d) => <div key={d.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center"><div className="flex items-center gap-3"><Avatar firstName={d.user?.firstName} lastName={d.user?.lastName} imageUrl={d.user?.profileImageUrl} /><div><h3 className="text-sm font-black text-slate-950">{DOC_LABELS[d.type] || d.type}</h3><p className="text-xs font-bold text-slate-500">{d.fileName}</p><p className="text-xs font-bold text-slate-400">{d.user ? `${d.user.firstName} ${d.user.lastName}` : "Kullanıcı yok"}</p><div className="mt-2"><Pill className={statusClass(d.status)}>{STATUS_LABELS[d.status] || d.status}</Pill></div></div></div><div className="flex flex-wrap gap-2 lg:justify-end"><a href={d.fileUrl} target="_blank" rel="noreferrer"><PrimaryButton tone="light" icon={<Eye size={15} />}>Görüntüle</PrimaryButton></a>{d.status === "PENDING" && <><PrimaryButton tone="success" disabled={actionLoading === d.id} onClick={() => act(d.id, async () => { await api.patch(`/admin/documents/${d.id}/approve`); await refresh(); })}>Onayla</PrimaryButton><PrimaryButton tone="danger" disabled={actionLoading === d.id} onClick={() => act(d.id, async () => { await api.patch(`/admin/documents/${d.id}/reject`); await refresh(); })}>Reddet</PrimaryButton></>}</div></div></div>)}</div>}</section>; }
function LeadsTab({ leads, onRefresh }: { leads: LeadItem[]; onRefresh: () => void }) { return <section><SectionHeader title="Lina Adayları" desc={`${leads.length} aday kaydı.`} action={<PrimaryButton tone="light" icon={<RefreshCw size={16} />} onClick={onRefresh}>Yenile</PrimaryButton>} />{leads.length === 0 ? <Empty>Henüz Lina lead kaydı yok.</Empty> : <div className="grid gap-3 md:grid-cols-2">{leads.map((l) => <div key={l.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-black text-slate-950">{l.fullName || "İsimsiz Lead"}</h3><div className="mt-2 grid gap-1 text-sm font-bold text-slate-500">{l.phone && <p>📞 {l.phone}</p>}{l.email && <p>✉️ {l.email}</p>}{l.city && <p>📍 {l.city}</p>}{l.interest && <p>🎯 {l.interest}</p>}</div><p className="mt-3 text-xs font-bold text-slate-400">{fmt(l.createdAt)}</p></div>)}</div>}</section>; }
function StockTab({ units, onRefresh }: { units: UnitItem[]; onRefresh: () => void }) { return <section><SectionHeader title="Stok" desc={`${units.length} birim.`} action={<PrimaryButton tone="light" icon={<RefreshCw size={16} />} onClick={onRefresh}>Yenile</PrimaryButton>} />{units.length === 0 ? <Empty>Birim bulunamadı.</Empty> : <div className="grid gap-3 lg:grid-cols-2">{units.map((u) => <div key={u.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-black text-slate-950">{u.project?.name}</h3><p className="text-sm font-bold text-slate-500">{u.project?.city} / {u.project?.district}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600"><InfoBox label="Durum" value={UNIT_STATUS_LABELS[u.status] || u.status} /><InfoBox label="No / Kat" value={`${u.number} / ${u.floor ?? "—"}`} /><InfoBox label="Alan" value={u.area ? `${u.area} m²` : "—"} /><InfoBox label="Fiyat" value={money(u.price)} /></div></div>)}</div>}</section>; }
function InfoBox({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-950">{value}</p></div>; }
function TrustTab({ trust, onRefresh }: { trust: TrustItem[]; onRefresh: () => void }) { return <section><SectionHeader title="Güven Skorları" desc="Üyelerin platform güven göstergeleri." action={<PrimaryButton tone="light" icon={<RefreshCw size={16} />} onClick={onRefresh}>Yenile</PrimaryButton>} />{trust.length === 0 ? <Empty>Henüz güven skoru verisi yok.</Empty> : <div className="space-y-3">{trust.map((t, i) => <div key={t.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="text-2xl font-black text-slate-300">#{i + 1}</div><Avatar firstName={t.firstName} lastName={t.lastName} imageUrl={t.profileImageUrl} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{t.firstName} {t.lastName}</p><p className="text-xs font-bold text-slate-500">{roleLabel(t.role)} · {t.badge}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${t.score}%`, background: t.badgeColor }} /></div></div><div className="text-2xl font-black text-slate-950">{t.score}</div></div></div>)}</div>}</section>; }
