import { Module } from '@nestjs/common';
import { PortfolioImagesController } from './portfolio-images.controller';
import { PortfolioImagesService } from './portfolio-images.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PortfolioImagesController],
  providers: [PortfolioImagesService],
})
export class PortfolioImagesModule {}