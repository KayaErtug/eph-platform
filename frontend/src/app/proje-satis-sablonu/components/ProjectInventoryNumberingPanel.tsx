"use client";

import { Hash, ListOrdered, Rows3 } from "lucide-react";

import type {
  FloorPlanForm,
  ProjectNumberingMode,
} from "../lib/projectSalesTypes";
import { unitTypeLabel } from "../lib/projectSalesFormatters";
import { cardStyle } from "../lib/projectSalesStyles";
import { buildProjectNumberingRows } from "../lib/projectSalesNumbering";
import { SectionTitle } from "./ProjectSalesPrimitives";

export function ProjectInventoryNumberingPanel({
  floorPlans,
  numberingMode,
  disabled,
  onChange,
}: {
  floorPlans: FloorPlanForm[];
  numberingMode: ProjectNumberingMode;
  disabled: boolean;
  onChange: (mode: ProjectNumberingMode) => void;
}) {
  const rows = buildProjectNumberingRows(floorPlans, numberingMode);
  const firstExamples = rows.slice(0, 4).map((row) => row.number);

  return (
    <section
      style={{
        ...cardStyle,
        borderColor: "#93C5FD",
        background: "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 55%, #F0FDF4 100%)",
        padding: 13,
      }}
    >
      <SectionTitle
        icon={<Hash size={20} />}
        title="Otomatik Bağımsız Bölüm Numaralandırma"
        subtitle="Bir yöntemi seçin; tüm mağaza, ofis ve daireler otomatik numaralandırılarak aşağıdaki tabloya yerleşsin."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
          gap: 9,
          marginTop: 12,
        }}
      >
        <NumberingChoice
          active={numberingMode === "CONTINUOUS"}
          disabled={disabled}
          icon={<ListOrdered size={19} />}
          title="Blok İçinde Sıralı"
          description="Zemin Z-1, Z-2... olur. Sonraki normal katlar önceki katın devamından gider: 1. kat 5, 6...; 6. kat 25, 26..."
          example="A-BLOK-Z-1 → A-BLOK-5 → A-BLOK-25"
          onClick={() => onChange("CONTINUOUS")}
        />

        <NumberingChoice
          active={numberingMode === "FLOOR_CODED"}
          disabled={disabled}
          icon={<Rows3 size={19} />}
          title="Kat Kodlu"
          description="Her kat kendi koduyla başlar. Zemin Z-1, Z-2...; 1. kat 101, 102...; 6. kat 601, 602... şeklinde ilerler."
          example="A-BLOK-Z-1 → A-BLOK-101 → A-BLOK-601"
          onClick={() => onChange("FLOOR_CODED")}
        />
      </div>

      <div
        style={{
          marginTop: 11,
          border: "1.5px solid #BFDBFE",
          borderRadius: 14,
          background: "#FFFFFF",
          padding: 10,
          color: "#1E3A8A",
          fontSize: 10,
          lineHeight: 1.55,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        {numberingMode === "CONTINUOUS"
          ? "Sıralı yöntemde bodrum katlar kendi B1-1, B2-1 serisini kullanır; zemin ve normal katlar blok içinde kesintisiz devam eder."
          : "Kat kodlu yöntemde her katın sıra numarası 1’den başlar; kat seviyesi numaranın başına otomatik eklenir."}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ color: "#0F172A", fontSize: 12, fontWeight: 950 }}>
          Otomatik Numara Tablosu
        </strong>
        <span
          style={{
            borderRadius: 999,
            background: "#DBEAFE",
            color: "#1D4ED8",
            padding: "5px 9px",
            fontSize: 10,
            fontWeight: 950,
          }}
        >
          {rows.length} bağımsız bölüm
        </span>
      </div>

      {firstExamples.length > 0 && (
        <p
          style={{
            margin: "7px 0 0",
            color: "#475569",
            fontSize: 10,
            lineHeight: 1.5,
            fontWeight: 750,
            textAlign: "center",
          }}
        >
          Örnek: {firstExamples.join(" • ")}
        </p>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            marginTop: 10,
            border: "1.5px dashed #93C5FD",
            borderRadius: 14,
            background: "#F8FAFC",
            padding: 18,
            color: "#64748B",
            fontSize: 11,
            lineHeight: 1.55,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          Katlardaki bağımsız bölüm türlerini ve adetlerini girdikçe numaralar burada otomatik oluşacak.
        </div>
      ) : (
        <div
          style={{
            marginTop: 10,
            maxHeight: 520,
            overflow: "auto",
            border: "1.5px solid #CBD5E1",
            borderRadius: 14,
            background: "#FFFFFF",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 640,
              borderCollapse: "collapse",
              fontSize: 10,
            }}
          >
            <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#EAF2FF" }}>
              <tr>
                {['Sıra', 'Blok', 'Kat', 'Tür', 'Otomatik Numara'].map((label) => (
                  <th
                    key={label}
                    style={{
                      borderBottom: "1.5px solid #BFDBFE",
                      padding: "9px 8px",
                      color: "#1E3A8A",
                      textAlign: "left",
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td style={cellStyle}>{row.rowNumber}</td>
                  <td style={cellStyle}>{row.blockCode}</td>
                  <td style={cellStyle}>{row.floorLabel}</td>
                  <td style={cellStyle}>{unitTypeLabel(row.type)}</td>
                  <td style={{ ...cellStyle, color: "#1557D6", fontWeight: 950 }}>
                    {row.number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function NumberingChoice({
  active,
  disabled,
  icon,
  title,
  description,
  example,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      style={{
        border: active ? "2px solid #2563EB" : "1.5px solid #C7D6E8",
        borderRadius: 16,
        background: active ? "#EAF2FF" : "#FFFFFF",
        padding: 12,
        display: "grid",
        gap: 7,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        boxShadow: active ? "0 10px 24px rgba(37, 99, 235, 0.14)" : "none",
      }}
    >
      <span style={{ color: active ? "#1557D6" : "#64748B" }}>{icon}</span>
      <strong style={{ color: "#0F172A", fontSize: 12, fontWeight: 950 }}>
        {active ? "✓ " : ""}{title}
      </strong>
      <span style={{ color: "#475569", fontSize: 10, lineHeight: 1.55, fontWeight: 750 }}>
        {description}
      </span>
      <span
        style={{
          borderRadius: 10,
          background: active ? "#DBEAFE" : "#F1F5F9",
          color: active ? "#1D4ED8" : "#475569",
          padding: "7px 8px",
          fontSize: 9,
          lineHeight: 1.4,
          fontWeight: 900,
        }}
      >
        {example}
      </span>
    </button>
  );
}

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #E2E8F0",
  padding: "8px",
  color: "#334155",
  fontWeight: 750,
  whiteSpace: "nowrap",
};
