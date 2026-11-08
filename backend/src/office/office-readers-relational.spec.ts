import { Role } from '@prisma/client';
import { resolvePoolAccess } from '../membership/pool-access';
import { OfficeService } from './office.service';
import { OFFICE_SETTINGS_FIXTURE } from './office-entitlement.fixture';

/* EPH-70B2: OFFICE_ENTITLEMENT_SOURCE kapısı. 'legacy' (varsayılan) eski davranışı korur; 'relational' tek çözümleyiciyi kullanır. */
function makeDb(source: string | null, sub: any = null) {
  const settings: Record<string, unknown> = { ...OFFICE_SETTINGS_FIXTURE };
  if (source) settings.OFFICE_ENTITLEMENT_SOURCE = source;
  const NOW = Date.now();
  return {
    user: { findUnique: jest.fn(async () => ({ id: 'owner', role: Role.EMLAKCI, officeId: 'o1' })) },
    office: { findMany: jest.fn(async () => [{ id: 'o1' }]) },
    kullaniciUyelikPaketi: { findFirst: jest.fn(async () => null) },
    uyelikPaketi: { findUnique: jest.fn(async () => null) },
    systemSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key in settings ? { valueJson: settings[where.key] } : null)),
      findMany: jest.fn(async ({ where }: any) => where.key.in.filter((k: string) => k in settings).map((k: string) => ({ key: k, valueJson: settings[k] }))),
    },
    ofisAbonelik: { findFirst: jest.fn(async () => (sub ? { durum: 'AKTIF', sureTuru: 'DONEMLI', baslangicTarihi: new Date(NOW - 86400000), bitisTarihi: new Date(NOW + 86400000 * 20), hakSnapshot: null, snapshotBitis: null, kaynakKanal: 'APPLE', ...sub } : null)) },
    ofisEklenti: { findMany: jest.fn(async () => []) },
    ofisDenemeKaydi: { findUnique: jest.fn(async () => null) },
  };
}

describe('OFFICE_ENTITLEMENT_SOURCE kapısı', () => {
  it('varsayılan legacy: yeni tablolara dokunulmaz (eski davranış korunur)', async () => {
    const db = makeDb(null);
    const r = await resolvePoolAccess(db as any, { id: 'owner' });
    expect(r.allowed).toBe(false); // abonelik JSON\'u yok → eski kural: ofis paketi yok
    expect(db.ofisAbonelik.findFirst).not.toHaveBeenCalled();
  });
  it('relational: pool-access çözümleyiciden okur (Ücretsiz ofis dahil havuza erişir; paket kodu ilişkisel abonelikten)', async () => {
    const free = await resolvePoolAccess(makeDb('relational') as any, { id: 'owner' });
    expect(free).toMatchObject({ allowed: true, code: 'OFFICE_PACKAGE', packageCode: 'UCRETSIZ', officeId: 'o1' });
    const paid = await resolvePoolAccess(makeDb('relational', { paketKodu: 'GUMUS' }) as any, { id: 'owner' });
    expect(paid).toMatchObject({ allowed: true, packageCode: 'GUMUS', packageName: 'Ofis Gümüş' });
    expect(paid.expiresAt).toBeInstanceOf(Date);
  });
  it('relational: getOfficeCapacity tek çözümleyiciden (Gümüş: 6 kullanıcı → 5 danışman, 300 portföy; CRM sınırsız → -1)', async () => {
    const db = makeDb('relational', { paketKodu: 'GUMUS' });
    const cap = await new OfficeService(db as any).getOfficeCapacity('o1');
    expect(cap).toMatchObject({ agents: 5, portfolioCapacity: 300, crmCapacity: -1, packageName: 'Ofis Gümüş' });
    const free = await new OfficeService(makeDb('relational') as any).getOfficeCapacity('o1');
    expect(free).toMatchObject({ agents: 0, portfolioCapacity: 10, crmCapacity: 50, packageName: 'Ücretsiz' });
  });
});
