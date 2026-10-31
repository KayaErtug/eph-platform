import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  NotificationsService,
  NotificationInput,
} from './notifications.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationScheduler } from './notification-scheduler';
import { NotificationsModule } from './notifications.module';
import { NotificationsController } from './notifications.controller';
import { PushService } from '../push/push.service';
import { NativePushService } from '../push/native-push.service';
import { PrismaService } from '../prisma/prisma.service';
import { NetworkService } from '../network/network.service';

const input: NotificationInput = {
  type: 'NEW_MESSAGE',
  priority: 'ONEMLI',
  title: 'Yeni mesaj',
  body: 'Mesajınız var',
  actionUrl: '/messages/c',
  eventKey: 'message:m:u',
};
function setup() {
  const row: any = {
    id: 'n',
    userId: 'u',
    postId: null,
    isRead: false,
    createdAt: new Date(),
    pushAttempts: 0,
    pushAttemptedAt: null,
    ...input,
    message: input.body,
    pushStatus: 'PENDING',
  };
  const db: any = {
    networkNotification: {
      create: jest.fn(async ({ data }) => ({ ...row, ...data })),
      upsert: jest.fn(async ({ create }) => ({ ...row, ...create })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(row),
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(1),
    },
    systemSetting: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    office: { findMany: jest.fn().mockResolvedValue([]) },
    officeSisterLink: { findMany: jest.fn().mockResolvedValue([]) },
    sisterPrivateInfoRequest: { groupBy: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  db.$transaction = jest.fn((arg) =>
    typeof arg === 'function' ? arg(db) : Promise.all(arg),
  );
  const push = {
    sendToUser: jest.fn().mockResolvedValue({ successCount: 1, failCount: 0 }),
  };
  return { db, push, row, service: new NotificationsService(db, push as any) };
}

describe('EPH-38 inbox and push delivery', () => {
  it('persists before push and returns the public contract', async () => {
    const t = setup();
    t.push.sendToUser.mockImplementation(async () => {
      expect(t.db.networkNotification.create).toHaveBeenCalled();
      return { successCount: 1, failCount: 0 };
    });
    const result = await t.service.notify('u', input);
    expect(result).toMatchObject({
      userId: 'u',
      type: 'NEW_MESSAGE',
      body: input.body,
      priority: 'ONEMLI',
      actionUrl: '/messages/c',
    });
    expect(result).not.toHaveProperty('pushStatus');
    expect(result).toMatchObject({ message: input.body, body: input.body, level: 'ONEMLI', priority: 'ONEMLI' });
    expect(
      t.db.networkNotification.updateMany.mock.calls[1][0].data.pushStatus,
    ).toBe('SENT');
  });
  it.each([{ enabled: false }, { messages: false }])(
    'keeps the inbox record when settings disable push: %j',
    async (settings) => {
      const t = setup();
      t.db.systemSetting.findUnique.mockResolvedValue({ valueJson: settings });
      await t.service.notify('u', input);
      expect(t.db.networkNotification.create).toHaveBeenCalled();
      expect(t.push.sendToUser).not.toHaveBeenCalled();
      expect(
        t.db.networkNotification.updateMany.mock.calls[1][0].data.pushStatus,
      ).toBe('DISABLED');
    },
  );
  it('retains the notification and queues retry on network failure', async () => {
    const t = setup();
    t.push.sendToUser.mockRejectedValue(new Error('offline'));
    await expect(t.service.notify('u', input)).resolves.toMatchObject({
      id: 'n',
    });
    expect(
      t.db.networkNotification.updateMany.mock.calls[1][0].data.pushStatus,
    ).toBe('RETRY');
  });
  it('does not claim a notification concurrently claimed by another worker', async () => {
    const t = setup();
    t.db.networkNotification.updateMany.mockResolvedValue({ count: 0 });
    t.db.networkNotification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6',
      }),
    );
    await t.service.notify('u', input);
    expect(t.push.sendToUser).not.toHaveBeenCalled();
    expect(t.db.networkNotification.findUnique).toHaveBeenCalledWith({
      where: { eventKey: input.eventKey },
    });
  });
  it('stops after the third failed push and reclaims interrupted sends', async () => {
    const t = setup();
    t.db.networkNotification.findMany.mockResolvedValue([
      {
        ...t.row,
        pushAttempts: 2,
        pushStatus: 'SENDING',
        pushAttemptedAt: new Date(0),
      },
    ]);
    t.push.sendToUser.mockRejectedValue(new Error('offline'));
    await t.service.retryPush();
    expect(
      t.db.networkNotification.updateMany.mock.calls.at(-1)[0].data.pushStatus,
    ).toBe('FAILED');
    expect(
      t.db.networkNotification.updateMany.mock.calls[1][0].where.pushAttempts,
    ).toBe(2);
  });
  it('creates a durable notification inside a domain transaction without sending before commit', async () => {
    const t = setup();
    await t.service.notify('u', input, t.db);
    expect(t.db.networkNotification.upsert).toHaveBeenCalled();
    expect(t.push.sendToUser).not.toHaveBeenCalled();
    expect(
      t.db.networkNotification.upsert.mock.calls[0][0].create.pushStatus,
    ).toBe('PENDING');
  });
  it.each([
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/x\r\ny',
  ])('rejects unsafe action URLs: %j', async (actionUrl) => {
    const t = setup();
    await expect(
      t.service.notify('u', { ...input, actionUrl }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.db.networkNotification.create).not.toHaveBeenCalled();
  });
  it('filters every read operation by authenticated owner, with idempotent read-all', async () => {
    const t = setup();
    await t.service.read('u', 'n');
    expect(t.db.networkNotification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n', userId: 'u' },
      data: { isRead: true },
    });
    t.db.networkNotification.updateMany.mockResolvedValue({ count: 0 });
    await expect(t.service.read('stranger', 'n')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(t.service.readAll('u')).resolves.toEqual({
      ok: true,
      updatedCount: 0,
    });
    expect(
      t.db.networkNotification.updateMany.mock.calls.at(-1)[0].where,
    ).toEqual({ userId: 'u', isRead: false });
  });
  it('paginates in stable order and validates query limits', async () => {
    const t = setup();
    const result = await t.service.list('u', 2, 20);
    expect(result).toMatchObject({ page: 2, limit: 20, total: 1 });
    expect(t.db.networkNotification.findMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'u' },
      skip: 20,
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    await expect(t.service.list('u', 0, 20)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      new NotificationsController(t.service).list({ id: 'u' }, 'NaN', '1000'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('counts pending office decisions independently of notification read state', async () => {
    const t = setup();
    t.db.networkNotification.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    t.db.$queryRaw
      .mockResolvedValueOnce([
        { type: 'NEW_MESSAGE', actionUrl: '/messages/c', count: 2n },
      ])
      .mockResolvedValueOnce([{ count: 3n }]);
    await expect(t.service.summary('u')).resolves.toEqual({
      unreadCount: 4,
      urgentCount: 1,
      pendingActions: [
        {
          type: 'OFFICE_JOIN_REQUEST',
          count: 3,
          title: '3 danışman başvurusu onay bekliyor',
          actionUrl: '/office',
        },
        {
          type: 'NEW_MESSAGE',
          count: 2,
          title: '2 okunmamış mesaj',
          actionUrl: '/messages/c',
        },
      ],
    });
    for (const query of t.db.$queryRaw.mock.calls) expect(query[1]).toBe('u');
  });
  it('titles every pending action meaningfully and routes sister events with officeId', async () => {
    const t = setup();
    t.db.$queryRaw
      .mockResolvedValueOnce([
        { type: 'ROLE_CHANGED', actionUrl: '/profile', count: 1n },
        { type: 'BILINMEYEN_TUR', actionUrl: '/x', count: 4n },
      ])
      .mockResolvedValueOnce([{ count: 2n }]);
    t.db.office.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);
    t.db.officeSisterLink.findMany.mockResolvedValue([
      { officeAId: 'o1', officeBId: 'x', invitedByOfficeId: 'x' },
      { officeAId: 'o2', officeBId: 'o1', invitedByOfficeId: 'o2' },
    ]);
    t.db.sisterPrivateInfoRequest.groupBy.mockResolvedValue([
      { ownerOfficeId: 'o2', _count: { _all: 3 } },
    ]);
    const { pendingActions } = await t.service.summary('u');
    expect(pendingActions).toEqual(
      expect.arrayContaining([
        {
          type: 'SISTER_INVITE',
          count: 2,
          title: '2 kardeş ofis daveti bekliyor',
          actionUrl: '/office-sisters?officeId=o1',
        },
        {
          type: 'SISTER_PRIVATE_REQUEST',
          count: 3,
          title: '3 özel bilgi isteği bekliyor',
          actionUrl: '/office-sister-requests?officeId=o2',
        },
        expect.objectContaining({ type: 'OFFICE_JOIN_REQUEST', title: '2 danışman başvurusu onay bekliyor' }),
        expect.objectContaining({ type: 'ROLE_CHANGED', title: '1 rol / yetki değişikliği' }),
        expect.objectContaining({ type: 'BILINMEYEN_TUR', title: '4 okunmamış bildirim' }),
      ]),
    );
    expect(pendingActions.some((a) => a.title === 'Bildirimler')).toBe(false);
  });
  it('merges settings under a lock and rejects unknown and inherited keys', async () => {
    const t = setup();
    t.db.systemSetting.findUnique.mockResolvedValue({
      valueJson: { pool: false },
    });
    expect(
      await t.service.updateSettings('u', { messages: false }),
    ).toMatchObject({ messages: false, pool: false, enabled: true });
    await expect(
      t.service.updateSettings('u', { toString: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      t.service.updateSettings('u', { enabled: 'false' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.db.$executeRaw).toHaveBeenCalled();
  });
});

describe('EPH-38 durable event collection and scoped cron', () => {
  it('retries committed source records through notify and reads the PK limit from DB', async () => {
    const db: any = {
      systemSetting: {
        findUnique: jest.fn(async ({ where }) => ({
          valueJson:
            where.key === 'LIMIT_PK_DUSUK_UYARI'
              ? { value: 43 }
              : '2026-10-30T00:00:00.000Z',
        })),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const notify = jest.fn().mockResolvedValue({});
    db.$queryRaw.mockResolvedValueOnce([{ userId: 'u', ...input }]);
    await new NotificationEventsService(db, { notify } as any).collect();
    expect(notify).toHaveBeenCalledWith('u', input);
    const lowPk = db.$queryRaw.mock.calls.at(-1)[0];
    expect(lowPk.values.filter((v: unknown) => v === 43)).toHaveLength(2);
    expect(lowPk.text).toContain('NOT EXISTS');
  });
  it('continues independent event streams after one source fails', async () => {
    const db: any = {
      systemSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ valueJson: '2026-10-30T00:00:00.000Z' }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    db.$queryRaw.mockRejectedValueOnce(
      new Error('source temporarily unavailable'),
    );
    const events = new NotificationEventsService(db, {
      notify: jest.fn(),
    } as any);
    await events.collect();
    expect(db.$queryRaw).toHaveBeenCalledTimes(
      events.sources(new Date()).length,
    );
  });
  it('drains more than 100 expiration recipients for the Istanbul calendar day, including office trials', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-30T06:00:00Z'));
    try {
      const db: any = { $queryRaw: jest.fn().mockResolvedValue([]) };
      db.$queryRaw.mockResolvedValueOnce(
        Array.from({ length: 100 }, (_, i) => ({
          ...input,
          userId: 'u' + i,
          eventKey: 'expiry:' + i,
        })),
      );
      const notify = jest.fn().mockResolvedValue({});
      await new NotificationEventsService(db, {
        notify,
      } as any).expiringMemberships();
      expect(notify).toHaveBeenCalledTimes(100);
      expect(db.$queryRaw).toHaveBeenCalledTimes(3);
      expect(db.$queryRaw.mock.calls[0][0].values).toContainEqual(
        new Date('2026-11-01T21:00:00Z'),
      );
      expect(db.$queryRaw.mock.calls[2][0].text).toContain(
        'OFFICE_SUBSCRIPTION_',
      );
    } finally {
      jest.useRealTimers();
    }
  });
  it('resolves the module graph and registers only four notification jobs with shutdown cleanup', async () => {
    const t = setup();
    const native = { collectReceipts: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      imports: [NotificationsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(t.db)
      .overrideProvider(PushService)
      .useValue(t.push)
      .overrideProvider(NativePushService)
      .useValue(native)
      .compile();
    await module.init();
    const scheduler = module.get(NotificationScheduler) as any;
    expect(scheduler.jobs).toHaveLength(4);
    expect(scheduler.jobs.map((job: any) => job.cronTime.source)).toEqual([
      '* * * * *',
      '* * * * *',
      '*/2 * * * *',
      '0 9 * * *',
    ]);
    await scheduler.jobs[2].fireOnTick();
    expect(native.collectReceipts).toHaveBeenCalledTimes(1);
    await module.close();
    expect(scheduler.jobs.every((job: any) => !job.isActive)).toBe(true);
  });
});

describe('EPH-02 push diagnostics', () => {
  it('keeps legacy Network lists and mark-all scoped away from general notifications', async () => {
    const t = setup();
    const network = new (NetworkService as any)(t.db, {}, {}, {}, {}, {});
    await network.getNotifications('u');
    await network.markNotificationsAsRead('u');
    const scope = [{ type: 'NETWORK' }, { postId: { not: null } }];
    expect(t.db.networkNotification.count.mock.calls[0][0].where.OR).toEqual(scope);
    expect(t.db.networkNotification.findMany.mock.calls[0][0].where.OR).toEqual(scope);
    expect(t.db.networkNotification.updateMany.mock.calls[0][0].where.OR).toEqual(scope);
  });
  it('logs the Expo HTTP and error code without exposing a push token', async () => {
    const token = 'ExponentPushToken[abcdefghijklmno]';
    const db: any = {
      systemSetting: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { key: 'hashed-device-key', valueJson: { token, userId: 'u' } },
          ]),
      },
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ errors: [{ code: 'UNAUTHORIZED' }] }),
      } as any);
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    try {
      expect(
        (
          await new NativePushService(db).sendToUser('u', {
            title: 't',
            body: 'b',
          })
        ).failCount,
      ).toBe(1);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'ticket',
          httpStatus: 401,
          code: 'UNAUTHORIZED',
        }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    } finally {
      fetchMock.mockRestore();
      log.mockRestore();
    }
  });
  it('applies account settings to legacy push senders as well', async () => {
    const db: any = {
      systemSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ valueJson: { enabled: false } }),
      },
      pushSubscription: { findMany: jest.fn() },
    };
    const native = { sendToUser: jest.fn() };
    await expect(
      new PushService(db, native as any).sendToUser('u', {
        title: 't',
        body: 'b',
      }),
    ).resolves.toMatchObject({ ok: false, skippedCount: 1 });
    expect(native.sendToUser).not.toHaveBeenCalled();
    expect(db.pushSubscription.findMany).not.toHaveBeenCalled();
  });
});
