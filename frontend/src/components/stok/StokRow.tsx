import { useRouter } from "next/navigation";
import { TYPE_LABELS } from "./stokConstants";
import StokStatusBadge from "./StokStatusBadge";
import type { Unit } from "./stokTypes";

function formatMoney(value?: number) {
  if (value == null) return "-";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("tr-TR"); } catch { return "-"; }
}

export default function StokRow({ unit }: { unit: Unit }) {
  const router = useRouter();

  return (
    <tr
      className="stock-data-row"
      onClick={() => router.push(`/stok/${unit.id}`)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/stok/${unit.id}`); }}
    >
      <td className="stock-check-cell" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" aria-label="İlan seç" />
      </td>
      <td className="stock-main-cell">
        <div className="stock-property-cell">
          <div className="stock-property-thumb"><span>🏡</span></div>
          <div className="stock-property-meta">
            <div className="stock-property-title">{unit.project?.name || "Proje"} · {TYPE_LABELS[unit.type] || unit.type}</div>
            <div className="stock-property-sub">
              {unit.project?.city || "-"} / {unit.project?.district || "-"}{unit.project?.address ? ` · ${unit.project.address}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td><StokStatusBadge status={unit.status} /></td>
      <td>
        <div className="stock-tags">
          {unit.roomCount && <span>{unit.roomCount}</span>}
          {unit.area && <span>{unit.area} m²</span>}
          {unit.floor != null && <span>Kat {unit.floor}</span>}
          {unit.number && <span>No {unit.number}</span>}
        </div>
      </td>
      <td className="stock-price-cell">{formatMoney(unit.price)}</td>
      <td>
        <div className="stock-owner-cell">
          <div className="stock-avatar">{(unit.project?.owner?.firstName?.[0] || "E").toUpperCase()}</div>
          <div>
            <div className="stock-owner-name">{unit.project?.owner?.firstName || "-"} {unit.project?.owner?.lastName || ""}</div>
            <div className="stock-owner-role">Portföy sahibi</div>
          </div>
        </div>
      </td>
      <td className="stock-date-cell">{formatDate(unit.createdAt)}</td>
      <td className="stock-verify-cell">
        <div className="stock-verify-pills">
          {unit.tapuVerified && <span>Tapu</span>}
          {unit.photoVerified && <span>Foto</span>}
          {unit.yetkiVerified && <span>Yetki</span>}
          {!unit.tapuVerified && !unit.photoVerified && !unit.yetkiVerified && <em>Bekliyor</em>}
        </div>
      </td>
      <td className="stock-action-cell">
        <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/stok/${unit.id}`); }}>Aç</button>
      </td>
    </tr>
  );
}
