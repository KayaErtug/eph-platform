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
});
