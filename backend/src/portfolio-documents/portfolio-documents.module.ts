import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PortfolioDocumentsController } from './portfolio-documents.controller';
import { PortfolioDocumentsService } from './portfolio-documents.service';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [PortfolioDocumentsController],
  providers: [PortfolioDocumentsService],
})
export class PortfolioDocumentsModule {}