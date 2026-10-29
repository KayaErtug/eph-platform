import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { AuditAction, Role, UyelikDurumu } from '@prisma/client';
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

  describe('EPH-34 extendUserTrial', () => {
    const admin = { id: 'admin-id', role: Role.ADMIN };
    const superAdmin = { id: 'super-admin-id', role: Role.SUPER_ADMIN };
    let tx: any;
    let currentMembership: any;
    let audits: any[];

    beforeEach(() => {
      audits = [];
      currentMembership = {
        id: 'membership-id', paketId: 'trial-package', durum: UyelikDurumu.AKTIF,
        baslangicTarihi: new Date('2026-10-01T12:00:00Z'),
        bitisTarihi: new Date('2026-10-15T12:00:00Z'),
      };
      tx = {
        $executeRaw: jest.fn(),
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'target', role: Role.EMLAKCI, email: 'target@example.com' }) },
        kullaniciUyelikPaketi: {
          findFirst: jest.fn(async () => ({ ...currentMembership })),
          update: jest.fn(async ({ data }: any) => (currentMembership = { ...currentMembership, ...data })),
        },
        uyelikPaketi: { findUnique: jest.fn().mockResolvedValue({ id: 'trial-package', paketKodu: 'DENEME', paketAdi: 'Deneme' }) },
        auditLog: {
          count: jest.fn(async ({ where }: any) => audits.filter(a =>
            a.targetUserId === where.targetUserId && a.action === where.action &&
            (!where.actorId || a.actorId === where.actorId) &&
            (!where.createdAt || (a.createdAt >= where.createdAt.gte && a.createdAt < where.createdAt.lt)),
          ).length),
          create: jest.fn(async ({ data }: any) => { audits.push({ ...data, createdAt: new Date() }); return data; }),
        },
      };
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      (prisma as any).systemSetting = { findUnique: jest.fn().mockResolvedValue(null) };
      (prisma as any).permissionDefinition.findUnique.mockResolvedValue({
        id: 'trial-permission', active: true, superAdminOnly: false, defaultEnabled: true,
        defaultNumericLimit: 1, metadata: { limitScope: 'PER_TARGET_USER', limitPeriod: 'YEAR' },
      });
      (prisma as any).rolePermissionPolicy = { findUnique: jest.fn().mockResolvedValue(null) };
      (prisma as any).userPermissionOverride = { findUnique: jest.fn().mockResolvedValue(null) };
    });

    afterEach(() => {
      jest.restoreAllMocks();
      (prisma as any).permissionDefinition.findUnique.mockResolvedValue(null);
    });

    it('SUPER_ADMIN aynı kullanıcıyı art arda 3 kez uzatır; her biri +14 gün ve audit', async () => {
      for (let i = 1; i <= 3; i++) {
        const result = await service.extendUserTrial('target', { gunSayisi: 14, gerekce: `Uzatma ${i}` }, superAdmin);
        expect(result.uyelik.yeniBitisTarihi).toEqual(new Date(Date.UTC(2026, 9, 15 + i * 14, 12)));
        expect(audits[i - 1]).toMatchObject({
          actorId: superAdmin.id, targetUserId: 'target', action: AuditAction.TRIAL_UZAT,
          description: `Uzatma ${i}`,
          metadata: { gunSayisi: 14, previousExtensionCount: i - 1 },
        });
      }
      expect(tx.auditLog.create).toHaveBeenCalledTimes(3);
      expect(tx.kullaniciUyelikPaketi.update).toHaveBeenCalledTimes(3);
      expect(tx.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('SUPER_ADMIN için numericLimit 0 bile uygulanmaz', async () => {
      jest.spyOn(service, 'resolveOperationalPermission').mockResolvedValue({
        enabled: true, numericLimit: 0, source: 'SUPER_ADMIN',
        metadata: { limitScope: 'PER_TARGET_USER', limitPeriod: 'YEAR' },
      });
      await expect(service.extendUserTrial('target', { gunSayisi: 14 }, superAdmin)).resolves.toMatchObject({ success: true });
      expect(tx.auditLog.count).toHaveBeenCalledTimes(1);
    });

    it('ADMIN ilk kez uzatır, ikinci kez yıllık kişi başı numericLimit sınırına takılır', async () => {
      await service.extendUserTrial('target', { gunSayisi: 14 }, admin);
      await expect(service.extendUserTrial('target', { gunSayisi: 14 }, admin)).rejects.toThrow('Yıllık limit: 1');
      expect(audits).toHaveLength(1);
      expect(tx.kullaniciUyelikPaketi.update).toHaveBeenCalledTimes(1);
    });

    it('ADMIN numericLimit dolmadan da toplam uzatma sayısı sınırına takılır', async () => {
      (prisma as any).rolePermissionPolicy.findUnique.mockResolvedValue({ numericLimit: 10 });
      await service.extendUserTrial('target', { gunSayisi: 14 }, admin);
      await expect(service.extendUserTrial('target', { gunSayisi: 14 }, admin)).rejects.toThrow('azami deneme uzatma sayısına');
      expect(audits).toHaveLength(1);
    });

    it('ADMIN toplam gün sınırı korunur', async () => {
      currentMembership.bitisTarihi = new Date('2026-10-16T12:00:00Z');
      await expect(service.extendUserTrial('target', { gunSayisi: 14 }, admin)).rejects.toThrow('toplam 28 günü aşamaz');
      expect(tx.kullaniciUyelikPaketi.update).not.toHaveBeenCalled();
      expect(audits).toHaveLength(0);
    });

    it('SUPER_ADMIN uzatma günü SystemSetting üzerinden okunur', async () => {
      (prisma as any).systemSetting.findUnique.mockImplementation(async ({ where }: any) =>
        where.key === 'TRIAL_EXTENSION_DAYS' ? { valueJson: { value: 7 } } : null);
      for (let i = 0; i < 3; i++) await service.extendUserTrial('target', { gunSayisi: 7 }, superAdmin);
      expect(currentMembership.bitisTarihi).toEqual(new Date('2026-11-05T12:00:00Z'));
      expect(audits).toHaveLength(3);
    });

    it.each([admin, superAdmin])('sabit uzatma miktarı ve gerekçe sınırı korunur: $role', async actor => {
      await expect(service.extendUserTrial('target', { gunSayisi: 28 }, actor)).rejects.toThrow('yalnız 14 gün');
      await expect(service.extendUserTrial('target', { gunSayisi: 14, gerekce: 'x'.repeat(51) }, actor)).rejects.toThrow('en fazla 50 karakter');
      expect(tx.kullaniciUyelikPaketi.update).not.toHaveBeenCalled();
    });
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

  describe('EPH-24A ayarlar ve deneme politikası', () => {
    const sa = { id: 'a', role: Role.SUPER_ADMIN };
    const row = (key: string, value: unknown) => ({ id: 's1', key, valueJson: { value }, description: 'd', updatedAt: new Date(), updatedById: 'x' });
    const mkTx = (existing: any) => ({
      $queryRaw: jest.fn().mockResolvedValue([]),
      systemSetting: { findUnique: jest.fn().mockResolvedValue(existing), upsert: jest.fn(async ({ create, update }: any) => ({ id: 's1', updatedAt: new Date(), ...(existing ?? {}), ...create, valueJson: (update ?? create).valueJson })) },
      auditLog: { create: jest.fn() },
    });

    beforeEach(() => {
      jest.spyOn(service as any, 'requireSoftwareTeam').mockReturnValue(undefined);
    });

    it('hediye PK seçenekleri listesi sıralı kaydedilir, audit eski -> yeni', async () => {
      const tx = mkTx(row('LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', [100, 250, 500]));
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      const res: any = await service.updateSystemSetting('LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', { value: [500, 50, 200] }, sa);
      expect(tx.systemSetting.upsert.mock.calls[0][0].update.valueJson).toEqual({ value: [50, 200, 500] });
      expect(tx.auditLog.create.mock.calls[0][0].data.metadata).toEqual({ key: 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', previousValue: [100, 250, 500], newValue: [50, 200, 500] });
      expect(res.value).toEqual([50, 200, 500]);
    });

    it.each([[[]], [[0, 5]], [[5, 5]], [['a']], [10], [null]])('hediye PK seçenekleri geçersiz değer %p reddedilir', async (v) => {
      await expect(service.updateSystemSetting('LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', { value: v as any }, sa)).rejects.toThrow();
    });

    it('kaydı olmayan yönetilen limit ilk güncellemede oluşturulur', async () => {
      const tx = mkTx(null);
      (prisma as any).$transaction = jest.fn((fn: any) => fn(tx));
      await service.updateSystemSetting('LIMIT_TAKIM_DANISMAN', { value: 12 }, sa);
      expect(tx.systemSetting.upsert.mock.calls[0][0].create).toMatchObject({ key: 'LIMIT_TAKIM_DANISMAN', valueJson: { value: 12 } });
      expect(tx.auditLog.create.mock.calls[0][0].data.metadata).toMatchObject({ previousValue: null, newValue: 12 });
    });

    it('bilinmeyen anahtar hâlâ reddedilir', async () => {
      await expect(service.updateSystemSetting('RASTGELE_ANAHTAR', { value: 1 }, sa)).rejects.toThrow();
    });

    it('ayar ekranı kaydı olmayan yeni limitleri açıklama ve yedek değerle listeler', async () => {
      (prisma as any).systemSetting = { findMany: jest.fn().mockResolvedValue([]) };
      const list: any[] = await service.getSystemSettings(sa);
      const byKey = Object.fromEntries(list.map((r) => [r.key, r]));
      expect(byKey.LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI).toMatchObject({ value: [100, 250, 500], updatedAt: null });
      expect(byKey.LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI.description).toBeTruthy();
      expect(byKey.LIMIT_ADMIN_HEDIYE_GUNLUK_PK.value).toBe(5000);
      expect(byKey.LIMIT_ALICI_ADMIN_HEDIYE_ADET.value).toBe(2);
      expect(byKey.LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK.value).toBe(1000);
      expect(byKey.LIMIT_TAKIM_DANISMAN.value).toBe(10);
    });

    it('getTrialPolicy: tek paket gün sayısı varsa onu, toplam günü hesaplar', async () => {
      (prisma as any).systemSetting = { findUnique: jest.fn(async ({ where }: any) => ({ TRIAL_EXTENSION_DAYS: { valueJson: { value: 7 } }, TRIAL_MAX_EXTENSIONS: { valueJson: 2 } } as any)[where.key] ?? null) };
      (prisma as any).uyelikPaketi = { findMany: jest.fn().mockResolvedValue([{ denemeGunSayisi: 21 }, { denemeGunSayisi: 21 }]) };
      expect(await service.getTrialPolicy()).toEqual({ initialDays: 21, extensionDays: 7, maxExtensions: 2, maxTotalDays: 35 });
    });

    it('getTrialPolicy: paket günleri farklıysa TRIAL_INITIAL_DAYS', async () => {
      (prisma as any).systemSetting = { findUnique: jest.fn().mockResolvedValue(null) };
      (prisma as any).uyelikPaketi = { findMany: jest.fn().mockResolvedValue([{ denemeGunSayisi: 7 }, { denemeGunSayisi: 30 }]) };
      expect(await service.getTrialPolicy()).toEqual({ initialDays: 14, extensionDays: 14, maxExtensions: 1, maxTotalDays: 28 });
    });
  });
});
