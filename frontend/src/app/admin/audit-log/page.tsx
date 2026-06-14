"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Eye,
  FileJson,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type AuditUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  memberCode?: string | null;
  profileImageUrl?: string | null;
};

type AuditLogItem = {
  id: string;
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: AuditUser | null;
  targetUser?: AuditUser | null;
};

type AuditResponse = {
  total: number;
  limit: number;
  items: AuditLogItem[];
  filters?: {
    actions?: { action: string; count: number }[];
    entityTypes?: { entityType: string; count: number }[];
  };
};

function userName(user?: AuditUser | null) {
  if (!user) return "Sistem";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Kullanıcı";
}

function dateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJson(value: any) {
  if (!value) return "Metadata yok.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const isSuperAdmin = String(user?.role || "").toUpperCase() === "SUPER_ADMIN";

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [limit, setLimit] = useState("100");

  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }

    loadLogs();
  }, [hasHydrated, user?.id, user?.role]);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (limit) params.set("limit", limit);

      params.set("t", String(Date.now()));

      const response = await api.get(`/admin/audit-log?${params.toString()}`);
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Audit Log kayıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const items = data?.items || [];

  const counts = useMemo(() => {
    return {
      total: data?.total || 0,
      visible: items.length,
      actions: data?.filters?.actions?.length || 0,
      entities: data?.filters?.entityTypes?.length || 0,
    };
  }, [data, items.length]);

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Audit Log
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
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Audit Log
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Yönetici işlem kayıtları ve güvenlik izleri
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Yenile"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Toplam" value={counts.total} icon={<ShieldCheck size={18} />} tone="blue" />
          <MetricCard label="Görünen" value={counts.visible} icon={<Eye size={18} />} tone="green" />
          <MetricCard label="İşlem Tipi" value={counts.actions} icon={<Filter size={18} />} tone="amber" />
          <MetricCard label="Entity" value={counts.entities} icon={<FileJson size={18} />} tone="slate" />
        </section>

        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_190px_170px_110px_110px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İşlem, açıklama, IP veya kayıt ara..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6] md:text-left"
              />
            </label>

            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="">Tüm İşlemler</option>
              {(data?.filters?.actions || []).map((item) => (
                <option key={item.action} value={item.action}>
                  {item.action} ({item.count})
                </option>
              ))}
            </select>

            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="">Tüm Entity</option>
              {(data?.filters?.entityTypes || []).map((item) => (
                <option key={item.entityType} value={item.entityType}>
                  {item.entityType} ({item.count})
                </option>
              ))}
            </select>

            <select
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="300">300</option>
            </select>

            <button
              type="button"
              onClick={loadLogs}
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

        {items.length === 0 ? (
          <section className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ShieldCheck className="mx-auto text-slate-400" size={36} />
            <p className="mt-3 text-[15px] font-black text-slate-700">
              Bu filtrede audit kaydı bulunamadı.
            </p>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <AuditCard key={item.id} item={item} onDetail={() => setSelected(item)} />
            ))}
          </section>
        )}
      </div>

      {selected ? (
        <Modal title="Audit Detayı" onClose={() => setSelected(null)}>
          <div className="grid gap-2">
            <DetailRow label="İşlem" value={selected.action} />
            <DetailRow label="Entity" value={`${selected.entityType}${selected.entityId ? ` / ${selected.entityId}` : ""}`} />
            <DetailRow label="Yönetici" value={userName(selected.actor)} />
            <DetailRow label="Hedef" value={userName(selected.targetUser)} />
            <DetailRow label="Tarih" value={dateTime(selected.createdAt)} />
            <DetailRow label="IP" value={selected.ipAddress || "-"} />
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                UserAgent
              </p>
              <pre className="mt-1 max-h-[96px] overflow-auto whitespace-pre-wrap break-all text-left text-[11px] font-black leading-4 text-[#172033]">
                {selected.userAgent || "-"}
              </pre>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-950 p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Metadata
            </p>
            <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-all text-[11px] font-bold leading-5 text-slate-100">
              {formatJson(selected.metadata)}
            </pre>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function AuditCard({ item, onDetail }: { item: AuditLogItem; onDetail: () => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-[14px] font-black tracking-[-0.03em] text-[#172033]">
            {item.action}
          </h2>
          <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-5 text-slate-500">
            {item.description || "Açıklama yok."}
          </p>
        </div>

        <span className="max-w-[120px] shrink-0 truncate rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
          {item.entityType}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoBox label="Yönetici" value={userName(item.actor)} icon={<UserRound size={14} />} />
        <InfoBox label="Hedef" value={userName(item.targetUser)} icon={<UserRound size={14} />} />
        <InfoBox label="Tarih" value={dateTime(item.createdAt)} icon={<Clock3 size={14} />} />
        <InfoBox label="IP" value={item.ipAddress || "-"} icon={<ShieldCheck size={14} />} />
      </div>

      <button
        type="button"
        onClick={onDetail}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-[12px] font-black text-slate-700"
      >
        <Eye size={16} />
        Detay Gör
      </button>
    </article>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "rose" | "slate";
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
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
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

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-h-[52px] rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center">
      <span className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </span>
      <span className="mt-1 block line-clamp-2 break-words text-[11px] font-black leading-4 text-[#172033]">
        {value}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-[12px] font-black text-[#172033]">
        {value || "-"}
      </p>
    </div>
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
      <section className="max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl">
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