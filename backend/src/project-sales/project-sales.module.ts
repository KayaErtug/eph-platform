import { Module } from '@nestjs/common';
import { ProjectMediaZipService } from './project-media-zip.service';
import { ProjectSalesController } from './project-sales.controller';
import { ProjectSalesService } from './project-sales.service';

@Module({
  controllers: [ProjectSalesController],
  providers: [
    ProjectSalesService,
    ProjectMediaZipService,
  ],
  exports: [
    ProjectSalesService,
    ProjectMediaZipService,
  ],
})
export class ProjectSalesModule {}
