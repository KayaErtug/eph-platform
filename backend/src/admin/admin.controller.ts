import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from "@nestjs/common";
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
  getStats() {
    return this.adminService.getStats();
  }

  @Get("users")
  getUsers(@Query("filter") filter?: "pending" | "approved" | "all") {
    return this.adminService.getUsers(filter || "all");
  }

  @Patch("users/:id/approve")
  approveUser(@Param("id") id: string) {
    return this.adminService.approveUser(id);
  }

  @Delete("users/:id/reject")
  rejectUser(@Param("id") id: string) {
    return this.adminService.rejectUser(id);
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
}