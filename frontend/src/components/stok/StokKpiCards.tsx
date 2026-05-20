import type { Unit, Project } from "./stokTypes";

function money(value: number) {
  if (!value) return "0 TL";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mr TL`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mn TL`;
  return `${value.toLocaleString("tr-TR")} TL`;
}

export default function StokKpiCards({ units, projects }: { units: Unit[]; projects: Project[] }) {
  const sales = units.filter((u) => ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"].includes(u.status)).length;
  const rentals = units.filter((u) => ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"].includes(u.status)).length;
  const verified = units.filter((u) => u.tapuVerified || u.photoVerified || u.yetkiVerified).length;
  const value = units.reduce((sum, u) => sum + (Number(u.price) || 0), 0);

  const cards = [
    { label: "Toplam İlan", value: units.length, note: `${projects.length} proje`, tone: "dark" },
    { label: "Satış Stoğu", value: sales, note: "Aktif satış portföyü", tone: "green" },
    { label: "Kiralık", value: rentals, note: "Aktif kiralık portföy", tone: "blue" },
    { label: "Portföy Değeri", value: money(value), note: `${verified} doğrulanmış kayıt`, tone: "gold" },
  ];

  return (
    <div className="stock-kpi-v2-grid">
      {cards.map((card) => (
        <div key={card.label} className={`stock-kpi-v2 ${card.tone}`}>
          <div className="stock-kpi-v2-label">{card.label}</div>
          <div className="stock-kpi-v2-value">{card.value}</div>
          <div className="stock-kpi-v2-note">{card.note}</div>
        </div>
      ))}
    </div>
  );
}
