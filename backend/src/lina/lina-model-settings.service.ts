import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export const LINA_EXTRACTION_MODEL_KEY = "LINA_EXTRACTION_MODEL";
export const LINA_CHAT_MODEL_KEY = "LINA_CHAT_MODEL";
export const LINA_MODEL_ALLOWLIST_KEY = "LINA_MODEL_ALLOWLIST";

const DEFAULT_EXTRACTION_MODEL = "gpt-4.1";
const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
// İzin listesi SystemSetting(LINA_MODEL_ALLOWLIST) ile genişletilir/daraltılır; kayıt yoksa bu yedek kullanılır.
const FALLBACK_ALLOWLIST = ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"];
const CACHE_TTL_MS = 30_000;

@Injectable()
export class LinaModelSettingsService {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  getExtractionModel(): Promise<string> {
    return this.readModel(LINA_EXTRACTION_MODEL_KEY, DEFAULT_EXTRACTION_MODEL);
  }

  getChatModel(): Promise<string> {
    return this.readModel(LINA_CHAT_MODEL_KEY, DEFAULT_CHAT_MODEL);
  }

  async getAllowlist(): Promise<string[]> {
    const raw = await this.readSetting(LINA_MODEL_ALLOWLIST_KEY);
    const list = Array.isArray(raw)
      ? raw.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    return list.length ? list : FALLBACK_ALLOWLIST;
  }

  // Ayar yoksa, boşsa veya izin listesinde değilse varsayılan model kullanılır.
  private async readModel(key: string, fallback: string): Promise<string> {
    const raw = await this.readSetting(key);
    const configured = typeof raw === "string" ? raw.trim() : "";
    if (!configured) return fallback;
    const allowlist = await this.getAllowlist();
    return allowlist.includes(configured) ? configured : fallback;
  }

  private async readSetting(key: string): Promise<unknown> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: unknown = null;
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key },
        select: { valueJson: true },
      });
      const json = row?.valueJson as unknown;
      value =
        json && typeof json === "object" && !Array.isArray(json) && "value" in json
          ? (json as Record<string, unknown>).value
          : json;
    } catch {
      value = null;
    }

    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }
}
