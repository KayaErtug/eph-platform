import {
  BadRequestException,
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

  private normalizeStringArray(value?: string[]) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  private async calculateRecipientCount(dto: SendSystemMessageDto) {
    const targetType = dto.targetType as SystemMessageTargetType;

    if (targetType === SystemMessageTargetType.TEK_KULLANICI) {
      return dto.targetUserId ? 1 : 0;
    }

    if (targetType === SystemMessageTargetType.TUM_KULLANICILAR) {
      return this.prisma.user.count({
        where: {
          isApproved: true,
          adminVisible: true,
        },
      });
    }

    const roleMap: Partial<Record<SystemMessageTargetType, Role>> = {
      [SystemMessageTargetType.EMLAKCILAR]: Role.EMLAKCI,
      [SystemMessageTargetType.MUTEAHHITLER]: Role.MUTEAHHIT,
      [SystemMessageTargetType.INSAAT_FIRMALARI]: Role.INSAAT_FIRMASI,
      [SystemMessageTargetType.ADMINLER]: Role.ADMIN,
      [SystemMessageTargetType.SUPER_ADMINLER]: Role.SUPER_ADMIN,
    };

    if (roleMap[targetType]) {
      return this.prisma.user.count({
        where: {
          role: roleMap[targetType],
          isApproved: true,
          adminVisible: true,
        },
      });
    }

    if (targetType === SystemMessageTargetType.SEHIRLER) {
      const cities = this.normalizeStringArray(dto.targetCities);
      const cityPlateCodes = this.normalizeStringArray(dto.targetCityPlateCodes);

      if (cities.length === 0 && cityPlateCodes.length === 0) {
        throw new BadRequestException('Şehir bazlı gönderim için en az bir şehir seçilmelidir.');
      }

      return this.prisma.user.count({
        where: {
          isApproved: true,
          adminVisible: true,
          OR: [
            ...(cities.length > 0 ? [{ city: { in: cities } }] : []),
            ...(cityPlateCodes.length > 0
              ? [{ cityPlateCode: { in: cityPlateCodes } }]
              : []),
          ],
        },
      });
    }

    if (targetType === SystemMessageTargetType.SEHIRLER_VE_ROLLER) {
      const cities = this.normalizeStringArray(dto.targetCities);
      const cityPlateCodes = this.normalizeStringArray(dto.targetCityPlateCodes);
      const targetRoles = this.normalizeStringArray(dto.targetRoles) as Role[];

      if (cities.length === 0 && cityPlateCodes.length === 0) {
        throw new BadRequestException('Şehir + rol bazlı gönderim için en az bir şehir seçilmelidir.');
      }

      if (targetRoles.length === 0) {
        throw new BadRequestException('Şehir + rol bazlı gönderim için en az bir rol seçilmelidir.');
      }

      return this.prisma.user.count({
        where: {
          isApproved: true,
          adminVisible: true,
          role: {
            in: targetRoles,
          },
          OR: [
            ...(cities.length > 0 ? [{ city: { in: cities } }] : []),
            ...(cityPlateCodes.length > 0
              ? [{ cityPlateCode: { in: cityPlateCodes } }]
              : []),
          ],
        },
      });
    }

    return 0;
  }

  async send(dto: SendSystemMessageDto, actor: any) {
    this.ensureSuperAdmin(actor);

    if (!dto.targetType) {
      throw new BadRequestException('Gönderim tipi zorunludur.');
    }

    if (!dto.category) {
      throw new BadRequestException('Mesaj kategorisi zorunludur.');
    }

    if (!dto.title?.trim()) {
      throw new BadRequestException('Başlık zorunludur.');
    }

    if (!dto.body?.trim()) {
      throw new BadRequestException('Mesaj içeriği zorunludur.');
    }

    if (dto.targetType === 'TEK_KULLANICI' && !dto.targetUserId) {
      throw new BadRequestException('Tek kullanıcı gönderimi için kullanıcı seçilmelidir.');
    }

    if (dto.targetType === 'TEK_KULLANICI' && dto.targetUserId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.targetUserId },
      });

      if (!targetUser) {
        throw new NotFoundException('Hedef kullanıcı bulunamadı.');
      }
    }

    const targetCities = this.normalizeStringArray(dto.targetCities);
    const targetCityPlateCodes = this.normalizeStringArray(dto.targetCityPlateCodes);
    const targetRoles = this.normalizeStringArray(
      dto.targetRoles || (dto.targetRole ? [dto.targetRole] : []),
    );

    const recipientCount = await this.calculateRecipientCount(dto);

    return this.prisma.systemMessage.create({
      data: {
        senderId: actor.id,
        visibleSenderName: this.visibleSenderName,

        targetType: dto.targetType as SystemMessageTargetType,
        targetUserId: dto.targetUserId || null,
        targetRole: dto.targetRole ? (dto.targetRole as Role) : null,

        targetCities,
        targetCityPlateCodes,
        targetRoles,

        recipientCount,

        category: dto.category as SystemMessageCategory,
        customCategory: dto.customCategory || null,

        title: dto.title.trim(),
        body: dto.body.trim(),
      },
    });
  }

  async findForUser(user: any) {
    if (!user?.id) {
      throw new ForbiddenException('Oturum bulunamadı.');
    }

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
          {
            targetType: SystemMessageTargetType.SEHIRLER,
            OR: [
              { targetCities: { has: user.city } },
              { targetCityPlateCodes: { has: user.cityPlateCode } },
            ],
          },
          {
            targetType: SystemMessageTargetType.SEHIRLER_VE_ROLLER,
            targetRoles: { has: user.role },
            OR: [
              { targetCities: { has: user.city } },
              { targetCityPlateCodes: { has: user.cityPlateCode } },
            ],
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
            city: true,
            cityPlateCode: true,
            district: true,
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
      include: {
        targetUser: true,
        sender: true,
      },
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