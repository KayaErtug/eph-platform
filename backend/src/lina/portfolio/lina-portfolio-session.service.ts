import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type LinaPortfolioStep =
  | 'TRANSACTION_TYPE'
  | 'LOCATION'
  | 'ROOM_AND_SIZE'
  | 'FLOOR_INFO'
  | 'PRICE'
  | 'SUMMARY'
  | 'CONFIRMATION'
  | 'CREATED';

export type LinaPortfolioSessionStatus = 'DRAFT' | 'READY_FOR_CONFIRMATION' | 'CREATED' | 'EXPIRED' | 'CANCELLED';

export type LinaPortfolioConfirmationStatus = 'WAITING' | 'APPROVED' | 'REJECTED';

export type LinaPortfolioSessionState = {
  userMessages?: string[];
  assistantMessages?: string[];
  extractedFields?: Record<string, unknown>;
  missingFields?: string[];
  lastUserMessage?: string;
  lastAssistantMessage?: string;
  lastIntent?: string;
  updatedBy?: string;
};

export type LinaPortfolioSessionContext = {
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

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateActiveSession(userId: string): Promise<LinaPortfolioSessionContext> {
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
      return this.toContext(activeSession);
    }

    const now = new Date();

    const createdSession = await this.prisma.linaPortfolioSession.create({
      data: {
        userId,
        mode: 'PORTFOLIO_CREATE',
        sessionType: 'PORTFOLIO_DRAFT',
        propertyType: null,
        transactionType: null,
        step: 'TRANSACTION_TYPE',
        status: 'DRAFT',
        confirmationStatus: 'WAITING',
        currency: 'TRY',
        lastActivityAt: now,
        expiresAt: this.addDays(now, this.draftLifetimeDays),
        stateJson: this.toJson({
          userMessages: [],
          assistantMessages: [],
          extractedFields: {},
          missingFields: this.getMissingFields({
            transactionType: null,
            city: null,
            district: null,
            neighborhood: null,
            roomCount: null,
            squareMeter: null,
            floor: null,
            buildingFloorCount: null,
            price: null,
          }),
          updatedBy: 'system',
        }),
      },
    });

    return this.toContext(createdSession);
  }

  async buildSessionPrompt(userId: string): Promise<string> {
    const session = await this.getOrCreateActiveSession(userId);

    return [
      'AKTİF PORTFÖY OLUŞTURMA OTURUMU',
      `Oturum ID: ${session.id}`,
      `Durum: ${session.status}`,
      `Adım: ${session.step}`,
      `Gayrimenkul türü: ${session.propertyType || 'Henüz net değil'}`,
      `İşlem türü: ${session.transactionType || 'Eksik'}`,
      `İl: ${session.city || 'Eksik'}`,
      `İlçe: ${session.district || 'Eksik'}`,
      `Mahalle: ${session.neighborhood || 'Eksik'}`,
      `Oda sayısı: ${session.roomCount || 'Eksik'}`,
      `Metrekare: ${session.squareMeter ?? 'Eksik'}`,
      `Bulunduğu kat: ${session.floor || 'Eksik'}`,
      `Bina kat sayısı: ${session.buildingFloorCount ?? 'Eksik'}`,
      `Fiyat: ${session.price ?? 'Eksik'} ${session.currency}`,
      `Eksik alanlar: ${session.missingFields.length ? session.missingFields.join(', ') : 'Yok'}`,
      '',
      'Lina bu oturumdaki bilgileri tekrar sormaz.',
      'Lina yalnızca eksik veya teyit gerektiren bilgiyi sorar.',
      'Fiyat mutlaka net teyit edilmeden ilan oluşturulmaz.',
      'Kullanıcı onay vermeden gerçek ilan oluşturulmaz.',
    ].join('\n');
  }

  async appendUserMessage(userId: string, message: string): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const userMessages = [...(state.userMessages || []), message].slice(-20);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: {
        id: session.id,
      },
      data: {
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          userMessages,
          lastUserMessage: message,
          updatedBy: 'user',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async appendAssistantMessage(userId: string, message: string): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const assistantMessages = [...(state.assistantMessages || []), message].slice(-20);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: {
        id: session.id,
      },
      data: {
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
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
    fields: Partial<{
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
    }>,
  ): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const nextFields = this.cleanFields(fields);

    const mergedForMissingCheck = {
      transactionType: nextFields.transactionType ?? session.transactionType,
      city: nextFields.city ?? session.city,
      district: nextFields.district ?? session.district,
      neighborhood: nextFields.neighborhood ?? session.neighborhood,
      roomCount: nextFields.roomCount ?? session.roomCount,
      squareMeter: nextFields.squareMeter ?? session.squareMeter,
      floor: nextFields.floor ?? session.floor,
      buildingFloorCount: nextFields.buildingFloorCount ?? session.buildingFloorCount,
      price: nextFields.price ?? session.price,
    };

    const missingFields = this.getMissingFields(mergedForMissingCheck);
    const nextStep = this.getNextStep(missingFields);

    const state = this.normalizeState(session.state);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: {
        id: session.id,
      },
      data: {
        ...nextFields,
        step: nextStep,
        status: missingFields.length ? 'DRAFT' : 'READY_FOR_CONFIRMATION',
        confirmationStatus: missingFields.length ? 'WAITING' : session.confirmationStatus,
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          extractedFields: {
            ...(state.extractedFields || {}),
            ...nextFields,
          },
          missingFields,
          updatedBy: 'extractor',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async markApproved(userId: string): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: {
        id: session.id,
      },
      data: {
        step: 'CREATED',
        status: 'CREATED',
        confirmationStatus: 'APPROVED',
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
          updatedBy: 'confirmation',
        }),
      },
    });

    return this.toContext(updatedSession);
  }

  async markRejected(userId: string): Promise<LinaPortfolioSessionContext> {
    const session = await this.getOrCreateActiveSession(userId);
    const state = this.normalizeState(session.state);

    const updatedSession = await this.prisma.linaPortfolioSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: 'DRAFT',
        confirmationStatus: 'REJECTED',
        step: 'SUMMARY',
        lastActivityAt: new Date(),
        stateJson: this.toJson({
          ...state,
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
    const missingFields = this.getMissingFields({
      transactionType: session.transactionType,
      city: session.city,
      district: session.district,
      neighborhood: session.neighborhood,
      roomCount: session.roomCount,
      squareMeter: session.squareMeter,
      floor: session.floor,
      buildingFloorCount: session.buildingFloorCount,
      price: session.price,
    });

    return {
      id: session.id,
      userId: session.userId,
      mode: session.mode,
      sessionType: session.sessionType,
      title: session.title,
      propertyType: session.propertyType,
      transactionType: session.transactionType,
      step: session.step,
      city: session.city,
      district: session.district,
      neighborhood: session.neighborhood,
      roomCount: session.roomCount,
      squareMeter: session.squareMeter,
      floor: session.floor,
      buildingFloorCount: session.buildingFloorCount,
      price: session.price,
      currency: session.currency,
      status: session.status,
      confirmationStatus: session.confirmationStatus,
      missingFields,
      state: {
        ...state,
        missingFields,
      },
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  private getMissingFields(fields: {
    transactionType: string | null;
    city: string | null;
    district: string | null;
    neighborhood: string | null;
    roomCount: string | null;
    squareMeter: number | null;
    floor: string | null;
    buildingFloorCount: number | null;
    price: number | null;
  }): string[] {
    const missingFields: string[] = [];

    if (!fields.transactionType) {
      missingFields.push('İşlem Türü');
    }

    if (!fields.city) {
      missingFields.push('İl');
    }

    if (!fields.district) {
      missingFields.push('İlçe');
    }

    if (!fields.neighborhood) {
      missingFields.push('Mahalle');
    }

    if (!fields.roomCount) {
      missingFields.push('Oda Sayısı');
    }

    if (!fields.squareMeter) {
      missingFields.push('Metrekare');
    }

    if (!fields.floor) {
      missingFields.push('Bulunduğu Kat');
    }

    if (!fields.buildingFloorCount) {
      missingFields.push('Bina Kat Sayısı');
    }

    if (!fields.price) {
      missingFields.push('Fiyat');
    }

    return missingFields;
  }

  private getNextStep(missingFields: string[]): LinaPortfolioStep {
    if (!missingFields.length) {
      return 'SUMMARY';
    }

    if (missingFields.includes('İşlem Türü')) {
      return 'TRANSACTION_TYPE';
    }

    if (missingFields.includes('İl') || missingFields.includes('İlçe') || missingFields.includes('Mahalle')) {
      return 'LOCATION';
    }

    if (missingFields.includes('Oda Sayısı') || missingFields.includes('Metrekare')) {
      return 'ROOM_AND_SIZE';
    }

    if (missingFields.includes('Bulunduğu Kat') || missingFields.includes('Bina Kat Sayısı')) {
      return 'FLOOR_INFO';
    }

    if (missingFields.includes('Fiyat')) {
      return 'PRICE';
    }

    return 'SUMMARY';
  }

  private cleanFields(
    fields: Partial<{
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
    }>,
  ) {
    return {
      title: this.cleanText(fields.title),
      propertyType: this.cleanText(fields.propertyType),
      transactionType: this.cleanText(fields.transactionType),
      city: this.cleanText(fields.city),
      district: this.cleanText(fields.district),
      neighborhood: this.cleanText(fields.neighborhood),
      roomCount: this.cleanText(fields.roomCount),
      squareMeter: this.cleanNumber(fields.squareMeter),
      floor: this.cleanText(fields.floor),
      buildingFloorCount: this.cleanInteger(fields.buildingFloorCount),
      price: this.cleanNumber(fields.price),
      currency: this.cleanText(fields.currency) || undefined,
    };
  }

  private cleanText(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const cleaned = String(value).trim();

    return cleaned.length ? cleaned : null;
  }

  private cleanNumber(value: number | null | undefined): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return null;
    }

    return numberValue;
  }

  private cleanInteger(value: number | null | undefined): number | null | undefined {
    const numberValue = this.cleanNumber(value);

    if (numberValue === undefined || numberValue === null) {
      return numberValue;
    }

    return Math.round(numberValue);
  }

  private normalizeState(value: Prisma.JsonValue | LinaPortfolioSessionState | null): LinaPortfolioSessionState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as LinaPortfolioSessionState;
  }

  private toJson(value: LinaPortfolioSessionState): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;
  }
}