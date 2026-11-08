import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AnnouncementAudience, Role } from "@prisma/client";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AdminAnnouncementsService } from "./admin-announcements.service";

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

@Controller("admin/announcements")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminAnnouncementsController {
  constructor(private readonly announcementsService: AdminAnnouncementsService) {}

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
  getAnnouncements(
    @Query("status") status?: string,
    @Query("audience") audience?: string,
  ) {
    return this.announcementsService.getAnnouncements({ status, audience });
  }

  @Post()
  createAnnouncement(
    @Body()
    body: {
      title?: string;
      content?: string;
      audience?: AnnouncementAudience | string;
      isActive?: boolean;
      startsAt?: string;
      endsAt?: string | null;
    },
    @Req() request?: AdminRequest,
  ) {
    return this.announcementsService.createAnnouncement(
      body,
      this.extractActor(request as AdminRequest),
    );
  }

  @Patch(":id")
  updateAnnouncement(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      audience?: AnnouncementAudience | string;
      isActive?: boolean;
      startsAt?: string;
      endsAt?: string | null;
    },
    @Req() request?: AdminRequest,
  ) {
    return this.announcementsService.updateAnnouncement(
      id,
      body,
      this.extractActor(request as AdminRequest),
    );
  }

  @Delete(":id")
  deleteAnnouncement(@Param("id") id: string, @Req() request?: AdminRequest) {
    return this.announcementsService.deleteAnnouncement(
      id,
      this.extractActor(request as AdminRequest),
    );
  }
}