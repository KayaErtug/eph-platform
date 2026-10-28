import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('InvitationsService', () => {
  let service: InvitationsService;
  const prisma = { invitation: { findUnique: jest.fn().mockResolvedValue(null) } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a missing invitation', async () => {
    await expect(service.validate('MISSING')).rejects.toBeInstanceOf(NotFoundException);
  });
});
