import { Module } from "@nestjs/common";

import { CrmModule } from "../crm/crm.module";
import { NetworkModule } from "../network/network.module";
import { PrismaService } from "../prisma/prisma.service";

import { LinaActionEngineService } from "./actions/lina-action-engine.service";
import { LinaController } from "./lina.controller";
import { LinaService } from "./lina.service";
import { LinaAccessService } from "./lina-access.service";
import { LinaKvkkService } from "./lina-kvkk.service";
import { LinaAuditService } from "./lina-audit.service";
import { LinaMemoryService } from "./lina-memory.service";
import { LinaNotificationService } from "./lina-notification.service";
import { LinaVoiceService } from "./lina-voice.service";
import { LinaPortfolioSessionService } from "./portfolio/lina-portfolio-session.service";
import { LinaPortfolioEngineService } from "./portfolio/lina-portfolio-engine.service";
import { LinaGeoService } from "./geo/lina-geo.service";
import { LinaDocumentPrecheckService } from "./document/lina-document-precheck.service";
import { LinaDocumentTkgmService } from "./document/lina-document-tkgm.service";

@Module({
  imports: [
    CrmModule,
    NetworkModule,
  ],
  controllers: [LinaController],
  providers: [
    PrismaService,
    LinaService,
    LinaActionEngineService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,
    LinaGeoService,
    LinaDocumentPrecheckService,
    LinaDocumentTkgmService,
  ],
  exports: [
    LinaService,
    LinaActionEngineService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,
    LinaGeoService,
    LinaDocumentPrecheckService,
    LinaDocumentTkgmService,
  ],
})
export class LinaModule {}
