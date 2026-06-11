"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Filter,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type Role =
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | "MODERATOR"
  | "ADMIN"
  | "SUPER_ADMIN";

type UserRestriction = {
  id: string;
  type: string;
  reason: string;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    role?: string | null;
  } | null;
};

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: Role | string;
  memberCode?: string | null;
  memberSince?: string | null;
  city?: string | null;
  district?: string | null;
  cityPlateCode?: string | null;
  isApproved?: boolean;
  isVerified?: boolean;
  nominationPoints?: number;
  nominationQuota?: number;
  referralCode?: string | null;
  createdAt?: string;
  documents?: {
    id: string;
    type: string;
    status: string;
    fileUrl?: string | null;
    fileName?: string | null;
    createdAt?: string;
  }[];
  restrictions?: UserRestriction[];
};

const ROLE_LABELS: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
  { value: "MODERATOR", label: "Moderatör" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Yazılım Ekibi" },
];

const EMPTY_CREATE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "EMLAKCI" as Role,
};

function fullName(user: AdminUser) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function initials(user: AdminUser) {
  const first = String(user.firstName || "").trim().charAt(0);
  const last = String(user.lastName || "").trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "EP";
}

function dateText(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role?: string | null) {
  return ROLE_LABELS[String(role || "")] || String(role || "Rol yok");
}

function activeRestriction(user: AdminUser) {
  return Array.isArray(user.restrictions) && user.restrictions.length > 0
    ? user.restrictions[0]
    : null;
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const currentRole = String(user?.role || "").toUpperCase();
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isAdmin = currentRole === "ADMIN";
  const canAccess = isAdmin || isSuperAdmin;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("ONE_HOUR");

  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [nextRole, setNextRole] = useState<Role>("EMLAKCI");

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!canAccess) {
      router.push("/admin");
      return;
    }

    loadUsers(filter);
  }, [hasHydrated, user?.id, user?.role]);

  async function loadUsers(nextFilter = filter) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(`/admin/users?filter=${nextFilter}&t=${Date.now()}`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function changeFilter(value: "all" | "approved" | "pending") {
    setFilter(value);
    loadUsers(value);
  }

  const counts = useMemo(() => {
    const suspended = users.filter((item) => activeRestriction(item)).length;

    return {
      total: users.length,
      approved: users.filter((item) => item.isApproved).length,
      pending: users.filter((item) => !item.isApproved).length,
      suspended,
      memberCodeMissing: users.filter((item) => item.isApproved && !item.memberCode).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = normalize(query);

    return users.filter((item) => {
      const text = normalize(
        [
          fullName(item),
          item.email,
          item.phone,
          item.memberCode,
          item.city,
          item.district,
          roleLabel(item.role),
        ].join(" "),
      );

      const queryMatch = !q || text.includes(q);
      const roleMatch = roleFilter === "all" || item.role === roleFilter;

      return queryMatch && roleMatch;
    });
  }, [users, query, roleFilter]);

  async function approveUser(item: AdminUser) {
    setBusyKey(`${item.id}-approve`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/users/${item.id}/approve`);
      setSuccess(`${fullName(item)} onaylandı.`);
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı onaylanamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function deleteUser(item: AdminUser) {
    if (!isSuperAdmin) {
      setError("Kullanıcı silme yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    const confirmed = window.confirm(`${fullName(item)} kalıcı olarak silinecek. Emin misiniz?`);
    if (!confirmed) return;

    setBusyKey(`${item.id}-delete`);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/admin/users/${item.id}/reject`);
      setSuccess(`${fullName(item)} silindi.`);
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı silinemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function submitSuspend() {
    if (!suspendUser) return;

    if (!suspendReason.trim()) {
      setError("Askıya alma sebebi zorunludur.");
      return;
    }

    setBusyKey(`${suspendUser.id}-suspend`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/users/${suspendUser.id}/suspend`, {
        reason: suspendReason.trim(),
        duration: isAdmin ? "ONE_HOUR" : suspendDuration,
      });

      setSuccess(`${fullName(suspendUser)} askıya alındı.`);
      setSuspendUser(null);
      setSuspendReason("");
      setSuspendDuration("ONE_HOUR");
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı askıya alınamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function submitRoleChange() {
    if (!roleUser) return;

    if (!isSuperAdmin) {
      setError("Rol değiştirme yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    setBusyKey(`${roleUser.id}-role`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/users/${roleUser.id}/role`, {
        role: nextRole,
      });

      setSuccess(`${fullName(roleUser)} rolü güncellendi.`);
      setRoleUser(null);
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Rol değiştirilemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function assignMemberCode(item: AdminUser) {
    if (!isSuperAdmin) {
      setError("Üye numarası oluşturma yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    setBusyKey(`${item.id}-member-code`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/users/${item.id}/member-code`);
      setSuccess(`${fullName(item)} için üye numarası oluşturuldu.`);
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Üye numarası oluşturulamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function assignMissingMemberCodes() {
    if (!isSuperAdmin) {
      setError("Toplu üye numarası yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    setBusyKey("missing-member-codes");
    setError("");
    setSuccess("");

    try {
      const response = await api.patch("/admin/users/member-codes/missing");
      setSuccess(response.data?.message || "Eksik üye numaraları oluşturuldu.");
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Toplu üye numarası oluşturulamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function createUser() {
    setError("");
    setSuccess("");

    if (
      !createForm.firstName.trim() ||
      !createForm.lastName.trim() ||
      !createForm.email.trim() ||
      !createForm.phone.trim() ||
      !createForm.password.trim()
    ) {
      setError("Ad, soyad, e-posta, telefon ve şifre zorunludur.");
      return;
    }

    setBusyKey("create-user");

    try {
      await api.post("/admin/users", {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
      });

      setSuccess("Yeni kullanıcı oluşturuldu.");
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateOpen(false);
      await loadUsers(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı oluşturulamadı.");
    } finally {
      setBusyKey("");
    }
  }

  function copyText(value?: string | null) {
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => undefined);
    setSuccess("Kopyalandı.");
    window.setTimeout(() => setSuccess(""), 1200);
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Kullanıcı Yönetimi
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Admin paneline dön"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em] text-[#172033]">
                Kullanıcı Yönetimi
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Listele, onayla, askıya al, rol ve üye no yönet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={assignMissingMemberCodes}
                disabled={busyKey === "missing-member-codes"}
                className="hidden h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 text-[12px] font-black text-blue-700 disabled:opacity-60 sm:flex"
              >
                {busyKey === "missing-member-codes" ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                Eksik Üye No
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-sm"
            >
              <Plus size={17} />
              Yeni
            </button>

            <button
              type="button"
              onClick={() => loadUsers(filter)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Yenile"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <MetricCard label="Toplam" value={counts.total} icon={<UsersRound size={18} />} tone="blue" />
          <MetricCard label="Onaylı" value={counts.approved} icon={<CheckCircle2 size={18} />} tone="green" />
          <MetricCard label="Bekleyen" value={counts.pending} icon={<ShieldCheck size={18} />} tone="amber" />
          <MetricCard label="Askıda" value={counts.suspended} icon={<Ban size={18} />} tone="rose" />
          <MetricCard label="Üye No Eksik" value={counts.memberCodeMissing} icon={<KeyRound size={18} />} tone="slate" centeredLast />
        </section>

        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_160px_170px_110px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ad, e-posta, telefon, üye no, şehir ara..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6] md:text-left"
              />
            </label>

            <select
              value={filter}
              onChange={(event) => changeFilter(event.target.value as "all" | "approved" | "pending")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="approved">Onaylı</option>
              <option value="pending">Bekleyen / Askıda</option>
            </select>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="all">Tüm Roller</option>
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadUsers(filter)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#172033] px-3 text-[12px] font-black text-white"
            >
              <Filter size={16} />
              Filtrele
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center text-[13px] font-black text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-[13px] font-black text-emerald-700">
            {success}
          </div>
        ) : null}

        {filteredUsers.length === 0 ? (
          <section className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <UsersRound className="mx-auto text-slate-400" size={36} />
            <p className="mt-3 text-[15px] font-black text-slate-700">
              Bu filtrede kullanıcı bulunamadı.
            </p>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((item) => (
              <UserCard
                key={item.id}
                item={item}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                isSuperAdmin={isSuperAdmin}
                busyKey={busyKey}
                onApprove={approveUser}
                onSuspend={(target) => {
                  setSuspendUser(target);
                  setSuspendReason("");
                  setSuspendDuration("ONE_HOUR");
                }}
                onRole={(target) => {
                  setRoleUser(target);
                  setNextRole(String(target.role || "EMLAKCI") as Role);
                }}
                onDelete={deleteUser}
                onMemberCode={assignMemberCode}
                onCopy={copyText}
              />
            ))}
          </section>
        )}
      </div>

      {createOpen ? (
        <Modal title="Yeni Kullanıcı Oluştur" onClose={() => setCreateOpen(false)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Ad" value={createForm.firstName} onChange={(value) => setCreateForm({ ...createForm, firstName: value })} />
            <Input label="Soyad" value={createForm.lastName} onChange={(value) => setCreateForm({ ...createForm, lastName: value })} />
            <Input label="E-posta" value={createForm.email} onChange={(value) => setCreateForm({ ...createForm, email: value })} />
            <Input label="Telefon" value={createForm.phone} onChange={(value) => setCreateForm({ ...createForm, phone: value })} />
            <Input label="Geçici Şifre" value={createForm.password} onChange={(value) => setCreateForm({ ...createForm, password: value })} type="password" />

            <label>
              <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Rol
              </span>
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6]"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={createUser}
            disabled={busyKey === "create-user"}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1557D6] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === "create-user" ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Kullanıcı Oluştur
          </button>
        </Modal>
      ) : null}

      {suspendUser ? (
        <Modal title="Kullanıcıyı Askıya Al" onClose={() => setSuspendUser(null)}>
          <div className="rounded-2xl bg-slate-50 p-3 text-center">
            <p className="text-[15px] font-black text-[#172033]">{fullName(suspendUser)}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-500">{suspendUser.email}</p>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Sebep Zorunlu
            </span>
            <textarea
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              rows={4}
              placeholder="Askıya alma sebebini yaz..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6]"
            />
          </label>

          {isSuperAdmin ? (
            <label className="mt-2 block">
              <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Süre
              </span>
              <select
                value={suspendDuration}
                onChange={(event) => setSuspendDuration(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
              >
                <option value="ONE_HOUR">1 Saat</option>
                <option value="ONE_DAY">1 Gün</option>
                <option value="ONE_WEEK">1 Hafta</option>
                <option value="ONE_MONTH">1 Ay</option>
                <option value="PERMANENT">Süresiz</option>
              </select>
            </label>
          ) : (
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-[12px] font-black text-amber-700">
              Admin için askıya alma süresi sistem kuralı gereği 1 saattir.
            </div>
          )}

          <button
            type="button"
            onClick={submitSuspend}
            disabled={busyKey === `${suspendUser.id}-suspend`}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === `${suspendUser.id}-suspend` ? <Loader2 className="animate-spin" size={18} /> : <Ban size={18} />}
            Askıya Al
          </button>
        </Modal>
      ) : null}

      {roleUser ? (
        <Modal title="Rol Değiştir" onClose={() => setRoleUser(null)}>
          <div className="rounded-2xl bg-slate-50 p-3 text-center">
            <p className="text-[15px] font-black text-[#172033]">{fullName(roleUser)}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-500">
              Mevcut rol: {roleLabel(roleUser.role)}
            </p>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Yeni Rol
            </span>
            <select
              value={nextRole}
              onChange={(event) => setNextRole(event.target.value as Role)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
            >
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={submitRoleChange}
            disabled={busyKey === `${roleUser.id}-role`}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1557D6] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === `${roleUser.id}-role` ? <Loader2 className="animate-spin" size={18} /> : <UserCog size={18} />}
            Rolü Güncelle
          </button>
        </Modal>
      ) : null}
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  centeredLast,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "rose" | "slate";
  centeredLast?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "slate"
            ? "bg-slate-100 text-slate-700"
            : "bg-blue-50 text-blue-700";

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm ${
        centeredLast ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""
      }`}
    >
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black leading-none text-[#172033]">{value}</p>
    </article>
  );
}

function UserCard({
  item,
  currentUserId,
  isAdmin,
  isSuperAdmin,
  busyKey,
  onApprove,
  onSuspend,
  onRole,
  onDelete,
  onMemberCode,
  onCopy,
}: {
  item: AdminUser;
  currentUserId?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  busyKey: string;
  onApprove: (item: AdminUser) => void;
  onSuspend: (item: AdminUser) => void;
  onRole: (item: AdminUser) => void;
  onDelete: (item: AdminUser) => void;
  onMemberCode: (item: AdminUser) => void;
  onCopy: (value?: string | null) => void;
}) {
  const restriction = activeRestriction(item);
  const isSelf = currentUserId === item.id;
  const isSystemUser = item.role === "SUPER_ADMIN";

  const adminCanSuspend =
    isAdmin && !isSelf && item.role !== "ADMIN" && item.role !== "SUPER_ADMIN";

  const superAdminCanManage = isSuperAdmin && !isSelf;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1557D6] text-[14px] font-black text-white">
          {item.profileImageUrl ? (
            <img src={item.profileImageUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            initials(item)
          )}
          {item.isApproved ? (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-white text-emerald-600">
              <BadgeCheck size={17} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-black tracking-[-0.03em] text-[#172033]">
                {fullName(item)}
              </h2>
              <p className="truncate text-[11px] font-bold text-slate-500">{item.email}</p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                item.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {item.isApproved ? "Onaylı" : "Bekliyor"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <MiniPill label={roleLabel(item.role)} />
            <MiniPill label={item.city ? `${item.city}${item.district ? ` / ${item.district}` : ""}` : "Şehir yok"} />
            {restriction ? <MiniPill label="Askıda" danger /> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoBox label="Üye No" value={item.memberCode || "Yok"} onCopy={() => onCopy(item.memberCode)} />
        <InfoBox label="Telefon" value={item.phone || "Yok"} onCopy={() => onCopy(item.phone)} />
        <InfoBox label="Kayıt" value={dateText(item.createdAt)} />
        <InfoBox label="Referans" value={item.referralCode || "Yok"} onCopy={() => onCopy(item.referralCode)} />
      </div>

      {restriction ? (
        <div className="mt-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-rose-600">
            Aktif Askı
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] font-bold text-rose-700">
            {restriction.reason}
          </p>
          <p className="mt-1 text-[11px] font-bold text-rose-500">
            Bitiş: {dateText(restriction.endsAt)}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {!item.isApproved ? (
          <ActionButton
            label="Onayla"
            icon={<CheckCircle2 size={16} />}
            loading={busyKey === `${item.id}-approve`}
            onClick={() => onApprove(item)}
            className="bg-emerald-50 text-emerald-700"
          />
        ) : (
          <ActionButton
            label="Askıya Al"
            icon={<Ban size={16} />}
            loading={busyKey === `${item.id}-suspend`}
            onClick={() => onSuspend(item)}
            disabled={!adminCanSuspend && !superAdminCanManage}
            className="bg-amber-50 text-amber-700"
          />
        )}

        <ActionButton
          label="Rol"
          icon={<UserCog size={16} />}
          loading={busyKey === `${item.id}-role`}
          onClick={() => onRole(item)}
          disabled={!isSuperAdmin || isSelf}
          className="bg-blue-50 text-blue-700"
        />

        <ActionButton
          label="Üye No"
          icon={<KeyRound size={16} />}
          loading={busyKey === `${item.id}-member-code`}
          onClick={() => onMemberCode(item)}
          disabled={!isSuperAdmin || Boolean(item.memberCode)}
          className="bg-slate-100 text-slate-700"
        />

        <ActionButton
          label={isSystemUser ? "Korumalı" : "Sil"}
          icon={isSystemUser ? <Lock size={16} /> : <Trash2 size={16} />}
          loading={busyKey === `${item.id}-delete`}
          onClick={() => onDelete(item)}
          disabled={!isSuperAdmin || isSelf || isSystemUser}
          className="bg-rose-50 text-rose-700"
        />
      </div>
    </article>
  );
}

function MiniPill({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ${
        danger ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

function InfoBox({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!onCopy || value === "Yok"}
      className="min-h-[52px] rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center disabled:cursor-default"
    >
      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="mt-1 flex items-center justify-center gap-1 truncate text-[11px] font-black text-[#172033]">
        {value}
        {onCopy && value !== "Yok" ? <ClipboardCopy size={12} className="shrink-0 text-slate-400" /> : null}
      </span>
    </button>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  className,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl px-2 text-[12px] font-black disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : icon}
      {loading ? "..." : label}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6]"
      />
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-[520px] rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}