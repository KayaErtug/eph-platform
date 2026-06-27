import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

import { LinaChatDto } from "./dto/lina-chat.dto";
import { LinaVoiceDto } from "./dto/lina-voice.dto";
import { LinaPreferencesDto } from "./dto/lina-preferences.dto";

import {
  LinaAccessService,
  LinaAccessUser,
  LinaModuleName,
} from "./lina-access.service";
import { LinaKvkkService } from "./lina-kvkk.service";
import { LinaAuditService } from "./lina-audit.service";
import {
  LinaHistoryMessage,
  LinaMemoryService,
  LinaPreparedChat,
  LinaPromptMemorySnapshot,
} from "./lina-memory.service";
import { LinaPortfolioSessionService } from "./portfolio/lina-portfolio-session.service";
import { LinaPortfolioEngineService } from "./portfolio/lina-portfolio-engine.service";
import { PrismaService } from "../prisma/prisma.service";

type LinaApiUser = LinaAccessUser & {
  email?: string;
};

type LinaStatusResponse = {
  success: boolean;
  message: string;
  provider?: string;
};

type LinaChatResponse = {
  success: boolean;
  message: string;
  provider: "openai" | "claude" | "local";
  kvkkFiltered: boolean;
  detectedTypes: string[];
};

type LinaVoiceResponse = {
  success: boolean;
  message: string;
  provider: "elevenlabs" | "local";
  audioBase64?: string;
  mimeType?: string;
  kvkkFiltered: boolean;
  blockedReason?: string;
};

type LinaProviderAnswer = {
  content: string;
  inputTokens: number;
  outputTokens: number;
};

@Injectable()
export class LinaService {
  private readonly promptCache = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly linaAccessService: LinaAccessService,
    private readonly linaKvkkService: LinaKvkkService,
    private readonly linaAuditService: LinaAuditService,
    private readonly linaMemoryService: LinaMemoryService,
    private readonly linaPortfolioSessionService: LinaPortfolioSessionService,
    private readonly linaPortfolioEngineService: LinaPortfolioEngineService,
    private readonly prisma: PrismaService,
  ) {}

  getStatus(): LinaStatusResponse {
    return {
      success: true,
      message:
        "Lina v5 aktif. Karar motoru, portföy oturum hafızası, canlı veri bağlamı ve tek anayasa katmanı AI sağlayıcısına bağlandı.",
      provider: this.getAiProvider(),
    };
  }

  async createTextReply(
    dto: LinaChatDto,
    user?: LinaApiUser,
  ): Promise<LinaChatResponse> {
    const message = String(dto?.message || "").trim();
    const sourceModule = this.normalizeSourceModule(dto?.sourceModule);

    if (!message) {
      return {
        success: false,
        message: "Lina’ya iletilen mesaj boş olamaz.",
        provider: "local",
        kvkkFiltered: false,
        detectedTypes: [],
      };
    }

    const access = this.linaAccessService.checkModuleAccess(user, sourceModule);

    if (!access.allowed) {
      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: "lina_chat_access",
        result: "blocked",
        riskLevel: 3,
        reason: access.reason,
      });

      return {
        success: false,
        message:
          access.reason || this.linaAccessService.getUnauthorizedMessage(),
        provider: "local",
        kvkkFiltered: false,
        detectedTypes: [],
      };
    }

    if (this.isForeignLanguageRequest(message)) {
      return {
        success: true,
        message:
          "Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir.",
        provider: "local",
        kvkkFiltered: false,
        detectedTypes: [],
      };
    }

    const inputFilter = this.linaKvkkService.filterText(message);
    const safeUserMessage = inputFilter.safeText;
    const portfolioRuntimeContext = await this.buildPortfolioRuntimeContext(
      safeUserMessage,
      sourceModule,
      user,
    );
    const portfolioFlowActive = Boolean(portfolioRuntimeContext.trim());
    const chatPreparation = await this.safePrepareChat(user, sourceModule);

    try {
      const provider = this.getAiProvider();
      const providerAnswer =
        provider === "claude"
          ? await this.askClaude(
              safeUserMessage,
              sourceModule,
              user,
              portfolioRuntimeContext,
              chatPreparation?.history || [],
              chatPreparation?.memorySnapshot,
            )
          : await this.askOpenAi(
              safeUserMessage,
              sourceModule,
              user,
              portfolioRuntimeContext,
              chatPreparation?.history || [],
              chatPreparation?.memorySnapshot,
            );
      const rawAnswer = providerAnswer.content;

      const outputFilter = this.linaKvkkService.filterText(rawAnswer);
      const kvkkFiltered = outputFilter.filtered || inputFilter.filtered;

      await this.rememberPortfolioAssistantMessage(
        outputFilter.safeText,
        portfolioFlowActive,
        user,
      );

      await this.safeRecordConversation({
        preparation: chatPreparation,
        user,
        sourceModule,
        userMessage: safeUserMessage,
        assistantMessage: outputFilter.safeText,
        inputTokenCount: providerAnswer.inputTokens,
        outputTokenCount: providerAnswer.outputTokens,
      });

      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: "lina_chat",
        result: kvkkFiltered ? "filtered" : "success",
        riskLevel: kvkkFiltered ? 2 : 0,
        kvkkFiltered,
      });

      return {
        success: true,
        message: outputFilter.safeText,
        provider,
        kvkkFiltered,
        detectedTypes: Array.from(
          new Set([
            ...inputFilter.detectedTypes,
            ...outputFilter.detectedTypes,
          ]),
        ),
      };
    } catch (error) {
      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: "lina_chat",
        result: "error",
        riskLevel: 2,
        reason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });

      return {
        success: false,
        message:
          "Lina şu anda yanıt oluşturmakta zorlanıyor. Lütfen biraz sonra tekrar deneyin.",
        provider: "local",
        kvkkFiltered: inputFilter.filtered,
        detectedTypes: inputFilter.detectedTypes,
      };
    }
  }

  async getPreferences(user?: LinaApiUser) {
    return this.linaMemoryService.getPreferences(user?.id);
  }

  async updatePreferences(dto: LinaPreferencesDto, user?: LinaApiUser) {
    if (!user?.id) {
      return {
        success: false,
        message: "Lina tercihlerini güncellemek için giriş yapmanız gerekir.",
      };
    }

    const preferences = await this.linaMemoryService.updatePreferences(
      user.id,
      dto,
    );

    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: "general",
      action: "lina_preferences_update",
      result: "success",
      riskLevel: 0,
    });

    return {
      success: true,
      message: "Lina tercihleriniz güncellendi.",
      preferences,
    };
  }

  async resetMemory(user?: LinaApiUser) {
    if (!user?.id) {
      return {
        success: false,
        message: "Lina hafızasını sıfırlamak için giriş yapmanız gerekir.",
      };
    }

    await this.linaMemoryService.clearUserMemory(user.id);
    await this.linaPortfolioSessionService.cancelActiveSession(user.id);
    const preferences = await this.linaMemoryService.resetPreferences(user.id);

    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: "general",
      action: "lina_memory_reset",
      result: "success",
      riskLevel: 0,
    });

    return {
      success: true,
      message:
        "Lina konuşma geçmişiniz, kayıtlı hafızanız ve tercihleriniz temizlendi.",
      preferences,
    };
  }

  async createVoice(
    dto: LinaVoiceDto,
    user?: LinaApiUser,
  ): Promise<LinaVoiceResponse> {
    const text = String(dto?.text || "").trim();
    const sourceModule = this.normalizeSourceModule(dto?.sourceModule);
    const priorityLevel = dto?.priorityLevel ?? 1;

    if (!text) {
      return {
        success: false,
        message: "Sesli yanıt için metin boş olamaz.",
        provider: "local",
        kvkkFiltered: false,
      };
    }

    const access = this.linaAccessService.checkModuleAccess(user, sourceModule);

    if (!access.allowed) {
      return {
        success: false,
        message:
          access.reason || this.linaAccessService.getUnauthorizedMessage(),
        provider: "local",
        kvkkFiltered: false,
        blockedReason: "ACCESS_DENIED",
      };
    }

    const preferences = await this.linaMemoryService.getPreferences(user?.id);

    if (!preferences.voiceEnabled) {
      return {
        success: false,
        message: "Sesli yanıt tercihiniz kapalı.",
        provider: "local",
        kvkkFiltered: false,
        blockedReason: "VOICE_DISABLED",
      };
    }

    const isQuiet = this.linaMemoryService.isQuietNow(preferences);

    if (isQuiet && priorityLevel < 4) {
      return {
        success: false,
        message: "Sessiz saatler aktif olduğu için sesli yanıt oluşturulmadı.",
        provider: "local",
        kvkkFiltered: false,
        blockedReason: "QUIET_HOURS",
      };
    }

    if (isQuiet && priorityLevel >= 4 && !preferences.urgentVoiceEnabled) {
      return {
        success: false,
        message: "Acil sesli bildirim tercihiniz kapalı.",
        provider: "local",
        kvkkFiltered: false,
        blockedReason: "URGENT_VOICE_DISABLED",
      };
    }

    const filtered = this.linaKvkkService.filterText(text, {
      strictVoiceMode: true,
    });

    try {
      const audio = await this.askElevenLabs(filtered.safeText);

      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: "lina_voice",
        result: filtered.filtered ? "filtered" : "success",
        riskLevel: filtered.filtered ? 2 : 0,
        kvkkFiltered: filtered.filtered,
        voiceGenerated: true,
      });

      return {
        success: true,
        message: filtered.safeText,
        provider: "elevenlabs",
        audioBase64: audio.toString("base64"),
        mimeType: "audio/mpeg",
        kvkkFiltered: filtered.filtered,
      };
    } catch (error) {
      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: "lina_voice",
        result: "error",
        riskLevel: 2,
        reason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
        kvkkFiltered: filtered.filtered,
      });

      return {
        success: false,
        message:
          "Sesli yanıt şu anda oluşturulamadı. Yazılı yanıtı görüntüleyebilirsiniz.",
        provider: "local",
        kvkkFiltered: filtered.filtered,
        blockedReason: "VOICE_PROVIDER_ERROR",
      };
    }
  }

  private getAiProvider(): "openai" | "claude" {
    const provider = String(
      this.configService.get<string>("LINA_AI_PROVIDER") || "openai",
    ).toLowerCase();

    if (provider === "claude") {
      return "claude";
    }

    return "openai";
  }

  private async askOpenAi(
    message: string,
    sourceModule: LinaModuleName,
    user?: LinaApiUser,
    portfolioRuntimeContext = "",
    history: LinaHistoryMessage[] = [],
    memorySnapshot?: LinaPromptMemorySnapshot,
  ): Promise<LinaProviderAnswer> {
    const apiKey =
      this.configService.get<string>("OPENAI_API_KEY") ||
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        content: this.localFallbackAnswer(message),
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    const model =
      this.configService.get<string>("OPENAI_MODEL") ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1-mini";
    const systemPrompt = await this.buildSystemPrompt(
      sourceModule,
      user,
      portfolioRuntimeContext,
      memorySnapshot,
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.18,
        max_tokens: 900,
        presence_penalty: -0.1,
        frequency_penalty: 0.25,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...history,
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OPENAI_ERROR_${response.status}: ${detail}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };

    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OPENAI_EMPTY_RESPONSE");
    }

    return {
      content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  }

  private async askClaude(
    message: string,
    sourceModule: LinaModuleName,
    user?: LinaApiUser,
    portfolioRuntimeContext = "",
    history: LinaHistoryMessage[] = [],
    memorySnapshot?: LinaPromptMemorySnapshot,
  ): Promise<LinaProviderAnswer> {
    const apiKey =
      this.configService.get<string>("ANTHROPIC_API_KEY") ||
      process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        content: this.localFallbackAnswer(message),
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    const model =
      this.configService.get<string>("ANTHROPIC_MODEL") ||
      process.env.ANTHROPIC_MODEL ||
      "claude-3-5-haiku-latest";
    const systemPrompt = await this.buildSystemPrompt(
      sourceModule,
      user,
      portfolioRuntimeContext,
      memorySnapshot,
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.18,
        system: systemPrompt,
        messages: [
          ...history,
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`CLAUDE_ERROR_${response.status}: ${detail}`);
    }

    const data = (await response.json()) as {
      content?: Array<{
        type?: string;
        text?: string;
      }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };

    const content = data?.content
      ?.find((item) => item.type === "text")
      ?.text?.trim();

    if (!content) {
      throw new Error("CLAUDE_EMPTY_RESPONSE");
    }

    return {
      content,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
  }

  private async askElevenLabs(text: string): Promise<Buffer> {
    const apiKey =
      this.configService.get<string>("ELEVENLABS_API_KEY") ||
      process.env.ELEVENLABS_API_KEY;
    const voiceId =
      this.configService.get<string>("ELEVENLABS_VOICE_ID") ||
      process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      throw new Error("ELEVENLABS_CONFIG_MISSING");
    }

    const modelId =
      this.configService.get<string>("ELEVENLABS_MODEL_ID") ||
      process.env.ELEVENLABS_MODEL_ID ||
      "eleven_multilingual_v2";

    const voiceText = this.normalizeVoiceTextForRealEstate(text);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: voiceText,
          model_id: modelId,
          voice_settings: {
            stability: 0.92,
            similarity_boost: 0.98,
            style: 0.05,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ELEVENLABS_ERROR_${response.status}: ${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private normalizeVoiceTextForRealEstate(text: string): string {
    return this.applyVoicePunctuationPauses(
      this.normalizeRealEstateSpeechTokens(
        String(text || "")
          .replace(/\bEPH\b/g, "Emlak Portföy Havuzu")
          .replace(/\beph\b/g, "Emlak Portföy Havuzu"),
      ),
    );
  }

  private normalizeRealEstateSpeechTokens(text: string): string {
    let normalized = text;

    normalized = normalized
      .replace(/\bTRY\b/g, "Türk Lirası")
      .replace(/\bTL\b/g, "Türk Lirası")
      .replace(/₺/g, " Türk Lirası ")
      .replace(/\bUSD\b/g, "Amerikan Doları")
      .replace(/\bEUR\b/g, "Euro")
      .replace(/\bKAKS\b/g, "kaks")
      .replace(/\bTAKS\b/g, "taks")
      .replace(/\bBrüt\b/g, "bürüt")
      .replace(/\bbrüt\b/g, "bürüt")
      .replace(/\bNo\b/g, "numara")
      .replace(/\bno\b/g, "numara")
      .replace(/\bDaire No\b/g, "daire numarası")
      .replace(/\bAda\s*\/\s*Parsel\b/gi, "ada parsel")
      .replace(/\bada\s*\/\s*parsel\b/gi, "ada parsel")
      .replace(/\b0\s*km\b/gi, "sıfır kilometre")
      .replace(/\b0km\b/gi, "sıfır kilometre");

    normalized = this.normalizeMoneyForVoice(normalized);
    normalized = this.normalizeRoomCountsForVoice(normalized);
    normalized = this.normalizeParcelFractionsForVoice(normalized);
    normalized = this.normalizeMeasurementForVoice(normalized);
    normalized = this.normalizeRealEstateZeroMeaningForVoice(normalized);

    return normalized
      .replace(/\s+\/\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private normalizeMoneyForVoice(text: string): string {
    return text.replace(
      /\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(Türk Lirası|Amerikan Doları|Euro)\b/gi,
      (_match, amount, currency) => {
        const numberValue = this.parseTurkishNumber(amount);

        if (numberValue === null) {
          return `${amount} ${currency}`;
        }

        return `${this.numberToTurkishWords(numberValue)} ${currency}`;
      },
    );
  }

  private normalizeRoomCountsForVoice(text: string): string {
    return text
      .replace(/\b(\d+)\s*[,.]\s*5\s*\+\s*(\d+)\b/g, (_match, room, living) => {
        return `${this.numberToTurkishWords(Number(room))} buçuk artı ${this.numberToTurkishWords(Number(living))}`;
      })
      .replace(/\b(\d+)\s*\+\s*(\d+)\b/g, (_match, room, living) => {
        return `${this.numberToTurkishWords(Number(room))} artı ${this.numberToTurkishWords(Number(living))}`;
      });
  }

  private normalizeParcelFractionsForVoice(text: string): string {
    return text.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_match, left, right) => {
      return `${this.numberToTurkishWords(Number(left))}e ${this.numberToTurkishWords(Number(right))}`;
    });
  }

  private normalizeMeasurementForVoice(text: string): string {
    return text
      .replace(
        /\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(m²|m2|metrekare)\b/gi,
        (_match, value) => {
          const numberValue = this.parseTurkishNumber(value);
          const spoken =
            numberValue === null
              ? String(value)
              : this.numberToTurkishWords(numberValue);

          return `${spoken} metrekare`;
        },
      )
      .replace(
        /\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(m³|m3|metreküp)\b/gi,
        (_match, value) => {
          const numberValue = this.parseTurkishNumber(value);
          const spoken =
            numberValue === null
              ? String(value)
              : this.numberToTurkishWords(numberValue);

          return `${spoken} metreküp`;
        },
      )
      .replace(/\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*cm\b/gi, (_match, value) => {
        const numberValue = this.parseTurkishNumber(value);
        const spoken =
          numberValue === null
            ? String(value)
            : this.numberToTurkishWords(numberValue);

        return `${spoken} santimetre`;
      })
      .replace(/\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*km\b/gi, (_match, value) => {
        const numberValue = this.parseTurkishNumber(value);
        const spoken =
          numberValue === null
            ? String(value)
            : this.numberToTurkishWords(numberValue);

        return `${spoken} kilometre`;
      })
      .replace(
        /\b(\d{1,3}(?:[.,]\d{3})+|\d+)\s*metre\b(?=\s*(daire|konut|villa|arsa|tarla|bahçe|bağ|dükkan|iş yeri|ofis|parsel|alan|net|brüt|bürüt|satılık|kiralık|ilan|portföy))/gi,
        (_match, value) => {
          const numberValue = this.parseTurkishNumber(value);
          const spoken =
            numberValue === null
              ? String(value)
              : this.numberToTurkishWords(numberValue);

          return `${spoken} metrekare`;
        },
      );
  }

  private normalizeRealEstateZeroMeaningForVoice(text: string): string {
    return text
      .replace(
        /\bsıfır\s+(daire|konut|villa|ev|iş yeri|dükkan|ofis)\b/gi,
        "hiç kullanılmamış $1",
      )
      .replace(
        /\b(daire|konut|villa|ev|iş yeri|dükkan|ofis)\s+sıfır\b/gi,
        "$1 hiç kullanılmamış",
      )
      .replace(
        /\b((?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|on bir|on iki)\s+(?:buçuk\s+)?artı\s+(?:bir|iki|üç|dört|beş))\s+sıfır\b/gi,
        "$1 hiç kullanılmamış",
      );
  }

  private applyVoicePunctuationPauses(text: string): string {
    return text
      .replace(/Mustafa Bey,/g, "Mustafa Bey. ")
      .replace(/Tamer Bey,/g, "Tamer Bey. ")
      .replace(/Ali Bey,/g, "Ali Bey. ")
      .replace(/Başkan,/g, "Başkan. ")
      .replace(/\n/g, ". ")
      .replace(/\. \. /g, ". ")
      .replace(/\. /g, ".  ")
      .replace(/, /g, ",  ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private parseTurkishNumber(value: string): number | null {
    const normalized = String(value || "")
      .replace(/[.,]/g, "")
      .trim();

    if (!/^\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private numberToTurkishWords(value: number): string {
    if (!Number.isSafeInteger(value) || value < 0) {
      return String(value);
    }

    if (value === 0) {
      return "sıfır";
    }

    const ones = [
      "",
      "bir",
      "iki",
      "üç",
      "dört",
      "beş",
      "altı",
      "yedi",
      "sekiz",
      "dokuz",
    ];
    const tens = [
      "",
      "on",
      "yirmi",
      "otuz",
      "kırk",
      "elli",
      "altmış",
      "yetmiş",
      "seksen",
      "doksan",
    ];

    const readBelowThousand = (num: number): string => {
      const parts: string[] = [];
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;

      if (hundreds > 0) {
        parts.push(hundreds === 1 ? "yüz" : `${ones[hundreds]} yüz`);
      }

      if (ten > 0) {
        parts.push(tens[ten]);
      }

      if (one > 0) {
        parts.push(ones[one]);
      }

      return parts.join(" ");
    };

    const groups: Array<[number, string]> = [
      [1_000_000_000, "milyar"],
      [1_000_000, "milyon"],
      [1_000, "bin"],
    ];

    let remaining = value;
    const parts: string[] = [];

    for (const [base, label] of groups) {
      const groupValue = Math.floor(remaining / base);

      if (groupValue > 0) {
        if (base === 1_000 && groupValue === 1) {
          parts.push(label);
        } else {
          parts.push(`${this.numberToTurkishWords(groupValue)} ${label}`);
        }

        remaining %= base;
      }
    }

    if (remaining > 0) {
      parts.push(readBelowThousand(remaining));
    }

    return parts.join(" ");
  }

  private async buildPortfolioRuntimeContext(
    message: string,
    sourceModule: LinaModuleName,
    user?: LinaApiUser,
  ): Promise<string> {
    if (!user?.id) {
      return "";
    }

    const normalized = this.normalizeTextForSearch(message);

    if (this.isPortfolioCancelIntent(normalized)) {
      await this.linaPortfolioSessionService.cancelActiveSession(user.id);
      return "";
    }

    const explicitCreateIntent =
      this.hasExplicitPortfolioCreateIntent(normalized);
    const activeSession = explicitCreateIntent
      ? null
      : await this.getMarkedActivePortfolioSession(user.id);

    const isContinuation =
      Boolean(activeSession) &&
      this.isPortfolioContinuationMessage(
        normalized,
        activeSession as NonNullable<typeof activeSession>,
      );

    if (!explicitCreateIntent && !isContinuation) {
      return "";
    }

    try {
      const session = await this.linaPortfolioEngineService.processUserMessage(
        user.id,
        message,
      );

      if (explicitCreateIntent) {
        await this.markPortfolioCreateIntent(session.id, session.state);
      }

      const enginePrompt =
        this.linaPortfolioEngineService.buildEnginePrompt(session);
      const recentMessages = session.state.userMessages || [];
      const recentConversation = recentMessages.slice(-8).join("\n");

      return [
        "Bu bölüm yalnızca kullanıcının açıkça başlattığı aktif portföy oluşturma oturumudur.",
        "Kararı GPT değil backend engine verir. Lina yalnızca bu karara göre kısa ve doğal cevap yazar.",
        "",
        enginePrompt,
        "",
        "SON KULLANICI MESAJLARI",
        recentConversation || "Henüz kayıtlı mesaj yok.",
        "",
        "V5 CEVAP KURALLARI",
        "- Engine alanı dolu gösteriyorsa kullanıcıdan aynı alanı tekrar isteme.",
        "- Eksik alanlardan yalnızca ilk mantıklı bilgiyi sor.",
        "- Kullanıcı 3+1 dediyse oda sayısı verilmiştir; tekrar oda sayısı sorma.",
        "- Kullanıcı satılık dediyse işlem türü verilmiştir; tekrar satılık mı kiralık mı diye sorma.",
        "- Kullanıcı daire dediyse portföy türü verilmiştir; tekrar daire/villa/arsa diye sorma.",
        "- Konum bilgisi eksikse sadece eksik parçayı sor; ilçe veya mahalle uydurma.",
        "- Her cevap tek sonraki eksik bilgiye odaklansın.",
        "- 'Başka nasıl yardımcı olabilirim?' deme.",
      ].join("\n");
    } catch (error) {
      return [
        "Açıkça başlatılmış portföy oluşturma akışında teknik hata oluştu.",
        "Kullanıcıdan aynı bilgileri tekrar isteme; kısa şekilde bir sonraki eksik bilgiyi sor.",
        `Teknik hata: ${error instanceof Error ? error.message : "UNKNOWN_PORTFOLIO_ENGINE_ERROR"}`,
      ].join("\n");
    }
  }

  private async rememberPortfolioAssistantMessage(
    assistantMessage: string,
    portfolioFlowActive: boolean,
    user?: LinaApiUser,
  ): Promise<void> {
    if (!user?.id || !portfolioFlowActive) {
      return;
    }

    try {
      await this.linaPortfolioSessionService.appendAssistantMessage(
        user.id,
        assistantMessage,
      );
    } catch {
      return;
    }
  }

  private hasExplicitPortfolioCreateIntent(normalizedMessage: string): boolean {
    const phrases = [
      "portfoy olustur",
      "portfoy olusturalim",
      "portfoy girisi yap",
      "portfoy girelim",
      "portfoy ekle",
      "portfoy kaydet",
      "yeni portfoy",
      "ilan olustur",
      "ilan olusturalim",
      "ilan girisi yap",
      "ilan girelim",
      "ilan ekle",
      "ilan kaydet",
      "yeni ilan",
      "stok girisi yap",
      "yeni stok ekle",
    ];

    return phrases.some((phrase) => normalizedMessage.includes(phrase));
  }

  private isPortfolioCancelIntent(normalizedMessage: string): boolean {
    const phrases = [
      "portfoy islemini iptal et",
      "portfoy olusturmayi iptal et",
      "ilan olusturmayi iptal et",
      "portfoy akisini kapat",
      "ilan akisini kapat",
    ];

    return phrases.some((phrase) => normalizedMessage.includes(phrase));
  }

  private async getMarkedActivePortfolioSession(userId: string) {
    const session = await this.prisma.linaPortfolioSession.findFirst({
      where: {
        userId,
        mode: "PORTFOLIO_CREATE",
        status: {
          in: ["DRAFT", "READY_FOR_CONFIRMATION"],
        },
      },
      orderBy: {
        lastActivityAt: "desc",
      },
      select: {
        id: true,
        step: true,
        city: true,
        district: true,
        neighborhood: true,
        roomCount: true,
        squareMeter: true,
        floor: true,
        buildingFloorCount: true,
        price: true,
        stateJson: true,
      },
    });

    if (!session) {
      return null;
    }

    const state = this.toPlainObject(session.stateJson);

    if (state.lastIntent !== "PORTFOLIO_CREATE") {
      return null;
    }

    return session;
  }

  private isPortfolioContinuationMessage(
    normalizedMessage: string,
    session: {
      step: string;
      city: string | null;
      district: string | null;
      neighborhood: string | null;
      roomCount: string | null;
      squareMeter: number | null;
      floor: string | null;
      buildingFloorCount: number | null;
      price: number | null;
    },
  ): boolean {
    if (!normalizedMessage) {
      return false;
    }

    const generalConversationSignals = [
      "hatirla",
      "odaklaniyorum",
      "konusalim",
      "sohbet",
      "nasil",
      "neden",
      "sence",
      "anlat",
      "nedir",
      "kimdir",
      "bugun",
      "yarin",
      "gorev",
      "crm",
      "havuz",
      "forum",
      "mesaj",
      "yardimci ol",
    ];

    if (
      generalConversationSignals.some((signal) =>
        normalizedMessage.includes(signal),
      )
    ) {
      return false;
    }

    if (session.step === "TRANSACTION_TYPE") {
      return /\b(satilik|kiralik)\b/.test(normalizedMessage);
    }

    if (session.step === "LOCATION") {
      const wordCount = normalizedMessage.split(" ").filter(Boolean).length;
      return (
        wordCount >= 1 &&
        wordCount <= 4 &&
        /^[a-z0-9\s]+$/.test(normalizedMessage)
      );
    }

    if (session.step === "ROOM_AND_SIZE") {
      return (
        /\b\d+\s*\+\s*\d+\b/.test(normalizedMessage) ||
        /\b\d+\s*(m2|metrekare)\b/.test(normalizedMessage)
      );
    }

    if (session.step === "FLOOR_INFO") {
      return (
        /\b(zemin|giris|bodrum|cati|bahce)\b/.test(normalizedMessage) ||
        /\b\d+\s*(inci|nci|kat|katli)\b/.test(normalizedMessage) ||
        /^\d{1,2}$/.test(normalizedMessage)
      );
    }

    if (session.step === "PRICE") {
      return (
        /\b\d[\d\s.,]*\s*(tl|try|milyon|bin)\b/.test(normalizedMessage) ||
        /^\d[\d\s.,]*$/.test(normalizedMessage)
      );
    }

    if (
      session.step === "SUMMARY" ||
      session.step === "CONFIRMATION"
    ) {
      return /^(evet|hayir|onayliyorum|onaylamiyorum|tamam|iptal)$/.test(
        normalizedMessage,
      );
    }

    return false;
  }

  private async markPortfolioCreateIntent(
    sessionId: string,
    stateValue: unknown,
  ): Promise<void> {
    const state = this.toPlainObject(stateValue);

    await this.prisma.linaPortfolioSession.update({
      where: {
        id: sessionId,
      },
      data: {
        stateJson: {
          ...state,
          lastIntent: "PORTFOLIO_CREATE",
          updatedBy: "intent-router",
        } as any,
      },
    });
  }

  private toPlainObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private normalizeTextForSearch(value: string): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/â/g, "a")
      .replace(/î/g, "i")
      .replace(/û/g, "u")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ");
  }

  private async buildSystemPrompt(
    sourceModule: LinaModuleName,
    user?: LinaApiUser,
    portfolioRuntimeContext = "",
    memorySnapshot?: LinaPromptMemorySnapshot,
  ): Promise<string> {
    const corePrompt = this.readPromptFile(
      ["core", "Lina_Core_Prompt.md"],
      this.getFallbackCorePrompt(),
    );
    const rolePrompt = this.readPromptFile(
      this.getRolePromptPath(user?.role),
      this.getFallbackRolePrompt(user?.role),
    );
    const v5Constitution = this.readPromptFile(
      ["core", "Lina_V5_Constitution.md"],
      this.getFallbackV5Constitution(),
    );

    const resolvedMemorySnapshot =
      memorySnapshot || (await this.safeGetMemorySnapshot(user?.id));
    const memoryContext = this.buildMemoryContext(resolvedMemorySnapshot);
    const currentModuleContext = this.buildCurrentModuleContext(
      sourceModule,
      user,
    );
    const liveDatabaseContext = await this.buildLiveDatabaseContext(user);

    return [
      "# LINA V5 SYSTEM PROMPT",
      "",
      "Aşağıdaki bölümleri bu öncelik sırasıyla kullan.",
      "Öncelik sırası: Core Prompt > Güvenlik/KVKK > Lina V5 Constitution > Role Prompt > Current Module > Live Database Context > Memory. Portfolio Runtime Context yalnız aktifse uygulanır.",
      "Sistemde olmayan veriyi uydurma. Veri yoksa bunu kısa ve dürüst şekilde söyle.",
      "Kullanıcı açıkça portföy veya ilan oluşturma istemedikçe portföy akışı başlatma.",
      "Konum, fiyat, ilçe, mahalle veya gayrimenkul kelimesi tek başına portföy oluşturma niyeti değildir.",
      "Portfolio Runtime Context aktifse karar mercii GPT değil bu bağlamdaki V5 Engine çıktısıdır.",
      "",
      "---",
      "",
      "# 1) CORE PROMPT",
      corePrompt,
      "",
      "---",
      "",
      "# 2) LINA V5 CONSTITUTION",
      v5Constitution,
      "",
      "---",
      "",
      "# 3) PORTFOLIO RUNTIME CONTEXT",
      portfolioRuntimeContext.trim()
        ? portfolioRuntimeContext
        : "Aktif portföy oluşturma konuşması algılanmadı.",
      "",
      "---",
      "",
      "# 4) ROLE PROMPT",
      rolePrompt,
      "",
      "---",
      "",
      "# 5) CURRENT MODULE",
      currentModuleContext,
      "",
      "---",
      "",
      "# 6) LIVE DATABASE CONTEXT",
      liveDatabaseContext,
      "",
      "---",
      "",
      "# 7) MEMORY",
      memoryContext,
      "",
      "---",
      "",
      "# 8) FINAL ANSWER RULES",
      "- Her zaman Türkçe cevap ver.",
      "- Cevapları kısa, net, doğal ve kullanıcının gerçek niyetine uygun üret.",
      "- Portfolio Runtime Context aktif değilse bağımsız sohbet et; portföy formu soruları sorma.",
      "- Yalnız aktif portföy oluşturma akışında aynı bilgiyi tekrar sorma.",
      "- Yalnız aktif portföy oluşturma akışında kısa cevabı portföy bağlamıyla birleştir.",
      "- Yalnız aktif portföy oluşturma akışında en fazla bir sonraki eksik bilgiyi sor.",
      "- Telefon, e-posta, TC kimlik, IBAN, API key, token, şifre, özel müşteri notu ve özel mesaj içeriği paylaşma.",
      "- Başka kullanıcının özel verisine erişim varmış gibi davranma.",
      "- Kesin satış, kesin fiyat, kesin kazanç, kesin yatırım veya hukuki garanti verme.",
      "- Eğer sayı, görev, mesaj, talep veya eşleşme bilgisi sistem bağlamında verilmemişse sayı uydurma.",
      "- Cevapta markdown başlıklarını gereksiz kullanma.",
      "- Mümkünse 2-5 kısa cümleyle bitir.",
    ].join("\n");
  }

  private async buildLiveDatabaseContext(user?: LinaApiUser): Promise<string> {
    if (!user?.id) {
      return [
        "Kullanıcı kimliği doğrulanamadı.",
        "Canlı veritabanı bağlamı oluşturulamadı.",
        "Kullanıcıya gerçek sayı söyleme.",
      ].join("\n");
    }

    try {
      const [
        dbUser,
        projectCount,
        unitCount,
        activeUnitCount,
        customerCount,
        taskCount,
        pendingTaskCount,
        conversationCount,
        sentMessageCount,
        unreadNetworkNotificationCount,
        networkPostCount,
        latestUnits,
        latestCustomers,
        latestTasks,
      ] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            city: true,
            district: true,
            memberCode: true,
            createdAt: true,
          },
        }),
        this.prisma.project.count({
          where: { ownerId: user.id },
        }),
        this.prisma.unit.count({
          where: {
            project: {
              ownerId: user.id,
            },
          },
        }),
        this.prisma.unit.count({
          where: {
            isOffMarket: false,
            project: {
              ownerId: user.id,
            },
          },
        }),
        this.prisma.customer.count({
          where: { ownerId: user.id },
        }),
        this.prisma.task.count({
          where: { userId: user.id },
        }),
        this.prisma.task.count({
          where: {
            userId: user.id,
            status: "BEKLIYOR",
          },
        }),
        this.prisma.conversationParticipant.count({
          where: { userId: user.id },
        }),
        this.prisma.message.count({
          where: { senderId: user.id },
        }),
        this.prisma.networkNotification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        }),
        this.prisma.networkPost.count({
          where: {
            userId: user.id,
            isActive: true,
          },
        }),
        this.prisma.unit.findMany({
          where: {
            project: {
              ownerId: user.id,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            number: true,
            type: true,
            status: true,
            price: true,
            priceCurrency: true,
            roomCount: true,
            area: true,
            isOffMarket: true,
            isVerified: true,
            project: {
              select: {
                name: true,
                city: true,
                district: true,
              },
            },
          },
        }),
        this.prisma.customer.findMany({
          where: { ownerId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            firstName: true,
            lastName: true,
            city: true,
            status: true,
            budget: true,
            interestedType: true,
            interestedArea: true,
          },
        }),
        this.prisma.task.findMany({
          where: { userId: user.id },
          orderBy: [
            { status: "asc" },
            { dueDate: "asc" },
            { updatedAt: "desc" },
          ],
          take: 5,
          select: {
            title: true,
            status: true,
            dueDate: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

      const displayName = [dbUser?.firstName, dbUser?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const userRole = dbUser?.role || user.role || "bilinmiyor";

      const unitLines = latestUnits.length
        ? latestUnits.map((unit, index) => {
            const location = [unit.project?.city, unit.project?.district]
              .filter(Boolean)
              .join(" / ");
            const price = this.formatMoney(
              unit.price,
              unit.priceCurrency || "TRY",
            );
            return `${index + 1}. ${unit.project?.name || "Proje"} - ${unit.number} - ${unit.type} - ${unit.status} - ${price} - ${unit.area || "m2 yok"} m² - ${location || "konum yok"} - ${unit.isOffMarket ? "pasif" : "aktif"} - ${unit.isVerified ? "doğrulanmış" : "doğrulanmamış"}`;
          })
        : ["Kullanıcının portföyünde kayıtlı ilan bulunmuyor."];

      const customerLines = latestCustomers.length
        ? latestCustomers.map((customer, index) => {
            const name =
              [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || "İsimsiz müşteri";
            return `${index + 1}. ${name} - ${customer.status} - ${customer.city || "şehir yok"} - ${customer.interestedType || "talep tipi yok"} - bütçe: ${this.formatMoney(customer.budget, "TRY")}`;
          })
        : ["Kullanıcının CRM tarafında kayıtlı müşterisi bulunmuyor."];

      const taskLines = latestTasks.length
        ? latestTasks.map((task, index) => {
            const customerName = [
              task.customer?.firstName,
              task.customer?.lastName,
            ]
              .filter(Boolean)
              .join(" ")
              .trim();
            return `${index + 1}. ${task.title} - ${task.status} - tarih: ${this.formatDate(task.dueDate)}${customerName ? ` - müşteri: ${customerName}` : ""}`;
          })
        : ["Kullanıcının CRM tarafında kayıtlı görevi bulunmuyor."];

      return [
        "Bu bölüm canlı veritabanından oluşturulmuştur.",
        "Bu bölümdeki sayıları gerçek veri olarak kabul et.",
        "Bu bölümde olmayan sayıları uydurma.",
        "",
        `Kullanıcı adı: ${displayName || "bilinmiyor"}`,
        `Kullanıcı rolü: ${userRole}`,
        `Kullanıcı şehir/ilçe: ${[dbUser?.city, dbUser?.district].filter(Boolean).join(" / ") || "bilinmiyor"}`,
        `Üye kodu: ${dbUser?.memberCode || "bilinmiyor"}`,
        "",
        "Özet sayılar:",
        `- Proje sayısı: ${projectCount}`,
        `- Toplam ilan/portföy sayısı: ${unitCount}`,
        `- Aktif ilan/portföy sayısı: ${activeUnitCount}`,
        `- CRM müşteri sayısı: ${customerCount}`,
        `- CRM toplam görev sayısı: ${taskCount}`,
        `- CRM bekleyen görev sayısı: ${pendingTaskCount}`,
        `- Mesajlaşma konuşması sayısı: ${conversationCount}`,
        `- Kullanıcının gönderdiği mesaj sayısı: ${sentMessageCount}`,
        `- Okunmamış network bildirimi sayısı: ${unreadNetworkNotificationCount}`,
        `- Aktif network paylaşımı sayısı: ${networkPostCount}`,
        "",
        "Son portföy/ilan kayıtları:",
        ...unitLines,
        "",
        "Son CRM müşteri kayıtları:",
        ...customerLines,
        "",
        "Son CRM görev kayıtları:",
        ...taskLines,
        "",
        "Cevaplama kuralı:",
        "- Kullanıcı portföyümde kaç ilan var diye sorarsa Toplam ilan/portföy sayısını söyle.",
        "- Kullanıcı aktif ilan sorarsa Aktif ilan/portföy sayısını söyle.",
        "- Kullanıcı CRM veya müşteri sorarsa CRM müşteri sayısını ve son müşteri kayıtlarını referans al.",
        "- Kullanıcı görev sorarsa CRM toplam/bekleyen görev sayılarını referans al.",
        "- Veri sıfırsa bunu doğal ve profesyonel söyle; sıfır olmayan veri varsa net sayı ver.",
      ].join("\n");
    } catch (error) {
      return [
        "Canlı veritabanı bağlamı oluşturulurken hata oluştu.",
        "Bu durumda gerçek sayı uydurma.",
        `Teknik hata: ${error instanceof Error ? error.message : "UNKNOWN_LIVE_CONTEXT_ERROR"}`,
      ].join("\n");
    }
  }

  private formatMoney(value?: number | null, currency = "TRY"): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "belirtilmemiş";
    }

    return `${Math.round(value).toLocaleString("tr-TR")} ${currency}`;
  }

  private formatDate(value?: Date | null): string {
    if (!value) {
      return "belirtilmemiş";
    }

    return value.toLocaleDateString("tr-TR");
  }

  private buildRealEstateKnowledgeContext(): string {
    const knowledgeFiles = [
      ["knowledge", "Lina_Knowledge_RealEstate.md"],
      ["tasks", "Lina_Task_RealEstateLanguage.md"],
      ["tasks", "Lina_Task_Pronunciation.md"],
      ["tasks", "Lina_Task_PortfoyOlusturma.md"],
    ];

    const chunks = knowledgeFiles
      .map((relativeParts) => this.readPromptFile(relativeParts, ""))
      .filter((content) => content.trim().length > 0);

    if (!chunks.length) {
      return [
        "Emlak kütüphanesi henüz oluşturulmadı.",
        "Emlak jargonunda emin olmadığın teknik ifadeleri uydurma; kullanıcıdan kısa açıklama iste.",
      ].join("\n");
    }

    return chunks.join("\n\n---\n\n").slice(0, 18000);
  }

  private buildPersonalityLayer(): string {
    return [
      "Sen ChatGPT değilsin.",
      "Sen EPH Platform içinde çalışan Lina isimli premium dijital operasyon müdürüsün.",
      "",
      "Ana karakterin:",
      "- Sakin",
      "- Net",
      "- Kararlı",
      "- Güven veren",
      "- Sektörü bilen",
      "- Gereksiz konuşmayan",
      "- Uydurmayan",
      "- Kullanıcının işini önceleyen",
      "",
      "Davranış modelin:",
      "1. Önce risk var mı diye bak.",
      "2. Sonra fırsat var mı diye bak.",
      "3. Sonra görev veya takip var mı diye bak.",
      "4. Sonra kullanıcıyı en mantıklı aksiyona yönlendir.",
      "5. Bunların hiçbiri yoksa kısa ve dürüst cevap ver.",
      "",
      "Boş veri davranışı:",
      "- CRM kaydı yoksa CRM varmış gibi konuşma.",
      "- Görev yoksa görev üretme.",
      "- Talep yoksa talep uydurma.",
      "- Mesaj yoksa okunmamış mesaj var deme.",
      "- Portföy azsa bunu doğal söyle.",
      "- Test aşamasında veri azsa kullanıcıyı test edilebilir alanlara yönlendir.",
      "",
      "Premium boş durum örneği:",
      "Mustafa Bey, şu anda analiz edebileceğim yeterli CRM, görev veya talep verisi görünmüyor.",
      "Portföy tarafında test amaçlı birkaç kayıt üzerinden ilerleyebiliriz.",
      "İstersen önce portföy açıklama kalitesini, eksik alanları veya Lina’nın ilan yorumlama kabiliyetini test edebiliriz.",
      "",
      "Yanlış davranış:",
      "- Uzun genel tavsiyeler verme.",
      "- Platformda veri yokken günlük özet uydurma.",
      "- Sürekli soru sorarak sohbeti uzatma.",
      "- Her cevabı motivasyon konuşmasına çevirme.",
      "- “Bir yapay zeka olarak” deme.",
      "",
      "Doğru davranış:",
      "- Gerçek veri varsa özetle.",
      "- Gerçek veri yoksa bunu söyle.",
      "- Kullanıcı sinirliyse savunmaya geçme; problemi sahiplen.",
      "- Test ortamında platformu geliştirmeye odaklan.",
      "- Kısa, güçlü, operasyonel cevap ver.",
    ].join("\n");
  }

  private readPromptFile(relativeParts: string[], fallback: string): string {
    const cacheKey = relativeParts.join("/");

    if (this.promptCache.has(cacheKey)) {
      return this.promptCache.get(cacheKey) || fallback;
    }

    const possiblePaths = [
      path.join(process.cwd(), "src", "lina", ...relativeParts),
      path.join(process.cwd(), "backend", "src", "lina", ...relativeParts),
      path.join(__dirname, "..", ...relativeParts),
      path.join(__dirname, "..", "..", "src", "lina", ...relativeParts),
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8").trim();

          if (content) {
            this.promptCache.set(cacheKey, content);
            return content;
          }
        }
      } catch {
        continue;
      }
    }

    this.promptCache.set(cacheKey, fallback);
    return fallback;
  }

  private getRolePromptPath(role?: string): string[] {
    const normalizedRole = this.normalizeRole(role);

    const rolePromptMap: Record<string, string[]> = {
      EMLAKCI: ["roles", "Lina_Prompt_Emlakci.md"],
      MUTEAHHIT: ["roles", "Lina_Prompt_Muteahhit.md"],
      INSAAT_FIRMASI: ["roles", "Lina_Prompt_InsaatFirmasi.md"],
      ADMIN: ["roles", "Lina_Prompt_Admin.md"],
      SUPER_ADMIN: ["roles", "Lina_Prompt_SuperAdmin.md"],
      MODERATOR: ["roles", "Lina_Prompt_Moderator.md"],
    };

    return rolePromptMap[normalizedRole] || ["roles", "Lina_Prompt_Emlakci.md"];
  }

  private getTaskPromptPaths(sourceModule: LinaModuleName): string[][] {
    const paths: string[][] = [
      ["tasks", "Lina_Task_Memory.md"],
      ["tasks", "Lina_Task_RealEstateLanguage.md"],
      ["tasks", "Lina_Task_Pronunciation.md"],
      ["tasks", "Lina_Task_PortfoyOlusturma.md"],
      ["tasks", "Lina_Task_Validation.md"],
    ];

    const moduleTaskMap: Partial<Record<LinaModuleName, string[]>> = {
      dashboard: ["tasks", "Lina_Task_Dashboard.md"],
      crm: ["tasks", "Lina_Task_CRM.md"],
      network: ["tasks", "Lina_Task_Forum.md"],
      pool: ["tasks", "Lina_Task_Pool.md"],
      notifications: ["tasks", "Lina_Task_Notifications.md"],
      admin: ["tasks", "Lina_Task_AccessControl.md"],
      audit: ["tasks", "Lina_Task_Audit.md"],
      general: ["tasks", "Lina_Task_Dashboard.md"],
    };

    const modulePath = moduleTaskMap[sourceModule];

    if (modulePath && modulePath.join("/") !== paths[0].join("/")) {
      paths.push(modulePath);
    }

    return paths;
  }

  private async safePrepareChat(
    user: LinaApiUser | undefined,
    sourceModule: LinaModuleName,
  ): Promise<LinaPreparedChat | null> {
    if (!user?.id) {
      return null;
    }

    try {
      return await this.linaMemoryService.prepareChat(
        user.id,
        user.role,
        sourceModule,
      );
    } catch (error) {
      this.linaAuditService.log({
        userId: user.id,
        role: user.role,
        module: sourceModule,
        action: "lina_memory_prepare",
        result: "error",
        riskLevel: 1,
        reason:
          error instanceof Error
            ? error.message
            : "UNKNOWN_MEMORY_PREPARE_ERROR",
      });

      return null;
    }
  }

  private async safeRecordConversation(input: {
    preparation: LinaPreparedChat | null;
    user?: LinaApiUser;
    sourceModule: LinaModuleName;
    userMessage: string;
    assistantMessage: string;
    inputTokenCount: number;
    outputTokenCount: number;
  }): Promise<void> {
    if (!input.preparation || !input.user?.id) {
      return;
    }

    try {
      await this.linaMemoryService.recordConversation({
        sessionId: input.preparation.sessionId,
        userId: input.user.id,
        role: input.user.role,
        sourceModule: input.sourceModule,
        userMessage: input.userMessage,
        assistantMessage: input.assistantMessage,
        inputTokenCount: input.inputTokenCount,
        outputTokenCount: input.outputTokenCount,
        creditUsed: 0,
      });
    } catch (error) {
      this.linaAuditService.log({
        userId: input.user.id,
        role: input.user.role,
        module: input.sourceModule,
        action: "lina_memory_record",
        result: "error",
        riskLevel: 1,
        reason:
          error instanceof Error
            ? error.message
            : "UNKNOWN_MEMORY_RECORD_ERROR",
      });
    }
  }

  private async safeGetMemorySnapshot(
    userId?: string,
  ): Promise<LinaPromptMemorySnapshot | null> {
    try {
      return await this.linaMemoryService.getPromptMemorySnapshot(userId);
    } catch {
      return null;
    }
  }

  private buildMemoryContext(
    memorySnapshot: LinaPromptMemorySnapshot | null,
  ): string {
    if (!memorySnapshot) {
      return [
        "Kullanıcıya ait kayıtlı Lina tercih/hafıza verisi şu anda okunamadı.",
        "Hafıza verisi yoksa geçmiş bilgi uydurma.",
      ].join("\n");
    }

    return [
      "Aşağıdaki kullanıcı tercihleri ve kullanıcı onaylı hafıza kayıtlarını yalnızca yardımcı bağlam olarak kullan.",
      "Bu veri kullanıcıya özeldir; başka kullanıcılarla paylaşma.",
      "Süresi dolmuş veya kullanıcı tarafından onaylanmamış bilgi bu bağlamda bulunmaz.",
      "Bu veri yoksa veya belirsizse geçmiş bilgi uydurma.",
      "",
      JSON.stringify(memorySnapshot, null, 2).slice(0, 9000),
    ].join("\n");
  }

  private buildCurrentModuleContext(
    sourceModule: LinaModuleName,
    user?: LinaApiUser,
  ): string {
    const role = this.normalizeRole(user?.role);

    const moduleDescriptions: Record<LinaModuleName, string> = {
      dashboard:
        "Kullanıcı platform ana panelinde. Öncelik: günlük özet, acil işler, fırsatlar ve okunmamış bildirimler.",
      crm: "Kullanıcı CRM modülünde. Öncelik: müşteri takibi, görevler, randevular, geri dönüşler ve fırsat eşleştirmeleri.",
      network:
        "Kullanıcı EPH Network/forum alanında. Öncelik: talepler, paylaşımlar, görüşme başlatma ve güvenli iletişim.",
      pool: "Kullanıcı portföy/havuz alanında. Öncelik: portföy eşleşmeleri, yetki durumu, kalite ve paylaşılabilirlik.",
      notifications:
        "Kullanıcı bildirim alanında. Öncelik: mesajlar, görev hatırlatmaları ve sessiz saat tercihleri.",
      admin:
        "Kullanıcı admin alanında. Öncelik: başvurular, şikayetler, moderasyon, güvenlik ve yetki sınırları.",
      audit:
        "Kullanıcı denetim/audit alanında. Öncelik: kayıt bütünlüğü, riskler, işlem geçmişi ve güvenlik uyarıları.",
      general:
        "Genel Lina konuşması. Öncelik: kullanıcının rolüne göre en faydalı iş yönlendirmesini yapmak.",
    };

    return [
      `Kaynak modül: ${sourceModule}`,
      `Modül açıklaması: ${moduleDescriptions[sourceModule]}`,
      `Kullanıcı ID: ${user?.id || "bilinmiyor"}`,
      `Kullanıcı rolü: ${user?.role || "bilinmiyor"}`,
      `Normalize rol: ${role}`,
      `Kullanıcı e-posta: ${user?.email ? "mevcut ama gizli tutulacak" : "bilinmiyor"}`,
      "",
      "Önemli:",
      "Bu modül bağlamı sadece konumu açıklar.",
      "Burada sayı, görev, mesaj, talep veya portföy verisi yoksa bunları uydurma.",
    ].join("\n");
  }

  private getFallbackV5Constitution(): string {
    return [
      "Lina V5, EPH Platform içinde çalışan bağımsız dijital operasyon asistanıdır.",
      "Lina sakin, net, güven veren ve kullanıcının konuşma niyetine uygun cevap verir.",
      "Lina açık bir işlem talebi yoksa normal sohbet eder ve hiçbir modül akışını kendiliğinden başlatmaz.",
      "Lina yalnız açıkça başlatılmış portföy oluşturma akışında V5 Engine çıktısını uygular.",
      "Lina aynı bilgiyi tekrar sormaz.",
      "Lina her cevapta yalnızca bir sonraki eksik bilgiyi ister.",
      "Lina uzun açıklama yapmaz, motivasyon konuşmasına kaçmaz, satış temsilcisi gibi davranmaz.",
    ].join("\n");
  }

  private getFallbackCorePrompt(): string {
    return [
      "Sen EPH Platform içindeki Lina AI asistanısın.",
      "Yalnızca Türkçe yazılı ve sesli yanıt üretirsin.",
      "Kullanıcı yabancı dil isterse platform yönetimine talep iletmesini söylersin.",
      "KVKK, gizlilik, veri erişim sınırları ve platform güvenliği her şeyden önce gelir.",
      "Telefon, e-posta, açık adres, TC kimlik, IBAN, API key, token, şifre, özel müşteri notu ve özel mesaj içeriği paylaşmazsın.",
      "Başka kullanıcıların CRM, portföy, mesaj veya özel bilgilerine erişim varmış gibi davranmazsın.",
      "Cevapların profesyonel, kısa, net ve kullanıcının gerçek niyetine uygun olmalı.",
      "Kesin satış, kesin kazanç, kesin fiyat veya hukuki garanti vermezsin.",
    ].join("\n");
  }

  private getFallbackRolePrompt(role?: string): string {
    const normalizedRole = this.normalizeRole(role);

    if (normalizedRole === "ADMIN") {
      return "Admin rolünde Lina platform düzeni, başvurular, şikayetler, moderasyon ve güvenlik odağıyla çalışır. Admin sınırlarını aşan işlemlerde Yazılım Ekibi yetkisi gerektiğini belirtir.";
    }

    if (normalizedRole === "SUPER_ADMIN") {
      return "Yazılım Ekibi rolünde Lina platform sağlığı, audit log, admin denetimi, güvenlik, KVKK ve büyüme analizine odaklanır. Karar vermez, risk ve öneri sunar.";
    }

    if (normalizedRole === "MODERATOR") {
      return "Moderatör rolünde Lina içerik inceleme, şikayet değerlendirme ve raporlama desteği verir. Moderatör karar vermez, raporlar.";
    }

    if (normalizedRole === "MUTEAHHIT") {
      return "Müteahhit rolünde Lina proje satışları, arsa fırsatları, satılmayan stoklar, yatırımcı talepleri ve emlakçı iş birliklerine odaklanır.";
    }

    if (normalizedRole === "INSAAT_FIRMASI") {
      return "İnşaat firması rolünde Lina iş fırsatları, ihale/teklif, taşeron, tedarik ve operasyonel risklere odaklanır.";
    }

    return "Emlakçı rolünde Lina CRM, portföy, talep, havuz, görev ve mesajları iş fırsatına dönüştürmeye odaklanır.";
  }

  private localFallbackAnswer(message: string): string {
    return [
      "Lina şu anda yerel güvenli modda yanıt veriyor.",
      "OpenAI veya Claude API anahtarı tanımlandığında gerçek yapay zekâ yanıtları aktif olacaktır.",
      `Mesajınız alındı: "${message.slice(0, 160)}"`,
    ].join(" ");
  }

  private normalizeSourceModule(value?: string): LinaModuleName {
    const allowed: LinaModuleName[] = [
      "dashboard",
      "crm",
      "network",
      "pool",
      "notifications",
      "admin",
      "audit",
      "general",
    ];

    if (allowed.includes(value as LinaModuleName)) {
      return value as LinaModuleName;
    }

    return "general";
  }

  private normalizeRole(role?: string): string {
    return String(role || "EMLAKCI")
      .trim()
      .toUpperCase()
      .replace(/İ/g, "I")
      .replace(/İ/g, "I")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ş/g, "S")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  }

  private isForeignLanguageRequest(message: string): boolean {
    const normalized = message.toLowerCase();

    return (
      normalized.includes("english") ||
      normalized.includes("ingilizce") ||
      normalized.includes("russian") ||
      normalized.includes("rusça") ||
      normalized.includes("arabic") ||
      normalized.includes("arapça") ||
      normalized.includes("deutsch") ||
      normalized.includes("almanca") ||
      normalized.includes("can you answer in") ||
      normalized.includes("reply in english")
    );
  }
}
