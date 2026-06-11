import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Role } from "@prisma/client";

import { AdminAuditLogService } from "./admin-audit-log.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

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

@Controller("admin/audit-log")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AdminAuditLogService) {}

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

  @Get()
  getAuditLogs(
    @Query("action") action: string | undefined,
    @Query("actorId") actorId: string | undefined,
    @Query("targetUserId") targetUserId: string | undefined,
    @Query("entityType") entityType: string | undefined,
    @Query("search") search: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() request: AdminRequest,
  ) {
    return this.auditLogService.getAuditLogs(
      {
        action,
        actorId,
        targetUserId,
        entityType,
        search,
        limit,
      },
      this.extractActor(request),
    );
  }
}