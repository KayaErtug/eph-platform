import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ResolvedPermission = {
  enabled: boolean;
  numericLimit: number | null;
  metadata: Record<string, unknown> | null;
  source:
    | 'SUPER_ADMIN'
    | 'USER_OVERRIDE'
    | 'ROLE_POLICY'
    | 'PERMISSION_DEFAULT';
};

// Süper admin her zaman tüm yetkilere sahiptir (EPH_KURALLARI §0).
export async function resolvePermission(
  prisma: PrismaService,
  actorId: string,
  actorRole: Role,
  permissionKey: string,
): Promise<ResolvedPermission> {
  if (actorRole === Role.SUPER_ADMIN) {
    return { enabled: true, numericLimit: null, metadata: null, source: 'SUPER_ADMIN' };
  }

  const permission = await prisma.permissionDefinition.findUnique({
    where: { key: permissionKey },
  });

  if (!permission || !permission.active) {
    throw new ForbiddenException('Bu işlem için aktif yetki tanımı bulunamadı.');
  }

  if (permission.superAdminOnly) {
    throw new ForbiddenException('Bu işlem yalnız Süper Admin tarafından yapılabilir.');
  }

  const rolePolicy = await prisma.rolePermissionPolicy.findUnique({
    where: { role_permissionId: { role: actorRole, permissionId: permission.id } },
  });

  const baseEnabled = rolePolicy?.enabled ?? permission.defaultEnabled;
  const baseNumericLimit = rolePolicy?.numericLimit ?? permission.defaultNumericLimit ?? null;
  const baseMetadata =
    (rolePolicy?.metadata as Record<string, unknown> | null) ??
    (permission.metadata as Record<string, unknown> | null) ??
    null;

  const now = new Date();
  const override = await prisma.userPermissionOverride.findUnique({
    where: { userId_permissionId: { userId: actorId, permissionId: permission.id } },
  });

  if (
    override &&
    (!override.validFrom || override.validFrom <= now) &&
    (!override.validUntil || override.validUntil >= now)
  ) {
    return {
      enabled: override.enabled ?? baseEnabled,
      numericLimit: override.numericLimit ?? baseNumericLimit,
      metadata: (override.metadata as Record<string, unknown> | null) ?? baseMetadata,
      source: 'USER_OVERRIDE',
    };
  }

  return {
    enabled: baseEnabled,
    numericLimit: baseNumericLimit,
    metadata: baseMetadata,
    source: rolePolicy ? 'ROLE_POLICY' : 'PERMISSION_DEFAULT',
  };
}
