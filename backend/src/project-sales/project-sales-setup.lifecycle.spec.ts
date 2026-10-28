import { ProjectSalesSetupService } from './project-sales-setup.service';

describe('ProjectSalesSetupService lifecycle stages', () => {
  const projectCreate = jest.fn();
  const projectFindFirst = jest.fn();

  const prisma = {
    project: {
      create: projectCreate,
      findFirst: projectFindFirst,
    },
  } as any;

  const service = new ProjectSalesSetupService(prisma);

  const baseBody = {
    name: 'EPH Test Projesi',
    code: 'EPH-TEST',
    city: 'Denizli',
    district: 'Merkezefendi',
    neighborhood: 'Sırakapılar',
    address: 'Test adresi',
    plannedUnitTypes: ['DAIRE'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    projectFindFirst.mockResolvedValue(null);
    projectCreate.mockImplementation(async ({ data }: any) => data);
  });

  it('hazır projeyi otomatik yüzde 100 kaydeder', async () => {
    await service.createProjectDraft('user-1', {
      ...baseBody,
      lifecycleStage: 'READY',
      completionPercent: 35,
    });

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lifecycleStage: 'READY',
          completionPercent: 100,
        }),
      }),
    );
  });

  it('planlanan projeyi otomatik yüzde 0 kaydeder', async () => {
    await service.createProjectDraft('user-1', {
      ...baseBody,
      lifecycleStage: 'PLANNED',
      completionPercent: 80,
    });

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lifecycleStage: 'PLANNED',
          completionPercent: 0,
        }),
      }),
    );
  });

  it('devam eden projede oran ve teslim tarihi ister', async () => {
    await expect(
      service.createProjectDraft('user-1', {
        ...baseBody,
        lifecycleStage: 'UNDER_CONSTRUCTION',
        completionPercent: 45,
      }),
    ).rejects.toThrow(
      'Devam eden projelerde tahmini teslim tarihi zorunludur.',
    );
  });
});
