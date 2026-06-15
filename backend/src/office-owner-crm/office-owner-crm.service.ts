import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Capability, KontorHareketTuru, PortfolioApprovalStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type OfficeOwnerActor = {
  id?: string;
  role?: Role | string;
  email?: string;
};

@Injectable()
export class OfficeOwnerCrmService {
  constructor(private readonly prisma: PrismaService) {}

  private getActorId(actor?: OfficeOwnerActor): string {
    const actorId = actor?.id;

    if (!actorId) {
      throw new ForbiddenException('Kullanıcı kimliği doğrulanamadı.');
    }

    return actorId;
  }

  private getActorRole(actor?: OfficeOwnerActor): Role | string | undefined {
    return actor?.role;
  }

  private calculatePerformanceScore(params: {
    advisorCount: number;
    teamCount: number;
    portfolioCount: number;
    authorizedPortfolioCount: number;
    poolPortfolioCount: number;
  }) {
    const advisorScore = Math.min(20, Math.round((params.advisorCount / 40) * 20));
    const teamScore = Math.min(15, Math.round((params.teamCount / 6) * 15));
    const portfolioScore = Math.min(25, Math.round((params.portfolioCount / 200) * 25));
    const authorizedScore = Math.min(25, Math.round((params.authorizedPortfolioCount / 120) * 25));
    const poolScore = Math.min(15, Math.round((params.poolPortfolioCount / 80) * 15));

    return Math.max(0, Math.min(100, advisorScore + teamScore + portfolioScore + authorizedScore + poolScore));
  }

  private async findManagedOffice(actor: OfficeOwnerActor) {
    const actorId = this.getActorId(actor);
    const role = this.getActorRole(actor);

    const directOffice = await this.prisma.office.findFirst({
      where: {
        ownerUserId: actorId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
        district: true,
        ownerUserId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (directOffice) return directOffice;

    const capability = await this.prisma.userCapability.findUnique({
      where: {
        userId_capability: {
          userId: actorId,
          capability: Capability.OFFICE_OWNER,
        },
      },
      select: { id: true },
    });

    if (capability) {
      const user = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: {
          office: {
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
              ownerUserId: true,
              isActive: true,
            },
          },
        },
      });

      if (user?.office?.isActive) {
        return {
          id: user.office.id,
          name: user.office.name,
          city: user.office.city,
          district: user.office.district,
          ownerUserId: user.office.ownerUserId,
        };
      }
    }

    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
      const fallbackOffice = await this.prisma.office.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
          ownerUserId: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (fallbackOffice) return fallbackOffice;
    }

    throw new NotFoundException('Aktif ofis sahipliği bulunamadı.');
  }

  async getDashboard(actor: OfficeOwnerActor) {
    const office = await this.findManagedOffice(actor);

    const [officeUsers, teams] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          officeId: office.id,
          role: {
            in: [Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI],
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          capabilities: { select: { capability: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.team.findMany({
        where: {
          officeId: office.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          leaderId: true,
          leader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const userIds = officeUsers.map((item) => item.id);
    const activeUserIds = userIds.length ? userIds : ['__empty__'];

    const [
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
      unauthorizedPortfolioCount,
      kontorUsage,
    ] = await Promise.all([
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
          approvalStatus: {
            in: [PortfolioApprovalStatus.ONAYLANDI, PortfolioApprovalStatus.HAVUZDA],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
          isPoolVisible: true,
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
          images: {
            none: {},
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
          authorityDocuments: {
            none: {},
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
            OR: [{ latitude: null }, { longitude: null }],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: { in: activeUserIds },
          },
          approvalStatus: {
            notIn: [PortfolioApprovalStatus.ONAYLANDI, PortfolioApprovalStatus.HAVUZDA],
          },
        },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: {
          kullaniciId: { in: activeUserIds },
          hareketTuru: KontorHareketTuru.HARCAMA,
        },
        _sum: {
          miktar: true,
        },
      }),
    ]);

    const teamSummaries = await Promise.all(
      teams.map(async (team) => {
        const teamUserIds = team.members.map((member) => member.userId);
        const safeTeamUserIds = teamUserIds.length ? teamUserIds : ['__empty__'];

        const [teamPortfolioCount, teamAuthorizedCount, teamPoolCount] = await Promise.all([
          this.prisma.unit.count({
            where: {
              project: {
                ownerId: { in: safeTeamUserIds },
              },
            },
          }),
          this.prisma.unit.count({
            where: {
              project: {
                ownerId: { in: safeTeamUserIds },
              },
              approvalStatus: {
                in: [PortfolioApprovalStatus.ONAYLANDI, PortfolioApprovalStatus.HAVUZDA],
              },
            },
          }),
          this.prisma.unit.count({
            where: {
              project: {
                ownerId: { in: safeTeamUserIds },
              },
              isPoolVisible: true,
            },
          }),
        ]);

        const performanceScore = this.calculatePerformanceScore({
          advisorCount: team.members.length,
          teamCount: 1,
          portfolioCount: teamPortfolioCount,
          authorizedPortfolioCount: teamAuthorizedCount,
          poolPortfolioCount: teamPoolCount,
        });

        return {
          id: team.id,
          name: team.name,
          leader: team.leader,
          memberCount: team.members.length,
          portfolioCount: teamPortfolioCount,
          authorizedPortfolioCount: teamAuthorizedCount,
          poolPortfolioCount: teamPoolCount,
          performanceScore,
        };
      }),
    );

    const teamLeaderCount = teams.filter((team) => Boolean(team.leaderId)).length;
    const performanceScore = this.calculatePerformanceScore({
      advisorCount: officeUsers.length,
      teamCount: teams.length,
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
    });

    return {
      office,
      summary: {
        teamCount: teams.length,
        teamLeaderCount,
        advisorCount: officeUsers.length,
        portfolioCount,
        authorizedPortfolioCount,
        poolPortfolioCount,
        kontorUsage: Math.abs(kontorUsage._sum.miktar || 0),
        performanceScore,
      },
      qualityCenter: {
        missingPhotoCount,
        missingDocumentCount,
        missingLocationCount,
        unauthorizedPortfolioCount,
      },
      teams: teamSummaries,
      advisors: officeUsers.map((advisor) => {
        const isTeamLeader = advisor.capabilities.some((item) => item.capability === Capability.TEAM_LEADER);

        return {
          id: advisor.id,
          firstName: advisor.firstName,
          lastName: advisor.lastName,
          email: advisor.email,
          role: advisor.role,
          isTeamLeader,
        };
      }),
    };
  }
}
