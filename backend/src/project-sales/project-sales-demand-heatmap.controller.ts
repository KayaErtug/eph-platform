import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesDemandHeatmapService } from './project-sales-demand-heatmap.service';

@Controller('project-sales/demand-heatmap')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesDemandHeatmapController {
  constructor(
    private readonly projectSalesDemandHeatmapService: ProjectSalesDemandHeatmapService,
  ) {}

  @Get()
  getHeatmap(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('days') days?: string,
  ) {
    return this.projectSalesDemandHeatmapService.getHeatmap({
      city,
      district,
      days,
    });
  }
}
