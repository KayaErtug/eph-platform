import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(role: Role): string {
    const prefix: Record<Role, string> = {
      EMLAKCI: 'EMK',
      MUTEAHHIT: 'MUH',
      INSAAT_FIRMASI: 'INS',
      ADMIN: 'ADM',
    };
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) =>
      Array.from({ length: n }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    return `${prefix[role]}-${seg(4)}-${seg(4)}`;
  }

  async create(dto: CreateInvitationDto) {
    let code = this.generateCode(dto.role);
    let exists = await this.prisma.invitation.findUnique({ where: { code } });
    while (exists) {
      code = this.generateCode(dto.role);
      exists = await this.prisma.invitation.findUnique({ where: { code } });
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    return this.prisma.invitation.create({
      data: { code, role: dto.role, expiresAt, maxUses: dto.maxUses },
    });
  }

  async validate(code: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { code } });
    if (!invitation) throw new NotFoundException('Davet kodu bulunamadı.');
    if (invitation.status === 'REVOKED') throw new BadRequestException('Bu davet kodu iptal edilmiş.');
    if (invitation.usedCount >= invitation.maxUses) throw new BadRequestException('Kullanım limiti dolmuş.');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('Davet kodunun süresi dolmuş.');
    return { valid: true, role: invitation.role, code: invitation.code };
  }

  async findAll() {
    return this.prisma.invitation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async revoke(code: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { code } });
    if (!invitation) throw new NotFoundException('Davet kodu bulunamadı.');
    return this.prisma.invitation.update({
      where: { code },
      data: { status: 'REVOKED' },
    });
  }async markAsUsed(code: string, userId: string) {
    return this.prisma.invitation.update({
      where: { code },
      data: {
        usedCount: { increment: 1 },
        status: 'USED',
      },
    });
  }
}