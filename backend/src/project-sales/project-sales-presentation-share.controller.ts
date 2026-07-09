import { Controller, Get, Param } from '@nestjs/common';
import { ProjectSalesLaunchService } from './project-sales-launch.service';

@Controller('project-presentation-share')
export class ProjectSalesPresentationShareController {
  constructor(
    private readonly projectSalesLaunchService: ProjectSalesLaunchService,
  ) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.projectSalesLaunchService.getPresentationByToken(token);
  }
}
