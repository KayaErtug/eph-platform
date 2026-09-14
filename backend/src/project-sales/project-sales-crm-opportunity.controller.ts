import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesCrmOpportunityService } from './project-sales-crm-opportunity.service';

type AuthenticatedUser = {
  id: string;
  role: Role;
};

@Controller('project-sales/projects/:projectId/crm-opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesCrmOpportunityController {
  constructor(
    private readonly projectSalesCrmOpportunityService: ProjectSalesCrmOpportunityService,
  ) {}

  @Get()
  getProjectOpportunities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectSalesCrmOpportunityService.getProjectOpportunities(
      projectId,
      user.id,
      user.role,
      limit,
    );
  }
}
