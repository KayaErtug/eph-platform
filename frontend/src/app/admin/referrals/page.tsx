"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
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
import { normalizePhoneForSystem } from "@/schemas/auth.schema";
import { useAuthStore } from "@/store/auth.store";

type Role =
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | "MODERATOR"
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
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

const EXPIRE_OPTIONS = [
  { label: "1 Gün", value: 1 },
  { label: "3 Gün", value: 3 },
  { label: "7 Gün", value: 7 },
  { label: "10 Gün", value: 10 },
  { label: "15 Gün", value: 15 },
  { label: "30 Gün", value: 30 },
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "EMLAKCI" as Role,
  expiresInDays: 7,
};

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLocaleUpperCase("tr-TR");
}

function isSoftwareTeamRole(value?: string | null) {
  const role = normalizeRole(value);
  return role === "SUPER_ADMIN" || role === "YAZILIM EKIBI" || role === "YAZILIM EKİBİ";
}

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

    const normalizedPhone = normalizePhoneForSystem(form.phone);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !normalizedPhone.trim()) {
      setError("Ad, soyad, e-posta ve telefon zorunludur.");
      return;
    }

    if (!/^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(normalizedPhone)) {
      setError("Telefon numarası +90 532 282 88 75 formatına uygun olmalıdır.");
      return;
    }

    setCreating(true);

    try {
      const res = await api.post("/admin/referrals", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: normalizedPhone,
        role: form.role,
        expiresInDays: form.expiresInDays,
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

  const deleteCandidate = async (id: string, code: string) => {
    setError("");
    setSuccess("");

    if (!isSoftwareTeamRole(user?.role)) {
      setError("Referans kodu silme yetkisi sadece Yazılım Ekibi'ndedir.");
      return;
    }

    if (!confirm(`${code} referans kodu kalıcı olarak silinecek. Emin misiniz?`)) {
      return;
    }

    try {
      await api.delete(`/admin/referrals/${id}`);
      setSuccess("Referans kodu silindi.");
      await fetchReferrals();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Referans kodu silinemedi.");
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

  const activeCandidates = useMemo(() => candidates.filter((item) => item.isActive && !item.usedAt).length, [candidates]);
  const usedCandidates = useMemo(() => candidates.filter((item) => Boolean(item.usedAt)).length, [candidates]);

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF] text-[#1557D6]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] text-[#06194A]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-center gap-3 text-center lg:justify-start lg:text-left">
            <button
              onClick={() => router.push("/admin")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-sm transition hover:bg-[#EFF6FF]"
            >
              <ArrowLeft size={18} />
            </button>

            <Link href="/admin" className="flex items-center gap-3 no-underline">
              <img src="/LOGO_EPH.png" alt="EPH" className="h-11 w-11 rounded-2xl object-contain shadow-sm" />

              <div>
                <div className="text-xl font-black text-[#06194A]">EPH Referans Kodları</div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#1557D6]">
                  Admin Özel Davet Sistemi
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/dashboard" className="rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black text-[#27364F] no-underline shadow-sm">
              Ana Merkez
            </Link>
            <Link href="/admin" className="rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black text-[#27364F] no-underline shadow-sm">
              Admin
            </Link>
            <Link href="/admin/referrals" className="rounded-full border border-[#1557D6]/25 bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#1557D6] no-underline shadow-sm">
              Referans Kodları
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/giris");
              }}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 pb-24">
        <section className="rounded-[36px] border border-[#DDE7F3] bg-white p-5 shadow-xl shadow-slate-200/70 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-[#DDE7F3] bg-[#F8FBFF] p-6 text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#1557D6]/20 bg-[#EFF6FF] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#1557D6]">
                <KeyRound size={14} />
                Referans Yönetimi
              </div>

              <h1 className="text-4xl font-black leading-tight text-[#06194A]">
                Referans
                <span className="block text-[#1557D6]">Kod Merkezi</span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-7 text-[#475569]">
                Özel davetli adaylar için referans kodu oluşturun, geçerlilik süresini belirleyin ve referanslı kayıt akışını yönetin.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MetricCard title="Üye Ref Kodları" value={users.length} />
                <MetricCard title="Aktif Özel Kod" value={activeCandidates} />
                <MetricCard title="Kullanılmış Kod" value={usedCandidates} />
              </div>
            </div>

            <div className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#1557D6]">Yeni Özel Davetli</p>
                  <h2 className="mt-2 text-2xl font-black text-[#06194A]">Referans Kodu Oluştur</h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#DDE7F3] bg-[#EFF6FF] text-[#1557D6]">
                  <UserPlus size={24} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Input label="Ad" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
                <Input label="Soyad" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
                <Input label="E-posta" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Input label="Telefon" value={form.phone} onChange={(value) => setForm({ ...form, phone: normalizePhoneForSystem(value) })} placeholder="+90 532 282 88 75" />

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">Rol</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                    className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-white px-4 text-center text-sm font-bold text-[#06194A] outline-none focus:border-[#1557D6]"
                  >
                    <option value="EMLAKCI">Gayrimenkul Danışmanı</option>
                    <option value="MUTEAHHIT">Müteahhit</option>
                    <option value="INSAAT_FIRMASI">İnşaat Firması</option>
                    <option value="MODERATOR">Moderatör</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Yazılım Ekibi</option>
                  </select>
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 flex items-center justify-center gap-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                    <CalendarClock size={14} />
                    Geçerlilik Süresi
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPIRE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, expiresInDays: option.value })}
                        className={`h-11 rounded-2xl border px-2 text-xs font-black transition ${
                          form.expiresInDays === option.value
                            ? "border-[#1557D6] bg-[#1557D6] text-white"
                            : "border-[#DDE7F3] bg-[#F8FBFF] text-[#27364F]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-black text-rose-600">{error}</div>}
              {success && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-black text-emerald-700">{success}</div>}

              <button
                onClick={createReferral}
                disabled={creating}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-5 text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:bg-[#0F49BD] disabled:opacity-50"
              >
                {creating ? <RefreshCw className="animate-spin" size={17} /> : <Plus size={17} />}
                {creating ? "Oluşturuluyor..." : "Referans Kodu Oluştur"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Özel Davetli Referans Kodları" subtitle="Admin tarafından özel olarak oluşturulan referans kodları.">
            {candidates.length === 0 ? (
              <EmptyState text="Henüz özel davetli referans kodu oluşturulmadı." />
            ) : (
              <div className="grid gap-3">
                {candidates.map((item) => (
                  <CandidateRow key={item.id} item={item} copiedCode={copiedCode} onCopy={copyCode} onDeactivate={deactivateCandidate} onDelete={deleteCandidate} canDelete={isSoftwareTeamRole(user?.role)} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Üye Kişisel Ref Kodları" subtitle="Platform üyelerinin kendi kişisel referans kodları.">
            {users.length === 0 ? (
              <EmptyState text="Kayıtlı kullanıcı bulunamadı." />
            ) : (
              <div className="grid gap-3">
                {users.map((item) => (
                  <UserRow key={item.id} item={item} copiedCode={copiedCode} onCopy={copyCode} />
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
    <div className="rounded-[24px] border border-[#DDE7F3] bg-white p-4 text-center shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#64748B]">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#1557D6]">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#DDE7F3] bg-white px-4 text-center text-sm font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8] focus:border-[#1557D6]"
      />
    </label>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="mb-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#1557D6]">Referans Listesi</p>
        <h2 className="mt-2 text-3xl font-black text-[#06194A]">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F8FBFF] p-8 text-center text-sm font-bold text-[#64748B]">{text}</div>
  );
}

function CandidateRow({ item, copiedCode, onCopy, onDeactivate, onDelete, canDelete }: { item: ReferralCandidate; copiedCode: string; onCopy: (code: string) => void; onDeactivate: (id: string) => void; onDelete: (id: string, code: string) => void; canDelete: boolean }) {
  const isUsed = Boolean(item.usedAt);

  return (
    <article className="rounded-[24px] border border-[#DDE7F3] bg-[#F8FBFF] p-4 text-center">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge active={item.isActive} used={isUsed} />
            <RoleBadge role={item.role} />
          </div>
          <h3 className="mt-3 text-lg font-black text-[#06194A]">{item.firstName} {item.lastName}</h3>
          <p className="mt-1 text-xs font-bold text-[#64748B]">{item.email} · {item.phone}</p>
        </div>

        <CodeBox code={item.referralCode} copiedCode={copiedCode} onCopy={onCopy} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {isUsed ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">Kullanılmış Kod</span>
        ) : item.isActive ? (
          <button onClick={() => onDeactivate(item.id)} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">Pasifleştir</button>
        ) : (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-600">Pasif Kod</span>
        )}

        {canDelete && (
          <button onClick={() => onDelete(item.id, item.referralCode)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-600">Sil</button>
        )}
      </div>
    </article>
  );
}

function UserRow({ item, copiedCode, onCopy }: { item: ReferralUser; copiedCode: string; onCopy: (code: string) => void }) {
  return (
    <article className="rounded-[24px] border border-[#DDE7F3] bg-[#F8FBFF] p-4 text-center">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.isApproved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {item.isApproved ? <CheckCircle2 size={13} /> : <Lock size={13} />}
              {item.isApproved ? "Aktif Üye" : "Onay Bekliyor"}
            </span>
            <RoleBadge role={item.role} />
          </div>

          <h3 className="mt-3 text-lg font-black text-[#06194A]">{item.firstName} {item.lastName}</h3>
          <p className="mt-1 text-xs font-bold text-[#64748B]">{item.email} · {item.phone}</p>
        </div>

        {item.referralCode ? (
          <CodeBox code={item.referralCode} copiedCode={copiedCode} onCopy={onCopy} />
        ) : (
          <span className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-600">Ref kod yok</span>
        )}
      </div>
    </article>
  );
}

function CodeBox({ code, copiedCode, onCopy }: { code: string; copiedCode: string; onCopy: (code: string) => void }) {
  return (
    <div className="mx-auto grid min-w-[260px] gap-2 rounded-[22px] border border-[#DDE7F3] bg-white px-4 py-3 text-center shadow-sm">
      <div className="font-mono text-sm font-black tracking-wider text-[#06194A]">{code}</div>
      <button onClick={() => onCopy(code)} className="mx-auto inline-flex min-h-9 items-center justify-center rounded-xl border border-[#1557D6]/20 bg-[#EFF6FF] px-3 py-2 text-[11px] font-black text-[#1557D6] transition hover:bg-[#DBEAFE]">
        {copiedCode === code ? "KOPYALANDI ✓" : "KOPYALA"}
      </button>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full border border-[#1557D6]/20 bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6]">{ROLE_LABELS[role] || role}</span>
  );
}

function StatusBadge({ active, used }: { active: boolean; used: boolean }) {
  if (used) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600"><CheckCircle2 size={13} />Kullanıldı</span>;
  }

  if (active) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700"><ShieldCheck size={13} />Aktif</span>;
  }

  return <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600"><XCircle size={13} />Pasif</span>;
}
