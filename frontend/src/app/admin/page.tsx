"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Crown,
  Eye,
  FileCheck2,
  FileText,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";

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

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImageUrl?: string | null;
  role: string;
  isApproved: boolean;
  isVerified?: boolean;
  nominationPoints?: number;
  nominationQuota?: number;
  referralCode?: string | null;
  createdAt?: string;
  documents: {
    id: string;
    type: string;
    status: string;
    fileUrl: string;
    fileName: string;
    createdAt?: string;
  }[];
};

type DocumentItem = {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  fileName: string;
  createdAt?: string;
  user?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  };
};

type Nomination = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateRole: string;
  note?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  nominator: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  };
};

type Application = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  requestedRole: string;
  message?: string | null;
  referralCode?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  referrer?: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    role: string;
  } | null;
};

type Lead = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  profession?: string | null;
  city?: string | null;
  interest?: string | null;
  conversation?: string | null;
  source: string;
  createdAt: string;
};

type StokUnit = {
  id: string;
  type: string;
  floor?: number | null;
  number: string;
  roomCount?: string | null;
  area?: number | null;
  price: number;
  status: string;
  isVerified: boolean;
  isOffMarket: boolean;
  tapuVerified: boolean;
  photoVerified: boolean;
  yetkiVerified: boolean;
  project?: {
    id: string;
    name: string;
    city: string;
    district: string;
    owner?: { firstName: string; lastName: string };
  } | null;
};

type TrustEntry = {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  role: string;
  score: number;
  badge: string;
  badgeColor: string;
};

type Visit = {
  id: string;
  page: string;
  ip?: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
  } | null;
};

type TabKey =
  | "users"
  | "documents"
  | "nominations"
  | "applications"
  | "leads"
  | "stock"
  | "trust"
  | "visits";

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
  DENETCI_ADMIN: "Denetçi Admin",
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  INVITED: "Davet Gönderildi",
  REGISTERED: "Kayıt Oldu",
  GORUSME_PLANLANDI: "Görüşme Planlandı",
  EVRAK_BEKLENIYOR: "Evrak Bekleniyor",
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

function roleLabel(role?: string) {
  return ROLE_LABELS[role || ""] || role || "EPH Üyesi";
}

function statusLabel(status?: string) {
  return STATUS_LABELS[status || ""] || status || "Bekliyor";
}

function statusClass(status?: string) {
  if (status === "APPROVED" || status === "REGISTERED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "INVITED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "GORUSME_PLANLANDI" || status === "EVRAK_BEKLENIYOR") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value?: number | null) {
  if (!value) return "—";
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim()?.[0] || "E";
  const last = lastName?.trim()?.[0] || "P";
  return `${first}${last}`.toUpperCase();
}

function Avatar({
  firstName,
  lastName,
  imageUrl,
  tone = "navy",
}: {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  tone?: "navy" | "warm" | "rose";
}) {
  const bg =
    tone === "rose"
      ? "from-[#3D1A1A] to-[#7F1D1D] text-rose-100"
      : tone === "warm"
        ? "from-[#F8FAFC] to-[#EEF2FF] text-[#0B1F44]"
        : "from-[#0B1F44] to-[#1D4ED8] text-white";

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#C9A84C]/25 bg-gradient-to-br ${bg} text-[16px] font-black shadow-lg shadow-slate-900/10`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${firstName || "EPH"} ${lastName || "Üyesi"}`}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(firstName, lastName)
      )}
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  danger,
  ghost,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  ghost?: boolean;
}) {
  const cls = danger
    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
    : ghost
      ? "border-slate-200 bg-white text-slate-600 hover:border-[#0B1F44] hover:text-[#0B1F44]"
      : "border-[#0B1F44] bg-[#0B1F44] text-white hover:bg-[#123B7A]";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
          EPH Yönetim Merkezi
        </p>
        <h2 className="mt-2 text-[28px] font-black tracking-tight text-[#0B1F44]">
          {title}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUnits, setAllUnits] = useState<StokUnit[]>([]);
  const [trustList, setTrustList] = useState<TrustEntry[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [userFilter, setUserFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [nomFilter, setNomFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null);

  const [noteModal, setNoteModal] = useState<{
    type: "nomination" | "application";
    id: string;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const [roleModal, setRoleModal] = useState<{
    id: string;
    currentRole: string;
  } | null>(null);
  const [newRole, setNewRole] = useState("");

  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");
  const [createUserForm, setCreateUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "EMLAKCI",
  });

  const tabs = useMemo(
    () => [
      { key: "users" as const, label: "Kullanıcılar", badge: null },
      { key: "documents" as const, label: "Belgeler", badge: stats?.pendingDocuments },
      { key: "nominations" as const, label: "Tavsiyeler", badge: stats?.pendingNominations },
      { key: "applications" as const, label: "Başvurular", badge: stats?.pendingApplications },
      { key: "leads" as const, label: "Lina Leads", badge: leads.length },
      { key: "stock" as const, label: "Stok Doğrulama", badge: null },
      { key: "trust" as const, label: "Güven Skorları", badge: null },
      { key: "visits" as const, label: "Ziyaretler", badge: null },
    ],
    [stats, leads.length],
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

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
    if (hydrated && user) fetchUsers(userFilter);
  }, [userFilter]);

  useEffect(() => {
    if (hydrated && user) fetchDocuments(docFilter);
  }, [docFilter]);

  useEffect(() => {
    if (hydrated && user) fetchNominations(nomFilter);
  }, [nomFilter]);

  useEffect(() => {
    if (hydrated && user) fetchApplications(appFilter);
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
      setUsers(Array.isArray(u.data) ? u.data : []);
      setDocuments(Array.isArray(d.data) ? d.data : []);
      setNominations(Array.isArray(n.data) ? n.data : []);
      setApplications(Array.isArray(a.data) ? a.data : []);
      setLeads(Array.isArray(l.data) ? l.data : []);
      setAllUnits(Array.isArray(st.data) ? st.data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const res = await api.get("/admin/stats");
    setStats(res.data);
  };

  const fetchUsers = async (filter = "all") => {
    const res = await api.get(`/admin/users?filter=${filter}`);
    setUsers(Array.isArray(res.data) ? res.data : []);
  };

  const fetchDocuments = async (filter = "all") => {
    const res = await api.get(`/admin/documents?filter=${filter}`);
    setDocuments(Array.isArray(res.data) ? res.data : []);
  };

  const fetchNominations = async (filter = "all") => {
    const res = await api.get(`/admin/nominations?status=${filter}`);
    setNominations(Array.isArray(res.data) ? res.data : []);
  };

  const fetchApplications = async (filter = "all") => {
    const res = await api.get(`/admin/applications?status=${filter}`);
    setApplications(Array.isArray(res.data) ? res.data : []);
  };

  const fetchLeads = async () => {
    const res = await api.get("/leads");
    setLeads(Array.isArray(res.data) ? res.data : []);
  };

  const fetchUnits = async () => {
    const res = await api.get("/units");
    setAllUnits(Array.isArray(res.data) ? res.data : []);
  };

  const fetchTrust = async () => {
    const res = await api.get("/trust/leaderboard");
    setTrustList(Array.isArray(res.data) ? res.data : []);
  };

  const fetchVisits = async () => {
    const res = await api.get("/visits");
    setVisits(Array.isArray(res.data) ? res.data : []);
  };

  const act = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);

    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  const handleTab = (key: TabKey) => {
    setActiveTab(key);
    if (key === "leads") fetchLeads();
    if (key === "stock") fetchUnits();
    if (key === "trust") fetchTrust();
    if (key === "visits") fetchVisits();
  };

  const handleVerify = async (id: string, field: string, current: boolean) => {
    const unit = allUnits.find((item) => item.id === id);
    if (!unit) return;

    setVerifyLoading(`${id}-${field}`);

    try {
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

  const saveNote = async () => {
    if (!noteModal) return;

    await act(noteModal.id, async () => {
      if (noteModal.type === "nomination") {
        const current = nominations.find((item) => item.id === noteModal.id);
        await api.patch(`/admin/nominations/${noteModal.id}/status`, {
          status: current?.status,
          adminNote: noteText,
        });
        await fetchNominations(nomFilter);
      } else {
        const current = applications.find((item) => item.id === noteModal.id);
        await api.patch(`/admin/applications/${noteModal.id}/status`, {
          status: current?.status,
          adminNote: noteText,
        });
        await fetchApplications(appFilter);
      }

      setNoteModal(null);
      setNoteText("");
    });
  };

  const createUser = async () => {
    if (
      !createUserForm.firstName ||
      !createUserForm.lastName ||
      !createUserForm.email ||
      !createUserForm.phone ||
      !createUserForm.password
    ) {
      setCreateUserError("Tüm alanlar zorunludur.");
      return;
    }

    setCreateUserLoading(true);
    setCreateUserError("");

    try {
      await api.post("/admin/users", createUserForm);
      setCreateUserModal(false);
      setCreateUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        role: "EMLAKCI",
      });
      await Promise.all([fetchUsers(userFilter), fetchStats()]);
    } catch (error: any) {
      setCreateUserError(error?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4 text-[#0B1F44]">
          <Loader2 className="animate-spin" size={34} />
          <p className="text-sm font-black">Admin paneli yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[#111827]">
      {noteModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1F44]/70 p-5 backdrop-blur"
          onClick={() => {
            setNoteModal(null);
            setNoteText("");
          }}
        >
          <div
            className="w-full max-w-lg rounded-[32px] bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] font-black text-[#0B1F44]">Admin Notu</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Bu not sadece admin panelinde görünür.
            </p>

            <textarea
              className="mt-5 min-h-32 w-full rounded-[22px] border border-slate-200 bg-[#F8FAFC] p-4 text-sm font-semibold outline-none focus:border-[#0B1F44]"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Notunuzu yazın..."
            />

            <div className="mt-5 flex gap-3">
              <PrimaryButton onClick={saveNote} disabled={actionLoading === noteModal.id}>
                {actionLoading === noteModal.id ? "Kaydediliyor..." : "Kaydet"}
              </PrimaryButton>
              <PrimaryButton
                ghost
                onClick={() => {
                  setNoteModal(null);
                  setNoteText("");
                }}
              >
                İptal
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {roleModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1F44]/70 p-5 backdrop-blur"
          onClick={() => {
            setRoleModal(null);
            setNewRole("");
          }}
        >
          <div
            className="w-full max-w-lg rounded-[32px] bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] font-black text-[#0B1F44]">Rol Değiştir</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Üyenin platformdaki rolünü güncelle.
            </p>

            <select
              className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-black outline-none"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="EMLAKCI">Emlakçı</option>
              <option value="MUTEAHHIT">Müteahhit</option>
              <option value="INSAAT_FIRMASI">İnşaat Firması</option>
              <option value="DENETCI_ADMIN">Denetçi Admin</option>
            </select>

            <div className="mt-5 flex gap-3">
              <PrimaryButton
                disabled={!newRole || actionLoading === roleModal.id}
                onClick={() =>
                  act(roleModal.id, async () => {
                    await api.patch(`/admin/users/${roleModal.id}/role`, { role: newRole });
                    await fetchUsers(userFilter);
                    setRoleModal(null);
                    setNewRole("");
                  })
                }
              >
                {actionLoading === roleModal.id ? "Değiştiriliyor..." : "Değiştir"}
              </PrimaryButton>
              <PrimaryButton
                ghost
                onClick={() => {
                  setRoleModal(null);
                  setNewRole("");
                }}
              >
                İptal
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {createUserModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1F44]/70 p-5 backdrop-blur"
          onClick={() => {
            setCreateUserModal(false);
            setCreateUserError("");
          }}
        >
          <div
            className="w-full max-w-xl rounded-[32px] bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] font-black text-[#0B1F44]">Yeni Üye</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Manuel olarak platforma üye ekle.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="premium-admin-input"
                placeholder="Ad"
                value={createUserForm.firstName}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, firstName: event.target.value }))
                }
              />
              <input
                className="premium-admin-input"
                placeholder="Soyad"
                value={createUserForm.lastName}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, lastName: event.target.value }))
                }
              />
              <input
                className="premium-admin-input"
                placeholder="E-posta"
                type="email"
                value={createUserForm.email}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, email: event.target.value }))
                }
              />
              <input
                className="premium-admin-input"
                placeholder="Telefon"
                value={createUserForm.phone}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, phone: event.target.value }))
                }
              />
              <input
                className="premium-admin-input"
                placeholder="Şifre"
                type="password"
                value={createUserForm.password}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, password: event.target.value }))
                }
              />
              <select
                className="premium-admin-input"
                value={createUserForm.role}
                onChange={(event) =>
                  setCreateUserForm((form) => ({ ...form, role: event.target.value }))
                }
              >
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                <option value="ADMIN">Admin</option>
                <option value="DENETCI_ADMIN">Denetçi Admin</option>
              </select>
            </div>

            {createUserError && (
              <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-black text-red-600">
                {createUserError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <PrimaryButton onClick={createUser} disabled={createUserLoading}>
                {createUserLoading ? "Ekleniyor..." : "Üye Ekle"}
              </PrimaryButton>
              <PrimaryButton ghost onClick={() => setCreateUserModal(false)}>
                İptal
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 no-underline">
            <img src="/LOGO_EPH.png" alt="EPH" className="h-10 w-10 rounded-2xl object-contain" />
            <div>
              <p className="text-lg font-black text-[#0B1F44]">EPH Platform</p>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
                Admin Merkezi
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {[
              ["/dashboard", "Ana Sayfa"],
              ["/profil", "Profilim"],
              ["/stok", "Stok"],
              ["/crm", "CRM"],
              ["/market", "Piyasa"],
              ["/admin", "Admin"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] no-underline transition ${
                  href === "/admin"
                    ? "bg-[#0B1F44] text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-[#0B1F44]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-600"
          >
            <LogOut size={15} />
            Çıkış
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <header className="mb-8 overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0B1F44] via-[#123B7A] to-[#1D4ED8] p-8 text-white shadow-2xl shadow-[#1D4ED8]/20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                <Crown size={16} />
                Yönetim Paneli
              </div>
              <h1 className="mt-5 text-[42px] font-black leading-tight tracking-tight md:text-[56px]">
                EPH Operasyon
                <span className="block text-[#C9A84C]">Merkezi</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/70">
                Üye, belge, başvuru, stok, ziyaret ve güven skoru yönetimini tek merkezden takip et.
              </p>
            </div>

            <button
              onClick={() => setCreateUserModal(true)}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#0B1F44] shadow-xl transition hover:scale-[1.02]"
            >
              <UserPlus size={18} />
              Yeni Üye Ekle
            </button>
          </div>
        </header>

        {stats && (
          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard title="Toplam Üye" value={stats.totalUsers} icon={<UsersRound size={20} />} />
            <StatCard title="Onay Bekleyen" value={stats.pendingUsers} icon={<ClipboardCheck size={20} />} warning />
            <StatCard title="Onaylanan" value={stats.approvedUsers} icon={<BadgeCheck size={20} />} success />
            <StatCard title="Davet Kodu" value={stats.totalInvitations} icon={<Sparkles size={20} />} gold />
            <StatCard title="Bekleyen Belge" value={stats.pendingDocuments} icon={<FileText size={20} />} warning />
            <StatCard title="Bekleyen Tavsiye" value={stats.pendingNominations} icon={<Star size={20} />} warning />
            <StatCard title="Bekleyen Başvuru" value={stats.pendingApplications} icon={<MessageCircle size={20} />} warning />
          </section>
        )}

        {stats && stats.byRole.length > 0 && (
          <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Rol Dağılımı
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.byRole.map((item) => (
                <Badge key={item.role} className="border-slate-200 bg-[#F8FAFC] text-[#0B1F44]">
                  {roleLabel(item.role)}: {item.count}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section className="mb-7 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTab(tab.key)}
                className={`relative rounded-t-2xl px-5 py-4 text-xs font-black uppercase tracking-[0.18em] transition ${
                  activeTab === tab.key
                    ? "bg-white text-[#0B1F44] shadow-sm"
                    : "text-slate-500 hover:bg-white/70 hover:text-[#0B1F44]"
                }`}
              >
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="ml-2 rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] text-[#0B1F44]">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "users" && (
          <UsersTab
            users={users}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            actionLoading={actionLoading}
            act={act}
            fetchUsers={() => fetchUsers(userFilter)}
            fetchStats={fetchStats}
            setRoleModal={setRoleModal}
            setNewRole={setNewRole}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            documents={documents}
            docFilter={docFilter}
            setDocFilter={setDocFilter}
            actionLoading={actionLoading}
            act={act}
            fetchDocuments={() => fetchDocuments(docFilter)}
            fetchStats={fetchStats}
          />
        )}

        {activeTab === "nominations" && (
          <NominationsTab
            nominations={nominations}
            nomFilter={nomFilter}
            setNomFilter={setNomFilter}
            actionLoading={actionLoading}
            act={act}
            fetchNominations={() => fetchNominations(nomFilter)}
            fetchStats={fetchStats}
            setNoteModal={setNoteModal}
            setNoteText={setNoteText}
          />
        )}

        {activeTab === "applications" && (
          <ApplicationsTab
            applications={applications}
            appFilter={appFilter}
            setAppFilter={setAppFilter}
            actionLoading={actionLoading}
            act={act}
            fetchApplications={() => fetchApplications(appFilter)}
            fetchStats={fetchStats}
            setNoteModal={setNoteModal}
            setNoteText={setNoteText}
          />
        )}

        {activeTab === "leads" && (
          <LeadsTab
            leads={leads}
            fetchLeads={fetchLeads}
            expandedLead={expandedLead}
            setExpandedLead={setExpandedLead}
          />
        )}

        {activeTab === "stock" && (
          <StockTab
            units={allUnits}
            fetchUnits={fetchUnits}
            verifyLoading={verifyLoading}
            handleVerify={handleVerify}
          />
        )}

        {activeTab === "trust" && <TrustTab trustList={trustList} fetchTrust={fetchTrust} />}

        {activeTab === "visits" && <VisitsTab visits={visits} fetchVisits={fetchVisits} />}
      </section>

      <style jsx global>{`
        .premium-admin-input {
          width: 100%;
          height: 48px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 700;
          color: #0b1f44;
          outline: none;
        }

        .premium-admin-input:focus {
          border-color: #1d4ed8;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.08);
        }
      `}</style>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  warning,
  success,
  gold,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  warning?: boolean;
  success?: boolean;
  gold?: boolean;
}) {
  const color = warning
    ? "text-amber-600 bg-amber-50"
    : success
      ? "text-emerald-600 bg-emerald-50"
      : gold
        ? "text-[#C9A84C] bg-[#FFF8E1]"
        : "text-[#1D4ED8] bg-[#EEF4FF]";

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-[32px] font-black leading-none text-[#0B1F44]">{value}</p>
    </div>
  );
}

function FilterBar({
  items,
  value,
  onChange,
}: {
  items: [string, string][];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {items.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
            value === key
              ? "border-[#0B1F44] bg-[#0B1F44] text-white"
              : "border-slate-200 bg-white text-slate-500 hover:border-[#0B1F44] hover:text-[#0B1F44]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/70 p-12 text-center">
      <p className="text-lg font-black text-slate-500">{text}</p>
    </div>
  );
}

function UsersTab({
  users,
  userFilter,
  setUserFilter,
  actionLoading,
  act,
  fetchUsers,
  fetchStats,
  setRoleModal,
  setNewRole,
}: {
  users: AdminUser[];
  userFilter: string;
  setUserFilter: (value: string) => void;
  actionLoading: string | null;
  act: (id: string, fn: () => Promise<void>) => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setRoleModal: (value: { id: string; currentRole: string } | null) => void;
  setNewRole: (value: string) => void;
}) {
  return (
    <section>
      <SectionHeader
        title="Kullanıcılar"
        subtitle="Platform üyelerini, onay durumlarını ve rollerini yönet."
      />
      <FilterBar
        value={userFilter}
        onChange={setUserFilter}
        items={[
          ["all", "Tümü"],
          ["pending", "Bekleyen"],
          ["approved", "Onaylanan"],
        ]}
      />

      {users.length === 0 ? (
        <EmptyState text="Kullanıcı bulunamadı." />
      ) : (
        <div className="space-y-3">
          {users.map((item) => (
            <article
              key={item.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    firstName={item.firstName}
                    lastName={item.lastName}
                    imageUrl={item.profileImageUrl}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#0B1F44]">
                      {item.firstName} {item.lastName}
                    </h3>
                    <p className="truncate text-sm font-semibold text-slate-500">{item.email}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{item.phone}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-slate-200 bg-[#F8FAFC] text-[#0B1F44]">
                    {roleLabel(item.role)}
                  </Badge>
                  {item.documents?.length > 0 && (
                    <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                      {item.documents.length} Belge
                    </Badge>
                  )}
                  <Badge
                    className={
                      item.isApproved
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {item.isApproved ? "Onaylı" : "Bekliyor"}
                  </Badge>

                  {!item.isApproved ? (
                    <PrimaryButton
                      disabled={actionLoading === item.id}
                      onClick={() =>
                        act(item.id, async () => {
                          await api.patch(`/admin/users/${item.id}/approve`);
                          await Promise.all([fetchUsers(), fetchStats()]);
                        })
                      }
                    >
                      {actionLoading === item.id ? "..." : "Onayla"}
                    </PrimaryButton>
                  ) : (
                    item.role !== "ADMIN" && (
                      <PrimaryButton
                        ghost
                        disabled={actionLoading === item.id}
                        onClick={() => {
                          if (!confirm("Kullanıcı askıya alınacak. Emin misiniz?")) return;
                          act(item.id, async () => {
                            await api.patch(`/admin/users/${item.id}/suspend`);
                            await Promise.all([fetchUsers(), fetchStats()]);
                          });
                        }}
                      >
                        Askıya Al
                      </PrimaryButton>
                    )
                  )}

                  {item.role !== "ADMIN" && (
                    <PrimaryButton
                      ghost
                      onClick={() => {
                        setRoleModal({ id: item.id, currentRole: item.role });
                        setNewRole(item.role);
                      }}
                    >
                      Rol Değiştir
                    </PrimaryButton>
                  )}

                  {item.role !== "ADMIN" && (
                    <PrimaryButton
                      danger
                      disabled={actionLoading === item.id}
                      onClick={() => {
                        if (!confirm("Kullanıcı silinecek. Emin misiniz?")) return;
                        act(item.id, async () => {
                          await api.delete(`/admin/users/${item.id}/reject`);
                          await Promise.all([fetchUsers(), fetchStats()]);
                        });
                      }}
                    >
                      Sil
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentsTab({
  documents,
  docFilter,
  setDocFilter,
  actionLoading,
  act,
  fetchDocuments,
  fetchStats,
}: {
  documents: DocumentItem[];
  docFilter: string;
  setDocFilter: (value: string) => void;
  actionLoading: string | null;
  act: (id: string, fn: () => Promise<void>) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchStats: () => Promise<void>;
}) {
  return (
    <section>
      <SectionHeader title="Belgeler" subtitle="Mesleki belgeleri incele, onayla veya reddet." />
      <FilterBar
        value={docFilter}
        onChange={setDocFilter}
        items={[
          ["all", "Tümü"],
          ["pending", "Bekleyen"],
          ["approved", "Onaylanan"],
          ["rejected", "Reddedilen"],
        ]}
      />

      {documents.length === 0 ? (
        <EmptyState text="Belge bulunamadı." />
      ) : (
        <div className="space-y-3">
          {documents.map((item) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  {item.user ? (
                    <Avatar
                      firstName={item.user.firstName}
                      lastName={item.user.lastName}
                      imageUrl={item.user.profileImageUrl}
                      tone="warm"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EEF4FF] text-[#1D4ED8]">
                      <FileText size={22} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#0B1F44]">
                      {DOC_LABELS[item.type] || item.type}
                    </h3>
                    <p className="truncate text-sm font-semibold text-slate-500">{item.fileName}</p>
                    {item.user && (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {item.user.firstName} {item.user.lastName} · {roleLabel(item.user.role)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusClass(item.status)}>{statusLabel(item.status)}</Badge>
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 no-underline transition hover:border-[#0B1F44] hover:text-[#0B1F44]"
                  >
                    Görüntüle
                  </a>
                  {item.status === "PENDING" && (
                    <>
                      <PrimaryButton
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/documents/${item.id}/approve`);
                            await Promise.all([fetchDocuments(), fetchStats()]);
                          })
                        }
                      >
                        Onayla
                      </PrimaryButton>
                      <PrimaryButton
                        danger
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/documents/${item.id}/reject`);
                            await Promise.all([fetchDocuments(), fetchStats()]);
                          })
                        }
                      >
                        Reddet
                      </PrimaryButton>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NominationsTab({
  nominations,
  nomFilter,
  setNomFilter,
  actionLoading,
  act,
  fetchNominations,
  fetchStats,
  setNoteModal,
  setNoteText,
}: {
  nominations: Nomination[];
  nomFilter: string;
  setNomFilter: (value: string) => void;
  actionLoading: string | null;
  act: (id: string, fn: () => Promise<void>) => Promise<void>;
  fetchNominations: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setNoteModal: (value: { type: "nomination" | "application"; id: string } | null) => void;
  setNoteText: (value: string) => void;
}) {
  return (
    <section>
      <SectionHeader title="Tavsiyeler" subtitle="Üye tavsiyelerini değerlendir ve süreci yönet." />
      <FilterBar
        value={nomFilter}
        onChange={setNomFilter}
        items={[
          ["all", "Tümü"],
          ["PENDING", "Bekliyor"],
          ["APPROVED", "Onaylandı"],
          ["REJECTED", "Reddedildi"],
          ["INVITED", "Davet Gönderildi"],
          ["REGISTERED", "Kayıt Oldu"],
        ]}
      />

      {nominations.length === 0 ? (
        <EmptyState text="Tavsiye bulunamadı." />
      ) : (
        <div className="space-y-3">
          {nominations.map((item) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar
                    firstName={item.nominator?.firstName || item.candidateName}
                    lastName={item.nominator?.lastName || ""}
                    imageUrl={item.nominator?.profileImageUrl}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#0B1F44]">{item.candidateName}</h3>
                    <p className="truncate text-sm font-semibold text-slate-500">
                      {item.candidateEmail} · {item.candidatePhone}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-slate-200 bg-[#F8FAFC] text-[#0B1F44]">
                        {roleLabel(item.candidateRole)}
                      </Badge>
                      <Badge className={statusClass(item.status)}>{statusLabel(item.status)}</Badge>
                    </div>
                    {item.note && (
                      <p className="mt-3 rounded-2xl bg-[#F8FAFC] p-3 text-sm font-semibold italic text-slate-500">
                        “{item.note}”
                      </p>
                    )}
                    {item.adminNote && (
                      <p className="mt-2 text-sm font-black text-[#B8860B]">📝 {item.adminNote}</p>
                    )}
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      Öneren: {item.nominator.firstName} {item.nominator.lastName} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    ghost
                    onClick={() => {
                      setNoteModal({ type: "nomination", id: item.id });
                      setNoteText(item.adminNote || "");
                    }}
                  >
                    Not
                  </PrimaryButton>
                  {item.status === "PENDING" && (
                    <>
                      <PrimaryButton
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/nominations/${item.id}/status`, { status: "APPROVED" });
                            await Promise.all([fetchNominations(), fetchStats()]);
                          })
                        }
                      >
                        Onayla
                      </PrimaryButton>
                      <PrimaryButton
                        danger
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/nominations/${item.id}/status`, { status: "REJECTED" });
                            await Promise.all([fetchNominations(), fetchStats()]);
                          })
                        }
                      >
                        Reddet
                      </PrimaryButton>
                    </>
                  )}
                  {item.status === "APPROVED" && (
                    <PrimaryButton
                      disabled={actionLoading === item.id}
                      onClick={() =>
                        act(item.id, async () => {
                          await api.patch(`/admin/nominations/${item.id}/status`, { status: "INVITED" });
                          await Promise.all([fetchNominations(), fetchStats()]);
                        })
                      }
                    >
                      Davet Gönderildi
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ApplicationsTab({
  applications,
  appFilter,
  setAppFilter,
  actionLoading,
  act,
  fetchApplications,
  fetchStats,
  setNoteModal,
  setNoteText,
}: {
  applications: Application[];
  appFilter: string;
  setAppFilter: (value: string) => void;
  actionLoading: string | null;
  act: (id: string, fn: () => Promise<void>) => Promise<void>;
  fetchApplications: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setNoteModal: (value: { type: "nomination" | "application"; id: string } | null) => void;
  setNoteText: (value: string) => void;
}) {
  return (
    <section>
      <SectionHeader title="Başvurular" subtitle="Yeni üyelik başvurularını değerlendir ve davet sürecini yönet." />
      <FilterBar
        value={appFilter}
        onChange={setAppFilter}
        items={[
          ["all", "Tümü"],
          ["PENDING", "Bekliyor"],
          ["APPROVED", "Onaylandı"],
          ["REJECTED", "Reddedildi"],
          ["INVITED", "Davet Gönderildi"],
          ["REGISTERED", "Kayıt Oldu"],
          ["GORUSME_PLANLANDI", "Görüşme Planlandı"],
          ["EVRAK_BEKLENIYOR", "Evrak Bekleniyor"],
        ]}
      />

      {applications.length === 0 ? (
        <EmptyState text="Başvuru bulunamadı." />
      ) : (
        <div className="space-y-3">
          {applications.map((item) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar firstName={item.applicantName} lastName="" tone="rose" />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#0B1F44]">{item.applicantName}</h3>
                    <p className="truncate text-sm font-semibold text-slate-500">
                      {item.applicantEmail} · {item.applicantPhone}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-slate-200 bg-[#F8FAFC] text-[#0B1F44]">
                        {roleLabel(item.requestedRole)}
                      </Badge>
                      <Badge className={statusClass(item.status)}>{statusLabel(item.status)}</Badge>
                      {item.referrer && (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          Referanslı
                        </Badge>
                      )}
                    </div>
                    {item.message && (
                      <p className="mt-3 rounded-2xl bg-[#F8FAFC] p-3 text-sm font-semibold italic text-slate-500">
                        “{item.message}”
                      </p>
                    )}
                    {item.adminNote && (
                      <p className="mt-2 text-sm font-black text-[#B8860B]">📝 {item.adminNote}</p>
                    )}
                    {item.referrer && (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 p-2">
                        <Avatar
                          firstName={item.referrer.firstName}
                          lastName={item.referrer.lastName}
                          imageUrl={item.referrer.profileImageUrl}
                        />
                        <p className="text-xs font-black text-emerald-700">
                          Referans: {item.referrer.firstName} {item.referrer.lastName}
                        </p>
                      </div>
                    )}
                    <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    ghost
                    onClick={() => {
                      setNoteModal({ type: "application", id: item.id });
                      setNoteText(item.adminNote || "");
                    }}
                  >
                    Not
                  </PrimaryButton>
                  {item.status === "PENDING" && (
                    <>
                      <PrimaryButton
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/applications/${item.id}/status`, { status: "APPROVED" });
                            await Promise.all([fetchApplications(), fetchStats()]);
                          })
                        }
                      >
                        Onayla
                      </PrimaryButton>
                      <PrimaryButton
                        danger
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/applications/${item.id}/status`, { status: "REJECTED" });
                            await Promise.all([fetchApplications(), fetchStats()]);
                          })
                        }
                      >
                        Reddet
                      </PrimaryButton>
                      <PrimaryButton
                        ghost
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/applications/${item.id}/status`, { status: "GORUSME_PLANLANDI" });
                            await Promise.all([fetchApplications(), fetchStats()]);
                          })
                        }
                      >
                        Görüşme
                      </PrimaryButton>
                      <PrimaryButton
                        ghost
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          act(item.id, async () => {
                            await api.patch(`/admin/applications/${item.id}/status`, { status: "EVRAK_BEKLENIYOR" });
                            await Promise.all([fetchApplications(), fetchStats()]);
                          })
                        }
                      >
                        Evrak
                      </PrimaryButton>
                    </>
                  )}
                  {item.status === "APPROVED" && (
                    <PrimaryButton
                      disabled={actionLoading === item.id}
                      onClick={() =>
                        act(item.id, async () => {
                          await api.patch(`/admin/applications/${item.id}/status`, { status: "INVITED" });
                          await Promise.all([fetchApplications(), fetchStats()]);
                        })
                      }
                    >
                      Davet Gönderildi
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LeadsTab({
  leads,
  fetchLeads,
  expandedLead,
  setExpandedLead,
}: {
  leads: Lead[];
  fetchLeads: () => Promise<void>;
  expandedLead: string | null;
  setExpandedLead: (value: string | null) => void;
}) {
  return (
    <section>
      <SectionHeader
        title="Lina Leads"
        subtitle="Lina AI üzerinden gelen aday ve görüşmeleri takip et."
        action={
          <PrimaryButton ghost onClick={fetchLeads}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} /> Yenile
            </span>
          </PrimaryButton>
        }
      />

      {leads.length === 0 ? (
        <EmptyState text="Henüz Lina'dan lead gelmedi." />
      ) : (
        <div className="space-y-3">
          {leads.map((item) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <Avatar firstName={item.fullName || "?"} lastName="" tone="rose" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#0B1F44]">{item.fullName || "İsimsiz"}</h3>
                    <Badge className="border-rose-200 bg-rose-50 text-rose-700">Lina</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-500 md:grid-cols-2">
                    {item.phone && <span>📞 {item.phone}</span>}
                    {item.email && <span>✉️ {item.email}</span>}
                    {item.profession && <span>💼 {item.profession}</span>}
                    {item.city && <span>📍 {item.city}</span>}
                    {item.interest && <span className="md:col-span-2">🎯 {item.interest}</span>}
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</p>

                  {item.conversation && (
                    <>
                      <button
                        onClick={() => setExpandedLead(expandedLead === item.id ? null : item.id)}
                        className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]"
                      >
                        {expandedLead === item.id ? "Konuşmayı Gizle" : "Konuşmayı Gör"}
                      </button>
                      {expandedLead === item.id && (
                        <div className="mt-3 max-h-80 overflow-y-auto rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4">
                          <LeadConversation conversation={item.conversation} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LeadConversation({ conversation }: { conversation: string }) {
  try {
    const messages = JSON.parse(conversation) as { role: string; content: string }[];

    return (
      <div className="space-y-2">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
                message.role === "user"
                  ? "bg-[#0B1F44] text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
    );
  } catch {
    return <p className="text-sm font-semibold text-slate-500">{conversation}</p>;
  }
}

function StockTab({
  units,
  fetchUnits,
  verifyLoading,
  handleVerify,
}: {
  units: StokUnit[];
  fetchUnits: () => Promise<void>;
  verifyLoading: string | null;
  handleVerify: (id: string, field: string, current: boolean) => Promise<void>;
}) {
  return (
    <section>
      <SectionHeader
        title="Stok Doğrulama"
        subtitle={`${units.length} birim · ${units.filter((item) => item.isVerified).length} doğrulanmış`}
        action={
          <PrimaryButton ghost onClick={fetchUnits}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} /> Yenile
            </span>
          </PrimaryButton>
        }
      />

      {units.length === 0 ? (
        <EmptyState text="Birim bulunamadı." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {units.map((item) => (
            <article key={item.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#0B1F44]">{item.project?.name || "Proje"}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {item.project?.city} / {item.project?.district} · {item.project?.owner?.firstName} {item.project?.owner?.lastName}
                  </p>
                </div>
                <Badge className={item.isOffMarket ? "border-blue-200 bg-blue-50 text-blue-700" : statusClass(item.status)}>
                  {item.isOffMarket ? "Off-Market" : UNIT_STATUS_LABELS[item.status] || item.status}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniCell label="Tip" value={TYPE_LABELS[item.type] || item.type} />
                <MiniCell label="No / Kat" value={`${item.number} / ${item.floor ?? "—"}`} />
                <MiniCell label="Alan" value={item.area ? `${item.area} m²` : "—"} />
                <MiniCell label="Fiyat" value={money(item.price)} />
              </div>

              <div className="mt-5 grid gap-2">
                {[
                  ["tapu", "Tapu Doğrulandı", item.tapuVerified],
                  ["photo", "Fotoğraf Doğrulandı", item.photoVerified],
                  ["yetki", "Yetki Belgesi Doğrulandı", item.yetkiVerified],
                  ["offmarket", item.isOffMarket ? "Off-Market Aktif" : "Off-Market Yap", item.isOffMarket],
                ].map(([key, label, value]) => (
                  <button
                    key={String(key)}
                    onClick={() => handleVerify(item.id, String(key), Boolean(value))}
                    disabled={!!verifyLoading}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black transition disabled:opacity-50 ${
                      value
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-[#F8FAFC] text-slate-600 hover:border-[#0B1F44]"
                    }`}
                  >
                    <span>{label}</span>
                    <span>{verifyLoading === `${item.id}-${key}` ? "..." : value ? "✓ Aktif" : "Kapalı"}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0B1F44]">{value}</p>
    </div>
  );
}

function TrustTab({ trustList, fetchTrust }: { trustList: TrustEntry[]; fetchTrust: () => Promise<void> }) {
  return (
    <section>
      <SectionHeader
        title="Güven Skorları"
        subtitle={`${trustList.length} üye sıralandı`}
        action={
          <PrimaryButton ghost onClick={fetchTrust}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} /> Yenile
            </span>
          </PrimaryButton>
        }
      />

      {trustList.length === 0 ? (
        <EmptyState text="Henüz güven skoru verisi yok." />
      ) : (
        <div className="space-y-3">
          {trustList.map((item, index) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 text-center text-[24px] font-black text-[#C9A84C]">#{index + 1}</div>
                <Avatar firstName={item.firstName} lastName={item.lastName} imageUrl={item.profileImageUrl} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-[#0B1F44]">
                    {item.firstName} {item.lastName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className="border-slate-200 bg-[#F8FAFC] text-[#0B1F44]">
                      {roleLabel(item.role)}
                    </Badge>
                    <Badge className="border-blue-200 bg-blue-50 text-blue-700">{item.badge}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.score}%`, background: item.badgeColor || "#1D4ED8" }}
                    />
                  </div>
                </div>
                <div className="text-[30px] font-black text-[#0B1F44]">{item.score}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function VisitsTab({ visits, fetchVisits }: { visits: Visit[]; fetchVisits: () => Promise<void> }) {
  return (
    <section>
      <SectionHeader
        title="Ziyaretler"
        subtitle="Kim, ne zaman, hangi sayfayı ziyaret etti?"
        action={
          <PrimaryButton ghost onClick={fetchVisits}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} /> Yenile
            </span>
          </PrimaryButton>
        }
      />

      {visits.length === 0 ? (
        <EmptyState text="Henüz ziyaret yok." />
      ) : (
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          {visits.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  firstName={item.user?.firstName || "Misafir"}
                  lastName={item.user?.lastName || ""}
                  imageUrl={item.user?.profileImageUrl}
                  tone="warm"
                />
                <div>
                  <p className="text-sm font-black text-[#0B1F44]">
                    {item.user ? `${item.user.firstName} ${item.user.lastName}` : "Misafir"}
                  </p>
                  <p className="text-xs font-bold text-slate-400">{item.user?.email || "Oturumsuz ziyaret"}</p>
                </div>
              </div>
              <div className="grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3 md:text-right">
                <span className="font-mono">{item.page}</span>
                <span>{item.ip || "IP yok"}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
