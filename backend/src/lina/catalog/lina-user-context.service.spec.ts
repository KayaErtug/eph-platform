import {
  Role,
  UyelikDurumu,
} from "@prisma/client";
import {
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { LinaUserContextService } from "./lina-user-context.service";

describe("LinaUserContextService", () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    kullaniciUyelikPaketi: {
      findFirst: jest.Mock;
    };
    uyelikPaketi: {
      findUnique: jest.Mock;
    };
  };

  let service: LinaUserContextService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      kullaniciUyelikPaketi: {
        findFirst: jest.fn(),
      },
      uyelikPaketi: {
        findUnique: jest.fn(),
      },
    };

    service =
      new LinaUserContextService(
        prisma as unknown as PrismaService,
      );
  });

  it("uses the database role and real membership context", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      firstName: "Ahmet",
      lastName: "Yılmaz",
      role: Role.EMLAKCI,
      isVerified: true,
      isApproved: true,
      city: "Denizli",
      district: "Merkezefendi",
      officeId: "office-1",
      office: {
        id: "office-1",
        name: "Denizli Ofisi",
        slug: "denizli-ofisi",
        city: "Denizli",
        district: "Merkezefendi",
        isActive: true,
      },
      ownedOffices: [
        {
          id: "office-1",
          name: "Denizli Ofisi",
          slug: "denizli-ofisi",
        },
      ],
      ledTeams: [
        {
          id: "team-1",
          name: "Satış Takımı",
          officeId: "office-1",
        },
      ],
      teamMemberships: [
        {
          teamId: "team-1",
          joinedAt:
            new Date("2026-01-01T00:00:00Z"),
          team: {
            id: "team-1",
            name: "Satış Takımı",
            officeId: "office-1",
            leaderId: "user-1",
            isActive: true,
          },
        },
      ],
    });

    prisma.kullaniciUyelikPaketi
      .findFirst
      .mockResolvedValue({
        paketId: "package-1",
        durum: UyelikDurumu.AKTIF,
        baslangicTarihi:
          new Date("2026-01-01T00:00:00Z"),
        bitisTarihi:
          new Date("2030-01-01T00:00:00Z"),
        pilotPaketMi: false,
        testPaketiMi: false,
      });

    prisma.uyelikPaketi.findUnique
      .mockResolvedValue({
        paketKodu: "GOLD",
        paketAdi: "Gold",
        aktifMi: true,
        aktifPortfoyLimiti: 250,
        verilenKontor: 500,
      });

    const result = await service.resolve(
      {
        id: "user-1",
        role: "ADMIN",
        email: "user@example.com",
      },
      "crm",
    );

    expect(result.role).toBe(
      Role.EMLAKCI,
    );

    expect(result.tenantId).toBe(
      "office-1",
    );

    expect(result.packageName).toBe(
      "Gold",
    );

    expect(
      result.membershipActive,
    ).toBe(true);

    expect(result.metadata).toEqual(
      expect.objectContaining({
        packageCode: "GOLD",
        jwtRoleMismatch: true,
        authoritativeRole:
          Role.EMLAKCI,
        effectivePersonas: [
          "OFFICE_OWNER",
          "TEAM_LEADER",
          "OFFICE_MEMBER",
          "TEAM_MEMBER",
        ],
      }),
    );
  });

  it("does not mark an expired membership as active", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "builder@example.com",
      firstName: "Ayşe",
      lastName: "Kaya",
      role: Role.MUTEAHHIT,
      isVerified: true,
      isApproved: true,
      city: "İzmir",
      district: "Bornova",
      officeId: null,
      office: null,
      ownedOffices: [],
      ledTeams: [],
      teamMemberships: [],
    });

    prisma.kullaniciUyelikPaketi
      .findFirst
      .mockResolvedValue({
        paketId: "package-2",
        durum: UyelikDurumu.AKTIF,
        baslangicTarihi:
          new Date("2025-01-01T00:00:00Z"),
        bitisTarihi:
          new Date("2025-02-01T00:00:00Z"),
        pilotPaketMi: false,
        testPaketiMi: false,
      });

    prisma.uyelikPaketi.findUnique
      .mockResolvedValue({
        paketKodu: "DENEME",
        paketAdi: "Deneme",
        aktifMi: true,
        aktifPortfoyLimiti: 50,
        verilenKontor: 100,
      });

    const result = await service.resolve(
      {
        id: "user-2",
        role: "MUTEAHHIT",
      },
      "projects",
    );

    expect(
      result.membershipActive,
    ).toBe(false);

    expect(result.tenantId).toBeNull();
  });

  it("rejects missing or unknown users", async () => {
    await expect(
      service.resolve(
        {},
        "general",
      ),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.user.findUnique
      .mockResolvedValue(null);

    await expect(
      service.resolve(
        {
          id: "missing-user",
        },
        "general",
      ),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
