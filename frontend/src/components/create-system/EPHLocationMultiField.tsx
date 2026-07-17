"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";

import type { EPHLocationArea } from "./location.types";
import {
  formatLocationArea,
  getLocationAreaKey,
  normalizeLocationAreas,
} from "./location.utils";

type Props = {
  value: unknown;
  onChange: (areas: EPHLocationArea[]) => void;

  showNeighborhood?: boolean;
  disabled?: boolean;

  addLabel?: string;
  emptyLabel?: string;
};

function sameText(first: string, second: string) {
  return (
    first.toLocaleLowerCase("tr-TR").trim() ===
    second.toLocaleLowerCase("tr-TR").trim()
  );
}

function sameCity(
  first: EPHLocationArea,
  second: EPHLocationArea,
) {
  return (
    sameText(first.country, second.country) &&
    sameText(first.city, second.city)
  );
}

function existingAreaCoversEntry(
  existing: EPHLocationArea,
  entry: EPHLocationArea,
) {
  if (!sameCity(existing, entry)) {
    return false;
  }

  if (!existing.district) {
    return true;
  }

  if (!sameText(existing.district, entry.district)) {
    return false;
  }

  if (!existing.neighborhood) {
    return true;
  }

  return sameText(
    existing.neighborhood,
    entry.neighborhood,
  );
}

function shouldRemoveNarrowerArea(
  existing: EPHLocationArea,
  entry: EPHLocationArea,
) {
  if (!sameCity(existing, entry)) {
    return false;
  }

  if (!entry.district) {
    return true;
  }

  if (!sameText(existing.district, entry.district)) {
    return false;
  }

  return !entry.neighborhood;
}

export default function EPHLocationMultiField({
  value,
  onChange,
  showNeighborhood = true,
  disabled = false,
  addLabel = "Bölgeyi Ekle",
  emptyLabel = "Birden fazla il, ilçe ve mahalle ekleyebilirsiniz.",
}: Props) {
  const areas = useMemo(
    () => normalizeLocationAreas(value),
    [value],
  );

  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] =
    useState<LocationOption[]>([]);
  const [places, setPlaces] = useState<LocationOption[]>([]);

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] =
    useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const [tempCity, setTempCity] = useState("");
  const [tempDistrict, setTempDistrict] = useState("");
  const [tempNeighborhood, setTempNeighborhood] =
    useState("");

  useEffect(() => {
    let active = true;

    setLoadingCities(true);

    fetchProvinceOptions()
      .then((items) => {
        if (active) {
          setCities(items);
        }
      })
      .catch(() => {
        if (active) {
          setCities([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCities(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setDistricts([]);
    setPlaces([]);

    if (!tempCity) {
      setLoadingDistricts(false);
      return;
    }

    setLoadingDistricts(true);

    fetchDistrictOptions(tempCity)
      .then((items) => {
        if (active) {
          setDistricts(items);
        }
      })
      .catch(() => {
        if (active) {
          setDistricts([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDistricts(false);
        }
      });

    return () => {
      active = false;
    };
  }, [tempCity]);

  useEffect(() => {
    let active = true;

    setPlaces([]);

    if (
      !showNeighborhood ||
      !tempCity ||
      !tempDistrict
    ) {
      setLoadingPlaces(false);
      return;
    }

    const districtOption = districts.find(
      (item) => item.name === tempDistrict,
    );

    setLoadingPlaces(true);

    fetchPlaceOptions(
      tempCity,
      tempDistrict,
      districtOption?.id,
    )
      .then((items) => {
        if (active) {
          setPlaces(items);
        }
      })
      .catch(() => {
        if (active) {
          setPlaces([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPlaces(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    districts,
    showNeighborhood,
    tempCity,
    tempDistrict,
  ]);

  const commitSelection = (
    city: string,
    district = "",
    neighborhood = "",
  ) => {
    if (!city || disabled) {
      return;
    }

    const entry: EPHLocationArea = {
      country: "TR",
      city,
      district,
      neighborhood,
      latitude: null,
      longitude: null,
      placeId: null,
    };

    if (!district) {
      const hasSameCity = areas.some((existing) =>
        sameCity(existing, entry),
      );

      if (!hasSameCity) {
        onChange([...areas, entry]);
      }

      return;
    }

    const retainedAreas = areas.filter((existing) => {
      if (!sameCity(existing, entry)) {
        return true;
      }

      if (!existing.district) {
        return false;
      }

      if (!sameText(existing.district, district)) {
        return true;
      }

      if (!neighborhood) {
        return false;
      }

      if (!existing.neighborhood) {
        return false;
      }

      return !sameText(
        existing.neighborhood,
        neighborhood,
      );
    });

    onChange([...retainedAreas, entry]);
  };

  const addArea = () => {
    commitSelection(
      tempCity,
      tempDistrict,
      tempNeighborhood,
    );
  };

  const removeArea = (target: EPHLocationArea) => {
    const targetKey = getLocationAreaKey(target);

    onChange(
      areas.filter(
        (area) =>
          getLocationAreaKey(area) !== targetKey,
      ),
    );
  };

  const groups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        city: string;
        district: string;
        items: EPHLocationArea[];
      }
    >();

    areas.forEach((area) => {
      const key = [
        area.country,
        area.city,
        area.district,
      ]
        .map((item) =>
          item.toLocaleLowerCase("tr-TR"),
        )
        .join("|");

      const existing = groupMap.get(key);

      if (existing) {
        existing.items.push(area);
        return;
      }

      groupMap.set(key, {
        city: area.city,
        district: area.district,
        items: [area],
      });
    });

    return Array.from(groupMap.values());
  }, [areas]);

  const previewArea: EPHLocationArea | null = tempCity
    ? {
        country: "TR",
        city: tempCity,
        district: tempDistrict,
        neighborhood: tempNeighborhood,
        latitude: null,
        longitude: null,
        placeId: null,
      }
    : null;

  const selectClassName =
    "h-12 w-full rounded-[16px] border border-[var(--af-border)] bg-[var(--af-surface)] px-3 text-[12px] font-black outline-none disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div
      data-eph-location-multi="true"
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black text-[var(--af-muted)]">
            İl
          </span>

          <select
            value={tempCity}
            disabled={disabled || loadingCities}
            onChange={(event) => {
              const nextCity = event.target.value;

              setTempCity(nextCity);
              setTempDistrict("");
              setTempNeighborhood("");

              if (nextCity) {
                commitSelection(nextCity);
              }
            }}
            className={selectClassName}
          >
            <option value="">
              {loadingCities
                ? "İller yükleniyor..."
                : "İl seçin"}
            </option>

            {cities.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black text-[var(--af-muted)]">
            İlçe
          </span>

          <select
            value={tempDistrict}
            disabled={
              disabled ||
              !tempCity ||
              loadingDistricts
            }
            onChange={(event) => {
              const nextDistrict = event.target.value;

              setTempDistrict(nextDistrict);
              setTempNeighborhood("");

              if (tempCity && nextDistrict) {
                commitSelection(
                  tempCity,
                  nextDistrict,
                );
              }
            }}
            className={selectClassName}
          >
            <option value="">
              {loadingDistricts
                ? "İlçeler yükleniyor..."
                : tempCity
                  ? "İlin tamamı"
                  : "Önce il seçin"}
            </option>

            {districts.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        {showNeighborhood && (
          <label className="block">
            <span className="mb-1 block text-[10px] font-black text-[var(--af-muted)]">
              Mahalle
            </span>

            <select
              value={tempNeighborhood}
              disabled={
                disabled ||
                !tempDistrict ||
                loadingPlaces
              }
              onChange={(event) => {
                const nextNeighborhood =
                  event.target.value;

                setTempNeighborhood(
                  nextNeighborhood,
                );

                if (
                  tempCity &&
                  tempDistrict &&
                  nextNeighborhood
                ) {
                  commitSelection(
                    tempCity,
                    tempDistrict,
                    nextNeighborhood,
                  );
                }
              }}
              className={selectClassName}
            >
              <option value="">
                {loadingPlaces
                  ? "Mahalleler yükleniyor..."
                  : tempDistrict
                    ? "İlçenin tamamı"
                    : "Önce ilçe seçin"}
              </option>

              {places.map((item) => (
                <option
                  key={item.id}
                  value={item.name}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={addArea}
        disabled={disabled || !tempCity}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[var(--af-accent)] bg-[var(--af-accent-soft)] px-3 text-[12px] font-black text-[var(--af-accent-text)] disabled:opacity-40"
      >
        {addLabel}
        {previewArea
          ? ` · ${formatLocationArea(previewArea)}`
          : ""}
      </button>

      <div className="rounded-[16px] border border-[var(--af-border)] bg-[var(--af-surface)] p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black text-[var(--af-accent-text)]">
            Seçilen Bölgeler
          </p>

          <span className="text-[10px] font-black text-[var(--af-accent-text)]">
            {areas.length} bölge
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--af-border)] px-3 py-3 text-center text-[11px] font-bold text-[var(--af-muted)]">
            Seçiminiz otomatik kaydedilir.
            Yalnız il seçerseniz ilin tamamı;
            mahalle seçmezseniz ilçenin tamamı
            kabul edilir. {emptyLabel}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={`${group.city}-${group.district}`}
                className="rounded-[12px] border border-[var(--af-border)] bg-white p-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--af-accent-text)]">
                  <MapPin size={13} />

                  {group.city} /{" "}
                  {group.district ||
                    "İlin tamamı"}
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.items.map((area) => (
                    <button
                      key={getLocationAreaKey(area)}
                      type="button"
                      onClick={() => removeArea(area)}
                      title="Kaldır"
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--af-border)] bg-[var(--af-surface)] px-2.5 py-1 text-[10.5px] font-black text-[var(--af-accent-text)]"
                    >
                      <span className="break-words">
                        {!area.district
                          ? "İlin tamamı"
                          : area.neighborhood ||
                            "İlçenin tamamı"}
                      </span>

                      <X
                        size={12}
                        className="shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
