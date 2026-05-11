import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, UnitStatus, UnitType } from '@prisma/client';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('project/:projectId')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN)
  create(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: any,
  ) {
    return this.unitsService.create(user.id, projectId, body);
  }

  @Get()
  findAll(
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
    @Query('city') city?: string,
  ) {
    return this.unitsService.findAll({ status, type, city });
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
  ) {
    return this.unitsService.findByProject(projectId, { status, type });
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('status') status: UnitStatus,
  ) {
    return this.unitsService.updateStatus(id, user.id, status);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.update(id, user.id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.remove(id, user.id);
  }
}