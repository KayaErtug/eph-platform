import { PoolExperienceService } from './pool-experience.service';

const unit = (ownerId: string) => ({
  id: 'u1', type: 'DAIRE', status: 'MUSAIT', images: [], features: [], allowPhoneCall: false, allowWhatsapp: false,
  project: {
    id: 'p1', name: 'Proje', city: 'Ankara', district: 'Çankaya', neighborhood: 'Kızılay', ownerId,
    address: 'Gizli Sk. 5', mapAddress: 'Gizli Sk. 5 Çankaya', latitude: 39.91234, longitude: 32.85678, placeId: 'pid',
    owner: { role: 'MUTEAHHIT', office: { name: 'Ofis', ownerUserId: 'office-owner' } },
  },
});

async function pool(user: { id: string; role: string }, unlocked: boolean) {
  const service: any = Object.create(PoolExperienceService.prototype);
  service.prisma = {
    unit: { findMany: jest.fn().mockResolvedValue([unit('owner')]) },
    customer: { findMany: jest.fn().mockResolvedValue([]) },
    kontorHareketi: { findMany: jest.fn().mockResolvedValue(unlocked ? [{ ilgiliKayitId: 'u1' }] : []) },
  };
  service.poolAudienceService = { filterVisibleUnits: jest.fn(async (_u: unknown, units: unknown[]) => units) };
  service.adminService = { getNumericSystemSetting: jest.fn().mockResolvedValue(25) };
  service.calculatePoolMatch = jest.fn().mockResolvedValue(null);
  return (await service.findPoolUnits(user))[0];
}

describe('pool-experience konum gizleme', () => {
  it('yetkisizde adres yok, koordinat yaklaşık, locationApproximate true', async () => {
    const result = await pool({ id: 'viewer', role: 'EMLAKCI' }, false);
    expect(result.project).toMatchObject({ address: null, mapAddress: null, placeId: null, latitude: 39.91, longitude: 32.86, locationApproximate: true, locationPrecision: 'APPROXIMATE' });
  });

  it('proje sahibi, ofis sahibi, süper admin ve İletişime Geç ile açan kesin konum görür', async () => {
    for (const [user, unlocked] of [
      [{ id: 'owner', role: 'MUTEAHHIT' }, false],
      [{ id: 'office-owner', role: 'EMLAKCI' }, false],
      [{ id: 'admin', role: 'SUPER_ADMIN' }, false],
      [{ id: 'viewer', role: 'EMLAKCI' }, true],
    ] as const) {
      const result = await pool({ ...user }, unlocked);
      expect(result.project).toMatchObject({ address: 'Gizli Sk. 5', latitude: 39.91234, longitude: 32.85678, locationApproximate: false, locationPrecision: 'EXACT' });
    }
  });
});
