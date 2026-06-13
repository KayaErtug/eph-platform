import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CustomerPropertyRelation,
  CustomerStatus,
  KontorHareketTuru,
  KontorIslemTuru,
  PortfolioApprovalStatus,
  Role,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUserPayload = {
  id: string;
  role?: Role | string;
};

type CreateUnitPayload = {
  type: UnitType;
  floor?: number;
  floorLabel?: string;
  totalFloors?: number;
  priceCurrency?: string;
  number?: string;
  roomCount?: string;
  area?: number;
  price: number;
  status?: UnitStatus;
  description?: string;
  deedOwnerFullName?: string;
  deedOwnerPhone?: string;
  deedOwnerEmail?: string;
  availableCreditAmount?: number | string | null;
  doorAccessInfo?: string | null;
  features?: string[];
};

type PoolActionPayload = {
  message?: string;
  matchScore?: number;
  note?: string;
};

const unitInclude = {
  project: {
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      address: true,
      latitude: true,
      longitude: true,
      mapAddress: true,
      placeId: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          memberCode: true,
        },
      },
    },
  },
  images: {
    orderBy: [
      { isCover: 'desc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
};

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
  }

  private isAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.ADMIN || user?.role === 'ADMIN';
  }

  private isModerator(user?: CurrentUserPayload) {
    return user?.role === Role.MODERATOR || user?.role === 'MODERATOR';
  }

  private isApprovalManager(user?: CurrentUserPayload) {
    return this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user);
  }

  private isOwner(user: CurrentUserPayload, ownerId: string) {
    return Boolean(user?.id && ownerId && user.id === ownerId);
  }

  private ensureCanViewUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföyü görüntüleme yetkiniz yok.');
  }

  private ensureCanManageUnit(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user)) return;
    if (this.isOwner(user, ownerId)) return;

    throw new ForbiddenException('Bu portföy için işlem yetkiniz yok.');
  }

  private ensureApprovalManager(user: CurrentUserPayload) {
    if (!this.isApprovalManager(user)) {
      throw new ForbiddenException(
        'Bu işlem sadece Moderatör, Admin veya Yazılım Ekibi tarafından yapılabilir.',
      );
    }
  }

  private getPrivateUnitWhere(user: CurrentUserPayload) {
    if (this.isSuperAdmin(user)) return {};

    if (this.isAdmin(user) || this.isModerator(user)) {
      return {
        id: '__ADMIN_PORTFOY_GOREMEZ__',
      };
    }

    return {
      project: {
        ownerId: user.id,
      },
    };
  }

  private async getUnitWithProjectOrFail(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return unit;
  }

  private async getPoolUnitWithProjectOrFail(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    if (!unit.isPoolVisible || unit.approvalStatus !== PortfolioApprovalStatus.HAVUZDA) {
      throw new BadRequestException('Bu portföy şu anda Havuz içinde aktif değil.');
    }

    return unit;
  }

  private getEphId(id: string) {
    const cleaned = String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
    return `EPH-${cleaned || '000000'}`;
  }

  private async getOrCreateKontorWallet(userId: string) {
    let wallet = await this.prisma.kontorCuzdani.findUnique({
      where: {
        kullaniciId: userId,
      },
    });

    if (!wallet) {
      wallet = await this.prisma.kontorCuzdani.create({
        data: {
          kullaniciId: userId,
          bakiye: 0,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 0,
          aktifMi: true,
        },
      });
    }

    return wallet;
  }

  async getPoolWallet(user: CurrentUserPayload) {
    const wallet = await this.getOrCreateKontorWallet(user.id);

    return {
      ok: true,
      balance: wallet.bakiye,
      toplamYukleme: wallet.toplamYukleme,
      toplamHarcama: wallet.toplamHarcama,
      toplamHediye: wallet.toplamHediye,
      aktifMi: wallet.aktifMi,
    };
  }

  private async spendKontor(input: {
    userId: string;
    amount: number;
    islemTuru: KontorIslemTuru;
    aciklama: string;
    ilgiliKayitTuru: string;
    ilgiliKayitId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.kontorCuzdani.findUnique({
        where: {
          kullaniciId: input.userId,
        },
      });

      if (!wallet) {
        wallet = await tx.kontorCuzdani.create({
          data: {
            kullaniciId: input.userId,
            bakiye: 0,
            toplamYukleme: 0,
            toplamHarcama: 0,
            toplamHediye: 0,
            aktifMi: true,
          },
        });
      }

      if (!wallet.aktifMi) {
        throw new BadRequestException('Kontör cüzdanınız aktif değil.');
      }

      if (wallet.bakiye < input.amount) {
        throw new BadRequestException(
          `Bu işlem için ${input.amount} kontör gerekir. Mevcut bakiyeniz ${wallet.bakiye} kontör.`,
        );
      }

      const nextBalance = wallet.bakiye - input.amount;

      const updatedWallet = await tx.kontorCuzdani.update({
        where: {
          kullaniciId: input.userId,
        },
        data: {
          bakiye: nextBalance,
          toplamHarcama: {
            increment: input.amount,
          },
        },
      });

      const movement = await tx.kontorHareketi.create({
        data: {
          kullaniciId: input.userId,
          hareketTuru: KontorHareketTuru.HARCAMA,
          islemTuru: input.islemTuru,
          miktar: input.amount,
          oncekiBakiye: wallet.bakiye,
          sonrakiBakiye: nextBalance,
          aciklama: input.aciklama,
          ilgiliKayitTuru: input.ilgiliKayitTuru,
          ilgiliKayitId: input.ilgiliKayitId,
          olusturanId: input.userId,
        },
      });

      return {
        wallet: updatedWallet,
        movement,
      };
    });
  }

  private async createPoolNotification(input: {
    ownerId: string;
    title: string;
    message: string;
    unitId: string;
  }) {
    return this.prisma.networkNotification.create({
      data: {
        userId: input.ownerId,
        postId: null,
        title: input.title,
        message: input.message,
      },
    });
  }

  private hasApprovalDocument(unit: {
    tapuVerified: boolean;
    yetkiVerified: boolean;
  }) {
    return Boolean(unit.tapuVerified || unit.yetkiVerified);
  }

  private normalizeFeatures(value?: unknown) {
    if (!Array.isArray(value)) return [];

    const allowed = new Set([
      'ASANSOR',
      'KAPALI_OTOPARK',
      'ACIK_OTOPARK',
      'GUVENLIK',
      'SITE_ICERISINDE',
      'JENERATOR',
      'YANGIN_MERDIVENI',
      'KAMERA_SISTEMI',
      'SU_DEPOSU',
      'HIDROFOR',
      'FIBER_INTERNET',
      'EBEVEYN_BANYOSU',
      'BALKON',
      'TERAS',
      'KILER',
      'GIYINME_ODASI',
      'ANKASTRE_MUTFAK',
      'AKILLI_EV',
      'SOMINE',
      'KLIMA',
      'ISI_YALITIMI',
      'SES_YALITIMI',
      'DENIZ_MANZARASI',
      'DOGA_MANZARASI',
      'SEHIR_MANZARASI',
      'YUKLEME_RAMPASI',
      'TIR_GIRISI',
      'VINC_SISTEMI',
      'SANAYI_ELEKTRIGI',
      'FORKLIFT_ALANI',
      'DEPOLAMA_ALANI',
      'YANGIN_SONDURME_SISTEMI',
      'YOLU_ACIK',
      'KADASTRO_YOLU',
      'ELEKTRIK_VAR',
      'SU_VAR',
      'SONDAJ_VAR',
      'CEVRILI',
      'KOSE_PARSEL',
      'IFRAZLI',
      'HISSELI',
    ]);

    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim().toUpperCase())
          .filter((item) => allowed.has(item)),
      ),
    );
  }

  private cleanText(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private normalizePhone(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private normalizeOptionalNumber(value?: number | string | null) {
    if (value === null || value === undefined || value === '') return undefined;

    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    const normalized = String(value).replace(/[^0-9]/g, '');
    if (!normalized) return undefined;

    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private canSeeDoorAccessInfo(user: CurrentUserPayload, ownerId?: string | null) {
    return this.isSuperAdmin(user) || Boolean(ownerId && this.isOwner(user, ownerId));
  }

  private redactDoorAccessInfo<T extends { doorAccessInfo?: string | null; project?: { ownerId?: string | null } | null }>(
    user: CurrentUserPayload,
    unit: T,
  ): T {
    if (this.canSeeDoorAccessInfo(user, unit.project?.ownerId)) return unit;

    return {
      ...unit,
      doorAccessInfo: null,
    };
  }

  private splitFullName(fullName?: string | null) {
    const cleanName = this.cleanText(fullName);

    if (!cleanName) {
      return { firstName: 'Tapu Sahibi', lastName: 'Bilinmiyor' };
    }

    const parts = cleanName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Bilinmiyor' };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.slice(-1).join(' '),
    };
  }

  private async linkCustomerProperty(input: {
    customerId: string;
    unitId: string;
    relationType: CustomerPropertyRelation;
    notes?: string;
  }) {
    await this.prisma.customerProperty.upsert({
      where: {
        customerId_unitId_relationType: {
          customerId: input.customerId,
          unitId: input.unitId,
          relationType: input.relationType,
        },
      },
      update: {
        notes: input.notes || undefined,
      },
      create: {
        customerId: input.customerId,
        unitId: input.unitId,
        relationType: input.relationType,
        notes: input.notes || undefined,
      },
    });
  }

  private async syncDeedOwnerToCrm(input: {
    ownerId: string;
    unitId: string;
    project: {
      name?: string | null;
      city?: string | null;
      district?: string | null;
      address?: string | null;
    };
    unit: {
      type?: UnitType | string | null;
      status?: UnitStatus | string | null;
      price?: number | null;
      area?: number | null;
      deedOwnerFullName?: string | null;
      deedOwnerPhone?: string | null;
      deedOwnerEmail?: string | null;
    };
  }) {
    const fullName = this.cleanText(input.unit.deedOwnerFullName);
    const phone = this.normalizePhone(input.unit.deedOwnerPhone);
    const email = this.cleanText(input.unit.deedOwnerEmail);

    if (!fullName || (!phone && !email)) return;

    const { firstName, lastName } = this.splitFullName(fullName);
    const portfolioNo = `EPH-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${input.unitId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;
    const location = [input.project.address, input.project.district, input.project.city]
      .filter(Boolean)
      .join(' / ');
    const note = [
      'Bu kişi, portföy girişi sırasında tapu sahibi olarak otomatik CRM kaydına işlendi.',
      `Bağlı Portföy: ${portfolioNo}`,
      `Portföy ID: ${input.unitId}`,
      input.project.name ? `Portföy/Proje: ${input.project.name}` : '',
      location ? `Konum: ${location}` : '',
      input.unit.type ? `Mülk Tipi: ${input.unit.type}` : '',
      input.unit.status ? `Durum: ${input.unit.status}` : '',
      input.unit.area ? `m²: ${input.unit.area}` : '',
      input.unit.price ? `Fiyat: ${input.unit.price}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const existing = await this.prisma.customer.findFirst({
      where: {
        ownerId: input.ownerId,
        OR: [
          phone ? { phone } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (existing) {
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      const nextTags = Array.from(
        new Set([...existingTags, 'PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`]),
      );

      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          phone: existing.phone || phone,
          email: existing.email || email,
          city: existing.city || input.project.city || undefined,
          interestedArea:
            existing.interestedArea ||
            [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
            undefined,
          interestedType: existing.interestedType || String(input.unit.type || ''),
          source: existing.source || 'PORTFOY_TAPU_SAHIBI',
          notes: [existing.notes, note].filter(Boolean).join('\n\n---\n\n'),
          tags: nextTags,
          updatedAt: new Date(),
        },
      });

      await this.prisma.activity.create({
        data: {
          customerId: existing.id,
          userId: input.ownerId,
          type: ActivityType.NOT,
          note: `Tapu sahibi bilgisi portföy ile eşleştirildi. Portföy ID: ${input.unitId}`,
        },
      });

      await this.linkCustomerProperty({
        customerId: existing.id,
        unitId: input.unitId,
        relationType: CustomerPropertyRelation.TAPU_SAHIBI,
        notes: 'Portföy girişi sırasında tapu sahibi olarak eşleştirildi.',
      });

      return;
    }

    const customer = await this.prisma.customer.create({
      data: {
        ownerId: input.ownerId,
        firstName,
        lastName,
        phone,
        email,
        city: input.project.city || undefined,
        interestedArea:
          [input.project.district, input.project.address].filter(Boolean).join(' / ') ||
          undefined,
        interestedType: String(input.unit.type || '') || undefined,
        budget: input.unit.price || undefined,
        source: 'PORTFOY_TAPU_SAHIBI',
        status: CustomerStatus.YENI_LEAD,
        tags: ['PORTFOY_TAPU_SAHIBI', `PORTFOY_${input.unitId}`],
        notes: note,
      },
    });

    await this.prisma.activity.create({
      data: {
        customerId: customer.id,
        userId: input.ownerId,
        type: ActivityType.NOT,
        note: `Tapu sahibi portföy girişinden otomatik CRM kaydı olarak oluşturuldu. Portföy ID: ${input.unitId}`,
      },
    });

    await this.linkCustomerProperty({
      customerId: customer.id,
      unitId: input.unitId,
      relationType: CustomerPropertyRelation.TAPU_SAHIBI,
      notes: 'Portföy girişi sırasında tapu sahibi olarak otomatik oluşturuldu.',
    });
  }

  async create(
    user: CurrentUserPayload,
    projectId: string,
    data: CreateUnitPayload,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanManageUnit(user, project.ownerId);

    const createdUnit = await this.prisma.unit.create({
      data: {
        type: data.type,
        floor: data.floor,
        floorLabel: data.floorLabel,
        totalFloors: data.totalFloors,
        priceCurrency: data.priceCurrency || 'TRY',
        number: this.cleanText(data.number),
        roomCount: data.roomCount,
        area: data.area,
        price: data.price,
        status: data.status || UnitStatus.SATILIK,
        description: data.description,
        deedOwnerFullName: this.cleanText(data.deedOwnerFullName),
        deedOwnerPhone: this.normalizePhone(data.deedOwnerPhone),
        deedOwnerEmail: this.cleanText(data.deedOwnerEmail),
        availableCreditAmount: this.normalizeOptionalNumber(data.availableCreditAmount),
        doorAccessInfo: this.cleanText(data.doorAccessInfo),
        features: this.normalizeFeatures(data.features),
        projectId,
        approvalStatus: PortfolioApprovalStatus.TASLAK,
        isPoolVisible: false,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: project.ownerId,
      unitId: createdUnit.id,
      project,
      unit: createdUnit,
    });

    return createdUnit;
  }

  async findOne(user: CurrentUserPayload, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: unitInclude,
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    this.ensureCanViewUnit(user, unit.project.ownerId);

    return this.redactDoorAccessInfo(user, unit);
  }

  async findPortfolioApprovals(
    user: CurrentUserPayload,
    filters?: { status?: string },
  ) {
    this.ensureApprovalManager(user);

    const rawStatus = String(filters?.status || '').trim().toUpperCase();

    const approvalStatus =
      rawStatus && rawStatus !== 'ALL'
        ? (rawStatus as PortfolioApprovalStatus)
        : undefined;

    const approvalStatuses: PortfolioApprovalStatus[] = [
      PortfolioApprovalStatus.BELGE_BEKLENIYOR,
      PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
      PortfolioApprovalStatus.INCELEMEDE,
      PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
      PortfolioApprovalStatus.ONAYLANDI,
      PortfolioApprovalStatus.HAVUZDA,
      PortfolioApprovalStatus.REDDEDILDI,
    ];

    const units = await this.prisma.unit.findMany({
      where: {
        approvalStatus: approvalStatus || {
          in: approvalStatuses,
        },
      },
      include: unitInclude,
      orderBy: [
        { submittedForApprovalAt: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findByProject(
    user: CurrentUserPayload,
    projectId: string,
    filters?: { status?: UnitStatus; type?: UnitType },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureCanViewUnit(user, project.ownerId);

    const units = await this.prisma.unit.findMany({
      where: {
        projectId,
        status: filters?.status,
        type: filters?.type,
      },
      include: unitInclude,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findAll(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
      isOffMarket?: boolean;
    },
  ) {
    const units = await this.prisma.unit.findMany({
      where: {
        ...this.getPrivateUnitWhere(user),
        status: filters?.status,
        type: filters?.type,
        isOffMarket: filters?.isOffMarket,
        project: {
          ...(this.isSuperAdmin(user) || this.isAdmin(user) || this.isModerator(user)
            ? {}
            : { ownerId: user.id }),
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { createdAt: 'desc' },
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async findPool(
    user: CurrentUserPayload,
    filters?: {
      status?: UnitStatus;
      type?: UnitType;
      city?: string;
    },
  ) {
    const units = await this.prisma.unit.findMany({
      where: {
        isPoolVisible: true,
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        status: filters?.status,
        type: filters?.type,
        project: {
          isActive: true,
          city: filters?.city
            ? { contains: filters.city, mode: 'insensitive' }
            : undefined,
        },
      },
      include: unitInclude,
      orderBy: { poolPublishedAt: 'desc' },
    });

    return units.map((unit) => this.redactDoorAccessInfo(user, unit));
  }

  async poolMessage(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için Havuz mesajı başlatamazsınız.');
    }

    const ephId = this.getEphId(unit.id);
    const title = `Havuz Mesajı - ${ephId}`;
    const firstMessage =
      this.cleanText(body?.message) ||
      `Merhaba, ${ephId} numaralı Havuz portföyü hakkında bilgi almak istiyorum.`;

    const kontorResult = await this.spendKontor({
      userId: user.id,
      amount: 3,
      islemTuru: KontorIslemTuru.HAVUZ_MESAJ,
      aciklama: `${ephId} için Havuz mesajı başlatıldı.`,
      ilgiliKayitTuru: 'UNIT',
      ilgiliKayitId: unit.id,
    });

    const conversation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: {
          postId: null,
          title,
          ConversationParticipant: {
            every: {
              userId: {
                in: [user.id, unit.project.ownerId],
              },
            },
          },
        },
        include: {
          ConversationParticipant: true,
        },
      });

      const activeConversation =
        existing && existing.ConversationParticipant.length === 2
          ? existing
          : await tx.conversation.create({
              data: {
                id: randomUUID(),
                postId: null,
                title,
                updatedAt: new Date(),
                ConversationParticipant: {
                  create: [
                    {
                      id: randomUUID(),
                      userId: user.id,
                    },
                    {
                      id: randomUUID(),
                      userId: unit.project.ownerId,
                    },
                  ],
                },
              },
              include: {
                ConversationParticipant: true,
              },
            });

      await tx.message.create({
        data: {
          id: randomUUID(),
          conversationId: activeConversation.id,
          senderId: user.id,
          body: firstMessage,
        },
      });

      await tx.conversation.update({
        where: {
          id: activeConversation.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return activeConversation;
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Havuz mesajı başlatıldı',
      message: `${ephId} numaralı portföyünüz için yeni bir Havuz mesajı var.`,
    });

    return {
      ok: true,
      message: 'Mesaj başlatıldı. 3 kontör harcandı.',
      cost: 3,
      spent: 3,
      previousBalance: kontorResult.movement.oncekiBakiye,
      remainingBalance: kontorResult.wallet.bakiye,
      balance: kontorResult.wallet.bakiye,
      conversationId: conversation.id,
      url: `/messages/${conversation.id}`,
    };
  }

  async poolInterest(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için ilgileniyorum bildirimi gönderemezsiniz.');
    }

    const ephId = this.getEphId(unit.id);
    const scoreText = Number(body?.matchScore || 0) > 0 ? ` Uyum: %${Number(body?.matchScore)}.` : '';
    const noteText = this.cleanText(body?.note) ? ` Not: ${this.cleanText(body?.note)}.` : '';

    const kontorResult = await this.spendKontor({
      userId: user.id,
      amount: 10,
      islemTuru: KontorIslemTuru.HAVUZ_ILGILENIYORUM,
      aciklama: `${ephId} için ilgileniyorum bildirimi gönderildi.`,
      ilgiliKayitTuru: 'UNIT',
      ilgiliKayitId: unit.id,
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Portföyünüzle ilgilenen var',
      message: `${ephId} numaralı Havuz portföyünüz için ilgileniyorum bildirimi alındı.${scoreText}${noteText}`,
    });

    return {
      ok: true,
      message: 'İlgileniyorum bildirimi gönderildi. 10 kontör harcandı.',
      cost: 10,
      spent: 10,
      previousBalance: kontorResult.movement.oncekiBakiye,
      remainingBalance: kontorResult.wallet.bakiye,
      balance: kontorResult.wallet.bakiye,
    };
  }

  async poolMatchingCustomer(id: string, user: CurrentUserPayload, body?: PoolActionPayload) {
    const unit = await this.getPoolUnitWithProjectOrFail(id);

    if (this.isOwner(user, unit.project.ownerId)) {
      throw new BadRequestException('Kendi portföyünüz için eşleşen müşterim var bildirimi gönderemezsiniz.');
    }

    const ephId = this.getEphId(unit.id);
    const scoreText = Number(body?.matchScore || 0) > 0 ? ` Uyum: %${Number(body?.matchScore)}.` : '';
    const noteText = this.cleanText(body?.note) ? ` Not: ${this.cleanText(body?.note)}.` : '';

    const kontorResult = await this.spendKontor({
      userId: user.id,
      amount: 20,
      islemTuru: KontorIslemTuru.HAVUZ_ESLESEN_MUSTERIM_VAR,
      aciklama: `${ephId} için eşleşen müşterim var bildirimi gönderildi.`,
      ilgiliKayitTuru: 'UNIT',
      ilgiliKayitId: unit.id,
    });

    await this.createPoolNotification({
      ownerId: unit.project.ownerId,
      unitId: unit.id,
      title: 'Eşleşen müşteri bildirimi',
      message: `${ephId} numaralı Havuz portföyünüz için eşleşen müşterim var bildirimi alındı.${scoreText}${noteText}`,
    });

    return {
      ok: true,
      message: 'Eşleşen müşterim var bildirimi gönderildi. 20 kontör harcandı.',
      cost: 20,
      spent: 20,
      previousBalance: kontorResult.movement.oncekiBakiye,
      remainingBalance: kontorResult.wallet.bakiye,
      balance: kontorResult.wallet.bakiye,
    };
  }

  async submitApproval(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    if (!this.hasApprovalDocument(unit)) {
      return this.prisma.unit.update({
        where: { id },
        data: {
          approvalStatus: PortfolioApprovalStatus.BELGE_BEKLENIYOR,
          isPoolVisible: false,
          approvalNote:
            'Havuza gönderebilmek için yetki belgesi, tapu veya ilgili doğrulama evrakı gereklidir.',
        },
        include: unitInclude,
      });
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEYE_GONDERILDI,
        submittedForApprovalAt: new Date(),
        rejectedAt: null,
        approvalNote: null,
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async markReviewing(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.INCELEMEDE,
        approvalNote: body?.note || 'Portföy incelemeye alındı.',
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async requestMissingInfo(
    id: string,
    user: CurrentUserPayload,
    body?: { note?: string },
  ) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.EKSIK_BILGI_BEKLENIYOR,
        approvalNote:
          body?.note ||
          'EPH inceleme ekibi bu portföy için ek bilgi veya belge bekliyor.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async approve(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.hasApprovalDocument(unit)) {
      throw new BadRequestException(
        'Bu portföyde onay için yeterli doğrulama evrakı bulunmuyor.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.ONAYLANDI,
        approvedAt: new Date(),
        rejectedAt: null,
        approvalNote: body?.note || null,
        isVerified: true,
        verifiedAt: new Date(),
        isPoolVisible: false,
      },
      include: unitInclude,
    });
  }

  async reject(id: string, user: CurrentUserPayload, body?: { note?: string }) {
    this.ensureApprovalManager(user);

    await this.getUnitWithProjectOrFail(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.REDDEDILDI,
        rejectedAt: new Date(),
        approvalNote: body?.note || 'Portföy doğrulama sürecinde reddedildi.',
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async sendToPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.isApprovalManager(user)) {
      this.ensureCanManageUnit(user, unit.project.ownerId);
    }

    if (unit.approvalStatus !== PortfolioApprovalStatus.ONAYLANDI) {
      throw new BadRequestException(
        'Sadece onaylanmış portföyler havuza gönderilebilir.',
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.HAVUZDA,
        isPoolVisible: true,
        poolPublishedAt: new Date(),
        poolRemovedAt: null,
      },
      include: unitInclude,
    });
  }

  async removeFromPool(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    if (!this.isApprovalManager(user)) {
      this.ensureCanManageUnit(user, unit.project.ownerId);
    }

    if (!unit.isPoolVisible) {
      throw new BadRequestException('Bu portföy zaten havuzda değil.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        approvalStatus: PortfolioApprovalStatus.ONAYLANDI,
        isPoolVisible: false,
        poolRemovedAt: new Date(),
      },
      include: unitInclude,
    });
  }

  async updateStatus(id: string, user: CurrentUserPayload, status: UnitStatus) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.update({
      where: { id },
      data: { status },
      include: unitInclude,
    });
  }

  async update(id: string, user: CurrentUserPayload, data: any) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    const protectedFields = [
      'approvalStatus',
      'isPoolVisible',
      'submittedForApprovalAt',
      'approvedAt',
      'rejectedAt',
      'approvalNote',
      'poolPublishedAt',
      'poolRemovedAt',
      'isVerified',
      'verifiedAt',
    ];

    for (const field of protectedFields) {
      if (field in data && !this.isSuperAdmin(user)) {
        delete data[field];
      }
    }

    const { availableCreditAmount, doorAccessInfo, ...safeData } = data;

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...safeData,
        deedOwnerFullName:
          'deedOwnerFullName' in data
            ? this.cleanText(data.deedOwnerFullName)
            : undefined,
        deedOwnerPhone:
          'deedOwnerPhone' in data
            ? this.normalizePhone(data.deedOwnerPhone)
            : undefined,
        deedOwnerEmail:
          'deedOwnerEmail' in data
            ? this.cleanText(data.deedOwnerEmail)
            : undefined,
        availableCreditAmount:
          'availableCreditAmount' in data
            ? this.normalizeOptionalNumber(availableCreditAmount)
            : undefined,
        doorAccessInfo:
          'doorAccessInfo' in data
            ? this.cleanText(doorAccessInfo)
            : undefined,
        features:
          'features' in data
            ? this.normalizeFeatures(data.features)
            : undefined,
      },
      include: unitInclude,
    });

    await this.syncDeedOwnerToCrm({
      ownerId: unit.project.ownerId,
      unitId: updatedUnit.id,
      project: unit.project,
      unit: updatedUnit,
    });

    return updatedUnit;
  }

  async verifyUnit(
    id: string,
    data: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const isVerified = Boolean(
      data.tapuVerified || data.photoVerified || data.yetkiVerified,
    );

    const verifiedAt = isVerified ? new Date() : null;

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        isVerified,
        verifiedAt,
      },
      include: unitInclude,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
