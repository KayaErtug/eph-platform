import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction, Role } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const actor = (role: Role) => ({ id: 'actor', role });
const ctx = (method: string, role: Role) => ({
  getHandler: () => AdminController.prototype[method], getClass: () => AdminController,
  switchToHttp: () => ({ getRequest: () => ({ user: actor(role) }) }),
}) as unknown as ExecutionContext;

function setup() {
  const overrides = new Map<string, boolean>();
  const db: any = {
    permissionDefinition: { findUnique: jest.fn(async ({ where }) => ({
      id: where.key, key: where.key, active: true, superAdminOnly: false,
      defaultEnabled: false, defaultNumericLimit: null, metadata: null,
    })) },
    rolePermissionPolicy: { findUnique: jest.fn(async ({ where }) => ({
      enabled: where.role_permissionId.permissionId !== 'AUDIT_VIEW',
    })) },
    userPermissionOverride: { findUnique: jest.fn(async ({ where }) => {
      const key = where.userId_permissionId.permissionId;
      return overrides.has(key) ? { enabled: overrides.get(key) } : null;
    }) },
    user: { count: jest.fn().mockResolvedValue(3), groupBy: jest.fn().mockResolvedValue([]) },
    invitation: { count: jest.fn().mockResolvedValue(0) },
    document: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    nomination: { count: jest.fn().mockResolvedValue(0) },
    application: { count: jest.fn().mockResolvedValue(0) },
    referralCandidate: { count: jest.fn().mockResolvedValue(0) },
    platformAnnouncement: { count: jest.fn().mockResolvedValue(0) },
    systemMessage: { count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { recipientCount: 0 } }) },
    auditLog: { count: jest.fn() },
  };
  const storage = { createSignedUrl: jest.fn().mockResolvedValue('https://example.invalid/signed-test') };
  const membership = { startTrialMembership: jest.fn().mockResolvedValue({ id: 'trial' }) };
  return { db, overrides, storage, membership, service: new AdminService(db, {} as any, storage as any, membership as any) };
}

describe('EPH-56 admin report permissions', () => {
  it.each(['getStats', 'getDashboardSummary'])('%s: ADMIN role policy allows, explicit deny blocks, grant restores', async method => {
    const { db, overrides, service } = setup();
    const guard = new PermissionGuard(new Reflector(), db);
    const context = ctx(method, Role.ADMIN);
    expect(new RolesGuard(new Reflector()).canActivate(context)).toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(service[method](actor(Role.ADMIN))).resolves.toBeDefined();
    // Gerçek DB teşhisi: rol açık fakat REPORT_VIEW kullanıcı override'ı false.
    overrides.set('REPORT_VIEW', false);
    await expect(guard.canActivate(context)).rejects.toThrow('Bu işlem için yetkiniz yok.');
    await expect(service[method](actor(Role.ADMIN))).rejects.toThrow(ForbiddenException);
    overrides.set('REPORT_VIEW', true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(service[method](actor(Role.ADMIN))).resolves.toBeDefined();
  });

  it('AUDIT_VIEW deny hides audit only, not the permitted dashboard', async () => {
    const { service, db } = setup();
    const result = await service.getDashboardSummary(actor(Role.ADMIN));
    expect(result.auditSummary.canView).toBe(false);
    expect(result.recentActions).toEqual([]);
    expect(db.auditLog.count).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN ignores explicit denies and inactive catalog', async () => {
    const { db, overrides } = setup();
    overrides.set('REPORT_VIEW', false);
    db.permissionDefinition.findUnique.mockResolvedValue(null);
    await expect(new PermissionGuard(new Reflector(), db).canActivate(ctx('getStats', Role.SUPER_ADMIN))).resolves.toBe(true);
    expect(db.permissionDefinition.findUnique).not.toHaveBeenCalled();
  });

  it('MODERATOR does not gain unrelated admin routes', () => {
    const guard = new RolesGuard(new Reflector());
    for (const method of ['getStats', 'getDashboardSummary', 'getUsers', 'updateUserMembership', 'setUserPermissionsBulk']) {
      expect(guard.canActivate(ctx(method, Role.MODERATOR))).toBe(false);
    }
  });
});

describe('EPH-56 document review', () => {
  it.each([Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN])('%s passes document roles and its permissions; actual service signs/reviews', async role => {
    const { db, overrides, service, storage, membership } = setup();
    const doc: any = { id: 'doc', userId: 'owner', type: 'MYK_BELGESI', status: 'PENDING', fileUrl: 'owner/test.pdf' };
    const owner = () => ({ role: Role.EMLAKCI, companyName: 'Örnek Ofis', professionalVerificationStatus: 'PENDING', capabilities: [], documents: [doc] });
    db.document.findMany.mockImplementation(async () => [{ ...doc }]);
    db.document.findUnique = jest.fn(async () => ({ ...doc }));
    db.document.update = jest.fn(async ({ data }) => Object.assign(doc, data));
    db.user.findUnique = jest.fn(async () => owner());
    db.user.update = jest.fn().mockResolvedValue({});
    const permission = new PermissionGuard(new Reflector(), db);
    const roles = new RolesGuard(new Reflector());
    for (const method of ['getDocuments', 'approveDocument', 'rejectDocument']) {
      expect(roles.canActivate(ctx(method, role))).toBe(true);
      await expect(permission.canActivate(ctx(method, role))).resolves.toBe(true);
    }
    const documents = await service.getDocuments('pending', actor(role));
    expect(documents[0].fileUrl).toBe('https://example.invalid/signed-test');
    expect(storage.createSignedUrl).toHaveBeenCalledWith('documents', 'owner/test.pdf', 300);
    const approved = await service.approveDocument('doc', actor(role));
    expect(approved.status).toBe('APPROVED');
    expect(approved.professionalVerificationStatus).toBe('VERIFIED');
    expect(membership.startTrialMembership).toHaveBeenCalledWith('owner');
    const rejected = await service.rejectDocument('doc', actor(role));
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.professionalVerificationStatus).toBe('REJECTED');
    if (role !== Role.SUPER_ADMIN) {
      overrides.set('DOCUMENT_VIEW', false);
      await expect(permission.canActivate(ctx('getDocuments', role))).rejects.toThrow(ForbiddenException);
      await expect(service.getDocuments('pending', actor(role))).rejects.toThrow(ForbiddenException);
      for (const [key, method] of [['DOCUMENT_APPROVE', 'approveDocument'], ['DOCUMENT_REJECT', 'rejectDocument']]) {
        overrides.set(key, false);
        await expect(service[method]('doc', actor(role))).rejects.toThrow(ForbiddenException);
      }
    }
  });

  it.each([Role.ADAY, Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI])('%s cannot review documents even with a broad permission default', role => {
    for (const method of ['getDocuments', 'approveDocument', 'rejectDocument']) {
      expect(new RolesGuard(new Reflector()).canActivate(ctx(method, role))).toBe(false);
    }
  });
});

describe('EPH-56 first trial duration', () => {
  let tx: any;
  let service: AdminService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-30T12:00:00Z'));
    const setupResult = setup();
    service = setupResult.service;
    tx = {
      $executeRaw: jest.fn(),
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'target', role: Role.EMLAKCI, firstName: 'Test', lastName: 'Kişi' }) },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      uyelikPaketi: {
        findUnique: jest.fn().mockResolvedValue({ id: 'trial', paketKodu: 'DENEME', paketAdi: 'Deneme', aktifMi: true, denemeGunSayisi: 14, aylikPaketPk: 0 }),
        findMany: jest.fn().mockResolvedValue([{ id: 'trial' }]),
      },
      kullaniciUyelikPaketi: {
        findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn(),
        create: jest.fn(async ({ data }) => ({ id: 'new-membership', ...data })),
      },
      auditLog: { create: jest.fn() },
    };
    setupResult.db.$transaction = jest.fn(fn => fn(tx));
  });
  afterEach(() => jest.useRealTimers());

  it.each([1, 30, 60])('SUPER_ADMIN explicitly assigns %s days; persists and audits', async days => {
    const result = await service.updateUserMembership('target', { paketKodu: 'DENEME', gunSayisi: days }, actor(Role.SUPER_ADMIN));
    expect((result.uyelik.bitisTarihi.getTime() - result.uyelik.baslangicTarihi.getTime()) / 86400000).toBe(days);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: 'actor', action: AuditAction.UPDATE_USER_PACKAGE }) }));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2); // EPH-70B1F/D7: payment-user kilidi + mevcut üyelik kilidi
  });

  it('SUPER_ADMIN assigns one calendar month using aySayisi', async () => {
    const result = await service.updateUserMembership('target', { paketKodu: 'DENEME', aySayisi: 1 }, actor(Role.SUPER_ADMIN));
    expect(result.uyelik.bitisTarihi.toISOString()).toBe('2026-11-30T12:00:00.000Z');
  });

  it('omitted duration continues to use the DB package policy', async () => {
    tx.uyelikPaketi.findUnique.mockResolvedValue({ id: 'trial', paketKodu: 'DENEME', aktifMi: true, denemeGunSayisi: 21, aylikPaketPk: 0 });
    const result = await service.updateUserMembership('target', { paketKodu: 'DENEME' }, actor(Role.SUPER_ADMIN));
    expect(result.uyelik.bitisTarihi.toISOString()).toBe('2026-11-20T12:00:00.000Z');
  });

  it.each([Role.ADMIN, Role.MODERATOR, Role.EMLAKCI])('%s still cannot change memberships', async role => {
    await expect(service.updateUserMembership('target', { paketKodu: 'DENEME', gunSayisi: 30 }, actor(role))).rejects.toThrow(ForbiddenException);
    expect(tx.kullaniciUyelikPaketi.create).not.toHaveBeenCalled();
  });

  it.each([{ gunSayisi: 0 }, { gunSayisi: -1 }, { gunSayisi: 1.5 }, { aySayisi: 0 }, { aySayisi: 1, gunSayisi: 30 }, { gunSayisi: Number.MAX_SAFE_INTEGER }])('rejects invalid duration %j without creating a membership', async body => {
    await expect(service.updateUserMembership('target', { paketKodu: 'DENEME', ...body }, actor(Role.SUPER_ADMIN))).rejects.toThrow();
    expect(tx.kullaniciUyelikPaketi.create).not.toHaveBeenCalled();
    expect(tx.kullaniciUyelikPaketi.updateMany).not.toHaveBeenCalled();
  });
});

describe('EPH-56 authenticated SUPER_ADMIN onboarding bypass', () => {
  afterEach(() => jest.restoreAllMocks());
  it('bypasses professional and office gates after authentication', async () => {
    jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(true);
    const context = { switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.SUPER_ADMIN, professionalVerificationStatus: 'PENDING', officeMembershipRequired: true }, url: '/admin/stats' }) }) } as any;
    await expect(new JwtAuthGuard().canActivate(context)).resolves.toBe(true);
    context.switchToHttp = () => ({ getRequest: () => ({ user: { role: Role.ADMIN, professionalVerificationStatus: 'PENDING' }, url: '/admin/stats' }) });
    await expect(new JwtAuthGuard().canActivate(context)).rejects.toThrow(ForbiddenException);
  });
  it('does not bypass authentication failure', async () => {
    jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockRejectedValue(new ForbiddenException());
    await expect(new JwtAuthGuard().canActivate({} as any)).rejects.toThrow(ForbiddenException);
  });
});
