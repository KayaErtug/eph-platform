import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';
import { AdminController } from '../../admin/admin.controller';
import { NewUserNotifierService, NOTIFY_NEW_USER_EMAIL_KEY, NOTIFY_NEW_USER_PUSH_KEY } from './new-user-notifier.service';
import { RegistrationV2Service } from './registration-v2.service';

const event = { userId: 'u1', firstName: 'Ayşe', lastName: 'Yılmaz', role: Role.EMLAKCI, city: 'İstanbul', district: 'Kadıköy', inviteCode: 'EPH-ABCD', isApproved: false };

function notifier(settings: Record<string, number> = {}) {
  const db: any = {
    systemSetting: { findUnique: jest.fn(async ({ where }) => (where.key in settings ? { valueJson: { value: settings[where.key] } } : null)) },
    user: { findMany: jest.fn(async () => [{ id: 'sa1' }, { id: 'sa2' }]) },
    networkNotification: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    $transaction: jest.fn(async (cb: any) => cb(db)),
  };
  const email = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const notifications = { notify: jest.fn().mockResolvedValue({}) };
  return { service: new NewUserNotifierService(db, email as any, notifications as any), email, notifications, db };
}

describe('NewUserNotifierService', () => {
  afterEach(() => { delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_ADMIN_CHAT_ID; jest.restoreAllMocks(); });

  it('e-posta NEW_USER kategorisinde kuyruğa girer ve telefon/e-posta içermez', async () => {
    const n = notifier();
    await n.service.notify({ ...event, phone: '+905551112233', email: 'x@y.com' } as any);
    const mail = n.email.enqueue.mock.calls[0][0];
    expect(mail).toMatchObject({ eventKey: 'NEW_USER:u1', category: 'NEW_USER', entityType: 'User', entityId: 'u1', title: 'Yeni üye: Ayşe Yılmaz' });
    expect(mail.summary).toContain('Emlak danışmanı');
    expect(mail.summary).toContain('İstanbul / Kadıköy');
    expect(mail.summary).toContain('Davet/referans kodu ile');
    expect(mail.summary).toContain('Onay bekliyor');
    expect(JSON.stringify(mail)).not.toMatch(/5551112233|x@y\.com|@/);
  });

  it('tüm SUPER_ADMIN kullanıcılarına kullanıcı kaydına bağlı bildirim gider', async () => {
    const n = notifier();
    await n.service.notify(event);
    expect(n.db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: Role.SUPER_ADMIN } }));
    expect(n.notifications.notify).toHaveBeenCalledTimes(2);
    expect(n.notifications.notify.mock.calls[0][1]).toMatchObject({
      body: 'Yeni üye: Ayşe Yılmaz · Emlak danışmanı · İstanbul',
      actionUrl: '/admin/users?entityType=USER&entityId=u1',
      eventKey: 'NEW_USER:u1:sa1',
    });
  });

  it('e-posta ayarı kapalıyken yalnız e-posta atlanır', async () => {
    const mailOff = notifier({ [NOTIFY_NEW_USER_EMAIL_KEY]: 0 });
    await mailOff.service.notify(event);
    expect(mailOff.email.enqueue).not.toHaveBeenCalled();
    expect(mailOff.notifications.notify).toHaveBeenCalled();

  });

  it('push ayarı kapalıyken kayıt oluşur ama push tetiklenmez; açıkken ikisi de olur', async () => {
    const pushOff = notifier({ [NOTIFY_NEW_USER_PUSH_KEY]: 0 });
    await pushOff.service.notify(event);
    expect(pushOff.email.enqueue).toHaveBeenCalled();
    expect(pushOff.notifications.notify).toHaveBeenCalledTimes(2);
    // Kayıt işlem içinde (tx ile) oluşturulur: notify'ın deliver/push adımı çalışmaz.
    expect(pushOff.notifications.notify.mock.calls[0][2]).toBe(pushOff.db);
    expect(pushOff.db.networkNotification.updateMany).toHaveBeenCalledWith({ where: { eventKey: 'NEW_USER:u1:sa1', pushStatus: 'PENDING' }, data: { pushStatus: 'DISABLED' } });

    const pushOn = notifier();
    await pushOn.service.notify(event);
    expect(pushOn.notifications.notify).toHaveBeenCalledTimes(2);
    expect(pushOn.notifications.notify.mock.calls[0][2]).toBeUndefined();
    expect(pushOn.db.networkNotification.updateMany).not.toHaveBeenCalled();
  });

  it('Telegram ortam değişkeni yoksa sessizce atlanır, varsa mesaj gider', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({} as any);
    await notifier().service.notify(event);
    expect(fetchSpy).not.toHaveBeenCalled();
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '42';
    await notifier().service.notify(event);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('kanal hataları yutulur ve diğer kanalları engellemez', async () => {
    const n = notifier();
    n.email.enqueue.mockRejectedValue(new Error('db down'));
    await expect(n.service.notify(event)).resolves.toBeUndefined();
    expect(n.notifications.notify).toHaveBeenCalledTimes(2);
  });
});

describe('RegistrationV2Service.completeRegistration → yeni üye olayı', () => {
  function fixture(notifierFn: any) {
    const pending: any = { id: 'p1', email: 'a@b.com', phone: '+90500', phoneVerified: true, emailVerified: true, passwordHash: null, role: Role.ADAY, completedAt: null, inviteCode: null };
    const users: any[] = [];
    const db: any = {
      $transaction: async (cb: any) => cb(db),
      $queryRaw: jest.fn(),
      pendingRegistration: {
        findUnique: jest.fn(async () => ({ ...pending })),
        update: jest.fn(async ({ data }) => { Object.assign(pending, data); return pending; }),
      },
      user: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => users[0] ?? null),
        create: jest.fn(async ({ data }) => { const u = { id: 'user-1', ...data }; users.push(u); return u; }),
      },
    };
    const service = new RegistrationV2Service({} as any, db, {} as any, {} as any, {} as any, { sign: () => 't' } as any, { dispatch: notifierFn } as any);
    return service;
  }

  it('aynı kullanıcı için yalnız bir kez tetiklenir', async () => {
    const dispatch = jest.fn();
    const service = fixture(dispatch);
    await service.completeRegistration('p1');
    await service.completeRegistration('p1');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', role: Role.ADAY, isApproved: true }));
  });

  it('bildirim altyapısı çökse bile kayıt başarıyla döner', async () => {
    const broken: any = { systemSetting: { findUnique: jest.fn().mockRejectedValue(new Error('db down')) } };
    const real = new NewUserNotifierService(broken, {} as any, {} as any);
    const service = fixture((e: any) => real.dispatch(e));
    await expect(service.completeRegistration('p1')).resolves.toMatchObject({ success: true });
    await new Promise((resolve) => setImmediate(resolve));
    expect(broken.systemSetting.findUnique).toHaveBeenCalled();
  });
});

describe('GET /admin/users/new-summary yetkisi', () => {
  const guard = new RolesGuard(new (require('@nestjs/core').Reflector)());
  const ctx = (role?: Role) => ({
    getHandler: () => AdminController.prototype.getNewUserSummary,
    getClass: () => AdminController,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  }) as any;

  it.each([Role.EMLAKCI, Role.ADAY, Role.MODERATOR, undefined])('%s için reddedilir (403)', (role) => {
    expect(guard.canActivate(ctx(role))).toBe(false);
  });
  it.each([Role.ADMIN, Role.SUPER_ADMIN])('%s için izin verilir', (role) => {
    expect(guard.canActivate(ctx(role))).toBe(true);
  });
});
