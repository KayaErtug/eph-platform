"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  Crown,
  Eye,
  FileText,
  Mail,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  UsersRound,
  X,
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
  DENETCI_ADMIN: "Denetçi Admin",
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
  if (role === "ADMIN" || role === "DENETCI_ADMIN") return "border-[#D7B56D]/50 bg-[#FFF8E7] text-[#8A671F]";
  if (role === "MUTEAHHIT" || role === "INSAAT_FIRMASI") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusClass(status: string) {
  if (status === "APPROVED" || status === "REGISTERED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "INVITED") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "GORUSME_PLANLANDI") return "border-purple-200 bg-purple-50 text-purple-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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
    <div className={`${big ? "h-16 w-16 text-xl" : "h-12 w-12 text-base"} shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-[#0D2137] to-[#1B3D63] shadow-lg`}>
      {imageUrl ? (
        <img src={imageUrl} alt={`${firstName || ""} ${lastName || ""}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-black text-[#F7DFA3]">
          {initials(firstName, lastName)}
        </div>
      )}
    </div>
  );
}

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${className}`}>{children}</span>;
}

function Button({
  children,
  onClick,
  disabled,
  variant = "navy",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "navy" | "gold" | "ghost" | "danger" | "success";
  icon?: ReactNode;
}) {
  const classes =
    variant === "gold"
      ? "bg-[#D7B56D] text-[#0D2137] hover:bg-[#c9a556]"
      : variant === "ghost"
        ? "border border-slate-200 bg-white text-slate-600 hover:border-[#0D2137] hover:text-[#0D2137]"
        : variant === "danger"
          ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
          : variant === "success"
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-[#0D2137] text-white hover:bg-[#163657]";
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}>
      {icon}
      {children}
    </button>
  );
}

function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:text-left">
      <div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#0D2137]">{title}</h2>
        {desc && <p className="mt-1 text-sm font-medium text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/70 p-12 text-center font-serif text-xl italic text-slate-400">{children}</div>;
}

function FilterBar({ value, setValue, items }: { value: string; setValue: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2 lg:justify-start">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setValue(item.value)}
          className={`rounded-full border px-4 py-2 text-xs font-black transition ${
            value === item.value ? "border-[#0D2137] bg-[#0D2137] text-white" : "border-white bg-white/75 text-slate-500 hover:text-[#0D2137]"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D2137]/70 p-4 backdrop-blur-md" onClick={onClose}>
      <section className="w-full max-w-xl rounded-[32px] border border-white/80 bg-[#F8F3EA] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-3xl font-semibold text-[#0D2137]">{title}</h3>
            {desc && <p className="mt-1 text-sm font-semibold text-slate-500">{desc}</p>}
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500">
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
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-[#D7B56D]" />
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
    if (!hydrated) return;
    if (!user) {
      router.push("/giris");
      return;
    }
    if (user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchAll();
  }, [hydrated, user]);

  useEffect(() => {
    if (hydrated && user?.role === "ADMIN") fetchUsers(userFilter);
  }, [userFilter]);

  useEffect(() => {
    if (hydrated && user?.role === "ADMIN") fetchDocuments(docFilter);
  }, [docFilter]);

  useEffect(() => {
    if (hydrated && user?.role === "ADMIN") fetchNominations(nomFilter);
  }, [nomFilter]);

  useEffect(() => {
    if (hydrated && user?.role === "ADMIN") fetchApplications(appFilter);
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

  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number | null; onEnter?: () => void }[] = [
    { key: "overview", label: "Özet", icon: <Crown size={17} /> },
    { key: "users", label: "Kullanıcılar", icon: <UsersRound size={17} />, badge: stats?.pendingUsers },
    { key: "applications", label: "Başvurular", icon: <Mail size={17} />, badge: stats?.pendingApplications },
    { key: "documents", label: "Belgeler", icon: <FileText size={17} />, badge: stats?.pendingDocuments },
    { key: "nominations", label: "Tavsiyeler", icon: <UserCheck size={17} />, badge: stats?.pendingNominations },
    { key: "leads", label: "Lina Leads", icon: <Sparkles size={17} />, badge: leads.length, onEnter: fetchLeads },
    { key: "stock", label: "Stok", icon: <PackageCheck size={17} />, onEnter: fetchUnits },
    { key: "trust", label: "Güven", icon: <ShieldCheck size={17} />, onEnter: fetchTrust },
    { key: "visits", label: "Ziyaretler", icon: <BarChart3 size={17} />, onEnter: fetchVisits },
  ];

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F1E8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#D7B56D] border-t-transparent" />
          <p className="text-sm font-black tracking-[0.25em] text-[#0D2137]">EPH ADMIN</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0B1F44_0%,#07111F_42%,#020617_100%)] text-[#0D2137]">
      {noteModal && (
        <Modal
          title="Admin Notu"
          desc="Bu not sadece yönetim panelinde görünür."
          onClose={() => {
            setNoteModal(null);
            setNoteText("");
          }}
        >
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={5} placeholder="Notunuzu yazın..." className="w-full resize-none rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm font-semibold outline-none focus:border-[#D7B56D]" />
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
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Yeni Rol</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-[#D7B56D]">
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
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Rol</label>
              <select value={createUserForm.role} onChange={(e) => setCreateUserForm((c) => ({ ...c, role: e.target.value }))} className="h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 text-sm font-black outline-none focus:border-[#D7B56D]">
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          {createUserError && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{createUserError}</p>}
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

      <header className="sticky top-0 z-40 border-b border-cyan-300/15 bg-[#050B1A]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-white/5 text-cyan-100 shadow-lg shadow-cyan-500/10 transition hover:border-[#D7B56D]/60 hover:text-[#F7DFA3]"
              title="Geri Dön"
            >
              <ArrowLeft size={19} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-xl" />
                <img src="/LOGO_EPH.png" alt="EPH" className="relative h-11 w-11 object-contain" />
              </div>
              <div>
                <p className="font-serif text-xl font-semibold text-white">EPH Platform</p>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D7B56D]">Command Center</p>
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
              className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 shadow-sm transition hover:bg-rose-500/20"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="relative overflow-hidden rounded-[42px] border border-cyan-300/20 bg-[#061126] shadow-2xl shadow-cyan-950/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.26),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(215,181,109,0.22),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(29,78,216,0.30),transparent_38%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
          <div className="absolute left-8 top-8 h-28 w-28 rounded-full border border-cyan-300/10" />
          <div className="absolute bottom-8 right-8 h-40 w-40 rounded-full border border-[#D7B56D]/10" />

          <div className="relative z-10 grid gap-6 p-6 text-white lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
                  <Crown size={16} />
                  EPH Cockpit
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Sistem Aktif
                </span>
              </div>

              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
                Uzay Gemisi
                <span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">
                  Yönetim Kokpiti
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
                Üye kabulü, belge doğrulama, başvuru denetimi, stok güvenliği ve platform trafiği tek komuta ekranında izlenir.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <CockpitMini title="Görev Modu" value="Güvenli" icon={<ShieldCheck size={18} />} />
                <CockpitMini title="Canlı Saat" value={now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} icon={<Bell size={18} />} />
                <CockpitMini title="Tarih" value={now.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} icon={<Sparkles size={18} />} />
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button variant="gold" icon={<Plus size={15} />} onClick={() => setCreateUserModal(true)}>Yeni Üye Ekle</Button>
                <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={refreshCurrentTab}>Verileri Yenile</Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[34px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">Operasyon Radarı</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Öncelikli Sinyaller</h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#D7B56D]/25 bg-[#D7B56D]/10 text-[#F7DFA3]">
                    <BarChart3 size={25} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <CockpitSignal label="Bekleyen Başvuru" value={stats?.pendingApplications || 0} tone="gold" />
                  <CockpitSignal label="Bekleyen Belge" value={stats?.pendingDocuments || 0} tone="cyan" />
                  <CockpitSignal label="Onay Bekleyen Üye" value={stats?.pendingUsers || 0} tone="rose" />
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D7B56D]">Komuta Notu</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                  Özel müşteri ve görev verileri kullanıcı bazlı izole edilir. Admin paneli operasyonu yönetir; mahrem veriler yetki kuralına göre korunur.
                </p>
              </div>
            </div>
          </div>
        </div>

        {stats && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Metric title="Toplam Üye" value={stats.totalUsers} icon={<UsersRound size={20} />} />
            <Metric title="Bekleyen Üye" value={stats.pendingUsers} icon={<Bell size={20} />} tone="amber" />
            <Metric title="Onaylanan" value={stats.approvedUsers} icon={<UserCheck size={20} />} tone="green" />
            <Metric title="Davet Kodu" value={stats.totalInvitations} icon={<Mail size={20} />} tone="gold" />
            <Metric title="Bekleyen Belge" value={stats.pendingDocuments} icon={<FileText size={20} />} tone="amber" />
            <Metric title="Tavsiyeler" value={stats.pendingNominations} icon={<UserCheck size={20} />} tone="amber" />
            <Metric title="Başvurular" value={stats.pendingApplications} icon={<BarChart3 size={20} />} tone="amber" />
          </div>
        )}

        {stats && stats.byRole.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-sm">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Rol Dağılımı</span>
            {stats.byRole.map((item) => (
              <Pill key={item.role} className={roleClass(item.role)}>{ROLE_LABELS[item.role] || item.role}: {item.count}</Pill>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2 overflow-x-auto rounded-[28px] border border-white/70 bg-white/70 p-2 shadow-sm">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const badge = tab.badge || 0;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); tab.onEnter?.(); }}
                className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black transition-all ${active ? "bg-[#0D2137] text-white shadow-lg shadow-slate-300" : "text-slate-500 hover:bg-white hover:text-[#0D2137]"}`}
              >
                {tab.icon}
                {tab.label}
                {badge > 0 && <span className="ml-1 rounded-full bg-[#D7B56D] px-2 py-0.5 text-[10px] text-[#0D2137]">{badge}</span>}
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


function CockpitMini({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-cyan-300/15 bg-white/[0.07] p-4 backdrop-blur">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function CockpitSignal({ label, value, tone }: { label: string; value: number; tone: "gold" | "cyan" | "rose" }) {
  const toneClass =
    tone === "gold"
      ? "from-[#D7B56D] to-amber-300 text-[#0D2137]"
      : tone === "rose"
        ? "from-rose-400 to-red-500 text-white"
        : "from-cyan-300 to-blue-400 text-[#061126]";

  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.06] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{label}</span>
      <span className={`rounded-2xl bg-gradient-to-r px-4 py-2 text-lg font-black ${toneClass}`}>{value}</span>
    </div>
  );
}

function Metric({ title, value, icon, tone = "navy" }: { title: string; value: number; icon: ReactNode; tone?: "navy" | "gold" | "green" | "amber" }) {
  const toneClass = tone === "gold" ? "bg-[#FFF8E7] text-[#8A671F]" : tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-[#EEF4FF] text-[#0D2137]";
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-2 font-serif text-4xl font-semibold text-[#0D2137]">{value}</p>
    </div>
  );
}

function Overview({ users, applications, documents, setActiveTab }: { users: UserItem[]; applications: ApplicationItem[]; documents: DocumentItem[]; setActiveTab: (tab: TabKey) => void }) {
  const cards = [
    { title: "Bekleyen Üye", value: users.filter((u) => !u.isApproved).length, tab: "users" as TabKey, icon: <UsersRound size={22} /> },
    { title: "Bekleyen Başvuru", value: applications.filter((a) => a.status === "PENDING").length, tab: "applications" as TabKey, icon: <Mail size={22} /> },
    { title: "Belge İncelemesi", value: documents.filter((d) => d.status === "PENDING").length, tab: "documents" as TabKey, icon: <FileText size={22} /> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Operasyon Özeti" desc="Öncelikli yönetim işleri ve son hareketler." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button key={card.title} onClick={() => setActiveTab(card.tab)} className="rounded-[32px] border border-white/70 bg-white/80 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D2137] text-[#F7DFA3]">{card.icon}</div>
            <p className="font-serif text-5xl font-semibold text-[#0D2137]">{card.value}</p>
            <h3 className="mt-3 text-sm font-black text-[#0D2137]">{card.title}</h3>
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-sm">
          <SectionTitle title="Son Kullanıcılar" />
          <div className="space-y-3">
            {users.slice(0, 5).map((u) => (
              <PersonLine key={u.id} firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} sub={u.email} right={<Pill className={u.isApproved ? statusClass("APPROVED") : statusClass("PENDING")}>{u.isApproved ? "Onaylı" : "Bekliyor"}</Pill>} />
            ))}
          </div>
        </div>
        <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-sm">
          <SectionTitle title="Son Başvurular" />
          <div className="space-y-3">
            {applications.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-3xl border border-slate-100 bg-[#F8F3EA] p-4">
                <p className="font-black text-[#0D2137]">{a.applicantName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{a.applicantEmail}</p>
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
    <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4">
      <Avatar firstName={firstName} lastName={lastName} imageUrl={imageUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#0D2137]">{firstName} {lastName}</p>
        {sub && <p className="truncate text-xs font-semibold text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function UsersTab({ users, filter, setFilter, actionLoading, onApprove, onSuspend, onDelete, onRole }: { users: UserItem[]; filter: string; setFilter: (v: string) => void; actionLoading: string | null; onApprove: (id: string) => void; onSuspend: (id: string) => void; onDelete: (id: string) => void; onRole: (u: UserItem) => void }) {
  return (
    <section>
      <SectionTitle title="Kullanıcı Yönetimi" desc="Üyelik durumları, roller ve doğrulama süreçleri." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekleyen", value: "pending" }, { label: "Onaylanan", value: "approved" }]} />
      {users.length === 0 ? <Empty>Kullanıcı bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} big />
                  <div>
                    <h3 className="text-lg font-black text-[#0D2137]">{u.firstName} {u.lastName}</h3>
                    <p className="text-sm font-semibold text-slate-500">{u.email}</p>
                    <p className="text-xs font-semibold text-slate-400">{u.phone}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(u.role)}>{ROLE_LABELS[u.role] || u.role}</Pill>
                      <Pill className={u.isApproved ? statusClass("APPROVED") : statusClass("PENDING")}>{u.isApproved ? "Onaylı" : "Bekliyor"}</Pill>
                      {(u.documents?.length || 0) > 0 && <Pill className="border-slate-200 bg-slate-50 text-slate-600">{u.documents?.length} belge</Pill>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!u.isApproved && <Button variant="success" disabled={actionLoading === u.id} icon={<Check size={15} />} onClick={() => onApprove(u.id)}>Onayla</Button>}
                  {u.role !== "ADMIN" && (
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
      <SectionTitle title="Başvuru Yönetimi" desc="Aday başvurularını değerlendir, davet sürecini yönet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekliyor", value: "PENDING" }, { label: "Onaylandı", value: "APPROVED" }, { label: "Reddedildi", value: "REJECTED" }, { label: "Davet", value: "INVITED" }, { label: "Kayıt Oldu", value: "REGISTERED" }]} />
      {applications.length === 0 ? <Empty>Başvuru bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {applications.map((a) => (
            <div key={a.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#3D1A1A] text-xl font-black text-[#F7B4B4]">{a.applicantName?.[0] || "A"}</div>
                  <div>
                    <h3 className="text-lg font-black text-[#0D2137]">{a.applicantName}</h3>
                    <p className="text-sm font-semibold text-slate-500">{a.applicantEmail} · {a.applicantPhone}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{fmt(a.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(a.requestedRole)}>{ROLE_LABELS[a.requestedRole] || a.requestedRole}</Pill>
                      <Pill className={statusClass(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill>
                      {a.referrer && <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Referanslı</Pill>}
                    </div>
                    {a.message && <p className="mt-4 max-w-3xl rounded-3xl bg-[#F8F3EA] p-4 text-sm font-medium leading-7 text-slate-600">{a.message}</p>}
                    {a.adminNote && <p className="mt-3 text-sm font-black text-[#B8943F]">📝 {a.adminNote}</p>}
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
      <SectionTitle title="Belge İnceleme" desc="Yüklenen belgeleri görüntüle, onayla veya reddet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekleyen", value: "pending" }, { label: "Onaylanan", value: "approved" }, { label: "Reddedilen", value: "rejected" }]} />
      {documents.length === 0 ? <Empty>Belge bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {documents.map((d) => (
            <div key={d.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar firstName={d.user?.firstName} lastName={d.user?.lastName} imageUrl={d.user?.profileImageUrl} big />
                  <div>
                    <h3 className="text-lg font-black text-[#0D2137]">{DOC_LABELS[d.type] || d.type}</h3>
                    <p className="text-sm font-semibold text-slate-500">{d.fileName}</p>
                    <p className="text-xs font-semibold text-slate-400">{d.user ? `${d.user.firstName} ${d.user.lastName} · ${ROLE_LABELS[d.user.role] || d.user.role}` : "Kullanıcı yok"}</p>
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
      <SectionTitle title="Tavsiye Yönetimi" desc="Üyeler tarafından önerilen adayları yönet." />
      <FilterBar value={filter} setValue={setFilter} items={[{ label: "Tümü", value: "all" }, { label: "Bekliyor", value: "PENDING" }, { label: "Onaylandı", value: "APPROVED" }, { label: "Reddedildi", value: "REJECTED" }, { label: "Davet", value: "INVITED" }, { label: "Kayıt Oldu", value: "REGISTERED" }]} />
      {nominations.length === 0 ? <Empty>Tavsiye bulunamadı.</Empty> : (
        <div className="grid gap-4">
          {nominations.map((n) => (
            <div key={n.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0D2137] text-xl font-black text-[#F7DFA3]">{n.candidateName?.[0] || "A"}</div>
                  <div>
                    <h3 className="text-lg font-black text-[#0D2137]">{n.candidateName}</h3>
                    <p className="text-sm font-semibold text-slate-500">{n.candidateEmail} · {n.candidatePhone}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Öneren: {n.nominator.firstName} {n.nominator.lastName} · {fmt(n.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill className={roleClass(n.candidateRole)}>{ROLE_LABELS[n.candidateRole] || n.candidateRole}</Pill>
                      <Pill className={statusClass(n.status)}>{STATUS_LABELS[n.status] || n.status}</Pill>
                    </div>
                    {n.note && <p className="mt-4 max-w-3xl rounded-3xl bg-[#F8F3EA] p-4 text-sm font-medium leading-7 text-slate-600">{n.note}</p>}
                    {n.adminNote && <p className="mt-3 text-sm font-black text-[#B8943F]">📝 {n.adminNote}</p>}
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
      <SectionTitle title="Lina Leads" desc={`${leads.length} aday kaydı toplandı.`} action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {leads.length === 0 ? <Empty>Henüz Lina lead kaydı yok.</Empty> : (
        <div className="grid gap-4">
          {leads.map((l) => (
            <div key={l.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3D0A1E] text-lg font-black text-[#F7B4CF]">{l.fullName?.[0]?.toUpperCase() || "?"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#0D2137]">{l.fullName || "İsimsiz Lead"}</h3>
                    <Pill className="border-pink-200 bg-pink-50 text-pink-700">Lina</Pill>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500 md:grid-cols-2">
                    {l.phone && <span>📞 {l.phone}</span>}
                    {l.email && <span>✉️ {l.email}</span>}
                    {l.profession && <span>💼 {l.profession}</span>}
                    {l.city && <span>📍 {l.city}</span>}
                    {l.interest && <span className="md:col-span-2">🎯 {l.interest}</span>}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-400">{fmt(l.createdAt)}</p>
                  {l.conversation && (
                    <>
                      <button onClick={() => setExpandedLead(expandedLead === l.id ? null : l.id)} className="mt-4 rounded-full border border-[#D7B56D]/40 bg-[#FFF8E7] px-4 py-2 text-xs font-black text-[#8A671F]">
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
    <div className="mt-4 max-h-72 overflow-auto rounded-3xl border border-slate-100 bg-[#F8F3EA] p-4">
      {(() => {
        try {
          const messages = JSON.parse(conversation || "[]");
          return messages.map((m: { role: string; content: string }, i: number) => (
            <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm font-semibold leading-6 ${m.role === "user" ? "bg-[#0D2137] text-white" : "bg-white text-slate-600"}`}>{m.content}</div>
            </div>
          ));
        } catch {
          return <p className="text-sm font-semibold text-slate-600">{conversation}</p>;
        }
      })()}
    </div>
  );
}

function StockTab({ units, verifyLoading, handleVerify, onRefresh }: { units: UnitItem[]; verifyLoading: string | null; handleVerify: (id: string, field: string, current: boolean) => void; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Stok Doğrulama" desc={`${units.length} birim · ${units.filter((u) => u.isVerified).length} doğrulanmış`} action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {units.length === 0 ? <Empty>Birim bulunamadı.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => (
            <div key={u.id} className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-sm">
              <h3 className="font-serif text-2xl font-semibold text-[#0D2137]">{u.project?.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{u.project?.city} / {u.project?.district} · {u.project?.owner?.firstName} {u.project?.owner?.lastName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StockInfo label="Tip" value={TYPE_LABELS[u.type] || u.type} />
                <StockInfo label="Durum" value={UNIT_STATUS_LABELS[u.status] || u.status} />
                <StockInfo label="No / Kat" value={`${u.number} / ${u.floor ?? "—"}`} />
                <StockInfo label="Alan" value={u.area ? `${u.area} m²` : "—"} />
              </div>
              <div className="mt-4 rounded-3xl bg-[#FFF8E7] p-4 font-serif text-2xl font-semibold text-[#8A671F]">{u.price.toLocaleString("tr-TR")} ₺</div>
              <div className="mt-4 space-y-2">
                {[
                  { key: "tapu", label: "Tapu Doğrulandı", value: u.tapuVerified },
                  { key: "photo", label: "Fotoğraf Doğrulandı", value: u.photoVerified },
                  { key: "yetki", label: "Yetki Belgesi Doğrulandı", value: u.yetkiVerified },
                  { key: "offmarket", label: "Off-Market", value: u.isOffMarket },
                ].map((item) => (
                  <button key={item.key} onClick={() => { if (!verifyLoading) handleVerify(u.id, item.key, item.value); }} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black ${item.value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
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
    <div className="rounded-3xl bg-[#F8F3EA] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0D2137]">{value}</p>
    </div>
  );
}

function TrustTab({ trust, onRefresh }: { trust: TrustItem[]; onRefresh: () => void }) {
  return (
    <section>
      <SectionTitle title="Güven Skorları" desc={`${trust.length} üye sıralandı.`} action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {trust.length === 0 ? <Empty>Henüz güven skoru verisi yok.</Empty> : (
        <div className="rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-sm">
          {trust.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0">
              <div className="font-serif text-3xl font-semibold text-[#D7B56D]">#{i + 1}</div>
              <Avatar firstName={t.firstName} lastName={t.lastName} imageUrl={t.profileImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#0D2137]">{t.firstName} {t.lastName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill className={roleClass(t.role)}>{ROLE_LABELS[t.role] || t.role}</Pill>
                  <span className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: t.badgeColor }}>{t.badge}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${t.score}%`, background: t.badgeColor }} />
                </div>
              </div>
              <div className="font-serif text-3xl font-semibold text-[#0D2137]">{t.score}</div>
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
      <SectionTitle title="Kullanıcı Ziyaretleri" desc="Kim, ne zaman, hangi sayfayı ziyaret etti." action={<Button variant="ghost" icon={<RefreshCw size={15} />} onClick={onRefresh}>Yenile</Button>} />
      {visits.length === 0 ? <Empty>Henüz ziyaret yok.</Empty> : (
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#0D2137] text-left text-white">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Kullanıcı</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Sayfa</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">IP</th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em]">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-5 py-4"><p className="font-black text-[#0D2137]">{v.user ? `${v.user.firstName} ${v.user.lastName}` : "Misafir"}</p><p className="text-xs font-semibold text-slate-500">{v.user?.email}</p></td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">{v.page}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{v.ip}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{fmt(v.createdAt)}</td>
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
