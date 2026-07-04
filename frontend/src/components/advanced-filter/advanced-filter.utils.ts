import type {
  AdvancedFilterField,
  AdvancedFilterOption,
  AdvancedFilterState,
  AdvancedFilterValue,
} from "./advanced-filter.types";

export const ADVANCED_FILTER_LOCATION_SEPARATOR = "|||";

export function cloneAdvancedFilterState(
  state: AdvancedFilterState,
): AdvancedFilterState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  );
}

export function getAdvancedFilterArray(
  state: AdvancedFilterState,
  key: string,
): string[] {
  const value = state[key];
  return Array.isArray(value) ? value : [];
}

export function getAdvancedFilterString(
  state: AdvancedFilterState,
  key: string,
): string {
  const value = state[key];
  return Array.isArray(value) ? "" : String(value || "");
}

export function patchAdvancedFilterState(
  state: AdvancedFilterState,
  values: Partial<AdvancedFilterState>,
): AdvancedFilterState {
  return {
    ...state,
    ...Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        Array.isArray(value) ? [...value] : String(value || ""),
      ]),
    ),
  };
}

export function toggleAdvancedFilterArrayValue(
  current: string[],
  value: string,
  multiple = true,
): string[] {
  if (!multiple) {
    return current.includes(value) ? [] : [value];
  }

  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function isAdvancedFilterValueActive(
  value: AdvancedFilterValue | undefined,
  defaultValue?: AdvancedFilterValue,
): boolean {
  if (Array.isArray(value)) {
    const defaults = Array.isArray(defaultValue) ? defaultValue : [];
    return value.some((item) => !defaults.includes(item));
  }

  return String(value || "") !== String(defaultValue || "");
}

export function countAdvancedFilters(
  state: AdvancedFilterState,
  defaultState: AdvancedFilterState = {},
): number {
  return Object.entries(state).reduce((total, [key, value]) => {
    const defaultValue = defaultState[key];

    if (Array.isArray(value)) {
      const defaults = Array.isArray(defaultValue) ? defaultValue : [];
      return total + value.filter((item) => !defaults.includes(item)).length;
    }

    return total + (String(value || "") !== String(defaultValue || "") ? 1 : 0);
  }, 0);
}

export function resolveAdvancedFilterOptions(
  source:
    | AdvancedFilterOption[]
    | ((state: AdvancedFilterState) => AdvancedFilterOption[]),
  state: AdvancedFilterState,
): AdvancedFilterOption[] {
  return typeof source === "function" ? source(state) : source;
}

export function isAdvancedFilterFieldHidden(
  field: AdvancedFilterField,
  state: AdvancedFilterState,
): boolean {
  return typeof field.hidden === "function"
    ? field.hidden(state)
    : Boolean(field.hidden);
}

export function createDistrictLocationKey(city: string, district: string) {
  return [city, district].join(ADVANCED_FILTER_LOCATION_SEPARATOR);
}

export function parseDistrictLocationKey(value: string) {
  const [city = "", district = ""] = String(value || "").split(
    ADVANCED_FILTER_LOCATION_SEPARATOR,
  );

  return { city, district };
}

export function createNeighborhoodLocationKey(
  city: string,
  district: string,
  neighborhood: string,
) {
  return [city, district, neighborhood].join(
    ADVANCED_FILTER_LOCATION_SEPARATOR,
  );
}

export function parseNeighborhoodLocationKey(value: string) {
  const [city = "", district = "", neighborhood = ""] = String(
    value || "",
  ).split(ADVANCED_FILTER_LOCATION_SEPARATOR);

  return { city, district, neighborhood };
}

export function locationSelectionLabel(value: string) {
  return String(value || "")
    .split(ADVANCED_FILTER_LOCATION_SEPARATOR)
    .filter(Boolean)
    .join(" / ");
}
