"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";

import type {
  AdvancedFilterCenterProps,
  AdvancedFilterField,
  AdvancedFilterLocationField,
  AdvancedFilterMultiSelectField,
  AdvancedFilterOption,
  AdvancedFilterRangeField,
  AdvancedFilterSection,
  AdvancedFilterSingleSelectField,
  AdvancedFilterState,
  AdvancedFilterTheme,
  AdvancedFilterToggleField,
  AdvancedFilterValue,
} from "./advanced-filter.types";
import {
  cloneAdvancedFilterState,
  countAdvancedFilters,
  createDistrictLocationKey,
  createNeighborhoodLocationKey,
  getAdvancedFilterArray,
  getAdvancedFilterString,
  isAdvancedFilterFieldHidden,
  locationSelectionLabel,
  parseDistrictLocationKey,
  parseNeighborhoodLocationKey,
  patchAdvancedFilterState,
  resolveAdvancedFilterOptions,
  toggleAdvancedFilterArrayValue,
} from "./advanced-filter.utils";

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
  key: string;
};

type NeighborhoodOption = LocationOption & {
  city: string;
  district: string;
  key: string;
};

function isHidden(
  condition:
    | boolean
    | ((state: AdvancedFilterState) => boolean)
    | undefined,
  state: AdvancedFilterState,
) {
  return typeof condition === "function"
    ? condition(state)
    : Boolean(condition);
}

function fieldSummary(
  field: AdvancedFilterField,
  state: AdvancedFilterState,
): string {
  if (field.type === "multi-select") {
    const selected = getAdvancedFilterArray(state, field.valueKey);
    const options = resolveAdvancedFilterOptions(field.options, state);

    if (selected.length === 0) return "Tümü";

    const labels = selected
      .map(
        (value) =>
          options.find((option) => option.value === value)?.label || value,
      )
      .filter(Boolean);

    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(", ");

    return `${labels[0]} +${labels.length - 1}`;
  }

  if (field.type === "single-select") {
    const selected = getAdvancedFilterString(state, field.valueKey);
    const options = resolveAdvancedFilterOptions(field.options, state);

    return (
      options.find((option) => option.value === selected)?.label ||
      field.placeholder ||
      "Tümü"
    );
  }

  if (field.type === "range") {
    const min = getAdvancedFilterString(state, field.minKey);
    const max = getAdvancedFilterString(state, field.maxKey);

    if (!min && !max) return "Tümü";
    if (min && max) return `${min} – ${max}${field.suffix ? ` ${field.suffix}` : ""}`;
    if (min) return `En az ${min}${field.suffix ? ` ${field.suffix}` : ""}`;

    return `En fazla ${max}${field.suffix ? ` ${field.suffix}` : ""}`;
  }

  if (field.type === "toggle") {
    const activeValue = field.activeValue || "1";
    return getAdvancedFilterString(state, field.valueKey) === activeValue
      ? "Evet"
      : "Hayır";
  }

  if (field.type === "location") {
    const cities = getAdvancedFilterArray(state, field.cityKey);
    const districts = getAdvancedFilterArray(state, field.districtKey);
    const neighborhoods = getAdvancedFilterArray(
      state,
      field.neighborhoodKey,
    );

    if (
      cities.length === 0 &&
      districts.length === 0 &&
      neighborhoods.length === 0
    ) {
      return "Tümü";
    }

    if (neighborhoods.length > 0) {
      return neighborhoods.length === 1
        ? locationSelectionLabel(neighborhoods[0])
        : `${locationSelectionLabel(neighborhoods[0])} +${neighborhoods.length - 1}`;
    }

    if (districts.length > 0) {
      return districts.length === 1
        ? locationSelectionLabel(districts[0])
        : `${locationSelectionLabel(districts[0])} +${districts.length - 1}`;
    }

    return cities.length === 1 ? cities[0] : `${cities[0]} +${cities.length - 1}`;
  }

  return "Seçiniz";
}

export default function AdvancedFilterCenter({
  open,
  title = "Gelişmiş Filtre Merkezi",
  subtitle = "İhtiyacınıza uygun sonuçları ayrıntılı biçimde süzün.",
  sections,
  value,
  defaultValue = {},
  resultCount,
  applyLabel = "Filtreleri Uygula",
  clearLabel = "Tümünü Temizle",
  closeLabel = "Kapat",
  theme,
  onApply,
  onClose,
}: AdvancedFilterCenterProps) {
  const mergedTheme = useMemo(
    () => ({
      ...DEFAULT_THEME,
      ...theme,
    }),
    [theme],
  );
  const [draft, setDraft] = useState<AdvancedFilterState>(() =>
    cloneAdvancedFilterState(value),
  );
  const [activeField, setActiveField] = useState<AdvancedFilterField | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;

    setDraft(cloneAdvancedFilterState(value));
    setActiveField(null);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const activeCount = useMemo(
    () => countAdvancedFilters(draft, defaultValue),
    [defaultValue, draft],
  );

  const visibleSections = useMemo(
    () =>
      sections
        .filter((section) => !isHidden(section.hidden, draft))
        .map((section) => ({
          ...section,
          fields: section.fields.filter(
            (field) => !isAdvancedFilterFieldHidden(field, draft),
          ),
        }))
        .filter((section) => section.fields.length > 0),
    [draft, sections],
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

  const setValue = (key: string, nextValue: AdvancedFilterValue) => {
    setDraft((current) =>
      patchAdvancedFilterState(current, {
        [key]: nextValue,
      }),
    );
  };

  const patchValues = (values: Partial<AdvancedFilterState>) => {
    setDraft((current) => patchAdvancedFilterState(current, values));
  };

  const clearAll = () => {
    setDraft(cloneAdvancedFilterState(defaultValue));
    setActiveField(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex justify-center bg-[var(--af-backdrop)]"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex h-[100dvh] w-full max-w-[720px] flex-col overflow-hidden bg-[var(--af-panel)] text-[var(--af-text)] shadow-2xl">
        <header className="shrink-0 border-b border-[var(--af-border)] bg-[var(--af-surface)] px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))]">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]">
              <SlidersHorizontal size={19} />
            </div>

            <div className="min-w-0 text-center">
              <h2 className="text-center text-[19px] font-black leading-6 tracking-[-0.03em]">
                {title}
              </h2>
              <p className="mt-0.5 text-center text-[10.5px] font-semibold leading-4 text-[var(--af-muted)]">
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[var(--af-border)] bg-[var(--af-surface-soft)]"
              aria-label={closeLabel}
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[15px] bg-[var(--af-accent-soft)] px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[var(--af-muted)]">
                Aktif Filtre
              </p>
              <p className="mt-0.5 text-[18px] font-black leading-none text-[var(--af-accent-text)]">
                {activeCount}
              </p>
            </div>

            <div className="rounded-[15px] bg-[var(--af-surface-soft)] px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[var(--af-muted)]">
                Sonuç
              </p>
              <p className="mt-0.5 text-[18px] font-black leading-none">
                {typeof resultCount === "number" ? resultCount : "—"}
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
          <div className="overflow-hidden rounded-[20px] border border-[var(--af-border)] bg-[var(--af-surface)]">
            {visibleSections.map((section, sectionIndex) => (
              <CompactSection
                key={section.id}
                section={section}
                state={draft}
                first={sectionIndex === 0}
                onOpenField={setActiveField}
                setValue={setValue}
              />
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--af-border)] bg-[var(--af-surface)] px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3">
          <div className="grid grid-cols-[124px_minmax(0,1fr)] gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[var(--af-border)] bg-[var(--af-surface-soft)] px-3 text-[12px] font-black"
            >
              <RotateCcw size={16} />
              {clearLabel}
            </button>

            <button
              type="button"
              onClick={() => onApply(cloneAdvancedFilterState(draft))}
              className="flex h-12 items-center justify-center rounded-[18px] bg-[var(--af-accent)] px-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
            >
              {typeof resultCount === "number"
                ? `${resultCount} Sonucu Göster`
                : applyLabel}
            </button>
          </div>
        </footer>

        {activeField && (
          <FieldPopup
            field={activeField}
            state={draft}
            setValue={setValue}
            patchValues={patchValues}
            onClose={() => setActiveField(null)}
          />
        )}
      </div>
    </div>
  );
}

function CompactSection({
  section,
  state,
  first,
  onOpenField,
  setValue,
}: {
  section: AdvancedFilterSection;
  state: AdvancedFilterState;
  first: boolean;
  onOpenField: (field: AdvancedFilterField) => void;
  setValue: (key: string, value: AdvancedFilterValue) => void;
}) {
  return (
    <section className={first ? "" : "border-t border-[var(--af-border)]"}>
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

      <div>
        {section.fields.map((field, index) => (
          <CompactFieldRow
            key={field.id}
            field={field}
            state={state}
            first={index === 0}
            onOpen={() => onOpenField(field)}
            setValue={setValue}
          />
        ))}
      </div>
    </section>
  );
}

function CompactFieldRow({
  field,
  state,
  first,
  onOpen,
  setValue,
}: {
  field: AdvancedFilterField;
  state: AdvancedFilterState;
  first: boolean;
  onOpen: () => void;
  setValue: (key: string, value: AdvancedFilterValue) => void;
}) {
  if (field.type === "toggle") {
    const activeValue = field.activeValue || "1";
    const inactiveValue = field.inactiveValue || "";
    const active =
      getAdvancedFilterString(state, field.valueKey) === activeValue;

    return (
      <button
        type="button"
        onClick={() =>
          setValue(field.valueKey, active ? inactiveValue : activeValue)
        }
        className={`grid min-h-[56px] w-full grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-3 text-left ${
          first ? "" : "border-t border-[var(--af-border)]"
        }`}
      >
        <span className="text-[12px] font-black">{field.label}</span>

        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-[11.5px] font-bold text-[var(--af-accent-text)]">
            {active ? "Evet" : "Hayır"}
          </span>
          <span
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
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
      type="button"
      onClick={onOpen}
      className={`grid min-h-[56px] w-full grid-cols-[112px_minmax(0,1fr)] items-center gap-3 px-3 text-left ${
        first ? "" : "border-t border-[var(--af-border)]"
      }`}
    >
      <span className="text-[12px] font-black">{field.label}</span>

      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="min-w-0 truncate text-right text-[11.5px] font-bold text-[var(--af-accent-text)]">
          {fieldSummary(field, state)}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-[var(--af-muted)]"
        />
      </span>
    </button>
  );
}

function FieldPopup({
  field,
  state,
  setValue,
  patchValues,
  onClose,
}: {
  field: AdvancedFilterField;
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
  patchValues: (values: Partial<AdvancedFilterState>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-[var(--af-backdrop)] sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[78dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[26px] border border-[var(--af-border)] bg-[var(--af-panel)] shadow-2xl sm:rounded-[26px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2 border-b border-[var(--af-border)] bg-[var(--af-surface)] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]">
            <SlidersHorizontal size={18} />
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
          <PopupFieldContent
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

function PopupFieldContent({
  field,
  state,
  setValue,
  patchValues,
}: {
  field: AdvancedFilterField;
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
  patchValues: (values: Partial<AdvancedFilterState>) => void;
}) {
  if (field.type === "multi-select") {
    return (
      <MultiSelectPopup field={field} state={state} setValue={setValue} />
    );
  }

  if (field.type === "single-select") {
    return (
      <SingleSelectPopup field={field} state={state} setValue={setValue} />
    );
  }

  if (field.type === "range") {
    return <RangePopup field={field} state={state} setValue={setValue} />;
  }

  if (field.type === "location") {
    return (
      <LocationPopup
        field={field}
        state={state}
        patchValues={patchValues}
      />
    );
  }

  if (field.type === "custom") {
    return field.render({
      state,
      setValue,
      patchValues,
    });
  }

  return null;
}

function MultiSelectPopup({
  field,
  state,
  setValue,
}: {
  field: AdvancedFilterMultiSelectField;
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = getAdvancedFilterArray(state, field.valueKey);
  const options = resolveAdvancedFilterOptions(field.options, state);
  const normalizedSearch = search.toLocaleLowerCase("tr-TR").trim();
  const visibleOptions = normalizedSearch
    ? options.filter((option) =>
        [option.label, option.group, option.hint]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedSearch),
      )
    : options;

  return (
    <div>
      <SearchBox
        value={search}
        placeholder={field.searchPlaceholder || "Seçenek ara..."}
        onChange={setSearch}
      />

      <div className="mt-2">
        <OptionList
          options={visibleOptions}
          selected={selected}
          emptyText={field.emptyText}
          onToggle={(option) =>
            setValue(
              field.valueKey,
              toggleAdvancedFilterArrayValue(selected, option.value),
            )
          }
        />
      </div>
    </div>
  );
}

function SingleSelectPopup({
  field,
  state,
  setValue,
}: {
  field: AdvancedFilterSingleSelectField;
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = getAdvancedFilterString(state, field.valueKey);
  const options = resolveAdvancedFilterOptions(field.options, state);
  const normalizedSearch = search.toLocaleLowerCase("tr-TR").trim();
  const visibleOptions = normalizedSearch
    ? options.filter((option) =>
        option.label.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
      )
    : options;

  return (
    <div>
      <SearchBox
        value={search}
        placeholder="Seçenek ara..."
        onChange={setSearch}
      />

      <div className="mt-2">
        <OptionList
          options={visibleOptions}
          selected={selected ? [selected] : []}
          onToggle={(option) =>
            setValue(
              field.valueKey,
              selected === option.value ? "" : option.value,
            )
          }
        />
      </div>
    </div>
  );
}

function RangePopup({
  field,
  state,
  setValue,
}: {
  field: AdvancedFilterRangeField;
  state: AdvancedFilterState;
  setValue: (key: string, value: AdvancedFilterValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <RangeInput
        value={getAdvancedFilterString(state, field.minKey)}
        placeholder={field.minPlaceholder || "Minimum"}
        inputMode={field.inputMode}
        suffix={field.suffix}
        onChange={(value) => setValue(field.minKey, value)}
      />
      <RangeInput
        value={getAdvancedFilterString(state, field.maxKey)}
        placeholder={field.maxPlaceholder || "Maksimum"}
        inputMode={field.inputMode}
        suffix={field.suffix}
        onChange={(value) => setValue(field.maxKey, value)}
      />
    </div>
  );
}

function RangeInput({
  value,
  placeholder,
  inputMode = "numeric",
  suffix,
  onChange,
}: {
  value: string;
  placeholder: string;
  inputMode?: "decimal" | "numeric" | "text";
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-[17px] border border-[var(--af-border)] bg-[var(--af-surface)] px-3">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-center text-[12px] font-black outline-none placeholder:text-[var(--af-muted)]"
      />
      {suffix && (
        <span className="shrink-0 text-[11px] font-black text-[var(--af-muted)]">
          {suffix}
        </span>
      )}
    </label>
  );
}

function LocationPopup({
  field,
  state,
  patchValues,
}: {
  field: AdvancedFilterLocationField;
  state: AdvancedFilterState;
  patchValues: (values: Partial<AdvancedFilterState>) => void;
}) {
  const [activeLevel, setActiveLevel] = useState<
    "city" | "district" | "neighborhood"
  >("city");
  const [search, setSearch] = useState("");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  const selectedCities = getAdvancedFilterArray(state, field.cityKey);
  const selectedDistricts = getAdvancedFilterArray(state, field.districtKey);
  const selectedNeighborhoods = getAdvancedFilterArray(
    state,
    field.neighborhoodKey,
  );
  const multiple = field.multiple !== false;
  const showNeighborhood = field.showNeighborhood !== false;

  useEffect(() => {
    let active = true;

    fetchProvinceOptions()
      .then((items) => {
        if (active) setProvinces(items);
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (selectedCities.length === 0) {
      setDistricts([]);
      setLoadingDistricts(false);
      return;
    }

    setLoadingDistricts(true);

    Promise.all(
      selectedCities.map(async (city) => {
        const items = await fetchDistrictOptions(city);

        return items.map((item) => ({
          ...item,
          city,
          key: createDistrictLocationKey(city, item.name),
        }));
      }),
    )
      .then((groups) => {
        if (active) setDistricts(groups.flat());
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCities.join("|")]);

  useEffect(() => {
    let active = true;

    if (!showNeighborhood || selectedDistricts.length === 0) {
      setNeighborhoods([]);
      setLoadingNeighborhoods(false);
      return;
    }

    setLoadingNeighborhoods(true);

    Promise.all(
      selectedDistricts.map(async (districtKey) => {
        const parsed = parseDistrictLocationKey(districtKey);
        const district = districts.find((item) => item.key === districtKey);
        const items = await fetchPlaceOptions(
          parsed.city,
          parsed.district,
          district?.id,
        );

        return items.map((item) => ({
          ...item,
          city: parsed.city,
          district: parsed.district,
          key: createNeighborhoodLocationKey(
            parsed.city,
            parsed.district,
            item.name,
          ),
        }));
      }),
    )
      .then((groups) => {
        if (active) setNeighborhoods(groups.flat());
      })
      .finally(() => {
        if (active) setLoadingNeighborhoods(false);
      });

    return () => {
      active = false;
    };
  }, [districts, selectedDistricts.join("|"), showNeighborhood]);

  const toggleCity = (city: string) => {
    const nextCities = toggleAdvancedFilterArrayValue(
      selectedCities,
      city,
      multiple,
    );
    const removed = selectedCities.includes(city);
    const nextDistricts = removed
      ? selectedDistricts.filter(
          (value) => parseDistrictLocationKey(value).city !== city,
        )
      : multiple
        ? selectedDistricts
        : [];
    const nextNeighborhoods = removed
      ? selectedNeighborhoods.filter(
          (value) => parseNeighborhoodLocationKey(value).city !== city,
        )
      : multiple
        ? selectedNeighborhoods
        : [];

    patchValues({
      [field.cityKey]: nextCities,
      [field.districtKey]: nextDistricts,
      [field.neighborhoodKey]: nextNeighborhoods,
    });
  };

  const toggleDistrict = (districtKey: string) => {
    const nextDistricts = toggleAdvancedFilterArrayValue(
      selectedDistricts,
      districtKey,
      multiple,
    );
    const removed = selectedDistricts.includes(districtKey);
    const parsed = parseDistrictLocationKey(districtKey);
    const nextNeighborhoods = removed
      ? selectedNeighborhoods.filter((value) => {
          const neighborhood = parseNeighborhoodLocationKey(value);

          return !(
            neighborhood.city === parsed.city &&
            neighborhood.district === parsed.district
          );
        })
      : multiple
        ? selectedNeighborhoods
        : [];

    patchValues({
      [field.districtKey]: nextDistricts,
      [field.neighborhoodKey]: nextNeighborhoods,
    });
  };

  const tabs = [
    {
      key: "city" as const,
      label: "İl",
      count: selectedCities.length,
      disabled: false,
    },
    {
      key: "district" as const,
      label: "İlçe",
      count: selectedDistricts.length,
      disabled: selectedCities.length === 0,
    },
    {
      key: "neighborhood" as const,
      label: "Mahalle",
      count: selectedNeighborhoods.length,
      disabled: !showNeighborhood || selectedDistricts.length === 0,
    },
  ].filter((item) => item.key !== "neighborhood" || showNeighborhood);

  const options =
    activeLevel === "city"
      ? provinces.map((item) => ({
          value: item.name,
          label: item.name,
        }))
      : activeLevel === "district"
        ? districts.map((item) => ({
            value: item.key,
            label: `${item.city} / ${item.name}`,
          }))
        : neighborhoods.map((item) => ({
            value: item.key,
            label: `${item.city} / ${item.district} / ${item.name}`,
          }));

  const selected =
    activeLevel === "city"
      ? selectedCities
      : activeLevel === "district"
        ? selectedDistricts
        : selectedNeighborhoods;

  const loading =
    activeLevel === "city"
      ? loadingProvinces
      : activeLevel === "district"
        ? loadingDistricts
        : loadingNeighborhoods;

  const normalizedSearch = search.toLocaleLowerCase("tr-TR").trim();
  const visibleOptions = normalizedSearch
    ? options.filter((option) =>
        option.label.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
      )
    : options;

  return (
    <div>
      <div className={`grid gap-1.5 ${showNeighborhood ? "grid-cols-3" : "grid-cols-2"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={tab.disabled}
            onClick={() => {
              setActiveLevel(tab.key);
              setSearch("");
            }}
            className={`min-h-[46px] rounded-[15px] border px-2 text-center text-[10.5px] font-black disabled:opacity-40 ${
              activeLevel === tab.key
                ? "border-[var(--af-accent)] bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]"
                : "border-[var(--af-border)] bg-[var(--af-surface)]"
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className="mt-0.5 block text-[9px]">{tab.count} seçili</span>
          </button>
        ))}
      </div>

      <div className="mt-2">
        <SearchBox
          value={search}
          placeholder={`${tabs.find((tab) => tab.key === activeLevel)?.label || ""} ara...`}
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
            emptyText="Seçenek bulunamadı."
            onToggle={(option) => {
              if (activeLevel === "city") {
                toggleCity(option.value);
                return;
              }

              if (activeLevel === "district") {
                toggleDistrict(option.value);
                return;
              }

              patchValues({
                [field.neighborhoodKey]: toggleAdvancedFilterArrayValue(
                  selectedNeighborhoods,
                  option.value,
                  multiple,
                ),
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

function SearchBox({
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
  emptyText = "Seçenek bulunamadı.",
  onToggle,
}: {
  options: AdvancedFilterOption[];
  selected: string[];
  emptyText?: string;
  onToggle: (option: AdvancedFilterOption) => void;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-[16px] bg-[var(--af-surface)] px-3 py-5 text-center text-[10.5px] font-bold text-[var(--af-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--af-border)] bg-[var(--af-surface)]">
      {options.map((option, index) => {
        const active = selected.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onToggle(option)}
            className={`flex min-h-[44px] w-full min-w-0 items-center gap-2 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-45 ${
              index === 0 ? "" : "border-t border-[var(--af-border)]"
            } ${
              active
                ? "bg-[var(--af-accent-soft)] text-[var(--af-accent-text)]"
                : "bg-[var(--af-surface)] text-[var(--af-text)]"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${
                active
                  ? "border-[var(--af-accent)] bg-[var(--af-accent)] text-white"
                  : "border-[var(--af-border)] bg-[var(--af-surface-soft)]"
              }`}
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

            {typeof option.count === "number" && (
              <span className="shrink-0 rounded-full bg-[var(--af-surface-soft)] px-1.5 py-0.5 text-[9px] font-black">
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
