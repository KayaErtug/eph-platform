"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Role =
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | "ADMIN"
  | "SUPER_ADMIN";

type ReferralUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  isApproved: boolean;
  referralCode: string | null;
  createdAt: string;
};

type ReferralCandidate = {
  id: string;
  referralCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  usedAt: string | null;
  createdAt: string;
};

const ROLE_LABELS: Record<Role, string> = {
  EMLAKCI: "Gayrimenkul Danışmanı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "EMLAKCI" as Role,
};

export default function AdminReferralsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<ReferralUser[]>([]);
  const [candidates, setCandidates] = useState<ReferralCandidate[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setHydrated(true);
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

    fetchReferrals();
  }, [hydrated, user, router]);

  const fetchReferrals = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/admin/referrals");
      setUsers(res.data.users || []);
      setCandidates(res.data.candidates || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Referans kodları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const createReferral = async () => {
    setError("");
    setSuccess("");

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      setError("Ad, soyad, e-posta ve telefon zorunludur.");
      return;
    }

    setCreating(true);

    try {
      const res = await api.post("/admin/referrals", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      });

      setSuccess(`Referans kodu oluşturuldu: ${res.data.referralCode}`);
      setForm(EMPTY_FORM);
      await fetchReferrals();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Referans kodu oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const deactivateCandidate = async (id: string) => {
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/referrals/${id}/deactivate`);
      setSuccess("Referans kodu pasifleştirildi.");
      await fetchReferrals();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Referans kodu pasifleştirilemedi.");
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      setError("Kod kopyalanamadı.");
    }
  };

  const activeCandidates = useMemo(
    () => candidates.filter((item) => item.isActive && !item.usedAt).length,
    [candidates],
  );

  const usedCandidates = useMemo(
    () => candidates.filter((item) => Boolean(item.usedAt)).length,
    [candidates],
  );

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(201,168,76,0.16),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(37,99,235,0.20),transparent_38%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:44px_44px]" />

      <header className="sticky top-0 z-50 border-b border-cyan-300/15 bg-[#020617]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 text-cyan-100 transition hover:border-[#C9A84C] hover:text-[#F7DFA3]"
            >
              <ArrowLeft size={18} />
            </button>

            <Link href="/admin" className="flex items-center gap-3 no-underline">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-xl" />
                <img
                  src="/LOGO_EPH.png"
                  alt="EPH"
                  className="relative h-11 w-11 object-contain"
                />
              </div>

              <div>
                <div className="font-serif text-xl font-semibold text-white">
                  EPH Referans Kodları
                </div>

                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">
                  Admin Özel Davet Sistemi
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 no-underline transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
            >
              Ana Merkez
            </Link>

            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 no-underline transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
            >
              Admin
            </Link>

            <Link
              href="/admin/referrals"
              className="rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2 text-xs font-black text-[#F7DFA3] no-underline"
            >
              Referans Kodları
            </Link>

            <button
              onClick={() => {
                logout();
                router.push("/giris");
              }}
              className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200 transition hover:bg-rose-500/20"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8 pb-24">
        <section className="relative overflow-hidden rounded-[44px] border border-cyan-300/20 bg-[#061126]/90 p-6 shadow-2xl shadow-cyan-950/50 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(201,168,76,0.20),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(29,78,216,0.26),transparent_38%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                  <KeyRound size={14} />
                  Referans Yönetimi
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Sistem Aktif
                </span>
              </div>

              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
                Referans
                <span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">
                  Kod Merkezi
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
                Admin buradan mevcut üyelerin kişisel referans kodlarını görür,
                özel davetli adaylar için referans kodu oluşturur ve referanslı
                kayıt akışını yönetir.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MetricCard title="Üye Ref Kodları" value={users.length} />
                <MetricCard title="Aktif Özel Kod" value={activeCandidates} />
                <MetricCard title="Kullanılmış Kod" value={usedCandidates} />
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                    Yeni Özel Davetli
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    Referans Kodu Oluştur
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#F7DFA3]">
                  <UserPlus size={24} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Ad"
                  value={form.firstName}
                  onChange={(value) => setForm({ ...form, firstName: value })}
                />

                <Input
                  label="Soyad"
                  value={form.lastName}
                  onChange={(value) => setForm({ ...form, lastName: value })}
                />

                <Input
                  label="E-posta"
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                />

                <Input
                  label="Telefon"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                />

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Rol
                  </span>

                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm({ ...form, role: event.target.value as Role })
                    }
                    className="h-12 w-full rounded-2xl border border-cyan-300/15 bg-[#08172D] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="EMLAKCI">Gayrimenkul Danışmanı</option>
                    <option value="MUTEAHHIT">Müteahhit</option>
                    <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                  </select>
                </label>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm font-black text-rose-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-black text-emerald-100">
                  {success}
                </div>
              )}

              <button
                onClick={createReferral}
                disabled={creating}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C9A84C] px-5 text-sm font-black text-[#061126] shadow-xl shadow-[#C9A84C]/20 transition hover:scale-[1.02] disabled:opacity-50"
              >
                {creating ? (
                  <RefreshCw className="animate-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                {creating ? "Oluşturuluyor..." : "Referans Kodu Oluştur"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel
            title="Özel Davetli Referans Kodları"
            subtitle="Admin tarafından özel olarak oluşturulan referans kodları."
          >
            {candidates.length === 0 ? (
              <EmptyState text="Henüz özel davetli referans kodu oluşturulmadı." />
            ) : (
              <div className="grid gap-3">
                {candidates.map((item) => (
                  <CandidateRow
                    key={item.id}
                    item={item}
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                    onDeactivate={deactivateCandidate}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Üye Kişisel Ref Kodları"
            subtitle="Platform üyelerinin kendi kişisel referans kodları."
          >
            {users.length === 0 ? (
              <EmptyState text="Kayıtlı kullanıcı bulunamadı." />
            ) : (
              <div className="grid gap-3">
                {users.map((item) => (
                  <UserRow
                    key={item.id}
                    item={item}
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                  />
                ))}
              </div>
            )}
          </Panel>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-cyan-300/15 bg-white/[0.07] p-4 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-cyan-300/15 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
      />
    </label>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-cyan-300/15 bg-[#061126]/85 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9A84C]">
          Referans Listesi
        </p>

        <h2 className="mt-2 font-serif text-3xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
          {subtitle}
        </p>
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-cyan-300/20 bg-white/[0.04] p-8 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}

function CandidateRow({
  item,
  copiedCode,
  onCopy,
  onDeactivate,
}: {
  item: ReferralCandidate;
  copiedCode: string;
  onCopy: (code: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const isUsed = Boolean(item.usedAt);

  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={item.isActive} used={isUsed} />
            <RoleBadge role={item.role} />
          </div>

          <h3 className="mt-3 text-lg font-black text-white">
            {item.firstName} {item.lastName}
          </h3>

          <p className="mt-1 text-xs font-bold text-slate-400">
            {item.email} · {item.phone}
          </p>
        </div>

        <CodeBox
          code={item.referralCode}
          copiedCode={copiedCode}
          onCopy={onCopy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.isActive && !isUsed && (
          <button
            onClick={() => onDeactivate(item.id)}
            className="rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-100"
          >
            Pasifleştir
          </button>
        )}
      </div>
    </article>
  );
}

function UserRow({
  item,
  copiedCode,
  onCopy,
}: {
  item: ReferralUser;
  copiedCode: string;
  onCopy: (code: string) => void;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                item.isApproved
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : "border-amber-300/25 bg-amber-400/10 text-amber-100"
              }`}
            >
              {item.isApproved ? <CheckCircle2 size={13} /> : <Lock size={13} />}
              {item.isApproved ? "Aktif Üye" : "Onay Bekliyor"}
            </span>

            <RoleBadge role={item.role} />
          </div>

          <h3 className="mt-3 text-lg font-black text-white">
            {item.firstName} {item.lastName}
          </h3>

          <p className="mt-1 text-xs font-bold text-slate-400">
            {item.email} · {item.phone}
          </p>
        </div>

        {item.referralCode ? (
          <CodeBox
            code={item.referralCode}
            copiedCode={copiedCode}
            onCopy={onCopy}
          />
        ) : (
          <span className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs font-black text-rose-100">
            Ref kod yok
          </span>
        )}
      </div>
    </article>
  );
}

function CodeBox({
  code,
  copiedCode,
  onCopy,
}: {
  code: string;
  copiedCode: string;
  onCopy: (code: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[22px] border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-4 py-3">
      <KeyRound size={16} className="text-[#F7DFA3]" />

      <span className="font-mono text-sm font-black tracking-wider text-[#F7DFA3]">
        {code}
      </span>

      <button
        onClick={() => onCopy(code)}
        className="ml-1 rounded-xl border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        {copiedCode === code ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function StatusBadge({ active, used }: { active: boolean; used: boolean }) {
  if (used) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/20 bg-slate-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
        <CheckCircle2 size={13} />
        Kullanıldı
      </span>
    );
  }

  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
        <ShieldCheck size={13} />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-100">
      <XCircle size={13} />
      Pasif
    </span>
  );
}
