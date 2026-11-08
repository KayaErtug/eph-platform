import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { deleteUserAccount } from './delete-user-account';
import { accountDeletionKey, deletedAccounts, isAccountDeleted } from '../auth/account-deletion';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { resolvePermission } from '../auth/permission.resolver';
import { NativePushService } from '../push/native-push.service';
import { PushService } from '../push/push.service';

function fixture() {
  let state: any = {
    users: {
      root: { id: 'root', role: Role.SUPER_ADMIN, isApproved: true, isVerified: true, officeId: null, ownedOffices: [], passwordHash: 'root-hash' },
      user: { id: 'user', role: Role.EMLAKCI, isApproved: true, isVerified: true, officeId: 'office', ownedOffices: [], passwordHash: 'private-hash', passwordResetVersion: 1, passwordResetCodeHash: 'old-reset', emailVerificationCodeHash: 'old-verify' },
    },
    settings: { EPH_OFFICE_JOIN_office_user: { status: 'PENDING', userId: 'user' }, EPH_NATIVE_PUSH_device: { userId: 'user', token: 'old-token' }, EPH_NATIVE_PUSH_other: { userId: 'root', token: 'root-token' } },
    teams: [{ id: 'team', leaderId: 'user' }], memberships: [{ userId: 'user', isActive: true }],
    wallets: [{ kullaniciId: 'user', aktifMi: true, bakiye: 125 }],
    subscriptions: [{ userId: 'user', endpoint: 'old-endpoint' }], logs: [],
    projects: [{ id: 'project', ownerId: 'user' }], crm: [{ id: 'crm', ownerId: 'user' }], messages: [{ senderId: 'user', body: 'Korunacak mesaj' }], payments: [{ kullaniciId: 'user', amount: 100 }],
  };
  const db: any = { $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn(async () => 1) };
  db.$transaction = jest.fn(async (work: any) => {
    const snapshot = structuredClone(state);
    try { return await work(db); } catch (error) { state = snapshot; throw error; }
  });
  db.user = {
    findUnique: jest.fn(async ({ where }) => state.users[where.id] || null),
    update: jest.fn(async ({ where, data }) => {
      const user = state.users[where.id];
      for (const [key, value] of Object.entries(data)) user[key] = value && typeof value === 'object' && 'increment' in value ? (user[key] || 0) + (value as any).increment : value;
      return { ...user };
    }),
  };
  db.teamMember = { updateMany: jest.fn(async ({ where, data }) => { state.memberships.filter((m: any) => m.userId === where.userId).forEach((m: any) => Object.assign(m, data)); return { count: 1 }; }) };
  db.team = { updateMany: jest.fn(async ({ where, data }) => { state.teams.filter((t: any) => t.leaderId === where.leaderId).forEach((t: any) => Object.assign(t, data)); return { count: 1 }; }) };
  db.kontorCuzdani = { updateMany: jest.fn(async ({ where, data }) => { state.wallets.filter((w: any) => w.kullaniciId === where.kullaniciId).forEach((w: any) => Object.assign(w, data)); return { count: 1 }; }) };
  db.pushSubscription = { deleteMany: jest.fn(async ({ where }) => { state.subscriptions = state.subscriptions.filter((s: any) => s.userId !== where.userId); return { count: 1 }; }) };
  const matches = (key: string, where: any) => (!where.key?.startsWith || key.startsWith(where.key.startsWith)) && (!where.key?.endsWith || key.endsWith(where.key.endsWith)) && (!where.valueJson || state.settings[key]?.userId === where.valueJson.equals);
  db.systemSetting = {
    findUnique: jest.fn(async ({ where }) => state.settings[where.key] === undefined ? null : { key: where.key, valueJson: state.settings[where.key] }),
    findMany: jest.fn(async ({ where }) => Object.keys(state.settings).filter(key => matches(key, where)).map(key => ({ key, valueJson: state.settings[key] }))),
    create: jest.fn(async ({ data }) => { state.settings[data.key] = data.valueJson; return data; }),
    update: jest.fn(async ({ where, data }) => { state.settings[where.key] = data.valueJson; return data; }),
    deleteMany: jest.fn(async ({ where }) => { for (const key of Object.keys(state.settings)) if (matches(key, where)) delete state.settings[key]; return { count: 1 }; }),
  };
  db.adminActionLog = { create: jest.fn(async ({ data }) => { state.logs.push(data); return data; }) };
  return { db, state: () => state };
}

describe('Kayıtları koruyan kullanıcı silme', () => {
  it('hesabı kapatır, parola/reset erişimini iptal eder ve tek denetim kaydı tutar', async () => {
    const f = fixture();
    await expect(deleteUserAccount(f.db, 'root', 'user', { reason: 'Hesap kaldırma' })).resolves.toMatchObject({ ok: true, deleted: true, recordsPreserved: true });
    expect(f.state().users.user).toMatchObject({ isApproved: false, isVerified: false, officeId: null, passwordHash: null, passwordResetCodeHash: null, passwordResetVersion: 2 });
    expect(f.state().logs).toHaveLength(1);
    expect(f.state().logs[0]).toMatchObject({ actorId: 'root', targetUserId: 'user', metadata: { reason: 'Hesap kaldırma', recordsPreserved: true } });
    expect(await isAccountDeleted(f.db, 'user')).toBe(true);
  });
  it('portföy, CRM, mesaj, ödeme ve PK bakiyesini aynen korur', async () => {
    const f = fixture(); const before = structuredClone(f.state());
    await deleteUserAccount(f.db, 'root', 'user');
    for (const key of ['projects', 'crm', 'messages', 'payments']) expect(f.state()[key]).toEqual(before[key]);
    expect(f.state().wallets[0]).toMatchObject({ aktifMi: false, bakiye: 125 });
  });
  it('ekip/takım erişimi ve yalnız hedef kullanıcının cihaz aboneliklerini kaldırır', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'user');
    expect(f.state().memberships[0].isActive).toBe(false);
    expect(f.state().teams[0].leaderId).toBeNull();
    expect(f.state().subscriptions).toEqual([]);
    expect(f.state().settings.EPH_NATIVE_PUSH_device).toBeUndefined();
    expect(f.state().settings.EPH_NATIVE_PUSH_other.token).toBe('root-token');
    expect(f.state().settings.EPH_OFFICE_JOIN_office_user.status).toBe('REMOVED');
  });
  it.each([Role.ADMIN, Role.EMLAKCI, Role.MODERATOR, Role.MUTEAHHIT, Role.ADAY])('%s kullanıcısı silme yapamaz; hiçbir kayıt değişmez', async role => {
    const f = fixture(); f.state().users.root.role = role; const before = structuredClone(f.state());
    await expect(deleteUserAccount(f.db, 'root', 'user')).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.state()).toEqual(before);
  });
  it('devre dışı süper admin işlem yapamaz', async () => {
    const f = fixture(); f.state().users.root.isApproved = false;
    await expect(deleteUserAccount(f.db, 'root', 'user')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('süper admin başka süper adminin hesabını da silebilir', async () => {
    const f = fixture(); f.state().users.user.role = Role.SUPER_ADMIN;
    await expect(deleteUserAccount(f.db, 'root', 'user')).resolves.toHaveProperty('deleted', true);
  });
  it('kendi hesabını da kayıtları koruyarak silebilir', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'root');
    expect(await isAccountDeleted(f.db, 'root')).toBe(true);
    expect(f.state().logs[0]).toMatchObject({ actorId: 'root', targetUserId: 'root' });
  });
  it('aynı kullanıcı için tekrar işlem yeni silme/audit üretmez', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'user');
    await expect(deleteUserAccount(f.db, 'root', 'user')).resolves.toHaveProperty('alreadyDeleted', true);
    expect(f.state().logs).toHaveLength(1);
  });
  it('audit yazılamazsa bütün hesap ve üyelik değişiklikleri geri alınır', async () => {
    const f = fixture(); const before = structuredClone(f.state()); f.db.adminActionLog.create.mockRejectedValueOnce(new Error('audit failed'));
    await expect(deleteUserAccount(f.db, 'root', 'user')).rejects.toThrow('audit failed');
    expect(f.state()).toEqual(before);
  });
  it('bulunamayan hesapta işlem yapmaz', async () => {
    const f = fixture(); await expect(deleteUserAccount(f.db, 'root', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(f.db.user.update).not.toHaveBeenCalled();
  });
  it('hatalı kullanıcı seçimi ve çok uzun gerekçeyi reddeder', async () => {
    const f = fixture();
    await expect(deleteUserAccount(f.db, 'root', '')).rejects.toBeInstanceOf(BadRequestException);
    await expect(deleteUserAccount(f.db, 'root', 'user', { reason: 'x'.repeat(1001) })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('serileştirme çatışmasında yeniden dener ve bir kez sonuçlandırır', async () => {
    const f = fixture();
    f.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('retry', { code: 'P2034', clientVersion: '6.19.3' }));
    await expect(deleteUserAccount(f.db, 'root', 'user')).resolves.toHaveProperty('deleted', true);
    expect(f.state().logs).toHaveLength(1);
    expect(f.db.$transaction).toHaveBeenCalledTimes(2);
  });
  it('silinen hesap bilgisi arşiv görünümü için okunur', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'user', { reason: 'Arşiv' });
    expect((await deletedAccounts(f.db)).get('user')).toMatchObject({ deleted: true, deletedById: 'root', reason: 'Arşiv' });
  });
  it('eski JWT silme sonrası reddedilir; sonradan onay açılması silme işaretini aşamaz', async () => {
    const f = fixture(); const strategy = new JwtStrategy(f.db);
    await expect(strategy.validate({ sub: 'root' })).resolves.toHaveProperty('id', 'root');
    await deleteUserAccount(f.db, 'root', 'user');
    await expect(strategy.validate({ sub: 'user' })).rejects.toBeInstanceOf(UnauthorizedException);
    Object.assign(f.state().users.user, { isApproved: true, isVerified: true });
    await expect(strategy.validate({ sub: 'user' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('silme işareti olan süper admin de JWT kullanamaz', async () => {
    const f = fixture(); f.state().settings[accountDeletionKey('root')] = { deleted: true };
    await expect(new JwtStrategy(f.db).validate({ sub: 'root' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('silinen hesaba web veya native bildirim göndermez', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'user');
    const native = new NativePushService(f.db);
    await expect(native.sendToUser('user', { title: 'Test', body: 'Test' })).resolves.toMatchObject({ ok: false, successCount: 0, skippedCount: 1 });
    const nativeMock: any = { sendToUser: jest.fn() };
    await expect(new PushService(f.db, nativeMock).sendToUser('user', { title: 'Test', body: 'Test' })).resolves.toHaveProperty('skippedCount', 1);
    expect(nativeMock.sendToUser).not.toHaveBeenCalled();
  });
  it('silinen hesaba eski oturumla yeniden cihaz bağlanamaz', async () => {
    const f = fixture(); await deleteUserAccount(f.db, 'root', 'user');
    await expect(new NativePushService(f.db).subscribe('user', { token: 'ExpoPushToken[abcdefghijklmnopqrst]', platform: 'android' })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.state().settings.EPH_NATIVE_PUSH_device).toBeUndefined();
  });
  it('çatışma üç denemede bitmezse hata döner; sessiz başarı üretmez', async () => {
    const f = fixture();
    f.db.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('retry', { code: 'P2034', clientVersion: '6.19.3' }));
    await expect(deleteUserAccount(f.db, 'root', 'user')).rejects.toHaveProperty('code', 'P2034');
    expect(f.db.$transaction).toHaveBeenCalledTimes(3);
    expect(f.state().logs).toHaveLength(0);
  });
  it('süper admin USER_DELETE ve gelecekteki yetki tanımlarında politika kısıtlarına takılmaz', async () => {
    for (const key of ['USER_DELETE', 'FUTURE_MANAGEMENT_PERMISSION']) {
      await expect(resolvePermission({} as any, 'root', Role.SUPER_ADMIN, key)).resolves.toMatchObject({ enabled: true, numericLimit: null, source: 'SUPER_ADMIN' });
    }
  });
});
