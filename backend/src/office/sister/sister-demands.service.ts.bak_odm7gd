import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { consumeLots, lockWallet } from '../../kontor/wallet-lots';
import { KontorHareketTuru, KontorIslemTuru, KotaDonemi, Prisma, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SisterLinksService } from './sister-links.service';
import { fullName, resolveOfficeAccess, safeNotify } from './sister-shared';
import { resolveOfficeWallet } from '../office-wallet.rules';
import { readCost, readLimit } from '../../pricing/commercial-costs';
import { generateRequestListingNumber } from '../../common/listing-number';

export type CreateSisterDemandDto = {
  title: string;
  description?: string;
  type?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  budget?: number;
  minBudget?: number;
  maxBudget?: number;
  priceCurrency?: string;
  propertyTypes?: string[];
  roomCounts?: string[];
  minArea?: number;
  maxArea?: number;
  urgency?: string;
  tags?: string[];
  targetSisterOfficeIds?: string[];
  cardProfileCriteria?: Record<string, any>;
};

@Injectable()
export class SisterDemandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly links: SisterLinksService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private getBillingCycleRange(date: Date = new Date()): { start: Date; end: Date } {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')!.value);
    const month = Number(parts.find((p) => p.type === 'month')!.value);
    const start = new Date(Date.UTC(year, month - 1, 1, -3));
    const end = new Date(Date.UTC(year, month, 1, -3));
    return { start, end };
  }

  async getQuota(userId: string, officeId: string) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const isSuper = actor.isSuper;

    // Ofis aboneliğinden veya sistem ayarından kotayı oku (EPH_KURALLARI §0-B)
    const sub = await this.prisma.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${office.id}` } });
    const packageCode = (sub?.valueJson as Prisma.JsonObject | null)?.packageCode;
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
    const officePack = Array.isArray(setting?.valueJson)
      ? (setting.valueJson as Prisma.JsonObject[]).find(
          (p) => typeof p?.code === 'string' && p.code.trim().toUpperCase() === String(packageCode || '').trim().toUpperCase(),
        )
      : undefined;

    let limit = typeof officePack?.sisterDemandLimit === 'number'
      ? officePack.sisterDemandLimit
      : typeof officePack?.monthlySisterDemandLimit === 'number'
      ? officePack.monthlySisterDemandLimit
      : await readLimit(this.prisma, 'LIMIT_OFFICE_SISTER_TALEP_QUOTA');

    const overQuotaCost = await readCost(this.prisma, 'COST_SISTER_TALEP_ASIM');

    const walletUser = await resolveOfficeWallet(this.prisma, userId, { walletSource: 'OFFICE', walletOfficeId: office.id });
    const chargeUserId = walletUser.chargeUserId;

    const wallet = await this.prisma.kontorCuzdani.findUnique({
      where: { kullaniciId: chargeUserId },
      select: { bakiye: true, aktifMi: true },
    });

    const { start } = this.getBillingCycleRange();
    const kotaKodu = 'OFFICE_SISTER_TALEP';

    const usage = await this.prisma.kotaKullanimi.findUnique({
      where: {
        kullaniciId_kotaKodu_donem_donemBaslangic: {
          kullaniciId: chargeUserId,
          kotaKodu,
          donem: KotaDonemi.AYLIK,
          donemBaslangic: start,
        },
      },
    });

    const used = usage?.kullanilan ?? 0;
    const remaining = isSuper ? 999999 : Math.max(0, limit - used);
    const isOverQuota = isSuper ? false : used >= limit;

    return {
      limit: isSuper ? 999999 : limit,
      used,
      remaining,
      isOverQuota,
      overQuotaCost,
      officeWalletBalance: wallet?.bakiye ?? 0,
      isSuperAdmin: isSuper,
      chargeUserId,
    };
  }

  async list(
    userId: string,
    officeId: string,
    query: {
      q?: string;
      cursor?: string;
      take?: string | number;
      box?: 'all' | 'mine' | 'sisters';
      type?: string;
    } = {},
  ) {
    const { office } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const { partners, suspended } = await this.links.activePartners(office.id);

    // Kendi ofisimizin kullanıcıları
    const myUsers = await this.prisma.user.findMany({
      where: { OR: [{ officeId: office.id }, ...(office.ownerUserId ? [{ id: office.ownerUserId }] : [])] },
      select: { id: true },
    });
    const myUserIds = myUsers.map((u) => u.id);

    // Kardeş ofislerin kullanıcıları
    const partnerOfficeIds = partners.map((p) => p.office.id);
    const partnerOwnerIds = partners.map((p) => p.office.ownerUserId).filter((id): id is string => Boolean(id));

    const partnerUsers = partnerOfficeIds.length
      ? await this.prisma.user.findMany({
          where: { OR: [{ officeId: { in: partnerOfficeIds } }, { id: { in: partnerOwnerIds } }] },
          select: { id: true },
        })
      : [];
    const partnerUserIds = partnerUsers.map((u) => u.id);

    const box = query.box || 'all';
    let targetUserIds: string[] = [];
    if (box === 'mine') {
      targetUserIds = myUserIds;
    } else if (box === 'sisters') {
      targetUserIds = partnerUserIds;
    } else {
      targetUserIds = [...new Set([...myUserIds, ...partnerUserIds])];
    }

    if (!targetUserIds.length) {
      return { items: [], nextCursor: null, activePartnerCount: partners.length, suspended };
    }

    const andConditions: Prisma.NetworkPostWhereInput[] = [
      {
        isActive: true,
        expiresAt: { gt: new Date() },
        userId: { in: targetUserIds },
        tags: { has: 'KARDES_OFISLER' },
      },
    ];

    if (query.type) {
      andConditions.push({ type: query.type });
    }

    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    if (q) {
      const contains = { contains: q, mode: 'insensitive' as const };
      andConditions.push({
        OR: [{ title: contains }, { description: contains }, { city: contains }, { district: contains }, { neighborhood: contains }],
      });
    }

    const parsedTake = Number(query.take);
    const take = Number.isFinite(parsedTake) && parsedTake > 0 ? Math.min(Math.floor(parsedTake), 100) : 30;

    const rows = await this.prisma.networkPost.findMany({
      where: { AND: andConditions },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            officeId: true,
            office: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const page = rows.slice(0, take);
    const nextCursor = rows.length > take ? page[page.length - 1].id : null;

    const items = page.map((post) => {
      const isMine = myUserIds.includes(post.userId);
      const postOffice = post.User?.office ?? (post.userId === office.ownerUserId ? { id: office.id, name: office.name, code: office.code } : null);
      return {
        id: post.id,
        listingNumber: post.listingNumber,
        title: post.title,
        description: post.description,
        type: post.type,
        city: post.city,
        district: post.district,
        neighborhood: post.neighborhood,
        budget: post.budget,
        minBudget: post.minBudget,
        maxBudget: post.maxBudget,
        priceCurrency: post.priceCurrency,
        propertyTypes: post.propertyTypes,
        roomCounts: post.roomCounts,
        minArea: post.minArea,
        maxArea: post.maxArea,
        urgency: post.urgency,
        tags: post.tags,
        createdAt: post.createdAt,
        expiresAt: post.expiresAt,
        isMine,
        author: {
          id: post.User?.id || post.userId,
          fullName: post.User ? fullName(post.User) : 'Danışman',
          phone: post.User?.phone || null,
          office: postOffice ? { id: postOffice.id, name: postOffice.name, code: postOffice.code } : null,
        },
      };
    });

    return {
      items,
      nextCursor,
      activePartnerCount: partners.length,
      suspended,
    };
  }

  async create(userId: string, officeId: string, dto: CreateSisterDemandDto) {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Talep başlığı zorunludur.');
    }

    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const isSuper = actor.isSuper;

    const quotaInfo = await this.getQuota(userId, officeId);
    const { start, end } = this.getBillingCycleRange();
    const kotaKodu = 'OFFICE_SISTER_TALEP';

    const result = await this.prisma.$transaction(async (tx) => {
      let chargedKontor = 0;

      if (!isSuper) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sister-demand-quota:${quotaInfo.chargeUserId}:${start.toISOString()}`}))`;

        const quota = await tx.kotaKullanimi.upsert({
          where: {
            kullaniciId_kotaKodu_donem_donemBaslangic: {
              kullaniciId: quotaInfo.chargeUserId,
              kotaKodu,
              donem: KotaDonemi.AYLIK,
              donemBaslangic: start,
            },
          },
          create: {
            kullaniciId: quotaInfo.chargeUserId,
            kotaKodu,
            donem: KotaDonemi.AYLIK,
            limit: quotaInfo.limit,
            kullanilan: 0,
            donemBaslangic: start,
            donemBitis: end,
          },
          update: {
            limit: quotaInfo.limit,
            donemBitis: end,
          },
        });

        // Kota aşımı kontrolü: Ücretsiz limit dolmuşsa 10 PK (COST_SISTER_TALEP_ASIM) kesilir (Süper Admin muaf)
        if (quota.kullanilan >= quota.limit && !quotaInfo.isSuperAdmin) {
          chargedKontor = quotaInfo.overQuotaCost;

          await lockWallet(tx, quotaInfo.chargeUserId); // EPH-70B1F: ortak kilit sırası + atomik dönem sonu kapanışı

          let wallet = await tx.kontorCuzdani.findUnique({ where: { kullaniciId: quotaInfo.chargeUserId } });
          if (!wallet) {
            wallet = await tx.kontorCuzdani.create({
              data: {
                kullaniciId: quotaInfo.chargeUserId,
                bakiye: 0,
                toplamYukleme: 0,
                toplamHarcama: 0,
                toplamHediye: 0,
                aktifMi: true,
              },
            });
          }

          if (!wallet.aktifMi) {
            throw new BadRequestException('Ofis kontör cüzdanı aktif değil.');
          }

          if (wallet.bakiye < chargedKontor) {
            throw new BadRequestException(
              `Kardeş ofis talep kotanız (${quota.limit}) dolmuştur. Kotayı aşan talep için ofis cüzdanında en az ${chargedKontor} PK bulunmalıdır. Mevcut bakiye: ${wallet.bakiye} PK.`,
            );
          }

          const nextBalance = wallet.bakiye - chargedKontor;
          await tx.kontorCuzdani.update({
            where: { kullaniciId: quotaInfo.chargeUserId },
            data: {
              bakiye: { decrement: chargedKontor },
              toplamHarcama: { increment: chargedKontor },
            },
          });

          const sisterMovement = await tx.kontorHareketi.create({
            data: {
              kullaniciId: quotaInfo.chargeUserId,
              olusturanId: userId,
              hareketTuru: KontorHareketTuru.HARCAMA,
              islemTuru: KontorIslemTuru.FORUM_TALEP_OLUSTURMA,
              miktar: chargedKontor,
              oncekiBakiye: wallet.bakiye,
              sonrakiBakiye: nextBalance,
              aciklama: `Kardeş ofis talep kotası aşım ücreti (${chargedKontor} PK). Talep: "${dto.title.trim().slice(0, 40)}"`,
              ilgiliKayitTuru: 'NETWORK_POST',
            },
          });
          await consumeLots(tx, quotaInfo.chargeUserId, chargedKontor, { hareketId: sisterMovement.id }); // EPH-70B1F/D1
        }

        await tx.kotaKullanimi.update({
          where: { id: quota.id },
          data: { kullanilan: { increment: 1 } },
        });
      }

      // Benzersiz talep numarası üret
      let candidateListingNumber = generateRequestListingNumber();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await tx.networkPost.findUnique({ where: { listingNumber: candidateListingNumber }, select: { id: true } });
        if (!exists) break;
        candidateListingNumber = generateRequestListingNumber();
      }

      const tags = ['KARDES_OFISLER', ...(Array.isArray(dto.tags) ? dto.tags : [])];
      const uniqueTags = Array.from(new Set(tags));

      const cardProfileCriteria = {
        targetAudience: 'SISTER_OFFICES',
        sourceOfficeId: office.id,
        sourceOfficeName: office.name,
        targetSisterOfficeIds: Array.isArray(dto.targetSisterOfficeIds) ? dto.targetSisterOfficeIds : null,
        ...(dto.cardProfileCriteria || {}),
      };

      const defaultDays = 30;
      const expiresAt = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000);

      const post = await tx.networkPost.create({
        data: {
          id: randomUUID(),
          listingNumber: candidateListingNumber,
          User: { connect: { id: userId } },
          type: dto.type || 'KONUT',
          title: dto.title.trim(),
          description: dto.description?.trim() || '',
          city: dto.city || null,
          district: dto.district || null,
          neighborhood: dto.neighborhood || null,
          budget: dto.budget ? Number(dto.budget) : null,
          minBudget: dto.minBudget ? Number(dto.minBudget) : null,
          maxBudget: dto.maxBudget ? Number(dto.maxBudget) : null,
          priceCurrency: dto.priceCurrency || 'TRY',
          propertyTypes: (dto.propertyTypes as any) || [],
          roomCounts: dto.roomCounts || [],
          minArea: dto.minArea ? Number(dto.minArea) : null,
          maxArea: dto.maxArea ? Number(dto.maxArea) : null,
          urgency: dto.urgency || 'Normal',
          tags: uniqueTags,
          cardProfileCriteria: cardProfileCriteria as unknown as Prisma.InputJsonValue,
          visibility: 'TUM_EPH',
          isActive: true,
          expiresAt,
          updatedAt: new Date(),
        },
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      return { post, chargedKontor };
    });

    // Kardeş ofislere güvenli bildirim gönder
    const { partners } = await this.links.activePartners(office.id);
    const targetPartners = Array.isArray(dto.targetSisterOfficeIds) && dto.targetSisterOfficeIds.length
      ? partners.filter((p) => dto.targetSisterOfficeIds!.includes(p.office.id))
      : partners;

    for (const p of targetPartners) {
      if (p.office.ownerUserId) {
        await safeNotify(this.notifications, p.office.ownerUserId, {
          type: 'SISTER_DEMAND',
          title: 'Yeni Kardeş Ofis Talebi',
          body: `${office.name} yeni bir talep paylaştı: ${dto.title.trim()}`,
          actionUrl: `/office-sister-demands?officeId=${p.office.id}`,
          eventKey: `sister-demand:${result.post.id}:${p.office.id}`,
          priority: 'ONEMLI',
        });
      }
    }

    return {
      ok: true,
      post: result.post,
      chargedKontor: result.chargedKontor,
    };
  }
}
