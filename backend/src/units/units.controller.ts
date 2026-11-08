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
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnitsService } from './units.service';
import type { PoolPublicationInput } from './pool-publication.service';

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

  @Get('my')
  findMy(
    @CurrentUser() user: any,
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
    @Query('city') city?: string,
    @Query('isOffMarket') isOffMarket?: string,
    @Query('ownerOnly') ownerOnlyParam?: string,
    @Query('officeId') officeId?: string,
    @Query('advisorId') advisorId?: string,
  ) {
    const isSuper = user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
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
      ownerOnly: isSuper ? (ownerOnlyParam === 'true') : true,
      officeId,
      advisorId,
    });
  }

  @Get('quality-summary')
  findQualitySummary(@CurrentUser() user: any) {
    return this.unitsService.getQualitySummary(user);
  }

  @Get('pool/wallet')
  findPoolWallet(@CurrentUser() user: any) {
    return this.unitsService.getPoolWallet(user);
  }

  @Get('pool')
  findPool(
    @CurrentUser() user: any,
    @Query('status') status?: UnitStatus,
    @Query('type') type?: UnitType,
    @Query('city') city?: string,
  ) {
    return this.unitsService.findPool(user, { status, type, city });
  }

  @Get('pool/:id/contact-quote')
  poolContactQuote(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.poolContactQuote(id, user);
  }

  @Post('pool/:id/location')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  poolLocation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.poolLocation(id, user);
  }

  @Post('pool/:id/private-info')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  poolPrivateInfo(@Param('id') id: string, @CurrentUser() user: any, @Body() body?: { expectedCostPk?: number; expectedChargeUserId?: string }) {
    return this.unitsService.poolPrivateInfo(id, user, body?.expectedCostPk, body?.expectedChargeUserId);
  }

  @Post('pool/:id/contact/:channel')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  poolContact(
    @Param('id') id: string,
    @Param('channel') channel: string,
    @CurrentUser() user: any,
  ) {
    return this.unitsService.poolContact(id, user, channel);
  }

  @Post('pool/:id/share')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  createPoolShareLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.createPoolShareLink(id, user);
  }

  @Post('portfolio/:id/share')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  createPortfolioShareLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.createPortfolioShareLink(id, user);
  }

  @Get('admin/portfolio-approvals')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  findPortfolioApprovals(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.unitsService.findPortfolioApprovals(user, { status });
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

  @Get(':id/publication-quote')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  publicationQuote(@Param('id') id: string, @CurrentUser() user: any, @Query() query: PoolPublicationInput) {
    return this.unitsService.publicationQuote(id, user, query);
  }

  @Post(':id/submit-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
  submitApproval(@Param('id') id: string, @CurrentUser() user: any, @Body() body?: PoolPublicationInput) {
    return this.unitsService.submitApproval(id, user, body);
  }

  @Post(':id/mark-reviewing')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  markReviewing(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.markReviewing(id, user, body);
  }

  @Post(':id/request-missing-info')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  requestMissingInfo(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.requestMissingInfo(id, user, body);
  }

  @Post(':id/approve')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.approve(id, user, body);
  }

  @Post(':id/reject')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.unitsService.reject(id, user, body);
  }

  @Post(':id/send-to-pool')
  @RequirePermission("PORTFOLIO_MODERATE")
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  sendToPool(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.sendToPool(id, user);
  }

  @Post(':id/remove-from-pool')
  @UseGuards(RolesGuard)
  @Roles(Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI)
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
