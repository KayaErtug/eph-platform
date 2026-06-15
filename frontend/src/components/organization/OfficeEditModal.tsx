"use client";

import { Loader2, Power, Save, X } from "lucide-react";

type Capability = "TEAM_LEADER" | "OFFICE_OWNER";

type OrgUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role?: string | null;
  capabilities?: { capability: Capability | string }[];
};

type Office = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  ownerUserId?: string | null;
  isActive?: boolean;
  owner?: OrgUser | null;
};

type OfficeForm = {
  name: string;
  city: string;
  district: string;
  ownerUserId: string;
};

type OfficeEditModalProps = {
  office: Office;
  form: OfficeForm;
  users: OrgUser[];
  busyKey: string;
  onChange: (form: OfficeForm) => void;
  onClose: () => void;
  onSave: () => void;
  onToggleActive: () => void;
};

function fullName(user?: OrgUser | null) {
  if (!user) return "Seçilmedi";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "Kullanıcı";
}

export default function OfficeEditModal({
  office,
  form,
  users,
  busyKey,
  onChange,
  onClose,
  onSave,
  onToggleActive,
}: OfficeEditModalProps) {
  const ownerCandidates = users.filter((item) => String(item.role || "").toUpperCase() === "EMLAKCI");
  const isActive = office.isActive !== false;
  const saveBusy = busyKey === `office-save-${office.id}`;
  const toggleBusy = busyKey === `office-toggle-${office.id}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section className="max-h-[90dvh] w-full max-w-[540px] overflow-y-auto rounded-[28px] border border-[#C7D6E8] bg-white p-4 shadow-2xl [-webkit-overflow-scrolling:touch]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-center text-[19px] font-black text-[#1F2937]">
            Ofis Düzenle
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
          <p className="text-[15px] font-black text-[#1F2937]">{office.name}</p>
          <p className="mt-1 text-[12px] font-bold text-slate-500">
            Durum: {isActive ? "Aktif" : "Pasif"}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Ofis Adı
            </span>
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            />
          </label>

          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Şehir
            </span>
            <input
              value={form.city}
              onChange={(event) => onChange({ ...form, city: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            />
          </label>

          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              İlçe
            </span>
            <input
              value={form.district}
              onChange={(event) => onChange({ ...form, district: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            />
          </label>

          <label>
            <span className="mb-1 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Ofis Sahibi
            </span>
            <select
              value={form.ownerUserId}
              onChange={(event) => onChange({ ...form, ownerUserId: event.target.value })}
              className="h-11 w-full rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-center text-[13px] font-bold outline-none focus:border-[#2563EB]"
            >
              <option value="">Sonra atanacak</option>
              {ownerCandidates.map((item) => (
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