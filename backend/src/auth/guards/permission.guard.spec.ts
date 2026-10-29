import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  const definition = { id: 'p1', key: 'USER_VIEW', active: true, superAdminOnly: false, defaultEnabled: false, defaultNumericLimit: null, metadata: null };
  const prisma: any = {
    permissionDefinition: { findUnique: jest.fn() },
    rolePermissionPolicy: { findUnique: jest.fn() },
    userPermissionOverride: { findUnique: jest.fn() },
  };
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new PermissionGuard(reflector, prisma);

  const ctx = (user: any) =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('USER_VIEW');
    prisma.permissionDefinition.findUnique.mockResolvedValue(definition);
    prisma.rolePermissionPolicy.findUnique.mockResolvedValue(null);
    prisma.userPermissionOverride.findUnique.mockResolvedValue(null);
  });

  it('super admin her zaman geçer', async () => {
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.SUPER_ADMIN }))).resolves.toBe(true);
    expect(prisma.permissionDefinition.findUnique).not.toHaveBeenCalled();
  });

  it('yetki anahtarı olmayan uç geçer', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).resolves.toBe(true);
  });

  it('yetkisiz admin 403 alır', async () => {
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('kullanıcıya özel açık yetki ile geçer', async () => {
    prisma.userPermissionOverride.findUnique.mockResolvedValue({ enabled: true, numericLimit: null, validFrom: null, validUntil: null, metadata: null });
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).resolves.toBe(true);
  });

  it('kullanıcıya özel kapalı yetki rol politikasını ezer', async () => {
    prisma.rolePermissionPolicy.findUnique.mockResolvedValue({ enabled: true, numericLimit: null, metadata: null });
    prisma.userPermissionOverride.findUnique.mockResolvedValue({ enabled: false, numericLimit: null, validFrom: null, validUntil: null, metadata: null });
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('süresi dolmuş özel yetki yok sayılır', async () => {
    prisma.userPermissionOverride.findUnique.mockResolvedValue({ enabled: true, numericLimit: null, validFrom: null, validUntil: new Date(Date.now() - 1000), metadata: null });
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('yalnız süper admin yetkisi admine verilemez', async () => {
    prisma.permissionDefinition.findUnique.mockResolvedValue({ ...definition, superAdminOnly: true });
    prisma.userPermissionOverride.findUnique.mockResolvedValue({ enabled: true, validFrom: null, validUntil: null });
    await expect(guard.canActivate(ctx({ id: 'a', role: Role.ADMIN }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
