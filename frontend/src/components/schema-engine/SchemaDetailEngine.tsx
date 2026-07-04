"use client";

import type {
  EPHSchemaDefinition,
  EPHSchemaField,
  EPHSchemaOption,
  EPHSchemaState,
  EPHSchemaValue,
} from "./schema.types";
import {
  getSchemaFields,
  resolveSchemaOptions,
} from "./schema.utils";

function displayChoice(
  field: Extract<
    EPHSchemaField,
    { type: "single-select" | "multi-select" }
  >,
  value: EPHSchemaValue | undefined,
  state: EPHSchemaState,
) {
  const options = resolveSchemaOptions(field.options, state);
  const values = Array.isArray(value)
    ? value
    : value
      ? [String(value)]
      : [];

  return values
    .map(
      (item) =>
        options.find((option: EPHSchemaOption) => option.value === item)
          ?.label || item,
    )
    .join(", ");
}

function displayValue(
  field: EPHSchemaField,
  state: EPHSchemaState,
) {
  const value = state[field.key];

  if (field.type === "single-select" || field.type === "multi-select") {
    return displayChoice(field, value, state) || "—";
  }

  if (field.type === "boolean") {
    return value ? "Evet" : "Hayır";
  }

  if (field.type === "location") {
    const city = state[field.cityKey];
    const district = state[field.districtKey];
    const neighborhood = state[field.neighborhoodKey];

    return [city, district, neighborhood]
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter(Boolean)
      .join(" / ") || "—";
  }

  if (field.type === "range") {
    const min = state[field.minKey];
    const max = state[field.maxKey];

    if (!min && !max) return "—";
    return `${min || "Alt sınır yok"} – ${max || "Üst sınır yok"}${
      field.suffix ? ` ${field.suffix}` : ""
    }`;
  }

  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === null || value === undefined || value === "") return "—";

  return String(value);
}

export default function SchemaDetailEngine({
  schema,
  value,
  emptyText = "—",
}: {
  schema: EPHSchemaDefinition;
  value: EPHSchemaState;
  emptyText?: string;
}) {
  const fields = getSchemaFields(schema, value, "detail");

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#D9E2EF] bg-white">
      {fields.map((field, index) => {
        const display = displayValue(field, value);

        return (
          <div
            key={field.id}
            className={`grid min-h-[54px] grid-cols-[128px_minmax(0,1fr)] items-center gap-3 px-3 py-2 ${
              index === 0 ? "" : "border-t border-[#E2E8F0]"
            }`}
          >
            <span className="text-[11px] font-black text-[#475569]">
              {field.label}
            </span>
            <span className="min-w-0 break-words text-right text-[12px] font-black text-[#0F172A]">
              {display === "—" ? emptyText : display}
            </span>
          </div>
        );
      })}
    </div>
  );
}
