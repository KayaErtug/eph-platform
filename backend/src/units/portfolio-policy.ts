import { Role, UnitStatus } from '@prisma/client';

export const PORTFOLIO_APPROVAL_ENABLED = false;

const PORTFOLIO_BUSINESS_ROLES = new Set<string>([
  Role.EMLAKCI,
  Role.MUTEAHHIT,
  Role.INSAAT_FIRMASI,
]);

const PORTFOLIO_LIMIT_EXEMPT_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
  UnitStatus.PASIF,
]);

export function normalizePortfolioRole(role?: Role | string | null) {
  return String(role || '').trim().toUpperCase();
}

export function isPortfolioBusinessRole(role?: Role | string | null) {
  return PORTFOLIO_BUSINESS_ROLES.has(normalizePortfolioRole(role));
}

export function canPublishPortfolioDirectly(role?: Role | string | null) {
  if (normalizePortfolioRole(role) === Role.SUPER_ADMIN) {
    return true;
  }

  return (
    isPortfolioBusinessRole(role) &&
    !PORTFOLIO_APPROVAL_ENABLED
  );
}

export function requiresPortfolioApproval(role?: Role | string | null) {
  return (
    isPortfolioBusinessRole(role) &&
    PORTFOLIO_APPROVAL_ENABLED
  );
}

export function countsAgainstActivePortfolioLimit(
  status?: UnitStatus | string | null,
) {
  const normalizedStatus = String(
    status || UnitStatus.SATILIK,
  )
    .trim()
    .toUpperCase() as UnitStatus;

  return !PORTFOLIO_LIMIT_EXEMPT_STATUSES.has(normalizedStatus);
}
