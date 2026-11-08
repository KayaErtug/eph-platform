import { consumeMembershipQuota } from './membership-quota.rules';
import { OFFICE_SETTINGS_FIXTURE } from '../office/office-entitlement.fixture';

jest.mock('./pool-access', () => ({
  resolvePoolAccess: jest.fn(async () => ({ allowed: true, code: 'OFFICE_PACKAGE', officeId: 'o1', packageCode: 'UCRETSIZ', packageName: 'Ücretsiz', expiresAt: null, message: '' })),
}));

/* ODM-7G-D F09: relational modda Ücretsiz ofisin aktif ilan/talep sınırı (3/2) uygulanamıyorsa işlem fail-closed reddedilir; eski `limit<=0 → sınırsız` Ücretsiz'i açık bırakmaz. */
function tx(source: string | null) {
  const settings: Record<string, unknown> = { ...OFFICE_SETTINGS_FIXTURE, ...(source ? { OFFICE_ENTITLEMENT_SOURCE: source } : {}) };
  return {
    user: { findUnique: jest.fn(async () => ({ role: 'EMLAKCI', officeId: 'o1' })) },
    office: { findUnique: jest.fn(async () => ({ id: 'o1', ownerUserId: 'owner' })), findFirst: jest.fn(async () => null) },
    kullaniciUyelikPaketi: { findFirst: jest.fn(async () => null) },
    uyelikPaketi: { findUnique: jest.fn(async () => null) },
    ofisAbonelik: { findFirst: jest.fn(async () => null) }, ofisEklenti: { findMany: jest.fn(async () => []) }, ofisDenemeKaydi: { findUnique: jest.fn(async () => null) },
    systemSetting: { findUnique: jest.fn(async ({ where }: any) => (settings[where.key] !== undefined ? { valueJson: settings[where.key] } : null)),
      findMany: jest.fn(async ({ where }: any) => where.key.in.filter((k: string) => settings[k] !== undefined).map((k: string) => ({ key: k, valueJson: settings[k] }))) },
    $executeRaw: jest.fn(), kotaKullanimi: { upsert: jest.fn(), update: jest.fn() },
  } as any;
}

describe('consumeMembershipQuota — relational Ücretsiz fail-closed (F09)', () => {
  it('relational + Ücretsiz ofis (aktif ilan/talep sınırı var): 503 ENTITLEMENT_READER_NOT_MIGRATED', async () => {
    await expect(consumeMembershipQuota(tx('relational'), 'agent', 'TALEP')).rejects.toMatchObject({ status: 503, response: { code: 'ENTITLEMENT_READER_NOT_MIGRATED' } });
    await expect(consumeMembershipQuota(tx('relational'), 'agent', 'HAVUZ')).rejects.toMatchObject({ status: 503 });
  });
  it('legacy mod: önceki davranış (bu kapı devreye girmez)', async () => {
    await expect(consumeMembershipQuota(tx(null), 'agent', 'TALEP')).resolves.toBeUndefined();
  });
});
