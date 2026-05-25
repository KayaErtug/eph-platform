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

  async sendToUser(userId: string, payload: { title: string; body: string; url?: string }) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

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
        } catch (error) {
          console.error('Push gönderim hatası:', error);
        }
      }),
    );

    return { ok: true };
  }
}