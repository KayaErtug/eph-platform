import type {
  EPHSchemaDefinition,
  EPHSchemaDependency,
  EPHSchemaField,
  EPHSchemaMode,
  EPHSchemaOption,
  EPHSchemaOptionSource,
  EPHSchemaState,
  EPHSchemaValidationResult,
  EPHSchemaValue,
} from "./schema.types";

export function cloneSchemaState(state: EPHSchemaState): EPHSchemaState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  );
}

export function createSchemaInitialState(
  schema: EPHSchemaDefinition,
  seed: EPHSchemaState = {},
  mode?: EPHSchemaMode,
): EPHSchemaState {
  const modeDefaults = mode ? schema.defaultStateByMode?.[mode] || {} : {};

  const next: EPHSchemaState = {
    ...(schema.defaultState || {}),
    ...modeDefaults,
    ...seed,
  };

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!(field.key in next) && field.defaultValue !== undefined) {
        next[field.key] = Array.isArray(field.defaultValue)
          ? [...field.defaultValue]
          : field.defaultValue;
      }

      if (field.type === "location") {
        const multiple = mode === "filter" && field.multipleInFilter !== false;

        for (const key of [
          field.cityKey,
          field.districtKey,
          field.neighborhoodKey,
        ]) {
          if (!(key in next)) next[key] = multiple ? [] : "";
        }
      }

      if (field.type === "range") {
        if (!(field.minKey in next)) next[field.minKey] = "";
        if (!(field.maxKey in next)) next[field.maxKey] = "";
      }

      if (
        (field.type === "multi-select" || field.type === "single-select") &&
        !(field.key in next)
      ) {
        next[field.key] = field.type === "multi-select" ? [] : "";
      }
    }
  }

  return cloneSchemaState(next);
}

export function resolveSchemaOptions(
  source: EPHSchemaOptionSource | undefined,
  state: EPHSchemaState,
): EPHSchemaOption[] {
  if (!source) return [];
  return typeof source === "function" ? source(state) : source;
}

function valueExists(value: EPHSchemaValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function dependencyMatches(
  dependency: EPHSchemaDependency,
  state: EPHSchemaState,
): boolean {
  const current = state[dependency.field];
  const expected = dependency.value;

  if (dependency.operator === "exists") return valueExists(current);
  if (dependency.operator === "not-exists") return !valueExists(current);

  if (dependency.operator === "equals") return current === expected;
  if (dependency.operator === "not-equals") return current !== expected;

  if (dependency.operator === "includes") {
    return Array.isArray(current)
      ? current.includes(String(expected ?? ""))
      : String(current ?? "").includes(String(expected ?? ""));
  }

  if (dependency.operator === "not-includes") {
    return Array.isArray(current)
      ? !current.includes(String(expected ?? ""))
      : !String(current ?? "").includes(String(expected ?? ""));
  }

  return true;
}

export function fieldDependenciesMatch(
  field: EPHSchemaField,
  state: EPHSchemaState,
): boolean {
  return (field.dependencies || []).every((dependency) =>
    dependencyMatches(dependency, state),
  );
}

export function isSchemaFieldVisible(
  field: EPHSchemaField,
  state: EPHSchemaState,
  mode: EPHSchemaMode,
): boolean {
  if (field.modes && !field.modes.includes(mode)) return false;
  if (!fieldDependenciesMatch(field, state)) return false;

  if (typeof field.hidden === "function") {
    return !field.hidden(state, mode);
  }

  return !field.hidden;
}

export function isSchemaFieldDisabled(
  field: EPHSchemaField,
  state: EPHSchemaState,
  mode: EPHSchemaMode,
): boolean {
  if (typeof field.disabled === "function") {
    return field.disabled(state, mode);
  }

  return Boolean(field.disabled);
}

export function getSchemaFields(
  schema: EPHSchemaDefinition,
  state: EPHSchemaState,
  mode: EPHSchemaMode,
): EPHSchemaField[] {
  return schema.sections
    .filter((section) => {
      if (section.modes && !section.modes.includes(mode)) return false;

      if (typeof section.hidden === "function") {
        return !section.hidden(state, mode);
      }

      return !section.hidden;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .flatMap((section) =>
      [...section.fields]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter((field) => isSchemaFieldVisible(field, state, mode)),
    );
}

export function validateSchemaState(
  schema: EPHSchemaDefinition,
  state: EPHSchemaState,
  mode: EPHSchemaMode = "form",
): EPHSchemaValidationResult {
  const errors: Record<string, string> = {};

  for (const field of getSchemaFields(schema, state, mode)) {
    const rules = field.validation;
    if (!rules) continue;

    const value = state[field.key];
    const stringValue = Array.isArray(value)
      ? value.join(",")
      : String(value ?? "");

    if (rules.required && !valueExists(value)) {
      errors[field.key] = rules.message || `${field.label} zorunludur.`;
      continue;
    }

    if (
      rules.minLength !== undefined &&
      stringValue.length < rules.minLength &&
      stringValue.length > 0
    ) {
      errors[field.key] =
        rules.message ||
        `${field.label} en az ${rules.minLength} karakter olmalıdır.`;
      continue;
    }

    if (
      rules.maxLength !== undefined &&
      stringValue.length > rules.maxLength
    ) {
      errors[field.key] =
        rules.message ||
        `${field.label} en fazla ${rules.maxLength} karakter olabilir.`;
      continue;
    }

    const numericValue = Number(value);

    if (
      rules.min !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue < rules.min
    ) {
      errors[field.key] =
        rules.message || `${field.label} en az ${rules.min} olmalıdır.`;
      continue;
    }

    if (
      rules.max !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue > rules.max
    ) {
      errors[field.key] =
        rules.message || `${field.label} en fazla ${rules.max} olabilir.`;
      continue;
    }

    if (rules.pattern && stringValue && !rules.pattern.test(stringValue)) {
      errors[field.key] = rules.message || `${field.label} geçersizdir.`;
      continue;
    }

    if (rules.validate) {
      const customError = rules.validate(value, state);
      if (customError) errors[field.key] = customError;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
