"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Loader2,
  MapPin,
  RefreshCw,
  Ruler,
  Sparkles,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type OpportunityCategory =
  | "MUSTERILERIM_ICIN"
  | "PORTFOYLERIM_ICIN"
  | "TALEP_MERKEZIM";

type FilterKey =
  | "TUMU"
  | OpportunityCategory;

type OpportunityAsset = {
  unitId: string;
  projectName?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  type?: string | null;
  status?: string | null;
  price?: number | null;
  roomCount?: string | null;
  area?: number | null;
  coverImage?: string | null;
  isMine?: boolean;
  isPoolVisible?: boolean;
  ownerId?: string | null;
  ownerName?: string | null;
};

type Opportunity = {
  id: string;
  category: OpportunityCategory;
  origin: string;
  counterpart: string;
  matchScore: number;
  matchLevel?: "GUCLU" | "UYGUN" | "ZAYIF";
  matchReasons?: string[];

  distance?: {
    decisionReady?: boolean;
    drivingDistanceKm?: number | null;
    durationMinutes?: number | null;
    straightLineDistanceKm?: number | null;
  } | null;

  priceMatch?: {
    declaredMaxBudget?: number | null;
    buyerNegotiationCeiling?: number | null;
    sellerAskingPrice?: number | null;
    sellerNegotiationFloor?: number | null;
    overlapAmount?: number | null;
    tolerancePercent?: number | null;
    withinDeclaredBudget?: boolean;
  } | null;

  matchPolicy?: {
    version?: string | null;
  } | null;

  customer?: {
    id: string;
    name: string;
    interestId?: string | null;
    title?: string | null;
  } | null;

  request?: {
    id: string;
    title: string;
    ownerId?: string | null;
    ownerName?: string | null;
    isMine?: boolean;
  } | null;

  matchedUnitCount?: number;
  asset: OpportunityAsset;
};

type OpportunityResponse = {
  generatedAt?: string;
  policyVersion?: string;

  summary?: {
    total?: number;
    strong?: number;
    suitable?: number;
    customersFor?: number;
    portfoliosFor?: number;
    requestsFor?: number;
  };

  opportunities?: Opportunity[];
};

const FILTERS: Array<{
  key: FilterKey;
  label: string;
}> = [
  { key: "TUMU", label: "Tümü" },
  {
    key: "MUSTERILERIM_ICIN",
    label: "Müşterilerim",
  },
  {
    key: "PORTFOYLERIM_ICIN",
    label: "Portföylerim",
  },
  {
    key: "TALEP_MERKEZIM",
    label: "Taleplerim",
  },
];

function money(value?: number | null) {
  if (
    value == null ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toLocaleString(
    "tr-TR",
  )} TL`;
}

function compactMoney(value?: number | null) {
  if (
    value == null ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  const amount = Number(value);

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;

    return `${millions.toLocaleString(
      "tr-TR",
      {
        maximumFractionDigits: 1,
      },
    )} Mn TL`;
  }

  return money(amount);
}

function locationText(
  asset: OpportunityAsset,
) {
  const neighborhood =
    asset.neighborhood
      ?.split(",")[0]
      ?.trim() || null;

  const values = [
    asset.city,
    asset.district,
    neighborhood,
  ]
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.indexOf(value) === index,
    );

  return values.join(" / ");
}

function categoryStyle(
  category: OpportunityCategory,
) {
  if (
    category ===
    "MUSTERILERIM_ICIN"
  ) {
    return {
      card:
        "border-[#1D4ED8] border-l-[6px] border-l-[#1D4ED8]",
      header:
        "bg-[#1E3A8A]",
      icon:
        "bg-white/20 text-white",
      label:
        "text-white",
    };
  }

  if (
    category ===
    "PORTFOYLERIM_ICIN"
  ) {
    return {
      card:
        "border-[#84B82C] border-l-[6px] border-l-[#84B82C]",
      header:
        "bg-[#8BC53F]",
      icon:
        "bg-white/20 text-white",
      label:
        "text-white",
    };
  }

  return {
    card:
      "border-[#F28C28] border-l-[6px] border-l-[#F28C28]",
    header:
      "bg-[#F28C28]",
    icon:
      "bg-white/20 text-white",
    label:
      "text-white",
  };
}

function categoryLabel(
  category: OpportunityCategory,
) {
  if (
    category ===
    "MUSTERILERIM_ICIN"
  ) {
    return "Müşteriniz için";
  }

  if (
    category ===
    "PORTFOYLERIM_ICIN"
  ) {
    return "Portföyünüz için";
  }

  return "Talebiniz için";
}

function demandLabel(item: Opportunity) {
  if (item.customer) {
    return "CRM Talebi";
  }

  if (item.request?.isMine) {
    return "Talep Merkeziniz";
  }

  return "Talep Merkezi";
}

function demandTitle(item: Opportunity) {
  if (item.customer) {
    return item.customer.name;
  }

  if (item.request) {
    return (
      item.request.ownerName ||
      "EPH Üyesi"
    );
  }

  return "EPH Talebi";
}

function demandSubtitle(
  item: Opportunity,
) {
  if (item.customer) {
    return (
      item.customer.title ||
      "Gayrimenkul talebi"
    );
  }

  return (
    item.request?.title ||
    "Talep Merkezi kaydı"
  );
}

function opportunityLevel(score: number) {
  if (score >= 75) {
    return {
      text: "Güçlü",
      className:
        "border-[#A8D8C6] bg-[#ECF9F3] text-[#15704F]",
    };
  }

  return {
    text: "Uygun",
    className:
      "border-[#BDD5EC] bg-[#EEF6FD] text-[#286496]",
  };
}

function distanceValue(
  item: Opportunity,
) {
  const reasons =
    item.matchReasons || [];

  const hasLocationMatch =
    reasons.some((value) =>
      /mahalle|ilçe|konum|bölge|km/i.test(
        value,
      ),
    );

  return hasLocationMatch
    ? "Konum uyumlu"
    : "Uygun";
}

function priceValue(item: Opportunity) {
  const reasons =
    item.matchReasons || [];

  const hasPriceMatch =
    reasons.some((value) =>
      /fiyat|bütçe|pazarlık/i.test(
        value,
      ),
    );

  return hasPriceMatch
    ? "Fiyat uyumlu"
    : "Uygun";
}

function needValue(item: Opportunity) {
  const reasons =
    item.matchReasons || [];

  if (
    reasons.some((value) =>
      /oda/i.test(value),
    )
  ) {
    return "Oda planı uyumlu";
  }

  if (
    reasons.some((value) =>
      /m²|alan|geniş/i.test(value),
    )
  ) {
    return "Alan uyumlu";
  }

  return "Kriterler uyumlu";
}

function StatBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-h-[68px] flex-col items-center justify-center rounded-[18px] border border-[#D3E0ED] bg-white px-2 py-2.5 text-center shadow-[0_6px_18px_rgba(22,58,91,0.04)]">
      <strong className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#123A61]">
        {value}
      </strong>

      <span className="mt-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-[#6C8095]">
        {label}
      </span>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#D7E3EE] bg-[#F8FBFE] px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#8495A6]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[10px] font-extrabold text-[#294A69]">
          {value}
        </p>
      </div>
    </div>
  );
}

function OpportunityCard({
  item,
}: {
  item: Opportunity;
}) {
  const router = useRouter();

  const [expanded, setExpanded] =
    useState(false);

  const level = opportunityLevel(
    item.matchScore,
  );

  const category =
    categoryStyle(item.category);

  const goDemand = () => {
    if (item.request?.id) {
      router.push(
        `/network/${item.request.id}`,
      );
      return;
    }

    router.push("/crm");
  };

  const goAsset = () => {
    if (item.asset.isMine) {
      router.push(
        `/portfoy/${item.asset.unitId}`,
      );
      return;
    }

    router.push("/havuz");
  };

  return (
    <article
      className={[
        "overflow-hidden rounded-[22px] border bg-white shadow-[0_10px_28px_rgba(20,57,91,0.055)]",
        category.card,
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-between gap-2 border-b border-[#E3EAF2] px-3.5 py-2.5",
          category.header,
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
              category.icon,
            ].join(" ")}
          >
            {item.category === "MUSTERILERIM_ICIN" ? (
              <CircleUserRound size={13} />
            ) : item.category === "PORTFOYLERIM_ICIN" ? (
              <Building2 size={13} />
            ) : (
              <Target size={13} />
            )}
          </span>

          <span
            className={[
              "truncate text-[9px] font-black uppercase tracking-[0.09em]",
              category.label,
            ].join(" ")}
          >
            {categoryLabel(
              item.category,
            )}
          </span>
        </div>

        <span
          className={[
            "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]",
            level.className,
          ].join(" ")}
        >
          {level.text} Fırsat
        </span>
      </div>

      <div className="p-3.5">
        <div className="grid grid-cols-[minmax(0,1fr)_58px_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF5FC] text-[#2563EB]">
              {item.customer ? (
                <CircleUserRound
                  size={16}
                />
              ) : (
                <Target size={16} />
              )}
            </div>

            <p className="mt-2 text-[8px] font-black uppercase tracking-[0.08em] text-[#8495A7]">
              {demandLabel(item)}
            </p>

            <h3 className="mt-1 truncate text-[13px] font-black text-[#102F4E]">
              {demandTitle(item)}
            </h3>

            <p className="mx-auto mt-1 line-clamp-2 max-w-[180px] text-[10px] font-semibold leading-4 text-[#6B8196]">
              {demandSubtitle(item)}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border-[4px] border-[#D7E7F5] bg-[#F8FBFE]">
              <strong className="text-[18px] font-black leading-none tracking-[-0.05em] text-[#15558F]">
                %{Math.round(
                  item.matchScore,
                )}
              </strong>
            </div>

            <ArrowLeftRight
              size={13}
              className="mt-1.5 text-[#8BA4BA]"
            />
          </div>

          <div className="min-w-0 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF4FB] text-[#1E5F98]">
              <Building2 size={16} />
            </div>

            <p className="mt-2 text-[8px] font-black uppercase tracking-[0.08em] text-[#8495A7]">
              {item.asset.isMine
                ? "Sizin Portföyünüz"
                : "Havuz Portföyü"}
            </p>

            <h3 className="mt-1 truncate text-[13px] font-black text-[#102F4E]">
              {item.asset
                .projectName ||
                "EPH Portföyü"}
            </h3>

            <p className="mt-1 text-[11px] font-black text-[#245E93]">
              {compactMoney(
                item.asset.price,
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <MiniMetric
            icon={<MapPin size={13} />}
            label="Konum"
            value={distanceValue(item)}
          />

          <MiniMetric
            icon={
              <WalletCards
                size={13}
              />
            }
            label="Fiyat"
            value={priceValue(item)}
          />

          <MiniMetric
            icon={<Ruler size={13} />}
            label="İhtiyaç"
            value={needValue(item)}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-bold text-[#627A90]">
          {item.asset.roomCount && (
            <span className="rounded-full bg-[#F0F5F9] px-2.5 py-1">
              {item.asset.roomCount}
            </span>
          )}

          {item.asset.area != null && (
            <span className="rounded-full bg-[#F0F5F9] px-2.5 py-1">
              {Number(
                item.asset.area,
              ).toLocaleString(
                "tr-TR",
              )}{" "}
              m²
            </span>
          )}

          {locationText(
            item.asset,
          ) && (
            <span className="max-w-full truncate rounded-full bg-[#F0F5F9] px-2.5 py-1">
              {locationText(
                item.asset,
              )}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={goDemand}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#C9D9E8] bg-white px-3 text-[10px] font-black text-[#315B81]"
          >
            Talebi İncele
            <ArrowUpRight
              size={13}
            />
          </button>

          <button
            type="button"
            onClick={goAsset}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#153F69] px-3 text-[10px] font-black text-white"
          >
            {item.asset.isMine
              ? "Portföyüm"
              : "Havuz Portföyü"}
            <ArrowRight size={13} />
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setExpanded(
              (value) => !value,
            )
          }
          className="mt-2 flex min-h-8 w-full items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#668198]"
        >
          Lina Notu

          {expanded ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown
              size={13}
            />
          )}
        </button>

        {expanded && (
          <div className="mt-1 rounded-[16px] border border-[#D6E3EF] bg-[#F8FBFE] px-3 py-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
                <Sparkles size={14} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#2563EB]">
                  Lina Değerlendirmesi
                </p>

                <p className="mt-1 text-[10px] font-semibold leading-4 text-[#536D84]">
                  Bu kayıt, talebinizle konum, fiyat ve
                  gayrimenkul özellikleri bakımından uyumlu
                  bir fırsat olarak değerlendirildi.
                </p>
              </div>
            </div>

            {Number(item.matchedUnitCount || 0) > 1 && (
              <div className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-[#C9DBEA] bg-white px-3 py-2 text-center">
                <Building2
                  size={13}
                  className="shrink-0 text-[#2563EB]"
                />

                <span className="text-[9px] font-extrabold text-[#385D7E]">
                  Bu projede {item.matchedUnitCount} uygun bağımsız bölüm bulundu.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#DFE8F0] bg-white px-2.5 py-2 text-center">
      <p className="text-[8px] font-black uppercase tracking-[0.07em] text-[#8A9AAA]">
        {label}
      </p>

      <p className="mt-1 truncate font-extrabold text-[#2A4D6D]">
        {value}
      </p>
    </div>
  );
}

export default function LinaFirsatlariPage() {
  const { user } = useAuthStore();

  const [data, setData] =
    useState<OpportunityResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<FilterKey>("TUMU");

  const load = useCallback(
    async (
      silent = false,
    ) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await api.get(
            "/coordination/lina-opportunities",
          );

        setData(
          response.data || null,
        );
      } catch (err: any) {
        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Lina fırsatları yüklenemedi.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const opportunities =
    useMemo(
      () =>
        Array.isArray(
          data?.opportunities,
        )
          ? data!
              .opportunities!
          : [],
      [data],
    );

  const filtered =
    useMemo(() => {
      if (
        filter === "TUMU"
      ) {
        return opportunities;
      }

      return opportunities.filter(
        (item) =>
          item.category ===
          filter,
      );
    }, [
      filter,
      opportunities,
    ]);

  const summary =
    data?.summary || {};

  const firstName =
    user?.firstName?.trim() ||
    user?.email?.split(
      "@",
    )[0] ||
    "EPH Üyesi";

  const countFor = (
    key: FilterKey,
  ) => {
    if (key === "TUMU") {
      return opportunities.length;
    }

    return opportunities.filter(
      (item) =>
        item.category === key,
    ).length;
  };

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-20 text-[#172B40]">
      <section className="border-b border-[#D9E4EE] bg-white">
        <div className="mx-auto max-w-[920px] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FD] text-[#2563EB]">
                  <Sparkles
                    size={16}
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-[20px] font-black tracking-[-0.035em] text-[#123859]">
                    Lina Fırsatları
                  </h1>

                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[#74899D]">
                    {firstName} için
                    kişisel iş fırsatı
                    merkezi
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                load(true)
              }
              disabled={
                refreshing
              }
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#C9DAE9] bg-white px-3 text-[9px] font-black uppercase tracking-[0.06em] text-[#356387] shadow-sm disabled:opacity-60"
            >
              <RefreshCw
                size={13}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Yenile
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatBox
              value={Number(
                summary.total || 0,
              )}
              label="Fırsat"
            />

            <StatBox
              value={Number(
                summary.strong || 0,
              )}
              label="Güçlü"
            />

            <StatBox
              value={Number(
                summary.customersFor ||
                  0,
              )}
              label="Müşteri"
            />

            <StatBox
              value={Number(
                summary.portfoliosFor ||
                  0,
              )}
              label="Portföy"
            />
          </div>

          <div className="mt-3 overflow-x-auto pb-0.5">
            <div className="flex min-w-max gap-1.5">
              {FILTERS.map(
                (item) => {
                  const active =
                    filter ===
                    item.key;

                  return (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          item.key,
                        )
                      }
                      className={[
                        "flex min-h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-[9px] font-black transition",
                        active
                          ? "border-[#173F68] bg-[#173F68] text-white"
                          : "border-[#D0DDE9] bg-white text-[#5E768C]",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.label
                      }

                      <span
                        className={[
                          "rounded-full px-1.5 py-0.5 text-[8px]",
                          active
                            ? "bg-white/15"
                            : "bg-[#EEF3F7]",
                        ].join(
                          " ",
                        )}
                      >
                        {countFor(
                          item.key,
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[920px] px-4 py-4 sm:px-5">
        {loading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-[#D4E1EC] bg-white">
            <Loader2
              size={24}
              className="animate-spin text-[#2563EB]"
            />

            <p className="mt-3 text-[11px] font-black text-[#365B7A]">
              Lina fırsatlarınızı
              değerlendiriyor
            </p>
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-[#E2CBCB] bg-white px-5 py-8 text-center">
            <p className="text-sm font-black text-[#7A4545]">
              Fırsatlar
              yüklenemedi
            </p>

            <p className="mt-2 text-[11px] text-[#956A6A]">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                load()
              }
              className="mt-4 rounded-xl bg-[#173F68] px-4 py-2 text-[10px] font-black text-white"
            >
              Tekrar Dene
            </button>
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="rounded-[22px] border border-[#D4E1EC] bg-white px-5 py-10 text-center">
            <Target
              size={24}
              className="mx-auto text-[#2563EB]"
            />

            <p className="mt-3 text-sm font-black text-[#214562]">
              Bu kategoride
              fırsat yok
            </p>

            <p className="mx-auto mt-1 max-w-md text-[10px] leading-4 text-[#7B8FA1]">
              Yeni bir eşleşme
              oluştuğunda Lina
              burada gösterecek.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7890A5]">
                  Lina Seçkisi
                </p>

                <h2 className="mt-0.5 text-[17px] font-black tracking-[-0.025em] text-[#153B5C]">
                  {filtered.length}{" "}
                  fırsat
                </h2>
              </div>

              <p className="text-right text-[9px] font-bold text-[#8A9CAD]">
                En güçlü
                eşleşmeler üstte
              </p>
            </div>

            <div className="space-y-5">
              {filtered.map(
                (item) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                  />
                ),
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
