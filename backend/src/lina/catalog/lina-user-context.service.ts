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

    const membership =
      await this.prisma.kullaniciUyelikPaketi.findFirst({
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
      });

    const packageInfo = membership
      ? await this.prisma.uyelikPaketi.findUnique({
          where: {
            id: membership.paketId,
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

    const now = new Date();

    const membershipStarted =
      Boolean(membership) &&
      membership!.baslangicTarihi.getTime() <=
        now.getTime();

    const membershipNotExpired =
      Boolean(membership) &&
      (
        membership!.bitisTarihi === null ||
        membership!.bitisTarihi.getTime() >
          now.getTime()
      );

    const membershipActive = Boolean(
      membership &&
        membership.durum ===
          UyelikDurumu.AKTIF &&
        membershipStarted &&
        membershipNotExpired &&
        packageInfo?.aktifMi === true,
    );

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

    const authoritativeRole =
      user.role as Role;

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
      packageName:
        packageInfo?.paketAdi || null,
      membershipActive,
      metadata: {
        email: user.email,
        displayName,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        city: user.city,
        district: user.district,
        packageCode:
          packageInfo?.paketKodu
            ? String(
                packageInfo.paketKodu,
              )
            : null,
        membershipStatus:
          membership?.durum || null,
        membershipStartsAt:
          membership?.baslangicTarihi.toISOString() ||
          null,
        membershipEndsAt:
          membership?.bitisTarihi?.toISOString() ||
          null,
        pilotPackage:
          membership?.pilotPaketMi || false,
        testPackage:
          membership?.testPaketiMi || false,
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
                item.joinedAt.toISOString(),
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
}
