import { Controller, Get, UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketTickerService } from './market-ticker.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly tickerService: MarketTickerService,
  ) {}

  @Get('pulse')
  getPulse() {
    return this.marketService.getPulse();
  }

  @Get('ticker')
  getTicker() {
    return this.tickerService.getTicker();
  }
}
