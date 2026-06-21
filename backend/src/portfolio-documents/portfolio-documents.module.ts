import { Module } from '@nestjs/common';

import { LinaModule } from '../lina/lina.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

import { PortfolioDocumentsController } from './portfolio-documents.controller';
import { PortfolioDocumentsService } from './portfolio-documents.service';

@Module({
  imports: [PrismaModule, SupabaseModule, LinaModule],
  controllers: [PortfolioDocumentsController],
  providers: [PortfolioDocumentsService],
  exports: [PortfolioDocumentsService],
})
export class PortfolioDocumentsModule {}
