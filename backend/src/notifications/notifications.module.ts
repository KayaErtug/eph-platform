import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { NotificationsService } from './notifications.service';
import {
  NotificationsController,
  NotificationSettingsController,
} from './notifications.controller';
import { NotificationEventsService } from './notification-events.service';
import { NotificationScheduler } from './notification-scheduler';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [
    NotificationsService,
    NotificationEventsService,
    NotificationScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
