import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';

import { KatilimTalepleriService } from './katilim-talepleri.service';
import { KatilimTalebiOlusturDto } from './dto/katilim-talebi-olustur.dto';

@Controller('katilim-talepleri')
export class KatilimTalepleriController {
  constructor(private readonly katilimTalepleriService: KatilimTalepleriService) {}

  @Post()
  olustur(@Body() dto: KatilimTalebiOlusturDto, @Req() request: Request) {
    return this.katilimTalepleriService.olustur(
      dto,
      request.ip,
      request.headers['user-agent'],
    );
  }
}