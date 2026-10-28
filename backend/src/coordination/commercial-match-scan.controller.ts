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
import { CommercialMatchScanService } from './commercial-match-scan.service';

@Controller('coordination/commercial-scans')
@UseGuards(JwtAuthGuard)
export class CommercialMatchScanController {
  constructor(private readonly service: CommercialMatchScanService) {}

  @Get(':type/:sourceId/quote')
  quote(
    @Param('type') type: string,
    @Param('sourceId') sourceId: string,
    @Query() query: { walletSource?: string; walletOfficeId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.quote(type, sourceId, user, query || {});
  }

  @Get(':type/:sourceId')
  history(
    @Param('type') type: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.history(type, sourceId, user);
  }

  @Get(':type/:sourceId/:requestId')
  historyReceipt(
    @Param('type') type: string,
    @Param('sourceId') sourceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.historyReceipt(type, sourceId, requestId, user);
  }

  @Post(':type/:sourceId')
  scan(
    @Param('type') type: string,
    @Param('sourceId') sourceId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    return this.service.scan(type, sourceId, user, body || {});
  }
}
