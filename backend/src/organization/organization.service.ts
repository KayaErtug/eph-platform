import { deletedAccounts, isAccountDeleted } from '../auth/account-deletion';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Capability, PortfolioApprovalStatus, Role, SisterLinkStatus } from "@prisma/client";
import { readLimit } from "../pricing/commercial-costs";
import { resolveMaxTeams } from "../office/office-team-quota";

import { officeLocationData } from "./office-location";
import { PrismaService } from "../prisma/prisma.service";

type OrganizationActor = {
  id?: string;
  role?: Role | string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  private getActorId(actor?: OrganizationActor): string {
    const actorId = actor?.id;

    if (!actorId) {
      throw new ForbiddenException("Yönetici kimliği doğrulanamadı.");
    }

    return actorId;
  }

  private getActorRole(actor?: OrganizationActor): Role | string {
    const role = actor?.role;

    if (!role) {
      throw new ForbiddenException("Yönetici rolü doğrulanamadı.");
    }

    return role;
  }

  private ensureAdminActor(actor?: OrganizationActor) {
    const role = this.getActorRole(actor);

    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Bu işlem için yönetici yetkisi gereklidir.",
      );
    }
  }

  private cleanText(value?: string | null) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  private slugify(value: string) {
    const normalized = value
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalized || `ofis-${Date.now()}`;
  }

  private async generateUniqueOfficeSlug(
    name: string,
    currentOfficeId?: string,
  ) {
    const base = this.slugify(name);
    let slug = base;
    let counter = 2;

    let existing = await this.prisma.office.findUnique({
      where: { slug },
      select: { id: true },
    });

    while (existing && existing.id !== currentOfficeId) {
      slug = `${base}-${counter}`;
      counter += 1;
      existing = await this.prisma.office.findUnique({
        where: { slug },
        select: { id: true },
      });
    }

    return slug;
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        officeId: true,
      },
    });

    if (!user || await isAccountDeleted(this.prisma, userId)) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.ADMIN ||
      user.role === Role.MODERATOR
    ) {
      throw new BadRequestException(
        "Yönetici rolleri ofis/takım organizasyonuna atanamaz.",
      );
    }

    return user;
  }

  private async removeCapabilityIfNotNeeded(
    userId: string,
    capability: Capability,
    tx: any = this.prisma,
  ) {
    if (capability === Capability.TEAM_LEADER) {
      const activeLedTeamCount = await tx.team.count({
        where: {
          leaderId: userId,
          isActive: true,
        },
      });

      if (activeLedTeamCount > 0) return;
    }

    if (capability === Capability.OFFICE_OWNER) {
      const ownedOfficeCount = await tx.office.count({
        where: {
          ownerUserId: userId,
          isActive: true,
        },
      });

      if (ownedOfficeCount > 0) return;
    }

    await tx.userCapability.deleteMany({
      where: {
        userId,
        capability,
      },
    });
  }

  private async addCapability(
    userId: string,
    capability: Capability,
    actorId: string,
    tx: any = this.prisma,
  ) {
    await tx.userCapability.upsert({
      where: {
        userId_capability: {
          userId,
          capability,
        },
      },
      update: {
        createdById: actorId,
      },
      create: {
        userId,
        capability,
        createdById: actorId,
      },
    });
  }

  private async addOrMoveMemberToTeam(
    teamId: string,
    userId: string,
    officeId: string,
    tx: any = this.prisma,
  ) {
    // Task 18: Çoklu takım üyeliği. Diğer takım üyelikleri korunur.
    await tx.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      update: {
        isActive: true,
        leftAt: null,
      },
      create: {
        teamId,
        userId,
        isActive: true,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { officeId },
    });
  }


  private ratioScore(total: number, good: number, maxScore: number) {
    if (total <= 0) return 0;
    return Math.min(Math.max(good / total, 0), 1) * maxScore;
  }

  private calculatePortfolioQualityScore(input: {
    portfolioCount: number;
    missingPhotoCount: number;
    missingDocumentCount: number;
    missingLocationCount: number;
    unauthorizedPortfolioCount: number;
  }) {
    const portfolioCount = Math.max(0, Number(input.portfolioCount || 0));

    if (portfolioCount <= 0) return 0;

    const missingPhotoCount = Math.max(0, Number(input.missingPhotoCount || 0));
    const missingDocumentCount = Math.max(0, Number(input.missingDocumentCount || 0));
    const missingLocationCount = Math.max(0, Number(input.missingLocationCount || 0));
    const unauthorizedPortfolioCount = Math.max(
      0,
      Number(input.unauthorizedPortfolioCount || 0),
    );

    const photoScore = this.ratioScore(
      portfolioCount,
      portfolioCount - missingPhotoCount,
      25,
    );
    const documentScore = this.ratioScore(
      portfolioCount,
      portfolioCount - missingDocumentCount,
      30,
    );
    const locationScore = this.ratioScore(
      portfolioCount,
      portfolioCount - missingLocationCount,
      20,
    );
    const authorizationScore = this.ratioScore(
      portfolioCount,
      portfolioCount - unauthorizedPortfolioCount,
      25,
    );

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          photoScore + documentScore + locationScore + authorizationScore,
        ),
      ),
    );
  }

  private emptyQualityCenter() {
    return {
      missingPhotoCount: 0,
      missingDocumentCount: 0,
      missingLocationCount: 0,
      unauthorizedPortfolioCount: 0,
    };
  }

  async getSummary() {
    const [
      officeCount,
      activeOfficeCount,
      teamCount,
      activeTeamCount,
      memberCount,
    ] = await Promise.all([
      this.prisma.office.count(),
      this.prisma.office.count({ where: { isActive: true } }),
      this.prisma.team.count(),
      this.prisma.team.count({ where: { isActive: true } }),
      this.prisma.teamMember.findMany({ where: { isActive: true }, select: { userId: true }, distinct: ['userId'] }).then((r) => r.length),
    ]);

    return {
      officeCount,
      activeOfficeCount,
      teamCount,
      activeTeamCount,
      memberCount,
    };
  }

  async getOrganizationUsers() {
    const deletedIds = [...(await deletedAccounts(this.prisma)).keys()];
    return this.prisma.user.findMany({
      where: {
        id: { notIn: deletedIds },
        role: Role.EMLAKCI,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isApproved: true,
        officeId: true,
        office: { select: { id: true, name: true } },
        capabilities: { select: { capability: true } },
        teamMemberships: {
          where: { isActive: true },
          select: {
            id: true,
            team: { select: { id: true, name: true, officeId: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  async getOffices() {
    const offices = await this.prisma.office.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        teams: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            leaderId: true,
            _count: { select: { members: { where: { isActive: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { users: true, teams: true } },
      },
    });

    if (!offices.length) return [];

    const subKeys = offices.map((o) => `OFFICE_SUBSCRIPTION_${o.id}`);
    const subSettings = await this.prisma.systemSetting.findMany({
      where: { key: { in: subKeys } },
    });
    const subMap = new Map<string, any>();
    for (const row of subSettings) {
      if (row.valueJson && typeof row.valueJson === "object") {
        subMap.set(row.key, row.valueJson);
      }
    }

    return offices.map((office) => {
      const sub = subMap.get(`OFFICE_SUBSCRIPTION_${office.id}`) || null;
      return {
        ...office,
        subscription: sub
          ? {
              packageCode: sub.packageCode || null,
              packageName: sub.packageName || sub.packageCode || null,
              agents: sub.agents ?? null,
              expiresAt: sub.expiresAt || null,
              active: sub.active ?? true,
            }
          : null,
      };
    });
  }

  async getOfficeKpi(officeId: string) {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: {
        id: true,
        name: true,
        isActive: true,
        users: {
          where: {
            role: { in: [Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI] },
          },
          select: { id: true },
        },
        teams: {
          where: { isActive: true },
          select: {
            id: true,
            members: {
              where: { isActive: true },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!office) {
      throw new NotFoundException("Ofis bulunamadı.");
    }

    const officeUserIds = office.users.map((item) => item.id);
    const teamMemberIds = office.teams.flatMap((team) =>
      team.members.map((member) => member.userId),
    );
    const userIds = Array.from(new Set([...officeUserIds, ...teamMemberIds]));

    const activeTeamCount = office.teams.length;
    const memberCount = userIds.length;

    if (!userIds.length) {
      const qualityCenter = this.emptyQualityCenter();

      return {
        officeId: office.id,
        officeName: office.name,
        activeTeamCount,
        memberCount: 0,
        portfolioCount: 0,
        authorizedPortfolioCount: 0,
        poolPortfolioCount: 0,
        performanceScore: office.isActive ? 10 : 0,
        qualityScore: 0,
        qualityCenter,
        quality: qualityCenter,
      };
    }

    const portfolioWhere = {
      project: {
        ownerId: { in: userIds },
      },
    };

    const [
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
    ] = await Promise.all([
      this.prisma.unit.count({
        where: portfolioWhere,
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          approvalStatus: {
            in: [
              PortfolioApprovalStatus.ONAYLANDI,
              PortfolioApprovalStatus.HAVUZDA,
            ],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          isPoolVisible: true,
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          images: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          authorityDocuments: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: userIds },
            OR: [{ latitude: null }, { longitude: null }],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          approvalStatus: {
            notIn: [
              PortfolioApprovalStatus.ONAYLANDI,
              PortfolioApprovalStatus.HAVUZDA,
            ],
          },
        },
      }),
    ]);

    const qualityCenter = {
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
    };

    const qualityScore = this.calculatePortfolioQualityScore({
      portfolioCount,
      ...qualityCenter,
    });

    const teamScore = Math.min(activeTeamCount / 10, 1) * 15;
    const memberScore = Math.min(memberCount / 80, 1) * 15;
    const authorizedScore = portfolioCount
      ? Math.min(authorizedPortfolioCount / portfolioCount, 1) * 25
      : 0;
    const poolScore = portfolioCount
      ? Math.min(poolPortfolioCount / portfolioCount, 1) * 15
      : 0;
    const qualityPerformanceScore = qualityScore * 0.2;
    const activeScore = office.isActive ? 10 : 0;

    const performanceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          teamScore +
            memberScore +
            authorizedScore +
            poolScore +
            qualityPerformanceScore +
            activeScore,
        ),
      ),
    );

    return {
      officeId: office.id,
      officeName: office.name,
      activeTeamCount,
      memberCount,
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      performanceScore,
      qualityScore,
      qualityCenter,
      quality: qualityCenter,
    };
  }

  async createOffice(
    body: {
      name?: string;
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
      ownerUserId?: string | null;
    },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const name = this.cleanText(body.name);

    if (!name) throw new BadRequestException("Ofis adı zorunludur.");

    const location = officeLocationData(body);
    const ownerUserId = body.ownerUserId || null;
    if (ownerUserId) await this.getUserOrThrow(ownerUserId);

    const slug = await this.generateUniqueOfficeSlug(name);

    return this.prisma.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name,
          slug,
          ...location,
          ownerUserId,
          isActive: true,
        },
      });

      if (ownerUserId) {
        await tx.user.update({
          where: { id: ownerUserId },
          data: { officeId: office.id },
        });
        await this.addCapability(
          ownerUserId,
          Capability.OFFICE_OWNER,
          actorId,
          tx,
        );
      }

      return office;
    });
  }

  async updateOffice(
    id: string,
    body: {
      name?: string;
      city?: string | null;
      district?: string | null;
      neighborhood?: string | null;
      ownerUserId?: string | null;
      isActive?: boolean;
    },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const office = await this.prisma.office.findUnique({
      where: { id },
      select: { id: true, name: true, ownerUserId: true, city: true, district: true, neighborhood: true },
    });

    if (!office) throw new NotFoundException("Ofis bulunamadı.");

    const nextName =
      body.name !== undefined ? this.cleanText(body.name) : office.name;
    if (!nextName) throw new BadRequestException("Ofis adı zorunludur.");

    const location = officeLocationData(body, office);
    const nextOwnerUserId =
      body.ownerUserId === undefined
        ? office.ownerUserId
        : body.ownerUserId || null;
    if (nextOwnerUserId) await this.getUserOrThrow(nextOwnerUserId);

    const nextSlug =
      nextName !== office.name
        ? await this.generateUniqueOfficeSlug(nextName, office.id)
        : undefined;
    const previousOwnerUserId = office.ownerUserId;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.office.update({
        where: { id },
        data: {
          name: nextName,
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...location,
          ...(body.isActive !== undefined
            ? { isActive: Boolean(body.isActive) }
            : {}),
          ownerUserId: nextOwnerUserId,
        },
      });

      if (previousOwnerUserId && previousOwnerUserId !== nextOwnerUserId) {
        await this.removeCapabilityIfNotNeeded(
          previousOwnerUserId,
          Capability.OFFICE_OWNER,
          tx,
        );
      }

      if (nextOwnerUserId) {
        await tx.user.update({
          where: { id: nextOwnerUserId },
          data: { officeId: id },
        });
        await this.addCapability(
          nextOwnerUserId,
          Capability.OFFICE_OWNER,
          actorId,
          tx,
        );
      }

      return updated;
    });
  }

  private ensureSuperAdminActor(actor?: OrganizationActor) {
    if (this.getActorRole(actor) !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Bu işlem yalnız süper admine açıktır.");
    }
  }

  async getSisterLinks(status?: SisterLinkStatus) {
    return this.prisma.officeSisterLink.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        officeA: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            district: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        officeB: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            district: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async createSisterLink(
    body: {
      inviterOfficeId: string;
      targetOfficeId?: string;
      targetOfficeCode?: string;
      commissionSplitPct?: number;
      autoApprove?: boolean;
    },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const inviterOffice = await this.prisma.office.findUnique({
      where: { id: body.inviterOfficeId },
      select: { id: true, name: true, ownerUserId: true, code: true },
    });
    if (!inviterOffice) throw new NotFoundException("Davet eden ofis bulunamadı.");

    let targetOffice = null;
    if (body.targetOfficeId) {
      targetOffice = await this.prisma.office.findUnique({
        where: { id: body.targetOfficeId },
        select: { id: true, name: true, ownerUserId: true, code: true },
      });
    } else if (body.targetOfficeCode) {
      targetOffice = await this.prisma.office.findUnique({
        where: { code: body.targetOfficeCode.trim().toUpperCase() },
        select: { id: true, name: true, ownerUserId: true, code: true },
      });
    }
    if (!targetOffice) throw new NotFoundException("Hedef kardeş ofis bulunamadı.");
    if (inviterOffice.id === targetOffice.id) {
      throw new BadRequestException("Bir ofis kendisiyle kardeş olamaz.");
    }

    const [a, b] = inviterOffice.id < targetOffice.id ? [inviterOffice.id, targetOffice.id] : [targetOffice.id, inviterOffice.id];
    const pct = typeof body.commissionSplitPct === "number" && body.commissionSplitPct >= 0 && body.commissionSplitPct <= 100
      ? Math.round(body.commissionSplitPct)
      : 50;

    const autoApprove = body.autoApprove === true;
    const status = autoApprove ? SisterLinkStatus.AKTIF : SisterLinkStatus.BEKLIYOR;
    const now = new Date();

    const existing = await this.prisma.officeSisterLink.findUnique({
      where: { officeAId_officeBId: { officeAId: a, officeBId: b } },
    });

    const link = existing
      ? await this.prisma.officeSisterLink.update({
          where: { id: existing.id },
          data: {
            status,
            invitedByOfficeId: inviterOffice.id,
            invitedByUserId: actorId,
            commissionSplitPct: pct,
            createdAt: now,
            respondedAt: autoApprove ? now : null,
            endedAt: null,
            endedByUserId: null,
          },
        })
      : await this.prisma.officeSisterLink.create({
          data: {
            officeAId: a,
            officeBId: b,
            status,
            invitedByOfficeId: inviterOffice.id,
            invitedByUserId: actorId,
            commissionSplitPct: pct,
            createdAt: now,
            respondedAt: autoApprove ? now : null,
          },
        });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditAction.SYSTEM_SECURITY_ACTION,
        entityType: "OfficeSisterLink",
        entityId: link.id,
        description: `Kardeş ofis bağı ${autoApprove ? "doğrudan aktifleştirildi" : "daveti oluşturuldu"}: ${inviterOffice.name} <-> ${targetOffice.name}`,
        metadata: {
          operation: "ADMIN_SISTER_LINK_CREATE",
          officeAId: a,
          officeBId: b,
          autoApprove,
          status,
        },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      },
    });

    return link;
  }

  async acceptSisterLink(linkId: string, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const link = await this.prisma.officeSisterLink.findUnique({
      where: { id: linkId },
      include: { officeA: true, officeB: true },
    });
    if (!link) throw new NotFoundException("Kardeş ofis bağı bulunamadı.");

    const updated = await this.prisma.officeSisterLink.update({
      where: { id: linkId },
      data: {
        status: SisterLinkStatus.AKTIF,
        respondedAt: new Date(),
        endedAt: null,
        endedByUserId: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditAction.SYSTEM_SECURITY_ACTION,
        entityType: "OfficeSisterLink",
        entityId: link.id,
        description: `Kardeş ofis bağı onaylandı: ${link.officeA.name} <-> ${link.officeB.name}`,
        metadata: { operation: "ADMIN_SISTER_LINK_ACCEPT", linkId },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      },
    });

    return updated;
  }

  async rejectSisterLink(linkId: string, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const link = await this.prisma.officeSisterLink.findUnique({
      where: { id: linkId },
      include: { officeA: true, officeB: true },
    });
    if (!link) throw new NotFoundException("Kardeş ofis bağı bulunamadı.");

    const updated = await this.prisma.officeSisterLink.update({
      where: { id: linkId },
      data: {
        status: SisterLinkStatus.REDDEDILDI,
        respondedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditAction.SYSTEM_SECURITY_ACTION,
        entityType: "OfficeSisterLink",
        entityId: link.id,
        description: `Kardeş ofis daveti reddedildi: ${link.officeA.name} <-> ${link.officeB.name}`,
        metadata: { operation: "ADMIN_SISTER_LINK_REJECT", linkId },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      },
    });

    return updated;
  }

  async endSisterLink(linkId: string, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const link = await this.prisma.officeSisterLink.findUnique({
      where: { id: linkId },
      include: { officeA: true, officeB: true },
    });
    if (!link) throw new NotFoundException("Kardeş ofis bağı bulunamadı.");

    const updated = await this.prisma.officeSisterLink.update({
      where: { id: linkId },
      data: {
        status: SisterLinkStatus.SONLANDI,
        endedAt: new Date(),
        endedByUserId: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditAction.SYSTEM_SECURITY_ACTION,
        entityType: "OfficeSisterLink",
        entityId: link.id,
        description: `Kardeş ofis bağı sonlandırıldı: ${link.officeA.name} <-> ${link.officeB.name}`,
        metadata: { operation: "ADMIN_SISTER_LINK_END", linkId },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      },
    });

    return updated;
  }

  async getOfficePackages() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "OFFICE_MEMBERSHIP_PACKAGES" },
    });
    return Array.isArray(setting?.valueJson) ? setting.valueJson : [];
  }

  async updateOfficePackage(
    officeId: string,
    body: {
      packageCode: string;
      durationDays?: number;
      durationMonths?: number;
      reason?: string;
    },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true, ownerUserId: true },
    });

    if (!office) {
      throw new NotFoundException("Ofis bulunamadı.");
    }

    const packageCode = String(body.packageCode || "").trim().toUpperCase();
    if (!packageCode) {
      throw new BadRequestException("Paket kodu zorunludur.");
    }

    const packages = await this.getOfficePackages();
    const targetPkg: any = (packages as any[]).find(
      (p: any) => String(p.code || "").toUpperCase() === packageCode,
    );

    if (!targetPkg) {
      throw new BadRequestException(`"${packageCode}" geçerli bir ofis paketi değildir.`);
    }

    const now = new Date();
    let expiresAt: Date | null = null;
    if (typeof body.durationDays === "number" && body.durationDays > 0) {
      expiresAt = new Date(now.getTime() + body.durationDays * 24 * 60 * 60 * 1000);
    } else if (typeof body.durationMonths === "number" && body.durationMonths > 0) {
      expiresAt = new Date(now.getTime() + body.durationMonths * 30 * 24 * 60 * 60 * 1000);
    } else if (packageCode === "DENEME") {
      const trialDays = Number(targetPkg.trialDays) || 14;
      expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    } else {
      // Standart 1 yıl (365 gün)
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const key = `OFFICE_SUBSCRIPTION_${office.id}`;
    const valueJson = {
      packageCode: targetPkg.code,
      packageName: targetPkg.name || targetPkg.code,
      agents: typeof targetPkg.agents === "number" ? targetPkg.agents : 10,
      features: targetPkg.features || {},
      kardesOfis: ["ALTIN", "PLATINUM", "OFIS_25_PLUS"].includes(targetPkg.code),
      active: true,
      startedAt: now.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      updatedBy: actorId,
      reason: body.reason || "Yönetim panelinden paket güncellemesi",
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key },
        update: { valueJson },
        create: { key, valueJson },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: AuditAction.SYSTEM_SECURITY_ACTION,
          entityType: "Office",
          entityId: office.id,
          description: `Ofis paketi güncellendi: ${office.name} -> ${targetPkg.name || targetPkg.code}`,
          metadata: {
            operation: "OFFICE_PACKAGE_UPDATE",
            officeId: office.id,
            officeName: office.name,
            newPackageCode: targetPkg.code,
            newPackageName: targetPkg.name || targetPkg.code,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            reason: body.reason || null,
          },
          ipAddress: actor?.ipAddress,
          userAgent: actor?.userAgent,
        },
      });
    });

    return {
      success: true,
      officeId: office.id,
      officeName: office.name,
      subscription: {
        packageCode: targetPkg.code,
        packageName: targetPkg.name || targetPkg.code,
        agents: valueJson.agents,
        expiresAt: valueJson.expiresAt,
        active: true,
      },
    };
  }

  // Güvenli "silme": kayıt silinmez, pasifleştirilir ve AuditLog'a yazılır.
  async deactivateOffice(id: string, actor?: OrganizationActor) {
    this.ensureSuperAdminActor(actor);
    const actorId = this.getActorId(actor);
    const office = await this.prisma.office.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
    if (!office) throw new NotFoundException("Ofis bulunamadı.");

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.office.update({ where: { id }, data: { isActive: false } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: AuditAction.SYSTEM_SECURITY_ACTION,
          entityType: "Office",
          entityId: id,
          description: `Ofis pasifleştirildi: ${office.name}`,
          metadata: { operation: "OFFICE_DEACTIVATED", previousIsActive: office.isActive, newIsActive: false },
          ipAddress: actor?.ipAddress,
          userAgent: actor?.userAgent,
        },
      });
      return { ok: true, deactivated: true, office: updated };
    });
  }

  async getTeams() {
    return this.prisma.team.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        office: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            district: true,
          },
        },
        leader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        members: {
          where: { isActive: true },
          select: {
            id: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                officeId: true,
                capabilities: { select: { capability: true } },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });
  }

  async getTeamKpi(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        isActive: true,
        office: { select: { id: true, name: true } },
        members: {
          where: { isActive: true },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException("Takım bulunamadı.");
    }

    const memberIds = team.members.map((member) => member.userId);
    const memberCount = memberIds.length;

    if (!memberIds.length) {
      const qualityCenter = this.emptyQualityCenter();

      return {
        teamId: team.id,
        teamName: team.name,
        officeId: team.office.id,
        officeName: team.office.name,
        memberCount: 0,
        portfolioCount: 0,
        authorizedPortfolioCount: 0,
        poolPortfolioCount: 0,
        performanceScore: team.isActive ? 10 : 0,
        qualityScore: 0,
        qualityCenter,
        quality: qualityCenter,
      };
    }

    const portfolioWhere = {
      project: {
        ownerId: {
          in: memberIds,
        },
      },
    };

    const [
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
    ] = await Promise.all([
      this.prisma.unit.count({
        where: portfolioWhere,
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          approvalStatus: {
            in: [
              PortfolioApprovalStatus.ONAYLANDI,
              PortfolioApprovalStatus.HAVUZDA,
            ],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          isPoolVisible: true,
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          images: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          authorityDocuments: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: memberIds },
            OR: [{ latitude: null }, { longitude: null }],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          approvalStatus: {
            notIn: [
              PortfolioApprovalStatus.ONAYLANDI,
              PortfolioApprovalStatus.HAVUZDA,
            ],
          },
        },
      }),
    ]);

    const qualityCenter = {
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
    };

    const qualityScore = this.calculatePortfolioQualityScore({
      portfolioCount,
      ...qualityCenter,
    });

    const authorizedScore = portfolioCount
      ? Math.min(authorizedPortfolioCount / portfolioCount, 1) * 35
      : 0;
    const poolScore = portfolioCount
      ? Math.min(poolPortfolioCount / portfolioCount, 1) * 25
      : 0;
    const memberScore = Math.min(memberCount / 10, 1) * 15;
    const qualityPerformanceScore = qualityScore * 0.15;
    const activeScore = team.isActive ? 10 : 0;

    const performanceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          authorizedScore +
            poolScore +
            memberScore +
            qualityPerformanceScore +
            activeScore,
        ),
      ),
    );

    return {
      teamId: team.id,
      teamName: team.name,
      officeId: team.office.id,
      officeName: team.office.name,
      memberCount,
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      performanceScore,
      qualityScore,
      qualityCenter,
      quality: qualityCenter,
    };
  }

    async getMaxTeamsForOffice(officeId: string): Promise<number> {
    const subscription = await this.prisma.systemSetting.findUnique({
      where: { key: `OFFICE_SUBSCRIPTION_${officeId}` },
    });
    const sub = subscription?.valueJson as any;
    const packagesSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' },
    });
    const packages = Array.isArray(packagesSetting?.valueJson) ? (packagesSetting.valueJson as any[]) : [];
    const currentPkg = packages.find((p) => p.code === sub?.packageCode);
    const agentCapacity = Number(currentPkg?.agents ?? sub?.agents ?? 3);

    return resolveMaxTeams(currentPkg, agentCapacity);
  }

  async createTeam(
    body: { officeId?: string; name?: string; leaderId?: string | null },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const officeId = this.cleanText(body.officeId);
    const name = this.cleanText(body.name);
    const leaderId = body.leaderId || null;

    if (!officeId) throw new BadRequestException("Ofis seçimi zorunludur.");
    if (!name) throw new BadRequestException("Takım adı zorunludur.");

    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, isActive: true },
    });
    if (!office || !office.isActive)
      throw new NotFoundException("Aktif ofis bulunamadı.");

    if (leaderId) {
      const leader = await this.getUserOrThrow(leaderId);
      if (leader.role !== Role.EMLAKCI) {
        throw new BadRequestException("Takım lideri yalnızca emlakçı rolündeki kullanıcılardan seçilebilir.");
      }
    }

    const activeTeamsCount = await this.prisma.team.count({
      where: { officeId, isActive: true },
    });
    const maxTeams = await this.getMaxTeamsForOffice(officeId);
    if (activeTeamsCount >= maxTeams) {
      throw new BadRequestException(
        `Mevcut ofis paketinizde en fazla ${maxTeams} takım oluşturabilirsiniz.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { officeId, name, leaderId, isActive: true },
      });

      if (leaderId) {
        await this.addCapability(leaderId, Capability.TEAM_LEADER, actorId, tx);
        await this.addOrMoveMemberToTeam(team.id, leaderId, officeId, tx);
      }

      return team;
    });
  }

  async updateTeam(
    id: string,
    body: { name?: string; isActive?: boolean },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);

    const team = await this.prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!team) throw new NotFoundException("Takım bulunamadı.");

    const nextName =
      body.name !== undefined ? this.cleanText(body.name) : team.name;
    if (!nextName) throw new BadRequestException("Takım adı zorunludur.");

    return this.prisma.team.update({
      where: { id },
      data: {
        name: nextName,
        ...(body.isActive !== undefined
          ? { isActive: Boolean(body.isActive) }
          : {}),
      },
    });
  }

  async deactivateTeam(id: string, actor?: OrganizationActor) {
    this.ensureSuperAdminActor(actor);
    const actorId = this.getActorId(actor);
    const team = await this.prisma.team.findUnique({ where: { id }, select: { id: true, name: true, officeId: true, isActive: true } });
    if (!team) throw new NotFoundException("Takım bulunamadı.");

    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.updateMany({ where: { teamId: id, isActive: true }, data: { isActive: false, leftAt: new Date() } });
      const updated = await tx.team.update({ where: { id }, data: { isActive: false } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: AuditAction.SYSTEM_SECURITY_ACTION,
          entityType: "Team",
          entityId: id,
          description: `Takım pasifleştirildi: ${team.name}`,
          metadata: { operation: "TEAM_DEACTIVATED", officeId: team.officeId, previousIsActive: team.isActive, newIsActive: false },
          ipAddress: actor?.ipAddress,
          userAgent: actor?.userAgent,
        },
      });
      return { ok: true, deactivated: true, team: updated };
    });
  }

  async setTeamLeader(
    teamId: string,
    leaderId: string | null,
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, officeId: true, leaderId: true, isActive: true },
    });

    if (!team || !team.isActive)
      throw new NotFoundException("Aktif takım bulunamadı.");
    if (leaderId) {
      const leader = await this.getUserOrThrow(leaderId);
      if (leader.role !== Role.EMLAKCI) {
        throw new BadRequestException("Takım lideri yalnızca emlakçı rolündeki kullanıcılardan seçilebilir.");
      }
    }

    const previousLeaderId = team.leaderId;

    return this.prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: { leaderId },
      });

      if (previousLeaderId && previousLeaderId !== leaderId) {
        await this.removeCapabilityIfNotNeeded(
          previousLeaderId,
          Capability.TEAM_LEADER,
          tx,
        );
      }

      if (leaderId) {
        await this.addCapability(leaderId, Capability.TEAM_LEADER, actorId, tx);
        await this.addOrMoveMemberToTeam(teamId, leaderId, team.officeId, tx);
      }

      return updatedTeam;
    });
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);

    if (!userId) throw new BadRequestException("Kullanıcı seçimi zorunludur.");
    const user = await this.getUserOrThrow(userId);
    if (user.role !== Role.EMLAKCI) {
      throw new BadRequestException("Takım ve ofis üyeliğine yalnızca emlakçı rolündeki kullanıcılar atanabilir.");
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        officeId: true,
        isActive: true,
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });

    if (!team || !team.isActive)
      throw new NotFoundException("Aktif takım bulunamadı.");

    const maxAdvisors = await readLimit(this.prisma, "LIMIT_TAKIM_DANISMAN");
    if (team._count.members >= maxAdvisors) {
      throw new BadRequestException(
        `Bir takımda en fazla ${maxAdvisors} aktif danışman olabilir.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.addOrMoveMemberToTeam(teamId, userId, team.officeId, tx);
    });

    return { success: true, message: "Takım üyesi güncellendi." };
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: {
        id: true,
        isActive: true,
        team: { select: { id: true, leaderId: true } },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException("Aktif takım üyeliği bulunamadı.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId } },
        data: { isActive: false, leftAt: new Date() },
      });

      if (membership.team.leaderId === userId) {
        await tx.team.update({
          where: { id: teamId },
          data: { leaderId: null },
        });
        await this.removeCapabilityIfNotNeeded(
          userId,
          Capability.TEAM_LEADER,
          tx,
        );
      }

      return { success: true, message: "Kullanıcı takımdan çıkarıldı." };
    });
  }
}
