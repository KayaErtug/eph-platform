import { UnitsService } from '../units/units.service';
import { ProfileService } from '../profile/profile.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { validate } from 'class-validator';
import { ContentSafetyService } from './content-safety.service';
import { CreateSafetyReportDto, SafetyEntity, SafetyReason, SafetyResolution } from './content-safety.dto';
import { assertNoBlockedInteraction, blockedPeerIds, visibleAuthor } from './block-policy';
import { MessagesService } from '../messages/messages.service';
import { PoolAudienceService } from '../pool-audience/pool-audience.service';

function setup() {
  const actor = { id: 'viewer', role: Role.EMLAKCI, adminVisible: true, isApproved: true, isVerified: true, office: null, ownedOffices: [] };
  const post = { userId: 'owner', title: 'Örnek ilan', description: 'İncelenecek içerik', visibility: 'TUM_EPH' };
  const report = { id: 'report', targetUserId: 'owner', entityType: SafetyEntity.NETWORK_POST, entityId: 'post', status: 'ACIK' };
  const db: any = {
    systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ ...actor, id: where.id })) },
    networkPost: { findFirst: jest.fn().mockResolvedValue(post), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    unit: { findFirst: jest.fn().mockResolvedValue({ id: 'unit', type: 'DAIRE', project: { ownerId: 'owner' } }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    message: { findFirst: jest.fn().mockResolvedValue({ senderId: 'owner', body: 'Mesaj' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), create: jest.fn(), findMany: jest.fn() },
    report: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue(report),
      findUnique: jest.fn().mockResolvedValue(report), findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({ ...report, status: 'COZULDU' }) },
    userBlock: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn(), deleteMany: jest.fn() },
    adminActionLog: { create: jest.fn() }, $queryRaw: jest.fn(), $executeRaw: jest.fn(),
  };
  db.$transaction = jest.fn((callback: any) => callback(db));
  const audience: any = { assertCanViewUnit: jest.fn().mockResolvedValue(undefined) };
  const admin: any = { resolveOperationalPermission: jest.fn().mockResolvedValue({ enabled: true }) };
  const service = new ContentSafetyService(db, audience, admin);
  const dto = { entityType: SafetyEntity.NETWORK_POST, entityId: 'post', reason: SafetyReason.SPAM, description: '' };
  return { actor, post, report, db, audience, admin, service, dto };
}

describe('Content safety scope and moderation', () => {
  it('creates a scoped report with server-resolved author and content snapshot', async () => {
    const t = setup(); const result = await t.service.report('viewer', t.dto);
    expect(result.ok).toBe(true); expect(t.db.report.create.mock.calls[0][0].data).toMatchObject({ reporterId: 'viewer', targetUserId: 'owner', entityType: 'NETWORK_POST' });
    expect(t.db.report.create.mock.calls[0][0].data.description).toContain('İncelenecek içerik');
  });
  it('reuses the open report under a reporter lock', async () => { const t = setup(); t.db.report.findFirst.mockResolvedValue(t.report); expect((await t.service.report('viewer', t.dto)).duplicate).toBe(true); expect(t.db.$queryRaw).toHaveBeenCalled(); expect(t.db.report.create).not.toHaveBeenCalled(); });
  it('enforces a daily report limit', async () => { const t = setup(); t.db.report.count.mockResolvedValue(20); await expect(t.service.report('viewer', t.dto)).rejects.toBeInstanceOf(BadRequestException); expect(t.db.report.create).not.toHaveBeenCalled(); });
  it('requires an explanation for Other', async () => { const t = setup(); await expect(t.service.report('viewer', { ...t.dto, reason: SafetyReason.OTHER })).rejects.toBeInstanceOf(BadRequestException); });
  it.each(['report', 'block'] as const)('rejects self %s', async action => { const t = setup(); t.post.userId = 'viewer'; await expect(t.service[action]('viewer', t.dto)).rejects.toBeInstanceOf(BadRequestException); expect(t.db.userBlock.upsert).not.toHaveBeenCalled(); expect(t.db.report.create).not.toHaveBeenCalled(); });
  it.each(['report', 'block'] as const)('does not disclose a post outside the viewer role on %s', async action => { const t = setup(); t.post.visibility = 'SADECE_MUTEAHHITLER'; await expect(t.service[action]('viewer', t.dto)).rejects.toBeInstanceOf(NotFoundException); });
  it('rejects invalid content identifiers before target lookup', async () => { const t = setup(); await expect(t.service.context('viewer', { ...t.dto, entityId: '../private' })).rejects.toBeInstanceOf(BadRequestException); expect(t.db.networkPost.findFirst).not.toHaveBeenCalled(); });
  it('checks targeted pool access before accepting a report', async () => { const t = setup(); t.audience.assertCanViewUnit.mockRejectedValue(new ForbiddenException()); await expect(t.service.report('viewer', { ...t.dto, entityType: SafetyEntity.POOL_UNIT })).rejects.toBeInstanceOf(ForbiddenException); expect(t.db.report.create).not.toHaveBeenCalled(); });
  it('requires message conversation participation and supports non-UUID message IDs', async () => { const t = setup(); await t.service.report('viewer', { ...t.dto, entityType: SafetyEntity.MESSAGE, entityId: 'network-reply-123456' }); expect(t.db.message.findFirst.mock.calls[0][0].where.Conversation).toEqual({ ConversationParticipant: { some: { userId: 'viewer' } } }); });
  it('rejects an inaccessible message', async () => { const t = setup(); t.db.message.findFirst.mockResolvedValue(null); await expect(t.service.context('viewer', { ...t.dto, entityType: SafetyEntity.MESSAGE })).rejects.toBeInstanceOf(NotFoundException); });
  it('idempotently blocks the server-resolved author and clears old notifications in one transaction', async () => { const t = setup(); await t.service.block('viewer', t.dto); await t.service.block('viewer', t.dto); expect(t.db.userBlock.upsert.mock.calls[0][0]).toMatchObject({ where: { blockerId_blockedId: { blockerId: 'viewer', blockedId: 'owner' } }, update: {} }); expect(t.db.$transaction).toHaveBeenCalledTimes(2); expect(t.db.$executeRaw).toHaveBeenCalledTimes(2); });
  it('only removes an owned block', async () => { const t = setup(); await t.service.unblock('viewer', 'foreign-block'); expect(t.db.userBlock.deleteMany).toHaveBeenCalledWith({ where: { id: 'foreign-block', blockerId: 'viewer' } }); });
  it('keeps report and block listings private to the authenticated actor', async () => { const t = setup(); const result = await t.service.mine('viewer'); expect(result.canModerate).toBe(false); expect(t.db.userBlock.findMany.mock.calls[0][0].where).toEqual({ blockerId: 'viewer' }); expect(t.db.report.findMany.mock.calls[0][0].where).toEqual({ reporterId: 'viewer' }); });
  it.each([SafetyEntity.NETWORK_POST, SafetyEntity.POOL_UNIT])('allows approved verified accounts hidden from admin lists to use %s safety actions', async entityType => {
    const t = setup(); t.actor.adminVisible = false;
    const dto = { ...t.dto, entityType };
    await expect(t.service.context('viewer', dto)).resolves.toEqual({ canReport: true, canBlock: true });
    await expect(t.service.report('viewer', dto)).resolves.toMatchObject({ ok: true });
    await t.service.block('viewer', dto);
    await expect(t.service.mine('viewer')).resolves.toHaveProperty('reports');
    await t.service.unblock('viewer', 'block');
    expect(t.db.userBlock.upsert).toHaveBeenCalled();
    expect(t.db.userBlock.deleteMany).toHaveBeenCalled();
    expect(t.db.user.findUnique.mock.calls[0][0].select).toMatchObject({ isApproved: true, isVerified: true });
    expect(t.db.user.findUnique.mock.calls[0][0].select).not.toHaveProperty('adminVisible');
  });
  it.each(['isApproved', 'isVerified'] as const)('rejects accounts without %s before content reads or writes', async flag => {
    const t = setup(); t.actor[flag] = false;
    await expect(t.service.context('viewer', t.dto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.report('viewer', t.dto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.block('viewer', t.dto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.mine('viewer')).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.db.networkPost.findFirst).not.toHaveBeenCalled();
    expect(t.db.report.create).not.toHaveBeenCalled();
    expect(t.db.userBlock.upsert).not.toHaveBeenCalled();
  });
  it('rejects an account removed after authentication', async () => {
    const t = setup(); t.db.user.findUnique.mockResolvedValue(null);
    await expect(t.service.mine('viewer')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects a normal user from the moderation queue', async () => { const t = setup(); await expect(t.service.queue('viewer')).rejects.toBeInstanceOf(ForbiddenException); });
  it('honors the actual database role and existing permission policies', async () => { const t = setup(); t.actor.role = Role.ADMIN as any; t.admin.resolveOperationalPermission.mockResolvedValue({ enabled: false }); await expect(t.service.queue('viewer')).rejects.toBeInstanceOf(ForbiddenException); });
  it.each([SafetyEntity.NETWORK_POST, SafetyEntity.POOL_UNIT, SafetyEntity.MESSAGE])('removes %s and records both resolution and admin audit atomically', async entityType => {
    const t = setup(); t.actor.role = Role.SUPER_ADMIN as any; t.report.entityType = entityType;
    await t.service.resolve('viewer', 'report', { action: SafetyResolution.REMOVE_CONTENT, note: 'İhlal doğrulandı.' });
    expect(t.db.report.update.mock.calls[0][0].data).toMatchObject({ status: 'COZULDU', resolvedById: 'viewer' }); expect(t.db.adminActionLog.create).toHaveBeenCalled();
    if (entityType === SafetyEntity.POOL_UNIT) expect(t.db.unit.updateMany.mock.calls[0][0].data).toEqual({ isPoolVisible: false, approvalStatus: 'REDDEDILDI' });
    if (entityType === SafetyEntity.NETWORK_POST) expect(t.db.networkPost.updateMany.mock.calls[0][0].data).toEqual({ isActive: false });
    if (entityType === SafetyEntity.MESSAGE) expect(t.db.message.updateMany.mock.calls[0][0].data.body).toContain('kaldırıldı');
  });
  it('dismisses a report without changing content', async () => { const t = setup(); t.actor.role = Role.SUPER_ADMIN as any; await t.service.resolve('viewer', 'report', { action: SafetyResolution.DISMISS, note: 'İhlal bulunmadı.' }); expect(t.db.networkPost.updateMany).not.toHaveBeenCalled(); expect(t.db.report.update.mock.calls[0][0].data.status).toBe('REDDEDILDI'); });
  it('prevents a moderator resolving their own reported content', async () => { const t = setup(); t.actor.role = Role.ADMIN as any; t.report.targetUserId = 'viewer'; await expect(t.service.resolve('viewer', 'report', { action: SafetyResolution.DISMISS, note: 'Açıklama.' })).rejects.toBeInstanceOf(ForbiddenException); });
  it('refuses to resolve a closed report', async () => { const t = setup(); t.actor.role = Role.SUPER_ADMIN as any; t.report.status = 'COZULDU'; await expect(t.service.resolve('viewer', 'report', { action: SafetyResolution.REMOVE_CONTENT, note: 'Açıklama.' })).rejects.toBeInstanceOf(BadRequestException); expect(t.db.networkPost.updateMany).not.toHaveBeenCalled(); });
  it('validates DTO types, message identifiers and description length', async () => {
    const good = Object.assign(new CreateSafetyReportDto(), { entityType: SafetyEntity.MESSAGE, entityId: 'network-reply-123', reason: SafetyReason.SPAM }); expect(await validate(good)).toHaveLength(0);
    for (const invalid of [{ entityType: 'USER', entityId: 'x', reason: 'SPAM' }, { entityType: 'MESSAGE', entityId: 'a/b', reason: 'SPAM' }, { ...good, description: 'x'.repeat(1001) }]) expect((await validate(Object.assign(new CreateSafetyReportDto(), invalid))).length).toBeGreaterThan(0);
  });
});

describe('Blocking is enforced beyond the mobile UI', () => {
  it('blocks either direction of a relationship', async () => { const t = setup(); t.db.userBlock.findFirst.mockResolvedValue({ id: 'block' }); await expect(assertNoBlockedInteraction(t.db, 'viewer', ['owner'])).rejects.toBeInstanceOf(ForbiddenException); expect(t.db.userBlock.findFirst.mock.calls[0][0].where.OR).toHaveLength(2); });
  it('does not query self interactions', async () => { const t = setup(); await assertNoBlockedInteraction(t.db, 'viewer', ['viewer']); expect(t.db.userBlock.findFirst).not.toHaveBeenCalled(); });
  it('builds a symmetric SQL owner filter for posts and paid results', () => { expect(visibleAuthor('viewer')).toEqual({ usersBlocked: { none: { blockedId: 'viewer' } }, blockedByUsers: { none: { blockerId: 'viewer' } } }); });
  it('deduplicates peers from both block directions', async () => { const t = setup(); t.db.userBlock.findMany.mockResolvedValue([{ blockerId: 'viewer', blockedId: 'owner' }, { blockerId: 'owner', blockedId: 'viewer' }]); expect(await blockedPeerIds(t.db, 'viewer')).toEqual(['owner']); });
  it.each([Role.EMLAKCI, Role.SUPER_ADMIN])('hides blocked pool authors for %s', async role => { const t = setup(); t.db.userBlock.findMany.mockResolvedValue([{ blockerId: 'viewer', blockedId: 'owner' }]); const service = new PoolAudienceService(t.db); expect(await service.filterVisibleUnits({ id: 'viewer', role }, [{ id: 'unit', project: { ownerId: 'owner' } }])).toEqual([]); });
  it('blocks direct conversation reads and writes before sending', async () => {
    const t = setup(); t.db.userBlock.findFirst.mockResolvedValue({ id: 'block' });
    t.db.conversation = { findUnique: jest.fn().mockResolvedValue({ id: 'conversation', NetworkPost: null, ConversationParticipant: [{ userId: 'viewer' }, { userId: 'owner' }] }), create: jest.fn() };
    const service = new MessagesService(t.db, {} as any);
    await expect(service.getConversation('conversation', 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getMessages('conversation', 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.sendMessage('conversation', { body: 'Merhaba' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.startConversation({ participantId: 'owner' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.db.message.create).not.toHaveBeenCalled(); expect(t.db.conversation.create).not.toHaveBeenCalled();
  });
  it('rejects abusive messages before persistence and notification', async () => {
    const t = setup(); t.db.conversation = { findUnique: jest.fn().mockResolvedValue({ id: 'conversation', NetworkPost: null, ConversationParticipant: [{ userId: 'viewer' }, { userId: 'owner' }] }) };
    t.db.message.findFirst.mockResolvedValue(null);
    const push = { sendToUser: jest.fn() }; const service = new MessagesService(t.db, push as any);
    await expect(service.sendMessage('conversation', { body: 'salak' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(BadRequestException);
    expect(t.db.message.create).not.toHaveBeenCalled(); expect(push.sendToUser).not.toHaveBeenCalled();
  });
});

describe('Financial and deletion regressions', () => {
  it.each(['poolLocation', 'poolPrivateInfo'])('blocked author refuses %s before entering a debit transaction', async action => {
    const t = setup();
    t.db.unit.findUnique = jest.fn().mockResolvedValue({ id: 'unit', project: { ownerId: 'owner' }, poolAudience: null });
    t.db.userBlock.findFirst.mockResolvedValue({ id: 'block' });
    const service: any = new UnitsService(t.db);
    service.ensurePoolActionMembership = jest.fn();
    service.getPoolUnitWithProjectOrFail = jest.fn().mockResolvedValue({ id: 'unit', project: { ownerId: 'owner' } });
    service.poolAudienceService = new PoolAudienceService(t.db);
    await expect(service[action]('unit', { id: 'viewer', role: Role.EMLAKCI }, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });
  it('scheduled account deletion removes both directions of block relationships', async () => {
    const tx: any = { accountDeletionRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      userBlock: { deleteMany: jest.fn() }, pushSubscription: { deleteMany: jest.fn() }, user: { update: jest.fn() } };
    const db: any = { accountDeletionRequest: { findMany: jest.fn().mockResolvedValue([{ id: 'request', userId: 'viewer' }]) },
      $transaction: jest.fn(callback => callback(tx)) };
    await new ProfileService(db, {} as any).processScheduledAccountDeletions();
    expect(tx.userBlock.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ blockerId: 'viewer' }, { blockedId: 'viewer' }] } });
    expect(tx.user.update).toHaveBeenCalled();
  });
});

describe('Safety evidence access and pagination', () => {
  it('never includes the content evidence in member responses', async () => {
    const t = setup(); await t.service.report('viewer', t.dto);
    expect(t.db.report.create.mock.calls[0][0].select).not.toHaveProperty('description');
    await t.service.mine('viewer'); expect(t.db.report.findMany.mock.calls[0][0].select).not.toHaveProperty('description');
  });
  it('denies unpaid post-linked message reports before reading them into evidence', async () => {
    const t = setup(); t.db.message.findFirst.mockResolvedValue({ senderId: 'owner', body: 'Private', Conversation: { NetworkPost: { id: 'post', userId: 'owner' } } });
    t.db.kontorHareketi = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(t.service.report('viewer', { ...t.dto, entityType: SafetyEntity.MESSAGE })).rejects.toBeInstanceOf(NotFoundException);
    expect(t.db.report.create).not.toHaveBeenCalled();
  });
  it('requires professional verification for new content-target actions', async () => {
    const t = setup(); (t.actor as any).professionalVerificationStatus = 'PENDING';
    await expect(t.service.block('viewer', t.dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.db.userBlock.upsert).not.toHaveBeenCalled();
  });
  it('redacts private deed-owner values before storing pool evidence', async () => {
    const t = setup(); t.db.unit.findFirst.mockResolvedValue({ id: 'unit', type: 'DAIRE', deedOwnerPhone: '05551234567', description: 'İlan 05551234567', project: { ownerId: 'owner' } });
    await t.service.report('viewer', { ...t.dto, entityType: SafetyEntity.POOL_UNIT });
    expect(t.db.report.create.mock.calls[0][0].data.description).not.toContain('05551234567');
  });
  it('pages blocked users so older blocks remain manageable', async () => {
    const t = setup(); t.db.userBlock.findMany.mockResolvedValue(Array.from({ length: 51 }, (_, id) => ({ id: String(id), createdAt: new Date(), blocked: { firstName: 'Örnek', lastName: 'Kişi', role: Role.EMLAKCI } })));
    const page = await t.service.listBlocks('viewer'); expect(page.blocks).toHaveLength(50); expect(page.nextBlockCursor).toBe('49');
    expect(t.db.userBlock.findMany.mock.calls[0][0].where).toEqual({ blockerId: 'viewer' });
  });
  it('rejects foreign block pagination cursors', async () => {
    const t = setup(); await expect(t.service.listBlocks('viewer', 'foreign')).rejects.toBeInstanceOf(BadRequestException);
    expect(t.db.userBlock.findFirst.mock.calls[0][0].where).toEqual({ id: 'foreign', blockerId: 'viewer' });
  });
});

describe('Blocked-list contact privacy', () => {
  it('never reveals a private listing author through block management', async () => {
    const t = setup(); t.db.userBlock.findMany.mockResolvedValue([{ id: 'block', createdAt: new Date(), label: 'Havuz ilanı #123456' }]);
    const page = await t.service.listBlocks('viewer'); expect(page.blocks[0].name).toBe('Havuz ilanı #123456');
    const select = t.db.userBlock.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('blocked'); expect(select).not.toHaveProperty('blockedId');
  });
});

describe('Blocked non-participant message authors', () => {
  it('also filters staff intervention messages without granting a block bypass', async () => {
    const t = setup(); t.db.conversation = { findUnique: jest.fn().mockResolvedValue({ id: 'conversation', NetworkPost: null, ConversationParticipant: [{ userId: 'viewer' }, { userId: 'owner' }] }) };
    t.db.message.findFirst.mockResolvedValue(null);
    t.db.userBlock.findMany.mockResolvedValue([{ blockerId: 'viewer', blockedId: 'staff' }]);
    t.db.message.findMany.mockResolvedValue([]);
    await new MessagesService(t.db, {} as any).getMessages('conversation', 'viewer', Role.EMLAKCI);
    expect(t.db.message.findMany.mock.calls[0][0].where.senderId).toEqual({ notIn: ['staff'] });
  });
});

describe('Safety HTTP authentication compatibility', () => {
  const { Test } = require('@nestjs/testing');
  const { PassportModule } = require('@nestjs/passport');
  const { sign } = require('jsonwebtoken');
  const request = require('supertest');
  const { ContentSafetyController } = require('./content-safety.controller');
  const { JwtStrategy } = require('../auth/strategies/jwt.strategy');
  const { JwtAuthGuard } = require('../auth/guards/jwt-auth.guard');
  const { PrismaService } = require('../prisma/prisma.service');
  let app: any;
  let t: ReturnType<typeof setup>;
  let authorization: string;
  beforeEach(async () => {
    t = setup(); t.actor.adminVisible = false;
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [ContentSafetyController],
      providers: [JwtStrategy, JwtAuthGuard, { provide: PrismaService, useValue: t.db },
        { provide: ContentSafetyService, useValue: t.service }],
    }).compile();
    app = module.createNestApplication(); await app.init();
    authorization = 'Bearer ' + sign({ sub: 'viewer' }, process.env.JWT_SECRET || 'sm-super-secret-jwt-key-degistirin', { expiresIn: '1m' });
  });
  afterEach(async () => { if (app) await app.close(); });
  it.each([SafetyEntity.NETWORK_POST, SafetyEntity.POOL_UNIT])('lets an authenticated hidden account read context, report and block %s through the real JWT guard', async entityType => {
    const server = app.getHttpServer();
    await request(server).get(`/safety/context/${entityType}/post`).set('Authorization', authorization).expect(200, { canReport: true, canBlock: true });
    await request(server).post('/safety/reports').set('Authorization', authorization).send({ ...t.dto, entityType }).expect(201);
    await request(server).post('/safety/blocks').set('Authorization', authorization).send({ entityType, entityId: 'post' }).expect(201);
    expect(t.db.report.create).toHaveBeenCalledTimes(1);
    expect(t.db.userBlock.upsert).toHaveBeenCalledTimes(1);
  });
  it.each(['isApproved', 'isVerified'] as const)('keeps %s disabled accounts out of HTTP safety routes', async flag => {
    t.actor[flag] = false;
    await request(app.getHttpServer()).get('/safety/context/NETWORK_POST/post').set('Authorization', authorization).expect(401);
    expect(t.db.report.create).not.toHaveBeenCalled(); expect(t.db.userBlock.upsert).not.toHaveBeenCalled();
  });
  it('rejects HTTP requests without authentication', async () => {
    await request(app.getHttpServer()).post('/safety/reports').send(t.dto).expect(401);
    expect(t.db.report.create).not.toHaveBeenCalled();
  });
});
