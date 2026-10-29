import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MailService } from '../mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MembershipService } from '../membership/membership.service';

describe('AdminService', () => {
  let service: AdminService;
  const prisma = { permissionDefinition: { findUnique: jest.fn().mockResolvedValue(null) } };
  const mail = { sendUserApproved: jest.fn() };
  const supabase = { createSignedUrl: jest.fn() };
  const membership = { startTrialMembership: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: SupabaseService, useValue: supabase },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects reports without an active permission definition', async () => {
    await expect(service.getStats({ id: 'admin-id', role: Role.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    expect(mail.sendUserApproved).not.toHaveBeenCalled();
  });

  describe('setUserPermissionsBulk', () => {
    const profile = (role: Role) => ({
      user: { id: 'u1', role },
      permissions: [
        { id: 'p1', key: 'USER_VIEW', enabled: false, superAdminOnly: false, delegable: true },
        { id: 'p2', key: 'SYSTEM_SETTING_MANAGE', enabled: false, superAdminOnly: true, delegable: false },
      ],
    });

    it('rejects non super admin actors', async () => {
      await expect(
        service.setUserPermissionsBulk('u1', { permissions: { USER_VIEW: true } }, { id: 'a', role: Role.ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to restrict a super admin target', async () => {
      jest.spyOn(service, 'getUserPermissionProfile').mockResolvedValue(profile(Role.SUPER_ADMIN) as any);
      await expect(
        service.setUserPermissionsBulk('u1', { permissions: { USER_VIEW: false } }, { id: 'a', role: Role.SUPER_ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses super-admin-only permissions', async () => {
      jest.spyOn(service, 'getUserPermissionProfile').mockResolvedValue(profile(Role.ADMIN) as any);
      await expect(
        service.setUserPermissionsBulk('u1', { permissions: { SYSTEM_SETTING_MANAGE: true } }, { id: 'a', role: Role.SUPER_ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('writes override and audit log with old and new values only for changes', async () => {
      jest.spyOn(service, 'getUserPermissionProfile').mockResolvedValue(profile(Role.ADMIN) as any);
      const tx = {
        userPermissionOverride: { upsert: jest.fn().mockResolvedValue({ id: 'o1' }) },
        auditLog: { create: jest.fn() },
      };
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));

      await service.setUserPermissionsBulk('u1', { permissions: { USER_VIEW: true } }, { id: 'a', role: Role.SUPER_ADMIN });

      expect(tx.userPermissionOverride.upsert).toHaveBeenCalledTimes(1);
      const audit = tx.auditLog.create.mock.calls[0][0].data;
      expect(audit.actorId).toBe('a');
      expect(audit.metadata).toMatchObject({
        permissionKey: 'USER_VIEW',
        oldValue: { enabled: false },
        newValue: { enabled: true },
      });
    });
  });

  describe('updateSystemSetting MARKET_* silme', () => {
    const sa = { id: 'a', role: Role.SUPER_ADMIN };
    const mkTx = (existing: any) => ({
      $queryRaw: jest.fn().mockResolvedValue([]),
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(existing),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    });
    const row = (key: string, value: unknown) => ({ id: 's1', key, valueJson: { value }, description: 'd', updatedAt: new Date(), updatedById: 'x' });

    beforeEach(() => {
      jest.spyOn(service as any, 'requireSoftwareTeam').mockReturnValue(undefined);
    });

    it.each([null, '', '  '])('MARKET_MANUAL_USD value=%p ayarı siler, audit eski -> null', async (v) => {
      const tx = mkTx(row('MARKET_MANUAL_USD', 41.5));
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      const res: any = await service.updateSystemSetting('MARKET_MANUAL_USD', { value: v as any }, sa);
      expect(tx.systemSetting.delete).toHaveBeenCalledWith({ where: { key: 'MARKET_MANUAL_USD' } });
      expect(tx.systemSetting.upsert).not.toHaveBeenCalled();
      expect(tx.auditLog.create.mock.calls[0][0].data.metadata).toEqual({ key: 'MARKET_MANUAL_USD', previousValue: 41.5, newValue: null });
      expect(res.value).toBeNull();
    });

    it('MARKET_KONUT_FAIZ_AYLIK null ile silinir', async () => {
      const tx = mkTx(row('MARKET_KONUT_FAIZ_AYLIK', 2.74));
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      await service.updateSystemSetting('MARKET_KONUT_FAIZ_AYLIK', { value: null }, sa);
      expect(tx.systemSetting.delete).toHaveBeenCalled();
      expect(tx.auditLog.create.mock.calls[0][0].data.metadata).toMatchObject({ previousValue: 2.74, newValue: null });
    });

    it('kayıt yoksa silme sessizce tamamlanır, audit yazılmaz', async () => {
      const tx = mkTx(null);
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      const res: any = await service.updateSystemSetting('MARKET_MANUAL_EUR', { value: null }, sa);
      expect(tx.systemSetting.delete).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
      expect(res.value).toBeNull();
    });

    it('MARKET_KONUT_FAIZ_KAYNAK boş metin silmez, boş olarak saklar', async () => {
      const tx = mkTx(row('MARKET_KONUT_FAIZ_KAYNAK', 'Akbank'));
      tx.systemSetting.upsert.mockResolvedValue(row('MARKET_KONUT_FAIZ_KAYNAK', ''));
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      await service.updateSystemSetting('MARKET_KONUT_FAIZ_KAYNAK', { value: '' }, sa);
      expect(tx.systemSetting.delete).not.toHaveBeenCalled();
      expect(tx.systemSetting.upsert).toHaveBeenCalled();
    });

    it('geçerli sayı hâlâ upsert eder', async () => {
      const tx = mkTx(null);
      tx.systemSetting.upsert.mockResolvedValue(row('MARKET_MANUAL_USD', 42));
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      await service.updateSystemSetting('MARKET_MANUAL_USD', { value: 42 }, sa);
      expect(tx.systemSetting.upsert).toHaveBeenCalled();
      expect(tx.systemSetting.delete).not.toHaveBeenCalled();
    });

    it('MARKET dışı anahtar null ile reddedilir', async () => {
      await expect(service.updateSystemSetting('TRIAL_INITIAL_DAYS', { value: null }, sa)).rejects.toThrow();
    });
  });
});
