import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OfficeOwnerCrmService } from './office-owner-crm.service';

type OfficeOwnerCrmRequestUser = {
  id?: string;
  sub?: string;
  userId?: string;
  role?: Role | string;
  email?: string;
};

type OfficeOwnerCrmRequest = Request & {
  user?: OfficeOwnerCrmRequestUser;
};

@Controller('office-owner-crm')
@UseGuards(JwtAuthGuard)
export class OfficeOwnerCrmController {
  constructor(private readonly officeOwnerCrmService: OfficeOwnerCrmService) {}

  private extractActor(request: OfficeOwnerCrmRequest) {
    return {
      id: request.user?.id || request.user?.sub || request.user?.userId,
      role: request.user?.role,
      email: request.user?.email,
    };
  }

  @Get('dashboard')
  getDashboard(@Req() request: OfficeOwnerCrmRequest, @Query('officeId') officeId?: string) {
    return this.officeOwnerCrmService.getDashboard(this.extractActor(request), officeId);
  }
}
