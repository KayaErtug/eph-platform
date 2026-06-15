import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Capability, PortfolioApprovalStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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
      throw new ForbiddenException('Yönetici kimliği doğrulanamadı.');
    }

    return actorId;
  }

  private getActorRole(actor?: OrganizationActor): Role | string {
    const role = actor?.role;

    if (!role) {
      throw new ForbiddenException('Yönetici rolü doğrulanamadı.');
    }

    return role;
  }

  private ensureAdminActor(actor?: OrganizationActor) {
    const role = this.getActorRole(actor);

    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu işlem için yönetici yetkisi gereklidir.');
    }
  }

  private cleanText(value?: string | null) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  private slugify(value: string) {
    const normalized = value
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || `ofis-${Date.now()}`;
  }

  private async generateUniqueOfficeSlug(name: string, currentOfficeId?: string) {
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

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      throw new BadRequestException('Yönetici rolleri ofis/takım organizasyonuna atanamaz.');
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
    await tx.teamMember.updateMany({
      where: {
        userId,
        isActive: true,
        NOT: {
          teamId,
        },
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

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

  async getSummary() {
    const [officeCount, activeOfficeCount, teamCount, activeTeamCount, memberCount] =
      await Promise.all([
        this.prisma.office.count(),
        this.prisma.office.count({ where: { isActive: true } }),
        this.prisma.team.count(),
        this.prisma.team.count({ where: { isActive: true } }),
        this.prisma.teamMember.count({ where: { isActive: true } }),
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
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI],
        },
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
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getOffices() {
    return this.prisma.office.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        teams: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            leaderId: true,
            _count: { select: { members: { where: { isActive: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { users: true, teams: true } },
      },
    });
  }

  async createOffice(
    body: { name?: string; city?: string; district?: string; ownerUserId?: string | null },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);
    const name = this.cleanText(body.name);

    if (!name) throw new BadRequestException('Ofis adı zorunludur.');

    const ownerUserId = body.ownerUserId || null;
    if (ownerUserId) await this.getUserOrThrow(ownerUserId);

    const slug = await this.generateUniqueOfficeSlug(name);

    return this.prisma.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name,
          slug,
          city: this.cleanText(body.city) || null,
          district: this.cleanText(body.district) || null,
          ownerUserId,
          isActive: true,
        },
      });

      if (ownerUserId) {
        await tx.user.update({ where: { id: ownerUserId }, data: { officeId: office.id } });
        await this.addCapability(ownerUserId, Capability.OFFICE_OWNER, actorId, tx);
      }

      return office;
    });
  }

  async updateOffice(
    id: string,
    body: { name?: string; city?: string | null; district?: string | null; ownerUserId?: string | null; isActive?: boolean },
    actor?: OrganizationActor,
  ) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const office = await this.prisma.office.findUnique({
      where: { id },
      select: { id: true, name: true, ownerUserId: true },
    });

    if (!office) throw new NotFoundException('Ofis bulunamadı.');

    const nextName = body.name !== undefined ? this.cleanText(body.name) : office.name;
    if (!nextName) throw new BadRequestException('Ofis adı zorunludur.');

    const nextOwnerUserId = body.ownerUserId === undefined ? office.ownerUserId : body.ownerUserId || null;
    if (nextOwnerUserId) await this.getUserOrThrow(nextOwnerUserId);

    const nextSlug = nextName !== office.name ? await this.generateUniqueOfficeSlug(nextName, office.id) : undefined;
    const previousOwnerUserId = office.ownerUserId;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.office.update({
        where: { id },
        data: {
          name: nextName,
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(body.city !== undefined ? { city: this.cleanText(body.city) || null } : {}),
          ...(body.district !== undefined ? { district: this.cleanText(body.district) || null } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
          ownerUserId: nextOwnerUserId,
        },
      });

      if (previousOwnerUserId && previousOwnerUserId !== nextOwnerUserId) {
        await this.removeCapabilityIfNotNeeded(previousOwnerUserId, Capability.OFFICE_OWNER, tx);
      }

      if (nextOwnerUserId) {
        await tx.user.update({ where: { id: nextOwnerUserId }, data: { officeId: id } });
        await this.addCapability(nextOwnerUserId, Capability.OFFICE_OWNER, actorId, tx);
      }

      return updated;
    });
  }

  async getTeams() {
    return this.prisma.team.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        office: { select: { id: true, name: true, slug: true, city: true, district: true } },
        leader: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
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
          orderBy: { joinedAt: 'asc' },
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
      throw new NotFoundException('Takım bulunamadı.');
    }

    const memberIds = team.members.map((member) => member.userId);
    const memberCount = memberIds.length;

    if (!memberIds.length) {
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
      };
    }

    const [portfolioCount, authorizedPortfolioCount, poolPortfolioCount] = await Promise.all([
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: {
              in: memberIds,
            },
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          approvalStatus: {
            in: [PortfolioApprovalStatus.ONAYLANDI, PortfolioApprovalStatus.HAVUZDA],
          },
          project: {
            ownerId: {
              in: memberIds,
            },
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          isPoolVisible: true,
          project: {
            ownerId: {
              in: memberIds,
            },
          },
        },
      }),
    ]);

    const authorizedScore = portfolioCount
      ? Math.min(authorizedPortfolioCount / portfolioCount, 1) * 40
      : 0;
    const poolScore = portfolioCount ? Math.min(poolPortfolioCount / portfolioCount, 1) * 30 : 0;
    const memberScore = Math.min(memberCount / 10, 1) * 20;
    const activeScore = team.isActive ? 10 : 0;

    const performanceScore = Math.max(
      0,
      Math.min(100, Math.round(authorizedScore + poolScore + memberScore + activeScore)),
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
    };
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

    if (!officeId) throw new BadRequestException('Ofis seçimi zorunludur.');
    if (!name) throw new BadRequestException('Takım adı zorunludur.');

    const office = await this.prisma.office.findUnique({ where: { id: officeId }, select: { id: true, isActive: true } });
    if (!office || !office.isActive) throw new NotFoundException('Aktif ofis bulunamadı.');

    if (leaderId) await this.getUserOrThrow(leaderId);

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { officeId, name, leaderId, isActive: true } });

      if (leaderId) {
        await this.addCapability(leaderId, Capability.TEAM_LEADER, actorId, tx);
        await this.addOrMoveMemberToTeam(team.id, leaderId, officeId, tx);
      }

      return team;
    });
  }

  async updateTeam(id: string, body: { name?: string; isActive?: boolean }, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);

    const team = await this.prisma.team.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const nextName = body.name !== undefined ? this.cleanText(body.name) : team.name;
    if (!nextName) throw new BadRequestException('Takım adı zorunludur.');

    return this.prisma.team.update({
      where: { id },
      data: {
        name: nextName,
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });
  }

  async setTeamLeader(teamId: string, leaderId: string | null, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);
    const actorId = this.getActorId(actor);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, officeId: true, leaderId: true, isActive: true },
    });

    if (!team || !team.isActive) throw new NotFoundException('Aktif takım bulunamadı.');
    if (leaderId) await this.getUserOrThrow(leaderId);

    const previousLeaderId = team.leaderId;

    return this.prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({ where: { id: teamId }, data: { leaderId } });

      if (previousLeaderId && previousLeaderId !== leaderId) {
        await this.removeCapabilityIfNotNeeded(previousLeaderId, Capability.TEAM_LEADER, tx);
      }

      if (leaderId) {
        await this.addCapability(leaderId, Capability.TEAM_LEADER, actorId, tx);
        await this.addOrMoveMemberToTeam(teamId, leaderId, team.officeId, tx);
      }

      return updatedTeam;
    });
  }

  async addTeamMember(teamId: string, userId: string, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);

    if (!userId) throw new BadRequestException('Kullanıcı seçimi zorunludur.');
    await this.getUserOrThrow(userId);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        officeId: true,
        isActive: true,
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });

    if (!team || !team.isActive) throw new NotFoundException('Aktif takım bulunamadı.');

    if (team._count.members >= 10) {
      throw new BadRequestException('Bir takımda en fazla 10 aktif danışman olabilir.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.addOrMoveMemberToTeam(teamId, userId, team.officeId, tx);
    });

    return { success: true, message: 'Takım üyesi güncellendi.' };
  }

  async removeTeamMember(teamId: string, userId: string, actor?: OrganizationActor) {
    this.ensureAdminActor(actor);

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true, isActive: true, team: { select: { id: true, leaderId: true } } },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Aktif takım üyeliği bulunamadı.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId } },
        data: { isActive: false, leftAt: new Date() },
      });

      if (membership.team.leaderId === userId) {
        await tx.team.update({ where: { id: teamId }, data: { leaderId: null } });
        await this.removeCapabilityIfNotNeeded(userId, Capability.TEAM_LEADER, tx);
      }

      return { success: true, message: 'Kullanıcı takımdan çıkarıldı.' };
    });
  }
}
