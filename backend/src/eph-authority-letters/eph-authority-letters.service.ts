import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  KontorHareketTuru,
  KontorIslemTuru,
  KotaDonemi,
  UyelikDurumu,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUserPayload = {
  userId: string;
  userRole?: string;
};

type CreateInput = CurrentUserPayload & {
  body: {
    unitId?: string;
    authorityType?: string;
    durationDays?: number | string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    authorityStartDate?: string;
  };
};

type AuthorityLetterQuotaResult = {
  limit: number;
  usedBefore: number;
  usedAfter: number;
  isFree: boolean;
  chargedKontor: number;
};

const AUTHORITY_LETTER_MONTHLY_QUOTA_CODE = 'AUTHORITY_LETTER_MONTHLY';
const AUTHORITY_LETTER_OVER_LIMIT_COST = 5;

@Injectable()
export class EphAuthorityLettersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPortfolio(input: CurrentUserPayload & { unitId: string }) {
    const unit = await this.getUnitOrFail(input.unitId);
    this.ensureCanView(input, unit.project.ownerId);

    return this.prisma.ePHAuthorityLetter.findMany({
      where: { unitId: input.unitId },
      orderBy: { createdAt: 'desc' },
    });
  }


  async getQuota(input: CurrentUserPayload) {
    return this.getAuthorityLetterQuotaSnapshot({
      tx: this.prisma,
      userId: input.userId,
    });
  }

  async create(input: CreateInput) {
    const unitId = this.cleanText(input.body?.unitId);

    if (!unitId) {
      throw new BadRequestException('Portföy ID zorunludur.');
    }

    const unit = await this.getUnitOrFail(unitId);
    this.ensureCanManage(input, unit.project.ownerId);

    const authorityType = this.normalizeAuthorityType(input.body?.authorityType);
    const durationDays = this.normalizeDurationDays(input.body?.durationDays);
    const startDate = this.normalizeDate(input.body?.authorityStartDate);
    const endDate = this.addDays(startDate, durationDays);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingLetter = await tx.ePHAuthorityLetter.findFirst({
        where: { unitId },
        orderBy: { createdAt: 'desc' },
      });

      if (existingLetter) {
        throw new ConflictException(
          'Bu portföy için aktif bir yetki belgesi bulunmaktadır. Yeni belge oluşturmak için önce mevcut belgeyi siliniz.',
        );
      }

      const quotaResult = await this.prepareAuthorityLetterQuotaUsage({
        tx,
        userId: input.userId,
        unitId,
      });

      const letter = await tx.ePHAuthorityLetter.create({
        data: {
          unitId,
          authorityNo: await this.createAuthorityNo(tx),
          ownerName:
            this.cleanText(input.body?.ownerName) ||
            this.cleanText(unit.deedOwnerFullName) ||
            'Tapu Sahibi',
          ownerPhone:
            this.cleanText(input.body?.ownerPhone) ||
            this.cleanText(unit.deedOwnerPhone),
          ownerEmail:
            this.cleanText(input.body?.ownerEmail) ||
            this.cleanText(unit.deedOwnerEmail),
          authorityType,
          authorityStartDate: startDate,
          authorityEndDate: endDate,
          status: 'TASLAK',
          createdById: input.userId,
        },
      });

      if (!quotaResult.isFree) {
        await this.spendKontorInTransaction({
          tx,
          userId: input.userId,
          amount: AUTHORITY_LETTER_OVER_LIMIT_COST,
          ilgiliKayitId: letter.id,
          aciklama: `${letter.authorityNo} numaralı yetki belgesi üretimi için aylık ücretsiz limit aşıldığından ${AUTHORITY_LETTER_OVER_LIMIT_COST} kontör harcandı.`,
        });
      }

      await tx.kotaKullanimi.update({
        where: {
          kullaniciId_kotaKodu_donem_donemBaslangic: {
            kullaniciId: input.userId,
            kotaKodu: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
            donem: KotaDonemi.AYLIK,
            donemBaslangic: this.getMonthRange().start,
          },
        },
        data: {
          kullanilan: {
            increment: 1,
          },
          limit: quotaResult.limit,
        },
      });

      return {
        letter,
        quota: {
          ...quotaResult,
          usedAfter: quotaResult.usedBefore + 1,
        },
      };
    });

    return {
      success: true,
      message:
        result.quota.chargedKontor > 0
          ? `EPH yetki belgesi taslağı oluşturuldu. Aylık ücretsiz limit aşıldığı için ${result.quota.chargedKontor} kontör harcandı.`
          : 'EPH yetki belgesi taslağı oluşturuldu.',
      letter: result.letter,
      quota: result.quota,
    };
  }

  async markPdfCreated(input: CurrentUserPayload & { id: string; pdfUrl?: string }) {
    const letter = await this.prisma.ePHAuthorityLetter.findUnique({
      where: { id: input.id },
      include: {
        unit: {
          include: { project: true },
        },
      },
    });

    if (!letter) {
      throw new NotFoundException('Yetki belgesi bulunamadı.');
    }

    this.ensureCanManage(input, letter.unit.project.ownerId);

    const pdfUrl = this.cleanText(input.pdfUrl);

    if (!pdfUrl) {
      throw new BadRequestException('PDF bağlantısı zorunludur.');
    }

    const updated = await this.prisma.ePHAuthorityLetter.update({
      where: { id: input.id },
      data: {
        pdfUrl,
        status: 'PDF_OLUSTURULDU',
      },
    });

    return {
      success: true,
      message: 'PDF yetki belgesine işlendi.',
      letter: updated,
    };
  }

  private async getAuthorityLetterQuotaSnapshot(input: { tx: any; userId: string }) {
    const activePackageRelation = await input.tx.kullaniciUyelikPaketi.findFirst({
      where: {
        kullaniciId: input.userId,
        durum: UyelikDurumu.AKTIF,
      },
      orderBy: {
        baslangicTarihi: 'desc',
      },
    });

    if (!activePackageRelation) {
      throw new BadRequestException(
        'Aktif üyelik paketiniz bulunamadı. Yetki belgesi üretim limiti hesaplanamadı.',
      );
    }

    const packageInfo = await input.tx.uyelikPaketi.findUnique({
      where: {
        id: activePackageRelation.paketId,
      },
    });

    if (!packageInfo || !packageInfo.aktifMi) {
      throw new BadRequestException(
        'Aktif üyelik paketiniz doğrulanamadı. Yetki belgesi üretim limiti hesaplanamadı.',
      );
    }

    const activePortfolioLimit = Number(packageInfo.aktifPortfoyLimiti || 0);

    if (!activePortfolioLimit) {
      throw new BadRequestException(
        'Üyelik paketinizde aktif portföy limiti tanımlı değil.',
      );
    }

    const monthlyLimit = activePortfolioLimit * 2;
    const monthRange = this.getMonthRange();

    const quota = await input.tx.kotaKullanimi.upsert({
      where: {
        kullaniciId_kotaKodu_donem_donemBaslangic: {
          kullaniciId: input.userId,
          kotaKodu: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
          donem: KotaDonemi.AYLIK,
          donemBaslangic: monthRange.start,
        },
      },
      update: {
        limit: monthlyLimit,
        donemBitis: monthRange.end,
      },
      create: {
        kullaniciId: input.userId,
        kotaKodu: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
        donem: KotaDonemi.AYLIK,
        limit: monthlyLimit,
        kullanilan: 0,
        donemBaslangic: monthRange.start,
        donemBitis: monthRange.end,
      },
    });

    const used = Number(quota.kullanilan || 0);
    const remaining = Math.max(monthlyLimit - used, 0);

    return {
      success: true,
      quotaCode: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
      period: 'AYLIK',
      limit: monthlyLimit,
      used,
      remaining,
      overLimitCost: AUTHORITY_LETTER_OVER_LIMIT_COST,
      isOverLimit: used >= monthlyLimit,
      package: {
        code: packageInfo.paketKodu,
        name: packageInfo.paketAdi,
        activePortfolioLimit,
      },
      periodStart: monthRange.start,
      periodEnd: monthRange.end,
    };
  }

  private async prepareAuthorityLetterQuotaUsage(input: {
    tx: any;
    userId: string;
    unitId: string;
  }): Promise<AuthorityLetterQuotaResult> {
    const activePackageRelation = await input.tx.kullaniciUyelikPaketi.findFirst({
      where: {
        kullaniciId: input.userId,
        durum: UyelikDurumu.AKTIF,
      },
      orderBy: {
        baslangicTarihi: 'desc',
      },
    });

    if (!activePackageRelation) {
      throw new BadRequestException(
        'Aktif üyelik paketiniz bulunamadı. Yetki belgesi üretim limiti hesaplanamadı.',
      );
    }

    const packageInfo = await input.tx.uyelikPaketi.findUnique({
      where: {
        id: activePackageRelation.paketId,
      },
    });

    if (!packageInfo || !packageInfo.aktifMi) {
      throw new BadRequestException(
        'Aktif üyelik paketiniz doğrulanamadı. Yetki belgesi üretim limiti hesaplanamadı.',
      );
    }

    const activePortfolioLimit = Number(packageInfo.aktifPortfoyLimiti || 0);

    if (!activePortfolioLimit) {
      throw new BadRequestException(
        'Üyelik paketinizde aktif portföy limiti tanımlı değil.',
      );
    }

    const monthlyLimit = activePortfolioLimit * 2;
    const monthRange = this.getMonthRange();

    const quota = await input.tx.kotaKullanimi.upsert({
      where: {
        kullaniciId_kotaKodu_donem_donemBaslangic: {
          kullaniciId: input.userId,
          kotaKodu: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
          donem: KotaDonemi.AYLIK,
          donemBaslangic: monthRange.start,
        },
      },
      update: {
        limit: monthlyLimit,
        donemBitis: monthRange.end,
      },
      create: {
        kullaniciId: input.userId,
        kotaKodu: AUTHORITY_LETTER_MONTHLY_QUOTA_CODE,
        donem: KotaDonemi.AYLIK,
        limit: monthlyLimit,
        kullanilan: 0,
        donemBaslangic: monthRange.start,
        donemBitis: monthRange.end,
      },
    });

    const usedBefore = Number(quota.kullanilan || 0);
    const isFree = usedBefore < monthlyLimit;

    return {
      limit: monthlyLimit,
      usedBefore,
      usedAfter: usedBefore,
      isFree,
      chargedKontor: isFree ? 0 : AUTHORITY_LETTER_OVER_LIMIT_COST,
    };
  }

  private async spendKontorInTransaction(input: {
    tx: any;
    userId: string;
    amount: number;
    aciklama: string;
    ilgiliKayitId: string;
  }) {
    let wallet = await input.tx.kontorCuzdani.findUnique({
      where: {
        kullaniciId: input.userId,
      },
    });

    if (!wallet) {
      wallet = await input.tx.kontorCuzdani.create({
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
        `Aylık ücretsiz yetki belgesi hakkınız dolmuştur. Yeni belge üretmek için ${input.amount} kontör gereklidir. Mevcut bakiyeniz ${wallet.bakiye} kontör.`,
      );
    }

    const nextBalance = wallet.bakiye - input.amount;

    const updatedWallet = await input.tx.kontorCuzdani.update({
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

    const movement = await input.tx.kontorHareketi.create({
      data: {
        kullaniciId: input.userId,
        hareketTuru: KontorHareketTuru.HARCAMA,
        islemTuru: KontorIslemTuru.DIGER,
        miktar: input.amount,
        oncekiBakiye: wallet.bakiye,
        sonrakiBakiye: nextBalance,
        aciklama: input.aciklama,
        ilgiliKayitTuru: 'EPH_AUTHORITY_LETTER',
        ilgiliKayitId: input.ilgiliKayitId,
        olusturanId: input.userId,
      },
    });

    return {
      wallet: updatedWallet,
      movement,
    };
  }

  private getMonthRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    return { start, end };
  }

  private async getUnitOrFail(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    return unit;
  }

  private ensureCanView(user: CurrentUserPayload, ownerId: string) {
    if (this.isManager(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini görüntüleme yetkiniz yok.');
  }

  private ensureCanManage(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini oluşturma yetkiniz yok.');
  }

  private isSuperAdmin(role?: string) {
    return String(role || '').toUpperCase() === 'SUPER_ADMIN';
  }

  private isManager(role?: string) {
    return ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(
      String(role || '').toUpperCase(),
    );
  }

  private normalizeAuthorityType(value?: string) {
    const normalized = String(value || '').trim().toUpperCase();

    if (['SATIS', 'KIRALAMA', 'SATIS_VE_KIRALAMA'].includes(normalized)) {
      return normalized;
    }

    throw new BadRequestException(
      'Yetki türü SATIS, KIRALAMA veya SATIS_VE_KIRALAMA olmalıdır.',
    );
  }

  private normalizeDurationDays(value?: number | string) {
    const numeric = Number(value || 0);

    if ([30, 90, 180, 365].includes(numeric)) {
      return numeric;
    }

    throw new BadRequestException('Yetki süresi 30, 90, 180 veya 365 gün olmalıdır.');
  }

  private normalizeDate(value?: string) {
    if (!value) return new Date();

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Başlangıç tarihi geçersiz.');
    }

    return date;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private cleanText(value?: string | null) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private async createAuthorityNo(tx: any = this.prisma) {
    const year = new Date().getFullYear();
    const count = await tx.ePHAuthorityLetter.count({
      where: {
        authorityNo: {
          startsWith: `EPH-YB-${year}-`,
        },
      },
    });

    return `EPH-YB-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}