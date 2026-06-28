import { Module } from '@nestjs/common';
import { ProjectSalesTemplatesController } from './project-sales-templates.controller';

@Module({
  controllers: [ProjectSalesTemplatesController],
})
export class ProjectSalesTemplatesModule {}
