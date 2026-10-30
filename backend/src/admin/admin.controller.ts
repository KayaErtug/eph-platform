import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { Capability, Prisma, Role } from "@prisma/client";

type AdminRequestUser = {
  id?: string;
  sub?: string;
  userId?: string;
  role?: Role | string;
  email?: string;
};

type AdminRequest = Request & {
  user?: AdminRequestUser;
};

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private extractActor(request: AdminRequest) {
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

  @Get("stats")
  @RequirePermission("REPORT_VIEW")
  getStats(@Req() request: AdminRequest) {
    return this.adminService.getStats(this.extractActor(request));
  }

  @Get("dashboard-summary")
  @RequirePermission("REPORT_VIEW")
  getDashboardSummary(@Req() request: AdminRequest) {
    return this.adminService.getDashboardSummary(this.extractActor(request));
  }

  @Get("users")
  @RequirePermission("USER_VIEW")
  getUsers(
    @Query("filter") filter?: "pending" | "approved" | "all",
    @Req() request?: AdminRequest,
  ) {
    return this.adminService.getUsers(filter || "all", this.extractActor(request as AdminRequest));
  }

  @Get("traffic-summary")
  @RequirePermission("REPORT_VIEW")
  getTrafficSummary(@Req() request: AdminRequest) {
    return this.adminService.getTrafficSummary(this.extractActor(request));
  }

  @Patch("users/:id/approve")
  @RequirePermission("USER_APPROVE")
  approveUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.approveUser(id, this.extractActor(request));
  }

  @Delete("users/:id/reject")
  @RequirePermission("USER_DELETE")
  rejectUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.rejectUser(id, this.extractActor(request));
  }

  @Patch("users/:id/suspend")
  @RequirePermission("USER_SUSPEND")
  suspendUser(
    @Param("id") id: string,
    @Body()
    body: {
      reason?: string;
      duration?: "ONE_HOUR" | "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH" | "PERMANENT";
    },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.suspendUser(id, this.extractActor(request), body);
  }

  @Patch("users/:id/role")
  @RequirePermission("ROLE_CHANGE")
  changeUserRole(
    @Param("id") id: string,
    @Body() body: { role: Role | string },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.changeUserRole(id, body.role, this.extractActor(request));
  }

  @Post("users")
  @RequirePermission("USER_CREATE")
  createUser(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      role: Role | string;
    },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.createUser(body, this.extractActor(request));
  }

  @Patch("users/member-codes/missing")
  @RequirePermission("MEMBER_CODE_MANAGE")
  assignMissingMemberCodes(@Req() request: AdminRequest) {
    return this.adminService.assignMissingMemberCodes(this.extractActor(request));
  }

  @Patch("users/:id/member-code")
  @RequirePermission("MEMBER_CODE_MANAGE")
  assignMemberCodeToUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.assignMemberCodeToUser(id, this.extractActor(request));
  }

  @Patch("users/:id/capabilities")
  @RequirePermission("CAPABILITY_MANAGE")
  updateUserCapabilities(
    @Param("id") id: string,
    @Body() body: { capabilities?: Array<Capability | string> },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateUserCapabilities(
      id,
      body.capabilities || [],
      this.extractActor(request),
    );
  }

  @Get("referrals")
  @RequirePermission("REFERRAL_VIEW")
  getReferralCodes(@Req() request: AdminRequest) {
    return this.adminService.getReferralCodes(this.extractActor(request));
  }

  @Post("referrals")
  @RequirePermission("REFERRAL_MANAGE")
  createReferralCandidate(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: Role;
    },
  ) {
    return this.adminService.createReferralCandidate(body);
  }

  @Patch("referrals/:id/deactivate")
  @RequirePermission("REFERRAL_MANAGE")
  deactivateReferralCandidate(@Param("id") id: string) {
    return this.adminService.deactivateReferralCandidate(id);
  }

  @Delete("referrals/:id")
  @RequirePermission("REFERRAL_MANAGE")
  deleteReferralCandidate(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.deleteReferralCandidate(id, this.extractActor(request));
  }

  @Get("invitations")
  @RequirePermission("INVITATION_VIEW")
  getInvitations() {
    return this.adminService.getInvitations();
  }

  @Get("documents")
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermission("DOCUMENT_VIEW")
  getDocuments(
    @Req() request: AdminRequest,
    @Query("filter") filter?: "pending" | "approved" | "rejected" | "all",
  ) {
    return this.adminService.getDocuments(filter || "pending", this.extractActor(request));
  }

  @Patch("documents/:id/approve")
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermission("DOCUMENT_APPROVE")
  approveDocument(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.approveDocument(id, this.extractActor(request));
  }

  @Patch("documents/:id/reject")
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermission("DOCUMENT_REJECT")
  rejectDocument(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.rejectDocument(id, this.extractActor(request));
  }

  @Get("nominations")
  @RequirePermission("NOMINATION_VIEW")
  getNominations(@Query("status") status?: string) {
    return this.adminService.getNominations(status);
  }

  @Patch("nominations/:id/status")
  @RequirePermission("NOMINATION_MANAGE")
  updateNominationStatus(
    @Param("id") id: string,
    @Body() body: { status: string; adminNote?: string },
  ) {
    return this.adminService.updateNominationStatus(id, body.status, body.adminNote);
  }

  @Get("applications")
  @RequirePermission("APPLICATION_VIEW")
  getApplications(@Query("status") status?: string) {
    return this.adminService.getApplications(status);
  }

  @Patch("applications/:id/status")
  @RequirePermission("APPLICATION_REVIEW")
  updateApplicationStatus(
    @Param("id") id: string,
    @Body() body: { status: string; adminNote?: string; rejectReason?: string },
  ) {
    return this.adminService.updateApplicationStatus(
      id,
      body.status,
      body.adminNote,
      body.rejectReason,
    );
  }

  @Get("katilim-talepleri")
  @RequirePermission("APPLICATION_VIEW")
  getKatilimTalepleri(@Query("status") status?: string) {
    return this.adminService.getApplicationDashboard(status);
  }

  @Get("katilim-talepleri/:id")
  @RequirePermission("APPLICATION_VIEW")
  getKatilimTalebi(@Param("id") id: string) {
    return this.adminService.getApplicationDetail(id);
  }

  @Patch("katilim-talepleri/:id/onayla")
  @RequirePermission("APPLICATION_REVIEW")
  approveKatilimTalebi(@Param("id") id: string, @Body() body: { adminNote?: string }) {
    return this.adminService.approveApplication(id, body.adminNote);
  }

  @Patch("katilim-talepleri/:id/reddet")
  @RequirePermission("APPLICATION_REVIEW")
  rejectKatilimTalebi(
    @Param("id") id: string,
    @Body() body: { adminNote?: string; rejectReason?: string },
  ) {
    return this.adminService.rejectApplication(id, body.adminNote, body.rejectReason);
  }

  @Delete("katilim-talepleri/:id")
  @RequirePermission("APPLICATION_DELETE")
  deleteKatilimTalebi(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.deleteApplication(id, this.extractActor(request));
  }

  @Patch("katilim-talepleri/:id/not")
  @RequirePermission("APPLICATION_REVIEW")
  updateKatilimTalebiNotu(@Param("id") id: string, @Body() body: { adminNote?: string }) {
    return this.adminService.updateApplicationNote(id, body.adminNote || "");
  }

  @Get("users/:id/membership-packages")
  @Roles(Role.SUPER_ADMIN)
  getUserMembershipPackages(
    @Param("id") id: string,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.getUserMembershipPackages(
      id,
      this.extractActor(request),
    );
  }

  @Patch("users/:id/membership")
  @Roles(Role.SUPER_ADMIN)
  updateUserMembership(
    @Param("id") id: string,
    @Body()
    body: {
      paketKodu: string;
      gunSayisi?: number;
      aySayisi?: number;
      gerekce?: string;
    },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateUserMembership(
      id,
      body,
      this.extractActor(request),
    );
  }

  @Patch("users/:id/trial-extend")
  @RequirePermission("TRIAL_EXTEND")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  extendUserTrial(
    @Param("id") id: string,
    @Body()
    body: {
      gunSayisi: number;
      gerekce?: string;
    },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.extendUserTrial(
      id,
      body,
      this.extractActor(request),
    );
  }



  @Get("system-settings")
  @Roles(Role.SUPER_ADMIN)
  getSystemSettings(@Req() request: AdminRequest) {
    return this.adminService.getSystemSettings(this.extractActor(request));
  }

  @Get("trial-policy")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getTrialPolicy() {
    return this.adminService.getTrialPolicy();
  }

  @Patch("system-settings/:key")
  @Roles(Role.SUPER_ADMIN)
  updateSystemSetting(
    @Param("key") key: string,
    @Body() body: { value: number | string | null | number[]; description?: string },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateSystemSetting(key, body, this.extractActor(request));
  }

  @Get("permission-center/definitions")
  @Roles(Role.SUPER_ADMIN)
  getPermissionDefinitions(
    @Req() request: AdminRequest,
  ) {
    return this.adminService.getPermissionDefinitions(
      this.extractActor(request),
    );
  }

  @Get("permission-center/users/:id")
  @Roles(Role.SUPER_ADMIN)
  getUserPermissionProfile(
    @Param("id") id: string,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.getUserPermissionProfile(
      id,
      this.extractActor(request),
    );
  }

  @Patch("permission-center/users/:id/permissions/:permissionKey")
  @Roles(Role.SUPER_ADMIN)
  updateUserPermissionOverride(
    @Param("id") id: string,
    @Param("permissionKey") permissionKey: string,
    @Body()
    body: {
      enabled?: boolean | null;
      numericLimit?: number | null;
      validFrom?: string | null;
      validUntil?: string | null;
      metadata?: Prisma.InputJsonObject | null;
    },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.updateUserPermissionOverride(
      id,
      permissionKey,
      body,
      this.extractActor(request),
    );
  }

  @Put("permission-center/users/:id/permissions")
  @Roles(Role.SUPER_ADMIN)
  setUserPermissionsBulk(
    @Param("id") id: string,
    @Body() body: { permissions?: Record<string, boolean> },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.setUserPermissionsBulk(
      id,
      body,
      this.extractActor(request),
    );
  }

  @Delete("permission-center/users/:id/permissions/:permissionKey")
  @Roles(Role.SUPER_ADMIN)
  deleteUserPermissionOverride(
    @Param("id") id: string,
    @Param("permissionKey") permissionKey: string,
    @Req() request: AdminRequest,
  ) {
    return this.adminService.deleteUserPermissionOverride(
      id,
      permissionKey,
      this.extractActor(request),
    );
  }

}
