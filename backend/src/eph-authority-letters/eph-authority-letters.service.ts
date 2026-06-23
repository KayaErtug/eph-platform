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
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 420,
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
    const green = rgb(0.047, 0.518, 0.259);
    const white = rgb(1, 1, 1);

    const text = (value: string) => this.safePdfText(value);
    const draw = (
      value: string,
      x: number,
      y: number,
      size: number,
      font: any = regularFont,
      color: any = navy,
      maxChars?: number,
    ) => {
      const cleaned = text(value);
      page.drawText(maxChars ? cleaned.slice(0, maxChars) : cleaned, {
        x,
        y,
        size,
        font,
        color,
      });
    };
    const line = (x1: number, y1: number, x2: number, y2: number, color: any = border) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.65,
        color,
      });
    };
    const panel = (title: string, x: number, y: number, w: number, h: number) => {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: white,
        borderColor: border,
        borderWidth: 1,
      });
      page.drawRectangle({
        x,
        y: y + h - 22,
        width: w,
        height: 22,
        color: blue,
      });
      draw(title, x + 12, y + h - 15, 8.8, boldFont, white);
    };
    const row = (label: string, value: string, x: number, y: number, w: number) => {
      draw(label, x, y, 7, boldFont, navy, 24);
      draw(':', x + 64, y, 7, boldFont, slate);
      draw(value || 'Belirtilmedi', x + 78, y, 7, regularFont, navy, 39);
      line(x, y - 8, x + w, y - 8);
    };
    const smallCell = (label: string, value: string, x: number, y: number, w: number) => {
      draw(label, x, y, 6.4, boldFont, blue, 18);
      draw(value || 'Belirtilmedi', x + 58, y, 6.3, regularFont, navy, 22);
      line(x, y - 8, x + w, y - 8);
    };
    const check = (x: number, y: number, label: string, checked: boolean) => {
      page.drawRectangle({
        x,
        y: y - 4,
        width: 10,
        height: 10,
        borderColor: blue,
        borderWidth: 0.9,
        color: checked ? blue : white,
      });
      if (checked) {
        draw('X', x + 2.4, y - 1.7, 6.6, boldFont, white);
      }
      // label icin maxChars yok — tum etiket gorunsun; panel genisligi zaten sinirliyor
      draw(label, x + 17, y, 7.2, boldFont, navy);
    };

    page.drawRectangle({
      x: 18,
      y: 18,
      width: width - 36,
      height: height - 36,
      color: white,
      borderColor: border,
      borderWidth: 1.2,
    });
    page.drawLine({
      start: { x: 18, y: height - 18 },
      end: { x: width - 18, y: height - 18 },
      thickness: 4,
      color: blue,
    });
    page.drawLine({
      start: { x: 18, y: 18 },
      end: { x: width - 18, y: 18 },
      thickness: 4,
      color: blue,
    });

    if (logoImage) {
      page.drawImage(logoImage, { x: 40, y: 720, width: 70, height: 70 });
    } else {
      draw('EPH', 48, 760, 26, boldFont, blue);
    }

    draw('EMLAK PORTFOY HAVUZU', 38, 704, 8.6, boldFont, navy);
    draw('GUVEN - PAYLAS - KAZAN', 43, 690, 7.2, boldFont, slate);

    draw('GAYRIMENKUL SATIS / KIRALAMA', 150, 758, 15.8, boldFont, navy);
    draw('YETKILENDIRME SOZLESMESI', 170, 735, 15.8, boldFont, navy);
    line(210, 718, 385, 718);
    draw('EPH EMLAK PORTFOY HAVUZU PLATFORMU', 190, 696, 9, boldFont, primary);

    const metaX = 434;
    const metaY = 692;
    const metaW = 128;
    const metaH = 96;
    page.drawRectangle({
      x: metaX,
      y: metaY,
      width: metaW,
      height: metaH,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });
    const metaRows = [
      ['BELGE NO', letter.authorityNo],
      ['PORTFOY NO', this.getEphId(letter.unit.id)],
      ['DUZENLEME', this.formatDate(new Date())],
      ['DOGRULAMA', 'QR ILE AKTIF'],
    ];
    metaRows.forEach((item, index) => {
      const y = metaY + metaH - 24 * (index + 1);
      if (index > 0) line(metaX, y + 24, metaX + metaW, y + 24);
      draw(item[0], metaX + 8, y + 9, 5.8, boldFont, navy, 16);
      draw(item[1], metaX + 63, y + 9, 5.6, regularFont, navy, 22);
    });

    panel('1. TASINMAZ MALIKI BILGILERI', 28, 562, 260, 108);
    row('Ad Soyad', letter.ownerName, 44, 636, 222);
    row('Telefon', letter.ownerPhone || 'Belirtilmedi', 44, 608, 222);
    row('Adres', letter.unit.project.address || `${letter.unit.project.city} / ${letter.unit.project.district}`, 44, 580, 222);

    panel('2. YETKILENDIRILEN EMLAK DANISMANI BILGILERI', 307, 562, 260, 108);
    row('Ad Soyad', this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName), 323, 636, 222);
    row('Telefon', '+90 535 79 09 EPH', 323, 608, 222);
    row('EPH Uye No', letter.unit.project.owner?.memberCode || 'Belirtilmedi', 323, 580, 222);

    panel('3. TASINMAZ BILGILERI', 28, 452, 539, 90);
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
      ['Fiyat', letter.unit.price ? `${this.formatPrice(Number(letter.unit.price))} ${letter.unit.priceCurrency || 'TRY'}` : 'Belirtilmedi'],
    ];
    propertyCells.forEach((cell, index) => {
      const col = index % 4;
      const rowIndex = Math.floor(index / 4);
      smallCell(cell[0], cell[1], 42 + col * 132, 504 - rowIndex * 24, 116);
    });

    panel('4. YETKI TURU', 28, 344, 154, 80);
    check(44, 394, 'SATIS YETKISI', letter.authorityType === 'SATIS');
    check(44, 372, 'KIRALAMA YETKISI', letter.authorityType === 'KIRALAMA');
    check(44, 350, 'SATIS VE KIRALAMA', letter.authorityType === 'SATIS_VE_KIRALAMA');

    panel('5. YETKI SURESI', 196, 344, 154, 80);
    row('Baslangic', this.formatDate(letter.authorityStartDate), 214, 394, 114);
    row('Bitis', this.formatDate(letter.authorityEndDate), 214, 370, 114);
    draw('Toplam Sure', 214, 350, 7.4, boldFont, navy);
    draw(`${this.calculateDurationDays(letter.authorityStartDate, letter.authorityEndDate)} GUN`, 286, 350, 10.2, boldFont, primary);

    panel('6. MUNHASIRLIK DURUMU', 364, 344, 154, 80);
    check(382, 390, 'MUNHASIR YETKI', false);
    check(382, 364, 'MUNHASIR OLMAYAN YETKI', true);

    draw('7. SOZLESME HUKUMLERI', 38, 320, 10.5, boldFont, navy);
    const terms = [
      'Malik, yukarida bilgileri bulunan tasinmaz icin emlak danismanini satis veya kiralama surecinde yetkilendirdigini kabul eder.',
      'Danisman, tasinmazin pazarlanmasi, tanitimi, gosterimi ve alici ya da kiraci adaylari ile gorusmeleri yurutmeye yetkilidir.',
      'Taraflar, hizmet bedeli ve komisyon kosullarini yururlukteki mevzuat ve meslek kurallari cercevesinde ayrica kararlastirir.',
      'Malik, beyan ettigi bilgilerin dogru oldugunu ve tasinmaz uzerinde tasarruf yetkisine sahip bulundugunu beyan eder.',
      'Isbu belge EPH Platformu uzerinde uretilmis olup QR kod ile sistem kaydi dogrulanabilir.',
    ];
    let termsY = 302;
    terms.forEach((term, index) => {
      draw(`${index + 1}.`, 43, termsY, 7, boldFont, primary);
      termsY = this.drawWrappedText(
        page,
        regularFont,
        term,
        60,
        termsY,
        330,
        6.7,
        8.2,
        navy,
      ) - 2;
    });

    page.drawRectangle({
      x: 424,
      y: 196,
      width: 116,
      height: 126,
      color: white,
      borderColor: border,
      borderWidth: 1.2,
    });
    draw('BELGE DOGRULAMA', 440, 306, 8, boldFont, green);
    page.drawImage(qrImage, { x: 450, y: 226, width: 66, height: 66 });
    draw('QR kodu okutun', 451, 216, 6.8, boldFont, navy);
    draw(letter.authorityNo, 438, 206, 6.3, boldFont, primary, 26);

    // İmza kutuları — tam simetrik (kullanilabilir alan: 18..577 = 559px, her kutu 240px, ara bosluk 79px)
    const sigW = 240;
    const sigH = 76;
    const sigY = 112;
    const sigGap = Math.round((559 - sigW * 2) / 3);
    const sig1X = 18 + sigGap;                  // ~46
    const sig2X = sig1X + sigW + sigGap;         // ~326

    // Sol: Tasinmaz Maliki
    page.drawRectangle({ x: sig1X, y: sigY, width: sigW, height: sigH, color: soft, borderColor: border, borderWidth: 1 });
    page.drawRectangle({ x: sig1X, y: sigY + sigH - 21, width: sigW, height: 21, color: blue });
    draw('8. TASINMAZ MALIKI', sig1X + sigW / 2 - 54, sigY + sigH - 14, 8.8, boldFont, white);
    draw(`Ad Soyad: ${this.safePdfText(letter.ownerName)}`, sig1X + 12, sigY + sigH - 36, 7.5, regularFont, navy, 36);
    draw('Imza:', sig1X + 12, sigY + 14, 7.5, regularFont, navy);
    page.drawRectangle({ x: sig1X + 50, y: sigY + 8, width: sigW - 62, height: 24, borderColor: border, borderWidth: 0.8 });

    // Sag: Emlak Danismani
    const consultantName = this.safePdfText(this.formatName(letter.unit.project.owner?.firstName, letter.unit.project.owner?.lastName));
    page.drawRectangle({ x: sig2X, y: sigY, width: sigW, height: sigH, color: soft, borderColor: border, borderWidth: 1 });
    page.drawRectangle({ x: sig2X, y: sigY + sigH - 21, width: sigW, height: 21, color: blue });
    draw('9. EMLAK DANISMANI', sig2X + sigW / 2 - 52, sigY + sigH - 14, 8.8, boldFont, white);
    draw(`Ad Soyad: ${consultantName}`, sig2X + 12, sigY + sigH - 36, 7.5, regularFont, navy, 36);
    draw('Imza:', sig2X + 12, sigY + 14, 7.5, regularFont, navy);
    page.drawRectangle({ x: sig2X + 50, y: sigY + 8, width: sigW - 62, height: 24, borderColor: border, borderWidth: 0.8 });

    line(216, 96, 380, 96);
    draw('TARIH', 282, 86, 8.8, boldFont, primary);
    draw(this.formatDate(new Date()), 272, 73, 8.8, boldFont, navy);

    if (logoImage) {
      page.drawImage(logoImage, { x: 36, y: 40, width: 40, height: 40 });
    }
    draw('EPH', 82, 56, 17, boldFont, blue);

    // Telefon ve web merkeze ortalanmis cizgili kutu
    const footerInfoW = 230;
    const footerInfoX = (width - footerInfoW) / 2;
    page.drawRectangle({ x: footerInfoX, y: 36, width: footerInfoW, height: 22, color: white, borderColor: border, borderWidth: 1 });
    draw('+90 535 79 09 EPH', footerInfoX + 10, 43, 7.2, boldFont, navy);
    draw('www.emlakportfoyhavuzu.com', footerInfoX + 118, 43, 7.2, boldFont, navy);

    // Sag tarafa yaslanmis EPH PLATFORMU butonu
    const btnW = 84;
    const btnX = width - 18 - btnW - 4;
    page.drawRectangle({ x: btnX, y: 32, width: btnW, height: 26, color: blue });
    draw('EPH PLATFORMU', btnX + 8, 47, 6.4, boldFont, white);
    draw('DOGRULANABILIR', btnX + 11, 38, 5.4, boldFont, white);

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
      return this.getDefaultAuthorityLetterQuotaSnapshot(input);
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
        name: 'Varsayılan Paket',
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

  private formatPrice(value: number): string {
    try {
      return new Intl.NumberFormat('tr-TR').format(value);
    } catch {
      return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  }

  private safePdfText(value: string) {
    return String(value || '')
      .replace(/₺/g, 'TL')
      .replace(/€/g, 'EUR')
      .replace(/£/g, 'GBP')
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
      .replace(/Ç/g, 'C')
      .replace(/[\u0080-\uFFFF]/g, '');
  }
}
