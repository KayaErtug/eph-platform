import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KontorService } from './kontor.service';

@Controller('kontor')
@UseGuards(JwtAuthGuard)
export class KontorController {
  constructor(private readonly kontorService: KontorService) {}

  private extractActor(user: any, request: Request) {
    return {
      id: user?.id || user?.sub || user?.userId,
      role: user?.role,
      email: user?.email,
      ipAddress:
        request.headers['x-forwarded-for']
          ?.toString()
          .split(',')[0]
          ?.trim() || request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
    };
  }

  @Get('cuzdan')
  getCuzdan(@CurrentUser() user: any) {
    return this.kontorService.getCuzdan(user.id);
  }

  @Get('hareketler')
  getHareketler(@CurrentUser() user: any) {
    return this.kontorService.getHareketler(user.id);
  }

  @Get('ozet')
  getOzet(@CurrentUser() user: any) {
    return this.kontorService.getOzet(user.id);
  }

  @Get('paket')
  getPaket(@CurrentUser() user: any) {
    return this.kontorService.getPaket(user.id);
  }

  @Get('hediye-havuzu')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getHediyeHavuzu(
    @CurrentUser() user: any,
    @Req() request: Request,
  ) {
    return this.kontorService.getHediyeHavuzu(
      this.extractActor(user, request),
    );
  }

  @Post('hediye-havuzu/yukle')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  yukleHediyeHavuzu(
    @CurrentUser() user: any,
    @Req() request: Request,
    @Body()
    body: {
      miktar: number;
      aciklama?: string;
    },
  ) {
    return this.kontorService.yukleHediyeHavuzu(
      this.extractActor(user, request),
      body,
    );
  }

  @Post('hediye-gonder')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  gonderHediyeKontor(
    @CurrentUser() user: any,
    @Req() request: Request,
    @Body()
    body: {
      aliciId: string;
      miktar: number;
      aciklama?: string;
    },
  ) {
    return this.kontorService.gonderHediyeKontor(
      this.extractActor(user, request),
      body,
    );
  }
}
