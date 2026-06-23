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
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

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
const PLATFORM_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://emlakportfoyhavuzu.com';

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
      letter: {
        ...result.letter,
        verificationUrl: this.getVerificationUrl(result.letter.authorityNo),
      },
      quota: result.quota,
    };
  }

  async verifyByAuthorityNo(authorityNo: string) {
    const cleanedAuthorityNo = this.cleanText(authorityNo);

    if (!cleanedAuthorityNo) {
      throw new BadRequestException('Belge numarası zorunludur.');
    }

    const letter = await this.prisma.ePHAuthorityLetter.findUnique({
      where: { authorityNo: cleanedAuthorityNo },
      include: {
        unit: {
          include: {
            project: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!letter) {
      return {
        valid: false,
        message: 'Belge bulunamadı.',
      };
    }

    const now = new Date();
    const isExpired = letter.authorityEndDate < now;
    const status = String(letter.status || '').toUpperCase();
    const valid = !isExpired && status !== 'IPTAL' && status !== 'SILINDI';

    return {
      valid,
      message: valid
        ? 'EPH yetki belgesi doğrulandı.'
        : 'Belge süresi dolmuş veya pasif durumdadır.',
      authorityNo: letter.authorityNo,
      status: letter.status,
      authorityType: letter.authorityType,
      authorityStartDate: letter.authorityStartDate,
      authorityEndDate: letter.authorityEndDate,
      createdAt: letter.createdAt,
      ownerName: this.maskName(letter.ownerName),
      portfolio: {
        id: letter.unit.id,
        ephId: this.getEphId(letter.unit.id),
        type: letter.unit.type,
        status: letter.unit.status,
        city: letter.unit.project.city,
        district: letter.unit.project.district,
        projectName: letter.unit.project.name,
      },
      consultant: {
        name: this.formatName(
          letter.unit.project.owner?.firstName,
          letter.unit.project.owner?.lastName,
        ),
        memberCode: letter.unit.project.owner?.memberCode || null,
      },
      verificationUrl: this.getVerificationUrl(letter.authorityNo),
    };
  }

  async generatePdf(input: CurrentUserPayload & { id: string }) {
    const letter = await this.prisma.ePHAuthorityLetter.findUnique({
      where: { id: input.id },
      include: {
        unit: {
          include: {
            project: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!letter) {
      throw new NotFoundException('Yetki belgesi bulunamadı.');
    }

    this.ensureCanManage(input, letter.unit.project.ownerId);

    const verificationUrl = this.getVerificationUrl(letter.authorityNo);
    const qrPng = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#06194A',
        light: '#FFFFFF',
      },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const qrImage = await pdfDoc.embedPng(qrPng);
    const width = page.getWidth();
    const height = page.getHeight();
    const blue = rgb(0.145, 0.388, 0.922);
    const navy = rgb(0.024, 0.098, 0.29);
    const slate = rgb(0.392, 0.455, 0.545);
    const border = rgb(0.78, 0.839, 0.91);
    const soft = rgb(0.969, 0.98, 0.996);

    this.drawRoundedRect(page, 28, 24, width - 56, height - 48, 18, rgb(1, 1, 1), border);
    page.drawRectangle({ x: 28, y: height - 122, width: width - 56, height: 98, color: rgb(0.937, 0.965, 1) });
    page.drawRectangle({ x: 28, y: height - 122, width: 7, height: 98, color: blue });

    page.drawText('EPH', { x: 52, y: height - 70, size: 24, font: boldFont, color: blue });
    page.drawText('Emlak Portföy Havuzu', { x: 52, y: height - 91, size: 10, font: boldFont, color: navy });
    page.drawText('YETKİ BELGESİ', { x: 346, y: height - 68, size: 22, font: boldFont, color: navy });
    page.drawText('Satış / Kiralama Yetkilendirme Taslağı', { x: 346, y: height - 89, size: 9, font: regularFont, color: slate });

    this.drawInfoBox(page, boldFont, regularFont, 48, height - 178, 236, 56, 'Belge No', letter.authorityNo);
    this.drawInfoBox(page, boldFont, regularFont, 310, height - 178, 236, 56, 'Doğrulama Durumu', 'QR kod ile doğrulanabilir');

    this.drawSectionTitle(page, boldFont, 'Taraf Bilgileri', 48, height - 220);
    this.drawField(page, boldFont, regularFont, 'Malik', letter.ownerName, 48, height - 248, 240);
    this.drawField(page, boldFont, regularFont, 'Telefon', letter.ownerPhone || 'Belirtilmedi', 310, height - 248, 236);
    this.drawField(page, boldFont, regularFont, 'E-posta', letter.ownerEmail || 'Belirtilmedi', 48, height - 286, 240);
    this.drawField(page, boldFont, regularFont, 'Danışman', this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName), 310, height - 286, 236);

    this.drawSectionTitle(page, boldFont, 'Portföy Bilgileri', 48, height - 332);
    this.drawField(page, boldFont, regularFont, 'Portföy ID', this.getEphId(letter.unit.id), 48, height - 360, 152);
    this.drawField(page, boldFont, regularFont, 'Portföy Tipi', String(letter.unit.type || 'Portföy'), 220, height - 360, 152);
    this.drawField(page, boldFont, regularFont, 'İşlem', String(letter.unit.status || 'Belirtilmedi'), 392, height - 360, 154);
    this.drawField(page, boldFont, regularFont, 'Konum', `${letter.unit.project.city} / ${letter.unit.project.district}`, 48, height - 398, 498);

    this.drawSectionTitle(page, boldFont, 'Yetki Bilgileri', 48, height - 444);
    this.drawField(page, boldFont, regularFont, 'Yetki Türü', this.getAuthorityTypeLabel(letter.authorityType), 48, height - 472, 152);
    this.drawField(page, boldFont, regularFont, 'Başlangıç', this.formatDate(letter.authorityStartDate), 220, height - 472, 152);
    this.drawField(page, boldFont, regularFont, 'Bitiş', this.formatDate(letter.authorityEndDate), 392, height - 472, 154);

    page.drawRectangle({ x: 48, y: height - 604, width: 318, height: 90, color: soft, borderColor: border, borderWidth: 1 });
    page.drawText('Yetkilendirme Beyanı', { x: 64, y: height - 540, size: 11, font: boldFont, color: navy });
    this.drawWrappedText(
      page,
      regularFont,
      'Bu belge, ilgili portföy için EPH Platformu üzerinde yetki belgesi taslağı oluşturulduğunu gösterir. Fiziki imza süreçleri ve nihai belge sorumluluğu taraflara aittir. Belgenin doğruluğu QR kod okutularak kontrol edilebilir.',
      64,
      height - 560,
      286,
      10,
      14,
      slate,
    );

    page.drawRectangle({ x: 386, y: height - 604, width: 160, height: 160, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1 });
    page.drawImage(qrImage, { x: 414, y: height - 574, width: 104, height: 104 });
    page.drawText('Belge Doğrulama', { x: 421, y: height - 592, size: 9, font: boldFont, color: navy });
    page.drawText('QR kodu okutun', { x: 425, y: height - 609, size: 8, font: regularFont, color: slate });

    this.drawSignatureBox(page, boldFont, regularFont, 48, 114, 'Malik İmzası', letter.ownerName);
    this.drawSignatureBox(page, boldFont, regularFont, 310, 114, 'Danışman İmzası', this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName));

    page.drawText('Bu belge EPH Platformu tarafından üretilmiştir. QR kod ile doğrulanabilir.', {
      x: 48,
      y: 70,
      size: 8,
      font: regularFont,
      color: slate,
    });
    page.drawText(verificationUrl, { x: 48, y: 55, size: 7, font: regularFont, color: blue });
    page.drawText('EPH', { x: 502, y: 55, size: 17, font: boldFont, color: blue });

    const pdfBytes = await pdfDoc.save();

    await this.prisma.ePHAuthorityLetter.update({
      where: { id: letter.id },
      data: {
        status: 'PDF_OLUSTURULDU',
      },
    });

    return {
      fileName: `${letter.authorityNo}.pdf`,
      pdfBytes,
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
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );

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

  private getVerificationUrl(authorityNo: string) {
    return `${PLATFORM_URL.replace(/\/$/, '')}/verify-authority/${encodeURIComponent(authorityNo)}`;
  }

  private getEphId(id: string) {
    const cleaned = String(id || '')
      .replaceAll('-', '')
      .slice(0, 6)
      .toUpperCase();
    return `EPH-${cleaned || '000000'}`;
  }

  private maskName(value?: string | null) {
    const parts = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return 'Gizli';

    return parts
      .map((part, index) => {
        if (index === 0) return part;
        return `${part.slice(0, 1)}***`;
      })
      .join(' ');
  }

  private formatName(firstName?: string | null, lastName?: string | null) {
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || 'EPH Danışmanı';
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private getAuthorityTypeLabel(value: string) {
    const normalized = String(value || '').toUpperCase();
    if (normalized === 'SATIS') return 'Satış';
    if (normalized === 'KIRALAMA') return 'Kiralama';
    if (normalized === 'SATIS_VE_KIRALAMA') return 'Satış ve Kiralama';
    return value || 'Yetki';
  }

  private drawSectionTitle(page: any, font: any, text: string, x: number, y: number) {
    page.drawText(text, { x, y, size: 12, font, color: rgb(0.024, 0.098, 0.29) });
    page.drawLine({ start: { x, y: y - 8 }, end: { x: x + 498, y: y - 8 }, thickness: 1, color: rgb(0.78, 0.839, 0.91) });
  }

  private drawInfoBox(page: any, boldFont: any, regularFont: any, x: number, y: number, w: number, h: number, label: string, value: string) {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.969, 0.98, 0.996), borderColor: rgb(0.78, 0.839, 0.91), borderWidth: 1 });
    page.drawText(label, { x: x + 14, y: y + h - 20, size: 8, font: boldFont, color: rgb(0.145, 0.388, 0.922) });
    page.drawText(this.safePdfText(value), { x: x + 14, y: y + 16, size: 12, font: boldFont, color: rgb(0.024, 0.098, 0.29) });
  }

  private drawField(page: any, boldFont: any, regularFont: any, label: string, value: string, x: number, y: number, w: number) {
    page.drawRectangle({ x, y, width: w, height: 28, color: rgb(0.969, 0.98, 0.996), borderColor: rgb(0.78, 0.839, 0.91), borderWidth: 1 });
    page.drawText(label, { x: x + 10, y: y + 17, size: 7, font: boldFont, color: rgb(0.392, 0.455, 0.545) });
    page.drawText(this.safePdfText(String(value || 'Belirtilmedi')).slice(0, 42), { x: x + 10, y: y + 7, size: 8.5, font: regularFont, color: rgb(0.024, 0.098, 0.29) });
  }

  private drawSignatureBox(page: any, boldFont: any, regularFont: any, x: number, y: number, title: string, name: string) {
    page.drawRectangle({ x, y, width: 236, height: 70, color: rgb(1, 1, 1), borderColor: rgb(0.78, 0.839, 0.91), borderWidth: 1 });
    page.drawText(title, { x: x + 14, y: y + 48, size: 10, font: boldFont, color: rgb(0.024, 0.098, 0.29) });
    page.drawText(this.safePdfText(name), { x: x + 14, y: y + 14, size: 8.5, font: regularFont, color: rgb(0.392, 0.455, 0.545) });
    page.drawLine({ start: { x: x + 14, y: y + 34 }, end: { x: x + 222, y: y + 34 }, thickness: 0.8, color: rgb(0.78, 0.839, 0.91) });
  }

  private drawRoundedRect(page: any, x: number, y: number, w: number, h: number, _r: number, color: any, borderColor: any) {
    page.drawRectangle({ x, y, width: w, height: h, color, borderColor, borderWidth: 1.2 });
  }

  private drawWrappedText(page: any, font: any, text: string, x: number, y: number, maxWidth: number, size: number, lineHeight: number, color: any) {
    const words = this.safePdfText(text).split(' ');
    let line = '';
    let currentY = y;

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      const nextWidth = font.widthOfTextAtSize(nextLine, size);

      if (nextWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        line = word;
        currentY -= lineHeight;
      } else {
        line = nextLine;
      }
    });

    if (line) {
      page.drawText(line, { x, y: currentY, size, font, color });
    }
  }

  private safePdfText(value: string) {
    return String(value || '')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C');
  }
}
