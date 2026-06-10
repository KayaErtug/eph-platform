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
  create(@CurrentUser() user: any, @Param('projectId') projectId: string, @Body() body: any) {
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
      isOffMarket: isOffMarket === 'true' ? true : isOffMarket === 'false' ? false : undefined,
    });
  }

  @Get('pool')
  findPool(@CurrentUser() user: any, @Query('status') status?: UnitStatus, @Query('type') type?: UnitType, @Query('city') city?: string) {
    return this.unitsService.findPool(user, { status, type, city });
  }

  @Get('admin/portfolio-approvals')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  findPortfolioApprovals(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.unitsService.findPortfolioApprovals(user, { status });
  }

  @Get('project/:projectId')
  findByProject(@CurrentUser() user: any, @Param('projectId') projectId: string, @Query('status') status?: UnitStatus, @Query('type') type?: UnitType) {
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

  @Post(':id/submit-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  submitApproval(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.submitApproval(id, user);
  }

  @Post(':id/mark-reviewing')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  markReviewing(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.markReviewing(id, user, body);
  }

  @Post(':id/request-missing-info')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  requestMissingInfo(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.requestMissingInfo(id, user, body);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.approve(id, user, body);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.reject(id, user, body);
  }

  @Post(':id/send-to-pool')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  sendToPool(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.sendToPool(id, user);
  }

  @Post(':id/remove-from-pool')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  removeFromPool(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.removeFromPool(id, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body('status') status: UnitStatus) {
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