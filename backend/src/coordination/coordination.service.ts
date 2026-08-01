import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerInterestPriority,
  CustomerPurchaseIntent,
  CustomerRole,
  Role,
  UnitStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { CrmService } from '../crm/crm.service';
import { NetworkService } from '../network/network.service';
import { PrismaService } from '../prisma/prisma.service';

type CoordinationDirection = 'CRM_TO_REQUEST' | 'REQUEST_TO_CRM';
type CoordinationStatus = 'PENDING' | 'COMPLETE' | 'FAILED';

type CoordinationUser = {
  id?: string;
  role?: Role | string;
};

type PublishInterestBody = {
  title?: string;
  description?: string;
  urgency?: string;
  expiresInDays?: number;
  acknowledgedWarningCodes?: string[];
};

type CoordinationLinkRow = {
  id: string;
  ownerId: string;
  direction: CoordinationDirection;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  networkPostId: string | null;
  customerId: string | null;
  customerInterestId: string | null;
  unitId: string | null;
  status: CoordinationStatus;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const LINK_STALE_MS = 5 * 60 * 1000;

@Injectable()
export class CoordinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
    private readonly networkService: NetworkService,
  ) {}

  async publishCrmInterestToRequestCenter(
    interestId: string,
    rawUser: CoordinationUser,
    body: PublishInterestBody = {},
  ) {
    const user = await this.resolveUser(rawUser);
    const interest = await this.findInterestForUser(interestId, user);
    const reservation = await this.reserveLink({
      ownerId: user.id,
      direction: 'CRM_TO_REQUEST',
      sourceEntityType: 'CUSTOMER_INTEREST',
      sourceEntityId: interest.id,
    });

    if (!reservation.acquired) {
      const post = reservation.link.networkPostId
        ? await this.prisma.networkPost.findUnique({
            where: { id: reservation.link.networkPostId },
          })
        : null;

      return {
        created: false,
        link: reservation.link,
        networkPost: post,
        message: 'Bu CRM talebi daha önce Talep Merkezi ile bağlandı.',
      };
    }

    let createdPostId: string | null = null;

    try {
      const postInput = this.buildNetworkPostInput(interest, body);
      const post = await this.networkService.create(postInput as any, user.id);
      createdPostId = post.id;

      const link = await this.completeLink(reservation.link.id, {
        targetEntityType: 'NETWORK_POST',
        targetEntityId: post.id,
        networkPostId: post.id,
        customerId: interest.customerId,
        customerInterestId: interest.id,
        metadata: {
          sourceModule: 'CRM',
          targetModule: 'REQUEST_CENTER',
          privacyMode: 'NO_CUSTOMER_PERSONAL_DATA',
        },
      });

      return {
        created: true,
        link,
        networkPost: post,
        message: 'CRM talebi Talep Merkezi’nde yayınlandı.',
      };
    } catch (error) {
      await this.failLink(reservation.link.id, error);

      if (createdPostId) {
        await this.networkService.remove(createdPostId, user.id).catch(() => undefined);
      }

      throw error;
    }
  }

  async createCrmOpportunityFromRequest(
    postId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    const reservation = await this.reserveLink({
      ownerId: user.id,
      direction: 'REQUEST_TO_CRM',
      sourceEntityType: 'NETWORK_POST',
      sourceEntityId: postId,
    });

    if (!reservation.acquired) {
      const customer = reservation.link.customerId
        ? await this.prisma.customer.findUnique({
            where: { id: reservation.link.customerId },
            include: {
              interests: {
                orderBy: { createdAt: 'asc' },
              },
            },
          })
        : null;

      return {
        created: false,
        link: reservation.link,
        customer,
        message: 'Bu Talep Merkezi kaydı daha önce CRM fırsatına dönüştürüldü.',
      };
    }

    let createdCustomerId: string | null = null;

    try {
      const post = await this.prisma.networkPost.findFirst({
        where: {
          id: postId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException('Aktif Talep Merkezi kaydı bulunamadı.');
      }

      const areas = this.normalizePostAreas(post.areas, {
        city: post.city,
        district: post.district,
        neighborhood: post.neighborhood,
      });
      const statuses = this.getStatusesFromPost(post.tags);
      const primaryArea = areas[0] || null;
      const publicFirstName = this.cleanName(post.User.firstName) || 'Talep';
      const publicLastName = this.cleanName(post.User.lastName) || 'Merkezi';

      const createdCustomer = await this.crmService.createCustomer(user.id, {
        firstName: publicFirstName,
        lastName: publicLastName,
        roles: this.getCustomerRoles(post.User.role, post.type),
        source: 'TALEP_MERKEZI',
        notes:
          `Talep Merkezi fırsatı: ${post.title}. ` +
          'İletişim Talep Merkezi üzerinden yürütülmelidir.',
        interestedArea: areas.map((area) => this.formatArea(area)).join(' | '),
        interestTitle: post.title,
        interestNotes: post.description,
        interestAreas: areas,
        propertyTypes: post.propertyTypes,
        interestStatuses: statuses,
        minBudget: post.minBudget ?? post.budget,
        maxBudget: post.maxBudget ?? post.budget,
        priceCurrency: post.priceCurrency,
        minArea: post.minArea,
        maxArea: post.maxArea,
        roomCounts: post.roomCounts,
        features: post.features,
        purchaseIntent: this.getPurchaseIntent(statuses),
        priority: this.getPriority(post.urgency),
      });

      if (!createdCustomer) {
        throw new BadRequestException('CRM fırsatı oluşturulamadı.');
      }

      createdCustomerId = createdCustomer.id;

      let customer = await this.prisma.customer.findUnique({
        where: { id: createdCustomer.id },
        include: {
          interests: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!customer) {
        throw new BadRequestException('Oluşturulan CRM fırsatı okunamadı.');
      }

      if (primaryArea && customer.interests.length === 1) {
        const primaryInterest = customer.interests[0];

        if (!primaryInterest.city && primaryArea.city) {
          await this.prisma.customerInterest.update({
            where: { id: primaryInterest.id },
            data: {
              city: primaryArea.city,
              district: primaryArea.district || null,
              neighborhood: primaryArea.neighborhood || null,
            },
          });

          customer = await this.prisma.customer.findUnique({
            where: { id: createdCustomer.id },
            include: {
              interests: {
                orderBy: { createdAt: 'asc' },
              },
            },
          });
        }
      }

      if (!customer) {
        throw new BadRequestException('CRM fırsatı güncellenemedi.');
      }

      const primaryInterestId = customer.interests[0]?.id || null;
      const link = await this.completeLink(reservation.link.id, {
        targetEntityType: 'CUSTOMER',
        targetEntityId: customer.id,
        networkPostId: post.id,
        customerId: customer.id,
        customerInterestId: primaryInterestId,
        metadata: {
          sourceModule: 'REQUEST_CENTER',
          targetModule: 'CRM',
          privacyMode: 'PUBLIC_EPH_IDENTITY_ONLY',
          customerInterestIds: customer.interests.map((item) => item.id),
        },
      });

      return {
        created: true,
        link,
        customer,
        message: 'Talep Merkezi kaydı özel CRM fırsatına dönüştürüldü.',
      };
    } catch (error) {
      await this.failLink(reservation.link.id, error);

      if (createdCustomerId) {
        await this.crmService
          .deleteCustomer(createdCustomerId, user.id, user.role)
          .catch(() => undefined);
      }

      throw error;
    }
  }

  async getCrmInterestRequestStatus(
    interestId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    await this.findInterestForUser(interestId, user);

    return this.getLink(
      user.id,
      'CRM_TO_REQUEST',
      'CUSTOMER_INTEREST',
      interestId,
    );
  }

  async getRequestCrmStatus(postId: string, rawUser: CoordinationUser) {
    const user = await this.resolveUser(rawUser);

    return this.getLink(
      user.id,
      'REQUEST_TO_CRM',
      'NETWORK_POST',
      postId,
    );
  }

  private async resolveUser(rawUser: CoordinationUser) {
    const id = String(rawUser?.id || '').trim();

    if (!id) {
      throw new ForbiddenException('Koordinasyon işlemi için giriş yapmalısınız.');
    }

    const suppliedRole = String(rawUser?.role || '').trim().toUpperCase();
    const role = Object.values(Role).find((item) => item === suppliedRole);

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

  private async findInterestForUser(
    interestId: string,
    user: { id: string; role: Role },
  ) {
    const interest = await this.prisma.customerInterest.findUnique({
      where: { id: interestId },
      include: { customer: true },
    });

    if (!interest) {
      throw new NotFoundException('CRM talep profili bulunamadı.');
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      interest.customer.ownerId !== user.id
    ) {
      throw new ForbiddenException('Bu CRM talep profiline erişim yetkiniz yok.');
    }

    if (!interest.isActive) {
      throw new BadRequestException('Pasif CRM talebi yayınlanamaz.');
    }

    return interest;
  }

  private buildNetworkPostInput(
    interest: Awaited<ReturnType<CoordinationService['findInterestForUser']>>,
    body: PublishInterestBody,
  ) {
    const location = this.formatArea({
      city: interest.city,
      district: interest.district,
      neighborhood: interest.neighborhood,
    });

    if (!interest.city) {
      throw new BadRequestException(
        'Talep Merkezi yayını için CRM talebinde en az şehir bilgisi bulunmalıdır.',
      );
    }

    const requestType = this.getRequestType(interest.statuses);
    const propertyText = interest.propertyTypes.length
      ? interest.propertyTypes.map((item) => this.humanize(item)).join(', ')
      : 'gayrimenkul';
    const budgetText = this.formatBudget(
      interest.minBudget,
      interest.maxBudget,
      interest.priceCurrency,
    );
    const generatedTitle = `${location} ${propertyText} arayışı`;
    const generatedDescription = [
      `${location} bölgesinde ${propertyText} aranıyor.`,
      budgetText ? `Bütçe: ${budgetText}.` : '',
      interest.roomCounts.length
        ? `Oda seçenekleri: ${interest.roomCounts.join(', ')}.`
        : '',
      'CRM talep profilinden oluşturuldu.',
    ]
      .filter(Boolean)
      .join(' ');
    const expiresInDays = Math.min(
      30,
      Math.max(1, Number(body.expiresInDays) || 7),
    );

    return {
      type: 'PORTFOY_ARIYORUM',
      title: this.trimText(body.title || interest.title || generatedTitle, 50),
      description: this.trimText(body.description || generatedDescription, 200),
      areas: [
        {
          city: interest.city,
          district: interest.district,
          neighborhood: interest.neighborhood,
        },
      ],
      minBudget: interest.minBudget,
      maxBudget: interest.maxBudget,
      minArea: interest.minArea,
      maxArea: interest.maxArea,
      propertyTypes: interest.propertyTypes,
      roomCounts: interest.roomCounts,
      features: interest.features,
      priceCurrency: interest.priceCurrency,
      urgency: body.urgency || this.priorityToUrgency(interest.priority),
      visibility: 'TUM_EPH',
      tags: [`Talep Türü:${requestType}`, 'CRM Talep Profili'],
      expiresAt: new Date(
        Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      acknowledgedWarningCodes: Array.isArray(body.acknowledgedWarningCodes)
        ? body.acknowledgedWarningCodes
        : [],
    };
  }

  private getRequestType(statuses: UnitStatus[]) {
    return statuses.some((status) =>
      String(status).toUpperCase().includes('KIRALIK'),
    )
      ? 'PORTFOY_KIRALIK'
      : 'PORTFOY_SATILIK';
  }

  private getStatusesFromPost(tags: string[]): UnitStatus[] {
    const requestType = tags
      .find((tag) => String(tag).startsWith('Talep Türü:'))
      ?.replace(/^Talep Türü:\s*/i, '')
      .toUpperCase();

    return requestType?.includes('KIRALIK')
      ? [UnitStatus.KIRALIK]
      : [UnitStatus.SATILIK];
  }

  private getPurchaseIntent(statuses: UnitStatus[]) {
    return statuses.some((status) =>
      String(status).toUpperCase().includes('KIRALIK'),
    )
      ? CustomerPurchaseIntent.KIRALAMA
      : CustomerPurchaseIntent.SATIN_ALMA;
  }

  private getPriority(urgency?: string | null) {
    const normalized = String(urgency || '').toLocaleLowerCase('tr-TR');

    if (normalized.includes('acil')) return CustomerInterestPriority.ACIL;
    if (normalized.includes('yüksek')) return CustomerInterestPriority.YUKSEK;
    if (normalized.includes('dusuk') || normalized.includes('düşük')) {
      return CustomerInterestPriority.DUSUK;
    }

    return CustomerInterestPriority.NORMAL;
  }

  private priorityToUrgency(priority: CustomerInterestPriority) {
    if (priority === CustomerInterestPriority.ACIL) return 'Acil';
    if (priority === CustomerInterestPriority.YUKSEK) return 'Yüksek';
    if (priority === CustomerInterestPriority.DUSUK) return 'Düşük';
    return 'Normal';
  }

  private getCustomerRoles(userRole: Role, postType: string): CustomerRole[] {
    if (userRole === Role.MUTEAHHIT) return [CustomerRole.MUTEAHHIT];
    if (userRole === Role.INSAAT_FIRMASI) {
      return [CustomerRole.INSAAT_FIRMASI];
    }
    if (postType === 'YATIRIMCI_ARIYORUM') {
      return [CustomerRole.YATIRIMCI];
    }

    return [CustomerRole.ALICI];
  }

  private normalizePostAreas(
    value: unknown,
    fallback: {
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
    },
  ) {
    const areas = Array.isArray(value)
      ? value
          .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return null;
            }

            const record = item as Record<string, unknown>;

            return {
              city: String(record.city || '').trim(),
              district: String(record.district || '').trim(),
              neighborhood: String(record.neighborhood || '').trim(),
            };
          })
          .filter(
            (item): item is {
              city: string;
              district: string;
              neighborhood: string;
            } => Boolean(item?.city || item?.district || item?.neighborhood),
          )
      : [];

    if (areas.length > 0) return areas;

    const fallbackArea = {
      city: String(fallback.city || '').trim(),
      district: String(fallback.district || '').trim(),
      neighborhood: String(fallback.neighborhood || '').trim(),
    };

    return fallbackArea.city || fallbackArea.district || fallbackArea.neighborhood
      ? [fallbackArea]
      : [];
  }

  private formatArea(area: {
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  }) {
    return [area.city, area.district, area.neighborhood]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join(' / ');
  }

  private formatBudget(
    minBudget?: number | null,
    maxBudget?: number | null,
    currency = 'TRY',
  ) {
    const format = (value: number) =>
      new Intl.NumberFormat('tr-TR', {
        maximumFractionDigits: 0,
      }).format(value);

    if (minBudget != null && maxBudget != null) {
      return `${format(minBudget)} - ${format(maxBudget)} ${currency}`;
    }
    if (minBudget != null) return `${format(minBudget)} ${currency} ve üzeri`;
    if (maxBudget != null) return `${format(maxBudget)} ${currency} ve altı`;
    return '';
  }

  private humanize(value: string) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replaceAll('_', ' ')
      .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase('tr-TR'));
  }

  private cleanName(value?: string | null) {
    return String(value || '').trim().slice(0, 80);
  }

  private trimText(value: string, maxLength: number) {
    return String(value || '').trim().slice(0, maxLength);
  }

  private async reserveLink(input: {
    ownerId: string;
    direction: CoordinationDirection;
    sourceEntityType: string;
    sourceEntityId: string;
  }): Promise<{ link: CoordinationLinkRow; acquired: boolean }> {
    const inserted = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      INSERT INTO "EphCoordinationLink" (
        "id",
        "ownerId",
        "direction",
        "sourceEntityType",
        "sourceEntityId",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.ownerId},
        ${input.direction},
        ${input.sourceEntityType},
        ${input.sourceEntityId},
        'PENDING',
        NOW(),
        NOW()
      )
      ON CONFLICT (
        "ownerId",
        "direction",
        "sourceEntityType",
        "sourceEntityId"
      ) DO NOTHING
      RETURNING *
    `;

    if (inserted[0]) {
      return { link: inserted[0], acquired: true };
    }

    const existing = await this.getLink(
      input.ownerId,
      input.direction,
      input.sourceEntityType,
      input.sourceEntityId,
    );

    if (!existing) {
      throw new ConflictException('Koordinasyon bağlantısı oluşturulamadı.');
    }

    if (existing.status === 'COMPLETE') {
      return { link: existing, acquired: false };
    }

    const isFreshPending =
      existing.status === 'PENDING' &&
      Date.now() - new Date(existing.updatedAt).getTime() < LINK_STALE_MS;

    if (isFreshPending) {
      throw new ConflictException('Bu koordinasyon işlemi halen devam ediyor.');
    }

    const reset = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      UPDATE "EphCoordinationLink"
      SET
        "status" = 'PENDING',
        "targetEntityType" = NULL,
        "targetEntityId" = NULL,
        "networkPostId" = NULL,
        "customerId" = NULL,
        "customerInterestId" = NULL,
        "unitId" = NULL,
        "metadata" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
      RETURNING *
    `;

    if (!reset[0]) {
      throw new ConflictException('Koordinasyon bağlantısı yeniden başlatılamadı.');
    }

    return { link: reset[0], acquired: true };
  }

  private async completeLink(
    linkId: string,
    input: {
      targetEntityType: string;
      targetEntityId: string;
      networkPostId?: string | null;
      customerId?: string | null;
      customerInterestId?: string | null;
      unitId?: string | null;
      metadata: Record<string, unknown>;
    },
  ) {
    const metadata = JSON.stringify(input.metadata);
    const rows = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      UPDATE "EphCoordinationLink"
      SET
        "targetEntityType" = ${input.targetEntityType},
        "targetEntityId" = ${input.targetEntityId},
        "networkPostId" = ${input.networkPostId || null},
        "customerId" = ${input.customerId || null},
        "customerInterestId" = ${input.customerInterestId || null},
        "unitId" = ${input.unitId || null},
        "status" = 'COMPLETE',
        "metadata" = ${metadata}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${linkId}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new ConflictException('Koordinasyon bağlantısı tamamlanamadı.');
    }

    return rows[0];
  }

  private async failLink(linkId: string, error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Bilinmeyen koordinasyon hatası';
    const metadata = JSON.stringify({ error: message.slice(0, 500) });

    await this.prisma.$executeRaw`
      UPDATE "EphCoordinationLink"
      SET
        "status" = 'FAILED',
        "metadata" = ${metadata}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${linkId}
    `;
  }

  private async getLink(
    ownerId: string,
    direction: CoordinationDirection,
    sourceEntityType: string,
    sourceEntityId: string,
  ) {
    const rows = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      SELECT *
      FROM "EphCoordinationLink"
      WHERE
        "ownerId" = ${ownerId}
        AND "direction" = ${direction}
        AND "sourceEntityType" = ${sourceEntityType}
        AND "sourceEntityId" = ${sourceEntityId}
      LIMIT 1
    `;

    return rows[0] || null;
  }
}
