import { ProjectSalesSetupService } from './project-sales-setup.service';

describe('ProjectSalesSetupService other unit type', () => {
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
    name: 'EPH Özel Tür Projesi',
    code: 'EPH-OZEL-TUR',
    lifecycleStage: 'READY',
    city: 'Denizli',
    district: 'Merkezefendi',
    neighborhood: 'Sırakapılar',
    address: 'Test adresi',
    plannedUnitTypes: ['DAIRE'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    projectFindFirst.mockResolvedValue(null);
    projectCreate.mockImplementation(
      async ({ data }: any) => data,
    );
  });

  it('Diğer seçilmişse özel tür adını zorunlu tutar', async () => {
    await expect(
      service.createProjectDraft('user-1', {
        ...baseBody,
        plannedUnitTypes: ['DIGER'],
      }),
    ).rejects.toThrow(
      'Diğer bağımsız bölüm türünün adı zorunludur.',
    );
  });

  it('Diğer türü özel adıyla kaydeder', async () => {
    await service.createProjectDraft('user-1', {
      ...baseBody,
      plannedUnitTypes: ['DAIRE', 'DIGER'],
      plannedOtherUnitTypeName: 'Öğrenci Apartı',
    });

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plannedUnitTypes: ['DAIRE', 'DIGER'],
          plannedOtherUnitTypeName: 'Öğrenci Apartı',
        }),
      }),
    );
  });

  it('Diğer seçili değilse özel tür adını temizler', async () => {
    await service.createProjectDraft('user-1', {
      ...baseBody,
      plannedOtherUnitTypeName: 'Gereksiz değer',
    });

    expect(projectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plannedUnitTypes: ['DAIRE'],
          plannedOtherUnitTypeName: null,
        }),
      }),
    );
  });
});
