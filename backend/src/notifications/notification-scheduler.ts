import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CronJob } from 'cron';
import { NativePushService } from '../push/native-push.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsService } from './notifications.service';

/** Scope scheduling to notifications. Enabling global discovery would also activate
 * unrelated dormant account-deletion and market jobs in the existing application. */
@Injectable()
export class NotificationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationScheduler.name);
  private jobs: CronJob[] = [];
  constructor(
    private readonly events: NotificationEventsService,
    private readonly inbox: NotificationsService,
    private readonly native: NativePushService,
  ) {}

  onModuleInit() {
    const tasks: Array<[string, string, () => Promise<unknown>]> = [
      ['events', '* * * * *', () => this.events.collect()],
      ['push-retry', '* * * * *', () => this.inbox.retryPush()],
      ['expo-receipts', '*/2 * * * *', () => this.native.collectReceipts()],
      [
        'membership-expiry',
        '0 9 * * *',
        () => this.events.expiringMemberships(),
      ],
    ];
    this.jobs = tasks.map(([name, cronTime, run]) =>
      CronJob.from({
        cronTime,
        timeZone: 'Europe/Istanbul',
        start: true,
        waitForCompletion: true,
        onTick: async () => {
          try {
            await run();
          } catch {
            this.logger.error({
              event: 'EPH_NOTIFICATION_JOB',
              name,
              code: 'JOB_FAILED',
            });
          }
        },
      }),
    );
  }

  async onModuleDestroy() {
    await Promise.all(this.jobs.map((job) => job.stop()));
  }
}
