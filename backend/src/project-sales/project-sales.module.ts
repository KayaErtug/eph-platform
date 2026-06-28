import { Module } from '@nestjs/common';
import { ProjectSalesController } from './project-sales.controller';
import { ProjectSalesService } from './project-sales.service';

@Module({
  controllers: [ProjectSalesController],
  providers: [ProjectSalesService],
  exports: [ProjectSalesService],
})
export class ProjectSalesModule {}
