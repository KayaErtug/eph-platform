import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PoolAudienceMode, Role } from '@prisma/client';
import { PoolAudienceService } from '../pool-audience/pool-audience.service';
import { PoolProjectsService } from '../pool-projects/pool-projects.service';
import { NativePushService } from '../push/native-push.service';
import { ProjectSalesSetupService } from './project-sales-setup.service';
import { ProjectSalesLaunchService } from './project-sales-launch.service';
import { ProjectsService } from '../projects/projects.service';
import { UnitsService } from '../units/units.service';

describe('Project release access', () => {
  it('hides projects with no allowed units and calculates details from allowed inventory only', async () => {
    const audience = { filterVisibleUnits: jest.fn().mockResolvedValue([{ id: 'a' }]) };
    const service: any = new PoolProjectsService({} as any, {} as any, audience as any);
    const result = await service.visibleProjects([
      { ownerId: 'owner', units: [{ id: 'a' }, { id: 'private' }] },
      { ownerId: 'other', units: [{ id: 'hidden' }] },
    ], { id: 'viewer' });
    expect(result).toEqual([{ ownerId: 'owner', units: [{ id: 'a' }] }]);
  });

  it('denies direct detail access when the viewer cannot see any unit', async () => {
    const service: any = new PoolProjectsService({} as any, {} as any, { filterVisibleUnits: jest.fn().mockResolvedValue([]) } as any);
    service.findProject = jest.fn().mockResolvedValue({ ownerId: 'owner', units: [{ id: 'a' }] });
    service.findCustomers = jest.fn().mockResolvedValue([]);
    await expect(service.getProjectDetail('p', { id: 'viewer' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not allow the legacy project URL to return private source fields', async () => {
    const project = { id: 'p', ownerId: 'owner', address: 'private', units: [{ contactPhone: 'private' }] };
    const pool = { getProjectDetail: jest.fn().mockResolvedValue({ id: 'p', units: [] }) };
    const service = new ProjectsService({ project: { findFirst: jest.fn().mockResolvedValue(project) } } as any, pool as any);
    expect(await service.findOne('p', { id: 'viewer' })).toEqual({ id: 'p', units: [] });
    expect(pool.getProjectDetail).toHaveBeenCalledWith('p', { id: 'viewer' });
  });

  it('keeps the owner view of the legacy URL intact', async () => {
    const project = { id: 'p', ownerId: 'owner', units: [] };
    const pool = { getProjectDetail: jest.fn() };
    const service = new ProjectsService({ project: { findFirst: jest.fn().mockResolvedValue(project) } } as any, pool as any);
    expect(await service.findOne('p', { id: 'owner' })).toBe(project);
    expect(pool.getProjectDetail).not.toHaveBeenCalled();
  });

  it.each([['145802', 6, '145802'], ['3698', 4, '3698'], ['', 6, null], ['000123', 6, '000123']])('preserves cadastral identifier %s as text', (value, limit, expected) => {
    const service: any = new ProjectSalesSetupService({} as any);
    expect(service.cadastralNumber(value, limit, 'Ada')).toBe(expected);
  });

  it.each([['1234567', 6], ['12345', 4], ['12.34', 6], ['12A', 4], ['-12', 6]])('rejects invalid cadastral identifier %s', (value, limit) => {
    const service: any = new ProjectSalesSetupService({} as any);
    expect(() => service.cadastralNumber(value, limit, 'Ada')).toThrow(BadRequestException);
  });

  function audienceFixture() {
    const tx: any = {
      $executeRaw: jest.fn(),
      project: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'owner', units: [{ id: 'u1' }, { id: 'u2' }] }) },
      poolAudienceGroup: { count: jest.fn().mockResolvedValue(1) },
      poolAudienceUnit: { deleteMany: jest.fn(), createMany: jest.fn() },
      poolAudienceUnitGroup: { createMany: jest.fn() },
    };
    const db = { ...tx, $transaction: jest.fn(fn => fn(tx)) };
    return { tx, db, service: new PoolAudienceService(db as any) };
  }

  it('rejects audience changes by another project owner before writing anything', async () => {
    const f = audienceFixture();
    await expect(f.service.setProjectAudience('p', { id: 'intruder' }, { mode: 'PUBLIC' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.tx.poolAudienceUnit.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects audience groups owned by another account', async () => {
    const f = audienceFixture(); f.tx.poolAudienceGroup.count.mockResolvedValue(0);
    await expect(f.service.setProjectAudience('p', { id: 'owner' }, { mode: 'TARGETED', groupIds: ['foreign'] })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.poolAudienceUnit.deleteMany).not.toHaveBeenCalled();
  });

  it('sets the same chosen audience on every sales unit in one transaction', async () => {
    const f = audienceFixture();
    await f.service.setProjectAudience('p', { id: 'owner' }, { mode: 'TARGETED', roles: [Role.EMLAKCI], groupIds: ['g'] });
    expect(f.db.$transaction).toHaveBeenCalledTimes(1);
    expect(f.tx.poolAudienceUnit.createMany).toHaveBeenCalledWith({ data: [
      { unitId: 'u1', mode: PoolAudienceMode.TARGETED, roles: [Role.EMLAKCI] },
      { unitId: 'u2', mode: PoolAudienceMode.TARGETED, roles: [Role.EMLAKCI] },
    ] });
    expect(f.tx.poolAudienceUnitGroup.createMany).toHaveBeenCalledWith({ data: [{ unitId: 'u1', groupId: 'g' }, { unitId: 'u2', groupId: 'g' }] });
  });

  it('does not publish anything when audience validation fails', async () => {
    const updateMany = jest.fn(); const tx = { unit: { updateMany, count: jest.fn().mockResolvedValue(1) } };
    const db = { $transaction: jest.fn(fn => fn(tx)) };
    const audience = { setProjectAudience: jest.fn().mockRejectedValue(new BadRequestException('invalid')) };
    const service: any = new ProjectSalesLaunchService(db as any, audience as any);
    service.getAuthorizedProject = jest.fn().mockResolvedValue({ id: 'p' });
    service.getProjectStats = jest.fn().mockReturnValue({});
    service.buildPublishReadiness = jest.fn().mockReturnValue({ ready: true });
    await expect(service.publishToPool('p', 'owner', Role.MUTEAHHIT, { mode: 'TARGETED' })).rejects.toThrow('invalid');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('project already in the pool is republished without a PK charge', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 }); const tx = { unit: { updateMany, count: jest.fn().mockResolvedValue(2) }, kontorHareketi: { create: jest.fn() } };
    const db = { $transaction: jest.fn(fn => fn(tx)) };
    const service: any = new ProjectSalesLaunchService(db as any, { setProjectAudience: jest.fn() } as any);
    service.getAuthorizedProject = jest.fn().mockResolvedValue({ id: 'p', name: 'Proje' });
    service.getProjectStats = jest.fn().mockReturnValue({});
    service.buildPublishReadiness = jest.fn().mockReturnValue({ ready: true });
    service.getProject = jest.fn().mockResolvedValue({ id: 'p' });
    service.serializeProject = jest.fn().mockReturnValue({});
    const result = await service.publishToPool('p', 'owner', Role.MUTEAHHIT, undefined, { expectedCostPk: 0 });
    expect(result.billing.spent).toBe(0);
    expect(tx.kontorHareketi.create).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalled();
  });

  it('rejects a changed project pool tariff before charging', async () => {
    const updateMany = jest.fn(); const tx = { unit: { updateMany, count: jest.fn().mockResolvedValue(0) }, systemSetting: { findUnique: jest.fn().mockResolvedValue(null) } };
    const db = { $transaction: jest.fn(fn => fn(tx)) };
    const service: any = new ProjectSalesLaunchService(db as any, { setProjectAudience: jest.fn() } as any);
    service.getAuthorizedProject = jest.fn().mockResolvedValue({ id: 'p', name: 'Proje' });
    service.getProjectStats = jest.fn().mockReturnValue({});
    service.buildPublishReadiness = jest.fn().mockReturnValue({ ready: true });
    await expect(service.publishToPool('p', 'owner', Role.MUTEAHHIT, undefined, { expectedCostPk: 50 })).rejects.toThrow('ücretini kontrol');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not expose targeted inventory through a public presentation token', async () => {
    const service = new PoolAudienceService({ poolAudienceUnit: { findMany: jest.fn().mockResolvedValue([{ unitId: 'private' }]) } } as any);
    expect(await service.filterPublicUnits([{ id: 'public' }, { id: 'private' }])).toEqual([{ id: 'public' }]);
  });

  it('rejects a changed private-access tariff before charging', async () => {
    const tx = { $executeRaw: jest.fn(), $queryRaw: jest.fn(), user: { findUnique: jest.fn().mockResolvedValue({ id: 'viewer', role: Role.MUTEAHHIT }) }, office: { findFirst: jest.fn().mockResolvedValue(null) }, systemSetting: { findUnique: jest.fn().mockResolvedValue(null) }, kontorHareketi: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service: any = new UnitsService({ $transaction: jest.fn(fn => fn(tx)) } as any);
    service.getPoolUnitWithProjectOrFail = jest.fn().mockResolvedValue({ id: 'u', project: { ownerId: 'owner' } });
    service.poolAudienceService = { assertCanViewUnit: jest.fn() };
    service.adminService = { getNumericSystemSetting: jest.fn().mockResolvedValue(30) };
    service.ensurePoolActionMembership = jest.fn();
    service.spendKontor = jest.fn();
    await expect(service.poolPrivateInfo('u', { id: 'viewer' }, 25)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.spendKontor).not.toHaveBeenCalled();
  });
});

describe('Native notification registration', () => {
  const token = 'ExponentPushToken[abcdefghijklmno]';
  let fetchMock: jest.SpyInstance;
  beforeEach(() => { fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ok' } }) } as any); });
  afterEach(() => fetchMock.mockRestore());

  it('rejects malformed tokens without storing a subscription', async () => {
    const upsert = jest.fn(); const service = new NativePushService({ systemSetting: { upsert } } as any);
    await expect(service.subscribe('viewer', { token: 'bad', platform: 'ios' })).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('uses the authenticated owner for subscribe and unsubscribe', async () => {
    const upsert = jest.fn(), deleteMany = jest.fn();
    const db: any = { systemSetting: { upsert, deleteMany, findMany: jest.fn().mockResolvedValue([]) }, $executeRaw: jest.fn() };
    db.$transaction = jest.fn(fn => fn(db));
    const service = new NativePushService(db);
    await service.subscribe('viewer', { token, platform: 'ios' });
    expect(upsert.mock.calls[0][0].create.valueJson.userId).toBe('viewer');
    await service.unsubscribe('viewer', { token });
    expect(deleteMany.mock.calls[0][0].where.valueJson).toEqual({ path: ['userId'], equals: 'viewer' });
  });

  it('does not send to a subscription whose matching category is disabled', async () => {
    const row = { key: 'k', valueJson: { userId: 'viewer', token, preferences: { messages: false } } };
    const service = new NativePushService({ systemSetting: { findMany: jest.fn().mockResolvedValue([row]) } } as any);
    expect((await service.sendToUser('viewer', { title: 't', body: 'b', url: '/messages' })).successCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only server-selected subscriptions and respects silent mode', async () => {
    const row = { key: 'k', valueJson: { userId: 'viewer', token, sound: false, preferences: { messages: true } } };
    const findMany = jest.fn().mockResolvedValue([row]);
    const service = new NativePushService({ systemSetting: { findMany } } as any);
    expect((await service.sendToUser('viewer', { title: 't', body: 'b', url: '/messages' })).ok).toBe(true);
    expect(findMany.mock.calls[0][0].where.valueJson.equals).toBe('viewer');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).sound).toBeNull();
  });

  it('removes unusable tokens when Expo reports DeviceNotRegistered', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }) });
    const deleteMany = jest.fn();
    const service = new NativePushService({ systemSetting: { findMany: jest.fn().mockResolvedValue([{ key: 'k', valueJson: { userId: 'viewer', token } }]), deleteMany } } as any);
    expect((await service.sendToUser('viewer', { title: 't', body: 'b' })).ok).toBe(false);
    expect(deleteMany).toHaveBeenCalledWith({ where: { key: 'k', valueJson: { path: ['userId'], equals: 'viewer' } } });
  });
  it('handles a delayed DeviceNotRegistered receipt and removes the corresponding subscription only', async () => {
    const id = 'receipt';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { [id]: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }) });
    const deleteMany = jest.fn();
    const service = new NativePushService({ systemSetting: { findMany: jest.fn().mockResolvedValue([{ key: 'EPH_PUSH_RECEIPT_' + id, createdAt: new Date(Date.now() - 120000), valueJson: { userId: 'viewer', token } }]), deleteMany } } as any);
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await service.collectReceipts();
    expect(deleteMany.mock.calls[0][0].where.valueJson).toEqual({ path: ['userId'], equals: 'viewer' });
    expect(deleteMany.mock.calls[1][0].where.key).toBe('EPH_PUSH_RECEIPT_receipt');
    warning.mockRestore();
  });

});
