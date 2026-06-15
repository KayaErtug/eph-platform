"use client";

import { Loader2, Power, Save, UsersRound, X } from "lucide-react";

type OrgUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role?: string | null;
};

type Team = {
  id: string;
  officeId: string;
  name: string;
  leaderId?: string | null;
  isActive?: boolean;
  office?: { id: string; name: string } | null;
  leader?: OrgUser | null;
  _count?: { members?: number };
};

type TeamForm = {
  name: string;
  leaderId: string;
};

type TeamEditModalProps = {
  team: Team;
  form: TeamForm;
  users: OrgUser[];
  busyKey: string;
  onChange: (form: TeamForm) => void;
  onClose: () => void;
  onSave: () => void;
  onToggleActive: () => void;
};

function fullName(user?: OrgUser | null) {
  if (!user) return "Seçilmedi";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "Kullanıcı";
}

export default function TeamEditModal({
  team,
  form,
  users,
  busyKey,
  onChange,
  onClose,
  onSave,
  onToggleActive,
}: TeamEditModalProps) {
  const leaderCandidates = users.filter((item) => String(item.role || "").toUpperCase() === "EMLAKCI");
  const isActive = team.isActive !== false;
  const saveBusy = busyKey === `team-save-${team.id}`;
  const toggleBusy = busyKey === `team-toggle-${team.id}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section className="max-h-[90dvh] w-full max-w-[540px] overflow-y-auto rounded-[28px] border border-[#C7D6E8] bg-white p-4 shadow-2xl [-webkit-overflow-scrolling:touch]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-center text-[19px] font-black text-[#1F2937]">
            Takım Düzenle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <UsersRound size={22} />
          </div>
          <p className="mt-2 text-[15px] font-black text-[#1F2937]">{team.name}</p>
          <p className="mt-1 text-[12px] font-bold text-slate-500">
            {team.office?.name || "Ofis yok"} • {isActive ? "Aktif" : "Pasif"} •{" "}
            {team._count?.members || 0}/10 Üye
          </p>
        </div>

        <div className="mt-3 grid gap-2">
          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Takım Adı
            </span>
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            />
          </label>

          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Takım Lideri
            </span>
            <select
              value={form.leaderId}
              onChange={(event) => onChange({ ...form, leaderId: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            >
              <option value="">Lideri kaldır</option>
              {leaderCandidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {fullName(item)} • {item.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saveBusy || toggleBusy}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[14px] font-black text-white disabled:opacity-60"
          >
            {saveBusy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Kaydet
          </button>

          <button
            type="button"
            onClick={onToggleActive}
            disabled={saveBusy || toggleBusy}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-[14px] font-black disabled:opacity-60 ${
              isActive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {toggleBusy ? <Loader2 className="animate-spin" size={18} /> : <Power size={18} />}
            {isActive ? "Pasife Al" : "Aktife Al"}
          </button>
        </div>
      </section>
    </div>
  );
}