import { STATUS_GROUPS, STATUS_LABELS } from "./stokConstants";

interface Props {
  search: string; setSearch: (value: string) => void;
  statusFilter: string; setStatusFilter: (value: string) => void;
  cityFilter: string; setCityFilter: (value: string) => void;
  visibleCount: number; totalCount: number;
  onAdd: () => void; onLina: () => void; canAddUnit: boolean;
}

export default function StokToolbar({
  search, setSearch, statusFilter, setStatusFilter, cityFilter, setCityFilter,
  visibleCount, totalCount, onAdd, onLina, canAddUnit,
}: Props) {
  return (
    <div className="stock-toolbar-v2">
      <div className="stock-toolbar-top">
        <div>
          <div className="stock-section-kicker">Inventory</div>
          <h2>Portföy Tablosu</h2>
          <p>{visibleCount} / {totalCount} ilan gösteriliyor</p>
        </div>
        <div className="stock-toolbar-actions">
          <button className="stock-soft-btn" onClick={onLina}>🤖 Lina</button>
          {canAddUnit && <button className="stock-dark-btn" onClick={onAdd}>+ Yeni İlan</button>}
        </div>
      </div>
      <div className="stock-filter-grid">
        <label className="stock-filter-field stock-search-field">
          <span>Arama</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Proje, şehir, mahalle, no..." />
        </label>
        <label className="stock-filter-field">
          <span>Durum</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            {STATUS_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.statuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="stock-filter-field">
          <span>Şehir</span>
          <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Denizli" />
        </label>
      </div>
    </div>
  );
}
