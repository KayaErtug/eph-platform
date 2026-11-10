import { EphAuthorityLettersService } from '../eph-authority-letters/eph-authority-letters.service';
import { MembershipService } from '../membership/membership.service';
import { SisterDemandsService } from './sister/sister-demands.service';
import { OFFICE_SETTINGS_FIXTURE } from './office-entitlement.fixture';

function dbOf(code = 'ALTIN', limit = 7): any {
  const settings: Record<string, any> = { ...OFFICE_SETTINGS_FIXTURE, OFFICE_ENTITLEMENT_SOURCE: 'relational', LIMIT_YETKI_MEKTUBU_CARPAN: 2,
    COST_YETKI_MEKTUBU_ASIM: 9, COST_SISTER_TALEP_ASIM: 4, LIMIT_OFFICE_SISTER_TALEP_QUOTA: limit };
  (settings.OFFICE_MEMBERSHIP_PACKAGES as any) = (settings.OFFICE_MEMBERSHIP_PACKAGES as any[]).map(p => ({ ...p, ...(p.code === code ? { sisterDemandLimit: limit } : {}) }));
  return {
    user: { findUnique: jest.fn(async () => ({ id: 'agent', role: 'EMLAKCI', officeId: 'o1' })) },
    office: { findUnique: jest.fn(async () => ({ id: 'o1', ownerUserId: 'owner', isActive: true })) },
    systemSetting: {
      findUnique: jest.fn(async ({ where }: any) => where.key in settings ? { valueJson: settings[where.key] } : null),
      findMany: jest.fn(async ({ where }: any) => where.key.in.map((key: string) => ({ key, valueJson: settings[key] }))),
    },
    ofisAbonelik: { findFirst: jest.fn(async () => ({ paketKodu: code, durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(0), bitisTarihi: new Date(Date.now() + 86400000) })) },
    ofisEklenti: { findMany: jest.fn(async () => []) }, ofisDenemeKaydi: { findUnique: jest.fn(async () => null) },
    kotaKullanimi: { upsert: jest.fn(async () => ({ kullanilan: 3 })), findUnique: jest.fn(async () => ({ kullanilan: 3 })) },
    kontorCuzdani: { findUnique: jest.fn(async () => ({ bakiye: 100, aktifMi: true })) },
    $executeRaw: jest.fn(),
  };
}

describe('ODM-8H relational okuyucular', () => {
  it('yetki belgesi: etkin ofis portföyü × DB çarpanı, sahipte ortak kota', async () => {
    const db = dbOf(); const svc = new EphAuthorityLettersService(db) as any;
    const snapshot = await svc.getQuota({ userId: 'agent' });
    expect(snapshot).toMatchObject({ limit: 1200, used: 3, quotaUserId: 'owner', package: { code: 'ALTIN', activePortfolioLimit: 600 } });
    expect(db.kotaKullanimi.upsert.mock.calls[0][0].create.kullaniciId).toBe('owner');
    db.kotaKullanimi.upsert.mockResolvedValue({ kullanilan: 1200 });
    expect(await svc.prepareAuthorityLetterQuotaUsage({ tx: db, userId: 'agent', unitId: 'u' })).toMatchObject({ quotaUserId: 'owner', isFree: false, chargedKontor: 9 });
    expect(db.$executeRaw).toHaveBeenCalled();
  });
  it('yetki belgesi: Ücretsiz kapasitesi DB ayarından', async () => {
    const db = dbOf(); db.ofisAbonelik.findFirst.mockResolvedValue(null);
    expect(await new EphAuthorityLettersService(db).getQuota({ userId: 'agent' })).toMatchObject({ limit: 20, package: { code: 'UCRETSIZ' } });
  });
  it('Kardeş Ofis: legacy JSON değil relational paket; DB kotası sıfır da olabilir', async () => {
    for (const limit of [0, 7]) {
      const db = dbOf('ALTIN', limit);
      expect(await new SisterDemandsService(db, {} as any).getQuota('agent', 'o1')).toMatchObject({ limit, used: 3 });
      expect(db.ofisAbonelik.findFirst).toHaveBeenCalled();
      expect(db.systemSetting.findUnique.mock.calls.some(([a]: any) => a.where.key === 'OFFICE_SUBSCRIPTION_o1')).toBe(false);
    }
  });
  it('Kardeş Ofis: Solo hakkı kapalı', async () => {
    await expect(new SisterDemandsService(dbOf('SOLO'), {} as any).getQuota('agent', 'o1')).rejects.toMatchObject({ status: 403 });
  });
  it('18e: danışmanın kişisel üyeliği yeniden sipariş edilemez', async () => {
    const db = dbOf();
    await expect(new MembershipService(db).createPaymentOrder('agent', { paketKodu: 'ALTIN' } as any)).rejects.toMatchObject({ status: 403 });
  });
  it('18e: önceden PAID olan kişisel yenileme de üyeliği uzatamaz', async () => {
    const db = dbOf();
    db.$transaction = (fn: any) => fn(db); db.$queryRaw = jest.fn(async () => []);
    db.paymentOrder = { findUnique: jest.fn(async () => ({ id: 'old-order', kullaniciId: 'agent', durum: 'PAID', amac: 'MEMBERSHIP_RENEWAL', tutar: 100, paraBirimi: 'TRY', metadata: {} })) };
    db.paymentSettlement = { findUnique: jest.fn(async () => null) };
    db.paymentTransaction = { findFirst: jest.fn(async () => ({ id: 'paid', tutar: 100, paraBirimi: 'TRY' })) };
    db.kullaniciUyelikPaketi = { update: jest.fn() };
    await expect(new MembershipService(db).settlePaidOrder('old-order')).rejects.toMatchObject({ status: 403 });
    expect(db.kullaniciUyelikPaketi.update).not.toHaveBeenCalled();
  });
  it('ticari ayar eksikse sabit çarpanla hak üretmez', async () => {
    const db = dbOf(); const read = db.systemSetting.findUnique;
    db.systemSetting.findUnique = jest.fn((args: any) => args.where.key === 'LIMIT_YETKI_MEKTUBU_CARPAN' ? null : read(args));
    await expect(new EphAuthorityLettersService(db).getQuota({ userId: 'agent' })).rejects.toThrow('Ticari ayar eksik');
  });
});
