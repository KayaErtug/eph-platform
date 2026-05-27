import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class TaskRemindersService {
  private readonly logger = new Logger(TaskRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  @Cron('*/5 * * * *')
  async handleTaskReminders() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.BEKLIYOR,
        dueDate: {
          gte: now,
          lte: oneHourLater,
        },
      },
      include: {
        customer: {
          include: {
            owner: true,
          },
        },
      },
    });

    for (const task of tasks) {
      try {
        await this.pushService.sendToUser(task.userId, {
          title: 'EPH Görev Hatırlatma',
          body: `"${task.title}" görevine 1 saatten az kaldı.`,
          url: '/dashboard',
        });

        this.logger.log(`Görev bildirimi gönderildi: ${task.title}`);
      } catch {
        this.logger.error(`Görev bildirimi gönderilemedi: ${task.title}`);
      }
    }
  }
}