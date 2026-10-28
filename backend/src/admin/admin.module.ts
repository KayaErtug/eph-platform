import { Module } from '@nestjs/common';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

import { MailService } from '../mail.service';
import { MembershipModule } from '../membership/membership.module';

import { AdminAuditLogController } from './audit-log/admin-audit-log.controller';
import { AdminAuditLogService } from './audit-log/admin-audit-log.service';

import { AdminAnnouncementsController } from './announcements/admin-announcements.controller';
import { AdminAnnouncementsService } from './announcements/admin-announcements.service';

@Module({
  imports: [MembershipModule],
  controllers: [
    AdminController,
    AdminAuditLogController,
    AdminAnnouncementsController,
  ],
  providers: [
    AdminService,
    MailService,
    AdminAuditLogService,
    AdminAnnouncementsService,
  ],
  exports: [
    AdminService,
    AdminAuditLogService,
    AdminAnnouncementsService,
  ],
})
export class AdminModule {}