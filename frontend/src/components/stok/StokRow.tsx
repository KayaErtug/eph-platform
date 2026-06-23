import { useRouter } from "next/navigation";
import { Building2, ChevronRight, MapPin } from "lucide-react";

import { TYPE_LABELS } from "./stokConstants";
import StokStatusBadge from "./StokStatusBadge";
import type { Unit } from "./stokTypes";

function formatMoney(value?: number) {
  if (value == null) return "-";

  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

export default function StokRow({ unit }: { unit: Unit }) {
  const router = useRouter();

  const projectName = unit.project?.name || "Proje";
  const city = unit.project?.city || "-";
  const district = unit.project?.district || "-";
  const neighborhood = unit.project?.address || "-";
  const ownerInitial = (
    unit.project?.owner?.firstName?.[0] || "E"
  ).toUpperCase();

  return (
    <tr
      className="stock-data-row"
      onClick={() => router.push(`/stok/${unit.id}`)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          router.push(`/stok/${unit.id}`);
        }
      }}
    >
      <td className="stock-check-cell" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" aria-label="İlan seç" />
      </td>

      <td className="stock-main-cell">
        <div className="stock-property-cell">
          <div className="stock-property-thumb">
            <Building2 size={21} />
          </div>

          <div className="stock-property-meta">
            <div className="stock-property-title">
              {projectName}
            </div>

            <div className="stock-property-sub">
              <MapPin size={13} />

              <span>
                {[city, district, neighborhood].filter((item) => item && item !== "-").join(" / ") || "-"}
              </span>
            </div>

            <div className="stock-property-subtle">
              {TYPE_LABELS[unit.type] || unit.type}
              {unit.number ? ` · No ${unit.number}` : ""}
            </div>
          </div>
        </div>
      </td>

      <td>
        <StokStatusBadge status={unit.status} />
      </td>

      <td>
        <div className="stock-tags">
          {unit.roomCount && <span>{unit.roomCount}</span>}
          {unit.area && <span>{unit.area} m²</span>}
          {unit.floor != null && <span>Kat {unit.floor}</span>}
        </div>
      </td>

      <td className="stock-price-cell">{formatMoney(unit.price)}</td>

      <td>
        <div className="stock-owner-cell">
          <div className="stock-avatar">{ownerInitial}</div>

          <div>
            <div className="stock-owner-name">
              {unit.project?.owner?.firstName || "-"}{" "}
              {unit.project?.owner?.lastName || ""}
            </div>

            <div className="stock-owner-role">Portföy danışmanı</div>
          </div>
        </div>
      </td>

      <td className="stock-date-cell">{formatDate(unit.createdAt)}</td>

      <td className="stock-verify-cell">
        <div className="stock-verify-pills">
          {unit.tapuVerified && <span>Tapu</span>}
          {unit.photoVerified && <span>Fotoğraf</span>}
          {unit.yetkiVerified && <span>Yetki</span>}

          {!unit.tapuVerified &&
            !unit.photoVerified &&
            !unit.yetkiVerified && <em>Bekliyor</em>}
        </div>
      </td>

      <td className="stock-action-cell">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/stok/${unit.id}`);
          }}
          aria-label="İlan detayını aç"
        >
          <ChevronRight size={18} />
        </button>
      </td>
    </tr>
  );
}