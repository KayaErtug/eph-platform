import { Logger } from '@nestjs/common';

const logger = new Logger('OfficeTeamQuota');

/**
 * Ofis takım kotası: paketin ayardaki maxTeams alanı. §0-B: kodda yedek tablo YOKTUR (ODM-7G-D F11/F13).
 * Alan yoksa/geçersizse 0 = KAPALI (fail-closed: takım açılamaz) ve uyarı kaydı yazılır; okuma uçları çökmez.
 */
export function resolveMaxTeams(pkg: { maxTeams?: unknown } | null | undefined): number {
  const configured = pkg?.maxTeams;
  if (typeof configured === 'number' && Number.isInteger(configured) && configured >= 0) return configured;
  logger.warn('Paket ayarında maxTeams yok/geçersiz; takım kotası 0 (kapalı) kabul edildi.');
  return 0;
}
