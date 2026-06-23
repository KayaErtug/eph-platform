import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
import * as QRCode from 'qrcode';

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
      throw new BadRequestException('PortfÃ¶y ID zorunludur.');
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
          'Bu portfÃ¶y iÃ§in aktif bir yetki belgesi bulunmaktadÄ±r. Yeni belge oluÅŸturmak iÃ§in Ã¶nce mevcut belgeyi siliniz.',
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
          aciklama: `${letter.authorityNo} numaralÄ± yetki belgesi Ã¼retimi iÃ§in aylÄ±k Ã¼cretsiz limit aÅŸÄ±ldÄ±ÄŸÄ±ndan ${AUTHORITY_LETTER_OVER_LIMIT_COST} kontÃ¶r harcandÄ±.`,
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
          ? `EPH yetki belgesi taslaÄŸÄ± oluÅŸturuldu. AylÄ±k Ã¼cretsiz limit aÅŸÄ±ldÄ±ÄŸÄ± iÃ§in ${result.quota.chargedKontor} kontÃ¶r harcandÄ±.`
          : 'EPH yetki belgesi taslaÄŸÄ± oluÅŸturuldu.',
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
      throw new BadRequestException('Belge numarasÄ± zorunludur.');
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
        message: 'Belge bulunamadÄ±.',
      };
    }

    const now = new Date();
    const isExpired = letter.authorityEndDate < now;
    const status = String(letter.status || '').toUpperCase();
    const valid = !isExpired && status !== 'IPTAL' && status !== 'SILINDI';

    return {
      valid,
      message: valid
        ? 'EPH yetki belgesi doÄŸrulandÄ±.'
        : 'Belge sÃ¼resi dolmuÅŸ veya pasif durumdadÄ±r.',
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
      throw new NotFoundException('Yetki belgesi bulunamadÄ±.');
    }

    this.ensureCanManage(input, letter.unit.project.ownerId);

    const verificationUrl = this.getVerificationUrl(letter.authorityNo);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
      color: {
        dark: '#06194A',
        light: '#FFFFFF',
      },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const logoBytes = this.getLogoBytes();
    const logoImage = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

    const width = page.getWidth();
    const height = page.getHeight();
    const navy = rgb(0.024, 0.098, 0.29);
    const blue = rgb(0.02, 0.243, 0.545);
    const primary = rgb(0.145, 0.388, 0.922);
    const slate = rgb(0.392, 0.455, 0.545);
    const border = rgb(0.78, 0.839, 0.91);
    const soft = rgb(0.969, 0.98, 0.996);
    const softBlue = rgb(0.937, 0.965, 1);
    const green = rgb(0.047, 0.518, 0.259);

    page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1.2 });
    page.drawLine({ start: { x: 18, y: height - 18 }, end: { x: width - 18, y: height - 18 }, thickness: 4, color: blue });
    page.drawLine({ start: { x: 18, y: 18 }, end: { x: width - 18, y: 18 }, thickness: 4, color: blue });

    if (logoImage) {
      page.drawImage(logoImage, { x: 34, y: height - 122, width: 92, height: 92 });
    } else {
      page.drawText('EPH', { x: 46, y: height - 78, size: 28, font: boldFont, color: blue });
    }

    page.drawText('EMLAK PORTFOY HAVUZU', { x: 34, y: height - 146, size: 9.2, font: boldFont, color: navy });
    page.drawText('GUVEN  â€¢  PAYLAS  â€¢  KAZAN', { x: 44, y: height - 160, size: 7.6, font: boldFont, color: slate });

    page.drawText('GAYRIMENKUL SATIS / KIRALAMA', { x: 158, y: height - 66, size: 20, font: boldFont, color: navy });
    page.drawText('YETKILENDIRME SOZLESMESI', { x: 184, y: height - 94, size: 20, font: boldFont, color: navy });
    page.drawLine({ start: { x: 198, y: height - 112 }, end: { x: 397, y: height - 112 }, thickness: 1.1, color: border });
    page.drawText('EPH EMLAK PORTFOY HAVUZU PLATFORMU', { x: 192, y: height - 133, size: 9.5, font: boldFont, color: primary });

    this.drawPdfMetaBox(page, boldFont, regularFont, 430, height - 142, 132, 108, [
      ['BELGE NO', letter.authorityNo],
      ['PORTFOY NO', this.getEphId(letter.unit.id)],
      ['DUZENLEME', this.formatDate(new Date())],
      ['DOGRULAMA', 'QR ILE AKTIF'],
    ]);

    this.drawPdfPanel(page, boldFont, '1. TASINMAZ MALIKI BILGILERI', 28, height - 302, 260, 126, blue);
    this.drawPdfRow(page, boldFont, regularFont, 'Ad Soyad', letter.ownerName, 44, height - 214, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'Telefon', letter.ownerPhone || 'Belirtilmedi', 44, height - 242, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'E-Posta', letter.ownerEmail || 'Belirtilmedi', 44, height - 270, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'Adres', letter.unit.project.address || `${letter.unit.project.city} / ${letter.unit.project.district}`, 44, height - 298, 222);

    this.drawPdfPanel(page, boldFont, '2. YETKILENDIRILEN EMLAK DANISMANI BILGILERI', 307, height - 302, 260, 126, blue);
    this.drawPdfRow(page, boldFont, regularFont, 'Ad Soyad', this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName), 323, height - 214, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'Telefon', letter.unit.project.owner?.phone || 'Belirtilmedi', 323, height - 242, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'E-Posta', letter.unit.project.owner?.email || 'Belirtilmedi', 323, height - 270, 222);
    this.drawPdfRow(page, boldFont, regularFont, 'EPH Uye No', letter.unit.project.owner?.memberCode || 'Belirtilmedi', 323, height - 298, 222);

    this.drawPdfPanel(page, boldFont, '3. TASINMAZ BILGILERI', 28, height - 430, 539, 108, blue);
    const propertyY = height - 360;
    const propertyCells = [
      ['Il', letter.unit.project.city],
      ['Ilce', letter.unit.project.district],
      ['Mahalle', letter.unit.project.address || 'Belirtilmedi'],
      ['Tasinmaz Turu', String(letter.unit.type || 'Portfoy')],
      ['Ada', letter.unit.adaNo || 'Belirtilmedi'],
      ['Parsel', letter.unit.parselNo || 'Belirtilmedi'],
      ['Bagimsiz Bolum', letter.unit.number || 'Belirtilmedi'],
      ['Brut m2', letter.unit.area ? `${letter.unit.area} m2` : 'Belirtilmedi'],
      ['Kat', letter.unit.floorLabel || (letter.unit.floor ? String(letter.unit.floor) : 'Belirtilmedi')],
      ['Portfoy No', this.getEphId(letter.unit.id)],
      ['Portfoy Turu', String(letter.unit.status || 'Belirtilmedi')],
      ['Fiyat', letter.unit.price ? `${Number(letter.unit.price).toLocaleString('tr-TR')} ${letter.unit.priceCurrency || 'TRY'}` : 'Belirtilmedi'],
    ];
    propertyCells.forEach((cell, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      this.drawPdfSmallCell(page, boldFont, regularFont, cell[0], cell[1], 42 + col * 130, propertyY - row * 28, 116);
    });

    this.drawPdfPanel(page, boldFont, '4. YETKI TURU', 28, height - 538, 172, 86, blue);
    this.drawCheckLine(page, boldFont, 48, height - 486, 'SATIS YETKISI', letter.authorityType === 'SATIS');
    this.drawCheckLine(page, boldFont, 48, height - 510, 'KIRALAMA YETKISI', letter.authorityType === 'KIRALAMA');
    this.drawCheckLine(page, boldFont, 48, height - 534, 'SATIS VE KIRALAMA', letter.authorityType === 'SATIS_VE_KIRALAMA');

    this.drawPdfPanel(page, boldFont, '5. YETKI SURESI', 212, height - 538, 172, 86, blue);
    this.drawPdfRow(page, boldFont, regularFont, 'Baslangic', this.formatDate(letter.authorityStartDate), 230, height - 490, 134);
    this.drawPdfRow(page, boldFont, regularFont, 'Bitis', this.formatDate(letter.authorityEndDate), 230, height - 516, 134);
    page.drawText('Toplam Sure', { x: 230, y: height - 535, size: 8.6, font: boldFont, color: navy });
    page.drawText(`${this.calculateDurationDays(letter.authorityStartDate, letter.authorityEndDate)} GUN`, { x: 302, y: height - 535, size: 10.5, font: boldFont, color: primary });

    this.drawPdfPanel(page, boldFont, '6. MUNHASIRLIK DURUMU', 396, height - 538, 171, 86, blue);
    this.drawCheckLine(page, boldFont, 416, height - 492, 'MUNHASIR YETKI', false);
    this.drawCheckLine(page, boldFont, 416, height - 520, 'MUNHASIR OLMAYAN YETKI', true);

    page.drawText('7. SOZLESME HUKUMLERI', { x: 38, y: height - 570, size: 11, font: boldFont, color: navy });
    const terms = [
      'Malik, yukarida bilgileri bulunan tasinmazin satisa, kiralamaya veya satis ve kiralamaya birlikte arz edilmesi amaciyla yukarida bilgileri yer alan emlak danismanini yetkilendirdigini kabul eder.',
      'Danisman, tasinmazin pazarlanmasi, tanitilmasi, gosterimi, alici veya kiraci adaylari ile gorusmelerin yurutulmesi ve taraflar arasinda iletisim kurulmasina aracilik etme yetkisine sahiptir.',
      'Taraflar, hizmet bedeli konusunu yururlukteki mevzuat ve meslek kurallari cercevesinde ayrica kararlastiracaklarini kabul eder.',
      'Malik, tasinmaz uzerinde tasarruf yetkisine sahip oldugunu, beyan ettigi bilgilerin dogru oldugunu ve tasinmazin pazarlanmasina izin verdigini beyan eder.',
      'Danisman, meslek etigi kurallarina uygun hareket edecegini, malikin menfaatlerini koruyacagini ve gerekli ozeni gosterecegini kabul eder.',
      'Taraflar, kisisel verilerin korunmasi mevzuatina uygun hareket edeceklerini kabul eder.',
      'Isbu sozlesme, taraflarin imzasi ile yururluge girer ve belirtilen sure sonunda kendiliginden sona erer.',
    ];
    let termsY = height - 590;
    terms.forEach((term, index) => {
      page.drawText(`${index + 1}.`, { x: 40, y: termsY, size: 7.5, font: boldFont, color: primary });
      termsY = this.drawWrappedText(page, regularFont, term, 57, termsY, 350, 7.2, 10, rgb(0.08, 0.1, 0.14)) - 5;
    });

    page.drawRectangle({ x: 420, y: height - 706, width: 126, height: 126, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1.2 });
    page.drawImage(qrImage, { x: 443, y: height - 676, width: 80, height: 80 });
    page.drawText('BELGE DOGRULAMA', { x: 438, y: height - 594, size: 8.2, font: boldFont, color: green });
    page.drawText('QR kodu okutun', { x: 449, y: height - 690, size: 7.2, font: boldFont, color: navy });
    page.drawText(letter.authorityNo, { x: 435, y: height - 702, size: 6.6, font: boldFont, color: primary });

    page.drawRectangle({ x: 38, y: 142, width: 220, height: 72, color: soft, borderColor: border, borderWidth: 1 });
    page.drawRectangle({ x: 38, y: 193, width: 220, height: 21, color: blue });
    page.drawText('8. TASINMAZ MALIKI', { x: 74, y: 199, size: 9, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText(`Ad Soyad: ${this.safePdfText(letter.ownerName)}`, { x: 52, y: 176, size: 8, font: regularFont, color: navy });
    page.drawText('Imza:', { x: 52, y: 158, size: 8, font: regularFont, color: navy });
    page.drawRectangle({ x: 96, y: 150, width: 144, height: 28, borderColor: border, borderWidth: 0.8 });

    page.drawRectangle({ x: 338, y: 142, width: 220, height: 72, color: soft, borderColor: border, borderWidth: 1 });
    page.drawRectangle({ x: 338, y: 193, width: 220, height: 21, color: blue });
    page.drawText('9. EMLAK DANISMANI', { x: 374, y: 199, size: 9, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText(`Ad Soyad: ${this.safePdfText(this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName))}`, { x: 352, y: 176, size: 8, font: regularFont, color: navy });
    page.drawText('Imza:', { x: 352, y: 158, size: 8, font: regularFont, color: navy });
    page.drawRectangle({ x: 396, y: 150, width: 144, height: 28, borderColor: border, borderWidth: 0.8 });

    page.drawLine({ start: { x: 216, y: 126 }, end: { x: 380, y: 126 }, thickness: 0.8, color: border });
    page.drawText('TARIH', { x: 282, y: 115, size: 9, font: boldFont, color: primary });
    page.drawText(this.formatDate(new Date()), { x: 272, y: 100, size: 9, font: boldFont, color: navy });

    if (logoImage) {
      page.drawImage(logoImage, { x: 32, y: 42, width: 48, height: 48 });
    }
    page.drawText('EPH', { x: 78, y: 60, size: 20, font: boldFont, color: blue });
    page.drawText('www.emlakportfoyhavuzu.com', { x: 162, y: 61, size: 7.5, font: boldFont, color: navy });
    page.drawText('0850 305 25 10', { x: 314, y: 61, size: 7.5, font: boldFont, color: navy });
    page.drawText('info@emlakportfoyhavuzu.com', { x: 414, y: 61, size: 7.5, font: boldFont, color: navy });
    page.drawRectangle({ x: 472, y: 34, width: 76, height: 23, color: blue });
    page.drawText('EPH PLATFORMU', { x: 486, y: 47, size: 7, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText('DOGRULANABILIR', { x: 489, y: 39, size: 5.7, font: boldFont, color: rgb(1, 1, 1) });

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
      throw new NotFoundException('Yetki belgesi bulunamadÄ±.');
    }

    this.ensureCanManage(input, letter.unit.project.ownerId);

    const pdfUrl = this.cleanText(input.pdfUrl);

    if (!pdfUrl) {
      throw new BadRequestException('PDF baÄŸlantÄ±sÄ± zorunludur.');
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
      message: 'PDF yetki belgesine iÅŸlendi.',
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
      return this.getDefaultAuthorityLetterQuotaSnapshot(input);
    }

    const packageInfo = await input.tx.uyelikPaketi.findUnique({
      where: {
        id: activePackageRelation.paketId,
      },
    });

    if (!packageInfo || !packageInfo.aktifMi) {
      throw new BadRequestException(
        'Aktif Ã¼yelik paketiniz doÄŸrulanamadÄ±. Yetki belgesi Ã¼retim limiti hesaplanamadÄ±.',
      );
    }

    const activePortfolioLimit = Number(packageInfo.aktifPortfoyLimiti || 0);

    if (!activePortfolioLimit) {
      throw new BadRequestException(
        'Ãœyelik paketinizde aktif portfÃ¶y limiti tanÄ±mlÄ± deÄŸil.',
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


  private async getDefaultAuthorityLetterQuotaSnapshot(input: {
    tx: any;
    userId: string;
  }) {
    const monthlyLimit = 20;
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
        code: 'EPH_DEFAULT',
        name: 'VarsayÄ±lan Paket',
        activePortfolioLimit: 10,
      },
      periodStart: monthRange.start,
      periodEnd: monthRange.end,
    };
  }

  private async getDefaultAuthorityLetterQuotaUsage(input: {
    tx: any;
    userId: string;
  }): Promise<AuthorityLetterQuotaResult> {
    const monthlyLimit = 20;
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
      return this.getDefaultAuthorityLetterQuotaUsage(input);
    }

    const packageInfo = await input.tx.uyelikPaketi.findUnique({
      where: {
        id: activePackageRelation.paketId,
      },
    });

    if (!packageInfo || !packageInfo.aktifMi) {
      throw new BadRequestException(
        'Aktif Ã¼yelik paketiniz doÄŸrulanamadÄ±. Yetki belgesi Ã¼retim limiti hesaplanamadÄ±.',
      );
    }

    const activePortfolioLimit = Number(packageInfo.aktifPortfoyLimiti || 0);

    if (!activePortfolioLimit) {
      throw new BadRequestException(
        'Ãœyelik paketinizde aktif portfÃ¶y limiti tanÄ±mlÄ± deÄŸil.',
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
      throw new BadRequestException('KontÃ¶r cÃ¼zdanÄ±nÄ±z aktif deÄŸil.');
    }

    if (wallet.bakiye < input.amount) {
      throw new BadRequestException(
        `AylÄ±k Ã¼cretsiz yetki belgesi hakkÄ±nÄ±z dolmuÅŸtur. Yeni belge Ã¼retmek iÃ§in ${input.amount} kontÃ¶r gereklidir. Mevcut bakiyeniz ${wallet.bakiye} kontÃ¶r.`,
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
      throw new NotFoundException('PortfÃ¶y bulunamadÄ±.');
    }

    return unit;
  }

  private ensureCanView(user: CurrentUserPayload, ownerId: string) {
    if (this.isManager(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini gÃ¶rÃ¼ntÃ¼leme yetkiniz yok.');
  }

  private ensureCanManage(user: CurrentUserPayload, ownerId: string) {
    if (this.isSuperAdmin(user.userRole)) return;
    if (user.userId === ownerId) return;

    throw new ForbiddenException('Bu yetki belgesini oluÅŸturma yetkiniz yok.');
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
      'Yetki tÃ¼rÃ¼ SATIS, KIRALAMA veya SATIS_VE_KIRALAMA olmalÄ±dÄ±r.',
    );
  }

  private normalizeDurationDays(value?: number | string) {
    const numeric = Number(value || 0);

    if ([30, 90, 180, 365].includes(numeric)) {
      return numeric;
    }

    throw new BadRequestException('Yetki sÃ¼resi 30, 90, 180 veya 365 gÃ¼n olmalÄ±dÄ±r.');
  }

  private normalizeDate(value?: string) {
    if (!value) return new Date();

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('BaÅŸlangÄ±Ã§ tarihi geÃ§ersiz.');
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
    return name || 'EPH DanÄ±ÅŸmanÄ±';
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
    if (normalized === 'SATIS') return 'SatÄ±ÅŸ';
    if (normalized === 'KIRALAMA') return 'Kiralama';
    if (normalized === 'SATIS_VE_KIRALAMA') return 'SatÄ±ÅŸ ve Kiralama';
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
      currentY -= lineHeight;
    }

    return currentY;
  }

  private calculateDurationDays(start: Date, end: Date) {
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  private drawPdfPanel(page: any, boldFont: any, title: string, x: number, y: number, w: number, h: number, color: any) {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), borderColor: rgb(0.78, 0.839, 0.91), borderWidth: 1 });
    page.drawRectangle({ x, y: y + h - 24, width: w, height: 24, color });
    page.drawText(this.safePdfText(title), { x: x + 13, y: y + h - 16, size: 9.5, font: boldFont, color: rgb(1, 1, 1) });
  }

  private drawPdfMetaBox(page: any, boldFont: any, regularFont: any, x: number, y: number, w: number, h: number, rows: string[][]) {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), borderColor: rgb(0.78, 0.839, 0.91), borderWidth: 1 });
    const rowH = h / rows.length;
    rows.forEach((row, index) => {
      const rowY = y + h - rowH * (index + 1);
      if (index > 0) {
        page.drawLine({ start: { x, y: rowY + rowH }, end: { x: x + w, y: rowY + rowH }, thickness: 0.6, color: rgb(0.78, 0.839, 0.91) });
      }
      page.drawText(this.safePdfText(row[0]), { x: x + 8, y: rowY + 9, size: 6.2, font: boldFont, color: rgb(0.024, 0.098, 0.29) });
      page.drawText(this.safePdfText(row[1]).slice(0, 24), { x: x + 65, y: rowY + 9, size: 6.5, font: regularFont, color: rgb(0.024, 0.098, 0.29) });
    });
  }

  private drawPdfRow(page: any, boldFont: any, regularFont: any, label: string, value: string, x: number, y: number, w: number) {
    page.drawText(this.safePdfText(label), { x, y, size: 7.2, font: boldFont, color: rgb(0.024, 0.098, 0.29) });
    page.drawText(':', { x: x + 66, y, size: 7.2, font: boldFont, color: rgb(0.392, 0.455, 0.545) });
    page.drawText(this.safePdfText(String(value || 'Belirtilmedi')).slice(0, 36), { x: x + 78, y, size: 7.2, font: regularFont, color: rgb(0.08, 0.1, 0.14) });
    page.drawLine({ start: { x, y: y - 8 }, end: { x: x + w, y: y - 8 }, thickness: 0.35, color: rgb(0.78, 0.839, 0.91) });
  }

  private drawPdfSmallCell(page: any, boldFont: any, regularFont: any, label: string, value: string, x: number, y: number, w: number) {
    page.drawText(this.safePdfText(label), { x, y, size: 6.5, font: boldFont, color: rgb(0.02, 0.243, 0.545) });
    page.drawText(this.safePdfText(String(value || 'Belirtilmedi')).slice(0, 18), { x: x + 54, y, size: 6.6, font: regularFont, color: rgb(0.08, 0.1, 0.14) });
  }

  private drawCheckLine(page: any, boldFont: any, x: number, y: number, label: string, checked: boolean) {
    page.drawRectangle({ x, y: y - 4, width: 10, height: 10, borderColor: rgb(0.02, 0.243, 0.545), borderWidth: 0.9, color: checked ? rgb(0.02, 0.243, 0.545) : rgb(1, 1, 1) });
    if (checked) {
      page.drawText('X', { x: x + 2.4, y: y - 1.7, size: 6.6, font: boldFont, color: rgb(1, 1, 1) });
    }
    page.drawText(this.safePdfText(label), { x: x + 18, y, size: 7.8, font: boldFont, color: rgb(0.08, 0.1, 0.14) });
  }

  private getLogoBytes() {
    const candidates = [
      join(process.cwd(), '../frontend/public/LOGO_EPH.png'),
      join(process.cwd(), 'frontend/public/LOGO_EPH.png'),
      join(process.cwd(), 'public/LOGO_EPH.png'),
    ];

    const logoPath = candidates.find((candidate) => existsSync(candidate));
    return logoPath ? readFileSync(logoPath) : null;
  }

  private safePdfText(value: string) {
    return String(value || '')
      .replace(/ÄŸ/g, 'g')
      .replace(/Ä/g, 'G')
      .replace(/Ã¼/g, 'u')
      .replace(/Ãœ/g, 'U')
      .replace(/ÅŸ/g, 's')
      .replace(/Å/g, 'S')
      .replace(/Ä±/g, 'i')
      .replace(/Ä°/g, 'I')
      .replace(/Ã¶/g, 'o')
      .replace(/Ã–/g, 'O')
      .replace(/Ã§/g, 'c')
      .replace(/Ã‡/g, 'C');
  }
}
