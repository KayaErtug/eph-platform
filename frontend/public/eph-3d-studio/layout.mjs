// Kat planı: çizimden önce her kat için bölüm listesi (numara, tip, m², ön/arka) çıkarılır; çizim yalnız bu listeyi kullanır.
const FRONT_WORDS = new Set(['ÖN', 'ON', 'CADDE', 'FRONT']);
const REAR_WORDS = new Set(['ARKA', 'REAR', 'BAHÇE', 'BAHCE']);
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const median = values => { const sorted = [...values].sort((a, b) => a - b), mid = sorted.length >> 1; return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

// Tanınan cephe değeri yalnız tercih sayılır; sayı kuralı her zaman geçerlidir. Tanınmayan değer (KUZEY, GUNEY...) yok sayılır.
export function facadeHint(facades) {
  const words = new Set((facades || []).flatMap(value => String(value).toLocaleUpperCase('tr-TR').split(/[^A-ZÇĞİÖŞÜ]+/)));
  const front = [...words].some(word => FRONT_WORDS.has(word)), rear = [...words].some(word => REAR_WORDS.has(word));
  return front === rear ? null : front ? 'front' : 'rear';
}

// "3+1" -> 4, "2+1" -> 3, "1+1" -> 2. Tanınmazsa null.
export function roomScore(roomCount) {
  const text = String(roomCount ?? ''), pair = text.match(/(\d+)\s*\+\s*(\d+)/);
  if (pair) return Number(pair[1]) + Number(pair[2]);
  const single = text.match(/\d+/);
  return single ? Number(single[0]) : null;
}

// Satır başına ön sayısı: 1 -> tek, 2 -> 1+1, 3 -> 2+1, 4 -> 2+2, 5+ -> dengeli (ön fazla).
export const frontCountFor = total => total <= 2 ? 1 : Math.ceil(total / 2);

// Genişlik ağırlığı: net m²; yoksa oda sayısı (m²'si bilinenlerden ölçeklenir); o da yoksa ortanca.
function weigh(entries) {
  const known = entries.filter(entry => entry.area), scored = entries.filter(entry => entry.score != null);
  const both = known.filter(entry => entry.score != null);
  const scoreOnly = scored.filter(entry => !entry.area);
  const ratio = both.length ? mean(both.map(entry => entry.area / entry.score)) : known.length && scoreOnly.length ? median(known.map(entry => entry.area)) / mean(scoreOnly.map(entry => entry.score)) : 1;
  const fallback = known.length ? median(known.map(entry => entry.area)) : scored.length ? mean(scored.map(entry => entry.score)) : 1;
  return entries.map(entry => entry.area ?? (entry.score != null ? entry.score * ratio : fallback));
}

// Saf fonksiyon. units: aynı kattaki ham bölümler (veri sırasıyla). Dönüş: her bölüm için { id, number, type, usage, area, side, order, weight }.
export function planFloor(units, isShop) {
  const entries = units.map((unit, index) => {
    const net = positive(unit.netArea) ?? positive(unit.area) ?? positive(unit.grossArea);
    return { unit, index, shop: isShop(unit), hint: facadeHint(unit.facades), area: net, score: roomScore(unit.roomCount) };
  });
  const total = entries.length, shops = entries.filter(entry => entry.shop).length;
  const front = total === 1 ? 1 : Math.max(frontCountFor(total), shops);
  const rank = { front: 0, null: 1, rear: 2 };
  const chosen = new Set(entries.filter(entry => entry.shop).map(entry => entry.index));
  entries.filter(entry => !entry.shop).sort((a, b) => rank[a.hint] - rank[b.hint] || a.index - b.index).slice(0, Math.max(0, front - shops)).forEach(entry => chosen.add(entry.index));
  const weights = weigh(entries), order = { front: 0, rear: 0 };
  return entries.map((entry, i) => {
    const side = chosen.has(entry.index) ? 'front' : 'rear', { unit } = entry;
    return { id: unit.id, number: unit.number || unit.inventoryCode || String(entry.index + 1), type: unit.roomCount || '', usage: entry.shop ? 'shop' : 'residential',
      area: entry.area, side, order: order[side]++, weight: weights[i] };
  });
}

// Satır genişliğini ağırlıkla paylaştırır; en küçük genişlik altına düşenler sabitlenir.
export function splitWidths(weights, total, minWidth) {
  const count = weights.length;
  if (!count) return [];
  if (minWidth * count >= total) return weights.map(() => total / count);
  const widths = new Array(count).fill(0), fixed = new Set();
  for (;;) {
    const freeWeight = weights.reduce((sum, weight, i) => fixed.has(i) ? sum : sum + weight, 0), room = total - fixed.size * minWidth;
    let changed = false;
    weights.forEach((weight, i) => {
      if (fixed.has(i)) { widths[i] = minWidth; return; }
      widths[i] = room * weight / freeWeight;
      if (widths[i] < minWidth) { fixed.add(i); changed = true; }
    });
    if (!changed) return widths;
  }
}

// Plandaki satırlara ölçü verir: ön/arka ikisi de doluysa derinlik yarıya iner.
export function placeFloor(plan, width, depth, minWidth = 2.6 * width / 20) {
  const both = plan.some(item => item.side === 'front') && plan.some(item => item.side === 'rear');
  const placed = [];
  for (const side of ['front', 'rear']) {
    const row = plan.filter(item => item.side === side), widths = splitWidths(row.map(item => item.weight), width, minWidth);
    let cursor = -width / 2;
    row.forEach((item, i) => {
      placed.push({ ...item, width: widths[i], x: cursor + widths[i] / 2, depth: both ? depth / 2 : depth, z: both ? (side === 'front' ? 1 : -1) * depth / 4 : 0, slot: item.order % 2 });
      cursor += widths[i];
    });
  }
  return placed;
}
