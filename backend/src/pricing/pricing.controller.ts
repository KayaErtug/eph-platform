import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PricingService } from './pricing.service';

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('tariff')
  tariff() {
    return this.pricing.tariff();
  }
}
