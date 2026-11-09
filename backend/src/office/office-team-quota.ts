/**
 * Ofis takım kotası (PROVA-2, Mustafa abi kararı): paketin ayardaki maxTeams alanı varsa o;
 * yoksa ESKİ kuraldaki gibi danışman kapasitesinden türetilir (ODM-7G-D'de kaldırılan geri dönüş geri getirildi).
 * Basamak eşikleri eski koddakiyle aynıdır; ticari fiyat/paket değeri değildir. Kapasite yoksa/geçersizse 0 (kapalı).
 */
export function resolveMaxTeams(pkg: { maxTeams?: unknown } | null | undefined, agentCapacity: number): number {
  const configured = pkg?.maxTeams;
  if (typeof configured === 'number' && Number.isInteger(configured) && configured >= 0) return configured;
  if (agentCapacity >= 25) return 5;
  if (agentCapacity >= 15) return 3;
  if (agentCapacity >= 7) return 2;
  if (agentCapacity >= 1) return 1;
  return 0;
}
