import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LinaDurum,
  LinaGorevOnceligi,
  LinaModul,
  Role,
  UnitStatus,
} from '@prisma/client';

import { CrmService } from '../crm/crm.service';
import { PrismaService } from '../prisma/prisma.service';

type CoordinationUser = {
  id?: string;
  role?: Role | string;
};

type RequestArea = {
  city: string;
  district: string;
  neighborhood: string;
};

const CRM_MATCH_NOTIFICATION = 'CRM_INTEREST_POOL_MATCH';
const REQUEST_MATCH_NOTIFICATION = 'NETWORK_POST_PORTFOLIO_MATCH';

@Injectable()
export class CoordinationRecalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  async getAlerts(rawUser: CoordinationUser) {
    const user = await this.resolveUser(rawUser);

    const [interests, linkedProperties, ownPosts, requestNotifications] =
      await Promise.all([
        this.prisma.customerInterest.findMany({
          where: {
            isActive: true,
            customer: { ownerId: user.id },
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            lastMatchedAt: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.customerProperty.findMany({
          where: {
            customer: { ownerId: user.id },
            unit: { isPoolVisible: true },
          },
          select: {
            id: true,
            updatedAt: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            unit: {
              select: {
                id: true,
                updatedAt: true,
                number: true,
                project: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.networkPost.findMany({
          where: {
            userId: user.id,
            isActive: true,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.linaBildirim.findMany({
          where: {
            kullaniciId: user.id,
            ilgiliKayitTuru: REQUEST_MATCH_NOTIFICATION,
          },
          select: {
            ilgiliKayitId: true,
            olusturulmaTarihi: true,
          },
          orderBy: { olusturulmaTarihi: 'desc' },
        }),
      ]);

    const alerts: Array<{
      type: string;
      entityId: string;
      title: string;
      message: string;
      updatedAt: string;
      action: string;
    }> = [];

    interests.forEach((interest) => {
      const stale =
        !interest.lastMatchedAt ||
        interest.updatedAt.getTime() > interest.lastMatchedAt.getTime();

      if (!stale) return;

      const customerName = `${interest.customer.firstName} ${interest.customer.lastName}`.trim();
      alerts.push({
        type: 'CRM_INTEREST_STALE',
        entityId: interest.id,
        title: interest.title || `${customerName} talebi`,
        message:
          'CRM talebi son Havuz taramasından sonra değişti. Lina yeniden eşleştirme öneriyor.',
        updatedAt: interest.updatedAt.toISOString(),
        action: 'RECALCULATE_CRM_INTEREST',
      });
    });

    linkedProperties.forEach((relation) => {
      if (relation.unit.updatedAt.getTime() <= relation.updatedAt.getTime()) {
        return;
      }

      const customerName = `${relation.customer.firstName} ${relation.customer.lastName}`.trim();
      const portfolioName =
        relation.unit.project?.name || relation.unit.number || 'Havuz portföyü';

      alerts.push({
        type: 'POOL_UNIT_STALE',
        entityId: relation.unit.id,
        title: portfolioName,
        message: `${customerName} ile bağlı portföy güncellendi. Eşleşme puanı yeniden hesaplanmalı.`,
        updatedAt: relation.unit.updatedAt.toISOString(),
        action: 'RECALCULATE_POOL_LINK',
      });
    });

    const lastRequestScanByPost = new Map<string, Date>();
    requestNotifications.forEach((notification) => {
      const postId = String(notification.ilgiliKayitId || '').trim();
      if (!postId || lastRequestScanByPost.has(postId)) return;
      lastRequestScanByPost.set(postId, notification.olusturulmaTarihi);
    });

    ownPosts.forEach((post) => {
      const lastScan = lastRequestScanByPost.get(post.id);
      if (lastScan && post.updatedAt.getTime() <= lastScan.getTime()) return;

      alerts.push({
        type: 'REQUEST_POST_STALE',
        entityId: post.id,
        title: post.title,
        message:
          'Talep Merkezi kaydı değişti veya henüz taranmadı. Lina kendi portföylerinizle yeniden karşılaştırma öneriyor.',
        updatedAt: post.updatedAt.toISOString(),
        action: 'RECALCULATE_REQUEST_PORTFOLIOS',
      });
    });

    alerts.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );

    return {
      count: alerts.length,
      alerts,
    };
  }

  async recalculateCrmInterest(
    interestId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    const interest = await this.prisma.customerInterest.findUnique({
      where: { id: interestId },
      include: {
        customer: {
          select: {
            ownerId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!interest) {
      throw new NotFoundException('CRM talep profili bulunamadı.');
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      interest.customer.ownerId !== user.id
    ) {
      throw new ForbiddenException('Bu CRM talebini tarama yetkiniz yok.');
    }

    const wasStale =
      !interest.lastMatchedAt ||
      interest.updatedAt.getTime() > interest.lastMatchedAt.getTime();
    const matches = await this.crmService.getCustomerInterestMatches(
      interest.id,
      user.id,
      user.role,
    );
    const topMatch = matches[0] || null;

    if (wasStale) {
      const customerName = `${interest.customer.firstName} ${interest.customer.lastName}`.trim();
      const message = topMatch
        ? `${customerName} için en güçlü Havuz eşleşmesi %${topMatch.matchScore}: ${topMatch.projectName || 'Portföy'}.`
        : `${customerName} için güncel Havuz taramasında uygun portföy bulunamadı.`;

      await this.createLinaNotification({
        userId: user.id,
        module: LinaModul.CRM,
        title: 'CRM–Havuz eşleşmesi yenilendi',
        message,
        relatedType: CRM_MATCH_NOTIFICATION,
        relatedId: interest.id,
        targetUrl: '/crm',
        priority:
          topMatch && topMatch.matchScore >= 80
            ? LinaGorevOnceligi.YUKSEK
            : LinaGorevOnceligi.NORMAL,
      });
    }

    return {
      recalculatedAt: new Date().toISOString(),
      wasStale,
      warning: topMatch
        ? `Lina ${matches.length} Havuz eşleşmesi buldu. En güçlü eşleşme %${topMatch.matchScore}.`
        : 'Lina güncel kriterlerle uygun Havuz portföyü bulamadı.',
      matches,
    };
  }

  async recalculateRequestPortfolioMatches(
    postId: string,
    rawUser: CoordinationUser,
  ) {
    const user = await this.resolveUser(rawUser);
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id: postId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!post) {
      throw new NotFoundException('Aktif Talep Merkezi kaydı bulunamadı.');
    }

    const units = await this.prisma.unit.findMany({
      where: {
        project: { ownerId: user.id },
        isSalesInventory: true,
        isOffMarket: false,
      },
      include: {
        project: true,
        images: {
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const areas = this.normalizeAreas(post.areas, {
      city: post.city,
      district: post.district,
      neighborhood: post.neighborhood,
    });
    const statuses = this.getStatusesFromPost(post.tags);

    const matches = units
      .map((unit) => {
        let score = 0;
        const reasons: string[] = [];
        const unitCity = this.normalizeText(unit.project?.city);
        const unitDistrict = this.normalizeText(unit.project?.district);
        const unitAddress = this.normalizeText(
          unit.project?.mapAddress || unit.project?.address,
        );

        const bestAreaScore = areas.reduce((best, area) => {
          let areaScore = 0;
          if (area.city && area.city === unitCity) areaScore += 15;
          if (area.district && area.district === unitDistrict) areaScore += 20;
          if (
            area.neighborhood &&
            unitAddress.includes(area.neighborhood)
          ) {
            areaScore += 15;
          }
          return Math.max(best, areaScore);
        }, 0);

        if (bestAreaScore > 0) {
          score += bestAreaScore;
          reasons.push('Konum kriterleri uyumlu');
        }

        if (
          post.propertyTypes.length > 0 &&
          post.propertyTypes.includes(unit.type)
        ) {
          score += 15;
          reasons.push('Gayrimenkul tipi uyumlu');
        }

        if (statuses.length > 0 && statuses.includes(unit.status)) {
          score += 10;
          reasons.push('İşlem türü uyumlu');
        }

        const minBudget = post.minBudget ?? post.budget;
        const maxBudget = post.maxBudget ?? post.budget;
        if (
          minBudget != null &&
          maxBudget != null &&
          unit.price >= minBudget &&
          unit.price <= maxBudget
        ) {
          score += 15;
          reasons.push('Bütçe aralığında');
        } else if (maxBudget != null && unit.price <= maxBudget) {
          score += 10;
          reasons.push('Maksimum bütçeye uygun');
        }

        const unitArea = unit.area ?? unit.grossArea ?? unit.netArea;
        if (
          unitArea != null &&
          post.minArea != null &&
          post.maxArea != null &&
          unitArea >= post.minArea &&
          unitArea <= post.maxArea
        ) {
          score += 5;
          reasons.push('Metrekare uyumlu');
        }

        if (
          post.roomCounts.length > 0 &&
          unit.roomCount &&
          post.roomCounts.includes(unit.roomCount)
        ) {
          score += 3;
          reasons.push('Oda sayısı uyumlu');
        }

        const commonFeatures = post.features.filter((feature) =>
          unit.features.includes(feature),
        );
        if (commonFeatures.length > 0) {
          score += Math.min(2, commonFeatures.length);
          reasons.push(`${commonFeatures.length} ortak özellik`);
        }

        return {
          unitId: unit.id,
          projectName: unit.project?.name || null,
          city: unit.project?.city || null,
          district: unit.project?.district || null,
          neighborhood: unit.project?.address || null,
          type: unit.type,
          status: unit.status,
          price: unit.price,
          roomCount: unit.roomCount,
          area: unitArea,
          coverImage: unit.images[0]?.url || null,
          matchScore: Math.min(100, score),
          matchReasons: reasons,
          updatedAt: unit.updatedAt.toISOString(),
        };
      })
      .filter((match) => match.matchScore > 0)
      .sort((left, right) => right.matchScore - left.matchScore);

    const latestPortfolioUpdate = units.reduce<Date | null>((latest, unit) => {
      if (!latest || unit.updatedAt.getTime() > latest.getTime()) {
        return unit.updatedAt;
      }
      return latest;
    }, null);
    const lastNotification = await this.prisma.linaBildirim.findFirst({
      where: {
        kullaniciId: user.id,
        ilgiliKayitTuru: REQUEST_MATCH_NOTIFICATION,
        ilgiliKayitId: post.id,
      },
      orderBy: { olusturulmaTarihi: 'desc' },
      select: { olusturulmaTarihi: true },
    });
    const changedAt = [post.updatedAt, latestPortfolioUpdate]
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const wasStale =
      !lastNotification ||
      (changedAt &&
        changedAt.getTime() > lastNotification.olusturulmaTarihi.getTime());
    const topMatch = matches[0] || null;

    if (wasStale) {
      await this.createLinaNotification({
        userId: user.id,
        module: LinaModul.FORUM,
        title: 'Talep–Portföy eşleşmesi yenilendi',
        message: topMatch
          ? `${post.title} için kendi portföylerinizde %${topMatch.matchScore} eşleşen ${topMatch.projectName || 'bir portföy'} bulundu.`
          : `${post.title} için kendi portföylerinizde güncel eşleşme bulunamadı.`,
        relatedType: REQUEST_MATCH_NOTIFICATION,
        relatedId: post.id,
        targetUrl: '/network',
        priority:
          topMatch && topMatch.matchScore >= 80
            ? LinaGorevOnceligi.YUKSEK
            : LinaGorevOnceligi.NORMAL,
      });
    }

    return {
      recalculatedAt: new Date().toISOString(),
      wasStale,
      warning: topMatch
        ? `Lina ${matches.length} portföy eşleşmesi buldu. En güçlü eşleşme %${topMatch.matchScore}.`
        : 'Lina kendi portföylerinizde uygun eşleşme bulamadı.',
      matches,
    };
  }

  private async resolveUser(rawUser: CoordinationUser) {
    const id = String(rawUser?.id || '').trim();
    if (!id) {
      throw new ForbiddenException('Koordinasyon işlemi için giriş yapmalısınız.');
    }

    const suppliedRole = String(rawUser?.role || '').trim().toUpperCase();
    const role = Object.values(Role).find((item) => item === suppliedRole);
    if (role) return { id, role };

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    return { id, role: user.role };
  }

  private normalizeAreas(
    value: unknown,
    fallback: {
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
    },
  ): RequestArea[] {
    const areas = Array.isArray(value)
      ? value
          .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return null;
            }
            const record = item as Record<string, unknown>;
            return {
              city: this.normalizeText(record.city),
              district: this.normalizeText(record.district),
              neighborhood: this.normalizeText(record.neighborhood),
            };
          })
          .filter((item): item is RequestArea => Boolean(item))
          .filter((item) => item.city || item.district || item.neighborhood)
      : [];

    if (areas.length > 0) return areas;

    const fallbackArea = {
      city: this.normalizeText(fallback.city),
      district: this.normalizeText(fallback.district),
      neighborhood: this.normalizeText(fallback.neighborhood),
    };

    return fallbackArea.city || fallbackArea.district || fallbackArea.neighborhood
      ? [fallbackArea]
      : [];
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

  private normalizeText(value: unknown) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ');
  }

  private async createLinaNotification(input: {
    userId: string;
    module: LinaModul;
    title: string;
    message: string;
    relatedType: string;
    relatedId: string;
    targetUrl: string;
    priority: LinaGorevOnceligi;
  }) {
    return this.prisma.linaBildirim.create({
      data: {
        kullaniciId: input.userId,
        modul: input.module,
        baslik: input.title,
        mesaj: input.message,
        bildirimTuru: 'ESLESME_YENILENDI',
        oncelik: input.priority,
        hedefUrl: input.targetUrl,
        ilgiliKayitTuru: input.relatedType,
        ilgiliKayitId: input.relatedId,
        sesliMi: false,
        epostaMi: false,
        okunduMu: false,
        gonderildiMi: true,
        gonderimTarihi: new Date(),
        durum: LinaDurum.TAMAMLANDI,
      },
    });
  }
}
