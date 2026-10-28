import { Role } from "@prisma/client";

import { EphLocationCatalogService } from "../catalog/eph-location-catalog.service";
import { LinaReadToolProviderService } from "./lina-read-tool-provider.service";
import { LinaToolExecutorService } from "./lina-tool-executor.service";
import { LinaToolPolicyService } from "./lina-tool-policy.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import { LinaToolContext } from "./lina-tool.types";

const context: LinaToolContext = {
  userId: "user-secret-id",
  role: Role.EMLAKCI,
  sourceModule: "general",
  tenantId: "office-secret-id",
  packageName: "GOLD",
  membershipActive: true,
  metadata: {
    email:
      "private-user@example.com",
    phone: "+90 555 111 22 33",
    packageDisplayName: "Gold",
    membershipAccessCode:
      "ACTIVE",
    city: "Denizli",
    district: "Merkezefendi",
    isVerified: true,
    isApproved: true,
    office: {
      id: "office-secret-id",
      name: "Denizli Ofisi",
    },
    effectivePersonas: [
      "OFFICE_OWNER",
      "TEAM_LEADER",
    ],
  },
};

describe(
  "LinaReadToolProviderService",
  () => {
    let policy:
      LinaToolPolicyService;

    let registry:
      LinaToolRegistryService;

    let executor:
      LinaToolExecutorService;

    let locationCatalog: {
      getSummary: jest.Mock;
      listRegions: jest.Mock;
      resolveLocationFromMessage:
        jest.Mock;
    };

    beforeEach(() => {
      policy =
        new LinaToolPolicyService();

      registry =
        new LinaToolRegistryService(
          policy,
        );

      executor =
        new LinaToolExecutorService(
          registry,
          policy,
        );

      locationCatalog = {
        getSummary: jest.fn(
          () => ({
            countries: [
              "TR",
              "KKTC",
            ],
            turkiyeProvinceCount: 81,
            kktcDistrictCount: 6,
            turkiyeAdministrativeSource:
              "TURKIYE_API",
            kktcAdministrativeLevel:
              "DISTRICT_ONLY",
            kktcNeighborhoodsVerified:
              false,
          }),
        ),
        listRegions: jest.fn(
          (country: string) =>
            country === "KKTC"
              ? [
                  "Lefkoşa",
                  "Girne",
                  "Gazimağusa",
                  "İskele",
                  "Güzelyurt",
                  "Lefke",
                ]
              : [
                  "Adana",
                  "Adıyaman",
                ],
        ),
        resolveLocationFromMessage:
          jest.fn(),
      };

      const provider =
        new LinaReadToolProviderService(
          registry,
          locationCatalog as unknown as
            EphLocationCatalogService,
        );

      provider.onModuleInit();
    });

    it("registers exactly four safe read tools and no schema tool", () => {
      expect(registry.count()).toBe(4);

      expect(
        registry
          .listOpenAiTools(context)
          .map((tool) => tool.name),
      ).toEqual([
        "get_eph_location_catalog_summary",
        "get_my_eph_context",
        "list_eph_regions",
        "resolve_eph_location",
      ]);

      expect(
        registry
          .listOpenAiTools(context)
          .some((tool) =>
            tool.name.includes(
              "schema",
            ),
          ),
      ).toBe(false);
    });

    it("returns a safe user context without personal or internal identifiers", async () => {
      const result =
        await executor.execute(
          {
            name:
              "get_my_eph_context",
            input: {},
          },
          context,
        );

      expect(result.status).toBe(
        "success",
      );

      expect(result.data).toEqual({
        role: Role.EMLAKCI,
        sourceModule: "general",
        membershipActive: true,
        packageCode: "GOLD",
        packageDisplayName: "Gold",
        membershipAccessCode:
          "ACTIVE",
        profileLocation: {
          city: "Denizli",
          district:
            "Merkezefendi",
        },
        organization: {
          hasOfficeContext: true,
          officeName:
            "Denizli Ofisi",
          effectivePersonas: [
            "OFFICE_OWNER",
            "TEAM_LEADER",
          ],
        },
        account: {
          isVerified: true,
          isApproved: true,
        },
      });

      const serialized =
        JSON.stringify(result.data);

      expect(serialized).not.toContain(
        "private-user@example.com",
      );

      expect(serialized).not.toContain(
        "+90 555 111 22 33",
      );

      expect(serialized).not.toContain(
        "user-secret-id",
      );

      expect(serialized).not.toContain(
        "office-secret-id",
      );
    });

    it("lists only the verified administrative level for KKTC", async () => {
      const result =
        await executor.execute(
          {
            name:
              "list_eph_regions",
            input: {
              country: "KKTC",
            },
          },
          context,
        );

      expect(result.status).toBe(
        "success",
      );

      expect(result.data).toEqual(
        expect.objectContaining({
          country: "KKTC",
          administrativeLevel:
            "DISTRICT",
          regions: [
            "Lefkoşa",
            "Girne",
            "Gazimağusa",
            "İskele",
            "Güzelyurt",
            "Lefke",
          ],
        }),
      );
    });

    it("returns unresolved location data as a valid tool result so OpenAI can ask a clarification", async () => {
      locationCatalog
        .resolveLocationFromMessage
        .mockResolvedValue({
          success: false,
          country: "KKTC",
          source:
            "EPH_KKTC_CATALOG",
          confidence: "none",
          verificationLevel:
            "NONE",
          alternatives: [
            "Lefkoşa",
            "Girne",
            "Gazimağusa",
            "İskele",
            "Güzelyurt",
            "Lefke",
          ],
          message:
            "KKTC anlaşıldı ancak ilçe doğrulanamadı.",
        });

      const result =
        await executor.execute(
          {
            name:
              "resolve_eph_location",
            input: {
              message:
                "KKTC'de yatırım yapmak istiyorum.",
            },
          },
          context,
        );

      expect(result.status).toBe(
        "success",
      );

      expect(result.success).toBe(
        true,
      );

      expect(result.data).toEqual(
        expect.objectContaining({
          success: false,
          country: "KKTC",
          verificationLevel:
            "NONE",
        }),
      );
    });

    it("keeps all four tools at risk level zero without confirmation", async () => {
      for (
        const definition of
        registry.listDefinitions(
          context,
        )
      ) {
        expect(
          definition.riskLevel,
        ).toBe(0);

        expect(
          policy.requiresConfirmation(
            definition,
          ),
        ).toBe(false);
      }
    });
  },
);
