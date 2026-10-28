import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoordinationRecalculationController } from './coordination-recalculation.controller';

describe('CoordinationRecalculationController', () => {
  it('protects coordination recalculation endpoints with JWT', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CoordinationRecalculationController,
    );

    expect(guards).toContain(JwtAuthGuard);
  });

  it('exposes preview, paid match scan and live scan config routes', () => {
    const prototype = CoordinationRecalculationController.prototype;

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        prototype.getMatchScanConfig,
      ),
    ).toBe('match-scan/config');

    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        prototype.getMatchScanConfig,
      ),
    ).toBe(RequestMethod.GET);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        prototype.runPaidRequestMatchScan,
      ),
    ).toBe('requests/:postId/match-scan');

    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        prototype.runPaidRequestMatchScan,
      ),
    ).toBe(RequestMethod.POST);

    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        prototype.previewRequestPoolMatches,
      ),
    ).toBe('requests/preview-pool-matches');

    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        prototype.previewRequestPoolMatches,
      ),
    ).toBe(RequestMethod.POST);
  });

  it('does not expose legacy free request recalculation routes', () => {
    const prototype = CoordinationRecalculationController.prototype as any;

    expect(
      prototype.recalculateRequestPortfolioMatches,
    ).toBeUndefined();

    expect(
      prototype.recalculateRequestPoolMatches,
    ).toBeUndefined();
  });
});
