import { Module } from '@nestjs/common';
import { PortfolioImagesController } from './portfolio-images.controller';
import { PortfolioImagesService } from './portfolio-images.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [SupabaseModule, PrismaModule],
  controllers: [PortfolioImagesController],
  providers: [PortfolioImagesService],
})
export class PortfolioImagesModule {}