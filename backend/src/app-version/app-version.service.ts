import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NativePushService } from '../push/native-push.service';

export const APP_LATEST_VERSION_KEY = 'APP_LATEST_VERSION';
export const APP_MIN_VERSION_KEY = 'APP_MIN_VERSION';
export const APP_RELEASE_NOTES_KEY = 'APP_RELEASE_NOTES';
export const APP_FORCE_UPDATE_KEY = 'APP_FORCE_UPDATE';
export const APP_STORE_URL_ANDROID_KEY = 'APP_STORE_URL_ANDROID';
export const APP_STORE_URL_IOS_KEY = 'APP_STORE_URL_IOS';

const DEFAULT_LATEST_VERSION = '1.0.25';
const DEFAULT_MIN_VERSION = '1.0.0';
const DEFAULT_RELEASE_NOTES = 'Performans iyileştirmeleri, çoklu mesleki belge merkezi ve hata düzeltmeleri.';
const DEFAULT_STORE_ANDROID = 'https://play.google.com/store/apps/details?id=com.emlakportfoyhavuzu.app';
const DEFAULT_STORE_IOS = 'https://apps.apple.com/app/emlak-portf%C3%B6y-havuzu/id6670783350';

@Injectable()
export class AppVersionService {
  private readonly logger = new Logger(AppVersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nativePush: NativePushService,
  ) {}

  async getPublicAppVersion() {
    const keys = [
      APP_LATEST_VERSION_KEY,
      APP_MIN_VERSION_KEY,
      APP_RELEASE_NOTES_KEY,
      APP_FORCE_UPDATE_KEY,
      APP_STORE_URL_ANDROID_KEY,
      APP_STORE_URL_IOS_KEY,
    ];

    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map = new Map<string, any>();
    for (const row of rows) {
      const v = (row.valueJson as any)?.value ?? row.valueJson;
      map.set(row.key, v);
    }

    return {
      latestVersion: String(map.get(APP_LATEST_VERSION_KEY) || DEFAULT_LATEST_VERSION),
      minVersion: String(map.get(APP_MIN_VERSION_KEY) || DEFAULT_MIN_VERSION),
      releaseNotes: String(map.get(APP_RELEASE_NOTES_KEY) || DEFAULT_RELEASE_NOTES),
      forceUpdate: Boolean(map.get(APP_FORCE_UPDATE_KEY) || false),
      storeUrlAndroid: String(map.get(APP_STORE_URL_ANDROID_KEY) || DEFAULT_STORE_ANDROID),
      storeUrlIos: String(map.get(APP_STORE_URL_IOS_KEY) || DEFAULT_STORE_IOS),
      checkedAt: new Date().toISOString(),
    };
  }

  async updateVersionSettings(
    dto: {
      latestVersion?: string;
      minVersion?: string;
      releaseNotes?: string;
      forceUpdate?: boolean;
      storeUrlAndroid?: string;
      storeUrlIos?: string;
    },
    actorId?: string,
  ) {
    const updates: Array<{ key: string; value: any; description: string }> = [];

    if (dto.latestVersion !== undefined) {
      updates.push({
        key: APP_LATEST_VERSION_KEY,
        value: String(dto.latestVersion).trim(),
        description: 'En son yayınlanan mobil uygulama sürümü',
      });
    }

    if (dto.minVersion !== undefined) {
      updates.push({
        key: APP_MIN_VERSION_KEY,
        value: String(dto.minVersion).trim(),
        description: 'Zorunlu en düşük mobil uygulama sürümü',
      });
    }

    if (dto.releaseNotes !== undefined) {
      updates.push({
        key: APP_RELEASE_NOTES_KEY,
        value: String(dto.releaseNotes).trim(),
        description: 'Yeni sürüm yenilik notları',
      });
    }

    if (dto.forceUpdate !== undefined) {
      updates.push({
        key: APP_FORCE_UPDATE_KEY,
        value: Boolean(dto.forceUpdate),
        description: 'Zorunlu güncelleme modu',
      });
    }

    if (dto.storeUrlAndroid !== undefined) {
      updates.push({
        key: APP_STORE_URL_ANDROID_KEY,
        value: String(dto.storeUrlAndroid).trim(),
        description: 'Google Play Mağaza URL',
      });
    }

    if (dto.storeUrlIos !== undefined) {
      updates.push({
        key: APP_STORE_URL_IOS_KEY,
        value: String(dto.storeUrlIos).trim(),
        description: 'App Store Mağaza URL',
      });
    }

    for (const item of updates) {
      await this.prisma.systemSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          valueJson: { value: item.value },
          description: item.description,
          updatedById: actorId,
        },
        update: {
          valueJson: { value: item.value },
          description: item.description,
          updatedById: actorId,
        },
      });
    }

    return this.getPublicAppVersion();
  }

  async broadcastUpdateNotification(
    dto: {
      title?: string;
      body?: string;
    },
    actorId?: string,
  ) {
    const info = await this.getPublicAppVersion();

    const title = (dto.title || `🚀 EPH Güncellendi! (v${info.latestVersion})`).trim();
    const body = (
      dto.body ||
      info.releaseNotes ||
      'Yeni sürüm Google Play mağazasında yayında. Yeniliklerden yararlanmak için hemen güncelleyin.'
    ).trim();

    const result = await this.nativePush.broadcast({
      title,
      body,
      url: info.storeUrlAndroid,
      category: 'announcements',
    });

    this.logger.log(`Toplu sürüm güncelleme bildirimi gönderildi. Cihaz sayısı: ${result.totalDevices}, Başarılı: ${result.sentCount}`);

    return {
      ok: true,
      sentCount: result.sentCount,
      totalDevices: result.totalDevices,
      title,
      body,
    };
  }
}
