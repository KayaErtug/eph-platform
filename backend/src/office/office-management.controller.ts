import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OFFICE_LOGO_MAX_BYTES } from './office-profile';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OfficeManagementService } from './office-management.service';

@Controller('office')
@UseGuards(JwtAuthGuard)
export class OfficeManagementController {
  constructor(private readonly service: OfficeManagementService) {}
  @Get('rollout') @UseGuards(RolesGuard) @Roles(Role.SUPER_ADMIN) rollout() { return this.service.rolloutStatus(); }
  @Post('rollout') @UseGuards(RolesGuard) @Roles(Role.SUPER_ADMIN) activate(@Req() req: any, @Body('enabled') enabled: unknown) { return this.service.activate(req.user.id, enabled); }
  @Get('dashboard') dashboard(@Req() req: any, @Query('officeId') officeId?: string) { return this.service.dashboard(req.user.id, officeId); }
  @Get('wallet-options') walletOptions(@Req() req: any) { return this.service.walletOptions(req.user.id); }
  @Post('create') create(@Req() req: any, @Body('name') name: unknown) { return this.service.create(req.user.id, name); }
  @Post('join') join(@Req() req: any, @Body('code') code: unknown) { return this.service.requestJoin(req.user.id, code); }
  @Patch(':id/profile') profile(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.service.updateProfile(req.user.id, id, body); }
  @Post(':id/logo') @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: OFFICE_LOGO_MAX_BYTES, files: 1 } })) logo(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.uploadLogo(req.user.id, id, file); }
  @Delete(':id/logo') removeLogo(@Req() req: any, @Param('id') id: string) { return this.service.removeLogo(req.user.id, id); }
  @Post(':id/spending-mode') mode(@Req() req: any, @Param('id') id: string, @Body('mode') mode: unknown) { return this.service.mode(req.user.id, id, mode); }
  @Get(':id/invite-candidates') inviteCandidates(@Req() req: any, @Param('id') id: string, @Query('q') q: string) { return this.service.inviteCandidates(req.user.id, id, q); }
  @Post(':id/invite') invite(@Req() req: any, @Param('id') id: string, @Body('recipientId') recipientId?: string) { return this.service.invite(req.user.id, id, recipientId); }
  @Post(':id/join-decision') decide(@Req() req: any, @Param('id') id: string, @Body() body: { memberId: string; approve: boolean }) { return this.service.decide(req.user.id, id, body.memberId, body.approve); }
  @Post(':id/transfer') transfer(@Req() req: any, @Param('id') id: string, @Body() body: { memberId?: string; amount?: number; requestId?: string }) { return this.service.transfer(req.user.id, id, body); }

  @Post(':id/teams') createTeam(@Req() req: any, @Param('id') id: string, @Body('name') name: unknown, @Body('leaderId') leaderId?: string) { return this.service.createTeam(req.user.id, id, name, leaderId); }
  @Patch(':id/teams/:teamId') updateTeam(@Req() req: any, @Param('id') id: string, @Param('teamId') teamId: string, @Body() body: any) { return this.service.updateTeam(req.user.id, id, teamId, body); }
  @Delete(':id/teams/:teamId') deleteTeam(@Req() req: any, @Param('id') id: string, @Param('teamId') teamId: string) { return this.service.deleteTeam(req.user.id, id, teamId); }
  @Post(':id/teams/:teamId/members') addTeamMember(@Req() req: any, @Param('id') id: string, @Param('teamId') teamId: string, @Body('userId') userId: string) { return this.service.addTeamMember(req.user.id, id, teamId, userId); }
  @Delete(':id/teams/:teamId/members/:memberId') removeTeamMember(@Req() req: any, @Param('id') id: string, @Param('teamId') teamId: string, @Param('memberId') memberId: string) { return this.service.removeTeamMember(req.user.id, id, teamId, memberId); }
  @Patch(':id/permissions') updatePermissions(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.updatePermissions(req.user.id, id, body); }

  // Task 20: Görev Atama
  @Get(':id/tasks') getOfficeTasks(@Req() req: any, @Param('id') id: string) { return this.service.getOfficeTasks(req.user.id, id); }
  @Post(':id/tasks') createOfficeTask(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.createOfficeTask(req.user.id, id, body); }
  @Patch(':id/tasks/:taskId') updateOfficeTask(@Req() req: any, @Param('id') id: string, @Param('taskId') taskId: string, @Body() body: any) { return this.service.updateOfficeTask(req.user.id, id, taskId, body); }

  // Task 22: Danışman Performansı
  @Get(':id/activities') getActivities(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.service.getConsultantActivities(req.user.id, id, query); }
  @Post(':id/activities') recordActivity(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.recordConsultantActivity(req.user.id, id, body); }

  // Task 25: Tarama/Eşleştirme Logları
  @Get(':id/match-logs') getMatchLogs(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.service.getOfficeMatchLogs(req.user.id, id, query); }
  @Post(':id/match-logs') recordMatchLog(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.recordOfficeMatchLog(req.user.id, id, body); }

  // FAZ 4: Broker Dashboard & Performans Ligi
  @Get('performance-league')
  getPerformanceLeague(
    @Req() req: any,
    @Query('officeId') officeId?: string,
  ) {
    const resolvedOfficeId = officeId || req.user?.officeId;
    return this.service.getBrokerPerformanceLeague(req.user.id, resolvedOfficeId);
  }

  @Get('stale-radar')
  getStaleRadar(
    @Req() req: any,
    @Query('officeId') officeId?: string,
  ) {
    const resolvedOfficeId = officeId || req.user?.officeId;
    return this.service.getStaleRadar(req.user.id, resolvedOfficeId);
  }

  @Get('wallet-discipline')
  getWalletDiscipline(
    @Req() req: any,
    @Query('officeId') officeId?: string,
  ) {
    const resolvedOfficeId = officeId || req.user?.officeId;
    return this.service.getWalletDiscipline(req.user.id, resolvedOfficeId);
  }

  @Get(':id/broker-audit')
  getBrokerDailyAuditReport(@Req() req: any, @Param('id') id: string) {
    return this.service.getBrokerDailyAuditReport(req.user.id, id);
  }

  @Post(':id/broker-audit/send-notification')
  triggerDailyBrokerAuditNotification(@Req() req: any, @Param('id') id: string) {
    return this.service.triggerDailyBrokerAuditNotification(req.user.id, id);
  }
}
