"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";

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
  capabilities?: { capability: Capability | string }[];
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

type OrganizationTreeProps = {
  offices: Office[];
  teams: Team[];
  query?: string;
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

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export default function OrganizationTree({ offices, teams, query = "" }: OrganizationTreeProps) {
  const [openOfficeIds, setOpenOfficeIds] = useState<Record<string, boolean>>({});

  const officeCards = useMemo(() => {
    const q = normalize(query);

    return offices
      .map((office) => {
        const officeTeams = teams.filter((team) => team.officeId === office.id);
        const searchableText = normalize(
          [
            office.name,
            office.city,
            office.district,
            fullName(office.owner),
            ...officeTeams.map((team) => team.name),
            ...officeTeams.map((team) => fullName(team.leader)),
            ...officeTeams.flatMap((team) => (team.members || []).map((member) => fullName(member.user))),
          ].join(" "),
        );

        return {
          office,
          teams: officeTeams,
          visible: !q || searchableText.includes(q),
        };
      })
      .filter((item) => item.visible);
  }, [offices, teams, query]);

  function toggleOffice(officeId: string) {
    setOpenOfficeIds((current) => ({
      ...current,
      [officeId]: !current[officeId],
    }));
  }

  if (!officeCards.length) {
    return (
      <section className="rounded-3xl border border-dashed border-[#C7D6E8] bg-white p-6 text-center shadow-sm">
        <Building2 className="mx-auto text-slate-400" size={36} />
        <h2 className="mt-3 text-[16px] font-black text-[#1F2937]">Organizasyon Ağacı Boş</h2>
        <p className="mt-1 text-[13px] font-bold text-slate-500">
          Ofis veya takım kaydı bulunamadı.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 text-center">
        <h2 className="text-[17px] font-black text-[#1F2937]">Organizasyon Ağacı</h2>
        <p className="mt-1 text-[12px] font-bold text-slate-500">
          Ofis, takım, lider ve üye dağılımı
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {officeCards.map(({ office, teams: officeTeams }) => {
          const isOpen = openOfficeIds[office.id] ?? true;
          const activeTeams = officeTeams.filter((team) => team.isActive !== false);
          const memberCount = activeTeams.reduce((total, team) => {
            return total + (team._count?.members || team.members?.length || 0);
          }, 0);

          return (
            <article
              key={office.id}
              className="overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-[#F8FAFC] shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleOffice(office.id)}
                className="flex w-full items-center gap-3 border-b border-[#C7D6E8] bg-white p-3 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Building2 size={23} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-center text-[15px] font-black text-[#1F2937] sm:text-left">
                    {office.name}
                  </span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 sm:justify-start">
                    <MapPin size={12} />
                    {[office.city, office.district].filter(Boolean).join(" / ") || "Konum girilmedi"}
                  </span>
                </span>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8FF] text-slate-600">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  <TreeMiniStat label="Takım" value={activeTeams.length} />
                  <TreeMiniStat label="Üye" value={memberCount} />
                  <TreeMiniStat label="Durum" value={office.isActive === false ? "Pasif" : "Aktif"} />
                </div>

                <div className="mt-3 rounded-2xl border border-[#C7D6E8] bg-white p-3 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-[12px] font-black text-yellow-700">
                    {initials(office.owner)}
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Ofis Sahibi
                  </p>
                  <p className="mt-1 text-[13px] font-black text-[#1F2937]">
                    {fullName(office.owner)}
                  </p>
                </div>

                {isOpen ? (
                  <div className="mt-3 space-y-2">
                    {activeTeams.length ? (
                      activeTeams.map((team) => (
                        <section
                          key={team.id}
                          className="rounded-3xl border border-[#C7D6E8] bg-white p-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                              <UsersRound size={20} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-[14px] font-black text-[#1F2937]">
                                  {team.name}
                                </h3>
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                                  {team._count?.members || team.members?.length || 0}/10 Üye
                                </span>
                              </div>

                              <div className="mt-2 rounded-2xl bg-[#F8FAFC] p-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-700">
                                    <Crown size={15} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-black text-slate-500">
                                      Takım Lideri
                                    </span>
                                    <span className="block text-[12px] font-black text-[#1F2937]">
                                      {fullName(team.leader)}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {team.members?.length ? (
                                <div className="mt-2 space-y-1">
                                  {team.members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="grid grid-cols-[30px_1fr] items-center gap-2 rounded-2xl bg-[#F8FAFC] p-2"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
                                        {initials(member.user)}
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block text-[12px] font-black text-[#1F2937]">
                                          {fullName(member.user)}
                                        </span>
                                        <span className="block text-[10px] font-bold text-slate-500">
                                          {member.user.role || "Kullanıcı"}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-2 rounded-2xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
                                  <UserRound className="mx-auto text-slate-400" size={22} />
                                  <p className="mt-1 text-[11px] font-black text-slate-500">
                                    Takım üyesi yok
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#C7D6E8] bg-white p-4 text-center">
                        <UsersRound className="mx-auto text-slate-400" size={28} />
                        <p className="mt-2 text-[12px] font-black text-slate-500">
                          Bu ofiste aktif takım yok.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TreeMiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C7D6E8] bg-white p-2 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}