import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
