"use client";

import type { ReactNode } from "react";

export type AdvancedFilterScalar = string;
export type AdvancedFilterValue = AdvancedFilterScalar | AdvancedFilterScalar[];
export type AdvancedFilterState = Record<string, AdvancedFilterValue>;

export type AdvancedFilterOption = {
  value: string;
  label: string;
  group?: string;
  count?: number;
  hint?: string;
  disabled?: boolean;
};

export type AdvancedFilterOptionSource =
  | AdvancedFilterOption[]
  | ((state: AdvancedFilterState) => AdvancedFilterOption[]);

export type AdvancedFilterTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
  backdrop: string;
  panel: string;
  surface: string;
  surfaceSoft: string;
  border: string;
  text: string;
  muted: string;
  danger: string;
};

type AdvancedFilterFieldBase = {
  id: string;
  label: string;
  description?: string;
  hidden?: boolean | ((state: AdvancedFilterState) => boolean);
};

export type AdvancedFilterMultiSelectField = AdvancedFilterFieldBase & {
  type: "multi-select";
  valueKey: string;
  options: AdvancedFilterOptionSource;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  columns?: 1 | 2 | 3;
  maxVisibleHeight?: number;
};

export type AdvancedFilterSingleSelectField = AdvancedFilterFieldBase & {
  type: "single-select";
  valueKey: string;
  options: AdvancedFilterOptionSource;
  placeholder?: string;
};

export type AdvancedFilterRangeField = AdvancedFilterFieldBase & {
  type: "range";
  minKey: string;
  maxKey: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
  suffix?: string;
};

export type AdvancedFilterToggleField = AdvancedFilterFieldBase & {
  type: "toggle";
  valueKey: string;
  activeValue?: string;
  inactiveValue?: string;
};

export type AdvancedFilterLocationField = AdvancedFilterFieldBase & {
  type: "location";
  cityKey: string;
  districtKey: string;
  neighborhoodKey: string;
  multiple?: boolean;
  showNeighborhood?: boolean;
};

export type AdvancedFilterCustomContext = {
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
  patchValues: (values: Partial<AdvancedFilterState>) => void;
};

export type AdvancedFilterCustomField = AdvancedFilterFieldBase & {
  type: "custom";
  render: (context: AdvancedFilterCustomContext) => ReactNode;
};

export type AdvancedFilterField =
  | AdvancedFilterMultiSelectField
  | AdvancedFilterSingleSelectField
  | AdvancedFilterRangeField
  | AdvancedFilterToggleField
  | AdvancedFilterLocationField
  | AdvancedFilterCustomField;

export type AdvancedFilterSection = {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  hidden?: boolean | ((state: AdvancedFilterState) => boolean);
  fields: AdvancedFilterField[];
};

export type AdvancedFilterCenterProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  sections: AdvancedFilterSection[];
  value: AdvancedFilterState;
  defaultValue?: AdvancedFilterState;
  resultCount?: number;
  applyLabel?: string;
  clearLabel?: string;
  closeLabel?: string;
  theme?: Partial<AdvancedFilterTheme>;
  onApply: (value: AdvancedFilterState) => void;
  onClose: () => void;
};
