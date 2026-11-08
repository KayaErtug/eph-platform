import { Test, TestingModule } from '@nestjs/testing';
import { OfficeContractsService } from './office-contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DigitalContractStatus, DigitalContractType, Role } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('OfficeContractsService', () => {
  let service: OfficeContractsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      digitalContract: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeContractsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OfficeContractsService>(OfficeContractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('Super Admin sees all contracts without filter restriction', async () => {
      prisma.digitalContract.findMany.mockResolvedValue([
        { id: 'c1', title: 'Yer Gösterme 1' },
        { id: 'c2', title: 'Referral 1' },
      ]);

      const result = await service.list({ id: 'super-admin-id', role: Role.SUPER_ADMIN });
      expect(result).toHaveLength(2);
      expect(prisma.digitalContract.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Regular consultant sees only their created or received contracts', async () => {
      prisma.digitalContract.findMany.mockResolvedValue([{ id: 'c1', title: 'Yer Gösterme' }]);

      const result = await service.list({ id: 'advisor-1', role: Role.EMLAKCI });
      expect(result).toHaveLength(1);
      expect(prisma.digitalContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { createdById: 'advisor-1' },
              { secondPartyUserId: 'advisor-1' },
            ],
          }),
        }),
      );
    });
  });

  describe('create and SMS verification', () => {
    it('creates Yer Gösterme draft and sends SMS OTP code', async () => {
      prisma.user.findUnique.mockResolvedValue({ officeId: 'office-1' });
      prisma.digitalContract.create.mockResolvedValue({
        id: 'contract-yer-gosterme',
        contractType: DigitalContractType.YER_GOSTERME,
        status: DigitalContractStatus.TASLAK,
        title: 'Müşteri Yer Gösterme',
        clientPhone: '05551112233',
        clientFullName: 'Ahmet Yılmaz',
        createdById: 'advisor-1',
      });

      const created = await service.create(
        { id: 'advisor-1', role: Role.EMLAKCI },
        {
          contractType: DigitalContractType.YER_GOSTERME,
          title: 'Müşteri Yer Gösterme',
          clientFullName: 'Ahmet Yılmaz',
          clientPhone: '05551112233',
        },
      );

      expect(created.id).toBe('contract-yer-gosterme');

      prisma.digitalContract.findUnique.mockResolvedValue({
        id: 'contract-yer-gosterme',
        contractType: DigitalContractType.YER_GOSTERME,
        status: DigitalContractStatus.TASLAK,
        clientPhone: '05551112233',
        createdById: 'advisor-1',
      });

      prisma.digitalContract.update.mockResolvedValue({
        id: 'contract-yer-gosterme',
        status: DigitalContractStatus.ONAYA_GONDERILDI,
        smsOtpCode: '123456',
      });

      const sent = await service.sendSmsOtp('contract-yer-gosterme', { id: 'advisor-1', role: Role.EMLAKCI });
      expect(sent.status).toBe(DigitalContractStatus.ONAYA_GONDERILDI);

      // Verify OTP
      prisma.digitalContract.findUnique.mockResolvedValue({
        id: 'contract-yer-gosterme',
        contractType: DigitalContractType.YER_GOSTERME,
        status: DigitalContractStatus.ONAYA_GONDERILDI,
        smsOtpCode: '123456',
        createdById: 'advisor-1',
      });

      prisma.digitalContract.update.mockResolvedValue({
        id: 'contract-yer-gosterme',
        status: DigitalContractStatus.SMS_ONAYLANDI,
      });

      const verified = await service.verifySmsOtp('contract-yer-gosterme', { id: 'advisor-1', role: Role.EMLAKCI }, '123456');
      expect(verified.status).toBe(DigitalContractStatus.SMS_ONAYLANDI);
    });

    it('rejects wrong OTP code', async () => {
      prisma.digitalContract.findUnique.mockResolvedValue({
        id: 'contract-yer-gosterme',
        contractType: DigitalContractType.YER_GOSTERME,
        status: DigitalContractStatus.ONAYA_GONDERILDI,
        smsOtpCode: '123456',
        createdById: 'advisor-1',
      });

      await expect(
        service.verifySmsOtp('contract-yer-gosterme', { id: 'advisor-1', role: Role.EMLAKCI }, '999999'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('referral paslasma and dispute', () => {
    it('approves referral contract when party confirms', async () => {
      prisma.digitalContract.findUnique.mockResolvedValue({
        id: 'contract-ref',
        contractType: DigitalContractType.REFERRAL_PASLASMA,
        status: DigitalContractStatus.TASLAK,
        createdById: 'advisor-1',
        secondPartyUserId: 'advisor-2',
      });

      prisma.digitalContract.update.mockResolvedValue({
        id: 'contract-ref',
        status: DigitalContractStatus.ONAYLANDI,
      });

      const approved = await service.approveReferral('contract-ref', { id: 'advisor-2', role: Role.EMLAKCI });
      expect(approved.status).toBe(DigitalContractStatus.ONAYLANDI);
    });

    it('records dispute reason on conflict', async () => {
      prisma.digitalContract.findUnique.mockResolvedValue({
        id: 'contract-ref',
        contractType: DigitalContractType.REFERRAL_PASLASMA,
        createdById: 'advisor-1',
        secondPartyUserId: 'advisor-2',
      });

      prisma.digitalContract.update.mockResolvedValue({
        id: 'contract-ref',
        status: DigitalContractStatus.UYUSMAZLIK,
        disputeNote: 'Komisyon oranı üzerinde anlaşılamadı.',
      });

      const disputed = await service.dispute('contract-ref', { id: 'advisor-2', role: Role.EMLAKCI }, 'Komisyon oranı üzerinde anlaşılamadı.');
      expect(disputed.status).toBe(DigitalContractStatus.UYUSMAZLIK);
    });
  });
});
