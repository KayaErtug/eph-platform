import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoordinationRecalculationService } from './coordination-recalculation.service';

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

  @Post('crm/interests/:interestId/recalculate')
  recalculateCrmInterest(
    @Param('interestId') interestId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.recalculateCrmInterest(interestId, user);
  }

  @Post('requests/:postId/recalculate-portfolio-matches')
  recalculateRequestPortfolioMatches(
    @Param('postId') postId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.recalculateRequestPortfolioMatches(postId, user);
  }
}
