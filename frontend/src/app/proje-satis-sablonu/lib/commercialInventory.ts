export const isShop = (type: string) => ['DUKKAN_MAGAZA', 'MARKET', 'SHOWROOM'].includes(type);
type Group = { key: string; type: string; count: string; roomCount: string; netArea: string; grossArea: string };
export function expandShops<T extends Group>(groups: T[]): T[] {
  const used = new Set(groups.map(group => group.key));
  return groups.flatMap(group => isShop(group.type) && Number.isInteger(Number(group.count)) && Number(group.count) > 0 && Number(group.count) <= 500
    ? Array.from({ length: Number(group.count) }, (_, index) => { let key = group.key; if (index) { let suffix = index; do { key = `${group.key}-shop-${suffix++}`; } while (used.has(key)); used.add(key); } return { ...group, key, count: '1', roomCount: '' }; })
    : [group]);
}
export function shopError(groups: Group[]): string {
  for (const group of groups) {
    if (!isShop(group.type)) continue;
    if (group.count !== '1') return 'Her mağazayı ayrı satırda, 1 adet olarak tanımlayın.';
    const net = Number(group.netArea.replace(',', '.')), gross = Number(group.grossArea.replace(',', '.'));
    if (!Number.isFinite(net) || !Number.isFinite(gross) || net <= 0 || gross <= 0) return 'Her mağazanın net ve brüt m² bilgisini ayrı girin.';
    if (net > gross) return 'Mağazanın net alanı brüt alandan büyük olamaz.';
  }
  return '';
}
