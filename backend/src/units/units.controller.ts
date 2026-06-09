import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, UnitStatus, UnitType } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnitsService } from './units.service';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('project/:projectId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  create(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: any,
  ) {
    return this.unitsService.create(user, projectId, body);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
    @Query('city') city?: string,
    @Query('isOffMarket') isOffMarket?: string,
  ) {
    return this.unitsService.findAll(user, {
      status,
      type,
      city,
      isOffMarket:
        isOffMarket === 'true'
          ? true
          : isOffMarket === 'false'
            ? false
            : undefined,
    });
  }

  @Get('project/:projectId')
  findByProject(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
  ) {
    return this.unitsService.findByProject(user, projectId, { status, type });
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.unitsService.findOne(user, id);
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  verify(
    @Param('id') id: string,
    @Body()
    body: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) {
    return this.unitsService.verifyUnit(id, body);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('status') status: UnitStatus,
  ) {
    return this.unitsService.updateStatus(id, user, status);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.update(id, user, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.remove(id, user);
  }
}