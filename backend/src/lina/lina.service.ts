import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { LinaV7PromptService } from "./v7/lina-v7-prompt.service";
import { LinaOpenAiLiveGatewayService } from "./openai-tools/lina-openai-live-gateway.service";
import { LinaConversationMessage } from "./openai-tools/lina-openai-response.types";
import { LinaToolSourceModule } from "./openai-tools/lina-tool.types";

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
  provider: "openai" | "local";
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
  provider: "openai" | "local";
  inputTokens: number;
  outputTokens: number;
};

@Injectable()
export class LinaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly linaAccessService: LinaAccessService,
    private readonly linaKvkkService: LinaKvkkService,
    private readonly linaAuditService: LinaAuditService,
    private readonly linaMemoryService: LinaMemoryService,
    private readonly linaPortfolioSessionService: LinaPortfolioSessionService,
    private readonly linaPortfolioEngineService: LinaPortfolioEngineService,
    private readonly linaV7PromptService: LinaV7PromptService,
    private readonly linaOpenAiLiveGatewayService: LinaOpenAiLiveGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  getStatus(): LinaStatusResponse {
    return {
      success: true,
      message:
        "Lina V7 aktif. OpenAI konuşma katmanı; EPH backend karar motoru, canlı veri bağlamı, hafıza ve portföy işlem bağlamıyla birlikte çalışıyor.",
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
    const deterministicPortfolioReply =
      this.extractPortfolioExactReply(portfolioRuntimeContext);

    try {
      const providerAnswer = await this.askOpenAi(
        safeUserMessage,
        sourceModule,
        user,
        portfolioRuntimeContext,
        chatPreparation?.history || [],
        chatPreparation?.memorySnapshot,
      );
      const provider = providerAnswer.provider;
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
      if (deterministicPortfolioReply) {
        const outputFilter = this.linaKvkkService.filterText(
          deterministicPortfolioReply,
        );
        const kvkkFiltered =
          outputFilter.filtered || inputFilter.filtered;

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
          inputTokenCount: 0,
          outputTokenCount: 0,
        });

        this.linaAuditService.log({
          userId: user?.id,
          role: user?.role,
          module: sourceModule,
          action: "lina_portfolio_flow_fallback",
          result: kvkkFiltered ? "filtered" : "success",
          riskLevel: kvkkFiltered ? 2 : 1,
          reason:
            error instanceof Error ? error.message : "UNKNOWN_ERROR",
          kvkkFiltered,
        });

        return {
          success: true,
          message: outputFilter.safeText,
          provider: "local",
          kvkkFiltered,
          detectedTypes: Array.from(
            new Set([
              ...inputFilter.detectedTypes,
              ...outputFilter.detectedTypes,
            ]),
          ),
        };
      }

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

  private getAiProvider(): "openai" {
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
    const systemPrompt = await this.buildSystemPrompt(
      sourceModule,
      user,
      portfolioRuntimeContext,
      memorySnapshot,
    );

    const normalizedHistory: LinaConversationMessage[] = history
      .filter((item) =>
        Boolean(item?.content?.trim()),
      )
      .map(
        (item): LinaConversationMessage => ({
          role:
            item.role === "assistant"
              ? "assistant"
              : "user",
          content: item.content.trim(),
        }),
      )
      .slice(-20);

    const gatewayResult =
      await this.linaOpenAiLiveGatewayService.run({
        message,
        instructions: systemPrompt,
        identity: {
          id: user?.id,
          role: user?.role,
          email: user?.email,
        },
        sourceModule:
          this.normalizeToolSourceModule(
            sourceModule,
          ),
        history: normalizedHistory,
      });

    if (
      gatewayResult.status ===
      "approval_required"
    ) {
      const toolName =
        gatewayResult.pendingApproval
          ?.toolName || "unknown";

      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action:
          "lina_tool_approval_required",
        result: "blocked",
        riskLevel: 2,
        reason: toolName,
      });

      throw new Error(
        `LINA_TOOL_APPROVAL_REQUIRED:${toolName}`,
      );
    }

    return {
      content: gatewayResult.content,
      provider:
        gatewayResult.provider ===
        "local"
          ? "local"
          : "openai",
      inputTokens:
        gatewayResult.inputTokens,
      outputTokens:
        gatewayResult.outputTokens,
    };
  }

  private async askElevenLabs(text: string): Promise<Buffer> {
    const apiKey =
      this.configService.get<string>("ELEVENLABS_API_KEY") ||
      process.env.ELEVENLABS_API_KEY;
    // Lina Fixed Voice V2
    const voiceId =
      this.configService.get<string>("LINA_FIXED_VOICE_ID") ||
      process.env.LINA_FIXED_VOICE_ID ||
      this.configService.get<string>("ELEVENLABS_VOICE_ID") ||
      process.env.ELEVENLABS_VOICE_ID;
    const modelId = "eleven_multilingual_v2";
    const voiceSeed = 20260628;

    if (!apiKey || !voiceId) {
      throw new Error("ELEVENLABS_CONFIG_MISSING");
    }

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
          language_code: "tr",
          seed: voiceSeed,
          voice_settings: {
            stability: 0.88,
            similarity_boost: 0.95,
            style: 0,
            use_speaker_boost: true,
            speed: 1.03,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        "[LINA_FIXED_VOICE_V2_BACKEND_ERROR]",
        response.status,
        detail,
      );
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
        "PORTFÖY KONUŞMA KURALLARI",
        "- PORTFOLIO_EXACT_REPLY, backend motorunun önerdiği güvenli işlem yönlendirmesidir.",
        "- Önerinin anlamını, sıradaki eksik alan kararını ve doğrulama sonucunu koru; cümleyi doğal Türkçe ile ifade edebilirsin.",
        "- Backend motorunun zorunlu, isteğe bağlı veya uygulanamaz alan kararını değiştirme.",
        "- Kullanıcının daha önce verdiği bilgileri tekrar isteme.",
        "- Kullanıcı tek mesajda birden fazla bilgi verdiyse bunları yok sayma.",
        "- Mülk tipine uygulanmayan alanı sorma.",
        "- Villa için daire ifadesi kullanma.",
        "- Her cevaba 'Kaydettim' diyerek başlama.",
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

    if (
      session.step === "SUMMARY" ||
      session.step === "CONFIRMATION"
    ) {
      return /^(evet|hayir|onayliyorum|onaylamiyorum|onayla|tamam|dogru|yanlis|duzelt|iptal)$/.test(
        normalizedMessage,
      );
    }

    const wordCount = normalizedMessage.split(" ").filter(Boolean).length;

    return (
      normalizedMessage.length <= 180 &&
      wordCount >= 1 &&
      wordCount <= 20
    );
  }

  private extractPortfolioExactReply(
    runtimeContext: string,
  ): string | null {
    const match = String(runtimeContext || "").match(
      /PORTFOLIO_EXACT_REPLY_START\s*([\s\S]*?)\s*PORTFOLIO_EXACT_REPLY_END/,
    );

    const reply = match?.[1]?.trim();

    return reply || null;
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
    const resolvedMemorySnapshot =
      memorySnapshot || (await this.safeGetMemorySnapshot(user?.id));
    const memoryContext = this.buildMemoryContext(resolvedMemorySnapshot);
    const liveDatabaseContext = await this.buildLiveDatabaseContext(user);

    return this.linaV7PromptService.buildSystemPrompt({
      sourceModule,
      user,
      liveDatabaseContext,
      memoryContext,
      portfolioRuntimeContext,
    });
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

  private localFallbackAnswer(message: string): string {
    return [
      "Lina şu anda yerel güvenli modda yanıt veriyor.",
      "OpenAI bağlantısı yeniden kullanılabilir olduğunda doğal yanıt üretimi devam edecektir.",
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

  private normalizeToolSourceModule(
    sourceModule: LinaModuleName,
  ): LinaToolSourceModule {
    if (sourceModule === "audit") {
      return "admin";
    }

    const allowed:
      LinaToolSourceModule[] = [
      "dashboard",
      "crm",
      "network",
      "pool",
      "notifications",
      "general",
      "admin",
    ];

    return allowed.includes(
      sourceModule as LinaToolSourceModule,
    )
      ? sourceModule as LinaToolSourceModule
      : "general";
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
