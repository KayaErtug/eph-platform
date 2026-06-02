import { Module } from '@nestjs/common';
import { PortfolioImagesController } from './portfolio-images.controller';
import { PortfolioImagesService } from './portfolio-images.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PortfolioImagesController],
  providers: [PortfolioImagesService, PrismaService],
})
export class PortfolioImagesModule {}
