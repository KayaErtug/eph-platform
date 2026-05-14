import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail.service';
import { CreateNominationDto } from './dto/create-nomination.dto';

@Injectable()
export class NominationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(nominatorId: string, dto: CreateNominationDto) {
    const nominator = await this.prisma.user.findUnique({ where: { id: nominatorId } });
    if (!nominator) throw new NotFoundException('Kullanıcı bulunamadı.');
    if (!nominator.isApproved) throw new BadRequestException('Onaylı üyeler tavsiye yapabilir.');
    if (nominator.nominationQuota <= 0) throw new BadRequestException('Yıllık tavsiye hakkınız doldu.');

    const existing = await this.prisma.nomination.findFirst({
      where: { nominatorId, candidateEmail: dto.candidateEmail },
    });
    if (existing) throw new BadRequestException('Bu e-posta için zaten bir tavsiyeniz mevcut.');

    const nomination = await this.prisma.nomination.create({
      data: { nominatorId, ...dto },
    });

    await this.prisma.user.update({
      where: { id: nominatorId },
      data: { nominationQuota: { decrement: 1 } },
    });

    try {
      await this.mail.sendNewNomination({
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone,
        candidateRole: dto.candidateRole,
        nominatorName: `${nominator.firstName} ${nominator.lastName}`,
        note: dto.note,
      });
    } catch {}

    return nomination;
  }

  async findMyNominations(nominatorId: string) {
    return this.prisma.nomination.findMany({
      where: { nominatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(status?: string) {
    const where = status && status !== 'all' ? { status: status as any } : {};
    return this.prisma.nomination.findMany({
      where,
      include: {
        nominator: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, adminNote?: string) {
    const nomination = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nomination) throw new NotFoundException('Tavsiye bulunamadı.');

    const updated = await this.prisma.nomination.update({
      where: { id },
      data: { status: status as any, ...(adminNote !== undefined && { adminNote }) },
    });

    if (status === 'APPROVED') {
      await this.prisma.user.update({
        where: { id: nomination.nominatorId },
        data: { nominationPoints: { increment: 1 } },
      });
    }

    return updated;
  }

  async addAdminNote(id: string, adminNote: string) {
    const nomination = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nomination) throw new NotFoundException('Tavsiye bulunamadı.');
    return this.prisma.nomination.update({ where: { id }, data: { adminNote } });
  }
}