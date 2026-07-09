"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  ClipboardList,
  Layers3,
  Loader2,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import type {
  ProjectSalesStockDraft,
  ProjectSalesStockResponse,
  ProjectSalesStockUnit,
} from "../lib/projectSalesTypes";
import { SALES_STATUS_OPTIONS } from "../lib/projectSalesOptions";
import {
  formatCurrency,
  formatSalesPriceInput,
  isSalesDraftDirty,
  salesPriceDigits,
  salesStatusLabel,
  salesStatusPalette,
  salesUnitCardPalette,
  salesUnitIdentity,
  unitTypeLabel,
} from "../lib/projectSalesFormatters";
import {
  cardStyle,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../lib/projectSalesStyles";
import { Field, Metric, SectionTitle } from "./ProjectSalesPrimitives";

export function ProjectSalesStockView({
  stock,
  drafts,
  busyAction,
  onDraftChange,
  onApplyDrafts,
  onSaveUnits,
  onSaveUnit,
}: {
  stock: ProjectSalesStockResponse;
  drafts: Record<string, ProjectSalesStockDraft>;
  busyAction: string | null;
  onDraftChange: (
    unitId: string,
    field: keyof ProjectSalesStockDraft,
    value: string,
  ) => void;
  onApplyDrafts: (
    unitIds: string[],
    patch: Partial<ProjectSalesStockDraft>,
  ) => void;
  onSaveUnits: (
    unitIds: string[],
    patch?: Partial<ProjectSalesStockDraft>,
  ) => void;
  onSaveUnit: (unitId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("TUMU");
  const [statusFilter, setStatusFilter] = useState("TUMU");
  const [typeFilter, setTypeFilter] = useState("TUMU");
  const [roomFilter, setRoomFilter] = useState("TUMU");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStatus, setBulkStatus] = useState("DEGISTIRME");

  const savingBulk = busyAction === "sales-stock-bulk-save";

  useEffect(() => {
    const validIds = new Set(stock.units.map((unit) => unit.id));

    setSelectedUnitIds((current) =>
      current.filter((unitId) => validIds.has(unitId)),
    );
  }, [stock.units]);

  const blockOptions = useMemo(
    () =>
      Array.from(
        new Map(
          stock.units
            .filter((unit) => unit.block)
            .map((unit) => [
              unit.block!.id,
              {
                value: unit.block!.id,
                label: unit.block!.name || `${unit.block!.code} Blok`,
              },
            ]),
        ).values(),
      ),
    [stock.units],
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(stock.units.map((unit) => unit.type))).sort(),
    [stock.units],
  );

  const roomOptions = useMemo(
    () =>
      Array.from(
        new Set(
          stock.units
            .map((unit) => unit.roomCount)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((first, second) => first.localeCompare(second, "tr")),
    [stock.units],
  );

  const identityPaletteMap = useMemo(() => {
    const signatures = Array.from(
      new Set(stock.units.map((unit) => salesUnitIdentity(unit))),
    ).sort();

    return new Map(
      signatures.map((signature, index) => {
        const hue = (index * 137.508) % 360;

        return [
          signature,
          {
            background: `hsl(${hue.toFixed(1)} 55% 82%)`,
            border: `hsl(${hue.toFixed(1)} 52% 55%)`,
            accent: `hsl(${hue.toFixed(1)} 65% 28%)`,
          },
        ] as const;
      }),
    );
  }, [stock.units]);

  const filteredUnits = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return stock.units.filter((unit) => {
      if (blockFilter !== "TUMU" && unit.blockId !== blockFilter) {
        return false;
      }

      if (statusFilter !== "TUMU" && unit.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "TUMU" && unit.type !== typeFilter) {
        return false;
      }

      if (roomFilter !== "TUMU" && unit.roomCount !== roomFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        unit.inventoryCode,
        unit.number,
        unit.block?.code,
        unit.block?.name,
        unit.floorLabel,
        unit.roomCount,
        unit.conceptLabel,
        unitTypeLabel(unit.type),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(normalizedSearch),
        );
    });
  }, [
    blockFilter,
    roomFilter,
    search,
    statusFilter,
    stock.units,
    typeFilter,
  ]);

  const selectedSet = useMemo(
    () => new Set(selectedUnitIds),
    [selectedUnitIds],
  );

  const dirtyUnitIds = useMemo(
    () =>
      stock.units
        .filter((unit) => {
          const draft = drafts[unit.id];

          return draft ? isSalesDraftDirty(unit, draft) : false;
        })
        .map((unit) => unit.id),
    [drafts, stock.units],
  );

  const allFilteredSelected =
    filteredUnits.length > 0 &&
    filteredUnits.every((unit) => selectedSet.has(unit.id));

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((currentId) => currentId !== unitId)
        : [...current, unitId],
    );
  };

  const toggleFilteredSelection = () => {
    const visibleIds = filteredUnits.map((unit) => unit.id);

    setSelectedUnitIds((current) => {
      const currentSet = new Set(current);

      if (visibleIds.every((unitId) => currentSet.has(unitId))) {
        return current.filter((unitId) => !visibleIds.includes(unitId));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const bulkPatch = () => {
    const patch: Partial<ProjectSalesStockDraft> = {};

    if (salesPriceDigits(bulkPrice)) {
      patch.price = salesPriceDigits(bulkPrice);
    }

    if (bulkStatus !== "DEGISTIRME") {
      patch.status = bulkStatus;
    }

    return patch;
  };

  const applyBulkDraft = () => {
    const patch = bulkPatch();

    if (selectedUnitIds.length === 0) return;
    if (patch.price === undefined && patch.status === undefined) return;

    onApplyDrafts(selectedUnitIds, patch);
  };

  const applyAndSaveBulk = () => {
    const patch = bulkPatch();

    if (selectedUnitIds.length === 0) return;
    if (patch.price === undefined && patch.status === undefined) return;

    void onSaveUnits(selectedUnitIds, patch);
  };

  const applyToIdenticalUnits = (sourceUnit: ProjectSalesStockUnit) => {
    const draft = drafts[sourceUnit.id];

    if (!draft) return;

    const signature = salesUnitIdentity(sourceUnit);
    const matchingIds = stock.units
      .filter((unit) => salesUnitIdentity(unit) === signature)
      .map((unit) => unit.id);

    onApplyDrafts(matchingIds, draft);
    setSelectedUnitIds((current) =>
      Array.from(new Set([...current, ...matchingIds])),
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginTop: 12,
        paddingBottom: "calc(72px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          ...cardStyle,
          borderColor: "#A7E4CB",
          background:
            "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 55%, #ECFDF5 100%)",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<BadgeDollarSign size={21} />}
          title="Satış Stoku Merkezi"
          subtitle={`${stock.project.name} • Fiyat ve satış durumu yönetimi`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 125px), 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Satış Stoku" value={stock.summary.total} />
          <Metric label="Aktif" value={stock.summary.available} />
          <Metric label="Rezerve" value={stock.summary.reserved} />
          <Metric label="Satıldı/Kiralandı" value={stock.summary.closed} />
          <Metric label="Fiyat Girilen" value={stock.summary.priced} />
        </div>

        <div
          style={{
            marginTop: 9,
            border: "1.5px solid #A7E4CB",
            borderRadius: 15,
            background: "#FFFFFF",
            padding: 11,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#64748B",
              fontSize: 10,
              fontWeight: 850,
            }}
          >
            Toplam Liste Değeri
          </div>
          <div
            style={{
              marginTop: 3,
              color: "#047857",
              fontSize: 20,
              lineHeight: 1.2,
              fontWeight: 950,
              overflowWrap: "anywhere",
            }}
          >
            {formatCurrency(stock.summary.totalListValue)}
          </div>
        </div>
      </section>

      <section
        style={{
          ...cardStyle,
          borderColor: "#93C5FD",
          background:
            "linear-gradient(135deg, #EAF2FF 0%, #FFFFFF 58%, #EEF6FF 100%)",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Layers3 size={20} />}
          title="Toplu Fiyat ve Durum İşlemleri"
          subtitle="Filtreleyin, seçin ve yüzlerce bağımsız bölümü tek işlemde kaydedin."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
            gap: 7,
            marginTop: 11,
          }}
        >
          <Metric label="Görünen" value={filteredUnits.length} />
          <Metric label="Seçili" value={selectedUnitIds.length} />
          <Metric label="Değişen" value={dirtyUnitIds.length} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          <Field label="Toplu liste fiyatı">
            <div style={{ position: "relative" }}>
              <input
                value={formatSalesPriceInput(bulkPrice)}
                onChange={(event) =>
                  setBulkPrice(salesPriceDigits(event.target.value))
                }
                inputMode="numeric"
                placeholder="Ör. 12.000.000"
                disabled={savingBulk}
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 13,
                  transform: "translateY(-50%)",
                  color: "#1557D6",
                  fontSize: 11,
                  fontWeight: 950,
                  pointerEvents: "none",
                }}
              >
                TL
              </span>
            </div>
          </Field>

          <Field label="Toplu satış durumu">
            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              disabled={savingBulk}
              style={inputStyle}
            >
              <option value="DEGISTIRME">Durumu değiştirme</option>
              {SALES_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={toggleFilteredSelection}
            disabled={filteredUnits.length === 0 || savingBulk}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              borderColor: "#93C5FD",
              color: "#1557D6",
            }}
          >
            <Check size={17} />
            {allFilteredSelected
              ? "Görünen Seçimi Kaldır"
              : "Görünenlerin Tümünü Seç"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedUnitIds([])}
            disabled={selectedUnitIds.length === 0 || savingBulk}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
            }}
          >
            <X size={17} />
            Seçimi Temizle
          </button>

          <button
            type="button"
            onClick={applyBulkDraft}
            disabled={
              selectedUnitIds.length === 0 ||
              (!salesPriceDigits(bulkPrice) &&
                bulkStatus === "DEGISTIRME") ||
              savingBulk
            }
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              borderColor: "#A78BFA",
              background: "#F5F3FF",
              color: "#6D28D9",
            }}
          >
            <ClipboardList size={17} />
            Seçilen Formlara Uygula
          </button>

          <button
            type="button"
            onClick={applyAndSaveBulk}
            disabled={
              selectedUnitIds.length === 0 ||
              (!salesPriceDigits(bulkPrice) &&
                bulkStatus === "DEGISTIRME") ||
              savingBulk
            }
            style={{
              ...primaryButtonStyle,
              width: "100%",
              background:
                "linear-gradient(135deg, #047857, #10B981)",
            }}
          >
            {savingBulk ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <Save size={18} />
            )}
            Uygula ve Tek Seferde Kaydet
          </button>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "#475569",
            fontSize: 10,
            lineHeight: 1.55,
            textAlign: "center",
            fontWeight: 750,
          }}
        >
          Örnek: Oda sayısından “2+1” seçin, görünenlerin tümünü işaretleyin,
          fiyatı girin ve tek tuşla kaydedin. Fiyatı boş bırakırsanız yalnız
          durum; durumu değiştirmezseniz yalnız fiyat uygulanır.
        </p>
      </section>

      <section
        aria-label="Satış stoku toplu kayıt paneli"
        style={{
          ...cardStyle,
          borderColor:
            dirtyUnitIds.length > 0 ? "#10B981" : "#94A3B8",
          background:
            dirtyUnitIds.length > 0
              ? "linear-gradient(135deg, #ECFDF5, #FFFFFF)"
              : "#F8FAFC",
          padding: 12,
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              minWidth: 0,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color:
                  dirtyUnitIds.length > 0 ? "#047857" : "#64748B",
                fontSize: 12,
                lineHeight: 1.4,
                fontWeight: 950,
              }}
            >
              {dirtyUnitIds.length > 0
                ? `${dirtyUnitIds.length} kaydedilmemiş değişiklik`
                : "Tüm değişiklikler kaydedildi"}
            </div>

            <div
              style={{
                marginTop: 3,
                color: "#64748B",
                fontSize: 10,
                lineHeight: 1.4,
                fontWeight: 750,
              }}
            >
              Seçili: {selectedUnitIds.length} • Toplam stok:{" "}
              {stock.units.length}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSaveUnits(dirtyUnitIds)}
            disabled={savingBulk || dirtyUnitIds.length === 0}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              minHeight: 50,
              background:
                dirtyUnitIds.length > 0
                  ? "linear-gradient(135deg, #047857, #10B981)"
                  : "#94A3B8",
              boxShadow:
                dirtyUnitIds.length > 0
                  ? "0 10px 24px rgba(16, 185, 129, 0.22)"
                  : "none",
              cursor:
                savingBulk || dirtyUnitIds.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {savingBulk ? (
              <Loader2 size={18} className="eph-spin" />
            ) : dirtyUnitIds.length > 0 ? (
              <Save size={18} />
            ) : (
              <Check size={18} />
            )}

            {savingBulk
              ? "Kaydediliyor"
              : dirtyUnitIds.length > 0
                ? `Tüm Değişiklikleri Kaydet (${dirtyUnitIds.length})`
                : "Tüm Değişiklikler Kaydedildi"}
          </button>
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<Search size={20} />}
          title="Stok Filtreleri"
          subtitle={`${filteredUnits.length} bağımsız bölüm gösteriliyor`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
            gap: 8,
            marginTop: 11,
          }}
        >
          <Field label="Ara">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="No, kod, oda veya konsept"
              style={inputStyle}
            />
          </Field>

          <Field label="Blok">
            <select
              value={blockFilter}
              onChange={(event) => setBlockFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="TUMU">Tüm bloklar</option>
              {blockOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Durum">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="TUMU">Tüm durumlar</option>
              {SALES_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Bağımsız bölüm türü">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="TUMU">Tüm türler</option>
              {typeOptions.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitTypeLabel(unitType)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Oda sayısı">
            <select
              value={roomFilter}
              onChange={(event) => setRoomFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="TUMU">Tüm oda tipleri</option>
              {roomOptions.map((roomCount) => (
                <option key={roomCount} value={roomCount}>
                  {roomCount}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>


      {filteredUnits.length === 0 ? (
        <section
          style={{
            ...cardStyle,
            padding: 18,
            textAlign: "center",
          }}
        >
          <AlertTriangle size={25} color="#B45309" />
          <h3
            style={{
              margin: "8px 0 0",
              color: "#334155",
              fontSize: 14,
              fontWeight: 950,
            }}
          >
            Filtreye uygun stok bulunamadı
          </h3>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 10,
          }}
        >
          {filteredUnits.map((unit, index) => {
            const draft = drafts[unit.id] || {
              price: unit.price > 0 ? salesPriceDigits(unit.price) : "",
              status: unit.status,
            };
            const statusPalette = salesStatusPalette(draft.status);
            const cardPalette =
              identityPaletteMap.get(salesUnitIdentity(unit)) ||
              salesUnitCardPalette(unit);
            const saving = savingBulk;
            const selected = selectedSet.has(unit.id);
            const dirty = isSalesDraftDirty(unit, draft);
            const matchingCount = stock.units.filter(
              (candidate) =>
                salesUnitIdentity(candidate) === salesUnitIdentity(unit),
            ).length;

            return (
              <article
                key={unit.id}
                style={{
                  minWidth: 0,
                  border: `${selected ? 3 : 1.5}px solid ${
                    selected ? "#2563EB" : cardPalette.border
                  }`,
                  borderRadius: 18,
                  background: cardPalette.background,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                  boxShadow: selected
                    ? "0 14px 32px rgba(37, 99, 235, 0.24)"
                    : "0 10px 26px rgba(15, 23, 42, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    minWidth: 0,
                  }}
                >
                  <label
                    style={{
                      width: 24,
                      height: 24,
                      flex: "0 0 24px",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      border: selected
                        ? "1.5px solid #2563EB"
                        : `1.5px solid ${cardPalette.border}`,
                      background: selected ? "#2563EB" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleUnitSelection(unit.id)}
                      style={{ position: "absolute", opacity: 0 }}
                    />
                    {selected && <Check size={16} color="#FFFFFF" />}
                  </label>

                  <div
                    style={{
                      width: 46,
                      height: 46,
                      flex: "0 0 46px",
                      borderRadius: 13,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.72)",
                      color: cardPalette.accent,
                      border: `1px solid ${cardPalette.border}`,
                      fontSize: 11,
                      fontWeight: 950,
                      overflowWrap: "anywhere",
                      textAlign: "center",
                    }}
                  >
                    {unit.number || index + 1}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        color: cardPalette.accent,
                        fontSize: 14,
                        lineHeight: 1.35,
                        fontWeight: 950,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {unit.inventoryCode || unit.number || "Bağımsız Bölüm"}
                    </h3>
                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#475569",
                        fontSize: 10,
                        lineHeight: 1.45,
                        fontWeight: 800,
                      }}
                    >
                      {[
                        unit.block?.name || unit.block?.code,
                        unit.projectFloor?.label || unit.floorLabel,
                        unitTypeLabel(unit.type),
                        unit.roomCount,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>

                  <span
                    style={{
                      border: `1px solid ${statusPalette.border}`,
                      borderRadius: 999,
                      background: statusPalette.background,
                      color: statusPalette.color,
                      padding: "5px 8px",
                      fontSize: 9,
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {salesStatusLabel(draft.status)}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 7,
                  }}
                >
                  <Metric
                    label="Net Alan"
                    value={
                      unit.netArea === null ? "—" : `${unit.netArea} m²`
                    }
                  />
                  <Metric
                    label="Brüt Alan"
                    value={
                      unit.grossArea === null ? "—" : `${unit.grossArea} m²`
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                    gap: 8,
                  }}
                >
                  <Field label="Liste fiyatı">
                    <div style={{ position: "relative" }}>
                      <input
                        value={formatSalesPriceInput(draft.price)}
                        onChange={(event) =>
                          onDraftChange(
                            unit.id,
                            "price",
                            salesPriceDigits(event.target.value),
                          )
                        }
                        inputMode="numeric"
                        placeholder="Ör. 4.750.000"
                        disabled={saving}
                        style={{
                          ...inputStyle,
                          paddingRight: 48,
                          background: "rgba(255,255,255,0.78)",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: 13,
                          transform: "translateY(-50%)",
                          color: cardPalette.accent,
                          fontSize: 11,
                          fontWeight: 950,
                          pointerEvents: "none",
                        }}
                      >
                        TL
                      </span>
                    </div>
                  </Field>

                  <Field label="Satış durumu">
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        onDraftChange(
                          unit.id,
                          "status",
                          event.target.value,
                        )
                      }
                      disabled={saving}
                      style={{
                        ...inputStyle,
                        background: "rgba(255,255,255,0.78)",
                      }}
                    >
                      {SALES_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => applyToIdenticalUnits(unit)}
                    disabled={saving || matchingCount <= 1}
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      borderColor: cardPalette.border,
                      background: "rgba(255,255,255,0.72)",
                      color: cardPalette.accent,
                    }}
                  >
                    <Sparkles size={17} />
                    Aynı Özelliktekilere Uygula ({matchingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => void onSaveUnit(unit.id)}
                    disabled={saving || !dirty}
                    style={{
                      ...primaryButtonStyle,
                      width: "100%",
                      background: dirty
                        ? "linear-gradient(135deg, #047857, #10B981)"
                        : "#94A3B8",
                      boxShadow: dirty
                        ? "0 10px 24px rgba(16, 185, 129, 0.20)"
                        : "none",
                    }}
                  >
                    {saving ? (
                      <Loader2 size={18} className="eph-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Bu Kartı Kaydet
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}


      <section
        aria-label="Satış stoku toplu kayıt paneli"
        style={{
          ...cardStyle,
          borderColor:
            dirtyUnitIds.length > 0 ? "#10B981" : "#94A3B8",
          background:
            dirtyUnitIds.length > 0
              ? "linear-gradient(135deg, #ECFDF5, #FFFFFF)"
              : "#F8FAFC",
          padding: 12,
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              minWidth: 0,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color:
                  dirtyUnitIds.length > 0 ? "#047857" : "#64748B",
                fontSize: 12,
                lineHeight: 1.4,
                fontWeight: 950,
              }}
            >
              {dirtyUnitIds.length > 0
                ? `${dirtyUnitIds.length} kaydedilmemiş değişiklik`
                : "Tüm değişiklikler kaydedildi"}
            </div>

            <div
              style={{
                marginTop: 3,
                color: "#64748B",
                fontSize: 10,
                lineHeight: 1.4,
                fontWeight: 750,
              }}
            >
              Seçili: {selectedUnitIds.length} • Toplam stok:{" "}
              {stock.units.length}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSaveUnits(dirtyUnitIds)}
            disabled={savingBulk || dirtyUnitIds.length === 0}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              minHeight: 50,
              background:
                dirtyUnitIds.length > 0
                  ? "linear-gradient(135deg, #047857, #10B981)"
                  : "#94A3B8",
              boxShadow:
                dirtyUnitIds.length > 0
                  ? "0 10px 24px rgba(16, 185, 129, 0.22)"
                  : "none",
              cursor:
                savingBulk || dirtyUnitIds.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {savingBulk ? (
              <Loader2 size={18} className="eph-spin" />
            ) : dirtyUnitIds.length > 0 ? (
              <Save size={18} />
            ) : (
              <Check size={18} />
            )}

            {savingBulk
              ? "Kaydediliyor"
              : dirtyUnitIds.length > 0
                ? `Tüm Değişiklikleri Kaydet (${dirtyUnitIds.length})`
                : "Tüm Değişiklikler Kaydedildi"}
          </button>
        </div>
      </section>

      <div
        aria-hidden="true"
        style={{
          height: "calc(36px + env(safe-area-inset-bottom))",
        }}
      />
    </div>
  );
}

