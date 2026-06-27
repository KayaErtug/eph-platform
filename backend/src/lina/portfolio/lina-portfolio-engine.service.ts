import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import {
  LinaPortfolioDraftInput,
  LinaPortfolioSessionContext,
  LinaPortfolioSessionService,
} from './lina-portfolio-session.service';

type CityRecord = {
  name: string;
  normalized: string;
  country: 'TR' | 'KKTC';
};

type CityDataFile = {
  turkiye?: string[];
  kktc?: string[];
};

@Injectable()
export class LinaPortfolioEngineService {
  private cityCache: CityRecord[] | null = null;

  constructor(
    private readonly linaPortfolioSessionService: LinaPortfolioSessionService,
  ) {}

  async processUserMessage(
    userId: string,
    message: string,
  ): Promise<LinaPortfolioSessionContext> {
    const currentSession =
      await this.linaPortfolioSessionService.getOrCreateActiveSession(userId);

    await this.linaPortfolioSessionService.appendUserMessage(userId, message);

    const confirmation = this.extractConfirmation(message);

    if (
      (currentSession.step === 'SUMMARY' ||
        currentSession.step === 'CONFIRMATION') &&
      confirmation === 'APPROVED'
    ) {
      return this.linaPortfolioSessionService.markApproved(userId);
    }

    if (
      (currentSession.step === 'SUMMARY' ||
        currentSession.step === 'CONFIRMATION') &&
      confirmation === 'REJECTED'
    ) {
      return this.linaPortfolioSessionService.markRejected(userId);
    }

    const extractedFields = this.extractFieldsFromMessage(
      message,
      currentSession,
    );

    if (Object.keys(extractedFields).length > 0) {
      return this.linaPortfolioSessionService.updateExtractedFields(
        userId,
        extractedFields,
      );
    }

    return this.linaPortfolioSessionService.getOrCreateActiveSession(userId);
  }

  buildEnginePrompt(session: LinaPortfolioSessionContext): string {
    const exactReply = this.buildExactReply(session);

    return [
      'LINA PORTFÖY MANUEL FORM ENGINE V1',
      'Bu akış EPH manuel portföy giriş formunun birebir sırasını kullanır.',
      'Kararı backend verir. GPT alan sırasını değiştiremez.',
      '',
      `Portföy adı: ${session.title || (session.titleSkipped ? 'Geçildi' : 'Eksik')}`,
      `Şehir: ${session.city || 'Eksik'}`,
      `İlçe: ${session.district || 'Eksik'}`,
      `Mahalle / Köy / Mevki: ${session.neighborhood || 'Eksik'}`,
      `Mülk tipi: ${session.mainCategory || 'Eksik'}`,
      `Alt kategori: ${session.propertyType || 'Eksik'}`,
      `Durum: ${session.transactionType || 'Eksik'}`,
      `Oda sayısı: ${session.roomCount || 'Uygulanmıyor / Eksik'}`,
      `Alan: ${session.squareMeter ?? 'Eksik'}`,
      `Bina yaşı: ${session.buildingAge || 'Uygulanmıyor / Eksik'}`,
      `Bulunduğu kat: ${session.floor || 'Uygulanmıyor / Eksik'}`,
      `Toplam kat sayısı: ${session.buildingFloorCount ?? 'Uygulanmıyor / Eksik'}`,
      `Ada No: ${session.adaNo || (session.adaNoSkipped ? 'Geçildi' : 'Eksik')}`,
      `Parsel No: ${session.parselNo || (session.parselNoSkipped ? 'Geçildi' : 'Eksik')}`,
      `Daire / Bölüm No: ${session.unitNumber || (session.unitNumberSkipped ? 'Geçildi' : 'Eksik')}`,
      `Para birimi: ${session.currencyConfirmed ? session.currency : 'Eksik'}`,
      `Fiyat: ${session.price ?? 'Eksik'}`,
      `Sıradaki adım: ${session.step}`,
      `Eksik alanlar: ${session.missingFields.length ? session.missingFields.join(', ') : 'Yok'}`,
      '',
      'KESİN KURALLAR',
      '- Kullanıcıya yalnız sıradaki tek alanı sor.',
      '- Daha önce verilen alanı tekrar sorma.',
      '- Villa için “daire kaçıncı katta” deme; “gayrimenkulün bulunduğu kat” de.',
      '- Mülk tipi ve alt kategori birbirinden ayrıdır.',
      '- Mahalle bilgisinden sonra harita doğrulamasının kayıt ekranında yapılacağını tek cümleyle belirt.',
      '- Kullanıcı “geç” derse yalnız opsiyonel alanı geç.',
      '- Özet aşamasından önce onay isteme.',
      '- Kullanıcı onay vermeden oturumu tamamlanmış sayma.',
      '',
      'PORTFOLIO_EXACT_REPLY_START',
      exactReply,
      'PORTFOLIO_EXACT_REPLY_END',
      'Yukarıdaki cevap kullanıcıya aynen verilmelidir.',
    ].join('\n');
  }

  buildExactReply(session: LinaPortfolioSessionContext): string {
    if (session.step === 'CREATED') {
      return 'Portföy bilgilerini onayladım. Portföy taslağınız hazır.';
    }

    if (session.step === 'SUMMARY' || session.step === 'CONFIRMATION') {
      return `${this.buildSummary(session)}\n\nBilgileri onaylıyor musunuz?`;
    }

    const question = this.getNextQuestion(session);
    const userMessageCount = session.state.userMessages?.length || 0;

    if (userMessageCount <= 1 && session.step === 'TITLE') {
      return `Portföy girişine başlayalım. ${question}`;
    }

    if (session.step === 'MAIN_CATEGORY' && session.neighborhood) {
      return `Konum bilgisini kaydettim. Harita konumu portföy kayıt ekranında doğrulanacak. ${question}`;
    }

    return `Kaydettim. ${question}`;
  }

  private getNextQuestion(session: LinaPortfolioSessionContext): string {
    switch (session.step) {
      case 'TITLE':
        return 'Bu portföye bir isim vermek ister misiniz? İstemiyorsanız “geç” diyebilirsiniz.';
      case 'CITY':
        return 'Şehir bilgisini paylaşır mısınız?';
      case 'DISTRICT':
        return 'İlçe bilgisini paylaşır mısınız?';
      case 'NEIGHBORHOOD':
        return 'Mahalle, köy veya mevki bilgisini paylaşır mısınız?';
      case 'MAIN_CATEGORY':
        return 'Mülk tipi nedir? Örneğin konut, ticari, arsa/arazi, sanayi veya turistik tesis.';
      case 'SUB_CATEGORY':
        return 'Alt kategoriyi paylaşır mısınız? Örneğin daire, villa, rezidans, arsa, tarla, ofis veya dükkan.';
      case 'TRANSACTION_TYPE':
        return 'Portföyün durumu nedir? Örneğin satılık, kiralık, günlük kiralık veya devren.';
      case 'ROOM_COUNT':
        return 'Oda sayısını paylaşır mısınız?';
      case 'SQUARE_METER':
        return 'Alan bilgisini metrekare olarak paylaşır mısınız?';
      case 'BUILDING_AGE':
        return 'Bina yaşını paylaşır mısınız?';
      case 'FLOOR':
        return 'Gayrimenkulün bulunduğu katı paylaşır mısınız?';
      case 'BUILDING_FLOOR_COUNT':
        return 'Toplam kat sayısını paylaşır mısınız?';
      case 'ADA_NO':
        return this.isLandPortfolio(session)
          ? 'Ada numarasını paylaşır mısınız?'
          : 'Ada numarası varsa paylaşır mısınız? Yoksa “geç” diyebilirsiniz.';
      case 'PARSEL_NO':
        return this.isLandPortfolio(session)
          ? 'Parsel numarasını paylaşır mısınız?'
          : 'Parsel numarası varsa paylaşır mısınız? Yoksa “geç” diyebilirsiniz.';
      case 'UNIT_NUMBER':
        return 'Daire veya bölüm numarası varsa paylaşır mısınız? Yoksa “geç” diyebilirsiniz.';
      case 'CURRENCY':
        return 'Para birimini seçelim: Türk Lirası, Amerikan Doları, Euro veya İngiliz Sterlini?';
      case 'PRICE':
        return 'Fiyat bilgisini paylaşır mısınız?';
      default:
        return 'Bilgileri onaylıyor musunuz?';
    }
  }

  private buildSummary(session: LinaPortfolioSessionContext): string {
    const parts = [
      session.title ? `Portföy adı: ${session.title}` : null,
      `Konum: ${[session.city, session.district, session.neighborhood].filter(Boolean).join(' / ')}`,
      `Mülk tipi: ${session.mainCategory}`,
      `Alt kategori: ${session.propertyType}`,
      `Durum: ${session.transactionType}`,
      session.roomCount ? `Oda sayısı: ${session.roomCount}` : null,
      `Alan: ${session.squareMeter} m²`,
      session.buildingAge ? `Bina yaşı: ${session.buildingAge}` : null,
      session.floor ? `Bulunduğu kat: ${session.floor}` : null,
      session.buildingFloorCount
        ? `Toplam kat: ${session.buildingFloorCount}`
        : null,
      session.adaNo ? `Ada No: ${session.adaNo}` : null,
      session.parselNo ? `Parsel No: ${session.parselNo}` : null,
      session.unitNumber
        ? `Daire / Bölüm No: ${session.unitNumber}`
        : null,
      `Fiyat: ${this.formatPrice(session.price)} ${this.getCurrencyLabel(session.currency)}`,
    ].filter(Boolean);

    return ['Portföy özeti:', ...parts.map((part) => `• ${part}`)].join(
      '\n',
    );
  }

  private extractFieldsFromMessage(
    message: string,
    session: LinaPortfolioSessionContext,
  ): LinaPortfolioDraftInput {
    const normalized = this.normalize(message);
    const fields: LinaPortfolioDraftInput = {};
    const step = session.step;

    if (this.isSkipIntent(normalized)) {
      if (step === 'TITLE') fields.titleSkipped = true;
      if (step === 'ADA_NO' && !this.isLandPortfolio(session)) {
        fields.adaNoSkipped = true;
      }
      if (step === 'PARSEL_NO' && !this.isLandPortfolio(session)) {
        fields.parselNoSkipped = true;
      }
      if (step === 'UNIT_NUMBER') fields.unitNumberSkipped = true;
      return fields;
    }

    const category = this.extractCategory(normalized);
    if (category.mainCategory) fields.mainCategory = category.mainCategory;
    if (category.propertyType) fields.propertyType = category.propertyType;

    const transactionType = this.extractTransactionType(normalized);
    if (transactionType) fields.transactionType = transactionType;

    const roomCount = this.extractRoomCount(message);
    if (roomCount) fields.roomCount = roomCount;

    const squareMeter = this.extractSquareMeter(message, step);
    if (squareMeter !== null) fields.squareMeter = squareMeter;

    const buildingAge = this.extractBuildingAge(message, step);
    if (buildingAge) fields.buildingAge = buildingAge;

    const floor = this.extractFloor(message, step);
    if (floor) fields.floor = floor;

    const buildingFloorCount = this.extractBuildingFloorCount(message, step);
    if (buildingFloorCount !== null) {
      fields.buildingFloorCount = buildingFloorCount;
    }

    const currency = this.extractCurrency(normalized);
    if (currency) {
      fields.currency = currency;
      fields.currencyConfirmed = true;
    }

    const price = this.extractPrice(message, step);
    if (price !== null) fields.price = price;

    if (step === 'TITLE' && !fields.titleSkipped) {
      const title = this.extractTitle(message, normalized);
      if (title) fields.title = title;
    }

    if (step === 'CITY' && !fields.city) {
      const city = this.extractKnownCity(normalized) || this.cleanFreeText(message);
      if (city) fields.city = this.toTitleCase(city);
    }

    if (step === 'DISTRICT' && !fields.district) {
      const value = this.cleanFreeText(message);
      if (value) fields.district = this.toTitleCase(value);
    }

    if (step === 'NEIGHBORHOOD' && !fields.neighborhood) {
      const value = this.cleanLocationText(message);
      if (value) fields.neighborhood = this.toTitleCase(value);
    }

    if (step === 'MAIN_CATEGORY' && !fields.mainCategory) {
      const value = this.cleanFreeText(message);
      if (value) fields.mainCategory = this.normalizeEnumValue(value);
    }

    if (step === 'SUB_CATEGORY' && !fields.propertyType) {
      const value = this.cleanFreeText(message);
      if (value) fields.propertyType = this.normalizeEnumValue(value);
    }

    if (step === 'TRANSACTION_TYPE' && !fields.transactionType) {
      const value = this.cleanFreeText(message);
      if (value) fields.transactionType = this.normalizeEnumValue(value);
    }

    if (step === 'ADA_NO') {
      const value = this.extractIdentifier(message);
      if (value) fields.adaNo = value;
    }

    if (step === 'PARSEL_NO') {
      const value = this.extractIdentifier(message);
      if (value) fields.parselNo = value;
    }

    if (step === 'UNIT_NUMBER') {
      const value = this.extractIdentifier(message);
      if (value) fields.unitNumber = value;
    }

    return fields;
  }

  private extractConfirmation(
    message: string,
  ): 'APPROVED' | 'REJECTED' | null {
    const normalized = this.normalize(message);

    if (
      /^(evet|onayliyorum|onayla|tamam|dogru|uygun)$/.test(normalized)
    ) {
      return 'APPROVED';
    }

    if (
      /^(hayir|onaylamiyorum|yanlis|duzelt|degistirelim)$/.test(normalized)
    ) {
      return 'REJECTED';
    }

    return null;
  }

  private extractTitle(message: string, normalized: string): string | null {
    if (
      normalized.includes('portfoy olustur') ||
      normalized.includes('portfoy girisi') ||
      normalized.includes('yeni portfoy') ||
      normalized.includes('ilan olustur')
    ) {
      return null;
    }

    const explicit = String(message || '').match(
      /(?:adi|adı|ismi|başlığı|basligi)\s*[:\-]?\s*(.+)$/i,
    );

    return this.cleanFreeText(explicit?.[1] || message);
  }

  private extractCategory(normalized: string): {
    mainCategory: string | null;
    propertyType: string | null;
  } {
    const mappings: Array<{
      words: string[];
      mainCategory: string;
      propertyType: string;
    }> = [
      { words: ['daire', 'apartman'], mainCategory: 'KONUT', propertyType: 'DAIRE' },
      { words: ['villa'], mainCategory: 'KONUT', propertyType: 'VILLA' },
      { words: ['rezidans'], mainCategory: 'KONUT', propertyType: 'REZIDANS' },
      { words: ['mustakil ev', 'mustak ev'], mainCategory: 'KONUT', propertyType: 'MUSTAK_EV' },
      { words: ['yazlik'], mainCategory: 'KONUT', propertyType: 'YAZLIK' },
      { words: ['arsa'], mainCategory: 'ARSA_ARAZI', propertyType: 'ARSA' },
      { words: ['tarla'], mainCategory: 'ARSA_ARAZI', propertyType: 'TARLA' },
      { words: ['bahce'], mainCategory: 'ARSA_ARAZI', propertyType: 'BAHCE' },
      { words: ['zeytinlik'], mainCategory: 'ARSA_ARAZI', propertyType: 'ZEYTINLIK' },
      { words: ['dukkan', 'magaza'], mainCategory: 'TICARI', propertyType: 'DUKKAN_MAGAZA' },
      { words: ['ofis', 'buro'], mainCategory: 'TICARI', propertyType: 'OFIS_BURO' },
      { words: ['depo', 'antrepo'], mainCategory: 'TICARI', propertyType: 'DEPO_ANTREPO' },
      { words: ['fabrika'], mainCategory: 'SANAYI', propertyType: 'FABRIKA_ATOLYE' },
      { words: ['atolye'], mainCategory: 'SANAYI', propertyType: 'ATOLYE' },
      { words: ['otel'], mainCategory: 'TURISTIK_TESIS', propertyType: 'OTEL' },
      { words: ['pansiyon'], mainCategory: 'TURISTIK_TESIS', propertyType: 'PANSIYON' },
      { words: ['konut projesi'], mainCategory: 'PROJE', propertyType: 'KONUT_PROJESI' },
      { words: ['villa projesi'], mainCategory: 'PROJE', propertyType: 'VILLA_PROJESI' },
    ];

    for (const mapping of mappings) {
      if (mapping.words.some((word) => normalized.includes(word))) {
        return {
          mainCategory: mapping.mainCategory,
          propertyType: mapping.propertyType,
        };
      }
    }

    if (normalized.includes('konut')) {
      return { mainCategory: 'KONUT', propertyType: null };
    }
    if (normalized.includes('ticari')) {
      return { mainCategory: 'TICARI', propertyType: null };
    }
    if (normalized.includes('arsa arazi') || normalized.includes('arazi')) {
      return { mainCategory: 'ARSA_ARAZI', propertyType: null };
    }
    if (normalized.includes('sanayi')) {
      return { mainCategory: 'SANAYI', propertyType: null };
    }
    if (normalized.includes('turistik')) {
      return { mainCategory: 'TURISTIK_TESIS', propertyType: null };
    }
    if (normalized.includes('proje')) {
      return { mainCategory: 'PROJE', propertyType: null };
    }

    return { mainCategory: null, propertyType: null };
  }

  private extractTransactionType(normalized: string): string | null {
    if (normalized.includes('gunluk kiralik')) return 'GUNLUK_KIRALIK';
    if (normalized.includes('devren satilik')) return 'DEVREN_SATILIK';
    if (normalized.includes('devren kiralik')) return 'DEVREN_KIRALIK';
    if (normalized.includes('kat karsiligi')) return 'KAT_KARSILIGI';
    if (normalized.includes('satilik') || normalized.includes('satisa')) {
      return 'SATILIK';
    }
    if (normalized.includes('kiralik') || normalized.includes('kiraya')) {
      return 'KIRALIK';
    }

    return null;
  }

  private extractRoomCount(message: string): string | null {
    const match = String(message || '').match(
      /\b(\d{1,2})\s*[_-]?\s*(?:\+|artı|arti)\s*(\d{1,2})\b/i,
    );

    return match ? `${match[1]}+${match[2]}` : null;
  }

  private extractSquareMeter(
    message: string,
    step: string,
  ): number | null {
    const explicit = String(message || '').match(
      /\b(\d{1,6})\s*(m2|m²|metrekare|metre kare)\b/i,
    );
    const plain = step === 'SQUARE_METER' ? this.extractPlainNumber(message) : null;
    const value = explicit ? Number(explicit[1]) : plain;

    return value !== null && value >= 1 && value <= 1_000_000
      ? value
      : null;
  }

  private extractBuildingAge(message: string, step: string): string | null {
    const normalized = this.normalize(message);

    if (normalized.includes('sifir') || normalized.includes('yeni bina')) {
      return '0';
    }

    const explicit = String(message || '').match(/\b(\d{1,3})\s*(yas|yaş)\b/i);
    const plain = step === 'BUILDING_AGE' ? this.extractPlainNumber(message) : null;
    const value = explicit ? Number(explicit[1]) : plain;

    return value !== null && value >= 0 && value <= 500
      ? String(value)
      : null;
  }

  private extractFloor(message: string, step: string): string | null {
    const normalized = this.normalize(message);
    const namedFloors: Array<[string, string]> = [
      ['kot 1', 'Kot -1'],
      ['bodrum', 'Bodrum'],
      ['yari bodrum', 'Yarı Bodrum'],
      ['zemin', 'Zemin Kat'],
      ['yuksek giris', 'Yüksek Giriş'],
      ['giris', 'Giriş Kat'],
      ['bahce', 'Bahçe Katı'],
      ['cati', 'Çatı Katı'],
      ['teras', 'Teras Katı'],
      ['penthouse', 'Penthouse'],
    ];

    for (const [key, label] of namedFloors) {
      if (normalized.includes(key)) return label;
    }

    const explicit = String(message || '').match(/\b(\d{1,3})\.?\s*kat\b/i);
    const plain = step === 'FLOOR' ? this.extractPlainNumber(message) : null;
    const value = explicit ? Number(explicit[1]) : plain;

    return value !== null && value >= 0 && value <= 200
      ? `${value}. Kat`
      : null;
  }

  private extractBuildingFloorCount(
    message: string,
    step: string,
  ): number | null {
    const explicit = String(message || '').match(
      /\b(?:toplam\s*)?(\d{1,3})\s*kat(?:li|lı)?\b/i,
    );
    const plain =
      step === 'BUILDING_FLOOR_COUNT'
        ? this.extractPlainNumber(message)
        : null;
    const value = explicit ? Number(explicit[1]) : plain;

    return value !== null && value >= 1 && value <= 200
      ? value
      : null;
  }

  private extractCurrency(normalized: string): string | null {
    if (
      normalized.includes('turk lirasi') ||
      normalized === 'tl' ||
      normalized === 'try' ||
      normalized.includes('lira')
    ) {
      return 'TRY';
    }
    if (normalized.includes('dolar') || normalized === 'usd') return 'USD';
    if (normalized.includes('euro') || normalized === 'eur') return 'EUR';
    if (normalized.includes('sterlin') || normalized === 'gbp') return 'GBP';

    return null;
  }

  private extractPrice(message: string, step: string): number | null {
    const text = String(message || '').toLocaleLowerCase('tr-TR');
    const million = text.match(/\b(\d+(?:[.,]\d+)?)\s*(milyon|mn)\b/i);

    if (million) {
      const value = Number(million[1].replace(',', '.'));
      return Number.isFinite(value) && value > 0
        ? Math.round(value * 1_000_000)
        : null;
    }

    const explicit = text.match(
      /\b(\d{1,3}(?:[.,]\d{3})+|\d{4,12})\s*(tl|₺|try|usd|dolar|eur|euro|gbp|sterlin)?\b/i,
    );
    const plain = step === 'PRICE' ? this.extractFormattedNumber(text) : null;
    const value = explicit
      ? Number(explicit[1].replace(/[.,]/g, ''))
      : plain;

    return value !== null && value >= 1 ? value : null;
  }

  private extractIdentifier(message: string): string | null {
    const value = String(message || '')
      .trim()
      .replace(/^(ada|parsel|daire|bolum|bölüm|no|numara)\s*[:\-]?\s*/i, '')
      .trim();

    return value && value.length <= 80 ? value : null;
  }

  private extractKnownCity(normalized: string): string | null {
    const match = this.loadCities().find((city) =>
      normalized.includes(city.normalized),
    );

    return match?.name || null;
  }

  private loadCities(): CityRecord[] {
    if (this.cityCache) return this.cityCache;

    const possiblePaths = [
      path.join(
        process.cwd(),
        'src',
        'lina',
        'geo',
        'Lina_Cities_TR_KKTC.json',
      ),
      path.join(
        process.cwd(),
        'backend',
        'src',
        'lina',
        'geo',
        'Lina_Cities_TR_KKTC.json',
      ),
      path.join(__dirname, '..', 'geo', 'Lina_Cities_TR_KKTC.json'),
    ];

    for (const filePath of possiblePaths) {
      try {
        if (!fs.existsSync(filePath)) continue;

        const parsed = JSON.parse(
          fs.readFileSync(filePath, 'utf8'),
        ) as CityDataFile;
        const turkiye = Array.isArray(parsed.turkiye) ? parsed.turkiye : [];
        const kktc = Array.isArray(parsed.kktc) ? parsed.kktc : [];

        this.cityCache = [
          ...turkiye.map((name) => ({
            name,
            normalized: this.normalize(name),
            country: 'TR' as const,
          })),
          ...kktc.map((name) => ({
            name,
            normalized: this.normalize(name),
            country: 'KKTC' as const,
          })),
        ];

        return this.cityCache;
      } catch {
        continue;
      }
    }

    this.cityCache = [];
    return this.cityCache;
  }

  private isLandPortfolio(session: LinaPortfolioSessionContext): boolean {
    const value = `${session.mainCategory} ${session.propertyType}`.toUpperCase();

    return [
      'ARSA',
      'ARAZI',
      'TARLA',
      'BAHCE',
      'BAG',
      'ZEYTINLIK',
      'ADA',
    ].some((word) => value.includes(word));
  }

  private isSkipIntent(normalized: string): boolean {
    return /^(gec|atla|yok|bos birak|istemiyorum)$/.test(normalized);
  }

  private cleanLocationText(value: string): string {
    return String(value || '')
      .replace(/\b(mahallesi|mahalle|mah\.|koyu|köyü|koy|köy|mevkii|mevki)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanFreeText(value: string): string | null {
    const cleaned = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned && cleaned.length <= 150 ? cleaned : null;
  }

  private extractPlainNumber(message: string): number | null {
    const clean = String(message || '').trim();
    if (!/^\d{1,12}$/.test(clean)) return null;

    const value = Number(clean);
    return Number.isFinite(value) ? value : null;
  }

  private extractFormattedNumber(message: string): number | null {
    const clean = String(message || '')
      .trim()
      .replace(/[.\s]/g, '')
      .replace(',', '.');

    if (!/^\d+(?:\.\d+)?$/.test(clean)) return null;

    const value = Number(clean);
    return Number.isFinite(value) ? value : null;
  }

  private formatPrice(value: number | null): string {
    if (!value) return '-';
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  private getCurrencyLabel(currency: string): string {
    const labels: Record<string, string> = {
      TRY: 'Türk Lirası',
      USD: 'Amerikan Doları',
      EUR: 'Euro',
      GBP: 'İngiliz Sterlini',
    };

    return labels[currency] || currency;
  }

  private normalizeEnumValue(value: string): string {
    return this.normalize(value).toUpperCase().replace(/\s+/g, '_');
  }

  private toTitleCase(value: string): string {
    return String(value || '')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((part) => {
        const lower = part.toLocaleLowerCase('tr-TR');
        return `${lower.charAt(0).toLocaleUpperCase('tr-TR')}${lower.slice(1)}`;
      })
      .join(' ');
  }

  private normalize(value: string): string {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
