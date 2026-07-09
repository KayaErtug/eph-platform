import type { ReactNode } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        minWidth: 0,
        color: "#334155",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "42px minmax(0, 1fr) 42px",
        alignItems: "center",
        gap: 9,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
          borderRadius: 13,
          background: "#EAF2FF",
          color: "#1557D6",
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0, textAlign: "center" }}>
        <h2
          style={{
            margin: 0,
            color: "#1F2937",
            fontSize: 15,
            lineHeight: 1.3,
            fontWeight: 950,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "3px 0 0",
            color: "#64748B",
            fontSize: 10,
            lineHeight: 1.45,
            fontWeight: 700,
          }}
        >
          {subtitle}
        </p>
      </div>

      <div aria-hidden="true" style={{ width: 42, height: 42 }} />
    </div>
  );
}

export function Metric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #D6E2F0",
        borderRadius: 12,
        background: "#FFFFFF",
        padding: "7px 5px",
        textAlign: "center",
      }}
    >
      <strong
        style={{
          display: "block",
          color: "#1F2937",
          fontSize: 14,
          fontWeight: 950,
        }}
      >
        {value}
      </strong>
      <span
        style={{
          display: "block",
          marginTop: 2,
          color: "#64748B",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function InfoBand({
  tone,
  children,
}: {
  tone: "info" | "warning" | "error";
  children: ReactNode;
}) {
  const palette =
    tone === "error"
      ? {
          border: "#FCA5A5",
          background: "#FEF2F2",
          color: "#B91C1C",
        }
      : tone === "warning"
        ? {
            border: "#FED7AA",
            background: "#FFF7ED",
            color: "#9A3412",
          }
        : {
            border: "#BFDBFE",
            background: "#EFF6FF",
            color: "#1D4ED8",
          };

  return (
    <div
      style={{
        marginTop: 10,
        border: `1.5px solid ${palette.border}`,
        borderRadius: 14,
        background: palette.background,
        color: palette.color,
        padding: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        fontSize: 11,
        lineHeight: 1.5,
        fontWeight: 800,
      }}
    >
      {tone === "info" ? (
        <Sparkles size={18} style={{ flex: "0 0 auto" }} />
      ) : (
        <AlertTriangle size={18} style={{ flex: "0 0 auto" }} />
      )}
      <span>{children}</span>
    </div>
  );
}

