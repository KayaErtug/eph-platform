import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoolExperienceService } from './pool-experience.service';

@Controller('pool-experience')
@UseGuards(JwtAuthGuard)
export class PoolExperienceController {
  constructor(private readonly service: PoolExperienceService) {}

  @Get('units')
  findPoolUnits(@CurrentUser() user: any) {
    return this.service.findPoolUnits(user);
  }

  @Get('units/:id/presentations')
  listPoolPresentations(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('source') source?: 'POOL' | 'PORTFOLIO',
  ) {
    return this.service.listPresentations(id, user, source || 'POOL');
  }

  @Post('units/:id/presentations')
  createPoolPresentation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.service.createPresentation(id, user, 'POOL', durationHours);
  }

  @Post('portfolio/:id/presentations')
  createPortfolioPresentation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.service.createPresentation(
      id,
      user,
      'PORTFOLIO',
      durationHours,
    );
  }

  @Patch('presentations/:id/renew')
  renewPresentation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.service.renewPresentation(id, user, durationHours);
  }

  @Delete('presentations/:id')
  revokePresentation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revokePresentation(id, user);
  }
}
