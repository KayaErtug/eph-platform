import { Role, UyelikDurumu } from '@prisma/client';
import { resolvePoolAccess } from './pool-access';
import { consumeMembershipQuota } from './membership-quota.rules';
import { UnitsService } from '../units/units.service';
import { PortfolioDocumentsService } from '../portfolio-documents/portfolio-documents.service';

const now = new Date('2026-10-31T12:00:00Z');
const future = new Date('2026-12-31T12:00:00Z');
const past = new Date('2026-09-01T12:00:00Z');
const personal = (overrides = {}) => ({ id: 'membership', paketId: 'personal', durum: UyelikDurumu.SURESI_DOLDU as UyelikDurumu, baslangicTarihi: past, bitisTarihi: past, ...overrides });

function setup(owner = false) {
  const state = {
    membership: personal() as ReturnType<typeof personal> | null,
    personalActive: true,
    officeActive: true,
    linked: true,
    expiresAt: future.toISOString() as string | null,
    code: 'GOLD',
    packages: [{ code: 'GOLD', name: 'Altın Ofis', active: true }] as Record<string, unknown>[],
    used: 0,
  };
  const office = { id: 'office', ownerUserId: owner ? 'actor' : 'owner', isActive: true };
  const db = {
    user: { findUnique: jest.fn(async () => ({ id: 'actor', role: Role.EMLAKCI, officeId: owner || !state.linked ? null : 'office' })) },
    office: {
      findMany: jest.fn(async ({ where }) => state.officeActive && (owner || state.linked) && where.isActive ? [{ id: 'office' }] : []),
      findUnique: jest.fn(async () => ({ ...office, isActive: state.officeActive })),
      findFirst: jest.fn(async () => owner && state.officeActive ? office : null),
    },
    kullaniciUyelikPaketi: { findFirst: jest.fn(async ({ where }) => {
      const membership = state.membership;
      if (!membership) return null;
      if (!where.durum) return membership;
      return membership.durum === 'AKTIF' && membership.baslangicTarihi <= now && (membership.bitisTarihi === null || membership.bitisTarihi >= now) ? membership : null;
    }) },
    uyelikPaketi: { findUnique: jest.fn(async () => ({ paketKodu: 'ALTIN', paketAdi: 'Kişisel Altın', aktifMi: state.personalActive, aylikTalepLimiti: 1, aylikHavuzGonderimLimiti: 1 })) },
    systemSetting: { findUnique: jest.fn(async ({ where }) => {
      if (where.key === 'OFFICE_MEMBERSHIP_PACKAGES') return { valueJson: state.packages };
      if (where.key === 'OFFICE_SUBSCRIPTION_office') return { valueJson: { packageCode: state.code, expiresAt: state.expiresAt } };
      return null;
    }) },
    $executeRaw: jest.fn(async () => 1),
    kotaKullanimi: { upsert: jest.fn(async () => ({ id: 'quota', kullanilan: state.used })), update: jest.fn(async () => ({})) },
  };
  return { db, state };
}

describe('EPH-89 shared pool membership access', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); });
  afterEach(() => jest.useRealTimers());

  it('keeps valid personal membership first, without requiring an office', async () => {
    const { db, state } = setup(); state.membership = personal({ durum: UyelikDurumu.AKTIF, bitisTarihi: future });
    state.officeActive = false;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: true, code: 'ACTIVE', packageName: 'Kişisel Altın', expiresAt: future });
    expect(db.office.findMany).not.toHaveBeenCalled();
  });

  it.each([true, false])('expired personal + active office: owner=%s', async owner => {
    const { db } = setup(owner);
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toEqual({ allowed: true, code: 'OFFICE_PACKAGE', message: 'Ofis paketiniz ile Havuz işlem erişiminiz aktif.', packageCode: 'GOLD', packageName: 'Altın Ofis', expiresAt: future, officeId: 'office' });
    expect(db.office.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true, OR: owner ? [{ ownerUserId: 'actor' }] : [{ ownerUserId: 'actor' }, { id: 'office' }] } }));
  });

  it.each([true, false])('no personal membership + active office: owner=%s', async owner => {
    const { db, state } = setup(owner); state.membership = null;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: true, code: 'OFFICE_PACKAGE' });
  });

  it('returns existing EXPIRED message when both memberships have expired', async () => {
    const { db, state } = setup(); state.expiresAt = past.toISOString();
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: false, code: 'EXPIRED', message: 'Üyelik süreniz dolduğu için Havuz işlemleri kilitlidir. Havuzu görüntülemeye devam edebilirsiniz.' });
  });

  it('inactive office cannot rescue expired personal membership', async () => {
    const { db, state } = setup(); state.officeActive = false;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: false, code: 'EXPIRED' });
  });

  it.each(['not-a-date', now.toISOString()])('rejects malformed or elapsed office expiry: %s', async expiresAt => {
    const { db, state } = setup(); state.expiresAt = expiresAt;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: false, code: 'EXPIRED' });
  });

  it('supports a subscription with no expiry, like the existing office eligibility source', async () => {
    const { db, state } = setup(); state.expiresAt = null;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: true, code: 'OFFICE_PACKAGE', expiresAt: null });
  });

  it('rejects inactive, missing or unrelated office packages', async () => {
    const { db, state } = setup(); state.packages[0].active = false;
    expect((await resolvePoolAccess(db as any, { id: 'actor' })).allowed).toBe(false);
    state.packages = [];
    expect((await resolvePoolAccess(db as any, { id: 'actor' })).allowed).toBe(false);
    state.linked = false;
    expect((await resolvePoolAccess(db as any, { id: 'actor' })).allowed).toBe(false);
  });

  it('keeps NOT_STARTED when no office package can rescue access', async () => {
    const { db, state } = setup(); state.membership = personal({ durum: UyelikDurumu.AKTIF, baslangicTarihi: future, bitisTarihi: future }); state.officeActive = false;
    expect(await resolvePoolAccess(db as any, { id: 'actor' })).toMatchObject({ allowed: false, code: 'NOT_STARTED' });
  });

  it('SUPER_ADMIN is always allowed, without membership or office reads', async () => {
    const { db } = setup();
    expect(await resolvePoolAccess(db as any, { id: 'super', role: Role.SUPER_ADMIN })).toMatchObject({ allowed: true, code: 'SUPER_ADMIN' });
    expect(db.kullaniciUyelikPaketi.findFirst).not.toHaveBeenCalled(); expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('both service guards and GET pool/wallet use the shared office access', async () => {
    const { db } = setup();
    const units = Object.assign(Object.create(UnitsService.prototype), { prisma: db, getOrCreateKontorWallet: jest.fn(async () => ({ bakiye: 50, aktifMi: true })) });
    const documents = Object.assign(Object.create(PortfolioDocumentsService.prototype), { prisma: db });
    expect(await units.ensurePoolActionMembership({ id: 'actor' })).toMatchObject({ code: 'OFFICE_PACKAGE' });
    expect(await documents.ensurePoolActionMembership('actor')).toMatchObject({ code: 'OFFICE_PACKAGE' });
    expect((await units.getPoolWallet({ id: 'actor' })).membershipAccess).toMatchObject({ allowed: true, code: 'OFFICE_PACKAGE' });
  });

  it('both guards keep the existing denial after office expiry', async () => {
    const { db, state } = setup(); state.expiresAt = past.toISOString();
    const units = Object.assign(Object.create(UnitsService.prototype), { prisma: db });
    const documents = Object.assign(Object.create(PortfolioDocumentsService.prototype), { prisma: db });
    await expect(units.ensurePoolActionMembership({ id: 'actor' })).rejects.toThrow('Üyelik süreniz dolduğu');
    await expect(documents.ensurePoolActionMembership('actor')).rejects.toThrow('Üyelik süreniz dolduğu');
  });

  it.each(['TALEP', 'HAVUZ'] as const)('uses the office %s quota and shares its owner counter', async kind => {
    const { db, state } = setup(); state.packages[0].monthlyDemandLimit = 8; state.packages[0].monthlyPoolLimit = 6;
    await consumeMembershipQuota(db as any, 'actor', kind);
    expect(db.kotaKullanimi.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ kullaniciId: 'owner', limit: kind === 'TALEP' ? 8 : 6 }) }));
    expect(db.kotaKullanimi.update).toHaveBeenCalledTimes(1);
    expect(db.uyelikPaketi.findUnique).not.toHaveBeenCalled();
  });

  it('does not apply a personal quota when office quota is missing', async () => {
    const { db } = setup();
    await consumeMembershipQuota(db as any, 'actor', 'HAVUZ');
    expect(db.kotaKullanimi.upsert).not.toHaveBeenCalled(); expect(db.uyelikPaketi.findUnique).not.toHaveBeenCalled();
  });

  it('blocks an exhausted office quota before increment', async () => {
    const { db, state } = setup(); state.packages[0].monthlyPoolLimit = 3; state.used = 3;
    await expect(consumeMembershipQuota(db as any, 'actor', 'HAVUZ')).rejects.toThrow('kotası (3) doldu');
    expect(db.kotaKullanimi.update).not.toHaveBeenCalled();
  });
});
