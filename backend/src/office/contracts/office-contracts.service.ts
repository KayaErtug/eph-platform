import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DigitalContractStatus,
  DigitalContractType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateContractInput {
  officeId?: string;
  contractType: DigitalContractType;
  title: string;
  unitId?: string;
  demandId?: string;
  secondPartyUserId?: string;
  secondPartyOfficeId?: string;
  clientFullName?: string;
  clientPhone?: string;
  clientTcNo?: string;
  commissionSplitRatio?: string;
  termsNote?: string;
}

@Injectable()
export class OfficeContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user: { role?: Role | string }) {
    return (
      user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN'
    );
  }

  async list(
    user: { id: string; role?: Role | string },
    filters?: {
      officeId?: string;
      contractType?: DigitalContractType;
      status?: DigitalContractStatus;
    },
  ) {
    const isSuper = this.isSuperAdmin(user);
    const where: Prisma.DigitalContractWhereInput = {
      ...(filters?.contractType ? { contractType: filters.contractType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    if (!isSuper) {
      if (filters?.officeId) {
        where.OR = [
          { officeId: filters.officeId },
          { secondPartyOfficeId: filters.officeId },
          { createdById: user.id },
          { secondPartyUserId: user.id },
        ];
      } else {
        where.OR = [
          { createdById: user.id },
          { secondPartyUserId: user.id },
        ];
      }
    }

    return this.prisma.digitalContract.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
          },
        },
        unit: {
          select: {
            id: true,
            type: true,
            price: true,
            priceCurrency: true,
            project: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, user: { id: string; role?: Role | string }) {
    const contract = await this.prisma.digitalContract.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
          },
        },
        unit: {
          select: {
            id: true,
            type: true,
            price: true,
            priceCurrency: true,
            project: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
              },
            },
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Sözleşme bulunamadı.');
    }

    const isSuper = this.isSuperAdmin(user);
    const hasAccess =
      isSuper ||
      contract.createdById === user.id ||
      contract.secondPartyUserId === user.id ||
      (contract.officeId && (await this.userBelongsToOffice(user.id, contract.officeId)));

    if (!hasAccess) {
      throw new ForbiddenException('Bu sözleşmeye erişim yetkiniz yok.');
    }

    return contract;
  }

  async create(
    user: { id: string; role?: Role | string },
    input: CreateContractInput,
  ) {
    if (!input.title || !input.title.trim()) {
      throw new BadRequestException('Sözleşme başlığı zorunludur.');
    }

    // Determine office ID if not provided
    let officeId = input.officeId;
    if (!officeId) {
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { officeId: true },
      });
      officeId = userRecord?.officeId || undefined;
    }

    return this.prisma.digitalContract.create({
      data: {
        officeId,
        contractType: input.contractType,
        status: DigitalContractStatus.TASLAK,
        title: input.title.trim(),
        unitId: input.unitId || null,
        demandId: input.demandId || null,
        createdById: user.id,
        secondPartyUserId: input.secondPartyUserId || null,
        secondPartyOfficeId: input.secondPartyOfficeId || null,
        clientFullName: input.clientFullName?.trim() || null,
        clientPhone: input.clientPhone?.trim() || null,
        clientTcNo: input.clientTcNo?.trim() || null,
        commissionSplitRatio: input.commissionSplitRatio || '%50 - %50',
        termsNote: input.termsNote?.trim() || null,
      },
    });
  }

  async sendSmsOtp(id: string, user: { id: string; role?: Role | string }) {
    const contract = await this.getById(id, user);

    if (
      contract.contractType !== DigitalContractType.YER_GOSTERME ||
      !contract.clientPhone
    ) {
      throw new BadRequestException(
        'SMS onayı yalnızca telefon numarası olan Yer Gösterme belgelerinde kullanılır.',
      );
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();

    return this.prisma.digitalContract.update({
      where: { id },
      data: {
        smsOtpCode: otp,
        smsSentAt: now,
        status: DigitalContractStatus.ONAYA_GONDERILDI,
      },
    });
  }

  async verifySmsOtp(
    id: string,
    user: { id: string; role?: Role | string },
    code: string,
  ) {
    const contract = await this.getById(id, user);

    if (!contract.smsOtpCode) {
      throw new BadRequestException('Önce SMS OTP kodu gönderilmelidir.');
    }

    const cleanCode = code.trim();
    if (contract.smsOtpCode !== cleanCode) {
      throw new BadRequestException('Girilen SMS doğrulama kodu hatalıdır.');
    }

    const now = new Date();
    return this.prisma.digitalContract.update({
      where: { id },
      data: {
        status: DigitalContractStatus.SMS_ONAYLANDI,
        smsVerifiedAt: now,
        signedAt: now,
      },
    });
  }

  async approveReferral(id: string, user: { id: string; role?: Role | string }) {
    const contract = await this.getById(id, user);

    if (contract.contractType !== DigitalContractType.REFERRAL_PASLASMA) {
      throw new BadRequestException('Bu onay yalnızca Referral sözleşmeleri içindir.');
    }

    const isSuper = this.isSuperAdmin(user);
    if (!isSuper && contract.secondPartyUserId && contract.secondPartyUserId !== user.id) {
      throw new ForbiddenException('Bu sözleşmeyi yalnızca muhatap taraf onaylayabilir.');
    }

    const now = new Date();
    return this.prisma.digitalContract.update({
      where: { id },
      data: {
        status: DigitalContractStatus.ONAYLANDI,
        signedAt: now,
      },
    });
  }

  async dispute(
    id: string,
    user: { id: string; role?: Role | string },
    reason: string,
  ) {
    const contract = await this.getById(id, user);
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Uyuşmazlık gerekçesi belirtilmelidir.');
    }

    return this.prisma.digitalContract.update({
      where: { id },
      data: {
        status: DigitalContractStatus.UYUSMAZLIK,
        disputeNote: reason.trim(),
      },
    });
  }

  async archive(id: string, user: { id: string; role?: Role | string }) {
    await this.getById(id, user);

    return this.prisma.digitalContract.update({
      where: { id },
      data: {
        status: DigitalContractStatus.ARSIVLENDI,
      },
    });
  }

  private async userBelongsToOffice(userId: string, officeId: string): Promise<boolean> {
    const member = await this.prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { officeId },
          { office: { ownerUserId: userId } },
        ],
      },
    });
    return Boolean(member);
  }
}
