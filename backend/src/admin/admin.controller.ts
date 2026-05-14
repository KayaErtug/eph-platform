import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  getStats() { return this.adminService.getStats(); }

  @Get("users")
  getUsers(@Query("filter") filter?: "pending" | "approved" | "all") {
    return this.adminService.getUsers(filter || "all");
  }

  @Patch("users/:id/approve")
  approveUser(@Param("id") id: string) { return this.adminService.approveUser(id); }

  @Delete("users/:id/reject")
  rejectUser(@Param("id") id: string) { return this.adminService.rejectUser(id); }

  @Patch("users/:id/suspend")
  suspendUser(@Param("id") id: string) { return this.adminService.suspendUser(id); }

  @Patch("users/:id/role")
  changeUserRole(@Param("id") id: string, @Body() body: { role: string }) {
    return this.adminService.changeUserRole(id, body.role);
  }

  @Post("users")
  createUser(@Body() body: {
    firstName: string; lastName: string; email: string;
    phone: string; password: string; role: string;
  }) { return this.adminService.createUser(body); }

  @Get("invitations")
  getInvitations() { return this.adminService.getInvitations(); }

  @Get("documents")
  getDocuments(@Query("filter") filter?: "pending" | "approved" | "rejected" | "all") {
    return this.adminService.getDocuments(filter || "pending");
  }

  @Patch("documents/:id/approve")
  approveDocument(@Param("id") id: string) { return this.adminService.approveDocument(id); }

  @Patch("documents/:id/reject")
  rejectDocument(@Param("id") id: string) { return this.adminService.rejectDocument(id); }

  @Get("nominations")
  getNominations(@Query("status") status?: string) { return this.adminService.getNominations(status); }

  @Patch("nominations/:id/status")
  updateNominationStatus(@Param("id") id: string, @Body() body: { status: string; adminNote?: string }) {
    return this.adminService.updateNominationStatus(id, body.status, body.adminNote);
  }

  @Get("applications")
  getApplications(@Query("status") status?: string) { return this.adminService.getApplications(status); }

  @Patch("applications/:id/status")
  updateApplicationStatus(@Param("id") id: string, @Body() body: { status: string; adminNote?: string }) {
    return this.adminService.updateApplicationStatus(id, body.status, body.adminNote);
  }
}