"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { AdvancedFilterTheme } from "@/components/advanced-filter";
import {
  EPHLocationMultiField,
  formatLocationArea,
  normalizeLocationAreas,
} from "@/components/create-system";
import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";

import { getEPHCriteriaFieldVisual } from "./criteria-field-visuals";

import type {
  EPHSchemaChoiceField,
  EPHSchemaDefinition,
  EPHSchemaField,
  EPHSchemaLocationField,
  EPHSchemaMoneyField,
  EPHSchemaOption,
  EPHSchemaState,
  EPHSchemaValue,
} from "./schema.types";
import {
  cloneSchemaState,
  createSchemaInitialState,
  isSchemaFieldDisabled,
  isSchemaFieldVisible,
  resolveSchemaOptions,
  validateSchemaState,
} from "./schema.utils";

const DEFAULT_THEME: AdvancedFilterTheme = {
  accent: "#2563EB",
  accentSoft: "#EFF6FF",
  accentText: "#1D4ED8",
  backdrop: "rgba(15, 23, 42, 0.46)",
  panel: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSoft: "#F1F5F9",
  border: "#D9E2EF",
  text: "#0F172A",
  muted: "#64748B",
  danger: "#DC2626",
};

type DistrictOption = LocationOption & {
  city: string;
};

type PlaceOption = LocationOption & {
  city: string;
  district: string;
};

function asString(value: EPHSchemaValue | undefined) {
  return Array.isArray(value) ? "" : String(value ?? "");
}

function asArray(value: EPHSchemaValue | undefined) {
  return Array.isArray(value) ? value.map(String) : [];
}

function fieldSummary(
  field: EPHSchemaField,
  state: EPHSchemaState,
): string {
  const value = state[field.key];

  if (field.type === "single-select" || field.type === "multi-select") {
    const options = resolveSchemaOptions(field.options, state);
    const values = field.type === "multi-select" ? asArray(value) : [asString(value)].filter(Boolean);
    const labels = values.map(
      (item) => options.find((option) => option.value === item)?.label || item,
    );

    if (labels.length === 0) return field.placeholder || "Seçiniz";
    if (labels.length === 1) return labels[0];

    return `${labels[0]} +${labels.length - 1}`;
  }

  if (field.type === "location") {
    const values = [
      state[field.cityKey],
      state[field.districtKey],
      state[field.neighborhoodKey],
    ]
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter(Boolean)
      .map(String);

    return values.join(" / ") || "Konum seçin";
  }

  if (field.type === "location-multi") {
    const areas = normalizeLocationAreas(state[field.areasKey]);

    if (areas.length === 0) {
      return field.placeholder || "Konum seçin";
    }

    if (areas.length === 1) {
      const [area] = areas;

      return formatLocationArea(area);
    }

    return `${areas.length} bölge seçildi`;
  }

  if (field.type === "money") {
    const amount = asString(value);
    const currency = field.currencyKey
      ? asString(state[field.currencyKey])
      : "";

    return amount
      ? `${amount}${currency ? ` ${currency}` : ""}`
      : field.placeholder || "Bütçe girin";
  }

  if (field.type === "boolean") {
    return Boolean(value) ? "Evet" : "Hayır";
  }

  if (field.type === "range") {
    const min = asString(state[field.minKey]);
    const max = asString(state[field.maxKey]);

    if (!min && !max) return "Aralık seçin";
    return `${min || "—"} – ${max || "—"}${field.suffix ? ` ${field.suffix}` : ""}`;
  }

  const text = asString(value);
  return text || field.placeholder || "Bilgi girin";
}

export default function SchemaFormEngine({
  open,
  schema,
  value,
  title,
  subtitle,
  submitLabel = "Kaydet",
  cancelLabel = "Vazgeç",
  saving = false,
  theme,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  schema: EPHSchemaDefinition;
  value: EPHSchemaState;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  theme?: Partial<AdvancedFilterTheme>;
  onChange?: (value: EPHSchemaState) => void;
  onSubmit: (value: EPHSchemaState) => void | Promise<void>;
  onClose: () => void;
}) {
  const mergedTheme = useMemo(
    () => ({ ...DEFAULT_THEME, ...theme }),
    [theme],
  );
  const [draft, setDraft] = useState<EPHSchemaState>(() =>
    createSchemaInitialState(schema, value, "form"),
  );
  const [activeField, setActiveField] = useState<EPHSchemaField | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const wasOpenRef = useRef(false);
  const previousSchemaRef = useRef(schema);

  useEffect(() => {
    const justOpened =
      open && !wasOpenRef.current;

    const schemaChanged =
      previousSchemaRef.current !== schema;

    if (
      open &&
      (justOpened || schemaChanged)
    ) {
      setDraft(
        createSchemaInitialState(
          schema,
          value,
          "form",
        ),
      );
      setErrors({});
      setActiveField(null);
    }

    wasOpenRef.current = open;
    previousSchemaRef.current = schema;
  }, [open, schema, value]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const visibleSections = useMemo(
    () =>
      schema.sections
        .filter((section) => {
          if (section.modes && !section.modes.includes("form")) return false;

          if (typeof section.hidden === "function") {
            return !section.hidden(draft, "form");
          }

          return !section.hidden;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((section) => ({
          ...section,
          fields: section.fields
            .filter((field) => isSchemaFieldVisible(field, draft, "form"))
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
        }))
        .filter((section) => section.fields.length > 0),
    [draft, schema.sections],
  );

  const style = {
    "--af-accent": mergedTheme.accent,
    "--af-accent-soft": mergedTheme.accentSoft,
    "--af-accent-text": mergedTheme.accentText,
    "--af-backdrop": mergedTheme.backdrop,
    "--af-panel": mergedTheme.panel,
    "--af-surface": mergedTheme.surface,
    "--af-surface-soft": mergedTheme.surfaceSoft,
    "--af-border": mergedTheme.border,
    "--af-text": mergedTheme.text,
    "--af-muted": mergedTheme.muted,
    "--af-danger": mergedTheme.danger,
  } as CSSProperties;

  const relatedValidationKeys:
    Record<string, string[]> = {
      minArea: ["maxArea"],
      maxArea: ["minArea"],
      minRoom: ["maxRoom"],
      maxRoom: ["minRoom"],
      minBudget: ["maxBudget"],
      maxBudget: ["minBudget"],
    };

  const updateLiveErrors = (
    nextState: EPHSchemaState,
    changedKeys: string[],
  ) => {
    const keys = new Set(changedKeys);

    changedKeys.forEach((key) => {
      relatedValidationKeys[key]?.forEach(
        (relatedKey) => keys.add(relatedKey),
      );
    });

    if (keys.has("propertyType")) {
      [
        "minArea",
        "maxArea",
        "minRoom",
        "maxRoom",
        "minBudget",
        "maxBudget",
      ].forEach((key) => keys.add(key));
    }

    const result = validateSchemaState(
      schema,
      nextState,
      "form",
    );

    setErrors((current) => {
      const nextErrors = { ...current };

      keys.forEach((key) => {
        const error = result.errors[key];

        if (error) {
          nextErrors[key] = error;
        } else {
          delete nextErrors[key];
        }
      });

      return nextErrors;
    });
  };

  const setValue = (
    key: string,
    nextValue: EPHSchemaValue,
  ) => {
    const next = {
      ...draft,
      [key]: Array.isArray(nextValue)
        ? [...nextValue]
        : nextValue,
    };

    setDraft(next);
    onChange?.(cloneSchemaState(next));
    updateLiveErrors(next, [key]);
  };

  const patchValues = (
    values: EPHSchemaState,
  ) => {
    const next = {
      ...draft,
      ...values,
    };

    setDraft(next);
    onChange?.(cloneSchemaState(next));
    updateLiveErrors(
      next,
      Object.keys(values),
    );
  };

  const submit = async () => {
    const result = validateSchemaState(schema, draft, "form");
    setErrors(result.errors);

    if (!result.valid) {
      const firstErrorKey = Object.keys(result.errors)[0];
      const firstField = visibleSections
        .flatMap((section) => section.fields)
        .find((field) => field.key === firstErrorKey);

      if (firstField) setActiveField(firstField);
      return;
    }

    await onSubmit(cloneSchemaState(draft));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex justify-center bg-[var(--af-backdrop)]"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={title || schema.title}
    >
      <div className="relative flex h-[100dvh] w-full max-w-[720px] flex-col overflow-hidden bg-[var(--af-panel)] text-[var(--af-text)] shadow-2xl">
        <header className="shrink-0 border-b border-[var(--af-border)] bg-[var(--af-surface)] px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))]">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]">
              <Check size={19} />
            </div>

            <div className="min-w-0 text-center">
              <h2 className="text-center text-[19px] font-black leading-6 tracking-[-0.03em]">
                {title || schema.title}
              </h2>
              <p className="mt-0.5 text-center text-[10.5px] font-semibold leading-4 text-[var(--af-muted)]">
                {subtitle || schema.description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[var(--af-border)] bg-[var(--af-surface-soft)]"
              aria-label={cancelLabel}
            >
              <X size={19} />
            </button>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="mt-3 rounded-[15px] border border-red-200 bg-red-50 px-3 py-2 text-center text-[10.5px] font-black text-red-700">
              {Object.keys(errors).length} alan kontrol edilmeli.
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
          <div className="overflow-hidden rounded-[20px] border border-[var(--af-border)] bg-[var(--af-surface)]">
            {visibleSections.map((section, sectionIndex) => (
              <section
                key={section.id}
                className={
                  sectionIndex === 0
                    ? ""
                    : "border-t border-[var(--af-border)]"
                }
              >
                <div className="bg-[var(--af-surface-soft)] px-3 py-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--af-muted)]">
                    {section.title}
                  </h3>
                  {section.description && (
                    <p className="mt-0.5 text-[9.5px] font-semibold leading-4 text-[var(--af-muted)]">
                      {section.description}
                    </p>
                  )}
                </div>

                {section.fields.map((field, fieldIndex) => {
                  const disabled = isSchemaFieldDisabled(
                    field,
                    draft,
                    "form",
                  );
                  const error =
                    errors[field.key] ||
                    (field.type === "location"
                      ? errors[field.cityKey] ||
                        errors[field.districtKey] ||
                        errors[field.neighborhoodKey]
                      : "");

                  const visual =
                    getEPHCriteriaFieldVisual(
                      field.key,
                    );

                  if (field.type === "boolean") {
                    const active = Boolean(draft[field.key]);

                    return (
                      <button
                        key={field.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setValue(field.key, !active)}
                        className={`grid min-h-[58px] w-full grid-cols-[128px_minmax(0,1fr)] items-center gap-3 px-3 text-left disabled:opacity-45 ${
                          fieldIndex === 0
                            ? ""
                            : "border-t border-[var(--af-border)]"
                        }`}
                      >
                        <span className="text-[12px] font-black">
                          {field.label}
                        </span>

                        <span className="flex items-center justify-end gap-2">
                          <span className="text-[11px] font-black text-[var(--af-accent-text)]">
                            {active ? "Evet" : "Hayır"}
                          </span>
                          <span
                            className={`flex h-6 w-11 items-center rounded-full p-0.5 ${
                              active
                                ? "justify-end bg-[var(--af-accent)]"
                                : "justify-start bg-slate-300"
                            }`}
                          >
                            <span className="h-5 w-5 rounded-full bg-white shadow" />
                          </span>
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={field.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setActiveField(field)}
                      className={`grid min-h-[62px] w-full grid-cols-[128px_minmax(0,1fr)] items-center gap-3 px-3 text-left transition-colors disabled:opacity-45 ${
                        fieldIndex === 0
                          ? ""
                          : visual?.separatorClassName ||
                            "border-t border-[var(--af-border)]"
                      } ${
                        error
                          ? "bg-red-50 shadow-[inset_4px_0_0_#DC2626]"
                          : visual?.rowClassName || ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block text-[12px] font-black ${
                            error
                              ? "text-red-700"
                              : visual?.labelClassName || ""
                          }`}
                        >
                          {field.label}
                          {field.validation?.required ? " *" : ""}
                        </span>

                        {visual?.showBadge && !error && (
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-black tracking-[0.06em] ${visual.badgeClassName}`}
                          >
                            {visual.badge}
                          </span>
                        )}

                        {error && (
                          <span className="mt-0.5 block text-[9px] font-bold leading-3 text-red-600">
                            {error}
                          </span>
                        )}
                      </span>

                      <span className="flex min-w-0 items-center justify-end gap-2">
                        <span
                          className={`min-w-0 truncate text-right text-[11.5px] font-bold ${
                            error
                              ? "text-red-600"
                              : visual?.valueClassName ||
                                "text-[var(--af-accent-text)]"
                          }`}
                        >
                          {fieldSummary(field, draft)}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 ${
                            error
                              ? "text-red-500"
                              : visual?.chevronClassName ||
                                "text-[var(--af-muted)]"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--af-border)] bg-[var(--af-surface)] px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3">
          <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 rounded-[18px] border border-[var(--af-border)] bg-[var(--af-surface-soft)] px-3 text-[12px] font-black disabled:opacity-45"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={
                saving ||
                Object.keys(errors).length > 0
              }
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[var(--af-accent)] px-4 text-[13px] font-black text-white disabled:opacity-55"
            >
              {saving && <Loader2 size={17} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </footer>

        {activeField && (
          <FormFieldPopup
            field={activeField}
            state={draft}
            error={errors[activeField.key]}
            setValue={setValue}
            patchValues={patchValues}
            onClose={() => setActiveField(null)}
          />
        )}
      </div>
    </div>
  );
}

function FormFieldPopup({
  field,
  state,
  error,
  setValue,
  patchValues,
  onClose,
}: {
  field: EPHSchemaField;
  state: EPHSchemaState;
  error?: string;
  setValue: (key: string, value: EPHSchemaValue) => void;
  patchValues: (values: EPHSchemaState) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-[var(--af-backdrop)] sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[82dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[26px] border border-[var(--af-border)] bg-[var(--af-panel)] shadow-2xl sm:rounded-[26px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2 border-b border-[var(--af-border)] bg-[var(--af-surface)] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]">
            {field.type === "location" ? (
              <MapPin size={18} />
            ) : (
              <Check size={18} />
            )}
          </div>

          <div className="min-w-0 text-center">
            <h3 className="truncate text-center text-[16px] font-black">
              {field.label}
            </h3>
            {field.description && (
              <p className="mt-0.5 line-clamp-2 text-center text-[10px] font-semibold text-[var(--af-muted)]">
                {field.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--af-border)] bg-[var(--af-surface-soft)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error && (
            <div className="mb-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-center text-[10px] font-black text-red-700">
              {error}
            </div>
          )}

          <FormFieldContent
            field={field}
            state={state}
            setValue={setValue}
            patchValues={patchValues}
          />
        </div>

        <footer className="border-t border-[var(--af-border)] bg-[var(--af-surface)] p-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-[17px] bg-[var(--af-accent)] px-4 text-[12px] font-black text-white"
          >
            Tamam
          </button>
        </footer>
      </div>
    </div>
  );
}

function FormFieldContent({
  field,
  state,
  setValue,
  patchValues,
}: {
  field: EPHSchemaField;
  state: EPHSchemaState;
  setValue: (key: string, value: EPHSchemaValue) => void;
  patchValues: (values: EPHSchemaState) => void;
}) {
  if (field.type === "single-select" || field.type === "multi-select") {
    return (
      <ChoiceField
        field={field}
        state={state}
        setValue={setValue}
        patchValues={patchValues}
      />
    );
  }

  if (field.type === "location") {
    return (
      <LocationField
        field={field}
        state={state}
        patchValues={patchValues}
      />
    );
  }

  if (field.type === "location-multi") {
    return (
      <EPHLocationMultiField
        value={state[field.areasKey]}
        showNeighborhood={field.showNeighborhood}
        onChange={(areas) =>
          setValue(
            field.areasKey,
            areas as unknown as EPHSchemaValue,
          )
        }
      />
    );
  }

  if (field.type === "money") {
    return (
      <MoneyField
        field={field}
        state={state}
        setValue={setValue}
      />
    );
  }

  if (field.type === "range") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          value={asString(state[field.minKey])}
          placeholder={field.minPlaceholder || "Minimum"}
          inputMode={field.inputMode}
          onChange={(value) => setValue(field.minKey, value)}
        />
        <TextInput
          value={asString(state[field.maxKey])}
          placeholder={field.maxPlaceholder || "Maksimum"}
          inputMode={field.inputMode}
          onChange={(value) => setValue(field.maxKey, value)}
        />
      </div>
    );
  }

  if (field.type === "custom") {
    return field.render?.({
      mode: "form",
      state,
      setValue,
    }) || null;
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={asString(state[field.key])}
        onChange={(event) => setValue(field.key, event.target.value)}
        maxLength={field.validation?.maxLength}
        placeholder={field.placeholder}
        className="min-h-[160px] w-full resize-none rounded-[18px] border border-[var(--af-border)] bg-[var(--af-surface)] p-3 text-[13px] font-bold leading-5 outline-none placeholder:text-[var(--af-muted)]"
      />
    );
  }

  const useThousandsSeparator =
    field.type === "number" &&
    (field.key === "minBudget" || field.key === "maxBudget");

  return (
    <TextInput
      value={asString(state[field.key])}
      placeholder={field.placeholder || "Bilgi girin"}
      inputMode={field.type === "number" ? "numeric" : "text"}
      type={field.type === "date" ? "date" : "text"}
      maxLength={field.validation?.maxLength}
      onChange={(value) => {
        if (useThousandsSeparator) {
          const digits = value.replace(/\D/g, "");

          setValue(
            field.key,
            digits ? Number(digits).toLocaleString("tr-TR") : "",
          );
          return;
        }

        setValue(
          field.key,
          field.type === "number" && value !== ""
            ? Number(value.replace(/[^\d.-]/g, ""))
            : value,
        );
      }}
    />
  );
}

function ChoiceField({
  field,
  state,
  setValue,
  patchValues,
}: {
  field: EPHSchemaChoiceField;
  state: EPHSchemaState;
  setValue: (key: string, value: EPHSchemaValue) => void;
  patchValues: (values: EPHSchemaState) => void;
}) {
  const [search, setSearch] = useState("");
  const options = resolveSchemaOptions(field.options, state);
  const selected =
    field.type === "multi-select"
      ? asArray(state[field.key])
      : [asString(state[field.key])].filter(Boolean);
  const query = search.toLocaleLowerCase("tr-TR").trim();
  const visibleOptions = query
    ? options.filter((option) =>
        [option.label, option.hint, option.group]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(query),
      )
    : options;

  return (
    <div>
      {(field.searchable || options.length > 8) && (
        <SearchInput
          value={search}
          placeholder={`${field.label} ara...`}
          onChange={setSearch}
        />
      )}

      <div className={`${field.searchable || options.length > 8 ? "mt-2" : ""}`}>
        <OptionList
          options={visibleOptions}
          selected={selected}
          onToggle={(option) => {
            if (field.type === "multi-select") {
              setValue(
                field.key,
                selected.includes(option.value)
                  ? selected.filter((item) => item !== option.value)
                  : [...selected, option.value],
              );
              return;
            }

            const nextValue = selected.includes(option.value)
              ? ""
              : option.value;

            if (field.resetKeysOnChange?.length) {
              const patch: EPHSchemaState = {
                [field.key]: nextValue,
              };

              field.resetKeysOnChange.forEach((key) => {
                patch[key] = "";
              });

              patchValues(patch);
              return;
            }

            setValue(field.key, nextValue);
          }}
        />
      </div>
    </div>
  );
}

function MoneyField({
  field,
  state,
  setValue,
}: {
  field: EPHSchemaMoneyField;
  state: EPHSchemaState;
  setValue: (key: string, value: EPHSchemaValue) => void;
}) {
  const currencyKey = field.currencyKey;
  const currencies = resolveSchemaOptions(field.currencies, state);
  const amount = asString(state[field.key]);
  const currency = currencyKey ? asString(state[currencyKey]) : "";

  return (
    <div className="space-y-2">
      <TextInput
        value={amount}
        placeholder={field.placeholder || "Tutar girin"}
        inputMode="numeric"
        onChange={(value) => {
          const digits = value.replace(/\D/g, "");
          setValue(
            field.key,
            digits ? Number(digits).toLocaleString("tr-TR") : "",
          );
        }}
      />

      {currencyKey && currencies.length > 0 && (
        <OptionList
          options={currencies}
          selected={currency ? [currency] : []}
          onToggle={(option) => setValue(currencyKey, option.value)}
        />
      )}
    </div>
  );
}

function LocationField({
  field,
  state,
  patchValues,
}: {
  field: EPHSchemaLocationField;
  state: EPHSchemaState;
  patchValues: (values: EPHSchemaState) => void;
}) {
  const [level, setLevel] = useState<"city" | "district" | "neighborhood">(
    "city",
  );
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(true);

  const city = asString(state[field.cityKey]);
  const district = asString(state[field.districtKey]);
  const neighborhood = asString(state[field.neighborhoodKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProvinceOptions()
      .then((items) => {
        if (active) setCities(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!city) {
      setDistricts([]);
      return;
    }

    setLoading(true);

    fetchDistrictOptions(city)
      .then((items) => {
        if (active) {
          setDistricts(
            items.map((item) => ({
              ...item,
              city,
            })),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [city]);

  useEffect(() => {
    let active = true;

    if (!field.showNeighborhood || !city || !district) {
      setPlaces([]);
      return;
    }

    const districtOption = districts.find((item) => item.name === district);
    setLoading(true);

    fetchPlaceOptions(city, district, districtOption?.id)
      .then((items) => {
        if (active) {
          setPlaces(
            items.map((item) => ({
              ...item,
              city,
              district,
            })),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [city, district, districts, field.showNeighborhood]);

  const tabs = [
    { key: "city" as const, label: "İl", disabled: false },
    { key: "district" as const, label: "İlçe", disabled: !city },
    {
      key: "neighborhood" as const,
      label: "Mahalle",
      disabled: !field.showNeighborhood || !city || !district,
    },
  ].filter((item) => item.key !== "neighborhood" || field.showNeighborhood);

  const options: EPHSchemaOption[] =
    level === "city"
      ? cities.map((item) => ({ value: item.name, label: item.name }))
      : level === "district"
        ? districts.map((item) => ({
            value: item.name,
            label: `${item.city} / ${item.name}`,
          }))
        : places.map((item) => ({
            value: item.name,
            label: `${item.city} / ${item.district} / ${item.name}`,
          }));

  const selected =
    level === "city"
      ? city
        ? [city]
        : []
      : level === "district"
        ? district
          ? [district]
          : []
        : neighborhood
          ? [neighborhood]
          : [];

  const query = search.toLocaleLowerCase("tr-TR").trim();
  const visibleOptions = query
    ? options.filter((option) =>
        option.label.toLocaleLowerCase("tr-TR").includes(query),
      )
    : options;

  return (
    <div>
      <div
        className={`grid gap-1.5 ${
          field.showNeighborhood ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={tab.disabled}
            onClick={() => {
              setLevel(tab.key);
              setSearch("");
            }}
            className={`h-11 rounded-[15px] border px-2 text-[10.5px] font-black disabled:opacity-35 ${
              level === tab.key
                ? "border-[var(--af-accent)] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]"
                : "border-[var(--af-border)] bg-[var(--af-surface)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <SearchInput
          value={search}
          placeholder={`${tabs.find((tab) => tab.key === level)?.label || ""} ara...`}
          onChange={setSearch}
        />
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2
              size={22}
              className="animate-spin text-[var(--af-accent-text)]"
            />
          </div>
        ) : (
          <OptionList
            options={visibleOptions}
            selected={selected}
            onToggle={(option) => {
              if (level === "city") {
                patchValues({
                  [field.cityKey]: option.value,
                  [field.districtKey]: "",
                  [field.neighborhoodKey]: "",
                });
                setLevel("district");
                setSearch("");
                return;
              }

              if (level === "district") {
                patchValues({
                  [field.districtKey]: option.value,
                  [field.neighborhoodKey]: "",
                });

                if (field.showNeighborhood) {
                  setLevel("neighborhood");
                  setSearch("");
                }
                return;
              }

              patchValues({
                [field.neighborhoodKey]: option.value,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

function TextInput({
  value,
  placeholder,
  inputMode = "text",
  type = "text",
  maxLength,
  onChange,
}: {
  value: string;
  placeholder: string;
  inputMode?: "numeric" | "decimal" | "text";
  type?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={inputMode}
      maxLength={maxLength}
      placeholder={placeholder}
      className="h-12 w-full rounded-[18px] border border-[var(--af-border)] bg-[var(--af-surface)] px-3 text-center text-[13px] font-black outline-none placeholder:text-[var(--af-muted)]"
    />
  );
}

function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-[16px] border border-[var(--af-border)] bg-[var(--af-surface)] px-3">
      <Search size={16} className="shrink-0 text-[var(--af-muted)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12px] font-bold outline-none placeholder:text-[var(--af-muted)]"
      />
    </div>
  );
}

function OptionList({
  options,
  selected,
  onToggle,
}: {
  options: EPHSchemaOption[];
  selected: string[];
  onToggle: (option: EPHSchemaOption) => void;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-[16px] bg-[var(--af-surface)] px-3 py-5 text-center text-[10.5px] font-bold text-[var(--af-muted)]">
        Seçenek bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        const visual = option.visual;
        const accentColor = visual?.accentColor || visual?.borderColor;
        const buttonBackground = active
          ? visual?.selectedBackgroundColor ||
            visual?.backgroundColor ||
            "var(--af-accent-soft)"
          : visual?.backgroundColor || "var(--af-surface)";

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onToggle(option)}
            className={`flex min-h-[48px] w-full items-center gap-2 rounded-[16px] border px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-45 ${
              active && !visual
                ? "text-[var(--af-accent-text)]"
                : "text-[var(--af-text)]"
            }`}
            style={{
              borderColor: visual?.borderColor || "var(--af-border)",
              borderWidth: `${visual?.borderWidth || 1}px`,
              backgroundColor: buttonBackground,
              backgroundImage: visual
                ? `linear-gradient(90deg, ${
                    accentColor || visual.borderColor
                  } 0 7px, transparent 7px 100%)`
                : "none",
              boxShadow: active
                ? visual?.shadow || "0 8px 20px rgba(15, 23, 42, 0.14)"
                : "0 3px 10px rgba(15, 23, 42, 0.05)",
              color: visual?.textColor,
              paddingLeft: visual ? "16px" : undefined,
            }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border"
              style={{
                borderColor: active
                  ? accentColor || "var(--af-accent)"
                  : visual?.borderColor || "var(--af-border)",
                backgroundColor: active
                  ? accentColor || "var(--af-accent)"
                  : "var(--af-surface-soft)",
                color: active ? "#FFFFFF" : "transparent",
              }}
            >
              {active && <Check size={13} strokeWidth={3} />}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black leading-4">
                {option.label}
              </span>
              {option.hint && (
                <span className="mt-0.5 block text-[9px] font-semibold leading-3 text-[var(--af-muted)]">
                  {option.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
