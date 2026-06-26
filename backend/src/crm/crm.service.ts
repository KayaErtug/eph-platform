import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityType,
  CustomerInterestPriority,
  CustomerPropertyRelation,
  CustomerPurchaseIntent,
  CustomerRole,
  CustomerStatus,
  Prisma,
  Role,
  TaskStatus,
  UnitStatus,
  UnitType,
} from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private canAccessCustomer(customerOwnerId: string, userId: string, userRole: Role) {
    return userRole === Role.SUPER_ADMIN || customerOwnerId === userId;
  }

  private getCustomerWhere(userId: string, userRole: Role) {
    if (userRole === Role.SUPER_ADMIN) {
      return {};
    }

    return { ownerId: userId };
  }

  private normalizeStringArray(value: unknown): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  private normalizeEnumArray<T extends string>(value: unknown, allowedValues: readonly T[]): T[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      return [];
    }

    const allowed = new Set<string>(allowedValues);

    return value
      .map((item) => String(item ?? '').trim())
      .filter((item): item is T => allowed.has(item));
  }

  private normalizeOptionalNumber(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value === '') {
      return null;
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return null;
    }

    return numberValue;
  }

  private cleanCustomerData(data: any): Prisma.CustomerUncheckedCreateInput | Prisma.CustomerUncheckedUpdateInput {
    const allowedCustomerRoles = Object.values(CustomerRole);

    const cleaned: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      email: data.email ?? null,
      city: data.city ?? null,
      profession: data.profession ?? null,
      company: data.company ?? null,
      budget: this.normalizeOptionalNumber(data.budget),
      interestedArea: data.interestedArea ?? null,
      interestedType: data.interestedType ?? null,
      source: data.source ?? null,
      status: data.status,
      roles: this.normalizeEnumArray(data.roles, allowedCustomerRoles),
      tags: this.normalizeStringArray(data.tags),
      notes: data.notes ?? null,
      lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : undefined,
    };

    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    return cleaned;
  }

  private cleanInterestData(data: any): Prisma.CustomerInterestUncheckedCreateInput | Prisma.CustomerInterestUncheckedUpdateInput {
    const allowedUnitTypes = Object.values(UnitType);
    const allowedUnitStatuses = Object.values(UnitStatus);
    const allowedIntents = Object.values(CustomerPurchaseIntent);
    const allowedPriorities = Object.values(CustomerInterestPriority);

    const purchaseIntent = String(data.purchaseIntent ?? CustomerPurchaseIntent.BELIRSIZ);
    const priority = String(data.priority ?? CustomerInterestPriority.NORMAL);

    const cleaned: any = {
      title: data.title ?? null,
      city: data.city ?? null,
      district: data.district ?? null,
      neighborhood: data.neighborhood ?? null,
      propertyTypes: this.normalizeEnumArray(data.propertyTypes, allowedUnitTypes as string[]),
      statuses: this.normalizeEnumArray(data.statuses, allowedUnitStatuses as string[]),
      minBudget: this.normalizeOptionalNumber(data.minBudget),
      maxBudget: this.normalizeOptionalNumber(data.maxBudget),
      priceCurrency: data.priceCurrency ?? 'TRY',
      minArea: this.normalizeOptionalNumber(data.minArea),
      maxArea: this.normalizeOptionalNumber(data.maxArea),
      roomCounts: this.normalizeStringArray(data.roomCounts),
      features: this.normalizeStringArray(data.features),
      purchaseIntent: allowedIntents.includes(purchaseIntent as CustomerPurchaseIntent)
        ? purchaseIntent
        : CustomerPurchaseIntent.BELIRSIZ,
      priority: allowedPriorities.includes(priority as CustomerInterestPriority) ? priority : CustomerInterestPriority.NORMAL,
      notes: data.notes ?? null,
      isActive: data.isActive,
      lastMatchedAt: data.lastMatchedAt ? new Date(data.lastMatchedAt) : undefined,
    };

    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    return cleaned;
  }

  private async findCustomerForAccess(customerId: string, userId: string, userRole: Role) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (!this.canAccessCustomer(customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM kaydına erişim yetkiniz yok.');
    }

    return customer;
  }

  private async findInterestForAccess(interestId: string, userId: string, userRole: Role) {
    const interest = await this.prisma.customerInterest.findUnique({
      where: { id: interestId },
      include: { customer: true },
    });

    if (!interest) {
      throw new NotFoundException('İlgi bölgesi bulunamadı.');
    }

    if (!this.canAccessCustomer(interest.customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM ilgi bölgesine erişim yetkiniz yok.');
    }

    return interest;
  }

  private async findCustomerPropertyForAccess(customerPropertyId: string, userId: string, userRole: Role) {
    const property = await this.prisma.customerProperty.findUnique({
      where: { id: customerPropertyId },
      include: { customer: true },
    });

    if (!property) {
      throw new NotFoundException('Müşteri-gayrimenkul ilişkisi bulunamadı.');
    }

    if (!this.canAccessCustomer(property.customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu müşteri-gayrimenkul ilişkisine erişim yetkiniz yok.');
    }

    return property;
  }

  async getCustomers(userId: string, userRole: Role) {
    return this.prisma.customer.findMany({
      where: this.getCustomerWhere(userId, userRole),
      include: {
        owner: { select: { firstName: true, lastName: true, role: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        tasks: { where: { status: TaskStatus.BEKLIYOR }, orderBy: { dueDate: 'asc' } },
        interests: { where: { isActive: true }, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }], take: 3 },
        properties: { include: { unit: { include: { project: true } } }, take: 3 },
        _count: { select: { activities: true, tasks: true, interests: true, properties: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createCustomer(userId: string, data: any) {
    return this.prisma.customer.create({
      data: { ...this.cleanCustomerData(data), ownerId: userId } as Prisma.CustomerUncheckedCreateInput,
    });
  }

  async getCustomer(id: string, userId: string, userRole: Role) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { firstName: true, lastName: true, role: true } },
        activities: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { dueDate: 'asc' },
        },
        interests: { orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }] },
        properties: {
          include: {
            unit: {
              include: {
                project: true,
                images: { where: { isCover: true }, take: 1 },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (!this.canAccessCustomer(customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM kaydına erişim yetkiniz yok.');
    }

    return customer;
  }

  async updateCustomer(id: string, userId: string, userRole: Role, data: any) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.update({
      where: { id },
      data: this.cleanCustomerData(data) as Prisma.CustomerUncheckedUpdateInput,
    });
  }

  async updateStatus(id: string, userId: string, userRole: Role, status: CustomerStatus) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async deleteCustomer(id: string, userId: string, userRole: Role) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async addActivity(customerId: string, userId: string, userRole: Role, data: { type: ActivityType; note: string }) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { lastContactedAt: new Date() },
    });

    return this.prisma.activity.create({
      data: { customerId, userId, ...data },
    });
  }

  async addTask(customerId: string, userId: string, userRole: Role, data: { title: string; dueDate?: string }) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    return this.prisma.task.create({
      data: {
        customerId,
        userId,
        title: data.title,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async updateTask(taskId: string, userId: string, userRole: Role, data: { status?: TaskStatus; title?: string; dueDate?: string }) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { customer: true },
    });

    if (!task) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    if (!this.canAccessCustomer(task.customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM görevine erişim yetkiniz yok.');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async getCustomerInterests(customerId: string, userId: string, userRole: Role) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    return this.prisma.customerInterest.findMany({
      where: { customerId },
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async addCustomerInterest(customerId: string, userId: string, userRole: Role, data: any) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    return this.prisma.customerInterest.create({
      data: {
        ...this.cleanInterestData(data),
        customerId,
      } as Prisma.CustomerInterestUncheckedCreateInput,
    });
  }

  async updateCustomerInterest(interestId: string, userId: string, userRole: Role, data: any) {
    await this.findInterestForAccess(interestId, userId, userRole);

    return this.prisma.customerInterest.update({
      where: { id: interestId },
      data: this.cleanInterestData(data) as Prisma.CustomerInterestUncheckedUpdateInput,
    });
  }

  async deleteCustomerInterest(interestId: string, userId: string, userRole: Role) {
    await this.findInterestForAccess(interestId, userId, userRole);

    return this.prisma.customerInterest.update({
      where: { id: interestId },
      data: { isActive: false },
    });
  }

  async getCustomerProperties(customerId: string, userId: string, userRole: Role) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    return this.prisma.customerProperty.findMany({
      where: { customerId },
      include: {
        unit: {
          include: {
            project: true,
            images: { where: { isCover: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCustomerProperty(
    customerId: string,
    userId: string,
    userRole: Role,
    data: { unitId: string; relationType: CustomerPropertyRelation; notes?: string },
  ) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    if (!data.unitId) {
      throw new BadRequestException('Portföy seçiniz.');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: data.unitId },
      include: { project: true },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    const canUseUnit = userRole === Role.SUPER_ADMIN || unit.project.ownerId === userId || unit.isPoolVisible;

    if (!canUseUnit) {
      throw new ForbiddenException('Bu portföyü CRM kaydına bağlama yetkiniz yok.');
    }

    return this.prisma.customerProperty.upsert({
      where: {
        customerId_unitId_relationType: {
          customerId,
          unitId: data.unitId,
          relationType: data.relationType,
        },
      },
      update: {
        notes: data.notes ?? null,
        updatedAt: new Date(),
      },
      create: {
        customerId,
        unitId: data.unitId,
        relationType: data.relationType,
        notes: data.notes ?? null,
      },
      include: {
        unit: {
          include: {
            project: true,
            images: { where: { isCover: true }, take: 1 },
          },
        },
      },
    });
  }

  async deleteCustomerProperty(customerPropertyId: string, userId: string, userRole: Role) {
    await this.findCustomerPropertyForAccess(customerPropertyId, userId, userRole);

    return this.prisma.customerProperty.delete({
      where: { id: customerPropertyId },
    });
  }
   


    private getMatchLevel(score: number) {
    if (score >= 90) return 'Mükemmel';
    if (score >= 75) return 'Çok Güçlü';
    if (score >= 60) return 'Güçlü';
    if (score >= 40) return 'Uygun';
    return 'Zayıf';
  }

  async getCustomerInterestMatches(
    interestId: string,
    userId: string,
    userRole: Role,
  ) {
    const interest = await this.findInterestForAccess(
      interestId,
      userId,
      userRole,
    );

    const poolUnits = await this.prisma.unit.findMany({
      where: {
        isPoolVisible: true,
      },
      include: {
        project: true,
        images: {
          where: {
            isCover: true,
          },
          take: 1,
        },
      },
      orderBy: {
        poolPublishedAt: 'desc',
      },
    });

    const results = poolUnits.map((unit) => {
      let score = 0;
      const reasons: string[] = [];

      if (
        interest.city &&
        unit.project?.city &&
        interest.city.toLowerCase() === unit.project.city.toLowerCase()
      ) {
        score += 20;
        reasons.push('Aynı il');
      }

      if (
        interest.district &&
        unit.project?.district &&
        interest.district.toLowerCase() ===
          unit.project.district.toLowerCase()
      ) {
        score += 20;
        reasons.push('Aynı ilçe');
      }

      if (
        Array.isArray(interest.propertyTypes) &&
        interest.propertyTypes.length > 0 &&
        interest.propertyTypes.includes(unit.type)
      ) {
        score += 10;
        reasons.push('Mülk tipi uyumlu');
      }

      if (
        Array.isArray(interest.statuses) &&
        interest.statuses.length > 0 &&
        interest.statuses.includes(unit.status)
      ) {
        score += 10;
        reasons.push('Portföy durumu uyumlu');
      }

      if (
        interest.minBudget &&
        interest.maxBudget &&
        unit.price >= interest.minBudget &&
        unit.price <= interest.maxBudget
      ) {
        score += 10;
        reasons.push('Bütçe aralığında');
      }

      if (
        interest.minArea &&
        interest.maxArea &&
        unit.area &&
        unit.area >= interest.minArea &&
        unit.area <= interest.maxArea
      ) {
        score += 5;
        reasons.push('m² uyumlu');
      }

      if (
        Array.isArray(interest.roomCounts) &&
        interest.roomCounts.length > 0 &&
        unit.roomCount &&
        interest.roomCounts.includes(unit.roomCount)
      ) {
        score += 3;
        reasons.push('Oda sayısı uyumlu');
      }

      const featureMatches =
        Array.isArray(interest.features) &&
        Array.isArray(unit.features)
          ? interest.features.filter((f) =>
              unit.features.includes(f),
            ).length
          : 0;

      if (featureMatches > 0) {
        score += 2;
        reasons.push(
          `${featureMatches} ortak özellik bulundu`,
        );
      }

      return {
        unitId: unit.id,
        projectName: unit.project?.name,
        city: unit.project?.city,
        district: unit.project?.district,
        price: unit.price,
        roomCount: unit.roomCount,
        area: unit.area,
        coverImage:
          unit.images?.[0]?.url || null,
        matchScore: Math.min(score, 100),
        matchLevel: this.getMatchLevel(score),
        matchReasons: reasons,
      };
    });

    return results.sort(
      (a, b) => b.matchScore - a.matchScore,
    );
  }



  async getAdminSummary(userRole: Role) {
    const normalizedRole = String(userRole || '').toUpperCase();




    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

     if (!allowedRoles.includes(normalizedRole)) {



      throw new ForbiddenException('CRM yönetim özetine erişim yetkiniz yok.');
    }

    const [
      totalCustomers,
      activeCustomers,
      closedDeals,
      lostDeals,
      pendingTasks,
      totalTasks,
      totalActivities,
      totalInterests,
      totalCustomerProperties,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({
        where: {
          status: {
            notIn: [CustomerStatus.KAPANDI, CustomerStatus.KAYBEDILDI],
          },
        },
      }),
      this.prisma.customer.count({ where: { status: CustomerStatus.KAPANDI } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.KAYBEDILDI } }),
      this.prisma.task.count({ where: { status: TaskStatus.BEKLIYOR } }),
      this.prisma.task.count(),
      this.prisma.activity.count(),
      this.prisma.customerInterest.count({ where: { isActive: true } }),
      this.prisma.customerProperty.count(),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      closedDeals,
      lostDeals,
      pendingTasks,
      totalTasks,
      totalActivities,
      totalInterests,
      totalCustomerProperties,
    };
  }


  async getAdminPerformance(userRole: Role) {
    const normalizedRole = String(userRole || '').toUpperCase();
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

    if (!allowedRoles.includes(normalizedRole)) {
      throw new ForbiddenException('CRM performans özetine erişim yetkiniz yok.');
    }

    const [offices, users, customerGroups, closedCustomerGroups, pendingTaskGroups, activityGroups, units] = await Promise.all([
      this.prisma.office.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          teams: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              leader: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              members: {
                where: { isActive: true },
                select: {
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.findMany({
        where: {
          role: {
            in: [Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI],
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          office: {
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
            },
          },
        },
      }),
      this.prisma.customer.groupBy({
        by: ['ownerId'],
        _count: { _all: true },
      }),
      this.prisma.customer.groupBy({
        by: ['ownerId'],
        where: { status: CustomerStatus.KAPANDI },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['userId'],
        where: { status: TaskStatus.BEKLIYOR },
        _count: { _all: true },
      }),
      this.prisma.activity.groupBy({
        by: ['userId'],
        _count: { _all: true },
      }),
      this.prisma.unit.findMany({
        select: {
          id: true,
          isPoolVisible: true,
          project: {
            select: {
              ownerId: true,
            },
          },
        },
      }),
    ]);

    const customerCountByUser = new Map(customerGroups.map((item) => [item.ownerId, item._count._all]));
    const closedCountByUser = new Map(closedCustomerGroups.map((item) => [item.ownerId, item._count._all]));
    const pendingTaskCountByUser = new Map(pendingTaskGroups.map((item) => [item.userId, item._count._all]));
    const activityCountByUser = new Map(activityGroups.map((item) => [item.userId, item._count._all]));
    const portfolioCountByUser = new Map<string, number>();
    const poolPortfolioCountByUser = new Map<string, number>();

    units.forEach((unit) => {
      const ownerId = unit.project?.ownerId;
      if (!ownerId) return;

      portfolioCountByUser.set(ownerId, (portfolioCountByUser.get(ownerId) || 0) + 1);

      if (unit.isPoolVisible) {
        poolPortfolioCountByUser.set(ownerId, (poolPortfolioCountByUser.get(ownerId) || 0) + 1);
      }
    });

    const sumForUsers = (userIds: string[], source: Map<string, number>) =>
      userIds.reduce((total, userId) => total + (source.get(userId) || 0), 0);

    const calculateScore = (input: {
      customerCount: number;
      closedCount: number;
      activityCount: number;
      portfolioCount: number;
      poolPortfolioCount: number;
      memberCount?: number;
    }) => {
      const customerScore = Math.min(25, input.customerCount * 0.75);
      const closedScore = Math.min(25, input.closedCount * 2.5);
      const activityScore = Math.min(20, input.activityCount * 0.65);
      const portfolioScore = Math.min(20, input.portfolioCount * 0.65);
      const poolScore = Math.min(10, input.poolPortfolioCount * 1.2);
      const memberBonus = Math.min(8, (input.memberCount || 0) * 0.6);

      return Math.max(0, Math.min(100, Math.round(customerScore + closedScore + activityScore + portfolioScore + poolScore + memberBonus)));
    };

    const officePerformance = offices
      .map((office) => {
        const userIds = office.users.map((item) => item.id);
        const customerCount = sumForUsers(userIds, customerCountByUser);
        const closedCount = sumForUsers(userIds, closedCountByUser);
        const pendingTaskCount = sumForUsers(userIds, pendingTaskCountByUser);
        const activityCount = sumForUsers(userIds, activityCountByUser);
        const portfolioCount = sumForUsers(userIds, portfolioCountByUser);
        const poolPortfolioCount = sumForUsers(userIds, poolPortfolioCountByUser);

        return {
          id: office.id,
          name: office.name,
          location: [office.city, office.district].filter(Boolean).join(' / ') || 'Konum yok',
          advisorCount: office.users.length,
          teamCount: office.teams.length,
          customerCount,
          closedCount,
          pendingTaskCount,
          activityCount,
          portfolioCount,
          poolPortfolioCount,
          performanceScore: calculateScore({
            customerCount,
            closedCount,
            activityCount,
            portfolioCount,
            poolPortfolioCount,
            memberCount: office.users.length,
          }),
        };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore || b.customerCount - a.customerCount)
      .slice(0, 5);

    const teamPerformance = offices
      .flatMap((office) =>
        office.teams.map((team) => {
          const userIds = team.members.map((member) => member.userId);
          const customerCount = sumForUsers(userIds, customerCountByUser);
          const closedCount = sumForUsers(userIds, closedCountByUser);
          const pendingTaskCount = sumForUsers(userIds, pendingTaskCountByUser);
          const activityCount = sumForUsers(userIds, activityCountByUser);
          const portfolioCount = sumForUsers(userIds, portfolioCountByUser);
          const poolPortfolioCount = sumForUsers(userIds, poolPortfolioCountByUser);

          return {
            id: team.id,
            name: team.name,
            officeName: office.name,
            leaderName: [team.leader?.firstName, team.leader?.lastName].filter(Boolean).join(' ') || 'Lider yok',
            memberCount: team.members.length,
            customerCount,
            closedCount,
            pendingTaskCount,
            activityCount,
            portfolioCount,
            poolPortfolioCount,
            performanceScore: calculateScore({
              customerCount,
              closedCount,
              activityCount,
              portfolioCount,
              poolPortfolioCount,
              memberCount: team.members.length,
            }),
          };
        }),
      )
      .sort((a, b) => b.performanceScore - a.performanceScore || b.customerCount - a.customerCount)
      .slice(0, 5);

    const teamNameByUserId = new Map<string, string>();

    offices.forEach((office) => {
      office.teams.forEach((team) => {
        team.members.forEach((member) => {
          if (!teamNameByUserId.has(member.userId)) {
            teamNameByUserId.set(member.userId, team.name);
          }
        });
      });
    });

    const advisorPerformance = users
      .map((advisor) => {
        const customerCount = customerCountByUser.get(advisor.id) || 0;
        const closedCount = closedCountByUser.get(advisor.id) || 0;
        const pendingTaskCount = pendingTaskCountByUser.get(advisor.id) || 0;
        const activityCount = activityCountByUser.get(advisor.id) || 0;
        const portfolioCount = portfolioCountByUser.get(advisor.id) || 0;
        const poolPortfolioCount = poolPortfolioCountByUser.get(advisor.id) || 0;

        return {
          id: advisor.id,
          name: [advisor.firstName, advisor.lastName].filter(Boolean).join(' ') || 'Danışman',
          role: advisor.role,
          officeName: advisor.office?.name || 'Ofis yok',
          teamName: teamNameByUserId.get(advisor.id) || 'Takım yok',
          customerCount,
          closedCount,
          pendingTaskCount,
          activityCount,
          portfolioCount,
          poolPortfolioCount,
          performanceScore: calculateScore({
            customerCount,
            closedCount,
            activityCount,
            portfolioCount,
            poolPortfolioCount,
          }),
        };
      })
      .filter((advisor) => advisor.customerCount > 0 || advisor.portfolioCount > 0 || advisor.activityCount > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore || b.customerCount - a.customerCount)
      .slice(0, 10);

    return {
      officePerformance,
      teamPerformance,
      advisorPerformance,
    };
  }



  async getPipeline(userId: string, userRole: Role) {
    const customers = await this.prisma.customer.findMany({
      where: this.getCustomerWhere(userId, userRole),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        budget: true,
        status: true,
        roles: true,
        tags: true,
        city: true,
        lastContactedAt: true,
        updatedAt: true,
        _count: { select: { activities: true, tasks: true, interests: true, properties: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const pipeline: Record<string, any[]> = {};
    const statuses = [
      'YENI_LEAD',
      'ILK_GORUSME',
      'PORTFOLYO_GONDERILDI',
      'YER_GOSTERIMI',
      'TEKLIF_SURECI',
      'PAZARLIK',
      'KAPANDI',
      'KAYBEDILDI',
    ];

    statuses.forEach((status) => {
      pipeline[status] = [];
    });

    customers.forEach((customer) => {
      pipeline[customer.status]?.push(customer);
    });

    return pipeline;
  }
}
