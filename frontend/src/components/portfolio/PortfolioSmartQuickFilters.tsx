"use client";

import {
  Building2,
  CircleOff,
  FileText,
  Layers3,
  RotateCcw,
} from "lucide-react";

import { TYPE_LABELS } from "@/components/stok/stokConstants";
import {
  createEmptyPortfolioFilters,
  type PortfolioFilterState,
  type PortfolioFilterUnit,
} from "@/components/portfolio/PortfolioFilterCenter";

type LifecycleMode =
  | "ALL"
  | "IN_POOL"
  | "OUT_POOL"
  | "DRAFT"
  | "MISSING";

type Props = {
  units: PortfolioFilterUnit[];
  filters: PortfolioFilterState;
  onChange: (filters: PortfolioFilterState) => void;
};

const MISSING_APPROVAL_STATUSES = [
  "EKSIK_BILGI",
  "EKSIK_BILGI_BEKLENIYOR",
];

function isInPool(unit: PortfolioFilterUnit) {
  return Boolean(
    unit.isPoolVisible ||
      String(unit.approvalStatus || "").toUpperCase() === "HAVUZDA",
  );
}

function isDraft(unit: PortfolioFilterUnit) {
  return (
    String(unit.approvalStatus || "").toUpperCase() === "TASLAK"
  );
}

function hasMissingInformation(unit: PortfolioFilterUnit) {
  return MISSING_APPROVAL_STATUSES.includes(
    String(unit.approvalStatus || "").toUpperCase(),
  );
}

function typeLabel(value: string) {
  return (
    (TYPE_LABELS as Record<string, string>)[value] ||
    value.replaceAll("_", " ")
  );
}

function resolveLifecycleMode(
  filters: PortfolioFilterState,
): LifecycleMode | null {
  const poolStates = Array.isArray(filters.poolStates)
    ? filters.poolStates
    : [];
  const approvalStatuses = Array.isArray(filters.approvalStatuses)
    ? filters.approvalStatuses
    : [];

  if (
    poolStates.length === 0 &&
    approvalStatuses.length === 0
  ) {
    return "ALL";
  }

  if (
    poolStates.length === 1 &&
    poolStates[0] === "IN_POOL" &&
    approvalStatuses.length === 0
  ) {
    return "IN_POOL";
  }

  if (
    poolStates.length === 1 &&
    poolStates[0] === "OUT_POOL" &&
    approvalStatuses.length === 0
  ) {
    return "OUT_POOL";
  }

  if (
    poolStates.length === 0 &&
    approvalStatuses.length === 1 &&
    approvalStatuses[0] === "TASLAK"
  ) {
    return "DRAFT";
  }

  if (
    poolStates.length === 0 &&
    approvalStatuses.length ===
      MISSING_APPROVAL_STATUSES.length &&
    MISSING_APPROVAL_STATUSES.every((status) =>
      approvalStatuses.includes(status),
    )
  ) {
    return "MISSING";
  }

  return null;
}

export default function PortfolioSmartQuickFilters({
  units,
  filters,
  onChange,
}: Props) {
  const selectedLifecycle = resolveLifecycleMode(filters);

  const lifecycleOptions = [
    {
      value: "ALL" as const,
      label: "Tümü",
      count: units.length,
      icon: Layers3,
    },
    {
      value: "IN_POOL" as const,
      label: "Havuzda",
      count: units.filter(isInPool).length,
      icon: Building2,
    },
    {
      value: "OUT_POOL" as const,
      label: "Havuz Dışı",
      count: units.filter((unit) => !isInPool(unit)).length,
      icon: CircleOff,
    },
    {
      value: "DRAFT" as const,
      label: "Taslak",
      count: units.filter(isDraft).length,
      icon: FileText,
    },
    {
      value: "MISSING" as const,
      label: "Eksik Bilgi",
      count: units.filter(hasMissingInformation).length,
      icon: FileText,
    },
  ];

  const typeCounts = new Map<string, number>();

  units.forEach((unit) => {
    const type = String(unit.type || "").trim();
    if (!type) return;

    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  const typeOptions = Array.from(typeCounts.entries())
    .map(([value, count]) => ({
      value,
      count,
      label: typeLabel(value),
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(second.label, "tr");
    });

  const selectedTypes = Array.isArray(filters.types)
    ? filters.types
    : [];

  const hasQuickSelection =
    selectedLifecycle !== "ALL" || selectedTypes.length > 0;

  const selectLifecycle = (mode: LifecycleMode) => {
    const next: PortfolioFilterState = {
      ...filters,
      poolStates: [],
      approvalStatuses: [],
    };

    if (mode === "IN_POOL") {
      next.poolStates = ["IN_POOL"];
    }

    if (mode === "OUT_POOL") {
      next.poolStates = ["OUT_POOL"];
    }

    if (mode === "DRAFT") {
      next.approvalStatuses = ["TASLAK"];
    }

    if (mode === "MISSING") {
      next.approvalStatuses = [
        ...MISSING_APPROVAL_STATUSES,
      ];
    }

    onChange(next);
  };

  const toggleType = (type: string) => {
    const active = selectedTypes.includes(type);

    onChange({
      ...filters,
      types: active
        ? selectedTypes.filter((item) => item !== type)
        : [...selectedTypes, type],
    });
  };

  return (
    <section className="mt-3 rounded-[20px] border border-[#DDD6FE] bg-white p-2.5 shadow-[0_10px_24px_rgba(76,29,149,0.05)]">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <p className="text-[11px] font-black text-[#2E1065]">
            Akıllı Hızlı Filtreler
          </p>
          <p className="mt-0.5 text-[9px] font-bold text-[#8B83A8]">
            Yayın ve portföy türünü tek dokunuşla seç
          </p>
        </div>

        {hasQuickSelection && (
          <button
            type="button"
            onClick={() =>
              onChange(createEmptyPortfolioFilters())
            }
            className="flex min-h-[32px] shrink-0 items-center gap-1 rounded-[12px] border border-rose-200 bg-rose-50 px-2.5 text-[9px] font-black text-rose-700"
          >
            <RotateCcw size={12} />
            Sıfırla
          </button>
        )}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {lifecycleOptions.map((option) => {
          const Icon = option.icon;
          const active = selectedLifecycle === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectLifecycle(option.value)}
              className={`flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-[14px] border px-2.5 text-[9.5px] font-black transition active:scale-[0.98] ${
                active
                  ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                  : "border-[#DDD6FE] bg-[#FBFAFF] text-[#5B21B6]"
              }`}
            >
              <Icon size={13} />
              <span>{option.label}</span>
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[8.5px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white text-[#7C3AED]"
                }`}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {typeOptions.length > 0 && (
        <>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.08em] text-[#8B83A8]">
              Gayrimenkul Türü
            </span>

            {selectedTypes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    types: [],
                  })
                }
                className="text-[9px] font-black text-[#7C3AED]"
              >
                Türleri Temizle
              </button>
            )}
          </div>

          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  types: [],
                })
              }
              className={`min-h-[35px] shrink-0 rounded-[13px] border px-3 text-[9.5px] font-black ${
                selectedTypes.length === 0
                  ? "border-[#7C3AED] bg-[#F3E8FF] text-[#6D28D9]"
                  : "border-[#DDD6FE] bg-white text-[#64748B]"
              }`}
            >
              Tüm Türler
            </button>

            {typeOptions.map((option) => {
              const active = selectedTypes.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleType(option.value)}
                  className={`flex min-h-[35px] shrink-0 items-center gap-1.5 rounded-[13px] border px-2.5 text-[9.5px] font-black ${
                    active
                      ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                      : "border-[#DDD6FE] bg-white text-[#5B21B6]"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#F5F3FF] text-[#7C3AED]"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
