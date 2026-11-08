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
});
