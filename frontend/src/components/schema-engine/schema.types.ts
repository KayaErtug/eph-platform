import type { ReactNode } from "react";

export type EPHSchemaMode =
  | "form"
  | "filter"
  | "detail"
  | "bulk-action"
  | "lina";

export type EPHSchemaValue = string | string[] | number | boolean | null;
export type EPHSchemaState = Record<string, EPHSchemaValue>;

export type EPHSchemaOptionVisual = {
  borderColor: string;
  backgroundColor?: string;
  selectedBackgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  borderWidth?: number;
  shadow?: string;
};

export type EPHSchemaOption = {
  value: string;
  label: string;
  hint?: string;
  group?: string;
  disabled?: boolean;
  visual?: EPHSchemaOptionVisual;
};

export type EPHSchemaOptionSource =
  | EPHSchemaOption[]
  | ((state: EPHSchemaState) => EPHSchemaOption[]);

export type EPHSchemaFieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "single-select"
  | "multi-select"
  | "location"
  | "location-multi"
  | "range"
  | "boolean"
  | "date"
  | "custom";

export type EPHSchemaValidation = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
  validate?: (
    value: EPHSchemaValue | undefined,
    state: EPHSchemaState,
  ) => string | null;
};

export type EPHSchemaDependency = {
  field: string;
  operator:
    | "equals"
    | "not-equals"
    | "includes"
    | "not-includes"
    | "exists"
    | "not-exists";
  value?: EPHSchemaValue;
};

export type EPHSchemaLinaMetadata = {
  meaning: string;
  analyticsKey: string;
  entityPath?: string;
  pii?: boolean;
  searchable?: boolean;
  comparable?: boolean;
  synonyms?: string[];
  unit?: string;
};

export type EPHSchemaFieldBase<TType extends EPHSchemaFieldType> = {
  id: string;
  key: string;
  label: string;
  type: TType;
  description?: string;
  placeholder?: string;
  modes?: EPHSchemaMode[];
  order?: number;
  defaultValue?: EPHSchemaValue;
  validation?: EPHSchemaValidation;
  dependencies?: EPHSchemaDependency[];
  hidden?: boolean | ((state: EPHSchemaState, mode: EPHSchemaMode) => boolean);
  disabled?: boolean | ((state: EPHSchemaState, mode: EPHSchemaMode) => boolean);
  lina?: EPHSchemaLinaMetadata;
};

export type EPHSchemaTextField = EPHSchemaFieldBase<
  "text" | "textarea" | "number" | "date"
>;

export type EPHSchemaChoiceField = EPHSchemaFieldBase<
  "single-select" | "multi-select"
> & {
  options: EPHSchemaOptionSource;
  searchable?: boolean;
  resetKeysOnChange?: string[];
};

export type EPHSchemaLocationField = EPHSchemaFieldBase<"location"> & {
  cityKey: string;
  districtKey: string;
  neighborhoodKey: string;
  multipleInFilter?: boolean;
  showNeighborhood?: boolean;
};

export type EPHSchemaLocationMultiField =
  EPHSchemaFieldBase<"location-multi"> & {
    areasKey: string;
    showNeighborhood?: boolean;
  };

export type EPHSchemaRangeField = EPHSchemaFieldBase<"range"> & {
  minKey: string;
  maxKey: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  suffix?: string;
  inputMode?: "numeric" | "decimal" | "text";
};

export type EPHSchemaBooleanField = EPHSchemaFieldBase<"boolean"> & {
  activeValue?: string;
  inactiveValue?: string;
};

export type EPHSchemaMoneyField = EPHSchemaFieldBase<"money"> & {
  currencyKey?: string;
  currencies?: EPHSchemaOptionSource;
};

export type EPHSchemaCustomField = EPHSchemaFieldBase<"custom"> & {
  render?: (context: {
    mode: EPHSchemaMode;
    state: EPHSchemaState;
    setValue: (key: string, value: EPHSchemaValue) => void;
  }) => ReactNode;
};

export type EPHSchemaField =
  | EPHSchemaTextField
  | EPHSchemaChoiceField
  | EPHSchemaLocationField
  | EPHSchemaLocationMultiField
  | EPHSchemaRangeField
  | EPHSchemaBooleanField
  | EPHSchemaMoneyField
  | EPHSchemaCustomField;

export type EPHSchemaSection = {
  id: string;
  title: string;
  description?: string;
  order?: number;
  modes?: EPHSchemaMode[];
  fields: EPHSchemaField[];
  hidden?: boolean | ((state: EPHSchemaState, mode: EPHSchemaMode) => boolean);
};

export type EPHSchemaDefinition = {
  id: string;
  version: number;
  entity: string;
  title: string;
  description?: string;
  sections: EPHSchemaSection[];
  defaultState?: EPHSchemaState;
  defaultStateByMode?: Partial<Record<EPHSchemaMode, EPHSchemaState>>;
};

export type EPHSchemaValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export type EPHBulkActionContext<T = unknown> = {
  selectedIds: string[];
  selectedItems: T[];
  allItems: T[];
};

export type EPHBulkActionDefinition<T = unknown> = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  requiresConfirmation?: boolean;
  confirmationText?: string;
  permission?: string;
  disabled?: (context: EPHBulkActionContext<T>) => boolean;
  execute: (context: EPHBulkActionContext<T>) => void | Promise<void>;
};
