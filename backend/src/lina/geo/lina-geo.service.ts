import { Injectable } from "@nestjs/common";

type TurkiyeApiRecord = Record<string, unknown>;

export type LinaGeoResolvedLocation = {
  success: boolean;
  source: "TURKIYE_API" | "NONE";
  confidence: "high" | "medium" | "low" | "none";
  province?: string;
  district?: string;
  neighborhood?: string;
  village?: string;
  matchedText?: string;
  matchType?: "neighborhood" | "village" | "district" | "province";
  alternatives?: Array<{
    province?: string;
    district?: string;
    neighborhood?: string;
    village?: string;
    matchType?: string;
  }>;
  message: string;
};

@Injectable()
export class LinaGeoService {
  private readonly apiBases = [
    "https://turkiyeapi.dev/api/v1",
    "https://turkiyeapi.dev/v1",
  ];

  async resolveLocationFromMessage(message: string): Promise<LinaGeoResolvedLocation> {
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return this.empty("Konum çözümlemek için mesaj boş.");
    }

    const candidates = this.extractCandidates(cleanMessage);

    for (const candidate of candidates) {
      const neighborhoodResult = await this.searchAdministrativeUnit(
        "neighborhoods",
        candidate,
      );

      const resolvedNeighborhood = this.resolveBestMatch(
        neighborhoodResult,
        candidate,
        "neighborhood",
      );

      if (resolvedNeighborhood.success) {
        return resolvedNeighborhood;
      }

      const villageResult = await this.searchAdministrativeUnit(
        "villages",
        candidate,
      );

      const resolvedVillage = this.resolveBestMatch(
        villageResult,
        candidate,
        "village",
      );

      if (resolvedVillage.success) {
        return resolvedVillage;
      }

      const districtResult = await this.searchAdministrativeUnit(
        "districts",
        candidate,
      );

      const resolvedDistrict = this.resolveBestMatch(
        districtResult,
        candidate,
        "district",
      );

      if (resolvedDistrict.success) {
        return resolvedDistrict;
      }
    }

    return this.empty("Türkiye API üzerinde net konum eşleşmesi bulunamadı.");
  }

  buildPromptContext(location: LinaGeoResolvedLocation): string {
    if (!location.success) {
      return [
        "TÜRKİYE COĞRAFİ ÇÖZÜMLEME",
        "Net konum çözümlenemedi.",
        location.message,
        "Kural: Konum net değilse ilçe veya mahalleyi uydurma. Kullanıcıdan yalnızca eksik konumu iste.",
      ].join("\n");
    }

    const locationParts = [
      location.province,
      location.district,
      location.neighborhood || location.village,
    ].filter(Boolean);

    return [
      "TÜRKİYE COĞRAFİ ÇÖZÜMLEME",
      `Kaynak: ${location.source}`,
      `Güven: ${location.confidence}`,
      `Eşleşen ifade: ${location.matchedText || "belirtilmedi"}`,
      `Eşleşme tipi: ${location.matchType || "belirtilmedi"}`,
      `Net konum: ${locationParts.join(" / ")}`,
      "",
      "Kural:",
      "- Bu konum yüksek güvenle çözümlendiyse kullanıcıya aynı konumu tekrar sorma.",
      "- İl, ilçe ve mahalle/köy bilgisini sistem eşleşmesi olarak kabul et.",
      "- Sıradaki eksik portföy bilgisini sor.",
      "- Konumu tahmin ettim deme; sistem eşleşmesi olarak kısa ve net söyle.",
    ].join("\n");
  }

  private async searchAdministrativeUnit(
    endpoint: "neighborhoods" | "villages" | "districts",
    name: string,
  ): Promise<TurkiyeApiRecord[]> {
    for (const base of this.apiBases) {
      try {
        const url = `${base}/${endpoint}?name=${encodeURIComponent(name)}&limit=20`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          continue;
        }

        const json = (await response.json()) as unknown;
        const records = this.extractRecords(json);

        if (records.length) {
          return records;
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  private resolveBestMatch(
    records: TurkiyeApiRecord[],
    candidate: string,
    matchType: "neighborhood" | "village" | "district",
  ): LinaGeoResolvedLocation {
    if (!records.length) {
      return this.empty("Eşleşme bulunamadı.");
    }

    const normalizedCandidate = this.normalize(candidate);

    const exactMatches = records.filter((record) => {
      const name = this.getName(record, matchType);

      return this.normalize(name) === normalizedCandidate;
    });

    const usableMatches = exactMatches.length ? exactMatches : records;

    const alternatives = usableMatches.map((record) => ({
      province: this.getProvinceName(record),
      district: this.getDistrictName(record),
      neighborhood: matchType === "neighborhood" ? this.getName(record, "neighborhood") : undefined,
      village: matchType === "village" ? this.getName(record, "village") : undefined,
      matchType,
    }));

    const uniqueKeys = new Set(
      alternatives.map((item) =>
        [
          this.normalize(item.province),
          this.normalize(item.district),
          this.normalize(item.neighborhood || item.village),
        ].join("|"),
      ),
    );

    if (uniqueKeys.size !== 1) {
      return {
        success: false,
        source: "TURKIYE_API",
        confidence: "low",
        matchedText: candidate,
        matchType,
        alternatives: alternatives.slice(0, 5),
        message:
          "Birden fazla konum eşleşmesi bulundu. Kullanıcıdan il veya ilçe teyidi istenmeli.",
      };
    }

    const best = usableMatches[0];

    return {
      success: true,
      source: "TURKIYE_API",
      confidence: exactMatches.length === 1 ? "high" : "medium",
      province: this.getProvinceName(best),
      district: this.getDistrictName(best),
      neighborhood: matchType === "neighborhood" ? this.getName(best, "neighborhood") : undefined,
      village: matchType === "village" ? this.getName(best, "village") : undefined,
      matchedText: candidate,
      matchType,
      alternatives: alternatives.slice(0, 5),
      message: "Konum Türkiye API üzerinden çözümlendi.",
    };
  }

  private extractRecords(json: unknown): TurkiyeApiRecord[] {
    if (Array.isArray(json)) {
      return json.filter((item): item is TurkiyeApiRecord => {
        return item !== null && typeof item === "object" && !Array.isArray(item);
      });
    }

    if (!json || typeof json !== "object" || Array.isArray(json)) {
      return [];
    }

    const objectValue = json as Record<string, unknown>;
    const possibleArrays = [
      objectValue.data,
      objectValue.result,
      objectValue.results,
      objectValue.neighborhoods,
      objectValue.villages,
      objectValue.districts,
    ];

    for (const item of possibleArrays) {
      if (Array.isArray(item)) {
        return item.filter((record): record is TurkiyeApiRecord => {
          return record !== null && typeof record === "object" && !Array.isArray(record);
        });
      }
    }

    return [];
  }

  private extractCandidates(message: string): string[] {
    const normalizedMessage = message
      .replace(/[.,;:!?()[\]{}"“”'’]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = normalizedMessage
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word.length >= 4)
      .filter((word) => !this.isIgnoredWord(word));

    const candidates = new Set<string>();

    for (let size = 3; size >= 1; size -= 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        candidates.add(words.slice(index, index + size).join(" "));
      }
    }

    return Array.from(candidates).slice(0, 30);
  }

  private isIgnoredWord(word: string): boolean {
    const ignored = [
      "ilan",
      "ilanı",
      "ilani",
      "girelim",
      "ekleyelim",
      "oluşturalım",
      "olusturalim",
      "satılık",
      "satilik",
      "kiralık",
      "kiralik",
      "daire",
      "konut",
      "villa",
      "arsa",
      "tarla",
      "dükkan",
      "dukkan",
      "metrekare",
      "milyon",
      "fiyat",
    ];

    return ignored.includes(this.normalize(word));
  }

  private getName(record: TurkiyeApiRecord, matchType: "neighborhood" | "village" | "district"): string {
    const keys =
      matchType === "district"
        ? ["name", "district", "districtName"]
        : ["name", "neighborhood", "neighborhoodName", "village", "villageName"];

    return this.getFirstString(record, keys);
  }

  private getProvinceName(record: TurkiyeApiRecord): string | undefined {
    return (
      this.getNestedString(record, ["province", "name"]) ||
      this.getNestedString(record, ["province", "title"]) ||
      this.getFirstString(record, ["province", "provinceName", "province_name", "city", "cityName"]) ||
      undefined
    );
  }

  private getDistrictName(record: TurkiyeApiRecord): string | undefined {
    return (
      this.getNestedString(record, ["district", "name"]) ||
      this.getNestedString(record, ["district", "title"]) ||
      this.getFirstString(record, ["district", "districtName", "district_name", "county", "countyName"]) ||
      undefined
    );
  }

  private getNestedString(record: TurkiyeApiRecord, keys: string[]): string | undefined {
    let current: unknown = record;

    for (const key of keys) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[key];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    return undefined;
  }

  private getFirstString(record: TurkiyeApiRecord, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return "";
  }

  private normalize(value?: string): string {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/\s+/g, " ");
  }

  private empty(message: string): LinaGeoResolvedLocation {
    return {
      success: false,
      source: "NONE",
      confidence: "none",
      message,
    };
  }
}