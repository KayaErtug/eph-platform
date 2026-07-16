import type {
  FloorPlanForm,
  ProjectNumberingMode,
  ProjectUnitSummary,
} from "./projectSalesTypes";

export type ProjectNumberingPreviewRow = {
  key: string;
  rowNumber: number;
  blockCode: string;
  floorLevel: number;
  floorLabel: string;
  type: string;
  number: string;
};

function normalizePrefix(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/İ/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function positiveInteger(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function defaultNumberPrefix(blockCode: string) {
  const normalized = normalizePrefix(blockCode) || "BLOK";
  return normalized.endsWith("-BLOK") ? normalized : `${normalized}-BLOK`;
}

export function inferProjectNumberingMode(
  units: ProjectUnitSummary[],
): ProjectNumberingMode {
  const positiveFloorUnit = units
    .filter(
      (unit) =>
        typeof unit.floor === "number" &&
        unit.floor > 0 &&
        Boolean(unit.number?.trim()),
    )
    .sort(
      (first, second) =>
        first.inventorySortOrder - second.inventorySortOrder,
    )[0];

  if (!positiveFloorUnit?.number || !positiveFloorUnit.floor) {
    return "FLOOR_CODED";
  }

  const tail = positiveFloorUnit.number.split("-").at(-1) || "";
  const floorCode = String(positiveFloorUnit.floor);

  return tail.startsWith(floorCode) && tail.length >= floorCode.length + 2
    ? "FLOOR_CODED"
    : "CONTINUOUS";
}

export function formatProjectUnitNumber(
  prefix: string,
  floorLevel: number,
  sequence: number,
  mode: ProjectNumberingMode,
) {
  const normalizedPrefix = normalizePrefix(prefix) || "BLOK";

  if (floorLevel < 0) {
    return `${normalizedPrefix}-B${Math.abs(floorLevel)}-${sequence}`;
  }

  if (floorLevel === 0) {
    return `${normalizedPrefix}-Z-${sequence}`;
  }

  if (mode === "CONTINUOUS") {
    return `${normalizedPrefix}-${sequence}`;
  }

  return `${normalizedPrefix}-${floorLevel}${String(sequence).padStart(2, "0")}`;
}

export function buildProjectNumberingRows(
  floorPlans: FloorPlanForm[],
  mode: ProjectNumberingMode,
): ProjectNumberingPreviewRow[] {
  const rows: ProjectNumberingPreviewRow[] = [];
  const continuousSequences = new Map<string, number>();

  for (const floorPlan of floorPlans) {
    const blockKey = floorPlan.blockCode.trim().toLocaleUpperCase("tr-TR");
    const prefix =
      floorPlan.numberPrefix.trim() || defaultNumberPrefix(floorPlan.blockCode);
    let floorSequence = positiveInteger(floorPlan.startingSequence);
    let continuousSequence = continuousSequences.get(blockKey) ?? 1;

    for (const group of floorPlan.unitGroups) {
      const count = positiveInteger(group.count, 0);

      for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
        const sequence =
          mode === "CONTINUOUS" && floorPlan.floorLevel >= 0
            ? continuousSequence
            : floorSequence;

        rows.push({
          key: `${floorPlan.key}-${group.key}-${itemIndex}`,
          rowNumber: rows.length + 1,
          blockCode: floorPlan.blockCode,
          floorLevel: floorPlan.floorLevel,
          floorLabel: floorPlan.floorLabel,
          type: group.type,
          number: formatProjectUnitNumber(
            prefix,
            floorPlan.floorLevel,
            sequence,
            mode,
          ),
        });

        if (mode === "CONTINUOUS" && floorPlan.floorLevel >= 0) {
          continuousSequence += 1;
        } else {
          floorSequence += 1;
        }
      }
    }

    if (mode === "CONTINUOUS" && floorPlan.floorLevel >= 0) {
      continuousSequences.set(blockKey, continuousSequence);
    }
  }

  return rows;
}
