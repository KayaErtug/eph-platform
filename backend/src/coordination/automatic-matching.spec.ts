import { Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NetworkService } from '../network/network.service';
import { CrmService } from '../crm/crm.service';

describe('automatic matching after persistence', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  function network() {
    const post = { id: 'request', userId: 'ali', type: 'PORTFOY_ARIYORUM', title: 'Talep', isActive: true, expiresAt: new Date('2099-01-01'), tags: [], updatedAt: new Date() };
    let committed = false;
    const tx = { user: { findUnique: jest.fn().mockResolvedValue(null) }, kullaniciUyelikPaketi: { findFirst: jest.fn().mockResolvedValue(null) }, systemSetting: { findUnique: jest.fn().mockResolvedValue(null) }, networkPost: { create: jest.fn().mockResolvedValue(post) } };
    const prisma = {
      $transaction: jest.fn(async (callback: any) => { const result = await callback(tx); committed = true; return result; }),
      networkPost: { findFirst: jest.fn().mockResolvedValue(post), update: jest.fn().mockImplementation(async () => { committed = true; return post; }) },
      networkPostUpdateLog: { create: jest.fn() },
    };
    const service = new NetworkService(prisma as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const internal = service as any;
    internal.spendForumKontor = jest.fn().mockResolvedValue({ movement: { id: 'publish', miktar: 25, oncekiBakiye: 100, sonrakiBakiye: 75 }, wallet: { bakiye: 75 }, previousBalance: 100, remainingBalance: 75 });
    internal.validateForumPostInput = jest.fn().mockResolvedValue({ category: 'PORTFOY_ARIYORUM', title: 'Talep' });
    internal.validatePropertyDemandInput = jest.fn();
    internal.normalizeNetworkPostCriteria = jest.fn().mockReturnValue({ exactBudget: null, criteria: { areas: [], grossArea: { min: null, max: null }, budget: { min: null, max: null }, propertyTypes: [], roomCounts: [], features: [] } });
    internal.normalizeNetworkDemandPersistence = jest.fn().mockReturnValue({ features: [] });
    internal.serializeNetworkPostForViewer = jest.fn((record: any) => record);
    internal.getNetworkActionUser = jest.fn().mockResolvedValue({ id: 'ali' });
    internal.createUpdateNotifications = jest.fn();
    const handler = jest.fn(async () => { expect(committed).toBe(true); });
    service.registerRequestMatchHandler(handler);
    return { service, prisma, handler, post };
  }

  it('runs request matching only after create transaction commits', async () => {
    const { service, handler, post } = network();
    expect(await service.create({ userId: 'ali', type: post.type, title: post.title }, 'ali')).toMatchObject(post);
    expect(handler).toHaveBeenCalledWith('request', 'ali');
  });

  it('runs matching after a request update', async () => {
    const { service, handler } = network();
    await service.update('request', { title: 'Talep' } as any, 'ali');
    expect(handler).toHaveBeenCalledWith('request', 'ali');
  });

  it('does not scan when request persistence fails', async () => {
    const { service, prisma, handler } = network();
    prisma.$transaction.mockRejectedValueOnce(new Error('rollback'));
    await expect(service.create({ userId: 'ali', type: 'PORTFOY_ARIYORUM', title: 'Talep' }, 'ali')).rejects.toThrow('rollback');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fail a committed request when matching fails', async () => {
    const { service, handler, post } = network();
    handler.mockRejectedValueOnce(new Error('match unavailable'));
    await expect(service.create({ userId: 'ali', type: post.type, title: post.title }, 'ali')).resolves.toMatchObject(post);
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });

  it.each(['DUYURU', 'IS_BIRLIGI'])('does not scan unrelated category %s', async (type) => {
    const { service, handler, post } = network();
    post.type = type;
    await service.create({ userId: 'ali', type, title: post.title }, 'ali');
    expect(handler).not.toHaveBeenCalled();
  });

  function crm() {
    const interest = { id: 'interest', isActive: true, propertyTypes: [] };
    const prisma = { customerInterest: { create: jest.fn().mockResolvedValue(interest), update: jest.fn().mockResolvedValue(interest) } };
    const service = new CrmService(prisma as any, {} as any, {} as any);
    (service as any).findCustomerForAccess = jest.fn();
    (service as any).findInterestForAccess = jest.fn().mockResolvedValue(interest);
    (service as any).cleanInterestData = jest.fn((data: any) => data);
    const handler = jest.fn(async () => undefined);
    service.registerInterestMatchHandler(handler);
    return { service, prisma, handler, interest };
  }

  it('scans CRM interest creation and update without exposing the customer', async () => {
    const { service, handler, interest } = crm();
    expect(await service.addCustomerInterest('customer', 'ali', Role.EMLAKCI, {})).toEqual(interest);
    expect(await service.updateCustomerInterest('interest', 'ali', Role.EMLAKCI, {})).toEqual(interest);
    expect(handler.mock.calls).toEqual([['interest'], ['interest']]);
  });

  it('skips inactive CRM interests and persistence failures', async () => {
    const { service, prisma, handler, interest } = crm();
    interest.isActive = false;
    await service.updateCustomerInterest('interest', 'ali', Role.EMLAKCI, {});
    prisma.customerInterest.create.mockRejectedValueOnce(new Error('write failed'));
    await expect(service.addCustomerInterest('customer', 'ali', Role.EMLAKCI, {})).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('preserves the saved CRM interest on matching failure', async () => {
    const { service, handler, interest } = crm();
    handler.mockRejectedValueOnce(new Error('match unavailable'));
    await expect(service.addCustomerInterest('customer', 'ali', Role.EMLAKCI, {})).resolves.toEqual(interest);
  });
});
