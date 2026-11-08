import {
  Body,
  Query,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Role, SisterLinkStatus } from "@prisma/client";

import { OrganizationService } from "./organization.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";

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

@Controller("organization")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  private extractActor(request: OrganizationRequest) {
    return {
      id: request.user?.id || request.user?.sub || request.user?.userId,
      role: request.user?.role,
      email: request.user?.email,
      ipAddress:
        request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
        request.socket.remoteAddress,
      userAgent: request.headers["user-agent"],
    };
  }

  @Get("summary")
  @RequirePermission("ORGANIZATION_VIEW")
  getSummary() {
    return this.organizationService.getSummary();
  }

  @Get("users")
  @RequirePermission("ORGANIZATION_VIEW")
  getOrganizationUsers() {
    return this.organizationService.getOrganizationUsers();
  }

  @Get("offices")
  @RequirePermission("ORGANIZATION_VIEW")
  getOffices() {
    return this.organizationService.getOffices();
  }

  @Get("sister-links")
  @RequirePermission("ORGANIZATION_VIEW")
  getSisterLinks(@Query("status") status?: SisterLinkStatus) {
    return this.organizationService.getSisterLinks(status);
  }

  @Post("sister-links/invite")
  @RequirePermission("ORGANIZATION_MANAGE")
  createSisterLink(
    @Body()
    body: {
      inviterOfficeId: string;
      targetOfficeId?: string;
      targetOfficeCode?: string;
      commissionSplitPct?: number;
      autoApprove?: boolean;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.createSisterLink(
      body,
      this.extractActor(request),
    );
  }

  @Post("sister-links/:id/accept")
  @RequirePermission("ORGANIZATION_MANAGE")
  acceptSisterLink(@Param("id") id: string, @Req() request: OrganizationRequest) {
    return this.organizationService.acceptSisterLink(id, this.extractActor(request));
  }

  @Post("sister-links/:id/reject")
  @RequirePermission("ORGANIZATION_MANAGE")
  rejectSisterLink(@Param("id") id: string, @Req() request: OrganizationRequest) {
    return this.organizationService.rejectSisterLink(id, this.extractActor(request));
  }

  @Post("sister-links/:id/end")
  @RequirePermission("ORGANIZATION_MANAGE")
  endSisterLink(@Param("id") id: string, @Req() request: OrganizationRequest) {
    return this.organizationService.endSisterLink(id, this.extractActor(request));
  }

  @Get("offices/packages")
  @RequirePermission("ORGANIZATION_VIEW")
  getOfficePackages() {
    return this.organizationService.getOfficePackages();
  }

  @Get("offices/:id/kpi")
  @RequirePermission("ORGANIZATION_VIEW")
  getOfficeKpi(@Param("id") id: string) {
    return this.organizationService.getOfficeKpi(id);
  }

  @Post("offices")
  @RequirePermission("ORGANIZATION_MANAGE")
  createOffice(
    @Body()
    body: {
      name?: string;
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
      ownerUserId?: string | null;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.createOffice(
      body,
      this.extractActor(request),
    );
  }

  @Patch("offices/:id")
  @RequirePermission("ORGANIZATION_MANAGE")
  updateOffice(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
      ownerUserId?: string | null;
      isActive?: boolean;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.updateOffice(
      id,
      body,
      this.extractActor(request),
    );
  }

  @Patch("offices/:id/package")
  @RequirePermission("ORGANIZATION_MANAGE")
  updateOfficePackage(
    @Param("id") id: string,
    @Body()
    body: {
      packageCode: string;
      durationDays?: number;
      durationMonths?: number;
      reason?: string;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.updateOfficePackage(
      id,
      body,
      this.extractActor(request),
    );
  }

  @Delete("offices/:id")
  @RequirePermission("ORGANIZATION_MANAGE")
  deactivateOffice(@Param("id") id: string, @Req() request: OrganizationRequest) {
    return this.organizationService.deactivateOffice(id, this.extractActor(request));
  }

  @Get("teams")
  @RequirePermission("ORGANIZATION_VIEW")
  getTeams() {
    return this.organizationService.getTeams();
  }

  @Get("teams/:id/kpi")
  @RequirePermission("ORGANIZATION_VIEW")
  getTeamKpi(@Param("id") id: string) {
    return this.organizationService.getTeamKpi(id);
  }

  @Post("teams")
  @RequirePermission("ORGANIZATION_MANAGE")
  createTeam(
    @Body()
    body: {
      officeId?: string;
      name?: string;
      leaderId?: string | null;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.createTeam(
      body,
      this.extractActor(request),
    );
  }

  @Patch("teams/:id")
  @RequirePermission("ORGANIZATION_MANAGE")
  updateTeam(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      isActive?: boolean;
    },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.updateTeam(
      id,
      body,
      this.extractActor(request),
    );
  }

  @Delete("teams/:id")
  @RequirePermission("ORGANIZATION_MANAGE")
  deactivateTeam(@Param("id") id: string, @Req() request: OrganizationRequest) {
    return this.organizationService.deactivateTeam(id, this.extractActor(request));
  }

  @Patch("teams/:id/leader")
  @RequirePermission("ORGANIZATION_MANAGE")
  setTeamLeader(
    @Param("id") id: string,
    @Body() body: { leaderId?: string | null },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.setTeamLeader(
      id,
      body.leaderId || null,
      this.extractActor(request),
    );
  }

  @Post("teams/:id/members")
  @RequirePermission("ORGANIZATION_MANAGE")
  addTeamMember(
    @Param("id") id: string,
    @Body() body: { userId?: string },
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.addTeamMember(
      id,
      body.userId || "",
      this.extractActor(request),
    );
  }

  @Delete("teams/:id/members/:userId")
  @RequirePermission("ORGANIZATION_MANAGE")
  removeTeamMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Req() request: OrganizationRequest,
  ) {
    return this.organizationService.removeTeamMember(
      id,
      userId,
      this.extractActor(request),
    );
  }
}
