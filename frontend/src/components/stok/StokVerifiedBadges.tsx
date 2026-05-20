import type { Unit } from "./stokTypes";

export default function StokVerifiedBadges({ unit }: { unit: Unit }) {
  if (!unit.tapuVerified && !unit.photoVerified && !unit.yetkiVerified) return null;

  return (
    <div className="st-badges">
      {unit.tapuVerified && <span className="st-badge-verified">✓ Tapu</span>}
      {unit.photoVerified && <span className="st-badge-verified">✓ Fotoğraf</span>}
      {unit.yetkiVerified && <span className="st-badge-verified">✓ Yetki</span>}
    </div>
  );
}
