import StokRow from "./StokRow";
import type { Unit } from "./stokTypes";

export default function StokTable({ units }: { units: Unit[] }) {
  if (units.length === 0) {
    return (
      <div className="stock-empty-state">
        <div className="stock-empty-icon">⌕</div>
        <div className="stock-empty-title">İlan bulunamadı</div>
        <div className="stock-empty-text">Arama veya filtre kriterlerini değiştirip tekrar deneyin.</div>
      </div>
    );
  }

  return (
    <div className="stock-table-shell">
      <table className="stock-data-table">
        <thead>
          <tr>
            <th className="stock-check-cell"><input type="checkbox" aria-label="Tümünü seç" /></th>
            <th>İlan / Proje</th>
            <th>Durum</th>
            <th>Özellikler</th>
            <th>Fiyat</th>
            <th>Danışman</th>
            <th>Kayıt</th>
            <th>Doğrulama</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{units.map((unit) => <StokRow key={unit.id} unit={unit} />)}</tbody>
      </table>
    </div>
  );
}
