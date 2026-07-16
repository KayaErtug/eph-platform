import { Module } from '@nestjs/common';
import { ProjectMediaZipService } from './project-media-zip.service';
import { ProjectSalesCompletionService } from './project-sales-completion.service';
import { ProjectSalesController } from './project-sales.controller';
import { ProjectSalesDashboardService } from './project-sales-dashboard.service';
import { ProjectSalesImportService } from './project-sales-import.service';
import { ProjectSalesInventoryService } from './project-sales-inventory.service';
import { ProjectSalesLaunchService } from './project-sales-launch.service';
import { ProjectSalesMediaSetupService } from './project-sales-media-setup.service';
import { ProjectSalesPresentationShareController } from './project-sales-presentation-share.controller';
import { ProjectSalesSetupFilteredService } from './project-sales-setup-filtered.service';
import { ProjectSalesSetupService } from './project-sales-setup.service';
import { ProjectSalesSpacesService } from './project-sales-spaces.service';
import { ProjectSalesStockService } from './project-sales-stock.service';
import { ProjectSalesStructureService } from './project-sales-structure.service';
import { ProjectSalesService } from './project-sales.service';

@Module({
  controllers: [ProjectSalesController, ProjectSalesPresentationShareController],
  providers: [
    ProjectSalesService,
    ProjectSalesCompletionService,
    ProjectSalesImportService,
    ProjectSalesInventoryService,
    ProjectSalesLaunchService,
    ProjectSalesMediaSetupService,
    ProjectMediaZipService,
    ProjectSalesDashboardService,
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
    ProjectSalesSetupService,
    ProjectSalesSpacesService,
    ProjectSalesStockService,
    ProjectSalesStructureService,
  ],
})
export class ProjectSalesModule {}
