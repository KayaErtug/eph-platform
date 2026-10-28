import { ForbiddenException } from '@nestjs/common';
import { Role, UnitStatus, UnitType } from '@prisma/client';
import { ProjectSalesContractorAssistantService } from './project-sales-contractor-assistant.service';

describe('ProjectSalesContractorAssistantService', () => {
  const projectFindUnique = jest.fn();
  const prisma = { project: { findUnique: projectFindUnique } } as any;
  const linaService = { createTextReply: jest.fn() } as any;
  const crmService = { getProjectOpportunities: jest.fn() } as any;
  const requestService = { getProjectOpportunities: jest.fn() } as any;
  const heatmapService = { getHeatmap: jest.fn() } as any;
  const feasibilityService = { calculate: jest.fn() } as any;

  const service = new ProjectSalesContractorAssistantService(
    prisma,
    linaService,
    crmService,
    requestService,
    heatmapService,
    feasibilityService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    projectFindUnique.mockResolvedValue(project());
    crmService.getProjectOpportunities.mockResolvedValue({
      summary: {
        activeBuyerInterestCount: 12,
        matchedPairCount: 8,
        strongOpportunityCount: 4,
        matchedCustomerCount: 6,
      },
      unitRadar: [{ topMatches: [{ customerName: 'Gizli Müşteri' }] }],
    });
    requestService.getProjectOpportunities.mockResolvedValue({
      summary: {
        activeRequestCount: 18,
        matchedPairCount: 9,
        strongOpportunityCount: 5,
        matchedRequestCount: 7,
      },
      unitRadar: [{ topMatches: [{ requestTitle: 'Gizli Talep' }] }],
    });
    heatmapService.getHeatmap.mockResolvedValue({
      filters: { city: 'Denizli', district: 'Pamukkale' },
      summary: { activeRequestCount: 30 },
      locations: { districts: [{ key: 'Denizli / Pamukkale', count: 30 }] },
      propertyTypes: [{ key: 'DAIRE', count: 20 }],
      roomCounts: [{ key: '2+1', count: 14 }],
      budgetByCurrency: [],
    });
    linaService.createTextReply.mockResolvedValue({
      success: true,
      message: '2+1 stokta talep yoğunluğu daha yüksek.',
      provider: 'openai',
      kvkkFiltered: false,
      detectedTypes: [],
    });
  });

  it('proje, fırsat ve talep bağlamını Lina için mahremiyetli özetler', async () => {
    const result = await service.ask('owner-1', Role.MUTEAHHIT, {
      projectId: 'project-1',
      message: 'Hangi stoklara odaklanmalıyım?',
    });

    expect(result.success).toBe(true);
    expect(result.assistant).toBe('LINA_MUTEAHHIT_V1');
    expect(result.contextSummary.inventory.totalSalesInventory).toBe(3);
    expect(result.contextSummary.opportunities?.crm).toEqual(
      expect.objectContaining({ activeBuyerInterestCount: 12 }),
    );
    expect(JSON.stringify(result.contextSummary)).not.toContain('Gizli Müşteri');
    expect(JSON.stringify(result.contextSummary)).not.toContain('Gizli Talep');
    expect(linaService.createTextReply).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModule: 'general' }),
      { id: 'owner-1', role: Role.MUTEAHHIT },
    );
  });

  it('başkasının projesini analiz ettirmez', async () => {
    await expect(
      service.ask('other-user', Role.MUTEAHHIT, {
        projectId: 'project-1',
        message: 'Stoku analiz et',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fizibilite girdisini karar bağlamına ekler', async () => {
    feasibilityService.calculate.mockReturnValue({
      currency: 'TRY',
      capacity: { saleableArea: 3000 },
      financials: { grossProfit: 45000000 },
      assessment: { level: 'STRONG' },
      policy: { estimateOnly: true },
    });

    const result = await service.ask('owner-1', Role.INSAAT_FIRMASI, {
      message: 'Bu arsa mantıklı mı?',
      city: 'Denizli',
      feasibility: { landArea: 1000 },
    });

    expect(feasibilityService.calculate).toHaveBeenCalled();
    expect(result.contextSummary.feasibility).toEqual(
      expect.objectContaining({ currency: 'TRY' }),
    );
  });
});

function project() {
  return {
    id: 'project-1',
    name: 'Pamukkale Yaşam',
    code: 'PY-01',
    ownerId: 'owner-1',
    city: 'Denizli',
    district: 'Pamukkale',
    neighborhood: 'Kınıklı',
    completionPercent: 60,
    defaultDeliveryDate: null,
    declaredIndependentUnitCount: 40,
    declaredSalesInventoryCount: 30,
    setupStatus: 'TAMAMLANDI',
    units: [
      {
        id: 'u1',
        type: UnitType.DAIRE,
        status: UnitStatus.SATILIK,
        price: 5000000,
        priceCurrency: 'TRY',
        roomCount: '2+1',
      },
      {
        id: 'u2',
        type: UnitType.DAIRE,
        status: UnitStatus.REZERVE,
        price: 5500000,
        priceCurrency: 'TRY',
        roomCount: '2+1',
      },
      {
        id: 'u3',
        type: UnitType.DAIRE,
        status: UnitStatus.SATILDI,
        price: 6000000,
        priceCurrency: 'TRY',
        roomCount: '3+1',
      },
    ],
  };
}
