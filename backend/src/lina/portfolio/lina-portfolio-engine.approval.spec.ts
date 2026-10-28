import { UnitType } from '@prisma/client';

import {
  PropertyValidationContext,
  PropertyValidationSeverity,
  type PropertyValidationIssue,
  type PropertyValidationResult,
} from '../../property-validation/property-validation.types';
import { LinaPortfolioApprovalValidationService } from './lina-portfolio-approval-validation.service';
import { LinaPortfolioEngineService } from './lina-portfolio-engine.service';
import {
  type LinaPortfolioSessionContext,
  LinaPortfolioSessionService,
  type LinaPortfolioValidationState,
} from './lina-portfolio-session.service';

describe('LinaPortfolioEngineService approval flow', () => {
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
      squareMeter: 450,
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
        extractedFields: {},
        missingFields: [],
      },
      expiresAt: null,
      lastActivityAt: new Date('2026-07-18T00:00:00.000Z'),
      ...overrides,
    };
  }

  function createIssue(
    overrides: Partial<PropertyValidationIssue> = {},
  ): PropertyValidationIssue {
    return {
      ruleId: 'test-rule',
      code: 'VALUE_ABOVE_HARD_MAX',
      severity: PropertyValidationSeverity.ERROR,
      blocking: true,
      context: PropertyValidationContext.LINA_ACTION,
      propertyType: UnitType.VILLA,
      field: 'maxArea',
      relatedFields: [],
      message: 'Villa alanı izin verilen kesin üst sınırı aşıyor.',
      ...overrides,
    };
  }

  function createValidationResult(
    overrides: Partial<PropertyValidationResult> = {},
  ): PropertyValidationResult {
    return {
      version: '2.1.0',
      valid: true,
      requiresConfirmation: false,
      requiresEvidence: false,
      issues: [],
      errors: [],
      conflicts: [],
      warnings: [],
      pendingWarnings: [],
      evidenceRequests: [],
      dynamicInformation: [],
      requiredWarningCodes: [],
      acknowledgedWarningCodes: [],
      ...overrides,
    };
  }

  function createEngine(
    session: LinaPortfolioSessionContext,
    validationResult: PropertyValidationResult,
  ) {
    const createdSession = createSession({
      step: 'CREATED',
      status: 'CREATED',
      confirmationStatus: 'APPROVED',
      state: session.state,
    });

    const sessionServiceMock = {
      getOrCreateActiveSession: jest
        .fn()
        .mockResolvedValue(session),
      appendUserMessage: jest
        .fn()
        .mockResolvedValue(session),
      markApproved: jest
        .fn()
        .mockResolvedValue(createdSession),
      markRejected: jest
        .fn()
        .mockResolvedValue(session),
      updateExtractedFields: jest
        .fn()
        .mockResolvedValue(session),
      saveValidationState: jest.fn(
        async (
          _userId: string,
          validation: LinaPortfolioValidationState,
        ) =>
          createSession({
            step:
              validation.status ===
              'WARNING_CONFIRMATION_REQUIRED'
                ? 'CONFIRMATION'
                : 'SUMMARY',
            status: 'READY_FOR_CONFIRMATION',
            confirmationStatus: 'WAITING',
            state: {
              ...session.state,
              validation,
            },
          }),
      ),
    };

    const approvalValidationServiceMock = {
      validateForApproval: jest
        .fn()
        .mockReturnValue(validationResult),
    };

    const engine = new LinaPortfolioEngineService(
      sessionServiceMock as unknown as LinaPortfolioSessionService,
      approvalValidationServiceMock as unknown as LinaPortfolioApprovalValidationService,
    );

    return {
      engine,
      sessionServiceMock,
      approvalValidationServiceMock,
    };
  }

  it('normal portföyde ilk onayla kaydı tamamlar', async () => {
    const session = createSession();
    const validationResult = createValidationResult();

    const {
      engine,
      sessionServiceMock,
      approvalValidationServiceMock,
    } = createEngine(session, validationResult);

    const result = await engine.processUserMessage(
      session.userId,
      'evet',
    );

    expect(
      approvalValidationServiceMock.validateForApproval,
    ).toHaveBeenCalledWith(session, []);

    expect(
      sessionServiceMock.saveValidationState,
    ).not.toHaveBeenCalled();

    expect(
      sessionServiceMock.markApproved,
    ).toHaveBeenCalledWith(session.userId, []);

    expect(result.step).toBe('CREATED');
    expect(result.status).toBe('CREATED');
  });

  it('olağan dışı değerde ilk onaydan sonra açık teyit ister', async () => {
    const session = createSession({
      squareMeter: 7_500,
    });

    const warningCode =
      'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX';

    const warningIssue = createIssue({
      code: warningCode,
      severity: PropertyValidationSeverity.WARNING,
      blocking: false,
      message:
        'Girilen 7.500 m² villa alanı olağan dışı görünüyor.',
    });

    const validationResult = createValidationResult({
      requiresConfirmation: true,
      issues: [warningIssue],
      warnings: [warningIssue],
      pendingWarnings: [warningIssue],
      requiredWarningCodes: [warningCode],
    });

    const {
      engine,
      sessionServiceMock,
    } = createEngine(session, validationResult);

    const result = await engine.processUserMessage(
      session.userId,
      'onaylıyorum',
    );

    expect(
      sessionServiceMock.saveValidationState,
    ).toHaveBeenCalledWith(session.userId, {
      version: '2.1.0',
      status: 'WARNING_CONFIRMATION_REQUIRED',
      messages: [
        'Girilen 7.500 m² villa alanı olağan dışı görünüyor.',
      ],
      requiredWarningCodes: [warningCode],
      acknowledgedWarningCodes: [],
    });

    expect(
      sessionServiceMock.markApproved,
    ).not.toHaveBeenCalled();

    expect(result.step).toBe('CONFIRMATION');
    expect(result.state.validation?.status).toBe(
      'WARNING_CONFIRMATION_REQUIRED',
    );
  });

  it('warning teyidindeki ikinci onayla kaydı tamamlar', async () => {
    const warningCode =
      'PROPERTY_WARNING_VILLA_MAX_AREA_VALUE_ABOVE_SOFT_MAX';

    const validationState: LinaPortfolioValidationState = {
      version: '2.1.0',
      status: 'WARNING_CONFIRMATION_REQUIRED',
      messages: [
        'Girilen 7.500 m² villa alanı olağan dışı görünüyor.',
      ],
      requiredWarningCodes: [warningCode],
      acknowledgedWarningCodes: [],
    };

    const session = createSession({
      step: 'CONFIRMATION',
      squareMeter: 7_500,
      state: {
        ...createSession().state,
        validation: validationState,
      },
    });

    const validationResult = createValidationResult({
      acknowledgedWarningCodes: [warningCode],
    });

    const {
      engine,
      sessionServiceMock,
      approvalValidationServiceMock,
    } = createEngine(session, validationResult);

    const result = await engine.processUserMessage(
      session.userId,
      'evet',
    );

    expect(
      approvalValidationServiceMock.validateForApproval,
    ).toHaveBeenCalledWith(session, [warningCode]);

    expect(
      sessionServiceMock.markApproved,
    ).toHaveBeenCalledWith(session.userId, [
      warningCode,
    ]);

    expect(result.step).toBe('CREATED');
  });

  it('imkansız değerde onayı engeller ve hata mesajını hazırlar', async () => {
    const session = createSession({
      squareMeter: 25_000,
    });

    const errorIssue = createIssue();

    const validationResult = createValidationResult({
      valid: false,
      issues: [errorIssue],
      errors: [errorIssue],
    });

    const {
      engine,
      sessionServiceMock,
    } = createEngine(session, validationResult);

    const result = await engine.processUserMessage(
      session.userId,
      'tamam',
    );

    expect(
      sessionServiceMock.saveValidationState,
    ).toHaveBeenCalledWith(session.userId, {
      version: '2.1.0',
      status: 'BLOCKED',
      messages: [
        'Villa alanı izin verilen kesin üst sınırı aşıyor.',
      ],
      requiredWarningCodes: [],
      acknowledgedWarningCodes: [],
    });

    expect(
      sessionServiceMock.markApproved,
    ).not.toHaveBeenCalled();

    expect(result.step).toBe('SUMMARY');
    expect(result.state.validation?.status).toBe('BLOCKED');

    const reply = engine.buildExactReply(result);

    expect(reply).toContain(
      'Bu bilgilerle portföyü onaylayamam:',
    );
    expect(reply).toContain(
      'Villa alanı izin verilen kesin üst sınırı aşıyor.',
    );
    expect(reply).toContain(
      'Hatalı değeri düzelterek tekrar gönderin.',
    );
  });
});
