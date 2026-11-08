import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, NetworkNotification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import {
  notificationCategory,
  SETTINGS_DEFAULTS,
  SETTINGS_PREFIX,
} from './notification-settings';

export type NotificationInput = {
  type: string;
  priority: 'ACIL' | 'ONEMLI' | 'BILGI';
  title: string;
  body: string;
  actionUrl: string;
  /** Globally unique source event + recipient; omitted for manual one-off notifications. */
  eventKey?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async notify(
    userId: string,
    input: NotificationInput,
    transaction?: Prisma.TransactionClient,
  ) {
    if (
      !userId ||
      !input.type?.trim() ||
      !input.title?.trim() ||
      !input.body?.trim() ||
      !['ACIL', 'ONEMLI', 'BILGI'].includes(input.priority) ||
      !/^\/(?!\/)/.test(input.actionUrl) ||
      /[\r\n\\]/.test(input.actionUrl)
    ) {
      throw new BadRequestException('Bildirim bilgileri geçersiz.');
    }
    const data = {
      userId,
      type: input.type,
      priority: input.priority,
      title: input.title.trim(),
      message: input.body.trim(),
      actionUrl: input.actionUrl,
      eventKey: input.eventKey,
      pushStatus: 'PENDING',
    };
    // Domain hooks persist atomically; the dispatcher cannot see the row until commit.
    if (transaction) {
      const record = input.eventKey
        ? await transaction.networkNotification.upsert({
            where: { eventKey: input.eventKey },
            create: data,
            update: {},
          })
        : await transaction.networkNotification.create({ data });
      return this.serialize(record);
    }
    let record: NetworkNotification;
    try {
      record = await this.prisma.networkNotification.create({ data });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002' ||
        !input.eventKey
      )
        throw error;
      const existing = await this.prisma.networkNotification.findUnique({
        where: { eventKey: input.eventKey },
      });
      if (!existing || existing.userId !== userId) throw error;
      record = existing;
    }
    // Inbox persistence succeeds even if Expo, VAPID or the network is unavailable.
    await this.deliver(record).catch(() =>
      this.logger.warn({
        event: 'EPH_PUSH',
        phase: 'delivery',
        notificationId: record.id,
        code: 'DELIVERY_DEFERRED',
      }),
    );
    return this.serialize(record);
  }

  async getSettings(userId: string) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: SETTINGS_PREFIX + userId },
    });
    const stored = row?.valueJson as Record<string, unknown> | undefined;
    return Object.fromEntries(
      Object.entries(SETTINGS_DEFAULTS).map(([key, value]) => [
        key,
        typeof stored?.[key] === 'boolean' ? stored[key] : value,
      ]),
    ) as typeof SETTINGS_DEFAULTS;
  }

  async updateSettings(userId: string, body: unknown) {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.entries(body).some(
        ([key, value]) =>
          !Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, key) ||
          typeof value !== 'boolean',
      )
    ) {
      throw new BadRequestException(
        'Bildirim ayarları boolean alanlardan oluşmalıdır.',
      );
    }
    // Atomic merge prevents two devices updating different preferences from losing updates.
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SETTINGS_PREFIX + userId}))`;
      const row = await tx.systemSetting.findUnique({
        where: { key: SETTINGS_PREFIX + userId },
      });
      const valueJson = {
        ...SETTINGS_DEFAULTS,
        ...((row?.valueJson as object) || {}),
        ...body,
      };
      await tx.systemSetting.upsert({
        where: { key: SETTINGS_PREFIX + userId },
        create: { key: SETTINGS_PREFIX + userId, valueJson },
        update: { valueJson },
      });
      return valueJson;
    });
  }

  private serialize(row: NetworkNotification) {
    const {
      message,
      pushStatus,
      pushAttempts,
      pushAttemptedAt,
      eventKey,
      ...item
    } = row;
    // Existing mobile clients consume message/level; new clients can use body/priority.
    return { ...item, body: message, message, level: row.priority };
  }

  async list(userId: string, page = 1, limit = 20) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new BadRequestException(
        'page: 1..1000000, limit: 1..100 olmalıdır.',
      );
    const [total, items] = await this.prisma.$transaction(
      [
        this.prisma.networkNotification.count({ where: { userId } }),
        this.prisma.networkNotification.findMany({
          where: { userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: items.map((row) => this.serialize(row)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async summary(userId: string) {
    const [unreadCount, urgentCount, groups, requests] =
      await this.prisma.$transaction(
        async (tx) =>
          Promise.all([
            tx.networkNotification.count({ where: { userId, isRead: false } }),
            tx.networkNotification.count({
              where: { userId, isRead: false, priority: 'ACIL' },
            }),
            tx.$queryRaw<
              Array<{ type: string; actionUrl: string; count: bigint }>
            >`
        SELECT type, "actionUrl", count(*) AS count FROM "NetworkNotification"
        WHERE "userId" = ${userId} AND "isRead" = false AND "actionUrl" IS NOT NULL AND type <> 'OFFICE_JOIN_REQUEST'
        GROUP BY type, "actionUrl" ORDER BY type, "actionUrl"`,
            // Office approval remains an action even after its notification has been read.
            tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM "SystemSetting" s JOIN "Office" o ON o.id = s."valueJson"->>'officeId'
      WHERE s.key LIKE 'EPH_OFFICE_JOIN_%' AND s."valueJson"->>'status' = 'PENDING' AND o."isActive" = true AND o."ownerUserId" = ${userId}`,
          ]),
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    const labels: Record<string, string> = {
      NEW_MESSAGE: 'Yeni mesajlar',
      REQUEST_MATCH: 'Talep eşleşmeleri',
      LOW_PK: 'Düşük PK bakiyesi',
      MEMBERSHIP_EXPIRING: 'Üyelik / deneme bitişi',
      ROLE_CHANGED: 'Rol / yetki değişikliği',
      PROJECT_POOL_ACCEPTED: 'Havuz kabulü',
      ADMIN_ANNOUNCEMENT: 'Admin duyuruları',
      CONTACT_UNLOCKED: 'İletişim erişimleri',
      OFFICE_JOIN_DECIDED: 'Ofis başvuru sonucu',
    };
    const pendingActions = groups.map((row) => ({
      type: row.type,
      count: Number(row.count),
      title: labels[row.type] || 'Bildirimler',
      actionUrl: row.actionUrl,
    }));
    const officeCount = Number(requests[0]?.count || 0);
    if (officeCount)
      pendingActions.unshift({
        type: 'OFFICE_JOIN_REQUEST',
        count: officeCount,
        title: 'Onay bekleyen ofis başvuruları',
        actionUrl: '/office',
      });
    return { unreadCount, urgentCount, pendingActions };
  }

  async read(userId: string, id: string) {
    const result = await this.prisma.networkNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!result.count) throw new NotFoundException('Bildirim bulunamadı.');
    return { ok: true };
  }

  async readAll(userId: string) {
    const result = await this.prisma.networkNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true, updatedCount: result.count };
  }

  private async deliver(row: NetworkNotification) {
    const now = new Date();
    if (row.pushAttempts >= 3) return;
    const claimed = await this.prisma.networkNotification.updateMany({
      where: {
        id: row.id,
        pushAttempts: row.pushAttempts,
        OR: [
          { pushStatus: 'PENDING' },
          {
            pushStatus: 'RETRY',
            pushAttemptedAt: { lt: new Date(now.getTime() - 60000) },
          },
          {
            pushStatus: 'SENDING',
            pushAttemptedAt: { lt: new Date(now.getTime() - 300000) },
          },
        ],
      },
      data: {
        pushStatus: 'SENDING',
        pushAttempts: { increment: 1 },
        pushAttemptedAt: now,
      },
    });
    if (!claimed.count) return;
    let status = 'RETRY';
    try {
      const settings = await this.getSettings(row.userId);
      const category = notificationCategory(row.type, row.actionUrl || '');
      if (!settings.enabled || !settings[category]) status = 'DISABLED';
      else {
        const result = await this.push.sendToUser(row.userId, {
          title: row.title,
          body: row.message,
          url: row.actionUrl || '/notifications',
          category,
        });
        status = result.successCount
          ? 'SENT'
          : result.failCount
            ? 'RETRY'
            : 'NO_SUBSCRIPTION';
      }
    } catch {
      this.logger.warn({
        event: 'EPH_PUSH',
        phase: 'delivery',
        notificationId: row.id,
        code: 'SEND_FAILED',
      });
    }
    if (status === 'RETRY' && row.pushAttempts >= 2) status = 'FAILED';
    await this.prisma.networkNotification.updateMany({
      where: { id: row.id, pushStatus: 'SENDING', pushAttemptedAt: now },
      data: { pushStatus: status },
    });
  }

  async retryPush() {
    const now = Date.now();
    await this.prisma.networkNotification.updateMany({
      where: {
        pushStatus: 'SENDING',
        pushAttempts: { gte: 3 },
        pushAttemptedAt: { lt: new Date(now - 300000) },
      },
      data: { pushStatus: 'FAILED' },
    });
    const rows = await this.prisma.networkNotification.findMany({
      where: {
        pushAttempts: { lt: 3 },
        OR: [
          { pushStatus: 'PENDING' },
          {
            pushStatus: 'RETRY',
            pushAttemptedAt: { lt: new Date(now - 60000) },
          },
          {
            pushStatus: 'SENDING',
            pushAttemptedAt: { lt: new Date(now - 300000) },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    for (const row of rows)
      await this.deliver(row).catch(() =>
        this.logger.warn({
          event: 'EPH_PUSH',
          phase: 'retry',
          notificationId: row.id,
          code: 'DELIVERY_DEFERRED',
        }),
      );
  }
}
