import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { TaskRemindersService } from './task-reminders.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PushModule,
  ],
  providers: [TaskRemindersService],
})
export class TaskRemindersModule {}