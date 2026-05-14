"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Stats {
  totalUsers: number; pendingUsers: number; approvedUsers: number;
  totalInvitations: number; pendingDocuments: number;
  pendingNominations: number; pendingApplications: number;
  byRole: { role: string; count: number }[];
}

interface User {
  id: string; firstName: string; lastName: string; email: string;
  phone: string; role: string; isApproved: boolean;
  documents: { id: string; type: string; status: string; fileUrl: string; fileName: string }[];
}

interface Document {
  id: string; type: string; status: string; fileUrl: string; fileName: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}

interface Nomination {
  id: string; candidateName: string; candidateEmail: string; candidatePhone: string;
  candidateRole: string; note?: string; status: string; adminNote?: string;
  createdAt: string; nominator: { firstName: string; lastName: string; email: string; role: string };
}

interface Application {
  id: string; applicantName: string; applicantEmail: string; applicantPhone: string;
  requestedRole: string; message?: string; referralCode?: string; status: string;
  adminNote?: string; createdAt: string;
  referrer?: { firstName: string; lastName: string; email: string; role: string };
}

interface Lead {
  id: string; fullName?: string; phone?: string; email?: string;
  profession?: string; city?: string; interest?: string;
  conversation?: string; source: string; createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit", INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin"
};

const ROLE_COLORS: Record<string, string> = {
  EMLAKCI: "bg-blue-950 text-blue-300 border-blue-800",
  MUTEAHHIT: "bg-green-950 text-green-300 border-green-800",
  INSAAT_FIRMASI: "bg-orange-950 text-orange-300 border-orange-800",
  ADMIN: "bg-purple-950 text-purple-300 border-purple-800",
};

const DOC_LABELS: Record<string, string> = {
  VERGI_LEVHASI: "Vergi Levhası", YETKI_BELGESI: "Yetki Belgesi",
  TICARET_SICIL: "Ticaret Sicil", KIMLIK: "Kimlik", DIGER: "Diğer"
};

const DOC_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-950 text-yellow-300 border-yellow-800",
  APPROVED: "bg-green-950 text-green-300 border-green-800",
  REJECTED: "bg-red-950 text-red-300 border-red-800",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi"
};

const NOM_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-950 text-yellow-300 border-yellow-800",
  APPROVED: "bg-green-950 text-green-300 border-green-800",
  REJECTED: "bg-red-950 text-red-300 border-red-800",
  INVITED: "bg-blue-950 text-blue-300 border-blue-800",
  REGISTERED: "bg-purple-950 text-purple-300 border-purple-800",
};

const NOM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi",
  INVITED: "Davet Gönderildi", REGISTERED: "Kayıt Oldu"
};

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "documents" | "nominations" | "applications" | "leads">("users");
  const [userFilter, setUserFilter] = useState<"all" | "pending" | "approved">("all");
  const [docFilter, setDocFilter] = useState<"pending" | "approved" | "rejected" | "all">("all");
  const [nomFilter, setNomFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED" | "INVITED" | "REGISTERED">("all");
  const [appFilter, setAppFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED" | "INVITED" | "REGISTERED">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [noteModal, setNoteModal] = useState<{ type: "nomination" | "application"; id: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{ id: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    if (user.role !== "ADMIN") { router.push("/dashboard"); return; }
    fetchAll();
  }, [hydrated, user]);

  useEffect(() => { if (hydrated && user) fetchUsers(); }, [userFilter]);
  useEffect(() => { if (hydrated && user) fetchDocuments(); }, [docFilter]);
  useEffect(() => { if (hydrated && user) fetchNominations(); }, [nomFilter]);
  useEffect(() => { if (hydrated && user) fetchApplications(); }, [appFilter]);

  const fetchAll = async () => {
    try {
      const [s, u, d, n, a, l] = await Promise.all([
        api.get("/admin/stats"),
        api.get(`/admin/users?filter=${userFilter}`),
        api.get(`/admin/documents?filter=${docFilter}`),
        api.get(`/admin/nominations?status=${nomFilter}`),
        api.get(`/admin/applications?status=${appFilter}`),
        api.get("/leads"),
      ]);
      setStats(s.data); setUsers(u.data); setDocuments(d.data);
      setNominations(n.data); setApplications(a.data); setLeads(l.data);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => { const r = await api.get("/admin/stats"); setStats(r.data); };
  const fetchUsers = async () => { const r = await api.get(`/admin/users?filter=${userFilter}`); setUsers(r.data); };
  const fetchDocuments = async () => { const r = await api.get(`/admin/documents?filter=${docFilter}`); setDocuments(r.data); };
  const fetchNominations = async () => { const r = await api.get(`/admin/nominations?status=${nomFilter}`); setNominations(r.data); };
  const fetchApplications = async () => { const r = await api.get(`/admin/applications?status=${appFilter}`); setApplications(r.data); };
  const fetchLeads = async () => { const r = await api.get("/leads"); setLeads(r.data); };

  const handleApproveUser = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/users/${id}/approve`); await Promise.all([fetchUsers(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleRejectUser = async (id: string) => { if (!confirm("Kullanıcı silinecek. Emin misiniz?")) return; setActionLoading(id); try { await api.delete(`/admin/users/${id}/reject`); await Promise.all([fetchUsers(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleSuspendUser = async (id: string) => { if (!confirm("Kullanıcı askıya alınacak. Emin misiniz?")) return; setActionLoading(id); try { await api.patch(`/admin/users/${id}/suspend`); await Promise.all([fetchUsers(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleApproveDoc = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/documents/${id}/approve`); await Promise.all([fetchDocuments(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleRejectDoc = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/documents/${id}/reject`); await Promise.all([fetchDocuments(), fetchStats()]); } finally { setActionLoading(null); } };

  const handleNominationStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try { await api.patch(`/admin/nominations/${id}/status`, { status }); await Promise.all([fetchNominations(), fetchStats()]); }
    finally { setActionLoading(null); }
  };

  const handleApplicationStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try { await api.patch(`/admin/applications/${id}/status`, { status }); await Promise.all([fetchApplications(), fetchStats()]); }
    finally { setActionLoading(null); }
  };

  const handleSaveNote = async () => {
    if (!noteModal) return;
    setActionLoading(noteModal.id);
    try {
      if (noteModal.type === "nomination") {
        await api.patch(`/admin/nominations/${noteModal.id}/status`, { status: nominations.find(n => n.id === noteModal.id)?.status, adminNote: noteText });
        await fetchNominations();
      } else {
        await api.patch(`/admin/applications/${noteModal.id}/status`, { status: applications.find(a => a.id === noteModal.id)?.status, adminNote: noteText });
        await fetchApplications();
      }
      setNoteModal(null); setNoteText("");
    } finally { setActionLoading(null); }
  };

  const handleChangeRole = async () => {
    if (!roleModal || !newRole) return;
    setActionLoading(roleModal.id);
    try { await api.patch(`/admin/users/${roleModal.id}/role`, { role: newRole }); await fetchUsers(); setRoleModal(null); setNewRole(""); }
    finally { setActionLoading(null); }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.phone || !createUserForm.password) {
      setCreateUserError("Tüm alanlar zorunludur."); return;
    }
    setCreateUserLoading(true); setCreateUserError("");
    try {
      await api.post("/admin/users", createUserForm);
      setCreateUserModal(false);
      setCreateUserForm({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "EMLAKCI" });
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (e: any) {
      setCreateUserError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally { setCreateUserLoading(false); }
  };

  if (!hydrated || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Not Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-medium mb-4">Admin Notu</h3>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Notunuzu yazın..." rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={handleSaveNote} disabled={actionLoading === noteModal.id}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium">
                {actionLoading === noteModal.id ? "..." : "Kaydet"}
              </button>
              <button onClick={() => { setNoteModal(null); setNoteText(""); }}
                className="text-gray-400 border border-gray-700 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rol Değiştir Modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-4">Rol Değiştir</h3>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 mb-4">
              <option value="">Rol Seçin</option>
              <option value="EMLAKCI">Emlakçı</option>
              <option value="MUTEAHHIT">Müteahhit</option>
              <option value="INSAAT_FIRMASI">İnşaat Firması</option>
            </select>
            <div className="flex gap-3">
              <button onClick={handleChangeRole} disabled={!newRole || actionLoading === roleModal.id}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium">
                {actionLoading === roleModal.id ? "..." : "Değiştir"}
              </button>
              <button onClick={() => { setRoleModal(null); setNewRole(""); }}
                className="text-gray-400 border border-gray-700 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Üye Ekle Modal */}
      {createUserModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-medium mb-4">Manuel Üye Ekle</h3>
            <div className="flex flex-col gap-3 mb-4">
              {[
                { ph: "Ad", key: "firstName" }, { ph: "Soyad", key: "lastName" },
                { ph: "Email", key: "email" }, { ph: "Telefon", key: "phone" },
                { ph: "Şifre", key: "password" },
              ].map(({ ph, key }) => (
                <input key={key} placeholder={ph} type={key === "password" ? "password" : "text"}
                  value={createUserForm[key as keyof typeof createUserForm]}
                  onChange={e => setCreateUserForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
              ))}
              <select value={createUserForm.role} onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="EMLAKCI">Emlakçı</option>
                <option value="MUTEAHHIT">Müteahhit</option>
                <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {createUserError && <p className="text-red-400 text-xs mb-3">{createUserError}</p>}
            <div className="flex gap-3">
              <button onClick={handleCreateUser} disabled={createUserLoading}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium">
                {createUserLoading ? "Ekleniyor..." : "Ekle"}
              </button>
              <button onClick={() => { setCreateUserModal(false); setCreateUserError(""); }}
                className="text-gray-400 border border-gray-700 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-semibold">EPH</span>
            <span className="text-gray-600 text-sm">/ Admin</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Ana Sayfa</Link>
            <Link href="/stok" className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Stok</Link>
            <Link href="/admin" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-800">Admin</Link>
          </nav>
          <button onClick={() => { logout(); router.push("/giris"); }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Çıkış
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Admin Paneli</h1>
            <p className="text-gray-500 text-sm">Üye ve belge yönetimi</p>
          </div>
          <button onClick={() => setCreateUserModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Manuel Üye Ekle
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-2">Toplam Üye</p>
              <p className="text-2xl font-semibold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-900 border border-yellow-900 rounded-xl p-4">
              <p className="text-yellow-500 text-xs mb-2">Onay Bekleyen</p>
              <p className="text-2xl font-semibold text-yellow-300">{stats.pendingUsers}</p>
            </div>
            <div className="bg-gray-900 border border-green-900 rounded-xl p-4">
              <p className="text-green-500 text-xs mb-2">Onaylanan</p>
              <p className="text-2xl font-semibold text-green-300">{stats.approvedUsers}</p>
            </div>
            <div className="bg-gray-900 border border-blue-900 rounded-xl p-4">
              <p className="text-blue-500 text-xs mb-2">Davet Kodu</p>
              <p className="text-2xl font-semibold text-blue-300">{stats.totalInvitations}</p>
            </div>
            <div className="bg-gray-900 border border-orange-900 rounded-xl p-4">
              <p className="text-orange-500 text-xs mb-2">Bekleyen Belge</p>
              <p className="text-2xl font-semibold text-orange-300">{stats.pendingDocuments}</p>
            </div>
            <div className="bg-gray-900 border border-purple-900 rounded-xl p-4">
              <p className="text-purple-500 text-xs mb-2">Bekleyen Tavsiye</p>
              <p className="text-2xl font-semibold text-purple-300">{stats.pendingNominations}</p>
            </div>
            <div className="bg-gray-900 border border-pink-900 rounded-xl p-4">
              <p className="text-pink-500 text-xs mb-2">Bekleyen Başvuru</p>
              <p className="text-2xl font-semibold text-pink-300">{stats.pendingApplications}</p>
            </div>
          </div>
        )}

        {/* Rol Dağılımı */}
        {stats && stats.byRole.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <p className="text-gray-500 text-xs mb-3">Rol Dağılımı</p>
            <div className="flex gap-3 flex-wrap">
              {stats.byRole.map((r) => (
                <div key={r.role} className={`border rounded-full px-4 py-1.5 text-xs font-medium ${ROLE_COLORS[r.role]}`}>
                  {ROLE_LABELS[r.role]}: {r.count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "users", label: "Kullanıcılar", badge: null },
            { key: "documents", label: "Belgeler", badge: stats?.pendingDocuments },
            { key: "nominations", label: "Tavsiyeler", badge: stats?.pendingNominations },
            { key: "applications", label: "Başvurular", badge: stats?.pendingApplications },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === t.key ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
              {t.label}
              {t.badge && t.badge > 0 && <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
          <button onClick={() => { setActiveTab("leads"); fetchLeads(); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "leads" ? "bg-rose-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
            🤖 Lina Leads
            {leads.length > 0 && <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5">{leads.length}</span>}
          </button>
        </div>

        {/* Kullanıcılar */}
        {activeTab === "users" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-medium text-white">Kullanıcılar</h2>
              <div className="flex gap-2">
                {(["all", "pending", "approved"] as const).map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${userFilter === f ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
                    {f === "pending" ? "Bekleyen" : f === "approved" ? "Onaylanan" : "Tümü"}
                  </button>
                ))}
              </div>
            </div>
            {users.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-600 text-sm">Kullanıcı bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {users.map((u) => (
                  <div key={u.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                          <p className="text-gray-600 text-xs">{u.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <span className={`border rounded-full px-3 py-1 text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                        {u.documents?.length > 0 && <span className="text-gray-600 text-xs">{u.documents.length} belge</span>}
                        <span className={`text-xs ${u.isApproved ? "text-green-400" : "text-yellow-400"}`}>
                          {u.isApproved ? "✓ Onaylı" : "⏳ Bekliyor"}
                        </span>

                        {/* Onay / Askıya Al */}
                        {!u.isApproved ? (
                          <button onClick={() => handleApproveUser(u.id)} disabled={actionLoading === u.id}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === u.id ? "..." : "Onayla"}
                          </button>
                        ) : (
                          u.role !== "ADMIN" && (
                            <button onClick={() => handleSuspendUser(u.id)} disabled={actionLoading === u.id}
                              className="bg-yellow-950 hover:bg-yellow-900 border border-yellow-800 text-yellow-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                              {actionLoading === u.id ? "..." : "Askıya Al"}
                            </button>
                          )
                        )}

                        {/* Rol Değiştir */}
                        {u.role !== "ADMIN" && (
                          <button onClick={() => { setRoleModal({ id: u.id, currentRole: u.role }); setNewRole(u.role); }}
                            className="bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                            Rol Değiştir
                          </button>
                        )}

                        {/* Sil */}
                        {u.role !== "ADMIN" && (
                          <button onClick={() => handleRejectUser(u.id)} disabled={actionLoading === u.id}
                            className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                            {actionLoading === u.id ? "..." : "Sil"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Belgeler */}
        {activeTab === "documents" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-medium text-white">Belgeler</h2>
              <div className="flex gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                  <button key={f} onClick={() => setDocFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${docFilter === f ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
                    {f === "pending" ? "Bekleyen" : f === "approved" ? "Onaylanan" : f === "rejected" ? "Reddedilen" : "Tümü"}
                  </button>
                ))}
              </div>
            </div>
            {documents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-600 text-sm">Belge bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {documents.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{DOC_LABELS[doc.type] ?? doc.type}</p>
                        <p className="text-gray-500 text-xs">{doc.fileName}</p>
                        {doc.user && <p className="text-gray-600 text-xs">{doc.user.firstName} {doc.user.lastName} · {ROLE_LABELS[doc.user.role]}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`border rounded-full px-3 py-1 text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>{DOC_STATUS_LABELS[doc.status]}</span>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs border border-blue-900 px-3 py-1.5 rounded-lg transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Görüntüle
                      </a>
                      {doc.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveDoc(doc.id)} disabled={actionLoading === doc.id}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === doc.id ? "..." : "Onayla"}
                          </button>
                          <button onClick={() => handleRejectDoc(doc.id)} disabled={actionLoading === doc.id}
                            className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === doc.id ? "..." : "Reddet"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tavsiyeler */}
        {activeTab === "nominations" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-medium text-white">Tavsiyeler</h2>
              <div className="flex gap-2 flex-wrap">
                {(["all", "PENDING", "APPROVED", "REJECTED", "INVITED", "REGISTERED"] as const).map((f) => (
                  <button key={f} onClick={() => setNomFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${nomFilter === f ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
                    {f === "all" ? "Tümü" : NOM_STATUS_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            {nominations.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-600 text-sm">Tavsiye bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {nominations.map((nom) => (
                  <div key={nom.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-purple-300">
                          {nom.candidateName[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{nom.candidateName}</p>
                          <p className="text-gray-500 text-xs">{nom.candidateEmail} · {nom.candidatePhone}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[nom.candidateRole]}`}>{ROLE_LABELS[nom.candidateRole]}</span>
                            <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${NOM_STATUS_COLORS[nom.status]}`}>{NOM_STATUS_LABELS[nom.status]}</span>
                          </div>
                          {nom.note && <p className="text-gray-500 text-xs mt-2 italic">"{nom.note}"</p>}
                          {nom.adminNote && <p className="text-yellow-600 text-xs mt-1">📝 {nom.adminNote}</p>}
                          <p className="text-gray-700 text-xs mt-2">Öneren: {nom.nominator.firstName} {nom.nominator.lastName} · {new Date(nom.createdAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setNoteModal({ type: "nomination", id: nom.id }); setNoteText(nom.adminNote || ""); }}
                          className="text-gray-400 border border-gray-700 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Not</button>
                        {nom.status === "PENDING" && (
                          <>
                            <button onClick={() => handleNominationStatus(nom.id, "APPROVED")} disabled={actionLoading === nom.id}
                              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                              {actionLoading === nom.id ? "..." : "Onayla"}
                            </button>
                            <button onClick={() => handleNominationStatus(nom.id, "REJECTED")} disabled={actionLoading === nom.id}
                              className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                              {actionLoading === nom.id ? "..." : "Reddet"}
                            </button>
                          </>
                        )}
                        {nom.status === "APPROVED" && (
                          <button onClick={() => handleNominationStatus(nom.id, "INVITED")} disabled={actionLoading === nom.id}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === nom.id ? "..." : "Davet Gönderildi"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Başvurular */}
        {activeTab === "applications" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-medium text-white">Başvurular</h2>
              <div className="flex gap-2 flex-wrap">
                {(["all", "PENDING", "APPROVED", "REJECTED", "INVITED", "REGISTERED"] as const).map((f) => (
                  <button key={f} onClick={() => setAppFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appFilter === f ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
                    {f === "all" ? "Tümü" : NOM_STATUS_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            {applications.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-600 text-sm">Başvuru bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {applications.map((app) => (
                  <div key={app.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-pink-900 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-pink-300">
                          {app.applicantName[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{app.applicantName}</p>
                          <p className="text-gray-500 text-xs">{app.applicantEmail} · {app.applicantPhone}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[app.requestedRole]}`}>{ROLE_LABELS[app.requestedRole]}</span>
                            <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${NOM_STATUS_COLORS[app.status]}`}>{NOM_STATUS_LABELS[app.status]}</span>
                            {app.referrer && <span className="text-green-400 text-xs">🔗 Referanslı</span>}
                          </div>
                          {app.message && <p className="text-gray-500 text-xs mt-2 italic">"{app.message}"</p>}
                          {app.adminNote && <p className="text-yellow-600 text-xs mt-1">📝 {app.adminNote}</p>}
                          {app.referrer && <p className="text-gray-700 text-xs mt-1">Referans: {app.referrer.firstName} {app.referrer.lastName}</p>}
                          <p className="text-gray-700 text-xs mt-1">{new Date(app.createdAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setNoteModal({ type: "application", id: app.id }); setNoteText(app.adminNote || ""); }}
                          className="text-gray-400 border border-gray-700 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Not</button>
                        {app.status === "PENDING" && (
                          <>
                            <button onClick={() => handleApplicationStatus(app.id, "APPROVED")} disabled={actionLoading === app.id}
                              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                              {actionLoading === app.id ? "..." : "Onayla"}
                            </button>
                            <button onClick={() => handleApplicationStatus(app.id, "REJECTED")} disabled={actionLoading === app.id}
                              className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                              {actionLoading === app.id ? "..." : "Reddet"}
                            </button>
                          </>
                        )}
                        {app.status === "APPROVED" && (
                          <button onClick={() => handleApplicationStatus(app.id, "INVITED")} disabled={actionLoading === app.id}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === app.id ? "..." : "Davet Gönderildi"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lina Leads */}
        {activeTab === "leads" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-medium text-white">Lina Leads</h2>
                <span className="bg-rose-900 text-rose-300 border border-rose-800 text-xs px-2.5 py-0.5 rounded-full">{leads.length} lead</span>
              </div>
              <button onClick={fetchLeads} className="text-gray-400 border border-gray-700 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Yenile</button>
            </div>
            {leads.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 text-sm">Henüz Lina'dan lead gelmedi.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {leads.map((lead) => (
                  <div key={lead.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-900 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-rose-300">
                        {lead.fullName ? lead.fullName[0].toUpperCase() : "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium text-sm">{lead.fullName || "İsimsiz"}</p>
                          <span className="bg-rose-950 text-rose-400 border border-rose-900 text-xs px-2 py-0.5 rounded-full">🤖 {lead.source}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                          {lead.phone && <p className="text-gray-500 text-xs">📞 {lead.phone}</p>}
                          {lead.email && <p className="text-gray-500 text-xs">✉️ {lead.email}</p>}
                          {lead.profession && <p className="text-gray-500 text-xs">💼 {lead.profession}</p>}
                          {lead.city && <p className="text-gray-500 text-xs">📍 {lead.city}</p>}
                          {lead.interest && <p className="text-gray-500 text-xs col-span-2">🎯 {lead.interest}</p>}
                        </div>
                        <p className="text-gray-700 text-xs mt-2">{new Date(lead.createdAt).toLocaleDateString("tr-TR")} · {new Date(lead.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                        {lead.conversation && (
                          <button onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                            className="text-rose-400 text-xs mt-2 hover:text-rose-300 transition-colors">
                            {expandedLead === lead.id ? "▲ Konuşmayı gizle" : "▼ Konuşmayı gör"}
                          </button>
                        )}
                        {expandedLead === lead.id && lead.conversation && (
                          <div className="mt-3 bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {(() => {
                              try {
                                const msgs = JSON.parse(lead.conversation);
                                return msgs.map((m: { role: string; content: string }, i: number) => (
                                  <div key={i} className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`text-xs px-3 py-1.5 rounded-lg max-w-xs ${m.role === "user" ? "bg-blue-900 text-blue-200" : "bg-gray-700 text-gray-300"}`}>
                                      {m.content}
                                    </div>
                                  </div>
                                ));
                              } catch { return <p className="text-gray-500 text-xs">{lead.conversation}</p>; }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}