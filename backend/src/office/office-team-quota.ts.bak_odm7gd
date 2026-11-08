// Ofis takım kotası: paketin maxTeams alanı; alan yoksa yalnız danışman kapasitesinden türetilen yedek tablo.
export function resolveMaxTeams(pkg: { maxTeams?: unknown } | null | undefined, agentCapacity: number): number {
  const configured = pkg?.maxTeams;
  if (typeof configured === 'number' && Number.isInteger(configured) && configured >= 0) return configured;
  if (agentCapacity >= 25) return 5;
  if (agentCapacity >= 15) return 3;
  if (agentCapacity >= 7) return 2;
  if (agentCapacity >= 1) return 1;
  return 0;
}
