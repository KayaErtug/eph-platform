import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CustomerPropertyRelation,
  Prisma,
  Role,
} from '@prisma/client';

import { CrmService } from '../crm/crm.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkPoolUnitDto } from './dto/link-pool-unit.dto';

type CoordinationUser = {
  id?: string;
  role?: Role | string;
};

@Injectable()
export class PoolCrmCoordinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  async linkPoolUnitToCustomer(
    customerId: string,
    unitId: string,
    rawUser: CoordinationUser,
    body: LinkPoolUnitDto = {},
  ) {
    const user = await this.resolveUser(rawUser);
    const interest = body.customerInterestId
      ? await this.findCustomerInterest(
          body.customerInterestId,
          customerId,
          user,
        )
      : null;

    const relationType = CustomerPropertyRelation.ALICI_ADAYI;
    const existing = await this.prisma.customerProperty.findUnique({
      where: {
        customerId_unitId_relationType: {
          customerId,
          unitId,
          relationType,
        },
      },
    });

    const notes = this.buildRelationNotes(body, interest?.id);
    const relation = await this.crmService.addCustomerProperty(
      customerId,
      user.id,
      user.role,
      {
        unitId,
        relationType,
        notes,
      },
    );

    if (interest) {
      await this.prisma.customerInterest.update({
        where: { id: interest.id },
        data: { lastMatchedAt: new Date() },
      });
    }

    const created = !existing;
    const scoreText =
      body.matchScore === undefined
        ? ''
        : ` Eşleşme puanı: %${body.matchScore}.`;

    const sideEffects: Promise<unknown>[] = [
      this.writeAudit({
        actorId: user.id,
        targetUserId: interest?.customer.ownerId || user.id,
        action: created
          ? 'POOL_UNIT_LINKED_TO_CRM_CUSTOMER'
          : 'POOL_UNIT_CRM_LINK_UPDATED',
        entityId: relation.id,
        description: created
          ? 'Havuz portföyü CRM müşterisine bağlandı.'
          : 'Havuz portföyü ile CRM müşterisi arasındaki bağlantı güncellendi.',
        metadata: {
          customerId,
          customerInterestId: interest?.id || null,
          unitId,
          matchScore: body.matchScore ?? null,
          matchReasons: this.normalizeReasons(body.matchReasons),
        },
      }),
    ];

    if (created) {
      sideEffects.push(
        this.crmService.addActivity(
          customerId,
          user.id,
          user.role,
          {
            type: ActivityType.DIGER,
            note:
              `Havuz portföyü CRM müşterisiyle eşleştirildi. ` +
              `Portföy: ${unitId}.${scoreText}`,
          },
        ),
      );
    }

    if (created && body.createFollowUpTask) {
      sideEffects.push(
        this.crmService.addTask(
          customerId,
          user.id,
          user.role,
          {
            title: 'Eşleşen portföyü müşteriyle değerlendir',
            dueDate:
              body.followUpDate ||
              new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
          },
        ),
      );
    }

    await Promise.allSettled(sideEffects);

    return {
      created,
      relation,
      customerInterestId: interest?.id || null,
      matchScore: body.matchScore ?? null,
      message: created
        ? 'Havuz portföyü CRM müşterisine bağlandı.'
        : 'Havuz–CRM bağlantısı güncellendi.',
    };
  }

  private async findCustomerInterest(
    interestId: string,
    customerId: string,
    user: { id: string; role: Role },
  ) {
    const interest = await this.prisma.customerInterest.findUnique({
      where: { id: interestId },
      include: { customer: true },
    });

    if (!interest) {
      throw new NotFoundException(
        'CRM talep profili bulunamadı.',
      );
    }

    if (interest.customerId !== customerId) {
      throw new BadRequestException(
        'Seçilen talep profili bu CRM müşterisine ait değil.',
      );
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      interest.customer.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'Bu CRM talep profiline erişim yetkiniz yok.',
      );
    }

    if (!interest.isActive) {
      throw new BadRequestException(
        'Pasif CRM talebi portföyle eşleştirilemez.',
      );
    }

    return interest;
  }

  private async resolveUser(rawUser: CoordinationUser) {
    const id = String(rawUser?.id || '').trim();

    if (!id) {
      throw new ForbiddenException(
        'Havuz–CRM işlemi için giriş yapmalısınız.',
      );
    }

    const suppliedRole = String(rawUser?.role || '')
      .trim()
      .toUpperCase();
    const role = Object.values(Role).find(
      (item) => item === suppliedRole,
    );

    if (role) {
      return { id, role };
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return { id, role: user.role };
  }

  private buildRelationNotes(
    body: LinkPoolUnitDto,
    customerInterestId?: string,
  ) {
    const parts = [
      customerInterestId
        ? `CRM talep profili: ${customerInterestId}`
        : '',
      body.matchScore === undefined
        ? ''
        : `Eşleşme puanı: %${body.matchScore}`,
      this.normalizeReasons(body.matchReasons).length
        ? `Gerekçeler: ${this.normalizeReasons(
            body.matchReasons,
          ).join(', ')}`
        : '',
      String(body.note || '').trim().slice(0, 500),
    ].filter(Boolean);

    return parts.join(' | ') || null;
  }

  private normalizeReasons(value?: string[]) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim().slice(0, 150))
          .filter(Boolean),
      ),
    ).slice(0, 10);
  }

  private writeAudit(input: {
    actorId: string;
    targetUserId?: string | null;
    action: string;
    entityId: string;
    description: string;
    metadata: Record<string, unknown>;
  }) {
    return this.prisma.adminActionLog.create({
      data: {
        actorId: input.actorId,
        targetUserId: input.targetUserId || null,
        action: input.action,
        entityType: 'EPH_COORDINATION',
        entityId: input.entityId,
        description: input.description,
        metadata:
          input.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
