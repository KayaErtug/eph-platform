import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EphAuthorityLettersService } from './eph-authority-letters.service';

@Controller('eph-authority-letters')
@UseGuards(JwtAuthGuard)
export class EphAuthorityLettersController {
  constructor(private readonly service: EphAuthorityLettersService) {}

  @Get('portfolio/:unitId')
  findByPortfolio(@CurrentUser() user: any, @Param('unitId') unitId: string) {
    return this.service.findByPortfolio({
      userId: user.id,
      userRole: user.role,
      unitId,
    });
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create({
      userId: user.id,
      userRole: user.role,
      body,
    });
  }

  @Post(':id/pdf-created')
  markPdfCreated(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('pdfUrl') pdfUrl: string,
  ) {
    return this.service.markPdfCreated({
      userId: user.id,
      userRole: user.role,
      id,
      pdfUrl,
    });
  }
}