import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type LinaPortfolioStep =
  | 'TITLE'
  | 'CITY'
  | 'DISTRICT'
  | 'NEIGHBORHOOD'
  | 'MAIN_CATEGORY'
  | 'SUB_CATEGORY'
  | 'TRANSACTION_TYPE'
  | 'ROOM_COUNT'
  | 'SQUARE_METER'
  | 'BUILDING_AGE'
  | 'FLOOR'
  | 'BUILDING_FLOOR_COUNT'
  | 'ADA_NO'
  | 'PARSEL_NO'
  | 'UNIT_NUMBER'
  | 'CURRENCY'
  | 'PRICE'
  | 'SUMMARY'
  | 'CONFIRMATION'
  | 'CREATED';

export type LinaPortfolioSessionStatus =
  | 'DRAFT'
  | 'READY_FOR_CONFIRMATION'
  | 'CREATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type LinaPortfolioConfirmationStatus =
  | 'WAITING'
  | 'APPROVED'
  | 'REJECTED';

export type LinaPortfolioDraft = {
  title: string | null;
  titleSkipped: boolean;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  mainCategory: string | null;
  propertyType: string | null;
  transactionType: string | null;
  roomCount: string | null;
  squareMeter: number | null;
  buildingAge: string | null;
  floor: string | null;
  buildingFloorCount: number | null;
  adaNo: string | null;
  adaNoSkipped: boolean;
  parselNo: string | null;
  parselNoSkipped: boolean;
  unitNumber: string | null;
  unitNumberSkipped: boolean;
  currency: string;
  currencyConfirmed: boolean;
  price: number | null;
};

export type LinaPortfolioDraftInput = Partial<
  Omit<LinaPortfolioDraft, 'currency'> & {
    currency: string | null;
  }
>;

export type LinaPortfolioSessionState = {
  flowVersion?: string;
  userMessages?: string[];
  assistantMessages?: string[];
  extractedFields?: Record<string, unknown>;
  missingFields?: string[];
  lastUserMessage?: string;
  lastAssistantMessage?: string;
  lastIntent?: string;
  updatedBy?: string;
  createdProjectId?: string;
  createdUnitId?: string;
};

export type LinaPortfolioSessionContext = LinaPortfolioDraft & {
  id: string;
  userId: string;
  mode: string;
  sessionType: string;
  step: LinaPortfolioStep;
  status: string;
  confirmationStatus: string;
  missingFields: string[];
  state: LinaPortfolioSessionState;
  expiresAt: Date | null;
  lastActivityAt: Date;
};

type SessionLike = {
  id: string;
  userId: string;
  mode: string;
  sessionType: string;
  title: string | null;
  propertyType: string | null;
  transactionType: string | null;
  step: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  roomCount: string | null;
  squareMeter: number | null;
  floor: string | null;
  buildingFloorCount: number | null;
  price: number | null;
  currency: string;
  status: string;
  confirmationStatus: string;
  stateJson: Prisma.JsonValue | null;
  lastActivityAt: Date;
  expiresAt: Date | null;
};

@Injectable()
export class LinaPortfolioSessionService {
  private readonly draftLifetimeDays = 15;
  private readonly flowVersion = 'MANUAL_PORTFOLIO_FORM_V1';

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateActiveSession(
    userId: string,
  ): Promise<LinaPortfolioSessionContext> {
    await this.expireOldDrafts(userId);

    const activeSession = await this.prisma.linaPortfolioSession.findFirst({
      where: {
        userId,
        mode: 'PORTFOLIO_CREATE',
        status: {
          in: ['DRAFT', 'READY_FOR_CONFIRMATION'],
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    if (activeSession) {
      const state = this.normalizeState(activeSession.stateJson);

      if (state.flowVersion === this.flowVersion) {
        return this.toContext(activeSession);
      }

      await this.prisma.linaPortfolioSession.update({
        where: { id: activeSession.id },
        data: {
          status: 'CANCELLED',
          lastActivityAt: new Date(),
        },
      });
    }

    return this.createSession(userId);
  }

  async buildSessionPrompt(userId: string): Promise<string> {
    const session = await this.getOrCreateActiveSession(userId);

    return [
      'AKTİF PORTFÖY OLUŞTURMA OTURUMU',
      `Oturum ID: ${session.id}`,
      `Durum: ${session.status}`,
      `Adım: ${session.step}`,
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
      `Eksik alanlar: ${session.missingFields.length ? session.missingFields.join(', ') : 'Yok'}`,
    ].join('\n');
  }

  async appendUserMessage(
    userId: string,
    message: string,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);
    const userMessages = [...(state.userMessages || []), message].slice(-30);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          flowVersion: this.flowVersion,
          userMessages,
          lastUserMessage: message,
          updatedBy: 'user',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async appendAssistantMessage(
    userId: string,
    message: string,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);
    const assistantMessages = [
      ...(state.assistantMessages || []),
      message,
    ].slice(-30);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          flowVersion: this.flowVersion,
          assistantMessages,
          lastAssistantMessage: message,
          updatedBy: 'assistant',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async updateExtractedFields(
    userId: string,
    fields: LinaPortfolioDraftInput,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);
    const currentDraft = this.getDraft(session, state);
    const cleanedFields = this.cleanFields(fields);
    const mergedDraft: LinaPortfolioDraft = {
      ...currentDraft,
      ...cleanedFields,
      currency:
        typeof cleanedFields.currency === 'string'
          ? cleanedFields.currency
          : currentDraft.currency,
    };

    const missingFields = this.getMissingFields(mergedDraft);
    const nextStep = this.getNextStep(missingFields);
    const databaseFields = this.getDatabaseFields(cleanedFields);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: { id: session.id },
      data: {
        ...databaseFields,
        step: nextStep,
        status: missingFields.length ? 'DRAFT' : 'READY_FOR_CONFIRMATION',
        confirmationStatus: missingFields.length
          ? 'WAITING'
          : session.confirmationStatus,
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          flowVersion: this.flowVersion,
          extractedFields: mergedDraft,
          missingFields,
          updatedBy: 'extractor',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async markApproved(
    userId: string,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: { id: session.id },
      data: {
        step: 'CREATED',
        status: 'CREATED',
        confirmationStatus: 'APPROVED',
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          flowVersion: this.flowVersion,
          updatedBy: 'confirmation',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async markRejected(
    userId: string,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: { id: session.id },
      data: {
        status: 'DRAFT',
        confirmationStatus: 'REJECTED',
        step: 'SUMMARY',
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          flowVersion: this.flowVersion,
          updatedBy: 'confirmation',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async cancelActiveSession(userId: string): Promise<void> {
    await this.prisma.linaPortfolioSession.updateMany({
      where: {
        userId,
        mode: 'PORTFOLIO_CREATE',
        status: {
          in: ['DRAFT', 'READY_FOR_CONFIRMATION'],
        },
      },
      data: {
        status: 'CANCELLED',
        lastActivityAt: new Date(),
      },
    });
  }

  private async createSession(
    userId: string,
  ): Promise<LinaPortfolioSessionContext> {
    const now = new Date();
    const draft = this.getEmptyDraft();
    const missingFields = this.getMissingFields(draft);

    const createdSession = await this.prisma.linaPortfolioSession.create({
      data: {
        userId,
        mode: 'PORTFOLIO_CREATE',
        sessionType: 'PORTFOLIO_DRAFT',
        title: null,
        propertyType: null,
        transactionType: null,
        step: this.getNextStep(missingFields),
        city: null,
        district: null,
        neighborhood: null,
        roomCount: null,
        squareMeter: null,
        floor: null,
        buildingFloorCount: null,
        price: null,
        currency: 'TRY',
        status: 'DRAFT',
        confirmationStatus: 'WAITING',
        lastActivityAt: now,
        expiresAt: this.addDays(now, this.draftLifetimeDays),
        stateJson: this.toJson({
          flowVersion: this.flowVersion,
          userMessages: [],
          assistantMessages: [],
          extractedFields: draft,
          missingFields,
          updatedBy: 'system',
        }),
      },
    });

    return this.toContext(createdSession);
  }

  private async expireOldDrafts(userId: string): Promise<void> {
    await this.prisma.linaPortfolioSession.updateMany({
      where: {
        userId,
        mode: 'PORTFOLIO_CREATE',
        status: {
          in: ['DRAFT', 'READY_FOR_CONFIRMATION'],
        },
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
        lastActivityAt: new Date(),
      },
    });
  }

  private toContext(session: SessionLike): LinaPortfolioSessionContext {
    const state = this.normalizeState(session.stateJson);
    const draft = this.getDraft(session, state);
    const missingFields = this.getMissingFields(draft);
    const calculatedStep =
      session.status === 'CREATED'
        ? 'CREATED'
        : session.status === 'READY_FOR_CONFIRMATION'
          ? 'SUMMARY'
          : this.getNextStep(missingFields);

    return {
      id: session.id,
      userId: session.userId,
      mode: session.mode,
      sessionType: session.sessionType,
      ...draft,
      step: calculatedStep,
      status: session.status,
      confirmationStatus: session.confirmationStatus,
      missingFields,
      state: {
        ...state,
        flowVersion: this.flowVersion,
        extractedFields: draft,
        missingFields,
      },
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  private getDraft(
    session: SessionLike | LinaPortfolioSessionContext,
    state: LinaPortfolioSessionState,
  ): LinaPortfolioDraft {
    const saved = this.toRecord(state.extractedFields);

    return {
      title: this.readText(saved.title) ?? session.title ?? null,
      titleSkipped: this.readBoolean(saved.titleSkipped),
      city: this.readText(saved.city) ?? session.city ?? null,
      district: this.readText(saved.district) ?? session.district ?? null,
      neighborhood:
        this.readText(saved.neighborhood) ?? session.neighborhood ?? null,
      mainCategory: this.readText(saved.mainCategory),
      propertyType:
        this.readText(saved.propertyType) ?? session.propertyType ?? null,
      transactionType:
        this.readText(saved.transactionType) ??
        session.transactionType ??
        null,
      roomCount: this.readText(saved.roomCount) ?? session.roomCount ?? null,
      squareMeter:
        this.readNumber(saved.squareMeter) ?? session.squareMeter ?? null,
      buildingAge: this.readText(saved.buildingAge),
      floor: this.readText(saved.floor) ?? session.floor ?? null,
      buildingFloorCount:
        this.readNumber(saved.buildingFloorCount) ??
        session.buildingFloorCount ??
        null,
      adaNo: this.readText(saved.adaNo),
      adaNoSkipped: this.readBoolean(saved.adaNoSkipped),
      parselNo: this.readText(saved.parselNo),
      parselNoSkipped: this.readBoolean(saved.parselNoSkipped),
      unitNumber: this.readText(saved.unitNumber),
      unitNumberSkipped: this.readBoolean(saved.unitNumberSkipped),
      currency:
        this.readText(saved.currency) ?? session.currency ?? 'TRY',
      currencyConfirmed: this.readBoolean(saved.currencyConfirmed),
      price: this.readNumber(saved.price) ?? session.price ?? null,
    };
  }

  private getEmptyDraft(): LinaPortfolioDraft {
    return {
      title: null,
      titleSkipped: false,
      city: null,
      district: null,
      neighborhood: null,
      mainCategory: null,
      propertyType: null,
      transactionType: null,
      roomCount: null,
      squareMeter: null,
      buildingAge: null,
      floor: null,
      buildingFloorCount: null,
      adaNo: null,
      adaNoSkipped: false,
      parselNo: null,
      parselNoSkipped: false,
      unitNumber: null,
      unitNumberSkipped: false,
      currency: 'TRY',
      currencyConfirmed: false,
      price: null,
    };
  }

  private getMissingFields(draft: LinaPortfolioDraft): string[] {
    const missing: string[] = [];

    if (!draft.title && !draft.titleSkipped) missing.push('Portföy Adı');
    if (!draft.city) missing.push('Şehir');
    if (!draft.district) missing.push('İlçe');
    if (!draft.neighborhood) missing.push('Mahalle / Köy / Mevki');
    if (!draft.mainCategory) missing.push('Mülk Tipi');
    if (!draft.propertyType) missing.push('Alt Kategori');
    if (!draft.transactionType) missing.push('Durum');
    if (this.requiresRoomCount(draft) && !draft.roomCount) {
      missing.push('Oda Sayısı');
    }
    if (!draft.squareMeter) missing.push('Alan');
    if (this.requiresBuildingDetails(draft) && !draft.buildingAge) {
      missing.push('Bina Yaşı');
    }
    if (this.requiresBuildingDetails(draft) && !draft.floor) {
      missing.push('Bulunduğu Kat');
    }
    if (
      this.requiresBuildingDetails(draft) &&
      !draft.buildingFloorCount
    ) {
      missing.push('Toplam Kat Sayısı');
    }
    if (!draft.adaNo && !draft.adaNoSkipped) missing.push('Ada No');
    if (!draft.parselNo && !draft.parselNoSkipped) {
      missing.push('Parsel No');
    }
    if (!draft.unitNumber && !draft.unitNumberSkipped) {
      missing.push('Daire / Bölüm No');
    }
    if (!draft.currencyConfirmed) missing.push('Para Birimi');
    if (!draft.price) missing.push('Fiyat');

    return missing;
  }

  private getNextStep(missingFields: string[]): LinaPortfolioStep {
    const order: Array<[string, LinaPortfolioStep]> = [
      ['Portföy Adı', 'TITLE'],
      ['Şehir', 'CITY'],
      ['İlçe', 'DISTRICT'],
      ['Mahalle / Köy / Mevki', 'NEIGHBORHOOD'],
      ['Mülk Tipi', 'MAIN_CATEGORY'],
      ['Alt Kategori', 'SUB_CATEGORY'],
      ['Durum', 'TRANSACTION_TYPE'],
      ['Oda Sayısı', 'ROOM_COUNT'],
      ['Alan', 'SQUARE_METER'],
      ['Bina Yaşı', 'BUILDING_AGE'],
      ['Bulunduğu Kat', 'FLOOR'],
      ['Toplam Kat Sayısı', 'BUILDING_FLOOR_COUNT'],
      ['Ada No', 'ADA_NO'],
      ['Parsel No', 'PARSEL_NO'],
      ['Daire / Bölüm No', 'UNIT_NUMBER'],
      ['Para Birimi', 'CURRENCY'],
      ['Fiyat', 'PRICE'],
    ];

    for (const [field, step] of order) {
      if (missingFields.includes(field)) return step;
    }

    return 'SUMMARY';
  }

  private requiresRoomCount(draft: LinaPortfolioDraft): boolean {
    const type = String(draft.propertyType || '').toUpperCase();

    return [
      'DAIRE',
      'VILLA',
      'REZIDANS',
      'MUSTAK_EV',
      'YAZLIK',
      'PENTHOUSE',
      'LOFT',
      'OFIS_BURO',
      'HOME_OFFICE',
    ].some((value) => type.includes(value));
  }

  private requiresBuildingDetails(draft: LinaPortfolioDraft): boolean {
    const category = String(draft.mainCategory || '').toUpperCase();
    const type = String(draft.propertyType || '').toUpperCase();

    return ![
      'ARSA_ARAZI',
      'ARSA',
      'TARLA',
      'BAHCE',
      'BAG',
      'ZEYTINLIK',
      'ADA',
      'ORMAN_ARAZISI',
    ].some((value) => category.includes(value) || type.includes(value));
  }

  private cleanFields(
    fields: LinaPortfolioDraftInput,
  ): LinaPortfolioDraftInput {
    const cleaned: LinaPortfolioDraftInput = {};

    const textKeys: Array<
      keyof Pick<
        LinaPortfolioDraft,
        | 'title'
        | 'city'
        | 'district'
        | 'neighborhood'
        | 'mainCategory'
        | 'propertyType'
        | 'transactionType'
        | 'roomCount'
        | 'buildingAge'
        | 'floor'
        | 'adaNo'
        | 'parselNo'
        | 'unitNumber'
      >
    > = [
      'title',
      'city',
      'district',
      'neighborhood',
      'mainCategory',
      'propertyType',
      'transactionType',
      'roomCount',
      'buildingAge',
      'floor',
      'adaNo',
      'parselNo',
      'unitNumber',
    ];

    for (const key of textKeys) {
      if (fields[key] !== undefined) {
        (cleaned as Record<string, unknown>)[key] = this.cleanText(
          fields[key] as string | null | undefined,
        );
      }
    }

    const booleanKeys: Array<
      keyof Pick<
        LinaPortfolioDraft,
        | 'titleSkipped'
        | 'adaNoSkipped'
        | 'parselNoSkipped'
        | 'unitNumberSkipped'
        | 'currencyConfirmed'
      >
    > = [
      'titleSkipped',
      'adaNoSkipped',
      'parselNoSkipped',
      'unitNumberSkipped',
      'currencyConfirmed',
    ];

    for (const key of booleanKeys) {
      if (fields[key] !== undefined) {
        (cleaned as Record<string, unknown>)[key] = Boolean(fields[key]);
      }
    }

    if (fields.squareMeter !== undefined) {
      cleaned.squareMeter = this.cleanNumber(fields.squareMeter);
    }
    if (fields.buildingFloorCount !== undefined) {
      cleaned.buildingFloorCount = this.cleanInteger(
        fields.buildingFloorCount,
      );
    }
    if (fields.price !== undefined) {
      cleaned.price = this.cleanNumber(fields.price);
    }
    if (fields.currency !== undefined) {
      cleaned.currency = this.cleanText(fields.currency);
    }

    return cleaned;
  }

  private getDatabaseFields(fields: LinaPortfolioDraftInput) {
    return {
      title: fields.title,
      propertyType: fields.propertyType,
      transactionType: fields.transactionType,
      city: fields.city,
      district: fields.district,
      neighborhood: fields.neighborhood,
      roomCount: fields.roomCount,
      squareMeter: fields.squareMeter,
      floor: fields.floor,
      buildingFloorCount: fields.buildingFloorCount,
      price: fields.price,
      currency:
        typeof fields.currency === 'string' ? fields.currency : undefined,
    };
  }

  private cleanText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const cleaned = String(value).trim();
    return cleaned.length ? cleaned : null;
  }

  private cleanNumber(
    value: number | null | undefined,
  ): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : null;
  }

  private cleanInteger(
    value: number | null | undefined,
  ): number | null | undefined {
    const numberValue = this.cleanNumber(value);
    return numberValue === undefined || numberValue === null
      ? numberValue
      : Math.round(numberValue);
  }

  private normalizeState(
    value: Prisma.JsonValue | LinaPortfolioSessionState | null,
  ): LinaPortfolioSessionState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as LinaPortfolioSessionState;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private readText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned || null;
  }

  private readNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : null;
  }

  private readBoolean(value: unknown): boolean {
    return value === true;
  }

  private toJson(
    value: LinaPortfolioSessionState,
  ): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }
}
