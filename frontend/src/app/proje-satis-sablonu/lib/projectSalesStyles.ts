import type { CSSProperties } from "react";

export const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 44,
  boxSizing: "border-box",
  border: "1.5px solid #C7D6E8",
  borderRadius: 13,
  background: "#EEF3F8",
  color: "#1F2937",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 750,
  outline: "none",
};

export const cardStyle: CSSProperties = {
  border: "1.5px solid #C7D6E8",
  borderRadius: 20,
  background: "#FFFFFF",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

export const FLOOR_CARD_PALETTES = [
  { background: "#DCEAFF", border: "#77A7E8", badgeBackground: "#BDD7FA", badgeColor: "#123F91" },
  { background: "#D9F0E2", border: "#72B58F", badgeBackground: "#BCE2CC", badgeColor: "#075E38" },
  { background: "#F6E3BE", border: "#D3A653", badgeBackground: "#ECD092", badgeColor: "#7A4307" },
  { background: "#E8DCF7", border: "#A886D5", badgeBackground: "#D3BFEF", badgeColor: "#55218C" },
  { background: "#F5D9E3", border: "#D887A4", badgeBackground: "#EDBFD0", badgeColor: "#8E1949" },
];

export const UNIT_GROUP_PALETTES = [
  { background: "#FFFFFF", border: "#BCD4F3" },
  { background: "#F3FCF7", border: "#B7E4CC" },
  { background: "#FFF9EF", border: "#EFD2A3" },
  { background: "#FAF7FF", border: "#D6C3F0" },
];

export const PROJECT_SPACE_CARD_PALETTES = [
  {
    background: "#F3FCF7",
    border: "#A7DFC2",
    badgeBackground: "#DDF8E9",
    badgeColor: "#047857",
  },
  {
    background: "#F6FAFF",
    border: "#BAD4F4",
    badgeBackground: "#E2EFFF",
    badgeColor: "#1557D6",
  },
  {
    background: "#FFF9EF",
    border: "#EED2A5",
    badgeBackground: "#FEF3C7",
    badgeColor: "#B45309",
  },
  {
    background: "#FAF7FF",
    border: "#D5C2EF",
    badgeBackground: "#EDE9FE",
    badgeColor: "#6D28D9",
  },
];

export const primaryButtonStyle: CSSProperties = {
  minHeight: 44,
  border: "none",
  borderRadius: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: "linear-gradient(135deg, #1557D6, #2563EB)",
  color: "#FFFFFF",
  padding: "9px 14px",
  fontSize: 12,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.20)",
};

export const secondaryButtonStyle: CSSProperties = {
  minHeight: 44,
  border: "1.5px solid #C7D6E8",
  borderRadius: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: "#FFFFFF",
  color: "#334155",
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxSizing: "border-box",
};

