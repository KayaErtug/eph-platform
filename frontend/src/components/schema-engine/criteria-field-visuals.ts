export type EPHCriteriaFieldGroup =
  | "AREA"
  | "ROOM"
  | "BUDGET";

export type EPHCriteriaFieldVisual = {
  group: EPHCriteriaFieldGroup;
  badge: string;
  showBadge: boolean;
  rowClassName: string;
  separatorClassName: string;
  labelClassName: string;
  badgeClassName: string;
  valueClassName: string;
  chevronClassName: string;
};

type EPHCriteriaGroupVisual = Omit<
  EPHCriteriaFieldVisual,
  "showBadge"
>;

const AREA_FIELD_KEYS = new Set([
  "minarea",
  "maxarea",
  "minnetarea",
  "maxnetarea",
  "area",
  "grossarea",
  "netarea",
  "squaremeter",
  "openarea",
  "closedarea",
]);

const ROOM_FIELD_KEYS = new Set([
  "minroom",
  "maxroom",
  "roomcount",
  "roomcounts",
  "bedcount",
]);

const BUDGET_FIELD_KEYS = new Set([
  "budget",
  "minbudget",
  "maxbudget",
  "price",
  "minprice",
  "maxprice",
  "availablecreditamount",
]);

const GROUP_START_KEYS = new Set([
  "minarea",
  "area",
  "grossarea",
  "squaremeter",
  "minroom",
  "roomcount",
  "roomcounts",
  "minbudget",
  "budget",
  "price",
]);

const GROUP_VISUALS: Record<
  EPHCriteriaFieldGroup,
  EPHCriteriaGroupVisual
> = {
  AREA: {
    group: "AREA",
    badge: "m² ALAN",
    rowClassName:
      "bg-[#EFF6FF] shadow-[inset_4px_0_0_#3B82F6]",
    separatorClassName:
      "border-t border-[#BFDBFE]",
    labelClassName:
      "text-[#1D4ED8]",
    badgeClassName:
      "border border-[#93C5FD] bg-[#DBEAFE] text-[#1D4ED8]",
    valueClassName:
      "text-[#1D4ED8]",
    chevronClassName:
      "text-[#3B82F6]",
  },

  ROOM: {
    group: "ROOM",
    badge: "ODA",
    rowClassName:
      "bg-[#FAF5FF] shadow-[inset_4px_0_0_#A855F7]",
    separatorClassName:
      "border-t border-[#E9D5FF]",
    labelClassName:
      "text-[#7E22CE]",
    badgeClassName:
      "border border-[#D8B4FE] bg-[#F3E8FF] text-[#7E22CE]",
    valueClassName:
      "text-[#7E22CE]",
    chevronClassName:
      "text-[#A855F7]",
  },

  BUDGET: {
    group: "BUDGET",
    badge: "₺ BÜTÇE",
    rowClassName:
      "bg-[#F0FDF4] shadow-[inset_4px_0_0_#22C55E]",
    separatorClassName:
      "border-t border-[#BBF7D0]",
    labelClassName:
      "text-[#15803D]",
    badgeClassName:
      "border border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]",
    valueClassName:
      "text-[#15803D]",
    chevronClassName:
      "text-[#22C55E]",
  },
};

function normalizeFieldKey(
  fieldKey?: string | null,
): string {
  return String(fieldKey || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]/g, "");
}

export function resolveEPHCriteriaFieldGroup(
  fieldKey?: string | null,
): EPHCriteriaFieldGroup | null {
  const normalizedKey =
    normalizeFieldKey(fieldKey);

  if (AREA_FIELD_KEYS.has(normalizedKey)) {
    return "AREA";
  }

  if (ROOM_FIELD_KEYS.has(normalizedKey)) {
    return "ROOM";
  }

  if (BUDGET_FIELD_KEYS.has(normalizedKey)) {
    return "BUDGET";
  }

  return null;
}

export function getEPHCriteriaFieldVisual(
  fieldKey?: string | null,
): EPHCriteriaFieldVisual | null {
  const normalizedKey =
    normalizeFieldKey(fieldKey);

  const group =
    resolveEPHCriteriaFieldGroup(normalizedKey);

  if (!group) {
    return null;
  }

  return {
    ...GROUP_VISUALS[group],
    showBadge:
      GROUP_START_KEYS.has(normalizedKey),
  };
}
