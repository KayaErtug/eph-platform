import {
  Injectable,
} from "@nestjs/common";
import {
  existsSync,
  readFileSync,
} from "fs";
import { resolve } from "path";

import {
  LinaDistanceRequestDto,
} from "../geo/lina-distance.dto";
import {
  LinaDistanceService,
} from "../geo/lina-distance.service";
import {
  LinaGeoResolvedLocation,
  LinaGeoService,
} from "../geo/lina-geo.service";

type EphLocationCatalogFile = {
  turkiye: string[];
  kktc: string[];
};

export type EphLocationCountry =
  | "TR"
  | "KKTC";

export type EphLocationVerificationLevel =
  | "PROVINCE"
  | "DISTRICT"
  | "NEIGHBORHOOD"
  | "VILLAGE"
  | "NONE";

export type EphResolvedLocation = {
  success: boolean;
  country: EphLocationCountry | null;
  source:
    | "EPH_KKTC_CATALOG"
    | "TURKIYE_API"
    | "NONE";
  confidence:
    | "high"
    | "medium"
    | "low"
    | "none";
  verificationLevel:
    EphLocationVerificationLevel;
  province?: string;
  district?: string;
  neighborhood?: string;
  village?: string;
  matchedText?: string;
  alternatives?: string[];
  message: string;
};

@Injectable()
export class EphLocationCatalogService {
  private readonly catalog =
    this.loadCatalog();

  constructor(
    private readonly geoService:
      LinaGeoService,
    private readonly distanceService:
      LinaDistanceService,
  ) {}

  getSummary() {
    return {
      countries: ["TR", "KKTC"],
      turkiyeProvinceCount:
        this.catalog.turkiye.length,
      kktcDistrictCount:
        this.catalog.kktc.length,
      turkiyeAdministrativeSource:
        "TURKIYE_API",
      kktcAdministrativeLevel:
        "DISTRICT_ONLY",
      kktcNeighborhoodsVerified:
        false,
    };
  }

  listRegions(
    country: EphLocationCountry,
  ): string[] {
    return country === "KKTC"
      ? [...this.catalog.kktc]
      : [...this.catalog.turkiye];
  }

  async resolveLocationFromMessage(
    message: string,
  ): Promise<EphResolvedLocation> {
    const cleanMessage = String(
      message || "",
    ).trim();

    if (!cleanMessage) {
      return this.empty(
        "Konum çözümlemek için mesaj boş.",
      );
    }

    const normalizedMessage =
      this.normalize(cleanMessage);

    const matchedKktcDistricts =
      this.catalog.kktc.filter(
        (district) =>
          normalizedMessage.includes(
            this.normalize(district),
          ),
      );

    if (
      matchedKktcDistricts.length === 1
    ) {
      const district =
        matchedKktcDistricts[0];

      return {
        success: true,
        country: "KKTC",
        source:
          "EPH_KKTC_CATALOG",
        confidence: "high",
        verificationLevel:
          "DISTRICT",
        province: "K.K.T.C.",
        district,
        matchedText: district,
        message:
          "KKTC ilçesi EPH kataloğu üzerinden doğrulandı. Mahalle bilgisi bu katalogda doğrulanmamaktadır.",
      };
    }

    if (
      matchedKktcDistricts.length > 1
    ) {
      return {
        success: false,
        country: "KKTC",
        source:
          "EPH_KKTC_CATALOG",
        confidence: "low",
        verificationLevel: "NONE",
        alternatives:
          matchedKktcDistricts,
        message:
          "Birden fazla KKTC ilçesi eşleşti. Kullanıcıdan hedef ilçe istenmelidir.",
      };
    }

    if (
      this.isExplicitKktc(
        normalizedMessage,
      )
    ) {
      return {
        success: false,
        country: "KKTC",
        source:
          "EPH_KKTC_CATALOG",
        confidence: "none",
        verificationLevel: "NONE",
        alternatives: [
          ...this.catalog.kktc,
        ],
        message:
          "KKTC anlaşıldı ancak ilçe doğrulanamadı. Kullanıcıdan KKTC ilçesi istenmelidir.",
      };
    }

    const resolved =
      await this.geoService
        .resolveLocationFromMessage(
          cleanMessage,
        );

    return this.mapTurkiyeResult(
      resolved,
    );
  }

  calculateDistance(
    input: LinaDistanceRequestDto,
  ) {
    return this.distanceService
      .calculate(input);
  }

  private mapTurkiyeResult(
    location: LinaGeoResolvedLocation,
  ): EphResolvedLocation {
    if (!location.success) {
      return {
        success: false,
        country: null,
        source:
          location.source ===
          "TURKIYE_API"
            ? "TURKIYE_API"
            : "NONE",
        confidence:
          location.confidence,
        verificationLevel: "NONE",
        matchedText:
          location.matchedText,
        alternatives:
          location.alternatives
            ?.map((item) =>
              [
                item.province,
                item.district,
                item.neighborhood ||
                  item.village,
              ]
                .filter(Boolean)
                .join(" / "),
            )
            .filter(Boolean),
        message: location.message,
      };
    }

    const verificationLevel:
      EphLocationVerificationLevel =
      location.matchType ===
      "neighborhood"
        ? "NEIGHBORHOOD"
        : location.matchType ===
            "village"
          ? "VILLAGE"
          : location.matchType ===
              "district"
            ? "DISTRICT"
            : "PROVINCE";

    return {
      success: true,
      country: "TR",
      source: "TURKIYE_API",
      confidence: location.confidence,
      verificationLevel,
      province: location.province,
      district: location.district,
      neighborhood:
        location.neighborhood,
      village: location.village,
      matchedText:
        location.matchedText,
      alternatives:
        location.alternatives
          ?.map((item) =>
            [
              item.province,
              item.district,
              item.neighborhood ||
                item.village,
            ]
              .filter(Boolean)
              .join(" / "),
          )
          .filter(Boolean),
      message: location.message,
    };
  }

  private isExplicitKktc(
    normalizedMessage: string,
  ): boolean {
    const compact =
      normalizedMessage.replace(
        /[^a-z0-9]+/g,
        "",
      );

    return (
      compact.includes("kktc") ||
      normalizedMessage.includes(
        "kuzey kibris",
      )
    );
  }

  private loadCatalog():
    EphLocationCatalogFile {
    const candidates = [
      resolve(
        process.cwd(),
        "src/lina/geo/Lina_Cities_TR_KKTC.json",
      ),
      resolve(
        process.cwd(),
        "backend/src/lina/geo/Lina_Cities_TR_KKTC.json",
      ),
      resolve(
        __dirname,
        "../geo/Lina_Cities_TR_KKTC.json",
      ),
    ];

    const path = candidates.find(
      (candidate) =>
        existsSync(candidate),
    );

    if (!path) {
      throw new Error(
        "EPH_TR_KKTC_LOCATION_CATALOG_NOT_FOUND",
      );
    }

    const parsed = JSON.parse(
      readFileSync(
        path,
        "utf-8",
      ),
    ) as Partial<EphLocationCatalogFile>;

    const turkiye =
      this.normalizeRegionList(
        parsed.turkiye,
      );

    const kktc =
      this.normalizeRegionList(
        parsed.kktc,
      );

    if (
      turkiye.length !== 81 ||
      kktc.length !== 6
    ) {
      throw new Error(
        "EPH_TR_KKTC_LOCATION_CATALOG_INVALID",
      );
    }

    return {
      turkiye,
      kktc,
    };
  }

  private normalizeRegionList(
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

  private normalize(
    value: string,
  ): string {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/\s+/g, " ");
  }

  private empty(
    message: string,
  ): EphResolvedLocation {
    return {
      success: false,
      country: null,
      source: "NONE",
      confidence: "none",
      verificationLevel: "NONE",
      message,
    };
  }
}
