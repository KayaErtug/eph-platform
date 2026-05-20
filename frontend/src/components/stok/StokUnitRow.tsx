import Link from "next/link";
import type { Project, Unit } from "./stokTypes";
import { STATUS_LABELS, TYPE_LABELS, getStatusStyle } from "./stokConstants";

type Props = {
  unit: Unit;
  project?: Project;
  variant?: "small" | "big";
};

export default function StokUnitRow({ unit, project, variant = "big" }: Props) {
  const statusStyle = getStatusStyle(unit.status);
  const p = project || unit.project;

  if (variant === "small") {
    return (
      <Link href={`/stok/${unit.id}`} className="st-unit-card">
        <div className="st-unit-img">
          <div className="st-unit-img-icon">🏠</div>
          <div className="st-unit-img-badge">{STATUS_LABELS[unit.status]}</div>
        </div>

        <div className="st-unit-body">
          <div>
            <div className="st-unit-title">
              {p?.name} · {TYPE_LABELS[unit.type] || unit.type}
            </div>
            <div className="st-unit-loc">
              📍 {p?.city} / {p?.district}{p?.address ? ` — ${p.address}` : ""}
            </div>
          </div>

          <div className="st-unit-tags">
            {unit.roomCount && <span className="st-unit-tag">{unit.roomCount}</span>}
            {unit.area && <span className="st-unit-tag">{unit.area} m²</span>}
            {unit.floor != null && <span className="st-unit-tag">Kat {unit.floor}</span>}
            {unit.number && <span className="st-unit-tag">No: {unit.number}</span>}
          </div>

          <div className="st-unit-footer">
            <div className="st-unit-price-big">{unit.price?.toLocaleString("tr-TR")} TL</div>
            <span className="st-unit-status" style={{ borderColor: statusStyle.color, color: statusStyle.color, background: statusStyle.bg }}>
              {STATUS_LABELS[unit.status]}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/stok/${unit.id}`} className="st-unit-big">
      <div className="st-unit-big-img">
        <span style={{ fontSize: 28, opacity: 0.3 }}>🏠</span>
        <div className="st-unit-big-badge">{STATUS_LABELS[unit.status]}</div>
      </div>

      <div className="st-unit-big-body">
        <div>
          <div className="st-unit-big-project">
            {p?.name} · {TYPE_LABELS[unit.type] || unit.type}
          </div>
          <div className="st-unit-big-loc">📍 {p?.city} / {p?.district}</div>
        </div>

        <div className="st-unit-big-tags">
          {unit.roomCount && <span className="st-unit-big-tag">{unit.roomCount}</span>}
          {unit.area && <span className="st-unit-big-tag">{unit.area} m²</span>}
          {unit.floor != null && <span className="st-unit-big-tag">Kat {unit.floor}</span>}
          {unit.number && <span className="st-unit-big-tag">No: {unit.number}</span>}
        </div>

        <div className="st-unit-big-footer">
          <div className="st-unit-big-price">{unit.price?.toLocaleString("tr-TR")} TL</div>
          <span className="st-unit-status" style={{ borderColor: statusStyle.color, color: statusStyle.color, background: statusStyle.bg, fontSize: "9px", padding: "3px 10px" }}>
            {STATUS_LABELS[unit.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}
