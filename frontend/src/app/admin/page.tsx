"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalInvitations: number;
  pendingDocuments: number;
  byRole: { role: string; count: number }[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isApproved: boolean;
  documents: { id: string; type: string; status: string; fileUrl: string; fileName: string }[];
}

interface Document {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  fileName: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı", MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması", ADMIN: "Admin"
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

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "documents">("users");
  const [userFilter, setUserFilter] = useState<"all" | "pending" | "approved">("all");
  const [docFilter, setDocFilter] = useState<"pending" | "approved" | "rejected" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    if (user.role !== "ADMIN") { router.push("/dashboard"); return; }
    fetchAll();
  }, [hydrated, user]);

  useEffect(() => { if (hydrated && user) fetchUsers(); }, [userFilter]);
  useEffect(() => { if (hydrated && user) fetchDocuments(); }, [docFilter]);

  const fetchAll = async () => {
    try {
      const [s, u, d] = await Promise.all([
        api.get("/admin/stats"),
        api.get(`/admin/users?filter=${userFilter}`),
        api.get(`/admin/documents?filter=${docFilter}`),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setDocuments(d.data);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => { const r = await api.get("/admin/stats"); setStats(r.data); };
  const fetchUsers = async () => { const r = await api.get(`/admin/users?filter=${userFilter}`); setUsers(r.data); };
  const fetchDocuments = async () => { const r = await api.get(`/admin/documents?filter=${docFilter}`); setDocuments(r.data); };

  const handleApproveUser = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/users/${id}/approve`); await Promise.all([fetchUsers(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleRejectUser = async (id: string) => { if (!confirm("Emin misiniz?")) return; setActionLoading(id); try { await api.delete(`/admin/users/${id}/reject`); await Promise.all([fetchUsers(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleApproveDoc = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/documents/${id}/approve`); await Promise.all([fetchDocuments(), fetchStats()]); } finally { setActionLoading(null); } };
  const handleRejectDoc = async (id: string) => { setActionLoading(id); try { await api.patch(`/admin/documents/${id}/reject`); await Promise.all([fetchDocuments(), fetchStats()]); } finally { setActionLoading(null); } };

  if (!hydrated || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Yükleniyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

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

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Admin Paneli</h1>
          <p className="text-gray-500 text-sm">Üye ve belge yönetimi</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-xs mb-2">Toplam Üye</p>
              <p className="text-2xl font-semibold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-900 border border-yellow-900 rounded-xl p-5">
              <p className="text-yellow-500 text-xs mb-2">Onay Bekleyen</p>
              <p className="text-2xl font-semibold text-yellow-300">{stats.pendingUsers}</p>
            </div>
            <div className="bg-gray-900 border border-green-900 rounded-xl p-5">
              <p className="text-green-500 text-xs mb-2">Onaylanan</p>
              <p className="text-2xl font-semibold text-green-300">{stats.approvedUsers}</p>
            </div>
            <div className="bg-gray-900 border border-blue-900 rounded-xl p-5">
              <p className="text-blue-500 text-xs mb-2">Davet Kodu</p>
              <p className="text-2xl font-semibold text-blue-300">{stats.totalInvitations}</p>
            </div>
            <div className="bg-gray-900 border border-orange-900 rounded-xl p-5">
              <p className="text-orange-500 text-xs mb-2">Bekleyen Belge</p>
              <p className="text-2xl font-semibold text-orange-300">{stats.pendingDocuments}</p>
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
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === "users" ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
            Kullanıcılar
          </button>
          <button onClick={() => setActiveTab("documents")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "documents" ? "bg-blue-600 text-white" : "text-gray-400 border border-gray-700 hover:text-white"}`}>
            Belgeler
            {stats && stats.pendingDocuments > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{stats.pendingDocuments}</span>
            )}
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
                  <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
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
                    <div className="flex items-center gap-3">
                      <span className={`border rounded-full px-3 py-1 text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      {u.documents?.length > 0 && <span className="text-gray-600 text-xs">{u.documents.length} belge</span>}
                      {!u.isApproved ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveUser(u.id)} disabled={actionLoading === u.id}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === u.id ? "..." : "Onayla"}
                          </button>
                          <button onClick={() => handleRejectUser(u.id)} disabled={actionLoading === u.id}
                            className="bg-red-950 hover:bg-red-900 border border-red-900 disabled:bg-gray-700 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            {actionLoading === u.id ? "..." : "Reddet"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-green-400 text-xs">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Onaylandı
                        </div>
                      )}
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
                        <p className="text-white font-medium text-sm">{DOC_LABELS[doc.type]}</p>
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
      </div>
    </div>
  );
}