import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  SystemMessageCategory,
  SystemMessageTargetType,
} from '@prisma/client';
import { SendSystemMessageDto } from './dto/send-system-message.dto';

@Injectable()
export class SystemMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly visibleSenderName = 'EPH Admin';

  private ensureSuperAdmin(actor: any) {
    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu işlem yalnızca Süper Admin tarafından yapılabilir.',
      );
    }
  }

  async send(dto: SendSystemMessageDto, actor: any) {
    this.ensureSuperAdmin(actor);

    return this.prisma.systemMessage.create({
      data: {
        senderId: actor.id,
        visibleSenderName: this.visibleSenderName,

        targetType: dto.targetType as unknown as SystemMessageTargetType,
        targetUserId: dto.targetUserId || null,
        targetRole: dto.targetRole ? (dto.targetRole as Role) : null,

        targetCities: [],
        targetCityPlateCodes: [],
        targetRoles: dto.targetRole ? [dto.targetRole] : [],

        recipientCount: dto.targetUserId ? 1 : 0,

        category: dto.category as unknown as SystemMessageCategory,
        customCategory: dto.customCategory || null,

        title: dto.title,
        body: dto.body,
      },
    });
  }

  async findForUser(user: any) {
    return this.prisma.systemMessage.findMany({
      where: {
        OR: [
          { targetType: SystemMessageTargetType.TUM_KULLANICILAR },
          {
            targetType: SystemMessageTargetType.TEK_KULLANICI,
            targetUserId: user.id,
          },
          {
            targetType: SystemMessageTargetType.EMLAKCILAR,
            targetRole: Role.EMLAKCI,
          },
          {
            targetType: SystemMessageTargetType.MUTEAHHITLER,
            targetRole: Role.MUTEAHHIT,
          },
          {
            targetType: SystemMessageTargetType.INSAAT_FIRMALARI,
            targetRole: Role.INSAAT_FIRMASI,
          },
          {
            targetType: SystemMessageTargetType.ADMINLER,
            targetRole: Role.ADMIN,
          },
          {
            targetType: SystemMessageTargetType.SUPER_ADMINLER,
            targetRole: Role.SUPER_ADMIN,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllForSuperAdmin(actor: any) {
    this.ensureSuperAdmin(actor);

    return this.prisma.systemMessage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: string, actor: any) {
    const message = await this.prisma.systemMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Sistem mesajı bulunamadı.');
    }

    return message;
  }

  async markAsRead(id: string, actor: any) {
    await this.findOne(id, actor);

    return this.prisma.systemMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}