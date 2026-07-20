import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  Role,
  UyelikDurumu,
} from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import {
  LinaToolContext,
  LinaToolSourceModule,
} from "../openai-tools/lina-tool.types";

export type LinaRequestIdentity = {
  id?: string;
  role?: string;
  email?: string;
};

type EffectivePersona =
  | "OFFICE_OWNER"
  | "TEAM_LEADER"
  | "OFFICE_MEMBER"
  | "TEAM_MEMBER";

type MembershipAccessCode =
  | "SYSTEM"
  | "ACTIVE"
  | "NO_MEMBERSHIP"
  | "NOT_STARTED"
  | "EXPIRED"
  | "CANCELLED"
  | "PASSIVE"
  | "PACKAGE_INACTIVE";

@Injectable()
export class LinaUserContextService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async resolve(
    identity: LinaRequestIdentity,
    sourceModule: LinaToolSourceModule,
  ): Promise<LinaToolContext> {
    const userId = String(
      identity?.id || "",
    ).trim();

    if (!userId) {
      throw new UnauthorizedException(
        "Lina kullanıcı kimliği doğrulanamadı.",
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isApproved: true,
          city: true,
          district: true,
          officeId: true,
          office: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              district: true,
              isActive: true,
            },
          },
          ownedOffices: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 10,
          },
          ledTeams: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              officeId: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 10,
          },
          teamMemberships: {
            where: {
              isActive: true,
              leftAt: null,
            },
            select: {
              teamId: true,
              joinedAt: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  officeId: true,
                  leaderId: true,
                  isActive: true,
                },
              },
            },
            orderBy: {
              joinedAt: "desc",
            },
            take: 10,
          },
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        "Lina kullanıcısı bulunamadı.",
      );
    }

    const now = new Date();

    const [
      activeMembership,
      latestMembership,
    ] = await Promise.all([
      this.prisma.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: user.id,
          durum: UyelikDurumu.AKTIF,
          baslangicTarihi: {
            lte: now,
          },
          OR: [
            {
              bitisTarihi: null,
            },
            {
              bitisTarihi: {
                gte: now,
              },
            },
          ],
        },
        orderBy: [
          {
            baslangicTarihi: "desc",
          },
          {
            olusturulmaTarihi: "desc",
          },
        ],
        select: {
          paketId: true,
          durum: true,
          baslangicTarihi: true,
          bitisTarihi: true,
          pilotPaketMi: true,
          testPaketiMi: true,
        },
      }),
      this.prisma.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: user.id,
        },
        orderBy: [
          {
            baslangicTarihi: "desc",
          },
          {
            olusturulmaTarihi: "desc",
          },
        ],
        select: {
          paketId: true,
          durum: true,
          baslangicTarihi: true,
          bitisTarihi: true,
          pilotPaketMi: true,
          testPaketiMi: true,
        },
      }),
    ]);

    const effectiveMembership =
      activeMembership ||
      latestMembership;

    const packageInfo =
      effectiveMembership
        ? await this.prisma.uyelikPaketi.findUnique({
            where: {
              id: effectiveMembership.paketId,
            },
            select: {
              paketKodu: true,
              paketAdi: true,
              aktifMi: true,
              aktifPortfoyLimiti: true,
              verilenKontor: true,
            },
          })
        : null;

    const authoritativeRole =
      user.role as Role;

    const isSuperAdmin =
      authoritativeRole ===
      Role.SUPER_ADMIN;

    const membershipActive =
      isSuperAdmin ||
      Boolean(
        activeMembership &&
          packageInfo?.aktifMi === true,
      );

    const packageCode =
      isSuperAdmin
        ? "SYSTEM"
        : membershipActive &&
            packageInfo?.paketKodu
          ? String(
              packageInfo.paketKodu,
            )
          : null;

    const packageDisplayName =
      isSuperAdmin
        ? "Yazılım Ekibi"
        : packageInfo?.paketAdi ||
          null;

    const membershipAccessCode =
      this.resolveMembershipAccessCode({
        isSuperAdmin,
        activeMembership:
          Boolean(activeMembership),
        latestMembership,
        packageActive:
          packageInfo?.aktifMi === true,
        now,
      });

    const effectivePersonas:
      EffectivePersona[] = [];

    if (user.ownedOffices.length > 0) {
      effectivePersonas.push(
        "OFFICE_OWNER",
      );
    }

    if (user.ledTeams.length > 0) {
      effectivePersonas.push(
        "TEAM_LEADER",
      );
    }

    if (
      user.office?.isActive &&
      user.officeId
    ) {
      effectivePersonas.push(
        "OFFICE_MEMBER",
      );
    }

    if (
      user.teamMemberships.some(
        (item) => item.team.isActive,
      )
    ) {
      effectivePersonas.push(
        "TEAM_MEMBER",
      );
    }

    const claimedRole = String(
      identity?.role || "",
    )
      .trim()
      .toUpperCase();

    const displayName =
      `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim() || user.email;

    return {
      userId: user.id,
      role: authoritativeRole,
      sourceModule,
      tenantId:
        user.office?.isActive &&
        user.officeId
          ? user.officeId
          : null,
      packageName: packageCode,
      membershipActive,
      metadata: {
        email: user.email,
        displayName,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        city: user.city,
        district: user.district,

        packageCode,
        packageDisplayName,
        packageActive:
          packageInfo?.aktifMi ??
          null,
        activePortfolioLimit:
          packageInfo
            ?.aktifPortfoyLimiti ??
          null,
        packageCredits:
          packageInfo
            ?.verilenKontor ??
          null,

        membershipAccessCode,
        membershipStatus:
          activeMembership?.durum ||
          latestMembership?.durum ||
          null,
        membershipStartsAt:
          effectiveMembership
            ?.baslangicTarihi
            .toISOString() ||
          null,
        membershipEndsAt:
          effectiveMembership
            ?.bitisTarihi
            ?.toISOString() ||
          null,
        pilotPackage:
          effectiveMembership
            ?.pilotPaketMi ||
          false,
        testPackage:
          effectiveMembership
            ?.testPaketiMi ||
          false,

        latestMembershipStatus:
          latestMembership?.durum ||
          null,
        latestMembershipStartsAt:
          latestMembership
            ?.baslangicTarihi
            .toISOString() ||
          null,
        latestMembershipEndsAt:
          latestMembership
            ?.bitisTarihi
            ?.toISOString() ||
          null,

        office:
          user.office?.isActive
            ? user.office
            : null,
        ownedOffices:
          user.ownedOffices,
        ledTeams:
          user.ledTeams,
        teamMemberships:
          user.teamMemberships
            .filter(
              (item) =>
                item.team.isActive,
            )
            .map((item) => ({
              teamId: item.teamId,
              joinedAt:
                item.joinedAt
                  .toISOString(),
              team: item.team,
            })),

        effectivePersonas,
        claimedRole:
          claimedRole || null,
        authoritativeRole,
        jwtRoleMismatch: Boolean(
          claimedRole &&
            claimedRole !==
              authoritativeRole,
        ),
      },
    };
  }

  private resolveMembershipAccessCode(
    input: {
      isSuperAdmin: boolean;
      activeMembership: boolean;
      latestMembership:
        | {
            durum: UyelikDurumu;
            baslangicTarihi: Date;
            bitisTarihi: Date | null;
          }
        | null;
      packageActive: boolean;
      now: Date;
    },
  ): MembershipAccessCode {
    if (input.isSuperAdmin) {
      return "SYSTEM";
    }

    if (
      input.activeMembership &&
      input.packageActive
    ) {
      return "ACTIVE";
    }

    if (
      input.activeMembership &&
      !input.packageActive
    ) {
      return "PACKAGE_INACTIVE";
    }

    const latest =
      input.latestMembership;

    if (!latest) {
      return "NO_MEMBERSHIP";
    }

    if (
      latest.durum ===
        UyelikDurumu.AKTIF &&
      latest.baslangicTarihi.getTime() >
        input.now.getTime()
    ) {
      return "NOT_STARTED";
    }

    if (
      latest.durum ===
        UyelikDurumu.SURESI_DOLDU ||
      (
        latest.durum ===
          UyelikDurumu.AKTIF &&
        latest.bitisTarihi !== null &&
        latest.bitisTarihi.getTime() <
          input.now.getTime()
      )
    ) {
      return "EXPIRED";
    }

    if (
      latest.durum ===
      UyelikDurumu.IPTAL
    ) {
      return "CANCELLED";
    }

    return "PASSIVE";
  }
}
