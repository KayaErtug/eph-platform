import { Module } from '@nestjs/common';
import { TextSafetyModule } from '../text-safety/text-safety.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule, PushModule, TextSafetyModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}