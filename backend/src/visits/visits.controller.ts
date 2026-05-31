import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('log')
  @UseGuards(JwtAuthGuard)
  async logVisit(@Req() req: any, @Body() body: { page: string }) {
    return this.visitsService.logVisit({
      userId: req.user?.id,
      page: body.page,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('presence')
  @UseGuards(JwtAuthGuard)
  async getPresence(@Req() req: any) {
    return this.visitsService.getPresence(req.user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getVisits(
    @Query('page') page?: string,
    @Query('userId') userId?: string,
  ) {
    return this.visitsService.getVisits(page, userId);
  }
}