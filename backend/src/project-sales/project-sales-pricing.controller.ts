import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesPricingService } from './project-sales-pricing.service';

@Controller('project-sales/projects/:projectId/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesPricingController {
  constructor(
    private readonly projectSalesPricingService: ProjectSalesPricingService,
  ) {}

  @Post('preview')
  previewBulkPricing(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesPricingService.previewBulkPricing(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('apply')
  applyBulkPricing(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesPricingService.applyBulkPricing(
      projectId,
      user.id,
      user.role,
      body,
    );
  }
}
