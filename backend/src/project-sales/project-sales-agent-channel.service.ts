import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PortfolioApprovalStatus,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AgentChannelQuery = {
  city?: unknown;
  district?: unknown;
  unitType?: unknown;
  status?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  minArea?: unknown;
  maxArea?: unknown;
  roomCount?: unknown;
  limit?: unknown;
};

const MARKETABLE_STATUSES = new Set<UnitStatus>([
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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class ProjectSalesAgentChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async listChannel(userId: string, query: AgentChannelQuery) {
    const filters = this.normalizeFilters(query);

    const [units, interests] = await Promise.all([
      this.prisma.unit.findMany({
        where: {
          isSalesInventory: true,
          isPoolVisible: true,
          approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          isOffMarket: false,
          status: {
            in: filters.status
              ? [filters.status]
              : Array.from(MARKETABLE_STATUSES),
          },
          type: filters.unitType || undefined,
          price: {
            gte: filters.minPrice ?? undefined,
            lte: filters.maxPrice ?? undefined,
          },
          OR:
            filters.minArea !== null || filters.maxArea !== null
              ? [
                  {
                    netArea: {
                      gte: filters.minArea ?? undefined,
                      lte: filters.maxArea ?? undefined,
                    },
                  },
                  {
                    grossArea: {
                      gte: filters.minArea ?? undefined,
                      lte: filters.maxArea ?? undefined,
                    },
                  },
                  {
                    area: {
                      gte: filters.minArea ?? undefined,
                      lte: filters.maxArea ?? undefined,
                    },
                  },
                ]
              : undefined,
          roomCount: filters.roomCount || undefined,
          project: {
            isActive: true,
            city: filters.city || undefined,
            district: filters.district || undefined,
          },
        },
        select: {
          id: true,
          inventoryCode: true,
          type: true,
          status: true,
          roomCount: true,
          conceptLabel: true,
          area: true,
          netArea: true,
          grossArea: true,
          floor: true,
          floorLabel: true,
          totalFloors: true,
          facades: true,
          features: true,
          price: true,
          priceCurrency: true,
          deliveryDate: true,
          poolPublishedAt: true,
          updatedAt: true,
          block: {
            select: {
              code: true,
              name: true,
            },
          },
          images: {
            where: { isCover: true },
            select: { url: true },
            take: 1,
          },
          mediaPackage: {
            select: {
              assets: {
                orderBy: [
                  { isCover: 'desc' },
                  { sortOrder: 'asc' },
                  { createdAt: 'asc' },
                ],
                select: { url: true, supabaseUrl: true },
                take: 1,
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              lifecycleStage: true,
              city: true,
              district: true,
              neighborhood: true,
              completionPercent: true,
              defaultDeliveryDate: true,
            },
          },
        },
        orderBy: [
          { poolPublishedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: filters.limit,
      }),
      this.prisma.customerInterest.findMany({
        where: {
          isActive: true,
          customer: {
            ownerId: userId,
          },
        },
        select: {
          id: true,
          city: true,
          district: true,
          neighborhood: true,
          propertyTypes: true,
          statuses: true,
          minBudget: true,
          maxBudget: true,
          priceCurrency: true,
          minArea: true,
          maxArea: true,
          roomCounts: true,
          priority: true,
          purchaseIntent: true,
        },
      }),
    ]);

    const items = units.map((unit) => {
      const directCrmMatches = interests.filter((interest) =>
        this.isDirectCrmMatch(unit, interest),
      );
      const coverImage =
        unit.images[0]?.url ||
        unit.mediaPackage?.assets[0]?.url ||
        unit.mediaPackage?.assets[0]?.supabaseUrl ||
        null;

      return {
        unitId: unit.id,
        inventoryCode: unit.inventoryCode,
        type: unit.type,
        status: unit.status,
        roomCount: unit.roomCount,
        conceptLabel: unit.conceptLabel,
        area: unit.area,
        netArea: unit.netArea,
        grossArea: unit.grossArea,
        floor: unit.floor,
        floorLabel: unit.floorLabel,
        totalFloors: unit.totalFloors,
        facades: unit.facades,
        features: unit.features,
        price: Number(unit.price || 0),
        priceCurrency: (unit.priceCurrency || 'TRY').toUpperCase(),
        deliveryDate: unit.deliveryDate,
        poolPublishedAt: unit.poolPublishedAt,
        coverImage,
        block: unit.block,
        project: unit.project,
        crmHint: {
          directMatchCount: directCrmMatches.length,
          matchingInterestIds: directCrmMatches.slice(0, 10).map((item) => item.id),
          privateCustomerDataIncluded: false,
        },
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      filters,
      summary: {
        visibleUnitCount: items.length,
        unitsWithDirectCrmMatch: items.filter(
          (item) => item.crmHint.directMatchCount > 0,
        ).length,
        directCrmMatchCount: items.reduce(
          (total, item) => total + item.crmHint.directMatchCount,
          0,
        ),
      },
      items,
      privacy: {
        projectOwnerIdentityIncluded: false,
        projectOwnerContactIncluded: false,
        deedOwnerIncluded: false,
        fullAddressIncluded: false,
        privateCustomerDataIncluded: false,
      },
      policy: {
        version: 'EPH_AGENT_SALES_CHANNEL_V1',
        source: 'POOL_VISIBLE_PROJECT_INVENTORY',
        directCrmHintUsesLoggedInAgentsOwnInterestsOnly: true,
        directCrmHintIsConservative: true,
        linaDistanceMatchNotCalculatedInList: true,
      },
    };
  }

  private isDirectCrmMatch(
    unit: {
      type: UnitType;
      status: UnitStatus;
      roomCount: string | null;
      area: number | null;
      netArea: number | null;
      grossArea: number | null;
      price: number;
      priceCurrency: string | null;
      project: {
        city: string;
        district: string;
        neighborhood: string | null;
      };
    },
    interest: {
      city: string | null;
      district: string | null;
      neighborhood: string | null;
      propertyTypes: UnitType[];
      statuses: UnitStatus[];
      minBudget: number | null;
      maxBudget: number | null;
      priceCurrency: string;
      minArea: number | null;
      maxArea: number | null;
      roomCounts: string[];
    },
  ) {
    if (interest.city && !this.sameText(interest.city, unit.project.city)) {
      return false;
    }

    if (
      interest.district &&
      !this.sameText(interest.district, unit.project.district)
    ) {
      return false;
    }

    if (
      interest.neighborhood &&
      !this.sameText(interest.neighborhood, unit.project.neighborhood)
    ) {
      return false;
    }

    if (
      interest.propertyTypes.length > 0 &&
      !interest.propertyTypes.includes(unit.type)
    ) {
      return false;
    }

    if (
      interest.statuses.length > 0 &&
      !interest.statuses.includes(unit.status)
    ) {
      return false;
    }

    const unitCurrency = String(unit.priceCurrency || 'TRY').toUpperCase();
    const interestCurrency = String(interest.priceCurrency || 'TRY').toUpperCase();
    if (unitCurrency !== interestCurrency) return false;

    const price = Number(unit.price || 0);
    if (interest.minBudget !== null && price < Number(interest.minBudget)) {
      return false;
    }
    if (interest.maxBudget !== null && price > Number(interest.maxBudget)) {
      return false;
    }

    const area = this.getRepresentativeArea(unit);
    if (interest.minArea !== null && (area === null || area < interest.minArea)) {
      return false;
    }
    if (interest.maxArea !== null && (area === null || area > interest.maxArea)) {
      return false;
    }

    if (
      interest.roomCounts.length > 0 &&
      (!unit.roomCount || !interest.roomCounts.includes(unit.roomCount))
    ) {
      return false;
    }

    return true;
  }

  private getRepresentativeArea(unit: {
    netArea: number | null;
    grossArea: number | null;
    area: number | null;
  }) {
    const values = [unit.netArea, unit.grossArea, unit.area]
      .map((value) => (value === null ? null : Number(value)))
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value) && value > 0,
      );

    return values[0] ?? null;
  }

  private normalizeFilters(query: AgentChannelQuery) {
    const unitType = this.optionalEnum(
      query.unitType,
      Object.values(UnitType),
      'Gayrimenkul tipi',
    );
    const status = this.optionalEnum(
      query.status,
      Array.from(MARKETABLE_STATUSES),
      'Stok durumu',
    );

    return {
      city: this.optionalText(query.city),
      district: this.optionalText(query.district),
      unitType,
      status,
      minPrice: this.optionalNonNegativeNumber(query.minPrice, 'Minimum fiyat'),
      maxPrice: this.optionalNonNegativeNumber(query.maxPrice, 'Maksimum fiyat'),
      minArea: this.optionalNonNegativeNumber(query.minArea, 'Minimum m²'),
      maxArea: this.optionalNonNegativeNumber(query.maxArea, 'Maksimum m²'),
      roomCount: this.optionalText(query.roomCount),
      limit: this.normalizeLimit(query.limit),
    };
  }

  private optionalEnum<T extends string>(
    value: unknown,
    values: T[],
    label: string,
  ): T | null {
    if (value === undefined || value === null || value === '') return null;
    const normalized = String(value).trim().toUpperCase() as T;
    if (!values.includes(normalized)) {
      throw new BadRequestException(`${label} geçersiz.`);
    }
    return normalized;
  }

  private optionalText(value: unknown) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private optionalNonNegativeNumber(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${label} geçersiz.`);
    }
    return parsed;
  }

  private normalizeLimit(value: unknown) {
    if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('limit pozitif tam sayı olmalıdır.');
    }
    return Math.min(parsed, MAX_LIMIT);
  }

  private sameText(left: string | null, right: string | null) {
    return this.normalizeText(left) === this.normalizeText(right);
  }

  private normalizeText(value: string | null) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }
}
