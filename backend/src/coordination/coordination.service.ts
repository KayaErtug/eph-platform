import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CustomerInterestPriority,
  CustomerPurchaseIntent,
  CustomerRole,
  KontorHareketTuru,
  Prisma,
  Role,
  UnitStatus,
} from '@prisma/client';

import { CrmService } from '../crm/crm.service';
import { NetworkService } from '../network/network.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CoordinationLinkRepository,
  CoordinationLinkRow,
} from './coordination-link.repository';
import { PublishCrmInterestDto } from './dto/publish-crm-interest.dto';

type CoordinationUser = {
  id?: string;
  role?: Role | string;
};

@Injectable()
export class CoordinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
    private readonly networkService: NetworkService,
    private readonly linkRepository: CoordinationLinkRepository,
  ) {}

  async publishCrmInterestToRequestCenter(
    interestId: string,
    rawUser: CoordinationUser,
    body: PublishCrmInterestDto = {},
  ) {
    const user = await this.resolveUser(rawUser);
    const interest = await this.findInterestForUser(interestId, user);
    const reservation = await this.linkRepository.reserve({
      ownerId: user.id,
      direction: 'CRM_TO_REQUEST',
      sourceEntityType: 'CUSTOMER_INTEREST',
      sourceEntityId: interest.id,
    });

    if (!reservation.acquired) {
      return this.getExistingRequestPublication(reservation.link);
    }

    let createdPostId: string | null = null;

    try {
      const post = await this.networkService.create(
        this.buildNetworkPostInput(interest, body) as any,
        user.id,
      );
      createdPostId = post.id;

      const link = await this.linkRepository.complete(
        reservation.link.id,
        {
          targetEntityType: 'NETWORK_POST',
          targetEntityId: post.id,
          networkPostId: post.id,
          customerId: interest.customerId,
          customerInterestId: interest.id,
          metadata: {
            sourceModule: 'CRM',
            targetModule: 'REQUEST_CENTER',
            privacyMode: 'NO_CUSTOMER_PERSONAL_DATA',
            criteriaVersion: 1,
          },
        },
      );

      await Promise.allSettled([
        this.crmService.addActivity(
          interest.customerId,
          user.id,
          user.role,
          {
            type: ActivityType.DIGER,
            note:
              `CRM talebi Talep Merkezi’nde yayınlandı. ` +
              `Talep kaydı: ${post.id}`,
          },
        ),
        this.writeAudit({
          actorId: user.id,
          targetUserId: interest.customer.ownerId,
          action: 'CRM_INTEREST_PUBLISHED_TO_REQUEST_CENTER',
          entityId: interest.id,
          description:
            'CRM talep profili kişisel bilgiler paylaşılmadan Talep Merkezi’nde yayınlandı.',
          metadata: {
            linkId: link.id,
            customerId: interest.customerId,
            customerInterestId: interest.id,
            networkPostId: post.id,
          },
        }),
      ]);

      return {
        created: true,
        link,
        networkPost: post,
        message: 'CRM talebi Talep Merkezi’nde yayınlandı.',
      };
    } catch (error) {
      await this.linkRepository
        .fail(reservation.link.id, error)
        .catch(() => undefined);

      if (createdPostId) {
        await this.compensateNetworkPostCreation(
          createdPostId,
          user.id,
        ).catch(() => undefined);
      }

      await this.writeAudit({
        actorId: user.id,
        targetUserId: interest.customer.ownerId,
        action: 'CRM_INTEREST_PUBLICATION_FAILED',
        entityId: interest.id,
        description:
          'CRM talebinin Talep Merkezi’nde yayınlanması tamamlanamadı.',
        metadata: {
          linkId: reservation.link.id,
          customerId: interest.customerId,
          customerInterestId: interest.id,
          createdPostId,
          error: this.getErrorMessage(error),
        },
      }).catch(() => undefined);

      throw error;
    }
  }

  async createCrmOpportunityFromRequest(
    postId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    const post = await this.findActiveRequestPost(postId);
    const reservation = await this.linkRepository.reserve({
      ownerId: user.id,
      direction: 'REQUEST_TO_CRM',
      sourceEntityType: 'NETWORK_POST',
      sourceEntityId: post.id,
    });

    if (!reservation.acquired) {
      return this.getExistingCrmOpportunity(reservation.link);
    }

    let createdCustomerId: string | null = null;

    try {
      const areas = this.normalizePostAreas(post.areas, {
        city: post.city,
        district: post.district,
        neighborhood: post.neighborhood,
      });
      const statuses = this.getStatusesFromPost(post.tags);
      const createdCustomer = await this.crmService.createCustomer(
        user.id,
        {
          firstName:
            this.cleanName(post.User.firstName) || 'Talep',
          lastName:
            this.cleanName(post.User.lastName) || 'Merkezi',
          roles: this.getCustomerRoles(
            post.User.role,
            post.type,
          ),
          source: 'TALEP_MERKEZI',
          notes:
            `Talep Merkezi fırsatı: ${post.title}. ` +
            'İletişim Talep Merkezi üzerinden yürütülmelidir.',
          interestedArea: areas
            .map((area) => this.formatArea(area))
            .join(' | '),
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
        },
      );

      if (!createdCustomer) {
        throw new BadRequestException(
          'CRM fırsatı oluşturulamadı.',
        );
      }

      createdCustomerId = createdCustomer.id;
      const customer = await this.ensureCustomerInterestLocations(
        createdCustomer.id,
        areas,
      );
      const primaryInterestId =
        customer.interests[0]?.id || null;

      const link = await this.linkRepository.complete(
        reservation.link.id,
        {
          targetEntityType: 'CUSTOMER',
          targetEntityId: customer.id,
          networkPostId: post.id,
          customerId: customer.id,
          customerInterestId: primaryInterestId,
          metadata: {
            sourceModule: 'REQUEST_CENTER',
            targetModule: 'CRM',
            privacyMode: 'PUBLIC_EPH_IDENTITY_ONLY',
            customerInterestIds: customer.interests.map(
              (item) => item.id,
            ),
          },
        },
      );

      const tomorrow = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      await Promise.allSettled([
        this.crmService.addActivity(
          customer.id,
          user.id,
          user.role,
          {
            type: ActivityType.DIGER,
            note:
              `Talep Merkezi kaydından CRM fırsatı oluşturuldu. ` +
              `Kaynak talep: ${post.id}`,
          },
        ),
        this.crmService.addTask(
          customer.id,
          user.id,
          user.role,
          {
            title:
              'Talep sahibiyle Talep Merkezi üzerinden iletişime geç',
            dueDate: tomorrow,
          },
        ),
        this.writeAudit({
          actorId: user.id,
          targetUserId: post.userId,
          action: 'REQUEST_CENTER_POST_CONVERTED_TO_CRM',
          entityId: post.id,
          description:
            'Talep Merkezi kaydı, iletişim bilgileri kopyalanmadan özel CRM fırsatına dönüştürüldü.',
          metadata: {
            linkId: link.id,
            networkPostId: post.id,
            customerId: customer.id,
            customerInterestId: primaryInterestId,
          },
        }),
      ]);

      return {
        created: true,
        link,
        customer,
        message:
          'Talep Merkezi kaydı özel CRM fırsatına dönüştürüldü.',
      };
    } catch (error) {
      await this.linkRepository
        .fail(reservation.link.id, error)
        .catch(() => undefined);

      if (createdCustomerId) {
        await this.crmService
          .deleteCustomer(
            createdCustomerId,
            user.id,
            user.role,
          )
          .catch(() => undefined);
      }

      await this.writeAudit({
        actorId: user.id,
        targetUserId: post.userId,
        action: 'REQUEST_CENTER_TO_CRM_FAILED',
        entityId: post.id,
        description:
          'Talep Merkezi kaydının CRM fırsatına dönüştürülmesi tamamlanamadı.',
        metadata: {
          linkId: reservation.link.id,
          networkPostId: post.id,
          createdCustomerId,
          error: this.getErrorMessage(error),
        },
      }).catch(() => undefined);

      throw error;
    }
  }

  async getCrmInterestRequestStatus(
    interestId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    await this.findInterestForUser(interestId, user);

    return this.linkRepository.find(
      user.id,
      'CRM_TO_REQUEST',
      'CUSTOMER_INTEREST',
      interestId,
    );
  }

  async getRequestCrmStatus(
    postId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    await this.findActiveRequestPost(postId);

    return this.linkRepository.find(
      user.id,
      'REQUEST_TO_CRM',
      'NETWORK_POST',
      postId,
    );
  }

  private async getExistingRequestPublication(
    link: CoordinationLinkRow,
  ) {
    const post = link.networkPostId
      ? await this.prisma.networkPost.findUnique({
          where: { id: link.networkPostId },
        })
      : null;

    return {
      created: false,
      link,
      networkPost: post,
      message:
        'Bu CRM talebi daha önce Talep Merkezi ile bağlandı.',
    };
  }

  private async getExistingCrmOpportunity(
    link: CoordinationLinkRow,
  ) {
    const customer = link.customerId
      ? await this.prisma.customer.findUnique({
          where: { id: link.customerId },
          include: {
            interests: {
              orderBy: { createdAt: 'asc' },
            },
          },
        })
      : null;

    return {
      created: false,
      link,
      customer,
      message:
        'Bu Talep Merkezi kaydı daha önce CRM fırsatına dönüştürüldü.',
    };
  }

  private async resolveUser(rawUser: CoordinationUser) {
    const id = String(rawUser?.id || '').trim();

    if (!id) {
      throw new ForbiddenException(
        'Koordinasyon işlemi için giriş yapmalısınız.',
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

  private async findInterestForUser(
    interestId: string,
    user: { id: string; role: Role },
  ) {
    const interest =
      await this.prisma.customerInterest.findUnique({
        where: { id: interestId },
        include: { customer: true },
      });

    if (!interest) {
      throw new NotFoundException(
        'CRM talep profili bulunamadı.',
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
        'Pasif CRM talebi yayınlanamaz.',
      );
    }

    return interest;
  }

  private async findActiveRequestPost(postId: string) {
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
      throw new NotFoundException(
        'Aktif Talep Merkezi kaydı bulunamadı.',
      );
    }

    return post;
  }

  private buildNetworkPostInput(
    interest: Awaited<
      ReturnType<CoordinationService['findInterestForUser']>
    >,
    body: PublishCrmInterestDto,
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

    const requestType = this.getRequestType(
      interest.statuses,
    );
    const propertyText = interest.propertyTypes.length
      ? interest.propertyTypes
          .map((item) => this.humanize(item))
          .join(', ')
      : 'gayrimenkul';
    const budgetText = this.formatBudget(
      interest.minBudget,
      interest.maxBudget,
      interest.priceCurrency,
    );
    const generatedTitle =
      `${location} ${propertyText} arayışı`;
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
      title: this.trimText(
        body.title || interest.title || generatedTitle,
        50,
      ),
      description: this.trimText(
        body.description || generatedDescription,
        200,
      ),
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
      urgency:
        body.urgency ||
        this.priorityToUrgency(interest.priority),
      visibility: 'TUM_EPH',
      tags: [
        `Talep Türü:${requestType}`,
        'CRM Talep Profili',
      ],
      expiresAt: new Date(
        Date.now() +
          expiresInDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      acknowledgedWarningCodes: Array.isArray(
        body.acknowledgedWarningCodes,
      )
        ? body.acknowledgedWarningCodes
        : [],
    };
  }

  private async ensureCustomerInterestLocations(
    customerId: string,
    areas: Array<{
      city: string;
      district: string;
      neighborhood: string;
    }>,
  ) {
    let customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        interests: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!customer) {
      throw new BadRequestException(
        'Oluşturulan CRM fırsatı okunamadı.',
      );
    }

    const primaryArea = areas[0];
    const primaryInterest = customer.interests[0];

    if (
      primaryArea &&
      primaryInterest &&
      !primaryInterest.city
    ) {
      await this.prisma.customerInterest.update({
        where: { id: primaryInterest.id },
        data: {
          city: primaryArea.city || null,
          district: primaryArea.district || null,
          neighborhood:
            primaryArea.neighborhood || null,
        },
      });

      customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          interests: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!customer) {
      throw new BadRequestException(
        'CRM fırsatı güncellenemedi.',
      );
    }

    return customer;
  }

  private async compensateNetworkPostCreation(
    postId: string,
    userId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const post = await tx.networkPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true },
      });

      if (!post || post.userId !== userId) {
        return;
      }

      const movements = await tx.kontorHareketi.findMany({
        where: {
          kullaniciId: userId,
          hareketTuru: KontorHareketTuru.HARCAMA,
          ilgiliKayitTuru: 'NETWORK_POST',
          ilgiliKayitId: postId,
        },
        orderBy: { olusturulmaTarihi: 'asc' },
      });

      for (const movement of movements) {
        const marker =
          `[KOORDINASYON_IADE:${movement.id}]`;
        const existingRefund =
          await tx.kontorHareketi.findFirst({
            where: {
              kullaniciId: userId,
              hareketTuru: KontorHareketTuru.IADE,
              aciklama: { contains: marker },
            },
          });

        if (existingRefund) {
          continue;
        }

        const wallet = await tx.kontorCuzdani.findUnique({
          where: { kullaniciId: userId },
        });

        if (!wallet) {
          continue;
        }

        const nextBalance =
          wallet.bakiye + movement.miktar;

        await tx.kontorCuzdani.update({
          where: { kullaniciId: userId },
          data: {
            bakiye: nextBalance,
            toplamHarcama: Math.max(
              0,
              wallet.toplamHarcama - movement.miktar,
            ),
          },
        });

        await tx.kontorHareketi.create({
          data: {
            kullaniciId: userId,
            hareketTuru: KontorHareketTuru.IADE,
            islemTuru: movement.islemTuru,
            miktar: movement.miktar,
            oncekiBakiye: wallet.bakiye,
            sonrakiBakiye: nextBalance,
            aciklama:
              `Başarısız koordinasyon işlemi için kontör iadesi. ${marker}`,
            ilgiliKayitTuru: 'NETWORK_POST',
            ilgiliKayitId: postId,
            olusturanId: userId,
          },
        });
      }

      await tx.networkPost.update({
        where: { id: postId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    });
  }

  private async writeAudit(input: {
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

  private getRequestType(statuses: UnitStatus[]) {
    return statuses.some((status) =>
      String(status).toUpperCase().includes('KIRALIK'),
    )
      ? 'PORTFOY_KIRALIK'
      : 'PORTFOY_SATILIK';
  }

  private getStatusesFromPost(tags: string[]) {
    const requestType = tags
      .find((tag) =>
        String(tag).startsWith('Talep Türü:'),
      )
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
    const normalized = String(urgency || '')
      .toLocaleLowerCase('tr-TR');

    if (normalized.includes('acil')) {
      return CustomerInterestPriority.ACIL;
    }
    if (normalized.includes('yüksek')) {
      return CustomerInterestPriority.YUKSEK;
    }
    if (
      normalized.includes('dusuk') ||
      normalized.includes('düşük')
    ) {
      return CustomerInterestPriority.DUSUK;
    }

    return CustomerInterestPriority.NORMAL;
  }

  private priorityToUrgency(
    priority: CustomerInterestPriority,
  ) {
    if (priority === CustomerInterestPriority.ACIL) {
      return 'Acil';
    }
    if (priority === CustomerInterestPriority.YUKSEK) {
      return 'Yüksek';
    }
    if (priority === CustomerInterestPriority.DUSUK) {
      return 'Düşük';
    }
    return 'Normal';
  }

  private getCustomerRoles(
    userRole: Role,
    postType: string,
  ): CustomerRole[] {
    if (userRole === Role.MUTEAHHIT) {
      return [CustomerRole.MUTEAHHIT];
    }
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
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              return null;
            }

            const record = item as Record<string, unknown>;

            return {
              city: String(record.city || '').trim(),
              district: String(
                record.district || '',
              ).trim(),
              neighborhood: String(
                record.neighborhood || '',
              ).trim(),
            };
          })
          .filter(
            (
              item,
            ): item is {
              city: string;
              district: string;
              neighborhood: string;
            } =>
              Boolean(
                item?.city ||
                  item?.district ||
                  item?.neighborhood,
              ),
          )
      : [];

    if (areas.length > 0) {
      return areas;
    }

    const fallbackArea = {
      city: String(fallback.city || '').trim(),
      district: String(fallback.district || '').trim(),
      neighborhood: String(
        fallback.neighborhood || '',
      ).trim(),
    };

    return fallbackArea.city ||
      fallbackArea.district ||
      fallbackArea.neighborhood
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
    if (minBudget != null) {
      return `${format(minBudget)} ${currency} ve üzeri`;
    }
    if (maxBudget != null) {
      return `${format(maxBudget)} ${currency} ve altı`;
    }
    return '';
  }

  private humanize(value: string) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replaceAll('_', ' ')
      .replace(/(^|\s)\S/g, (letter) =>
        letter.toLocaleUpperCase('tr-TR'),
      );
  }

  private cleanName(value?: string | null) {
    return String(value || '').trim().slice(0, 80);
  }

  private trimText(value: string, maxLength: number) {
    return String(value || '')
      .trim()
      .slice(0, maxLength);
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error
      ? error.message.slice(0, 500)
      : 'Bilinmeyen koordinasyon hatası';
  }
}
