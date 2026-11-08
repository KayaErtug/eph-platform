export const LABEL_MODES = ['always', 'hidden', 'selected'];
export function unitLabel({ level, number, roomCount, usage, grossArea, netArea, area }) {
  const floor = level === 0 ? 'Zemin kat' : `${level}. kat`;
  if (level === 0 || usage === 'shop') {
    const size = [grossArea, netArea, area].find(value => value != null && Number.isFinite(Number(value)) && Number(value) > 0);
    return `${floor} ${number} nolu bağımsız bölüm${size ? ` (${Number(size).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²)` : ' (m² belirtilmedi)'}`;
  }
  return `${floor} Daire ${number}${roomCount ? ` (${roomCount})` : ''}`;
}
export function labelVisible(mode, unitId, clickedUnitId) {
  return mode === 'always' || (mode === 'selected' && unitId === clickedUnitId);
}
