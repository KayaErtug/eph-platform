import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Capability, Role } from "@prisma/client";

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
@UseGuards(JwtAuthGuard, RolesGuard)
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
  getStats() {
    return this.adminService.getStats();
  }

  @Get("dashboard-summary")
  getDashboardSummary(@Req() request: AdminRequest) {
    return this.adminService.getDashboardSummary(this.extractActor(request));
  }

  @Get("users")
  getUsers(
    @Query("filter") filter?: "pending" | "approved" | "all",
    @Req() request?: AdminRequest,
  ) {
    return this.adminService.getUsers(filter || "all", this.extractActor(request as AdminRequest));
  }

  @Get("traffic-summary")
  getTrafficSummary(@Req() request: AdminRequest) {
    return this.adminService.getTrafficSummary(this.extractActor(request));
  }

  @Patch("users/:id/approve")
  approveUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.approveUser(id, this.extractActor(request));
  }

  @Delete("users/:id/reject")
  rejectUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.rejectUser(id, this.extractActor(request));
  }

  @Patch("users/:id/suspend")
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
  changeUserRole(
    @Param("id") id: string,
    @Body() body: { role: Role | string },
    @Req() request: AdminRequest,
  ) {
    return this.adminService.changeUserRole(id, body.role, this.extractActor(request));
  }

  @Post("users")
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
  assignMissingMemberCodes(@Req() request: AdminRequest) {
    return this.adminService.assignMissingMemberCodes(this.extractActor(request));
  }

  @Patch("users/:id/member-code")
  assignMemberCodeToUser(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.assignMemberCodeToUser(id, this.extractActor(request));
  }

  @Patch("users/:id/capabilities")
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
  getReferralCodes(@Req() request: AdminRequest) {
    return this.adminService.getReferralCodes(this.extractActor(request));
  }

  @Post("referrals")
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
  deactivateReferralCandidate(@Param("id") id: string) {
    return this.adminService.deactivateReferralCandidate(id);
  }

  @Delete("referrals/:id")
  deleteReferralCandidate(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.deleteReferralCandidate(id, this.extractActor(request));
  }

  @Get("invitations")
  getInvitations() {
    return this.adminService.getInvitations();
  }

  @Get("documents")
  getDocuments(@Query("filter") filter?: "pending" | "approved" | "rejected" | "all") {
    return this.adminService.getDocuments(filter || "pending");
  }

  @Patch("documents/:id/approve")
  approveDocument(@Param("id") id: string) {
    return this.adminService.approveDocument(id);
  }

  @Patch("documents/:id/reject")
  rejectDocument(@Param("id") id: string) {
    return this.adminService.rejectDocument(id);
  }

  @Get("nominations")
  getNominations(@Query("status") status?: string) {
    return this.adminService.getNominations(status);
  }

  @Patch("nominations/:id/status")
  updateNominationStatus(
    @Param("id") id: string,
    @Body() body: { status: string; adminNote?: string },
  ) {
    return this.adminService.updateNominationStatus(id, body.status, body.adminNote);
  }

  @Get("applications")
  getApplications(@Query("status") status?: string) {
    return this.adminService.getApplications(status);
  }

  @Patch("applications/:id/status")
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
  getKatilimTalepleri(@Query("status") status?: string) {
    return this.adminService.getApplicationDashboard(status);
  }

  @Get("katilim-talepleri/:id")
  getKatilimTalebi(@Param("id") id: string) {
    return this.adminService.getApplicationDetail(id);
  }

  @Patch("katilim-talepleri/:id/onayla")
  approveKatilimTalebi(@Param("id") id: string, @Body() body: { adminNote?: string }) {
    return this.adminService.approveApplication(id, body.adminNote);
  }

  @Patch("katilim-talepleri/:id/reddet")
  rejectKatilimTalebi(
    @Param("id") id: string,
    @Body() body: { adminNote?: string; rejectReason?: string },
  ) {
    return this.adminService.rejectApplication(id, body.adminNote, body.rejectReason);
  }

  @Delete("katilim-talepleri/:id")
  deleteKatilimTalebi(@Param("id") id: string, @Req() request: AdminRequest) {
    return this.adminService.deleteApplication(id, this.extractActor(request));
  }

  @Patch("katilim-talepleri/:id/not")
  updateKatilimTalebiNotu(@Param("id") id: string, @Body() body: { adminNote?: string }) {
    return this.adminService.updateApplicationNote(id, body.adminNote || "");
  }
}