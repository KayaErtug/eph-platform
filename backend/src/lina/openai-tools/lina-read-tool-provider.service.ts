import {
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import {
  EphLocationCatalogService,
  EphLocationCountry,
} from "../catalog/eph-location-catalog.service";
import { LinaToolRegistryService } from "./lina-tool-registry.service";
import {
  LinaToolContext,
  LinaToolDefinition,
  LinaToolJsonSchema,
} from "./lina-tool.types";

const ALL_EPH_ROLES: Role[] = [
  Role.EMLAKCI,
  Role.MUTEAHHIT,
  Role.INSAAT_FIRMASI,
  Role.ADMIN,
  Role.SUPER_ADMIN,
  Role.MODERATOR,
];

const NO_INPUT_SCHEMA:
  LinaToolJsonSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

@Injectable()
export class LinaReadToolProviderService
  implements OnModuleInit
{
  constructor(
    private readonly registryService:
      LinaToolRegistryService,
    private readonly locationCatalogService:
      EphLocationCatalogService,
  ) {}

  onModuleInit(): void {
    this.registryService.registerMany([
      {
        definition:
          this.getContextDefinition(),
        handler: async (
          _input,
          context,
        ) => ({
          success: true,
          message:
            "Doğrulanmış EPH kullanıcı bağlamı getirildi.",
          data:
            this.buildSafeUserContext(
              context,
            ),
        }),
      },
      {
        definition:
          this.getLocationSummaryDefinition(),
        handler: async () => ({
          success: true,
          message:
            "EPH konum kataloğu özeti getirildi.",
          data:
            this.locationCatalogService
              .getSummary(),
        }),
      },
      {
        definition:
          this.getRegionListDefinition(),
        handler: async (input) => {
          const country = String(
            input.country || "",
          )
            .trim()
            .toUpperCase();

          if (
            country !== "TR" &&
            country !== "KKTC"
          ) {
            return {
              success: false,
              message:
                "Ülke kodu TR veya KKTC olmalıdır.",
            };
          }

          const typedCountry =
            country as EphLocationCountry;

          const regions =
            this.locationCatalogService
              .listRegions(
                typedCountry,
              );

          const summary =
            this.locationCatalogService
              .getSummary();

          return {
            success: true,
            message:
              typedCountry === "KKTC"
                ? "Doğrulanmış 6 KKTC ilçesi getirildi. Mahalleler bu katalogda doğrulanmamaktadır."
                : "Türkiye'nin 81 ili getirildi.",
            data: {
              country: typedCountry,
              administrativeLevel:
                typedCountry === "KKTC"
                  ? "DISTRICT"
                  : "PROVINCE",
              regions,
              catalogSummary: summary,
            },
          };
        },
      },
      {
        definition:
          this.getResolveLocationDefinition(),
        handler: async (input) => {
          const message = String(
            input.message || "",
          ).trim();

          if (!message) {
            return {
              success: false,
              message:
                "Konum çözümleme metni boş olamaz.",
            };
          }

          const result =
            await this.locationCatalogService
              .resolveLocationFromMessage(
                message,
              );

          return {
            success: true,
            message: result.message,
            data: result,
          };
        },
      },
    ]);
  }

  private getContextDefinition():
    LinaToolDefinition {
    return {
      name: "get_my_eph_context",
      description:
        "Doğrulanmış kullanıcının EPH rolünü, aktif üyelik durumunu, paket kodunu, çalışma modülünü ve güvenli ofis/takım kimliklerini getirir. E-posta, telefon, veritabanı kullanıcı kimliği veya gizli veri döndürmez.",
      family: "context",
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: NO_INPUT_SCHEMA,
    };
  }

  private getLocationSummaryDefinition():
    LinaToolDefinition {
    return {
      name:
        "get_eph_location_catalog_summary",
      description:
        "EPH konum kataloğunun desteklediği ülkeleri, Türkiye il sayısını, KKTC ilçe sayısını ve doğrulanabilen idari seviyeleri getirir.",
      family: "location",
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: NO_INPUT_SCHEMA,
    };
  }

  private getRegionListDefinition():
    LinaToolDefinition {
    return {
      name: "list_eph_regions",
      description:
        "TR için Türkiye'nin 81 ilini, KKTC için EPH kataloğunda doğrulanmış 6 ilçeyi listeler. KKTC mahallelerini doğrulanmış gibi göstermez.",
      family: "location",
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: {
        type: "object",
        properties: {
          country: {
            type: "string",
            enum: ["TR", "KKTC"],
            description:
              "Konum kataloğu ülke kodu.",
          },
        },
        required: ["country"],
        additionalProperties: false,
      },
    };
  }

  private getResolveLocationDefinition():
    LinaToolDefinition {
    return {
      name: "resolve_eph_location",
      description:
        "Kullanıcının yazdığı konumu EPH kanonik kaynaklarıyla çözümler. Türkiye için Türkiye API, KKTC için yalnız doğrulanmış ilçe kataloğu kullanılır. Belirsizlikte tahmin üretmez ve alternatifleri döndürür.",
      family: "location",
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            minLength: 2,
            maxLength: 500,
            description:
              "Çözümlenecek doğal dil konum ifadesi.",
          },
        },
        required: ["message"],
        additionalProperties: false,
      },
    };
  }

  private buildSafeUserContext(
    context: LinaToolContext,
  ) {
    const metadata =
      this.asRecord(
        context.metadata,
      );

    const office =
      this.asRecord(
        metadata.office,
      );

    return {
      role: context.role,
      sourceModule:
        context.sourceModule,
      membershipActive:
        context.membershipActive ===
        true,
      packageCode:
        context.packageName || null,
      packageDisplayName:
        this.asNullableString(
          metadata.packageDisplayName,
        ),
      membershipAccessCode:
        this.asNullableString(
          metadata.membershipAccessCode,
        ),
      profileLocation: {
        city:
          this.asNullableString(
            metadata.city,
          ),
        district:
          this.asNullableString(
            metadata.district,
          ),
      },
      organization: {
        hasOfficeContext:
          Boolean(context.tenantId),
        officeName:
          this.asNullableString(
            office.name,
          ),
        effectivePersonas:
          this.asStringArray(
            metadata.effectivePersonas,
          ),
      },
      account: {
        isVerified:
          metadata.isVerified === true,
        isApproved:
          metadata.isApproved === true,
      },
    };
  }

  private asRecord(
    value: unknown,
  ): Record<string, unknown> {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value as Record<
        string,
        unknown
      >;
    }

    return {};
  }

  private asNullableString(
    value: unknown,
  ): string | null {
    const text = String(
      value || "",
    ).trim();

    return text || null;
  }

  private asStringArray(
    value: unknown,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map((item) =>
            String(item || "").trim(),
          )
          .filter(Boolean),
      ),
    );
  }
}
