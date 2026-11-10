import { consumeMembershipQuota } from './membership-quota.rules';
import { OFFICE_SETTINGS_FIXTURE } from '../office/office-entitlement.fixture';

jest.mock('./pool-access', () => ({
  resolvePoolAccess: jest.fn(async () => ({ allowed: true, code: 'OFFICE_PACKAGE', officeId: 'o1', packageCode: 'UCRETSIZ', packageName: 'Ücretsiz', expiresAt: null, message: '' })),
}));

/* ODM-8H: aktif ofis toplamı; DB ayarı, sıfır ve sınırsız ayrımı. */
function tx(source: string | null) {
  const settings: Record<string, unknown> = { ...OFFICE_SETTINGS_FIXTURE, ...(source ? { OFFICE_ENTITLEMENT_SOURCE: source } : {}) };
  return {
    user: { findUnique: jest.fn(async () => ({ role: 'EMLAKCI', officeId: 'o1' })), findMany: jest.fn(async () => [{ id: 'owner' }, { id: 'agent' }]) },
    networkPost: { count: jest.fn(async () => 0) }, unit: { count: jest.fn(async () => 0) },
    office: { findUnique: jest.fn(async () => ({ id: 'o1', ownerUserId: 'owner' })), findFirst: jest.fn(async () => null) },
    kullaniciUyelikPaketi: { findFirst: jest.fn(async () => null) },
    uyelikPaketi: { findUnique: jest.fn(async () => null) },
    ofisAbonelik: { findFirst: jest.fn(async () => null) }, ofisEklenti: { findMany: jest.fn(async () => []) }, ofisDenemeKaydi: { findUnique: jest.fn(async () => null) },
    systemSetting: { findUnique: jest.fn(async ({ where }: any) => (settings[where.key] !== undefined ? { valueJson: settings[where.key] } : null)),
      findMany: jest.fn(async ({ where }: any) => where.key.in.filter((k: string) => settings[k] !== undefined).map((k: string) => ({ key: k, valueJson: settings[k] }))) },
    $executeRaw: jest.fn(), kotaKullanimi: { upsert: jest.fn(), update: jest.fn() },
  } as any;
}

describe('consumeMembershipQuota — relational aktif ofis kayıtları', () => {
  it.each(['TALEP', 'HAVUZ'] as const)('%s: sınır altında izin; dolunca red; kişisel üyelik sınırı atlatmaz', async kind => {
    const db = tx('relational');
    await expect(consumeMembershipQuota(db, 'agent', kind)).resolves.toBeUndefined();
    const counter = kind === 'TALEP' ? db.networkPost.count : db.unit.count;
    counter.mockResolvedValue(kind === 'TALEP' ? 2 : 3);
    await expect(consumeMembershipQuota(db, 'agent', kind)).rejects.toThrow('sınırı');
    expect(counter.mock.calls[0][0].where[kind === 'TALEP' ? 'userId' : 'project']).toEqual(kind === 'TALEP' ? { in: ['owner', 'agent'] } : { ownerId: { in: ['owner', 'agent'] } });
    expect(db.kotaKullanimi.upsert).not.toHaveBeenCalled();
  });
  it('ticari limit DB değişikliğinden gelir; sıfır kapalıdır', async () => {
    const db = tx('relational');
    const original = db.systemSetting.findMany;
    db.systemSetting.findMany = jest.fn(async (args: any) => (await original(args)).map((r: any) => r.key === 'OFFICE_FREE_LIMITS' ? { ...r, valueJson: { ...r.valueJson, talepMax: 0 } } : r));
    await expect(consumeMembershipQuota(db, 'agent', 'TALEP')).rejects.toThrow('sınırı (0)');
  });
  it('ücretli ofiste eski aylık kota uygulanmaz', async () => {
    const db = tx('relational');
    db.ofisAbonelik.findFirst.mockResolvedValue({ paketKodu: 'ALTIN', durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(0), bitisTarihi: new Date(Date.now() + 86400000) });
    await consumeMembershipQuota(db, 'agent', 'TALEP');
    expect(db.networkPost.count).not.toHaveBeenCalled();
    expect(db.kotaKullanimi.upsert).not.toHaveBeenCalled();
  });
  it('legacy mod: önceki davranış (bu kapı devreye girmez)', async () => {
    await expect(consumeMembershipQuota(tx(null), 'agent', 'TALEP')).resolves.toBeUndefined();
  });
});
