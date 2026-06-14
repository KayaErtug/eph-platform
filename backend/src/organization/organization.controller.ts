import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';

import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

type OrganizationRequestUser = {
  id?: string;
  sub?: string;
  userId?: string;
  role?: Role | string;
  email?: string;
};

type OrganizationRequest = Request & {
  user?: OrganizationRequestUser;
};

@Controller('organization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  private extractActor(request: OrganizationRequest) {
    return {
      id: request.user?.id || request.user?.sub || request.user?.userId,
      role: request.user?.role,
      email: request.user?.email,
      ipAddress:
        request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
        request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
    };
  }

  @Get('summary')
  getSummary() {
    return this.organizationService.getSummary();
  }

  @Get('users')
  getOrganizationUsers() {
    return this.organizationService.getOrganizationUsers();
  }

  @Get('offices')
  getOffices() {
    return this.organizationService.getOffices();
  }

  @Post('offices')
  createOffice(
    @Body()
    body: {
      name?: string;
      city?: string;
      district?: string;
      ownerUserId?: string | null;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.createOffice(body, this.extractActor(request));
  }

  @Patch('offices/:id')
  updateOffice(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      city?: string | null;
      district?: string | null;
      ownerUserId?: string | null;
      isActive?: boolean;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.updateOffice(id, body, this.extractActor(request));
  }

  @Get('teams')
  getTeams() {
    return this.organizationService.getTeams();
  }

  @Post('teams')
  createTeam(
    @Body()
    body: {
      officeId?: string;
      name?: string;
      leaderId?: string | null;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.createTeam(body, this.extractActor(request));
  }

  @Patch('teams/:id')
  updateTeam(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      isActive?: boolean;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.updateTeam(id, body, this.extractActor(request));
  }

  @Patch('teams/:id/leader')
  setTeamLeader(
    @Param('id') id: string,
    @Body() body: { leaderId?: string | null },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.setTeamLeader(id, body.leaderId || null, this.extractActor(request));
  }

  @Post('teams/:id/members')
  addTeamMember(
    @Param('id') id: string,
    @Body() body: { userId?: string },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.addTeamMember(id, body.userId || '', this.extractActor(request));
  }

  @Delete('teams/:id/members/:userId')
  removeTeamMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.removeTeamMember(id, userId, this.extractActor(request));
  }
}
