import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PortfolioImagesController } from './portfolio-images.controller';
import { PortfolioImagesService } from './portfolio-images.service';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [PortfolioImagesController],
  providers: [PortfolioImagesService],
})
export class PortfolioImagesModule {}
