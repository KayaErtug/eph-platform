import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { UnitType } from "@prisma/client";

import { PropertyCardProfileService } from "../property-card/property-card-profile.service";

import { EphLocationCatalogService, EphResolvedLocation } from "./catalog/eph-location-catalog.service";
import { LinaOpenAiClientService } from "./openai-tools/lina-openai-client.service";
import { LinaOpenAiResponse } from "./openai-tools/lina-openai-response.types";

const CATEGORIES = [
  "PORTFOY_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM", "BOLGESEL_SATIS_OFISI_ARIYORUM",
  "IS_ORTAGI_ARIYORUM", "YATIRIMCI_ARIYORUM", "SEKTOREL_IHTIYACLAR", "DUYURU_KAMPANYA", "DIGER",
] as const;
const REQUEST_INTENTS = [
  "PORTFOY_SATILIK", "PORTFOY_KIRALIK", "ARSA_KONUT_PROJESI", "ARSA_TICARI_PROJE",
  "ARSA_KARMA_PROJE", "ARSA_KENTSEL_DONUSUM", "SATIS_OFISI_PROJE",
  "SATIS_OFISI_BOLGESEL_PARTNER", "SATIS_OFISI_TEK_YETKILI", "SATIS_OFISI_BAYILIK_TEMSILCILIK",
  "IS_ORTAGI_PORTFOY", "IS_ORTAGI_PROJE", "IS_ORTAGI_COZUM", "IS_ORTAGI_YUKLENICI_TASERON",
  "YATIRIMCI_ARSA", "YATIRIMCI_PROJE", "YATIRIMCI_FINANSMAN", "YATIRIMCI_KURUMSAL",
  "HIZMET_EKSPERTIZ", "HIZMET_TAPU_HUKUK", "HIZMET_FOTOGRAF_DRONE",
  "HIZMET_MIMARLIK_MUHENDISLIK", "HIZMET_REKLAM_PAZARLAMA", "HIZMET_DIGER",
  "DUYURU_GENEL", "DUYURU_ETKINLIK_EGITIM", "DUYURU_PLATFORM", "DUYURU_BOLGESEL",
  "KAMPANYA_LANSMAN", "KAMPANYA_SATIS", "KAMPANYA_FIYAT_GUNCELLEME",
  "KAMPANYA_ETKINLIK_TANITIM", "DIGER_GENEL_TALEP", "DIGER_BILGI_DESTEK", "DIGER_LISTE_DISI",
] as const;
const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;
const URGENCIES = ["Normal", "Acil", "Müşteri Hazır", "Sıcak Talep"] as const;

type JsonRecord = Record<string, unknown>;

@Injectable()
export class LinaNetworkRequestDraftService {
  constructor(
    private readonly openAiClient: LinaOpenAiClientService,
    private readonly locationCatalog: EphLocationCatalogService,
    private readonly propertyCardProfileService: PropertyCardProfileService,
  ) {}

  async create(message?: string) {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (text.length < 8 || text.length > 1500) {
      throw new BadRequestException("Talebinizi 8-1500 karakter arasında yazın.");
    }

    const response = await this.openAiClient.createResponse({
      instructions: [
        "Sen EPH Talep Merkezi için yalnız form taslağı çıkaran Lina'sın.",
        "Kayıt, yayın, güncelleme veya başka bir işlem yapma. Yalnız geçerli JSON nesnesi döndür.",
        `category: ${CATEGORIES.join(",")}`,
        `requestIntent: ${REQUEST_INTENTS.join(",")}`,
        `propertyType: ${Object.values(UnitType).join(",")}`,
        `currency: ${CURRENCIES.join(",")}; urgency: ${URGENCIES.join(",")}`,
        "Alanlar: category,requestIntent,propertyType,roomCounts,profileCriteria,minArea,city,areas,maxBudget,currency,urgency,confidence,warnings.",
        "Bilinmeyen tekil alanı null, diziyi [], profileCriteria'yı {} yap. areas dizisi {city,district,neighborhood} nesnelerinden oluşsun.",
        "Sayılar yalnız sayı olsun. Metinden olmayan bilgi uydurma. confidence 0-1 arasında olsun.",
        "Birden fazla mahalle varsa her birini areas içinde ayrı yaz; tüm yanıtı tamamla. Kullanıcının farklı cümlelerdeki bütçe ve kriterleri aynı talebe aittir.",
      ].join("\n"),
      input: [{ role: "user", content: text }],
      tools: [],
      toolChoice: "none",
      maxOutputTokens: 1800,
    }).catch(() => {
      throw new ServiceUnavailableException({
        code: 'LINA_REQUEST_DRAFT_UNAVAILABLE',
        message: 'Lina şu anda talep taslağını hazırlayamıyor. Lütfen kısa süre sonra tekrar deneyin.',
      });
    });

    const raw = this.parseJson(this.extractText(response));
    const roomCounts = [
      ...(Array.isArray(raw.roomCounts) ? raw.roomCounts.map(String) : []),
      ...(text.match(/\b\d+\s*\+\s*\d+\b/g) || []).map((item) => item.replace(/\s/g, "")),
    ].filter((item) => /^\d+\+\d+$/.test(item));
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 5)
      : [];
    const propertyType = this.pick(raw.propertyType, Object.values(UnitType));
    const profileCriteria = this.resolveProfileCriteria(raw.profileCriteria, propertyType, text);
    const rawCity = this.cleanString(raw.city);
    const rawAreas = this.cleanAreas(raw.areas, rawCity);
    const resolvedLocation = await this.locationCatalog.resolveLocationFromMessage(text).catch(() => null);
    const areaResolution = await this.resolveAreas(rawAreas);
    const city = areaResolution.city || (resolvedLocation?.success ? resolvedLocation.province || "" : rawCity);
    const areas = rawAreas.length
      ? areaResolution.areas
      : resolvedLocation?.success && resolvedLocation.district
        ? [{ city, district: resolvedLocation.district, neighborhood: resolvedLocation.neighborhood || resolvedLocation.village || "" }]
        : [];
    const category = this.pick(raw.category, CATEGORIES);
    const normalizedText = this.normalizeTurkish(text);
    const wantsSale = /\bsatilik\b/.test(normalizedText);
    const wantsRent = /\bkiralik\b/.test(normalizedText);
    const requestIntent = category === "PORTFOY_ARIYORUM"
      ? (wantsSale === wantsRent ? null : wantsSale ? "PORTFOY_SATILIK" : "PORTFOY_KIRALIK")
      : this.pick(raw.requestIntent, REQUEST_INTENTS);
    const title = this.buildTitle(requestIntent, propertyType, roomCounts, areas, city);
    const detail = this.truncateAtWord(text, 200);
    if (areaResolution.unresolved.length) {
      warnings.push(`Konum doğrulanamadı: ${areaResolution.unresolved.join(", ")}.`);
    } else if (!rawAreas.length && resolvedLocation && !resolvedLocation.success && rawCity) {
      warnings.push("Konum EPH kataloğunda kesin doğrulanamadı; yayınlamadan önce kontrol edin.");
    }

    return {
      success: true,
      draft: {
        category,
        requestIntent,
        propertyType,
        roomCounts: [...new Set(roomCounts)].slice(0, 8),
        profileCriteria,
        minArea: this.positiveNumber(raw.minArea),
        city,
        areas,
        maxBudget: this.positiveNumber(raw.maxBudget),
        currency: this.pick(raw.currency, CURRENCIES) || "TRY",
        urgency: this.pick(raw.urgency, URGENCIES) || "Normal",
        title,
        detail,
      },
      confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
      warnings: [...new Set(warnings)].slice(0, 6),
      requiresApproval: true,
    };
  }

  private extractText(response: LinaOpenAiResponse): string {
    if (response.output_text?.trim()) return response.output_text.trim();
    return (response.output || []).flatMap((item) => item.type === "message" && Array.isArray(item.content)
      ? item.content.map((content) => content.type === "output_text" && typeof content.text === "string" ? content.text : "")
      : []).filter(Boolean).join("\n").trim();
  }

  private parseJson(value: string): JsonRecord {
    try {
      const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      return parsed as JsonRecord;
    } catch {
      throw new BadGatewayException({
        code: 'LINA_REQUEST_DRAFT_INVALID_RESPONSE',
        message: 'Lina taslağı tamamlayamadı. Lütfen aynı metinle tekrar deneyin.',
      });
    }
  }

  private pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    const clean = this.cleanString(value);
    return allowed.includes(clean as T) ? clean as T : null;
  }

  private cleanString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private positiveNumber(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
  }

  private cleanAreas(value: unknown, fallbackCity: string) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      const area = item && typeof item === "object" ? item as JsonRecord : {};
      return {
        city: this.cleanString(area.city) || fallbackCity,
        district: this.cleanString(area.district),
        neighborhood: this.cleanString(area.neighborhood),
      };
    }).filter((item) => item.city && (item.district || item.neighborhood)).slice(0, 10);
  }

  private cleanProfileCriteria(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, raw]) => [
      key,
      (Array.isArray(raw) ? raw : [raw]).map(String).map((item) => item.trim()).filter(Boolean).slice(0, 8),
    ]).filter(([, values]) => (values as string[]).length > 0));
  }

  private resolveProfileCriteria(
    value: unknown,
    propertyType: UnitType | null,
    text: string,
  ): Record<string, string[]> {
    const criteria = this.cleanProfileCriteria(value);

    // Mevcut deterministik Daire çıkarımları korunur.
    if (propertyType === UnitType.DAIRE) {
      const normalized = this.normalizeTurkish(text);

      const floorMatch = normalized.match(/\b(\d{1,2})\s*\.?\s*kat(?:ta|te|da|de)?\b/);
      if (floorMatch) {
        const floorNumber = Number(floorMatch[1]);
        if (floorNumber >= 1 && floorNumber <= 15) {
          criteria.floor = [`${floorNumber}. Kat`];
          delete criteria.floorLabel;
        }
      }

      if (/\basansor(?:lu)?\b/.test(normalized)) {
        criteria.elevatorStatus = [
          /\b(yok|olmasin|istemiyorum)\b/.test(normalized) ? "Yok" : "Var",
        ];
        delete criteria.elevator;
      }

      if (/\bdogalgaz\s+kombi(?:li)?\b/.test(normalized)) {
        criteria.heatingType = ["Doğalgaz Kombi"];
      }

      if (
        /\bbina\s+yasi\s+5\s*-\s*10(?:\s*yil)?\b/.test(normalized) ||
        /\b5\s*-\s*10\s+yas(?:i)?(?:\s+arasi)?\b/.test(normalized)
      ) {
        criteria.buildingAge = ["5", "6", "7", "8", "9", "10"];
      }

      if (/\bguney\s+cephe(?:li)?\b/.test(normalized)) {
        criteria.facade = ["Güney"];
      }

      if (/\botopark(?:li)?\b|\bkapali\s+garaj\b/.test(normalized)) {
        const parkingType =
          /otopark\s+(yok|olmasin)|otopark\s+istemiyorum/.test(normalized)
            ? "Yok"
            : /acik\s*\+\s*kapali|acik\s+ve\s+kapali/.test(normalized)
              ? "Açık + Kapalı"
              : /kapali\s+(otopark|garaj)/.test(normalized)
                ? "Kapalı Otopark"
                : /acik\s+otopark/.test(normalized)
                  ? "Açık Otopark"
                  : /arac\s+park\s+yeri/.test(normalized)
                    ? "Araç Park Yeri"
                    : "Açık Otopark";

        criteria.parkingType = [parkingType];
      }
    }

    if (!propertyType) return criteria;

    let profile: ReturnType<PropertyCardProfileService['getProfile']>['profile'];
    try {
      profile = this.propertyCardProfileService.getProfile(propertyType).profile;
    } catch {
      return {};
    }

    const canonical: Record<string, string[]> = {};

    for (const slot of profile.slots) {
      const sourceKeys = Array.from(
        new Set([
          slot.key,
          ...(Array.isArray(slot.sourceKeys) ? slot.sourceKeys : []),
        ]),
      );

      const values = sourceKeys
        .flatMap((key) => criteria[key] || [])
        .map((item) => String(item).trim())
        .filter(Boolean);

      const uniqueValues = Array.from(new Set(values)).slice(0, 8);

      if (uniqueValues.length) {
        canonical[slot.key] = uniqueValues;
      }
    }

    return canonical;
  }

  private async resolveAreas(rawAreas: Array<{ city: string; district: string; neighborhood: string }>) {
    if (!rawAreas.length) return { city: "", areas: rawAreas, unresolved: [] as string[] };

    const resolutions = await Promise.all(rawAreas.map((area) =>
      this.locationCatalog.resolveLocationFromMessage(
        [area.city, area.district, area.neighborhood].filter(Boolean).join(" "),
      ).catch(() => null),
    ));
    const unresolved: string[] = [];
    const areas = rawAreas.map((area, index) => {
      const resolved = resolutions[index] as EphResolvedLocation | null;
      const completeCanonicalShape = Boolean(area.city && area.district && area.neighborhood);
      const fullyResolved = Boolean(
        resolved?.success && resolved.province &&
        (!area.district || resolved.district) &&
        (!area.neighborhood || resolved.neighborhood || resolved.village),
      );
      const catalogUnavailable = resolved?.source === "NONE" && completeCanonicalShape;
      if (!fullyResolved && !catalogUnavailable) {
        unresolved.push([area.district, area.neighborhood].filter(Boolean).join(" / ") || area.city);
        return area;
      }
      if (!fullyResolved) return area;
      return {
        city: resolved?.province || area.city,
        district: resolved?.district || area.district,
        neighborhood: resolved?.neighborhood || resolved?.village || area.neighborhood,
      };
    });
    return {
      city: areas.find((area, index) => resolutions[index]?.success)?.city || rawAreas[0].city,
      areas,
      unresolved,
    };
  }

  private normalizeTurkish(value: string): string {
    return value.toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i").replaceAll("ç", "c").replaceAll("ğ", "g")
      .replaceAll("ö", "o").replaceAll("ş", "s").replaceAll("ü", "u");
  }

  private buildTitle(
    requestIntent: typeof REQUEST_INTENTS[number] | null,
    propertyType: UnitType | null,
    roomCounts: string[],
    areas: Array<{ city: string; district: string; neighborhood: string }>,
    city: string,
  ): string {
    const location = areas[0]?.district || city;
    const rooms = [...new Set(roomCounts)].slice(0, 2).join(" / ");
    const intent = requestIntent === "PORTFOY_SATILIK"
      ? "Satılık"
      : requestIntent === "PORTFOY_KIRALIK"
        ? "Kiralık"
        : "Talep";
    const property = propertyType
      ? String(propertyType).toLowerCase().split("_")
        .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1)).join(" ")
      : "Gayrimenkul";
    return this.truncateAtWord([location, rooms, intent, property].filter(Boolean).join(" "), 50);
  }

  private truncateAtWord(value: string, maxLength: number): string {
    const clean = String(value || "").replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    const shortened = clean.slice(0, maxLength + 1).replace(/\s+\S*$/, "").trim();
    return (shortened || clean.slice(0, maxLength)).slice(0, maxLength).trim();
  }
}
