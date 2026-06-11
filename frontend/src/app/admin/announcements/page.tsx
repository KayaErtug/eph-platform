"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type Audience =
  | "TUM_UYELER"
  | "EMLAKCILAR"
  | "MUTEAHHITLER"
  | "INSAAT_FIRMALARI"
  | "ADMINLER";

type AnnouncementUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
};

type Announcement = {
  id: string;
  createdById: string;
  title: string;
  content: string;
  audience: Audience | string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: AnnouncementUser | null;
};

type AnnouncementsResponse = {
  summary: {
    total: number;
    active: number;
    passive: number;
    filtered: number;
  };
  items: Announcement[];
};

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "TUM_UYELER", label: "Tüm Üyeler" },
  { value: "EMLAKCILAR", label: "Emlakçılar" },
  { value: "MUTEAHHITLER", label: "Müteahhitler" },
  { value: "INSAAT_FIRMALARI", label: "İnşaat Firmaları" },
  { value: "ADMINLER", label: "Adminler" },
];

const EMPTY_FORM = {
  title: "",
  content: "",
  audience: "TUM_UYELER" as Audience,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

function audienceLabel(value?: string | null) {
  return AUDIENCE_OPTIONS.find((item) => item.value === value)?.label || value || "-";
}

function dateText(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function userName(user?: AnnouncementUser | null) {
  if (!user) return "Sistem";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Yönetici";
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const currentRole = String(user?.role || "").toUpperCase();
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const canAccess = currentRole === "ADMIN" || isSuperAdmin;

  const [items, setItems] = useState<Announcement[]>([]);
  const [summary, setSummary] = useState<AnnouncementsResponse["summary"]>({
    total: 0,
    active: 0,
    passive: 0,
    filtered: 0,
  });

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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

    loadAnnouncements();
  }, [hasHydrated, user?.id, user?.role]);

  async function loadAnnouncements() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams();

      if (status) params.set("status", status);
      if (audience) params.set("audience", audience);
      params.set("t", String(Date.now()));

      const response = await api.get(`/admin/announcements?${params.toString()}`);

      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setSummary(
        response.data?.summary || {
          total: 0,
          active: 0,
          passive: 0,
          filtered: 0,
        },
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Duyurular yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = normalize(query);

    return items.filter((item) => {
      if (!q) return true;

      return normalize(
        [
          item.title,
          item.content,
          item.audience,
          audienceLabel(item.audience),
          userName(item.createdBy),
        ].join(" "),
      ).includes(q);
    });
  }, [items, query]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError("");
    setSuccess("");
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({
      title: item.title || "",
      content: item.content || "",
      audience: String(item.audience || "TUM_UYELER") as Audience,
      isActive: Boolean(item.isActive),
      startsAt: item.startsAt ? item.startsAt.slice(0, 16) : "",
      endsAt: item.endsAt ? item.endsAt.slice(0, 16) : "",
    });
    setFormOpen(true);
    setError("");
    setSuccess("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function saveAnnouncement() {
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Duyuru başlığı zorunludur.");
      return;
    }

    if (!form.content.trim()) {
      setError("Duyuru içeriği zorunludur.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      audience: form.audience,
      isActive: form.isActive,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || null,
    };

    setBusyKey("save-announcement");

    try {
      if (editing) {
        await api.patch(`/admin/announcements/${editing.id}`, payload);
        setSuccess("Duyuru güncellendi.");
      } else {
        await api.post("/admin/announcements", payload);
        setSuccess("Duyuru oluşturuldu.");
      }

      closeForm();
      await loadAnnouncements();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Duyuru kaydedilemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleAnnouncement(item: Announcement) {
    setBusyKey(`${item.id}-toggle`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/announcements/${item.id}`, {
        isActive: !item.isActive,
      });

      setSuccess(item.isActive ? "Duyuru pasife alındı." : "Duyuru aktif edildi.");
      await loadAnnouncements();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Duyuru durumu değiştirilemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function deleteAnnouncement(item: Announcement) {
    if (!isSuperAdmin) {
      setError("Duyuru silme yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    const confirmed = window.confirm(`"${item.title}" duyurusu silinecek. Emin misiniz?`);
    if (!confirmed) return;

    setBusyKey(`${item.id}-delete`);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/admin/announcements/${item.id}`);
      setSuccess("Duyuru silindi.");
      await loadAnnouncements();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Duyuru silinemedi.");
    } finally {
      setBusyKey("");
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Duyurular
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
                Duyurular
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Platform duyurularını oluştur, düzenle ve yayınla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-sm"
            >
              <Plus size={17} />
              Yeni
            </button>

            <button
              type="button"
              onClick={loadAnnouncements}
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

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Toplam" value={summary.total} icon={<Megaphone size={18} />} tone="blue" />
          <MetricCard label="Aktif" value={summary.active} icon={<CheckCircle2 size={18} />} tone="green" />
          <MetricCard label="Pasif" value={summary.passive} icon={<FileText size={18} />} tone="amber" />
          <MetricCard label="Filtre" value={summary.filtered} icon={<Filter size={18} />} tone="slate" />
        </section>

        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_160px_190px_110px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Başlık, içerik veya hedef kitle ara..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6] md:text-left"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>

            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
            >
              <option value="">Tüm Hedefler</option>
              {AUDIENCE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadAnnouncements}
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

        {filteredItems.length === 0 ? (
          <section className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Megaphone className="mx-auto text-slate-400" size={36} />
            <p className="mt-3 text-[15px] font-black text-slate-700">
              Bu filtrede duyuru bulunamadı.
            </p>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                busyKey={busyKey}
                isSuperAdmin={isSuperAdmin}
                onDetail={() => setDetail(item)}
                onEdit={() => openEdit(item)}
                onToggle={() => toggleAnnouncement(item)}
                onDelete={() => deleteAnnouncement(item)}
              />
            ))}
          </section>
        )}
      </div>

      {formOpen ? (
        <Modal title={editing ? "Duyuru Düzenle" : "Yeni Duyuru"} onClose={closeForm}>
          <div className="grid gap-2">
            <Input
              label="Başlık"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
            />

            <label>
              <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                İçerik
              </span>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6]"
                placeholder="Duyuru metnini yaz..."
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Hedef Kitle
                </span>
                <select
                  value={form.audience}
                  onChange={(event) => setForm({ ...form, audience: event.target.value as Audience })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
                >
                  {AUDIENCE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Durum
                </span>
                <select
                  value={form.isActive ? "active" : "passive"}
                  onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
                >
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </label>

              <Input
                label="Başlangıç"
                value={form.startsAt}
                onChange={(value) => setForm({ ...form, startsAt: value })}
                type="datetime-local"
              />

              <Input
                label="Bitiş"
                value={form.endsAt}
                onChange={(value) => setForm({ ...form, endsAt: value })}
                type="datetime-local"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveAnnouncement}
            disabled={busyKey === "save-announcement"}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1557D6] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === "save-announcement" ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            Kaydet
          </button>
        </Modal>
      ) : null}

      {detail ? (
        <Modal title="Duyuru Detayı" onClose={() => setDetail(null)}>
          <div className="grid gap-2">
            <DetailRow label="Başlık" value={detail.title} />
            <DetailRow label="Hedef" value={audienceLabel(detail.audience)} />
            <DetailRow label="Durum" value={detail.isActive ? "Aktif" : "Pasif"} />
            <DetailRow label="Oluşturan" value={userName(detail.createdBy)} />
            <DetailRow label="Başlangıç" value={dateText(detail.startsAt)} />
            <DetailRow label="Bitiş" value={dateText(detail.endsAt)} />
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              İçerik
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] font-bold leading-6 text-[#172033]">
              {detail.content}
            </p>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function AnnouncementCard({
  item,
  busyKey,
  isSuperAdmin,
  onDetail,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: Announcement;
  busyKey: string;
  isSuperAdmin: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-[15px] font-black tracking-[-0.03em] text-[#172033]">
            {item.title}
          </h2>
          <p className="mt-1 line-clamp-3 text-[12px] font-bold leading-5 text-slate-500">
            {item.content}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
            item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.isActive ? "Aktif" : "Pasif"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoBox label="Hedef" value={audienceLabel(item.audience)} icon={<UsersRound size={14} />} />
        <InfoBox label="Oluşturan" value={userName(item.createdBy)} icon={<Megaphone size={14} />} />
        <InfoBox label="Başlangıç" value={dateText(item.startsAt)} icon={<FileText size={14} />} />
        <InfoBox label="Bitiş" value={dateText(item.endsAt)} icon={<FileText size={14} />} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton label="Detay" icon={<Eye size={16} />} onClick={onDetail} className="bg-slate-100 text-slate-700" />
        <ActionButton label="Düzenle" icon={<Edit3 size={16} />} onClick={onEdit} className="bg-blue-50 text-blue-700" />
        <ActionButton
          label={item.isActive ? "Pasife Al" : "Aktif Et"}
          icon={<CheckCircle2 size={16} />}
          onClick={onToggle}
          loading={busyKey === `${item.id}-toggle`}
          className="bg-amber-50 text-amber-700"
        />
        <ActionButton
          label="Sil"
          icon={<Trash2 size={16} />}
          onClick={onDelete}
          loading={busyKey === `${item.id}-delete`}
          disabled={!isSuperAdmin}
          className="bg-rose-50 text-rose-700"
        />
      </div>
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
      <span className="mt-1 block truncate text-[11px] font-black text-[#172033]">
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  className,
  loading,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
  loading?: boolean;
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
      <section className="w-full max-w-[620px] rounded-3xl bg-white p-4 shadow-2xl">
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