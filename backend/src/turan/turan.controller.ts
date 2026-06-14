import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TuranService } from './turan.service';

@Controller('turan-quotes')
@UseGuards(JwtAuthGuard)
export class TuranController {
  constructor(private readonly turanService: TuranService) {}

  @Get('active')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  findActive() {
    return this.turanService.findActive();
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  findAll(@CurrentUser() user: any) {
    return this.turanService.findAll(user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.turanService.create(user, body);
  }

  @Post('defaults')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  loadDefaults(@CurrentUser() user: any) {
    return this.turanService.loadDefaults(user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.turanService.update(user, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.turanService.remove(user, id);
  }
}
