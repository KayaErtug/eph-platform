import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { LinaController } from './lina.controller';
import { LinaService } from './lina.service';
import { LinaAccessService } from './lina-access.service';
import { LinaKvkkService } from './lina-kvkk.service';
import { LinaAuditService } from './lina-audit.service';
import { LinaMemoryService } from './lina-memory.service';
import { LinaNotificationService } from './lina-notification.service';
import { LinaVoiceService } from './lina-voice.service';
import { LinaPortfolioSessionService } from './portfolio/lina-portfolio-session.service';
import { LinaPortfolioEngineService } from './portfolio/lina-portfolio-engine.service';
import { LinaGeoService } from './geo/lina-geo.service';

@Module({
  controllers: [LinaController],
  providers: [
    PrismaService,
    LinaService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,
    LinaGeoService,
  ],
  exports: [
    LinaService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,
    LinaGeoService,
  ],
})
export class LinaModule {}