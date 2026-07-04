import type {
  AdvancedFilterField,
  AdvancedFilterOption,
  AdvancedFilterSection,
  AdvancedFilterState,
} from "@/components/advanced-filter";

import type {
  EPHSchemaDefinition,
  EPHSchemaField,
  EPHSchemaMode,
  EPHSchemaOption,
  EPHSchemaState,
} from "./schema.types";
import {
  isSchemaFieldVisible,
  resolveSchemaOptions,
} from "./schema.utils";

function toAdvancedOption(option: EPHSchemaOption): AdvancedFilterOption {
  return {
    value: option.value,
    label: option.label,
    group: option.group,
    hint: option.hint,
    disabled: option.disabled,
  };
}

function mapField(
  field: EPHSchemaField,
  state: EPHSchemaState,
): AdvancedFilterField | null {
  if (field.type === "single-select" || field.type === "multi-select") {
    return {
      id: field.id,
      type: field.type,
      label: field.label,
      description: field.description,
      valueKey: field.key,
      options: resolveSchemaOptions(field.options, state).map(toAdvancedOption),
      searchable: field.searchable,
      placeholder: field.placeholder,
    } as AdvancedFilterField;
  }

  if (field.type === "location") {
    return {
      id: field.id,
      type: "location",
      label: field.label,
      description: field.description,
      cityKey: field.cityKey,
      districtKey: field.districtKey,
      neighborhoodKey: field.neighborhoodKey,
      multiple: field.multipleInFilter !== false,
      showNeighborhood: field.showNeighborhood !== false,
    };
  }

  if (field.type === "range") {
    return {
      id: field.id,
      type: "range",
      label: field.label,
      description: field.description,
      minKey: field.minKey,
      maxKey: field.maxKey,
      minPlaceholder: field.minPlaceholder,
      maxPlaceholder: field.maxPlaceholder,
      inputMode: field.inputMode,
      suffix: field.suffix,
    };
  }

  if (field.type === "boolean") {
    return {
      id: field.id,
      type: "toggle",
      label: field.label,
      description: field.description,
      valueKey: field.key,
      activeValue: field.activeValue,
      inactiveValue: field.inactiveValue,
    };
  }

  return null;
}

export function schemaToAdvancedFilterSections(
  schema: EPHSchemaDefinition,
  state: AdvancedFilterState,
  mode: EPHSchemaMode = "filter",
): AdvancedFilterSection[] {
  return schema.sections
    .filter((section) => {
      if (section.modes && !section.modes.includes(mode)) return false;

      if (typeof section.hidden === "function") {
        return !section.hidden(state as EPHSchemaState, mode);
      }

      return !section.hidden;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      fields: section.fields
        .filter((field) =>
          isSchemaFieldVisible(field, state as EPHSchemaState, mode),
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((field) => mapField(field, state as EPHSchemaState))
        .filter(Boolean) as AdvancedFilterField[],
    }))
    .filter((section) => section.fields.length > 0);
}
