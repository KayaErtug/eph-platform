import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesFeasibilityService } from './project-sales-feasibility.service';

@Controller('project-sales/feasibility')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesFeasibilityController {
  constructor(
    private readonly projectSalesFeasibilityService: ProjectSalesFeasibilityService,
  ) {}

  @Post('calculate')
  calculate(@Body() body: Record<string, unknown>) {
    return this.projectSalesFeasibilityService.calculate(body);
  }
}
