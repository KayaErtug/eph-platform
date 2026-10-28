import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoordinationRecalculationService, type RequestScanOptions } from './coordination-recalculation.service';

type PreviewPoolMatchesDto = {
  requestType: string;
  propertyTypes?: string[] | null;
  roomCounts?: string[] | null;
  features?: string[] | null;
  priceCurrency?: string | null;
  maxBudget?: number | null;
  minArea?: number | null;
  acknowledgedWarningCodes?: string[] | null;
  areas?: Array<{
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  }> | null;
};

type PaidMatchScanDto = RequestScanOptions & { requestId: string };

@Controller('coordination')
@UseGuards(JwtAuthGuard)
export class CoordinationRecalculationController {
  constructor(
    private readonly service: CoordinationRecalculationService,
  ) {}

  @Get('alerts')
  getAlerts(@CurrentUser() user: any) {
    return this.service.getAlerts(user);
  }

  @Get('lina-opportunities')
  getLinaOpportunities(
    @CurrentUser() user: any,
  ) {
    return this.service.getLinaOpportunities(
      user,
    );
  }


  @Post('crm/interests/:interestId/recalculate')
  recalculateCrmInterest(
    @Param('interestId') interestId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.recalculateCrmInterest(interestId, user);
  }

  @Get('match-scan/config')
  getMatchScanConfig(
    @CurrentUser() user: any,
    @Query() query: RequestScanOptions,
  ) {
    return this.service.getMatchScanConfig(user, query);
  }

  @Post('requests/:postId/match-scan')
  runPaidRequestMatchScan(
    @Param('postId') postId: string,
    @Body() body: PaidMatchScanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.runPaidRequestMatchScan(
      postId,
      user,
      body?.requestId,
      body || {},
    );
  }

  @Get('requests/:postId/match-scans')
  requestHistory(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.service.requestMatchHistory(postId, user);
  }

  @Get('requests/:postId/match-scans/:requestId')
  requestReport(@Param('postId') postId: string, @Param('requestId') requestId: string, @CurrentUser() user: any) {
    return this.service.requestMatchHistory(postId, user, requestId);
  }

  @Post('requests/preview-pool-matches')
  previewRequestPoolMatches(
    @Body() body: PreviewPoolMatchesDto,
    @CurrentUser() user: any,
  ) {
    return this.service.previewRequestPoolMatches(body, user);
  }
}
