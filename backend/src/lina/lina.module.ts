import { Module } from "@nestjs/common";

import { CrmModule } from "../crm/crm.module";
import { NetworkModule } from "../network/network.module";
import { PrismaService } from "../prisma/prisma.service";
import { PropertyValidationModule } from "../property-validation/property-validation.module";

import { LinaActionEngineService } from "./actions/lina-action-engine.service";
import { LinaCrmOwnerActionService } from "./actions/lina-crm-owner-action.service";
import { EphLocationCatalogService } from "./catalog/eph-location-catalog.service";
import { EphSchemaCatalogService } from "./catalog/eph-schema-catalog.service";
import { LinaUserContextService } from "./catalog/lina-user-context.service";
import { LinaDocumentPrecheckService } from "./document/lina-document-precheck.service";
import { LinaDocumentTkgmService } from "./document/lina-document-tkgm.service";
import { LinaDistanceModule } from "./geo/lina-distance.module";
import { LinaGeoService } from "./geo/lina-geo.service";
import { LinaAccessService } from "./lina-access.service";
import { LinaAuditService } from "./lina-audit.service";
import { LinaController } from "./lina.controller";
import { LinaKvkkService } from "./lina-kvkk.service";
import { LinaMemoryService } from "./lina-memory.service";
import { LinaNotificationService } from "./lina-notification.service";
import { LinaPropertyValidationService } from "./lina-property-validation.service";
import { LinaService } from "./lina.service";
import { LinaVoiceService } from "./lina-voice.service";
import { LinaOpenAiClientService } from "./openai-tools/lina-openai-client.service";
import { LinaOpenAiLiveGatewayService } from "./openai-tools/lina-openai-live-gateway.service";
import { LinaOpenAiOrchestratorService } from "./openai-tools/lina-openai-orchestrator.service";
import { LinaOpenAiRuntimeService } from "./openai-tools/lina-openai-runtime.service";
import { LinaReadToolProviderService } from "./openai-tools/lina-read-tool-provider.service";
import { LinaToolExecutorService } from "./openai-tools/lina-tool-executor.service";
import { LinaToolInputValidatorService } from "./openai-tools/lina-tool-input-validator.service";
import { LinaToolPolicyService } from "./openai-tools/lina-tool-policy.service";
import { LinaToolRegistryService } from "./openai-tools/lina-tool-registry.service";
import { LinaPortfolioApprovalValidationService } from "./portfolio/lina-portfolio-approval-validation.service";
import { LinaPortfolioEngineService } from "./portfolio/lina-portfolio-engine.service";
import { LinaPortfolioSessionService } from "./portfolio/lina-portfolio-session.service";
import { LinaV7PromptService } from "./v7/lina-v7-prompt.service";

@Module({
  imports: [
    CrmModule,
    NetworkModule,
    PropertyValidationModule,
    LinaDistanceModule,
  ],
  controllers: [LinaController],
  providers: [
    PrismaService,

    LinaService,
    LinaActionEngineService,
    LinaCrmOwnerActionService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaPropertyValidationService,
    LinaVoiceService,

    LinaPortfolioApprovalValidationService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,

    LinaGeoService,
    LinaDocumentPrecheckService,
    LinaDocumentTkgmService,
    LinaV7PromptService,

    LinaUserContextService,
    EphLocationCatalogService,
    EphSchemaCatalogService,

    LinaToolPolicyService,
    LinaToolRegistryService,
    LinaToolInputValidatorService,
    LinaToolExecutorService,
    LinaOpenAiClientService,
    LinaOpenAiOrchestratorService,
    LinaOpenAiRuntimeService,
    LinaOpenAiLiveGatewayService,
    LinaReadToolProviderService,
  ],
  exports: [
    LinaService,
    LinaActionEngineService,
    LinaCrmOwnerActionService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaPropertyValidationService,
    LinaVoiceService,
    LinaPortfolioApprovalValidationService,
    LinaPortfolioSessionService,
    LinaPortfolioEngineService,
    LinaGeoService,
    LinaDistanceModule,
    LinaDocumentPrecheckService,
    LinaDocumentTkgmService,
    LinaV7PromptService,
  ],
})
export class LinaModule {}
