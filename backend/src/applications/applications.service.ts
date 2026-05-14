import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(dto: CreateApplicationDto) {
    let referrerId: string | undefined;

    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (referrer) referrerId = referrer.id;
    }

    const application = await this.prisma.application.create({
      data: {
        applicantName: dto.applicantName,
        applicantEmail: dto.applicantEmail,
        applicantPhone: dto.applicantPhone,
        requestedRole: dto.requestedRole,
        message: dto.message,
        referralCode: dto.referralCode,
        referrerId,
      },
    });

    try {
      await this.mail.sendNewApplication({
        applicantName: dto.applicantName,
        applicantEmail: dto.applicantEmail,
        applicantPhone: dto.applicantPhone,
        requestedRole: dto.requestedRole,
        referralCode: dto.referralCode,
      });
    } catch {}

    return application;
  }

  async findAll(status?: string) {
    const where = status && status !== 'all' ? { status: status as any } : {};
    return this.prisma.application.findMany({
      where,
      include: {
        referrer: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: [{ referrerId: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateStatus(id: string, status: string, adminNote?: string) {
    const application = await this.prisma.application.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Başvuru bulunamadı.');

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: status as any, ...(adminNote !== undefined && { adminNote }) },
    });

    if (status === 'REGISTERED' && application.referrerId) {
      await this.prisma.user.update({
        where: { id: application.referrerId },
        data: { nominationPoints: { increment: 1 } },
      });
    }

    return updated;
  }

  async addAdminNote(id: string, adminNote: string) {
    const application = await this.prisma.application.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Başvuru bulunamadı.');
    return this.prisma.application.update({ where: { id }, data: { adminNote } });
  }
}