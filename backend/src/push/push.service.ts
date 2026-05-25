import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webPush from 'web-push';

type BrowserPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:mustafaertugkaya@gmail.com';

    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  getPublicKey() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
    };
  }

  async saveSubscription(userId: string, subscription: BrowserPushSubscription) {
    return this.prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async sendTest(userId?: string) {
    let targetUserId = userId;

    if (!targetUserId) {
      const lastSubscription = await this.prisma.pushSubscription.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          userId: true,
        },
      });

      targetUserId = lastSubscription?.userId;
    }

    if (!targetUserId) {
      return {
        ok: false,
        message: 'Kayıtlı bildirim aboneliği bulunamadı.',
      };
    }

    return this.sendToUser(targetUserId, {
      title: 'EPH Platform',
      body: 'Test bildirimi başarıyla gönderildi.',
      url: '/messages',
    });
  }

  async sendToUser(userId: string, payload: PushPayload) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return {
        ok: false,
        message: 'Bu kullanıcı için kayıtlı bildirim aboneliği yok.',
      };
    }

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      subscriptions.map(async (item) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: item.endpoint,
              keys: {
                p256dh: item.p256dh,
                auth: item.auth,
              },
            },
            JSON.stringify(payload),
          );

          successCount += 1;
        } catch (error: any) {
          failCount += 1;

          console.error('Push gönderim hatası:', {
            endpoint: item.endpoint,
            statusCode: error?.statusCode,
            body: error?.body,
            message: error?.message,
          });
        }
      }),
    );

    return {
      ok: successCount > 0,
      successCount,
      failCount,
    };
  }
}