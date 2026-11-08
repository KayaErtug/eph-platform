import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppVersionService } from './app-version.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

type AdminRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
    role?: Role | string;
  };
};

@Controller()
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  /**
   * Mobil uygulamanın açılışta ve ön plana gelişte çağırdığı genel/halka açık sürüm kontrol endpoint'i.
   */
  @Get('app-version')
  getPublicVersion() {
    return this.appVersionService.getPublicAppVersion();
  }

  /**
   * Süper Admin için sürüm ayarlarını sorgulama.
   */
  @Get('admin/app-version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAdminVersion() {
    return this.appVersionService.getPublicAppVersion();
  }

  /**
   * Süper Admin için sürüm ayarlarını güncelleme.
   */
  @Patch('admin/app-version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateVersion(@Body() body: any, @Req() req: AdminRequest) {
    const actorId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.appVersionService.updateVersionSettings(body, actorId);
  }

  /**
   * Süper Admin için tüm kullanıcılara tek tıkla toplu push bildirimi tetikleme.
   */
  @Post('admin/app-version/broadcast-push')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  broadcastPush(@Body() body: any, @Req() req: AdminRequest) {
    const actorId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.appVersionService.broadcastUpdateNotification(body, actorId);
  }
}
