import { Role } from '@prisma/client';
import { ProjectSalesSetupService } from './project-sales-setup.service';

describe('Proje başlangıcı ve teslim takvimi', () => {
  let record: any;
  let metadata: any;
  let prisma: any;
  let service: ProjectSalesSetupService;
  const body = { name: 'IHLAMUR EVLERİ', code: 'IHLAMUR', city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Sırakapılar', address: 'Test', lifecycleStage: 'PLANNED', plannedStartDate: '2027-01-01', defaultDeliveryDate: '2028-06-01', plannedUnitTypes: ['DAIRE'] };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T12:00:00Z'));
    record = { id: 'project-1', ownerId: 'owner-1' }; metadata = null;
    prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(async () => record),
        findMany: jest.fn(async () => [record]),
        create: jest.fn(async ({ data }) => { record = { ...record, ...data }; return record; }),
        update: jest.fn(async ({ data }) => { record = { ...record, ...data }; return record; }),
      },
      systemSetting: {
        findUnique: jest.fn(async () => metadata), findMany: jest.fn(async () => metadata ? [metadata] : []),
        upsert: jest.fn(async ({ create }) => { metadata = create; return create; }),
      },
      $transaction: jest.fn(async action => action(prisma)),
    };
    service = new ProjectSalesSetupService(prisma);
  });
  afterEach(() => jest.useRealTimers());
  it('başlangıç tarihi kaydedilip detay ve listeden tekrar okunur', async () => {
    const created = await service.createProjectDraft('owner-1', body);
    expect(created.plannedStartDate).toBe('2027-01-01');
    expect((await service.getProjectSetup('project-1', 'owner-1', Role.SUPER_ADMIN)).plannedStartDate).toBe('2027-01-01');
    expect((await service.listProjectDrafts('owner-1', Role.SUPER_ADMIN))[0].plannedStartDate).toBe('2027-01-01');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it.each(['2026-09-01', '2029-11-01', '2031-10-01'])('aralık dışı teslimi reddeder: %s', async delivery => {
    await expect(service.createProjectDraft('owner-1', { ...body, defaultDeliveryDate: delivery })).rejects.toThrow('36 ay');
    expect(prisma.project.create).not.toHaveBeenCalled();
  });
  it('tam 36 ay sınırını kabul eder', async () => {
    await expect(service.createProjectDraft('owner-1', { ...body, defaultDeliveryDate: '2029-10-01' })).resolves.toBeDefined();
  });
  it('teslimden sonraki başlangıcı reddeder', async () => {
    await expect(service.createProjectDraft('owner-1', { ...body, plannedStartDate: '2028-07-01' })).rejects.toThrow('başlangıç tarihinden önce');
    expect(prisma.project.create).not.toHaveBeenCalled();
  });
  it('planlanan projede açıkça gönderilen boş başlangıcı reddeder', async () => {
    await expect(service.createProjectDraft('owner-1', { ...body, plannedStartDate: null })).rejects.toThrow('başlangıç ayı');
  });
  it('tamamlanan projenin teslim ve başlangıç tarihlerini temizler', async () => {
    await service.createProjectDraft('owner-1', body);
    const updated = await service.updateProjectDraft('project-1', 'owner-1', Role.SUPER_ADMIN, { lifecycleStage: 'READY', defaultDeliveryDate: '2020-01-01', plannedStartDate: null });
    expect(updated).toMatchObject({ completionPercent: 100, defaultDeliveryDate: null, plannedStartDate: null });
  });
  it('başka kullanıcı planlama bilgisini okuyamaz veya değiştiremez', async () => {
    const ordinaryRole = Object.values(Role).find(value => value !== Role.SUPER_ADMIN)!;
    await expect(service.getProjectSetup('project-1', 'other', ordinaryRole)).rejects.toThrow();
    await expect(service.updateProjectDraft('project-1', 'other', ordinaryRole, { plannedStartDate: '2027-02-01' })).rejects.toThrow();
    expect(prisma.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it('oran güncellemesi mevcut başlangıcı silmez', async () => {
    await service.createProjectDraft('owner-1', body);
    await service.updateProjectDraft('project-1', 'owner-1', Role.SUPER_ADMIN, { description: 'Yeni açıklama' });
    expect(metadata.valueJson.plannedStartDate).toBe('2027-01-01');
  });
});
