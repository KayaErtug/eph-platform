import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import {
  LinaPortfolioSessionContext,
  LinaPortfolioSessionService,
} from './lina-portfolio-session.service';

type ExtractedPortfolioFields = Partial<{
  title: string | null;
  propertyType: string | null;
  transactionType: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  roomCount: string | null;
  squareMeter: number | null;
  floor: string | null;
  buildingFloorCount: number | null;
  price: number | null;
  currency: string | null;
}>;

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

    const extractedFields = this.extractFieldsFromMessage(message, currentSession);

    if (Object.keys(extractedFields).length > 0) {
      return this.linaPortfolioSessionService.updateExtractedFields(
        userId,
        extractedFields,
      );
    }

    return this.linaPortfolioSessionService.getOrCreateActiveSession(userId);
  }

  buildEnginePrompt(session: LinaPortfolioSessionContext): string {
    const nextQuestion = this.getNextQuestion(session);
    const hasStarted = this.hasMeaningfulPortfolioStart(session);

    return [
      'LINA PORTFÖY V5 ENGINE',
      'Kararı backend verir. Lina yalnızca kullanıcıya doğal ve kısa cevap yazar.',
      '',
      `Portföy türü: ${session.propertyType || 'Eksik'}`,
      `İşlem türü: ${session.transactionType || 'Eksik'}`,
      `İl: ${session.city || 'Eksik'}`,
      `İlçe: ${session.district || 'Eksik'}`,
      `Mahalle: ${session.neighborhood || 'Eksik'}`,
      `Oda sayısı: ${session.roomCount || 'Eksik'}`,
      `Metrekare: ${session.squareMeter ?? 'Eksik'}`,
      `Bulunduğu kat: ${session.floor || 'Eksik'}`,
      `Bina kat sayısı: ${session.buildingFloorCount ?? 'Eksik'}`,
      `Fiyat: ${session.price ?? 'Eksik'} ${session.currency}`,
      `Sıradaki adım: ${session.step}`,
      `Eksik alanlar: ${session.missingFields.length ? session.missingFields.join(', ') : 'Yok'}`,
      `Engine tarafından önerilen tek soru: ${nextQuestion}`,
      '',
      'İnsansı tepki kuralı:',
      hasStarted
        ? '- Bu oturum zaten başladıysa gereksiz “Elbette/Tabii” girişini tekrar etme. Kayıt cümlesi + tek soru ile ilerle.'
        : '- Bu yeni portföy akışının ilk cevabıysa kısa ve doğal kabul cümlesiyle başla. Örnek: “Elbette Tamer Bey. Daire ilanını oluşturmaya başlıyorum.”',
      '',
      'Kesin kurallar:',
      '- Kullanıcı daha önce verdiği bilgiyi tekrar sorma.',
      '- Eksik alanlardan yalnızca Engine tarafından önerilen tek soruyu sor.',
      '- Oda sayısı varsa tekrar oda sayısı sorma.',
      '- İşlem türü SATILIK veya KIRALIK ise tekrar satılık mı kiralık mı diye sorma.',
      '- Portföy türü DAIRE ise tekrar daire/villa/arsa diye sorma.',
      '- Konum bilgisi varsa tekrar konum sorma.',
      '- Kullanıcı il, ilçe veya mahalle bilgisi verdiyse “kaydetmemi ister misiniz?” diye sorma; engine kaydettiyse direkt kaydettiğini söyle.',
      '- Kullanıcı beklenen alan için kısa sayı verdiyse ve Engine kaydettiyse o bilgiyi sahiplen.',
      '- Cevap kısa, sıcak ve operasyonel olsun.',
    ].join('\n');
  }

  private getNextQuestion(session: LinaPortfolioSessionContext): string {
    const missing = session.missingFields || [];

    if (missing.includes('İşlem Türü')) {
      return 'İşlem türü satılık mı, kiralık mı olacak?';
    }

    if (missing.includes('İl')) {
      return 'İlan hangi ilde?';
    }

    if (missing.includes('İlçe')) {
      return 'İlçe bilgisini paylaşır mısınız?';
    }

    if (missing.includes('Mahalle')) {
      return 'Mahalle bilgisini paylaşır mısınız?';
    }

    if (missing.includes('Oda Sayısı')) {
      return 'Oda sayısı nedir?';
    }

    if (missing.includes('Metrekare')) {
      return 'Metrekare bilgisini paylaşır mısınız?';
    }

    if (missing.includes('Bulunduğu Kat')) {
      return 'Daire kaçıncı katta?';
    }

    if (missing.includes('Bina Kat Sayısı')) {
      return 'Bina toplam kaç katlı?';
    }

    if (missing.includes('Fiyat')) {
      return 'Satış fiyatını paylaşır mısınız?';
    }

    return 'Bilgiler tamamlandı. Onaylıyor musunuz?';
  }

  private hasMeaningfulPortfolioStart(session: LinaPortfolioSessionContext): boolean {
    const state = session.state || {};
    const userMessageCount = state.userMessages?.length || 0;

    return userMessageCount > 1;
  }

  private extractFieldsFromMessage(
    message: string,
    session: LinaPortfolioSessionContext,
  ): ExtractedPortfolioFields {
    const normalized = this.normalize(message);
    const fields: ExtractedPortfolioFields = {};
    const expectedField = this.getExpectedField(session);
    const plainNumber = this.extractPlainNumber(message);

    Object.assign(
      fields,
      this.extractContextAwareNumber(plainNumber, expectedField),
    );

    Object.assign(
      fields,
      this.extractContextAwareLocation(message, expectedField),
    );

    const transactionType = this.extractTransactionType(normalized);
    if (transactionType) {
      fields.transactionType = transactionType;
    }

    const propertyType = this.extractPropertyType(normalized);
    if (propertyType) {
      fields.propertyType = propertyType;
    }

    const roomCount = this.extractRoomCount(message);
    if (roomCount) {
      fields.roomCount = roomCount;
    }

    const squareMeter = this.extractSquareMeter(message);
    if (squareMeter) {
      fields.squareMeter = squareMeter;
    }

    const floorInfo = this.extractFloorInfo(message);
    if (floorInfo.floor) {
      fields.floor = floorInfo.floor;
    }

    if (floorInfo.buildingFloorCount) {
      fields.buildingFloorCount = floorInfo.buildingFloorCount;
    }

    const price = this.extractPrice(message);
    if (price) {
      fields.price = price;
      fields.currency = 'TRY';
    }

    const city = this.extractKnownCity(normalized);
    if (city) {
      fields.city = city;
    }

    const simpleNeighborhood = this.extractSimpleNeighborhood(message, fields.city || session.city);
    if (simpleNeighborhood) {
      fields.neighborhood = simpleNeighborhood;
    }

    return fields;
  }

  private getExpectedField(session: LinaPortfolioSessionContext): string | null {
    const missing = session.missingFields || [];

    if (missing.includes('İşlem Türü')) {
      return 'transactionType';
    }

    if (missing.includes('İl')) {
      return 'city';
    }

    if (missing.includes('İlçe')) {
      return 'district';
    }

    if (missing.includes('Mahalle')) {
      return 'neighborhood';
    }

    if (missing.includes('Oda Sayısı')) {
      return 'roomCount';
    }

    if (missing.includes('Metrekare')) {
      return 'squareMeter';
    }

    if (missing.includes('Bulunduğu Kat')) {
      return 'floor';
    }

    if (missing.includes('Bina Kat Sayısı')) {
      return 'buildingFloorCount';
    }

    if (missing.includes('Fiyat')) {
      return 'price';
    }

    return null;
  }

  private extractContextAwareNumber(
    plainNumber: number | null,
    expectedField: string | null,
  ): ExtractedPortfolioFields {
    if (plainNumber === null || !expectedField) {
      return {};
    }

    if (expectedField === 'squareMeter' && this.isReasonableSquareMeter(plainNumber)) {
      return {
        squareMeter: plainNumber,
      };
    }

    if (expectedField === 'buildingFloorCount' && this.isReasonableBuildingFloorCount(plainNumber)) {
      return {
        buildingFloorCount: plainNumber,
      };
    }

    if (expectedField === 'floor' && this.isReasonableFloor(plainNumber)) {
      return {
        floor: String(plainNumber),
      };
    }

    if (expectedField === 'price' && this.isReasonablePrice(plainNumber)) {
      return {
        price: plainNumber,
        currency: 'TRY',
      };
    }

    return {};
  }

  private extractContextAwareLocation(
    message: string,
    expectedField: string | null,
  ): ExtractedPortfolioFields {
    const clean = this.cleanLocationText(message, null);

    if (!clean || clean.length < 2) {
      return {};
    }

    if (expectedField === 'city') {
      const city = this.extractKnownCity(this.normalize(message));

      return city ? { city } : {};
    }

    if (expectedField === 'district') {
      return {
        district: this.toTitleCase(clean),
      };
    }

    if (expectedField === 'neighborhood') {
      return {
        neighborhood: this.toTitleCase(clean),
      };
    }

    return {};
  }

  private extractPlainNumber(message: string): number | null {
    const clean = String(message || '').trim();

    if (!/^\d{1,12}$/.test(clean)) {
      return null;
    }

    const value = Number(clean);

    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private isReasonableSquareMeter(value: number): boolean {
    return value >= 10 && value <= 50000;
  }

  private isReasonableBuildingFloorCount(value: number): boolean {
    return value >= 1 && value <= 100;
  }

  private isReasonableFloor(value: number): boolean {
    return value >= -10 && value <= 100;
  }

  private isReasonablePrice(value: number): boolean {
    return value >= 1000 && value <= 10_000_000_000;
  }

  private extractTransactionType(normalized: string): string | null {
    if (normalized.includes('satilik') || normalized.includes('satisa')) {
      return 'SATILIK';
    }

    if (normalized.includes('kiralik') || normalized.includes('kiraya')) {
      return 'KIRALIK';
    }

    return null;
  }

  private extractPropertyType(normalized: string): string | null {
    if (normalized.includes('daire') || normalized.includes('apartman')) {
      return 'DAIRE';
    }

    if (normalized.includes('villa')) {
      return 'VILLA';
    }

    if (normalized.includes('arsa')) {
      return 'ARSA';
    }

    if (normalized.includes('tarla')) {
      return 'TARLA';
    }

    if (
      normalized.includes('dukkan') ||
      normalized.includes('isyeri') ||
      normalized.includes('is yeri') ||
      normalized.includes('ofis')
    ) {
      return 'IS_YERI';
    }

    return null;
  }

  private extractRoomCount(message: string): string | null {
    const match = String(message || '').match(/\b(\d{1,2})\s*(?:\.|,)?\s*(?:\+|artı)\s*(\d{1,2})\b/i);

    if (!match) {
      return null;
    }

    return `${match[1]}+${match[2]}`;
  }

  private extractSquareMeter(message: string): number | null {
    const match = String(message || '').match(
      /\b(\d{2,5})\s*(m2|m²|metrekare|metre kare|metre)\b/i,
    );

    if (!match) {
      return null;
    }

    const value = Number(match[1]);

    if (!Number.isFinite(value) || !this.isReasonableSquareMeter(value)) {
      return null;
    }

    return value;
  }

  private extractFloorInfo(message: string): {
    floor: string | null;
    buildingFloorCount: number | null;
  } {
    const text = String(message || '');

    const buildingAndFloor = text.match(
      /\b(\d{1,2})\s*katlı\s*binanın\s*(\d{1,2})\.?\s*katı\b/i,
    );

    if (buildingAndFloor) {
      return {
        buildingFloorCount: Number(buildingAndFloor[1]),
        floor: buildingAndFloor[2],
      };
    }

    const floorOnly = text.match(/\b(\d{1,2})\.?\s*kat\b/i);

    if (floorOnly) {
      return {
        buildingFloorCount: null,
        floor: floorOnly[1],
      };
    }

    const groundFloor = this.normalize(text);

    if (groundFloor.includes('zemin kat')) {
      return {
        buildingFloorCount: null,
        floor: 'Zemin',
      };
    }

    if (groundFloor.includes('giris kat') || groundFloor.includes('giriş kat')) {
      return {
        buildingFloorCount: null,
        floor: 'Giriş',
      };
    }

    return {
      floor: null,
      buildingFloorCount: null,
    };
  }

  private extractPrice(message: string): number | null {
    const text = String(message || '').toLocaleLowerCase('tr-TR');

    const millionMatch = text.match(
      /\b(\d+(?:[.,]\d+)?)\s*(milyon|mn|m)\b/i,
    );

    if (millionMatch) {
      const value = Number(millionMatch[1].replace(',', '.'));

      if (Number.isFinite(value) && value > 0) {
        return Math.round(value * 1_000_000);
      }
    }

    const moneyMatch = text.match(
      /\b(\d{1,3}(?:[.,]\d{3})+|\d{6,12})\s*(tl|₺|try|lira)?\b/i,
    );

    if (moneyMatch) {
      const value = Number(moneyMatch[1].replace(/[.,]/g, ''));

      if (Number.isFinite(value) && this.isReasonablePrice(value)) {
        return value;
      }
    }

    return null;
  }

  private extractKnownCity(normalized: string): string | null {
    const cities = this.loadCities();
    const match = cities.find((city) =>
      normalized.includes(city.normalized),
    );

    return match?.name || null;
  }

  private extractSimpleNeighborhood(message: string, city?: string | null): string | null {
    const text = String(message || '').trim();

    const explicitMatch = text.match(
      /\b(?:mahallesi|mah\.|mahalle)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]{3,40})/i,
    );

    if (explicitMatch) {
      return this.cleanLocationText(explicitMatch[1], city);
    }

    const deDaMatch = text.match(
      /\b([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]{3,40})['’]?(?:de|da|te|ta)\s+(?:satılık|kiralık|daire|konut|villa|arsa|ilan)/i,
    );

    if (deDaMatch) {
      const value = this.cleanLocationText(deDaMatch[1], city);

      if (!this.isBadNeighborhoodCandidate(value)) {
        return this.toTitleCase(value);
      }
    }

    return null;
  }

  private cleanLocationText(value: string, city?: string | null): string {
    let cleaned = String(value || '')
      .replace(/\bmerkez\b/gi, '')
      .replace(/\bilce\b/gi, '')
      .replace(/\bilçe\b/gi, '')
      .replace(/\bmahallesi\b/gi, '')
      .replace(/\bmahalle\b/gi, '')
      .replace(/\bmah\.\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const cities = city
      ? this.loadCities().filter((item) => item.name === city)
      : this.loadCities();

    for (const cityItem of cities) {
      cleaned = cleaned
        .replace(new RegExp(`\\b${this.escapeRegExp(cityItem.name)}\\b`, 'gi'), '')
        .replace(new RegExp(`\\b${this.escapeRegExp(cityItem.normalized)}\\b`, 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return cleaned;
  }

  private isBadNeighborhoodCandidate(value: string): boolean {
    const normalized = this.normalize(value);

    if (!normalized || normalized.length < 3) {
      return true;
    }

    const badWords = [
      'satilik',
      'kiralik',
      'daire',
      'konut',
      'villa',
      'arsa',
      'ilan',
      'girelim',
      'ekleyelim',
      'olusturalim',
    ];

    return badWords.includes(normalized);
  }

  private loadCities(): CityRecord[] {
    if (this.cityCache) {
      return this.cityCache;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'src', 'lina', 'geo', 'Lina_Cities_TR_KKTC.json'),
      path.join(process.cwd(), 'backend', 'src', 'lina', 'geo', 'Lina_Cities_TR_KKTC.json'),
      path.join(__dirname, '..', 'geo', 'Lina_Cities_TR_KKTC.json'),
      path.join(__dirname, '..', '..', 'src', 'lina', 'geo', 'Lina_Cities_TR_KKTC.json'),
    ];

    for (const filePath of possiblePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CityDataFile;

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

  private escapeRegExp(value: string): string {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
