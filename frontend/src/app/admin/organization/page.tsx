"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type Capability = "TEAM_LEADER" | "OFFICE_OWNER";

type OrgUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  role?: string | null;
  isApproved?: boolean;
  officeId?: string | null;
  office?: { id: string; name: string } | null;
  capabilities?: { capability: Capability | string }[];
  teamMemberships?: {
    id: string;
    team?: { id: string; name: string; officeId?: string | null } | null;
  }[];
};

type Office = {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  district?: string | null;
  ownerUserId?: string | null;
  isActive?: boolean;
  owner?: OrgUser | null;
  teams?: {
    id: string;
    name: string;
    leaderId?: string | null;
    _count?: { members?: number };
  }[];
  _count?: { users?: number; teams?: number };
};

type Team = {
  id: string;
  officeId: string;
  name: string;
  leaderId?: string | null;
  isActive?: boolean;
  office?: { id: string; name: string; city?: string | null; district?: string | null } | null;
  leader?: OrgUser | null;
  members?: {
    id: string;
    joinedAt?: string;
    user: OrgUser;
  }[];
  _count?: { members?: number };
};

type Summary = {
  officeCount?: number;
  activeOfficeCount?: number;
  teamCount?: number;
  activeTeamCount?: number;
  memberCount?: number;
};

const EMPTY_OFFICE = {
  name: "",
  city: "",
  district: "",
  ownerUserId: "",
};

const EMPTY_TEAM = {
  officeId: "",
  name: "",
  leaderId: "",
};

function fullName(user?: OrgUser | null) {
  if (!user) return "Seçilmedi";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "Kullanıcı";
}

function initials(user?: OrgUser | null) {
  if (!user) return "EP";
  const first = String(user.firstName || "").trim().charAt(0);
  const last = String(user.lastName || "").trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "EP";
}

function hasCapability(user: OrgUser | null | undefined, capability: Capability) {
  return Boolean((user?.capabilities || []).some((item) => item.capability === capability));
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export default function AdminOrganizationPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const currentRole = String(user?.role || "").toUpperCase();
  const canAccess = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");

  const [officeOpen, setOfficeOpen] = useState(false);
  const [officeForm, setOfficeForm] = useState(EMPTY_OFFICE);

  const [teamOpen, setTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM);

  const [leaderTeam, setLeaderTeam] = useState<Team | null>(null);
  const [nextLeaderId, setNextLeaderId] = useState("");

  const [memberTeam, setMemberTeam] = useState<Team | null>(null);
  const [nextMemberId, setNextMemberId] = useState("");

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

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id, user?.role]);

  async function loadAll() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [summaryRes, officesRes, teamsRes, usersRes] = await Promise.all([
        api.get(`/organization/summary?t=${Date.now()}`),
        api.get(`/organization/offices?t=${Date.now()}`),
        api.get(`/organization/teams?t=${Date.now()}`),
        api.get(`/organization/users?t=${Date.now()}`),
      ]);

      setSummary(summaryRes.data || null);
      setOffices(Array.isArray(officesRes.data) ? officesRes.data : []);
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Organizasyon verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const filteredOffices = useMemo(() => {
    const q = normalize(query);
    return offices.filter((office) => {
      const text = normalize([office.name, office.city, office.district, fullName(office.owner)].join(" "));
      return !q || text.includes(q);
    });
  }, [offices, query]);

  const filteredTeams = useMemo(() => {
    const q = normalize(query);
    return teams.filter((team) => {
      const text = normalize([team.name, team.office?.name, fullName(team.leader)].join(" "));
      return !q || text.includes(q);
    });
  }, [teams, query]);

  const officeOwnerCandidates = useMemo(() => {
    return users.filter((item) => String(item.role || "").toUpperCase() === "EMLAKCI");
  }, [users]);

  const teamLeaderCandidates = useMemo(() => {
    return users.filter((item) => String(item.role || "").toUpperCase() === "EMLAKCI");
  }, [users]);

  async function createOffice() {
    if (!officeForm.name.trim()) {
      setError("Ofis adı zorunludur.");
      return;
    }

    setBusyKey("office-create");
    setError("");
    setSuccess("");

    try {
      await api.post("/organization/offices", {
        name: officeForm.name.trim(),
        city: officeForm.city.trim() || null,
        district: officeForm.district.trim() || null,
        ownerUserId: officeForm.ownerUserId || null,
      });

      setSuccess("Ofis oluşturuldu.");
      setOfficeOpen(false);
      setOfficeForm(EMPTY_OFFICE);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Ofis oluşturulamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function createTeam() {
    if (!teamForm.officeId) {
      setError("Ofis seçimi zorunludur.");
      return;
    }

    if (!teamForm.name.trim()) {
      setError("Takım adı zorunludur.");
      return;
    }

    setBusyKey("team-create");
    setError("");
    setSuccess("");

    try {
      await api.post("/organization/teams", {
        officeId: teamForm.officeId,
        name: teamForm.name.trim(),
        leaderId: teamForm.leaderId || null,
      });

      setSuccess("Takım oluşturuldu.");
      setTeamOpen(false);
      setTeamForm(EMPTY_TEAM);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Takım oluşturulamadı.");
    } finally {
      setBusyKey("");
    }
  }

  async function saveLeader() {
    if (!leaderTeam) return;

    setBusyKey(`leader-${leaderTeam.id}`);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/organization/teams/${leaderTeam.id}/leader`, {
        leaderId: nextLeaderId || null,
      });

      setSuccess("Takım lideri güncellendi.");
      setLeaderTeam(null);
      setNextLeaderId("");
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Takım lideri güncellenemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function addMember() {
    if (!memberTeam) return;

    if (!nextMemberId) {
      setError("Üye seçimi zorunludur.");
      return;
    }

    setBusyKey(`member-${memberTeam.id}`);
    setError("");
    setSuccess("");

    try {
      await api.post(`/organization/teams/${memberTeam.id}/members`, {
        userId: nextMemberId,
      });

      setSuccess("Takım üyesi güncellendi.");
      setMemberTeam(null);
      setNextMemberId("");
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Takım üyesi eklenemedi.");
    } finally {
      setBusyKey("");
    }
  }

  async function removeMember(team: Team, target: OrgUser) {
    const confirmed = window.confirm(`${fullName(target)} takımdan çıkarılacak. Emin misiniz?`);
    if (!confirmed) return;

    setBusyKey(`remove-${team.id}-${target.id}`);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/organization/teams/${team.id}/members/${target.id}`);
      setSuccess("Kullanıcı takımdan çıkarıldı.");
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kullanıcı takımdan çıkarılamadı.");
    } finally {
      setBusyKey("");
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] text-[#1F2937]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Organizasyon Yönetimi
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(88px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <header className="sticky top-0 z-40 border-b border-[#C7D6E8] bg-white/95 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
              aria-label="Admin paneline dön"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-black tracking-[-0.04em] text-[#1F2937]">
                Organizasyon Yönetimi
              </h1>
              <p className="truncate text-[12px] font-bold text-slate-500">
                Ofis, takım, lider ve üye yönetimi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
            aria-label="Yenile"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 lg:px-6">
        <AdminFlagBanner className="rounded-[8px]" />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <MetricCard label="Ofis" value={summary?.officeCount || 0} sub="Toplam" icon={<Building2 size={19} />} tone="blue" />
          <MetricCard label="Aktif Ofis" value={summary?.activeOfficeCount || 0} sub="Aktif" icon={<CheckCircle2 size={19} />} tone="green" />
          <MetricCard label="Takım" value={summary?.teamCount || 0} sub="Toplam" icon={<UsersRound size={19} />} tone="purple" />
          <MetricCard label="Aktif Takım" value={summary?.activeTeamCount || 0} sub="Aktif" icon={<ShieldCheck size={19} />} tone="orange" />
          <MetricCard label="Üye" value={summary?.memberCount || 0} sub="Aktif" icon={<UserPlus size={19} />} tone="gray" centeredLast />
        </section>

        <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_160px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ofis, takım, lider veya şehir ara..."
                className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] pl-10 pr-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB] md:text-left"
              />
            </label>

            <button
              type="button"
              onClick={() => setOfficeOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-3 text-[13px] font-black text-white"
            >
              <Plus size={17} />
              Ofis Oluştur
            </button>

            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1F2937] px-3 text-[13px] font-black text-white"
            >
              <Plus size={17} />
              Takım Oluştur
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center text-[13px] font-black text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-[13px] font-black text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <Panel title="Ofisler" actionText={`${filteredOffices.length} kayıt`}>
            <div className="space-y-2">
              {filteredOffices.length ? (
                filteredOffices.map((office) => (
                  <article key={office.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <Building2 size={23} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-black text-[#1F2937]">{office.name}</h3>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                            {office.isActive === false ? "PASİF" : "AKTİF"}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-slate-500">
                          {[office.city, office.district].filter(Boolean).join(" / ") || "Konum girilmedi"}
                        </p>
                        <p className="mt-1 text-[12px] font-bold text-slate-600">
                          Ofis Sahibi: {fullName(office.owner)}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <MiniStat label="Takım" value={office._count?.teams || office.teams?.length || 0} />
                          <MiniStat label="Üye" value={office._count?.users || 0} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState text="Henüz ofis oluşturulmadı." />
              )}
            </div>
          </Panel>

          <Panel title="Takımlar" actionText={`${filteredTeams.length} kayıt`}>
            <div className="space-y-2">
              {filteredTeams.length ? (
                filteredTeams.map((team) => (
                  <article key={team.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                        <UsersRound size={23} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-[15px] font-black text-[#1F2937]">{team.name}</h3>
                            <p className="mt-1 text-[12px] font-bold text-slate-500">
                              {team.office?.name || "Ofis yok"}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                            {team._count?.members || team.members?.length || 0}/10 Üye
                          </span>
                        </div>

                        <div className="mt-3 rounded-2xl border border-[#C7D6E8] bg-white p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-[12px] font-black text-yellow-700">
                              {initials(team.leader)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-black text-[#1F2937]">
                                Lider: {fullName(team.leader)}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500">
                                {team.leader ? "TEAM_LEADER yetkisi otomatik yönetilir" : "Lider atanmadı"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLeaderTeam(team);
                              setNextLeaderId(team.leaderId || "");
                            }}
                            className="min-h-[38px] rounded-2xl border border-[#2563EB] bg-white px-3 text-[12px] font-black text-[#2563EB]"
                          >
                            Lider Ata
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMemberTeam(team);
                              setNextMemberId("");
                            }}
                            className="min-h-[38px] rounded-2xl bg-[#2563EB] px-3 text-[12px] font-black text-white"
                          >
                            Üye Ekle / Taşı
                          </button>
                        </div>

                        {team.members?.length ? (
                          <div className="mt-3 space-y-2">
                            {team.members.map((member) => (
                              <div key={member.id} className="grid grid-cols-[34px_1fr_34px] items-center gap-2 rounded-2xl bg-white p-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700">
                                  {initials(member.user)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[12px] font-black text-[#1F2937]">
                                    {fullName(member.user)}
                                    {hasCapability(member.user, "TEAM_LEADER") ? " • Lider" : ""}
                                  </span>
                                  <span className="block truncate text-[11px] font-bold text-slate-500">
                                    {member.user.email}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeMember(team, member.user)}
                                  disabled={busyKey === `remove-${team.id}-${member.user.id}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 disabled:opacity-60"
                                  aria-label="Takımdan çıkar"
                                >
                                  {busyKey === `remove-${team.id}-${member.user.id}` ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState text="Henüz takım oluşturulmadı." />
              )}
            </div>
          </Panel>
        </section>
      </section>

      {officeOpen ? (
        <Modal title="Ofis Oluştur" onClose={() => setOfficeOpen(false)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Ofis Adı" value={officeForm.name} onChange={(value) => setOfficeForm({ ...officeForm, name: value })} />
            <Input label="Şehir" value={officeForm.city} onChange={(value) => setOfficeForm({ ...officeForm, city: value })} />
            <Input label="İlçe" value={officeForm.district} onChange={(value) => setOfficeForm({ ...officeForm, district: value })} />
            <Select
              label="Ofis Sahibi"
              value={officeForm.ownerUserId}
              onChange={(value) => setOfficeForm({ ...officeForm, ownerUserId: value })}
              options={officeOwnerCandidates.map((item) => ({ value: item.id, label: `${fullName(item)} • ${item.email}` }))}
              placeholder="Sonra atanacak"
            />
          </div>
          <button
            type="button"
            onClick={createOffice}
            disabled={busyKey === "office-create"}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === "office-create" ? <Loader2 className="animate-spin" size={18} /> : <Building2 size={18} />}
            Ofisi Kaydet
          </button>
        </Modal>
      ) : null}

      {teamOpen ? (
        <Modal title="Takım Oluştur" onClose={() => setTeamOpen(false)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              label="Ofis"
              value={teamForm.officeId}
              onChange={(value) => setTeamForm({ ...teamForm, officeId: value })}
              options={offices.filter((office) => office.isActive !== false).map((office) => ({ value: office.id, label: office.name }))}
              placeholder="Ofis seç"
            />
            <Input label="Takım Adı" value={teamForm.name} onChange={(value) => setTeamForm({ ...teamForm, name: value })} />
            <Select
              label="Takım Lideri"
              value={teamForm.leaderId}
              onChange={(value) => setTeamForm({ ...teamForm, leaderId: value })}
              options={teamLeaderCandidates.map((item) => ({ value: item.id, label: `${fullName(item)} • ${item.email}` }))}
              placeholder="Sonra atanacak"
            />
          </div>
          <button
            type="button"
            onClick={createTeam}
            disabled={busyKey === "team-create"}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F2937] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === "team-create" ? <Loader2 className="animate-spin" size={18} /> : <UsersRound size={18} />}
            Takımı Kaydet
          </button>
        </Modal>
      ) : null}

      {leaderTeam ? (
        <Modal title="Takım Lideri Ata" onClose={() => setLeaderTeam(null)}>
          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-center">
            <p className="text-[15px] font-black text-[#1F2937]">{leaderTeam.name}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-500">{leaderTeam.office?.name || "Ofis yok"}</p>
          </div>
          <div className="mt-3">
            <Select
              label="Yeni Lider"
              value={nextLeaderId}
              onChange={setNextLeaderId}
              options={teamLeaderCandidates.map((item) => ({ value: item.id, label: `${fullName(item)} • ${item.email}` }))}
              placeholder="Lideri kaldır"
            />
          </div>
          <button
            type="button"
            onClick={saveLeader}
            disabled={busyKey === `leader-${leaderTeam.id}`}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === `leader-${leaderTeam.id}` ? <Loader2 className="animate-spin" size={18} /> : <Crown size={18} />}
            Lideri Kaydet
          </button>
        </Modal>
      ) : null}

      {memberTeam ? (
        <Modal title="Takım Üyesi Ekle / Taşı" onClose={() => setMemberTeam(null)}>
          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-center">
            <p className="text-[15px] font-black text-[#1F2937]">{memberTeam.name}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-500">
              Bir kullanıcı aynı anda sadece 1 aktif takımda bulunabilir.
            </p>
          </div>
          <div className="mt-3">
            <Select
              label="Kullanıcı"
              value={nextMemberId}
              onChange={setNextMemberId}
              options={users.map((item) => ({ value: item.id, label: `${fullName(item)} • ${item.email}` }))}
              placeholder="Üye seç"
            />
          </div>
          <button
            type="button"
            onClick={addMember}
            disabled={busyKey === `member-${memberTeam.id}`}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[14px] font-black text-white disabled:opacity-60"
          >
            {busyKey === `member-${memberTeam.id}` ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
            Üyeyi Kaydet
          </button>
        </Modal>
      ) : null}
    </main>
  );
}

function Panel({ title, actionText, children }: { title: string; actionText?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-black text-[#1F2937]">{title}</h2>
        {actionText ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{actionText}</span> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, sub, icon, tone, centeredLast }: { label: string; value: number | string; sub: string; icon: ReactNode; tone: "blue" | "green" | "purple" | "orange" | "gray"; centeredLast?: boolean }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-slate-50 text-slate-700",
  };

  return (
    <div className={`min-h-[96px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm ${centeredLast ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""}`}>
      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
      <p className="mt-2 text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-[22px] font-black text-[#1F2937]">{value}</p>
      <p className="text-[11px] font-bold text-slate-500">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C7D6E8] bg-white p-2 text-center">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="text-[16px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-6 text-center">
      <Building2 className="mx-auto text-slate-400" size={34} />
      <p className="mt-3 text-[13px] font-black text-slate-600">{text}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section className="w-full max-w-[520px] rounded-[28px] border border-[#C7D6E8] bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-center text-[19px] font-black text-[#1F2937]">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <label>
      <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}
