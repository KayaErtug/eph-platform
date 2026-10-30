import { Injectable } from "@nestjs/common";

import { EphLocationCatalogService } from "../catalog/eph-location-catalog.service";
import { LinaGeoService } from "../geo/lina-geo.service";

export type LinaLocationInput = { il: string | null; ilce: string | null; mahalleler: string[] };

export type LinaLocationValidation = {
  il: string | null;
  ilce: string | null;
  mahalleler: string[];
  // Kataloğa karşı doğrulanamayan değerler; kaydedilmez, kullanıcıya sorulur.
  dogrulanamayan: string[];
  // Birden fazla yere eşleşen veya il/ilçe ile çelişen değerler; kullanıcıya sorulur.
  belirsiz: string[];
};

const norm = (value: string): string =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripMahalle = (value: string): string =>
  String(value || "")
    .replace(/\b(mahallesi|mahalle|mah\.?|mh\.?|k[oö]y[uü]|k[oö]y)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const levenshtein = (a: string, b: string): number => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
};

// Bulanık eşitlik: diyakritik/büyük-küçük harf farkı yok; 5+ harfte 1, 9+ harfte 2 düzenleme payı.
export const fuzzyEqual = (a: string, b: string): boolean => {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const shortest = Math.min(x.length, y.length);
  const limit = shortest >= 9 ? 2 : shortest >= 5 ? 1 : 0;
  return limit > 0 && levenshtein(x, y) <= limit;
};

type Found = { status: "ok" | "belirsiz" | "yok"; province?: string; district?: string; neighborhood?: string };

@Injectable()
export class LinaLocationValidatorService {
  constructor(
    private readonly catalog: EphLocationCatalogService,
    private readonly geo: LinaGeoService,
  ) {}

  async validate(input: LinaLocationInput): Promise<LinaLocationValidation> {
    const result: LinaLocationValidation = { il: null, ilce: null, mahalleler: [], dogrulanamayan: [], belirsiz: [] };

    const provinces = this.catalog.listRegions("TR");
    const kktcDistricts = this.catalog.listRegions("KKTC");
    let il = input.il ? provinces.find((p) => fuzzyEqual(p, input.il as string)) || null : null;
    let ilce = input.ilce ? String(input.ilce).trim() : null;
    let kktc = false;

    // "Girne" gibi KKTC ilçesi il alanına yazılmış olabilir.
    if (input.il && !il) {
      const kktcMatch = kktcDistricts.find((d) => fuzzyEqual(d, input.il as string));
      if (kktcMatch) {
        kktc = true;
        ilce = ilce || kktcMatch;
      } else if (/kktc|k\.k\.t\.c|kuzey k[ıi]br[ıi]s/i.test(input.il)) {
        kktc = true;
      } else {
        result.dogrulanamayan.push(input.il);
      }
    }

    if (kktc) {
      result.il = "K.K.T.C.";
      if (ilce) {
        const district = kktcDistricts.find((d) => fuzzyEqual(d, ilce as string));
        if (district) result.ilce = district;
        else result.dogrulanamayan.push(ilce);
      }
      // KKTC mahalle düzeyi katalogda doğrulanamaz; kullanıcının verdiği ad olduğu gibi saklanır.
      result.mahalleler = input.mahalleler.map(stripMahalle).filter(Boolean);
      return result;
    }

    if (ilce) {
      const found = await this.resolveName(ilce, "DISTRICT", il, null);
      if (found.status === "ok") {
        result.ilce = found.district || ilce;
        il = il || found.province || null;
      } else if (found.status === "belirsiz") {
        result.belirsiz.push(ilce);
      } else {
        result.dogrulanamayan.push(ilce);
      }
    }
    result.il = il;

    const aranacak = input.mahalleler.map(stripMahalle).filter(Boolean).slice(0, 8);
    const sonuclar = await Promise.all(
      aranacak.map(async (mahalle) => ({ mahalle, found: await this.resolveName(mahalle, "NEIGHBORHOOD", il, result.ilce) })),
    );
    const seen = new Set<string>();
    for (const { mahalle, found } of sonuclar) {
      if (found.status === "ok") {
        const name = found.neighborhood || mahalle;
        if (!seen.has(norm(name))) {
          seen.add(norm(name));
          result.mahalleler.push(name);
        }
        // İl/ilçe boşsa doğrulanan mahalleden tamamlanır.
        result.il = result.il || found.province || null;
        result.ilce = result.ilce || found.district || null;
      } else if (found.status === "belirsiz") {
        result.belirsiz.push(mahalle);
      } else {
        result.dogrulanamayan.push(mahalle);
      }
    }
    return result;
  }

  private async resolveName(
    name: string,
    level: "DISTRICT" | "NEIGHBORHOOD",
    il: string | null,
    ilce: string | null,
  ): Promise<Found> {
    if (level === "DISTRICT") return this.resolveDistrict(name, il);
    let resolved;
    try {
      resolved = await this.catalog.resolveLocationFromMessage(name);
    } catch {
      return { status: "yok" };
    }

    const unitOf = (_district?: string, neighborhood?: string) => neighborhood;
    const matches = (province?: string, district?: string, neighborhood?: string) =>
      (!il || !province || fuzzyEqual(province, il)) &&
      (!ilce || !district || fuzzyEqual(district, ilce)) &&
      fuzzyEqual(unitOf(district, neighborhood) || "", name);

    if (resolved.success) {
      const levelOk = resolved.verificationLevel === "NEIGHBORHOOD" || resolved.verificationLevel === "VILLAGE";
      if (!levelOk) return { status: "yok" };
      const unit = resolved.neighborhood || resolved.village;
      if (matches(resolved.province, resolved.district, unit)) {
        return { status: "ok", province: resolved.province, district: resolved.district, neighborhood: unit };
      }
      // Ad tutuyor ama başka il/ilçede: kullanıcıya sorulur.
      return { status: fuzzyEqual(unitOf(resolved.district, unit) || "", name) ? "belirsiz" : "yok" };
    }

    // Birden fazla eşleşme: il/ilçe ile daraltılınca tek sonuç kalırsa kabul edilir.
    const candidates = (resolved.alternatives || [])
      .map((text) => text.split(" / ").map((part) => part.trim()))
      .filter((parts) => parts.length >= 3)
      .map(([province, district, neighborhood]) => ({ province, district, neighborhood }))
      .filter((c) => matches(c.province, c.district, c.neighborhood));
    const unique = new Map<string, (typeof candidates)[number]>(
      candidates.map((c) => [norm(`${c.province}|${c.district}|${c.neighborhood}`), c]),
    );
    const only = unique.size === 1 ? [...unique.values()][0] : null;
    if (only && (il || ilce)) return { status: "ok", province: only.province, district: only.district, neighborhood: only.neighborhood };
    return { status: unique.size > 0 || (resolved.alternatives || []).length > 0 ? "belirsiz" : "yok" };
  }

  private async resolveDistrict(name: string, il: string | null): Promise<Found> {
    let found: Array<{ province?: string; district: string }>;
    try {
      found = await this.geo.findDistricts(name);
    } catch {
      return { status: "yok" };
    }
    const named = found.filter((d) => fuzzyEqual(d.district, name));
    const scoped = il ? named.filter((d) => !d.province || fuzzyEqual(d.province, il)) : named;
    const unique = new Map(scoped.map((d) => [norm(`${d.province}|${d.district}`), d]));
    if (unique.size === 1) {
      const only = [...unique.values()][0];
      return { status: "ok", province: only.province, district: only.district };
    }
    if (unique.size > 1) return { status: "belirsiz" };
    // İlçe adı var ama verilen ilde değil: kullanıcıya sorulur.
    return { status: named.length ? "belirsiz" : "yok" };
  }
}
