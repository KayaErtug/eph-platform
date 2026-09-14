import { Module } from '@nestjs/common';
import { ProjectMediaZipService } from './project-media-zip.service';
import { ProjectSalesCompletionService } from './project-sales-completion.service';
import { ProjectSalesController } from './project-sales.controller';
import { ProjectSalesCrmOpportunityController } from './project-sales-crm-opportunity.controller';
import { ProjectSalesCrmOpportunityService } from './project-sales-crm-opportunity.service';
import { ProjectSalesDashboardService } from './project-sales-dashboard.service';
import { ProjectSalesDemandHeatmapController } from './project-sales-demand-heatmap.controller';
import { ProjectSalesDemandHeatmapService } from './project-sales-demand-heatmap.service';
import { ProjectSalesImportService } from './project-sales-import.service';
import { ProjectSalesInventoryService } from './project-sales-inventory.service';
import { ProjectSalesLaunchService } from './project-sales-launch.service';
import { ProjectSalesMediaSetupService } from './project-sales-media-setup.service';
import { ProjectSalesOfferController } from './project-sales-offer.controller';
import { ProjectSalesOfferService } from './project-sales-offer.service';
import { ProjectSalesPresentationShareController } from './project-sales-presentation-share.controller';
import { ProjectSalesPricingController } from './project-sales-pricing.controller';
import { ProjectSalesPricingService } from './project-sales-pricing.service';
import { ProjectSalesRequestOpportunityController } from './project-sales-request-opportunity.controller';
import { ProjectSalesRequestOpportunityService } from './project-sales-request-opportunity.service';
import { ProjectSalesReservationController } from './project-sales-reservation.controller';
import { ProjectSalesReservationService } from './project-sales-reservation.service';
import { ProjectSalesSetupFilteredService } from './project-sales-setup-filtered.service';
import { ProjectSalesSetupService } from './project-sales-setup.service';
import { ProjectSalesSpacesService } from './project-sales-spaces.service';
import { ProjectSalesStockService } from './project-sales-stock.service';
import { ProjectSalesStructureService } from './project-sales-structure.service';
import { ProjectSalesService } from './project-sales.service';

@Module({
  controllers: [
    ProjectSalesController,
    ProjectSalesPresentationShareController,
    ProjectSalesPricingController,
    ProjectSalesCrmOpportunityController,
    ProjectSalesRequestOpportunityController,
    ProjectSalesDemandHeatmapController,
    ProjectSalesReservationController,
    ProjectSalesOfferController,
  ],
  providers: [
    ProjectSalesService,
    ProjectSalesCompletionService,
    ProjectSalesImportService,
    ProjectSalesInventoryService,
    ProjectSalesLaunchService,
    ProjectSalesMediaSetupService,
    ProjectMediaZipService,
    ProjectSalesDashboardService,
    ProjectSalesPricingService,
    ProjectSalesCrmOpportunityService,
    ProjectSalesRequestOpportunityService,
    ProjectSalesDemandHeatmapService,
    ProjectSalesReservationService,
    ProjectSalesOfferService,
    {
      provide: ProjectSalesSetupService,
      useClass: ProjectSalesSetupFilteredService,
    },
    ProjectSalesSpacesService,
    ProjectSalesStockService,
    ProjectSalesStructureService,
  ],
  exports: [
    ProjectSalesService,
    ProjectSalesCompletionService,
    ProjectSalesImportService,
    ProjectSalesInventoryService,
    ProjectSalesLaunchService,
    ProjectSalesMediaSetupService,
    ProjectMediaZipService,
    ProjectSalesDashboardService,
    ProjectSalesPricingService,
    ProjectSalesCrmOpportunityService,
    ProjectSalesRequestOpportunityService,
    ProjectSalesDemandHeatmapService,
    ProjectSalesReservationService,
    ProjectSalesOfferService,
    ProjectSalesSetupService,
    ProjectSalesSpacesService,
    ProjectSalesStockService,
    ProjectSalesStructureService,
  ],
})
export class ProjectSalesModule {}
