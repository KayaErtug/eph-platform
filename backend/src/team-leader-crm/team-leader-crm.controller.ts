import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';

import { TeamLeaderCrmService } from './team-leader-crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

type TeamLeaderCrmRequestUser = {
  id?: string;
  sub?: string;
  userId?: string;
  role?: Role | string;
  email?: string;
};

type TeamLeaderCrmRequest = Request & {
  user?: TeamLeaderCrmRequestUser;
};

@Controller('team-leader-crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMLAKCI, Role.ADMIN, Role.SUPER_ADMIN)
export class TeamLeaderCrmController {
  constructor(private readonly teamLeaderCrmService: TeamLeaderCrmService) {}

  private extractActor(request: TeamLeaderCrmRequest) {
    return {
      id: request.user?.id || request.user?.sub || request.user?.userId,
      role: request.user?.role,
      email: request.user?.email,
    };
  }

  @Get('dashboard')
  getMyDashboard(@Req() request: TeamLeaderCrmRequest) {
    return this.teamLeaderCrmService.getMyDashboard(this.extractActor(request));
  }
}
