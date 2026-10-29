import { PoolProjectsService } from './pool-projects.service';

const link = { id: 'l1', token: 't', projectId: 'p1', sharedById: 'sharer', revokedAt: null, expiresAt: new Date(Date.now() + 3600_000), viewCount: 0 };
const project = {
  id: 'p1', ownerId: 'owner', name: 'Proje', city: 'Ankara', district: 'Çankaya', neighborhood: 'Kızılay',
  address: 'Gizli Sk. 5', mapAddress: 'Gizli Sk. 5 Çankaya', latitude: 39.91234, longitude: 32.85678,
  owner: { id: 'owner', role: 'MUTEAHHIT', office: { ownerUserId: 'office-owner' } },
  blocks: [], mediaPackages: [], spaces: [], units: [{ id: 'u1', status: 'MUSAIT', price: 1 }],
};

function publicView(sharer: { id: string; role: string }, unlockedUnitIds: string[]) {
  const service: any = Object.create(PoolProjectsService.prototype);
  service.prisma = {
    $queryRaw: jest.fn().mockResolvedValue([link]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: { findUnique: jest.fn().mockResolvedValue({ ...sharer, firstName: 'A', lastName: 'B', office: null }) },
    kontorHareketi: { findMany: jest.fn().mockResolvedValue(unlockedUnitIds.map((id) => ({ ilgiliKayitId: id }))) },
  };
  service.findProject = jest.fn().mockResolvedValue(project);
  service.audience = { filterPublicUnits: jest.fn(async (units: unknown[]) => units) };
  return service.getPublicPresentation('t');
}

describe('Token\'lı proje sunumu konum gizleme', () => {
  it('linki oluşturan yetkisizse adres yok, koordinat yaklaşık', async () => {
    const result = await publicView({ id: 'sharer', role: 'EMLAKCI' }, []);
    expect(result.project).toMatchObject({ address: null, latitude: 39.91, longitude: 32.86, locationApproximate: true, locationLabel: 'Ankara / Çankaya / Kızılay' });
    expect(JSON.stringify(result)).not.toContain('Gizli Sk.');
    expect(JSON.stringify(result)).not.toContain('39.91234');
  });

  it('linki oluşturan proje sahibi, ofis sahibi, süper admin veya İletişime Geç ile açmışsa kesin koordinat', async () => {
    for (const [sharer, unlocked] of [
      [{ id: 'owner', role: 'MUTEAHHIT' }, []],
      [{ id: 'office-owner', role: 'EMLAKCI' }, []],
      [{ id: 'sharer', role: 'SUPER_ADMIN' }, []],
      [{ id: 'sharer', role: 'EMLAKCI' }, ['u1']],
    ] as const) {
      const result = await publicView({ ...sharer }, [...unlocked]);
      expect(result.project).toMatchObject({ address: 'Gizli Sk. 5', latitude: 39.91234, longitude: 32.85678, locationApproximate: false });
    }
  });
});
