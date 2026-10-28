import { PrismaService } from '../../prisma/prisma.service';
import {
  LinaPortfolioSessionContext,
  LinaPortfolioSessionService,
  LinaPortfolioValidationState,
} from './lina-portfolio-session.service';

type PrismaUpdateInput = {
  where: {
    id: string;
  };
  data: Record<string, unknown>;
};

type PrismaMock = {
  linaPortfolioSession: {
    update: jest.Mock;
  };
};

describe('LinaPortfolioSessionService validation state', () => {
  function createSession(
    overrides: Partial<LinaPortfolioSessionContext> = {},
  ): LinaPortfolioSessionContext {
    return {
      id: 'lina-session-1',
      userId: 'user-1',
      mode: 'PORTFOLIO_CREATE',
      sessionType: 'PORTFOLIO_DRAFT',
      step: 'SUMMARY',
      status: 'READY_FOR_CONFIRMATION',
      confirmationStatus: 'WAITING',
      title: 'Deneme portföyü',
      titleSkipped: false,
      city: 'Denizli',
      district: 'Merkezefendi',
      neighborhood: 'Yenişehir',
      mainCategory: 'KONUT',
      propertyType: 'VILLA',
      transactionType: 'SATILIK',
      roomCount: '5+2',
      squareMeter: 7_500,
      buildingAge: '5',
      floor: '2. Kat',
      buildingFloorCount: 5,
      adaNo: null,
      adaNoSkipped: true,
      parselNo: null,
      parselNoSkipped: true,
      unitNumber: null,
      unitNumberSkipped: true,
      currency: 'TRY',
      currencyConfirmed: true,
      price: 25_000_000,
      missingFields: [],
      state: {
        flowVersion: 'MANUAL_PORTFOLIO_FORM_V1',
        userMessages: [],
        assistantMessages: [],
        extractedFields: {
          title: 'Deneme portföyü',
          titleSkipped: false,
          city: 'Denizli',
          district: 'Merkezefendi',
          neighborhood: 'Yenişehir',
          mainCategory: 'KONUT',
          propertyType: 'VILLA',
          transactionType: 'SATILIK',
          roomCount: '5+2',
          squareMeter: 7_500,
          buildingAge: '5',
          floor: '2. Kat',
          buildingFloorCount: 5,
          adaNo: null,
          adaNoSkipped: true,
          parselNo: null,
          parselNoSkipped: true,
          unitNumber: null,
          unitNumberSkipped: true,
          currency: 'TRY',
          currencyConfirmed: true,
          price: 25_000_000,
        },
        missingFields: [],
      },
      expiresAt: new Date('2026-08-02T00:00:00.000Z'),
      lastActivityAt: new Date('2026-07-18T00:00:00.000Z'),
      ...overrides,
    };
  }

  function createDatabaseRecord(
    session: LinaPortfolioSessionContext,
  ): Record<string, unknown> {
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
      stateJson: session.state,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
    };
  }

  function createService(
    session: LinaPortfolioSessionContext,
  ): {
    service: LinaPortfolioSessionService;
    prismaMock: PrismaMock;
  } {
    const prismaMock: PrismaMock = {
      linaPortfolioSession: {
        update: jest.fn(
          async ({ data }: PrismaUpdateInput) => {
            const updatedRecord =
              createDatabaseRecord(session);

            for (const [key, value] of Object.entries(data)) {
              if (value !== undefined) {
                updatedRecord[key] = value;
              }
            }

            return updatedRecord;
          },
        ),
      },
    };

    const service = new LinaPortfolioSessionService(
      prismaMock as unknown as PrismaService,
    );

    jest
      .spyOn(service, 'getOrCreateActiveSession')
      .mockResolvedValue(session);

    return {
      service,
      prismaMock,
    };
  }

  function createWarningValidation(): LinaPortfolioValidationState {
    return {
      version: 'PROPERTY_VALIDATION_V2_1',
      status: 'WARNING_CONFIRMATION_REQUIRED',
      messages: [
        'Girilen 7.500 m² villa alanı olağan dışı görünüyor.',
      ],
      requiredWarningCodes: [
        'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX',
      ],
      acknowledgedWarningCodes: [],
    };
  }

  it('warning doğrulamasını stateJson içinde saklar ve CONFIRMATION adımına geçer', async () => {
    const session = createSession();
    const validation = createWarningValidation();
    const { service, prismaMock } = createService(session);

    const result = await service.saveValidationState(
      session.userId,
      validation,
    );

    expect(
      prismaMock.linaPortfolioSession.update,
    ).toHaveBeenCalledWith({
      where: {
        id: session.id,
      },
      data: expect.objectContaining({
        step: 'CONFIRMATION',
        status: 'READY_FOR_CONFIRMATION',
        confirmationStatus: 'WAITING',
        stateJson: expect.objectContaining({
          validation,
          updatedBy: 'property-validation',
        }),
      }),
    });

    expect(result.step).toBe('CONFIRMATION');
    expect(result.state.validation).toEqual(validation);
  });

  it('warning teyidinden sonra oturumu onaylar ve teyit kodlarını saklar', async () => {
    const validation = createWarningValidation();
    const session = createSession({
      step: 'CONFIRMATION',
      state: {
        ...createSession().state,
        validation,
      },
    });

    const { service } = createService(session);

    const result = await service.markApproved(
      session.userId,
      [
        'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX',
        'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX',
      ],
    );

    expect(result.step).toBe('CREATED');
    expect(result.status).toBe('CREATED');
    expect(result.confirmationStatus).toBe('APPROVED');

    expect(result.state.validation).toEqual({
      ...validation,
      status: 'APPROVED',
      requiredWarningCodes: [],
      acknowledgedWarningCodes: [
        'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX',
      ],
    });
  });

  it('portföy bilgisi değiştirildiğinde eski warning teyidini temizler', async () => {
    const validation = createWarningValidation();
    const session = createSession({
      step: 'CONFIRMATION',
      state: {
        ...createSession().state,
        validation,
      },
    });

    const { service, prismaMock } = createService(session);

    const result = await service.updateExtractedFields(
      session.userId,
      {
        squareMeter: 450,
      },
    );

    const updateCall =
      prismaMock.linaPortfolioSession.update.mock
        .calls[0][0] as PrismaUpdateInput;

    expect(
      (
        updateCall.data.stateJson as {
          validation?: unknown;
        }
      ).validation,
    ).toBeUndefined();

    expect(result.step).toBe('SUMMARY');
    expect(result.squareMeter).toBe(450);
    expect(result.state.validation).toBeUndefined();
  });
});
