import { STATUS_COLORS, STATUS_LABELS } from "./stokConstants";

export default function StokStatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] || { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" };
  return (
    <span className="stock-status-badge" style={{ color: style.color, background: style.bg, borderColor: style.border }}>
      <span className="stock-status-dot" style={{ background: style.dot }} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
