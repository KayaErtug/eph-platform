import { Injectable } from '@nestjs/common';

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

@Injectable()
export class LinaPortfolioEngineService {
  constructor(
    private readonly linaPortfolioSessionService: LinaPortfolioSessionService,
  ) {}

  async processUserMessage(
    userId: string,
    message: string,
  ): Promise<LinaPortfolioSessionContext> {
    await this.linaPortfolioSessionService.appendUserMessage(userId, message);

    const extractedFields = this.extractFieldsFromMessage(message);

    if (Object.keys(extractedFields).length > 0) {
      return this.linaPortfolioSessionService.updateExtractedFields(
        userId,
        extractedFields,
      );
    }

    return this.linaPortfolioSessionService.getOrCreateActiveSession(userId);
  }

  buildEnginePrompt(session: LinaPortfolioSessionContext): string {
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
      '',
      'Kesin kurallar:',
      '- Kullanıcı daha önce verdiği bilgiyi tekrar sorma.',
      '- Eksik alanlardan yalnızca ilk mantıklı bilgiyi sor.',
      '- Oda sayısı varsa tekrar oda sayısı sorma.',
      '- İşlem türü SATILIK veya KİRALIK ise tekrar satılık mı kiralık mı diye sorma.',
      '- Portföy türü DAİRE ise tekrar daire/villa/arsa diye sorma.',
      '- Konum bilgisi varsa tekrar konum sorma.',
      '- Cevap kısa ve operasyonel olsun.',
    ].join('\n');
  }

  private extractFieldsFromMessage(message: string): ExtractedPortfolioFields {
    const normalized = this.normalize(message);
    const fields: ExtractedPortfolioFields = {};

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

    const simpleNeighborhood = this.extractSimpleNeighborhood(message);
    if (simpleNeighborhood) {
      fields.neighborhood = simpleNeighborhood;
    }

    return fields;
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

    if (!Number.isFinite(value) || value <= 0) {
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

      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private extractKnownCity(normalized: string): string | null {
    if (normalized.includes('denizli')) {
      return 'Denizli';
    }

    if (normalized.includes('istanbul')) {
      return 'İstanbul';
    }

    if (normalized.includes('ankara')) {
      return 'Ankara';
    }

    if (normalized.includes('izmir')) {
      return 'İzmir';
    }

    if (normalized.includes('antalya')) {
      return 'Antalya';
    }

    return null;
  }

  private extractSimpleNeighborhood(message: string): string | null {
    const text = String(message || '').trim();

    const explicitMatch = text.match(
      /\b(?:mahallesi|mah\.|mahalle)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]{3,40})/i,
    );

    if (explicitMatch) {
      return this.cleanLocationText(explicitMatch[1]);
    }

    const deDaMatch = text.match(
      /\b([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]{3,40})['’]?(?:de|da|te|ta)\s+(?:satılık|kiralık|daire|konut|villa|arsa|ilan)/i,
    );

    if (deDaMatch) {
      const value = this.cleanLocationText(deDaMatch[1]);

      if (!this.isBadNeighborhoodCandidate(value)) {
        return value;
      }
    }

    return null;
  }

  private cleanLocationText(value: string): string {
    return String(value || '')
      .replace(/\bdenizli\b/gi, '')
      .replace(/\bistanbul\b/gi, '')
      .replace(/\bankara\b/gi, '')
      .replace(/\bizmir\b/gi, '')
      .replace(/\bantalya\b/gi, '')
      .replace(/\bmerkez\b/gi, '')
      .replace(/\bilce\b/gi, '')
      .replace(/\bilçe\b/gi, '')
      .replace(/\bmahallesi\b/gi, '')
      .replace(/\bmahalle\b/gi, '')
      .replace(/\bmah\.\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
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