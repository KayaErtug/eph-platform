import { Module } from '@nestjs/common';
import { ProjectMediaZipService } from './project-media-zip.service';
import { ProjectSalesController } from './project-sales.controller';
import { ProjectSalesImportService } from './project-sales-import.service';
import { ProjectSalesService } from './project-sales.service';

@Module({
  controllers: [ProjectSalesController],
  providers: [
    ProjectSalesService,
    ProjectSalesImportService,
    ProjectMediaZipService,
  ],
  exports: [
    ProjectSalesService,
    ProjectSalesImportService,
    ProjectMediaZipService,
  ],
})
export class ProjectSalesModule {}
