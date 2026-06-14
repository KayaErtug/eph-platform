"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type TuranQuote = {
  id: string;
  text: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

const EMPTY_FORM = {
  text: "",
  isActive: true,
  sortOrder: "",
};

const MAX_QUOTE_LENGTH = 300;

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

function normalizeQuotes(input: unknown): TuranQuote[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: any, index) => ({
      id: String(item?.id || `quote-${index}`),
      text: String(item?.text || "").trim(),
      isActive: item?.isActive !== false,
      sortOrder: Number(item?.sortOrder || index + 1),
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
    }))
    .filter((item) => item.text)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export default function AdminTuranPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const role = String(user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [items, setItems] = useState<TuranQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TuranQuote | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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

    loadQuotes();
  }, [hasHydrated, user?.id, user?.role]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      passive: items.filter((item) => !item.isActive).length,
    };
  }, [items]);

  async function loadQuotes() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(`/turan-quotes/admin?t=${Date.now()}`);
      setItems(normalizeQuotes(response.data));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Turan sözleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: String((items[items.length - 1]?.sortOrder || 0) + 1) });
    setFormOpen(true);
    setError("");
    setSuccess("");
  }

  function openEdit(item: TuranQuote) {
    setEditing(item);
    setForm({
      text: item.text,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder || 0),
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

  async function saveQuote() {
    const text = form.text.trim();

    setError("");
    setSuccess("");

    if (!text) {
      setError("Turan sözü boş bırakılamaz.");
      return;
    }

    if (text.length > MAX_QUOTE_LENGTH) {
      setError(`Turan sözü en fazla ${MAX_QUOTE_LENGTH} karakter olabilir.`);
      return;
    }

    const payload = {
      text,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
    };

    setBusyKey("save");

    try {
      if (editing) {
        await api.patch(`/turan-quotes/${editing.id}`, payload);
        setSuccess("Turan sözü güncellendi.");
      } else {
        await api.post("/turan-quotes", payload);
        setSuccess("Turan sözü eklendi.");
      }

      closeForm();
      await loadQuotes();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Turan sözü kaydedilemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleQuote(item: TuranQuote) {
    setBusyKey(`toggle-${item.id}`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/turan-quotes/${item.id}`, { isActive: !item.isActive });
      setSuccess(item.isActive ? "Söz pasife alındı." : "Söz aktif edildi.");
      await loadQuotes();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Durum değiştirilemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function deleteQuote(item: TuranQuote) {
    const confirmed = window.confirm("Bu Turan sözü silinsin mi?");
    if (!confirmed) return;

    setBusyKey(`delete-${item.id}`);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/turan-quotes/${item.id}`);
      setSuccess("Turan sözü silindi.");
      await loadQuotes();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Turan sözü silinemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function loadDefaults() {
    setBusyKey("defaults");
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/turan-quotes/defaults");
      setItems(normalizeQuotes(response.data));
      setSuccess("Varsayılan Turan sözleri yüklendi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Varsayılan sözler yüklenemedi.");
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
            Turan Yönetimi
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
                Turan Yönetimi
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Yalnızca Yazılım Ekibi tarafından yönetilir
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
              onClick={loadQuotes}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Yenile"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2" />

        <section className="mb-3 rounded-3xl border border-red-100 bg-white p-4 text-center shadow-sm">
          <Sparkles className="mx-auto text-red-700" size={32} />
          <h2 className="mt-2 text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            Turan Köşesi V4
          </h2>
          <p className="mx-auto mt-1 max-w-[760px] text-[12px] font-bold leading-5 text-slate-600">
            Sözler veritabanından gelir. Admin ve Moderatör yönetim ekranını göremez; sadece banner görünür.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <MetricCard label="Toplam" value={stats.total} />
          <MetricCard label="Aktif" value={stats.active} />
          <MetricCard label="Pasif" value={stats.passive} />
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

        {items.length === 0 ? (
          <section className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <Sparkles className="mx-auto text-slate-400" size={34} />
            <h3 className="mt-3 text-[16px] font-black text-slate-700">Henüz Turan sözü yok</h3>
            <p className="mx-auto mt-1 max-w-[520px] text-[12px] font-bold leading-5 text-slate-500">
              Varsayılan sözleri yükleyebilir veya yeni söz ekleyebilirsin.
            </p>
            <button
              type="button"
              onClick={loadDefaults}
              disabled={busyKey === "defaults"}
              className="mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 text-[12px] font-black text-white disabled:opacity-60"
            >
              {busyKey === "defaults" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Varsayılanları Yükle
            </button>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((item) => (
              <QuoteCard
                key={item.id}
                item={item}
                busyKey={busyKey}
                onEdit={() => openEdit(item)}
                onToggle={() => toggleQuote(item)}
                onDelete={() => deleteQuote(item)}
              />
            ))}
          </section>
        )}
      </div>

      {formOpen ? (
        <Modal title={editing ? "Turan Sözü Düzenle" : "Yeni Turan Sözü"} onClose={closeForm}>
          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Söz
            </span>
            <textarea
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value.slice(0, MAX_QUOTE_LENGTH) })}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] font-bold leading-6 outline-none focus:border-[#1557D6]"
              placeholder="Turan sözünü yaz..."
            />
            <span className="mt-1 block text-center text-[10px] font-black text-slate-400">
              {form.text.trim().length}/{MAX_QUOTE_LENGTH}
            </span>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Sıra
              </span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none focus:border-[#1557D6]"
              />
            </label>

            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`mt-5 flex h-11 items-center justify-center gap-2 rounded-xl text-[12px] font-black ${
                form.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {form.isActive ? "Aktif" : "Pasif"}
            </button>
          </div>

          <button
            type="button"
            onClick={saveQuote}
            disabled={busyKey === "save"}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1557D6] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === "save" ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            Kaydet
          </button>
        </Modal>
      ) : null}
    </main>
  );
}

function QuoteCard({
  item,
  busyKey,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: TuranQuote;
  busyKey: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
            Sıra {item.sortOrder || 0}
          </p>
          <h2 className="mt-1 line-clamp-4 break-words text-[14px] font-black leading-5 text-[#172033]">
            {item.text}
          </h2>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
            item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.isActive ? "Aktif" : "Pasif"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <InfoBox label="Oluşturma" value={dateText(item.createdAt)} />
        <InfoBox label="Güncelleme" value={dateText(item.updatedAt)} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <ActionButton label="Düzenle" icon={<Edit3 size={15} />} onClick={onEdit} className="bg-blue-50 text-blue-700" />
        <ActionButton
          label={item.isActive ? "Pasif" : "Aktif"}
          icon={item.isActive ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
          onClick={onToggle}
          loading={busyKey === `toggle-${item.id}`}
          className="bg-amber-50 text-amber-700"
        />
        <ActionButton
          label="Sil"
          icon={<Trash2 size={15} />}
          onClick={onDelete}
          loading={busyKey === `delete-${item.id}`}
          className="bg-rose-50 text-rose-700"
        />
      </div>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <Eye className="mx-auto text-[#1557D6]" size={18} />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black leading-none text-[#172033]">{value}</p>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 break-words text-[11px] font-black text-[#172033]">
        {value || "-"}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  className,
  loading,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex min-h-[40px] items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-black disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={15} /> : icon}
      {loading ? "..." : label}
    </button>
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
      <section className="max-h-[90dvh] w-full max-w-[620px] overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="line-clamp-2 break-words text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
