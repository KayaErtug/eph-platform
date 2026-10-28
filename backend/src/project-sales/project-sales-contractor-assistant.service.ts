import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UnitStatus } from '@prisma/client';
import { LinaService } from '../lina/lina.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectSalesCrmOpportunityService } from './project-sales-crm-opportunity.service';
import { ProjectSalesDemandHeatmapService } from './project-sales-demand-heatmap.service';
import { ProjectSalesFeasibilityService } from './project-sales-feasibility.service';
import { ProjectSalesRequestOpportunityService } from './project-sales-request-opportunity.service';

type AssistantBody = {
  message?: unknown;
  projectId?: unknown;
  city?: unknown;
  district?: unknown;
  feasibility?: unknown;
};

const MAX_MESSAGE_LENGTH = 2000;
const OPEN_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILIK,
  UnitStatus.KIRALIK,
  UnitStatus.ON_SATIS,
  UnitStatus.YAKINDA_SATISTA,
  UnitStatus.INSAAT_HALINDE,
  UnitStatus.TESLIME_HAZIR,
  UnitStatus.HEMEN_TESLIM,
  UnitStatus.PROJE_ASAMASI,
  UnitStatus.INSAAT_PROJESI,
  UnitStatus.DEVREN_SATILIK,
  UnitStatus.DEVREN_KIRALIK,
  UnitStatus.GUNLUK_KIRALIK,
]);

@Injectable()
export class ProjectSalesContractorAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly linaService: LinaService,
    private readonly crmOpportunityService: ProjectSalesCrmOpportunityService,
    private readonly requestOpportunityService: ProjectSalesRequestOpportunityService,
    private readonly demandHeatmapService: ProjectSalesDemandHeatmapService,
    private readonly feasibilityService: ProjectSalesFeasibilityService,
  ) {}

  async ask(userId: string, userRole: Role, body: AssistantBody) {
    const message = String(body.message || '').trim();
    if (!message) {
      throw new BadRequestException('Lina için message alanı zorunludur.');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `message en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
      );
    }

    const projectId = this.optionalText(body.projectId);
    const requestedCity = this.optionalText(body.city);
    const requestedDistrict = this.optionalText(body.district);

    const projectContext = projectId
      ? await this.buildProjectContext(projectId, userId, userRole)
      : null;

    const heatmap = await this.safeHeatmap({
      city: projectContext?.project.city || requestedCity,
      district: projectContext?.project.district || requestedDistrict,
      days: '30',
    });

    const feasibility =
      body.feasibility && typeof body.feasibility === 'object'
        ? this.feasibilityService.calculate(body.feasibility as Record<string, unknown>)
        : null;

    const safeContext = {
      policy: {
        version: 'LINA_CONTRACTOR_ASSISTANT_V1',
        readOnly: true,
        privateCustomerIdentityIncluded: false,
        projectOwnerPrivateContactIncluded: false,
        automaticPriceChangeAllowed: false,
        automaticReservationAllowed: false,
      },
      project: projectContext?.project || null,
      inventory: projectContext?.inventory || null,
      opportunities: projectContext?.opportunities || null,
      demand: heatmap
        ? {
            filters: heatmap.filters,
            summary: heatmap.summary,
            topDistricts: heatmap.locations?.districts?.slice(0, 5) || [],
            topPropertyTypes: heatmap.propertyTypes?.slice(0, 5) || [],
            topRoomCounts: heatmap.roomCounts?.slice(0, 5) || [],
            budgetByCurrency: heatmap.budgetByCurrency?.slice(0, 3) || [],
          }
        : null,
      feasibility: feasibility
        ? {
            currency: feasibility.currency,
            capacity: feasibility.capacity,
            financials: feasibility.financials,
            assessment: feasibility.assessment,
            policy: feasibility.policy,
          }
        : null,
    };

    const prompt = [
      'Sen EPH Lina Müteahhit Asistanısın.',
      'Aşağıdaki EPH karar bağlamını kullan. Olmayan veriyi uydurma.',
      'Kullanıcı açıkça istemedikçe fiyat, stok, rezervasyon veya yayın durumunda işlem yapma; bu endpoint yalnız analiz/öneri üretir.',
      'CRM özel müşteri kimliği verilmemiştir; kimlik tahmini yapma.',
      '',
      `KULLANICI SORUSU: ${message}`,
      '',
      `EPH KARAR BAĞLAMI: ${JSON.stringify(safeContext)}`,
    ].join('\n');

    const reply = await this.linaService.createTextReply(
      { message: prompt, sourceModule: 'general' },
      { id: userId, role: userRole },
    );

    return {
      assistant: 'LINA_MUTEAHHIT_V1',
      success: reply.success,
      message: reply.message,
      provider: reply.provider,
      kvkkFiltered: reply.kvkkFiltered,
      projectId: projectId || null,
      contextSummary: safeContext,
      readOnly: true,
    };
  }

  private async buildProjectContext(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
        ownerId: true,
        city: true,
        district: true,
        neighborhood: true,
        completionPercent: true,
        defaultDeliveryDate: true,
        declaredIndependentUnitCount: true,
        declaredSalesInventoryCount: true,
        setupStatus: true,
        units: {
          where: { isSalesInventory: true },
          select: {
            id: true,
            type: true,
            status: true,
            price: true,
            priceCurrency: true,
            roomCount: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }
    if (project.ownerId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu projenin Lina müteahhit analizine erişim yetkiniz yok.');
    }

    const [crmResult, requestResult] = await Promise.allSettled([
      this.crmOpportunityService.getProjectOpportunities(
        projectId,
        userId,
        userRole,
        '200',
      ),
      this.requestOpportunityService.getProjectOpportunities(
        projectId,
        userId,
        userRole,
        '200',
      ),
    ]);

    const units = project.units;
    const priced = units.filter((unit) => Number(unit.price || 0) > 0);
    const totalListValue = priced.reduce(
      (sum, unit) => sum + Number(unit.price || 0),
      0,
    );
    const currencies = Array.from(
      new Set(priced.map((unit) => String(unit.priceCurrency || 'TRY'))),
    );
    const statusCounts = units.reduce<Record<string, number>>((acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    }, {});
    const typeCounts = units.reduce<Record<string, number>>((acc, unit) => {
      acc[unit.type] = (acc[unit.type] || 0) + 1;
      return acc;
    }, {});

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        city: project.city,
        district: project.district,
        neighborhood: project.neighborhood,
        completionPercent: project.completionPercent,
        defaultDeliveryDate: project.defaultDeliveryDate,
        setupStatus: project.setupStatus,
      },
      inventory: {
        totalSalesInventory: units.length,
        openInventoryCount: units.filter((unit) => OPEN_STATUSES.has(unit.status)).length,
        reservedCount: units.filter((unit) => unit.status === UnitStatus.REZERVE).length,
        optionCount: units.filter((unit) => unit.status === UnitStatus.OPSIYONLU).length,
        soldCount: units.filter((unit) => unit.status === UnitStatus.SATILDI).length,
        rentedCount: units.filter((unit) => unit.status === UnitStatus.KIRALANDII).length,
        pricedUnitCount: priced.length,
        totalListValue: this.roundMoney(totalListValue),
        currencies,
        statusCounts,
        typeCounts,
      },
      opportunities: {
        crm:
          crmResult.status === 'fulfilled'
            ? this.pickSummary(crmResult.value?.summary)
            : null,
        requestCenter:
          requestResult.status === 'fulfilled'
            ? this.pickSummary(requestResult.value?.summary)
            : null,
      },
    };
  }

  private async safeHeatmap(query: {
    city?: string;
    district?: string;
    days?: string;
  }) {
    if (!query.city && !query.district) return null;
    try {
      return await this.demandHeatmapService.getHeatmap(query);
    } catch {
      return null;
    }
  }

  private pickSummary(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const allowed = [
      'salesInventoryCount',
      'activeBuyerInterestCount',
      'activeRequestCount',
      'matchedPairCount',
      'strongOpportunityCount',
      'perfectOpportunityCount',
      'matchedUnitCount',
      'matchedCustomerCount',
      'matchedRequestCount',
      'unitsWithoutBuyerMatchCount',
      'unitsWithoutRequestMatchCount',
      'unpricedUnitCount',
    ];
    return Object.fromEntries(
      allowed
        .filter((key) => key in source)
        .map((key) => [key, source[key]]),
    );
  }

  private optionalText(value: unknown) {
    const text = String(value || '').trim();
    return text || '';
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
