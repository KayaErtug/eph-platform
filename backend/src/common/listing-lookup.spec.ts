import { UnitsService } from '../units/units.service';
import { NetworkService } from '../network/network.service';
import { PoolExperienceService } from '../pool-experience/pool-experience.service';
import {
  listingNumber,
  generateRequestListingNumber,
  isValidRequestListingNumber,
  normalizeRequestListingNumber,
  parseListingNumberOrId,
} from './listing-number';
const id = '31fec5b4-85e6-4647-9ff3-764127aecede';
const user = { id: 'viewer', role: 'EMLAKCI' };
describe('Exact listing lookup and passive privacy', () => {
  let db: any; let network: NetworkService; let pool: PoolExperienceService; let audience: any;
  beforeEach(() => {
    db = { user: { findUnique: jest.fn().mockResolvedValue({ role: 'EMLAKCI' }) }, networkPost: { findFirst: jest.fn() }, unit: { findFirst: jest.fn() } };
    audience = { filterVisibleUnits: jest.fn(async (_user, rows) => rows) };
    network = new NetworkService(db, {} as any, {} as any, {} as any, {} as any, {} as any);
    pool = new PoolExperienceService(db, {} as any, {} as any, audience);
  });
  it('accepts copied # and case while retaining full immutable UUID', () => expect(listingNumber(' #' + id.toUpperCase() + ' ')).toBe(id));
  it.each(['31FEC5', '', '123', id + "' OR 1=1", undefined])('rejects incomplete/invalid identifier %s', v => expect(() => listingNumber(v)).toThrow());
  it('network lookup active returns only status/id with same audience scope', async () => {
    db.networkPost.findFirst.mockResolvedValue({ id, isActive: true, expiresAt: new Date('2099-01-01') });
    expect(await network.lookupListing(id, user.id)).toEqual({ id, status: 'ACTIVE' });
    expect(db.networkPost.findFirst.mock.calls[0][0]).toMatchObject({ where: { id, AND: [{ AND: [{ OR: [{ visibility: 'TUM_EPH' }, { userId: 'viewer' }, { visibility: 'SADECE_EMLAKCILAR' }] }, { User: { blockedByUsers: { none: { blockerId: 'viewer' } }, usersBlocked: { none: { blockedId: 'viewer' } } } }] }] }, select: { id: true, isActive: true, expiresAt: true } });
  });
  it.each([{ isActive: false, expiresAt: new Date('2099-01-01') }, { isActive: true, expiresAt: new Date('2020-01-01') }])('network passive/expired returns no detail %p', async state => {
    db.networkPost.findFirst.mockResolvedValue({ id, ...state });
    expect(await network.lookupListing(id, user.id)).toEqual({ id, status: 'PASSIVE' });
    await expect(network.findOne(id, user.id)).rejects.toThrow(/pasif/);
  });
  it('network unavailable/unauthorized is indistinguishable from missing', async () => {
    db.networkPost.findFirst.mockResolvedValue(null);
    await expect(network.lookupListing(id, user.id)).rejects.toThrow('İlan bulunamadı.');
    await expect(network.lookupListing(id, null)).rejects.toThrow('İlan bulunamadı.');
  });
  function unit(overrides = {}) { return { id, isPoolVisible: true, approvalStatus: 'HAVUZDA', status: 'SATILIK', project: { ownerId: 'owner', isActive: true }, ...overrides }; }
  it('pool lookup requires previous publication and checks audience', async () => {
    db.unit.findFirst.mockResolvedValue(unit());
    expect(await pool.lookupListing(id, user)).toEqual({ id, status: 'ACTIVE' });
    expect(db.unit.findFirst.mock.calls[0][0]).toMatchObject({ where: { id, project: { code: null }, OR: [{ poolPublishedAt: { not: null } }, { poolRemovedAt: { not: null } }, { isPoolVisible: true, approvalStatus: 'HAVUZDA' }] } });
    expect(audience.filterVisibleUnits).toHaveBeenCalledWith(user, [unit()]);
    expect(Object.keys(db.unit.findFirst.mock.calls[0][0].select).sort()).toEqual(['approvalStatus', 'id', 'isPoolVisible', 'project', 'status']);
  });
  it.each([{ isPoolVisible: false }, { approvalStatus: 'TASLAK' }, { status: 'PASIF' }, { status: 'SATILDI' }, { status: 'KIRALANDII' }, { project: { ownerId: 'owner', isActive: false } }])('pool passive state never returns detail %p', async state => {
    db.unit.findFirst.mockResolvedValue(unit(state));
    expect(await pool.lookupListing(id, user)).toEqual({ id, status: 'PASSIVE' });
  });
  it('targeted audience denial and unpublished unit do not disclose even status', async () => {
    db.unit.findFirst.mockResolvedValue(unit()); audience.filterVisibleUnits.mockResolvedValue([]);
    await expect(pool.lookupListing(id, user)).rejects.toThrow('İlan bulunamadı.');
    db.unit.findFirst.mockResolvedValue(null);
    await expect(pool.lookupListing(id, user)).rejects.toThrow('İlan bulunamadı.');
  });
  it.each(['PASIF', 'SATILDI', 'KIRALANDII'])('passive %s denies paid private info before transaction', async status => {
    const units = Object.create(UnitsService.prototype) as any;
    const prisma = { unit: { findUnique: jest.fn().mockResolvedValue({ id, isPoolVisible: true, approvalStatus: 'HAVUZDA', status,
      project: { ownerId: 'owner', isActive: true, code: null, declaredIndependentUnitCount: null, declaredSalesInventoryCount: null, plannedUnitTypes: [] } }) }, $transaction: jest.fn() };
    units.prisma = prisma;
    await expect(units.poolPrivateInfo(id, user)).rejects.toThrow(/aktif değil/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('company is masked in anonymous and paid public request cards', () => {
    (network as any).propertyDemandAdapter = { fromNetworkPost: () => ({ cardProfileCriteria: {} }) };
    const post = { id, userId: 'owner', User: { id: 'owner', role: 'EMLAKCI', firstName: 'Ali', lastName: 'Kaya', companyName: 'Özel Firma' } };
    for (const paid of [false, true]) {
      const result = (network as any).serializeNetworkPostForViewer(post, user.id, paid);
      expect(JSON.stringify(result)).not.toContain('Özel Firma');
      expect(result.listingOfficeName).toBeNull();
    }
  });
  it('active pool list excludes passive/sold/rented and emits actual publication date', async () => {
    db.unit.findMany = jest.fn().mockResolvedValue([]); db.customer = { findMany: jest.fn().mockResolvedValue([]) }; db.kontorHareketi = { findMany: jest.fn().mockResolvedValue([]) };
    (pool as any).adminService = { getNumericSystemSetting: jest.fn().mockResolvedValue(25) };
    expect(await pool.findPoolUnits(user)).toEqual([]);
    expect(db.unit.findMany.mock.calls[0][0].where).toMatchObject({ status: { notIn: ['PASIF', 'SATILDI', 'KIRALANDII'] }, isPoolVisible: true, project: { isActive: true } });
  });
});

describe('Talep Merkezi 7-char short listing number acceptance suite', () => {
  let db: any;
  let network: NetworkService;

  beforeEach(() => {
    db = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'EMLAKCI' }) },
      networkPost: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      kontorHareketi: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    network = new NetworkService(db, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  // Kabul Testi 1: Üretim: 7 karakter, alfanümerik, hem harf hem rakam, kalıcı numara.
  it('Kabul 1: generates exactly 7-character alphanumeric code with both letters and digits', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRequestListingNumber();
      expect(code).toHaveLength(7);
      expect(code).toMatch(/^[0-9A-Z]{7}$/);
      expect(code).toMatch(/[A-Z]/);
      expect(code).toMatch(/[0-9]/);
      expect(isValidRequestListingNumber(code)).toBe(true);
    }
  });

  // Kabul Testi 2: Normalizasyon ve tolerans (# ve case-insensitive, boşluklar)
  it('Kabul 2: normalizes lowercase, surrounding spaces and optional # prefix', () => {
    expect(normalizeRequestListingNumber('  #a7k3m9q ')).toBe('A7K3M9Q');
    expect(normalizeRequestListingNumber('#A7K3M9Q')).toBe('A7K3M9Q');
    expect(normalizeRequestListingNumber('A7K3M9Q')).toBe('A7K3M9Q');
    expect(parseListingNumberOrId(' #a7k3m9q ')).toEqual({
      type: 'LISTING_NUMBER',
      value: 'A7K3M9Q',
    });
    expect(parseListingNumberOrId(id)).toEqual({
      type: 'UUID',
      value: id,
    });
  });

  // Kabul Testi 3: Geçersiz formatların reddedilmesi
  it.each(['A7K3M', 'A7K3M9QQ', 'AAAAAAA', '1234567', '', '  ', 'A7K3M9Q; DROP TABLE', undefined])(
    'Kabul 3: rejects invalid code %s',
    (val) => {
      expect(isValidRequestListingNumber(val)).toBe(false);
      expect(() => parseListingNumberOrId(val)).toThrow();
    },
  );

  // Kabul Testi 4: Kısa numarayla aktif talep arama
  it('Kabul 4: lookupListing searches with listingNumber for 7-char input and returns active state', async () => {
    const listingNumber = 'A7K3M9Q';
    db.networkPost.findFirst.mockResolvedValue({
      id,
      listingNumber,
      isActive: true,
      expiresAt: new Date('2099-01-01'),
    });

    const result = await network.lookupListing('#' + listingNumber.toLowerCase(), user.id);
    expect(result).toEqual({ id, listingNumber, status: 'ACTIVE' });
    expect(db.networkPost.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          listingNumber,
        }),
      }),
    );
  });

  // Kabul Testi 5: Kısa numarayla pasif talep arama ve detay gizliliği
  it('Kabul 5: lookupListing with short code returns PASSIVE and findOne blocks detail retrieval', async () => {
    const listingNumber = 'A7K3M9Q';
    db.networkPost.findFirst.mockResolvedValue({
      id,
      listingNumber,
      isActive: false,
      expiresAt: new Date('2099-01-01'),
    });

    const result = await network.lookupListing(listingNumber, user.id);
    expect(result).toEqual({ id, listingNumber, status: 'PASSIVE' });
    await expect(network.findOne(listingNumber, user.id)).rejects.toThrow(/pasif/);
  });

  // Kabul Testi 6: findOne kısa kodla da arayabilmeli ve aktif ilanda detay döndürmeli
  it('Kabul 6: findOne resolves with 7-char listingNumber successfully', async () => {
    const listingNumber = 'A7K3M9Q';
    const mockPost = {
      id,
      listingNumber,
      userId: 'owner',
      title: 'Kadıköy 3+1 Daire',
      description: 'Acil satılık',
      type: 'PORTFOY_ARIYORUM',
      isActive: true,
      expiresAt: new Date('2099-01-01'),
      User: { id: 'owner', role: 'EMLAKCI', firstName: 'Mehmet', lastName: 'Demir' },
    };
    db.networkPost.findFirst.mockResolvedValue(mockPost);
    (network as any).propertyDemandAdapter = { fromNetworkPost: () => ({ cardProfileCriteria: {} }) };

    const detail = await network.findOne(listingNumber, user.id);
    expect(detail).toBeDefined();
    expect(detail.id).toBe(id);
    expect(detail.listingNumber).toBe(listingNumber);
  });

  // Kabul Testi: Aynı kodun iki yazımda üretilmesi ve eşzamanlı unique çakışması doğru yeniden denensin
  it('Kabul 7: retries on unique collision (P2002) and succeeds on second attempt', async () => {
    let callCount = 0;
    const tx = {
      networkPost: {
        create: jest.fn().mockImplementation(async (args) => {
          callCount++;
          if (callCount === 1) {
            const err: any = new Error('Unique constraint failed on the fields: (`listingNumber`)');
            err.code = 'P2002';
            err.meta = { target: ['listingNumber'] };
            throw err;
          }
          return {
            id: 'new-post-id',
            listingNumber: args.data.listingNumber,
            userId: 'owner',
            type: 'PORTFOY_ARIYORUM',
            title: 'Test',
            isActive: true,
            expiresAt: new Date('2099-01-01'),
            User: { id: 'owner', role: 'EMLAKCI' },
          };
        }),
      },
    };
    (tx as any).user = { findUnique: jest.fn().mockResolvedValue(null) };
    (tx as any).systemSetting = { findUnique: jest.fn().mockResolvedValue(null) };
    (network as any).prisma = {
      $transaction: jest.fn(async (cb) => cb(tx)),
      user: db.user,
    };
    (network as any).validateForumPostInput = jest.fn().mockResolvedValue({
      category: 'PORTFOY_ARIYORUM',
      title: 'Test',
      description: 'Desc',
      requestType: 'SATILIK',
    });
    (network as any).validatePropertyDemandInput = jest.fn();
    (network as any).normalizeNetworkPostCriteria = jest.fn().mockReturnValue({
      criteria: { areas: [], propertyTypes: [], roomCounts: [], features: [], grossArea: {}, budget: {}, priceCurrency: 'TRY' },
      exactBudget: null,
    });
    (network as any).normalizeNetworkDemandPersistence = jest.fn().mockReturnValue({ features: [], cardProfileCriteria: null });
    (network as any).normalizeContactSettings = jest.fn().mockReturnValue({});
    (network as any).spendForumKontor = jest.fn().mockResolvedValue({
      movement: { id: 'mov-1', miktar: 25, oncekiBakiye: 100 },
      wallet: { bakiye: 75 },
    });
    (network as any).propertyDemandAdapter = { fromNetworkPost: () => ({ cardProfileCriteria: {} }) };
    (network as any).refreshRequestMatches = jest.fn().mockResolvedValue(undefined);

    const created = await network.create({ title: 'Test', description: 'Desc', type: 'PORTFOY_ARIYORUM' } as any, 'owner');
    expect(callCount).toBe(2);
    expect(created.listingNumber).toBeDefined();
    expect(created.listingNumber).toMatch(/^[0-9A-Z]{7}$/);
  });
});

