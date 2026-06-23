import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EphAuthorityLettersService } from './eph-authority-letters.service';

@Controller('eph-authority-letters')
export class EphAuthorityLettersController {
  constructor(private readonly service: EphAuthorityLettersService) {}

  @Get('verify/:authorityNo')
  verify(@Param('authorityNo') authorityNo: string) {
    return this.service.verifyByAuthorityNo(authorityNo);
  }

  @Get('quota')
  @UseGuards(JwtAuthGuard)
  getQuota(@CurrentUser() user: any) {
    return this.service.getQuota({
      userId: user.id,
      userRole: user.role,
    });
  }

  @Get('portfolio/:unitId')
  @UseGuards(JwtAuthGuard)
  findByPortfolio(@CurrentUser() user: any, @Param('unitId') unitId: string) {
    return this.service.findByPortfolio({
      userId: user.id,
      userRole: user.role,
      unitId,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create({
      userId: user.id,
      userRole: user.role,
      body,
    });
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.service.generatePdf({
      userId: user.id,
      userRole: user.role,
      id,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(Buffer.from(result.pdfBytes));
  }

  @Post(':id/pdf-created')
  @UseGuards(JwtAuthGuard)
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
