import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesAgentChannelService } from './project-sales-agent-channel.service';

@Controller('project-sales/agent-channel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMLAKCI, Role.SUPER_ADMIN)
export class ProjectSalesAgentChannelController {
  constructor(
    private readonly projectSalesAgentChannelService: ProjectSalesAgentChannelService,
  ) {}

  @Get()
  listChannel(
    @CurrentUser() user: any,
    @Query() query: Record<string, unknown>,
  ) {
    return this.projectSalesAgentChannelService.listChannel(user.id, query);
  }
}
