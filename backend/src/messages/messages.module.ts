import { Module } from '@nestjs/common';
import { TextSafetyModule } from '../text-safety/text-safety.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule, NotificationsModule, TextSafetyModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
