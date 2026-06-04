import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LinaChatDto } from './dto/lina-chat.dto';
import { LinaVoiceDto } from './dto/lina-voice.dto';
import { LinaPreferencesDto } from './dto/lina-preferences.dto';

import { LinaAccessService, LinaAccessUser, LinaModuleName } from './lina-access.service';
import { LinaKvkkService } from './lina-kvkk.service';
import { LinaAuditService } from './lina-audit.service';
import { LinaMemoryService } from './lina-memory.service';

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
  provider: 'openai' | 'claude' | 'local';
  kvkkFiltered: boolean;
  detectedTypes: string[];
};

type LinaVoiceResponse = {
  success: boolean;
  message: string;
  provider: 'elevenlabs' | 'local';
  audioBase64?: string;
  mimeType?: string;
  kvkkFiltered: boolean;
  blockedReason?: string;
};

@Injectable()
export class LinaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly linaAccessService: LinaAccessService,
    private readonly linaKvkkService: LinaKvkkService,
    private readonly linaAuditService: LinaAuditService,
    private readonly linaMemoryService: LinaMemoryService,
  ) {}

  getStatus(): LinaStatusResponse {
    return {
      success: true,
      message: 'Lina v2 aktif. Türkçe yazılı yanıt, PostgreSQL tercih hafızası ve sesli yanıt pipeline hazır.',
      provider: this.getAiProvider(),
    };
  }

  async createTextReply(dto: LinaChatDto, user?: LinaApiUser): Promise<LinaChatResponse> {
    const message = String(dto?.message || '').trim();
    const sourceModule = this.normalizeSourceModule(dto?.sourceModule);

    if (!message) {
      return {
        success: false,
        message: 'Lina’ya iletilen mesaj boş olamaz.',
        provider: 'local',
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
        action: 'lina_chat_access',
        result: 'blocked',
        riskLevel: 3,
        reason: access.reason,
      });

      return {
        success: false,
        message: access.reason || this.linaAccessService.getUnauthorizedMessage(),
        provider: 'local',
        kvkkFiltered: false,
        detectedTypes: [],
      };
    }

    if (this.isForeignLanguageRequest(message)) {
      return {
        success: true,
        message:
          'Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir.',
        provider: 'local',
        kvkkFiltered: false,
        detectedTypes: [],
      };
    }

    const inputFilter = this.linaKvkkService.filterText(message);
    const safeUserMessage = inputFilter.safeText;

    try {
      const provider = this.getAiProvider();
      const rawAnswer =
        provider === 'claude'
          ? await this.askClaude(safeUserMessage, sourceModule, user)
          : await this.askOpenAi(safeUserMessage, sourceModule, user);

      const outputFilter = this.linaKvkkService.filterText(rawAnswer);
      const kvkkFiltered = outputFilter.filtered || inputFilter.filtered;

      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: 'lina_chat',
        result: kvkkFiltered ? 'filtered' : 'success',
        riskLevel: kvkkFiltered ? 2 : 0,
        kvkkFiltered,
      });

      return {
        success: true,
        message: outputFilter.safeText,
        provider,
        kvkkFiltered,
        detectedTypes: Array.from(new Set([...inputFilter.detectedTypes, ...outputFilter.detectedTypes])),
      };
    } catch (error) {
      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: 'lina_chat',
        result: 'error',
        riskLevel: 2,
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });

      return {
        success: false,
        message: 'Lina şu anda yanıt oluşturmakta zorlanıyor. Lütfen biraz sonra tekrar deneyin.',
        provider: 'local',
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
        message: 'Lina tercihlerini güncellemek için giriş yapmanız gerekir.',
      };
    }

    const preferences = await this.linaMemoryService.updatePreferences(user.id, dto);

    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: 'general',
      action: 'lina_preferences_update',
      result: 'success',
      riskLevel: 0,
    });

    return {
      success: true,
      message: 'Lina tercihleriniz güncellendi.',
      preferences,
    };
  }

  async resetMemory(user?: LinaApiUser) {
    if (!user?.id) {
      return {
        success: false,
        message: 'Lina hafızasını sıfırlamak için giriş yapmanız gerekir.',
      };
    }

    const preferences = await this.linaMemoryService.resetPreferences(user.id);

    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: 'general',
      action: 'lina_memory_reset',
      result: 'success',
      riskLevel: 0,
    });

    return {
      success: true,
      message: 'Kayıtlı Lina tercihlerinizi sıfırladım.',
      preferences,
    };
  }

  async createVoice(dto: LinaVoiceDto, user?: LinaApiUser): Promise<LinaVoiceResponse> {
    const text = String(dto?.text || '').trim();
    const sourceModule = this.normalizeSourceModule(dto?.sourceModule);
    const priorityLevel = dto?.priorityLevel ?? 1;

    if (!text) {
      return {
        success: false,
        message: 'Sesli yanıt için metin boş olamaz.',
        provider: 'local',
        kvkkFiltered: false,
      };
    }

    const access = this.linaAccessService.checkModuleAccess(user, sourceModule);

    if (!access.allowed) {
      return {
        success: false,
        message: access.reason || this.linaAccessService.getUnauthorizedMessage(),
        provider: 'local',
        kvkkFiltered: false,
        blockedReason: 'ACCESS_DENIED',
      };
    }

    const preferences = await this.linaMemoryService.getPreferences(user?.id);

    if (!preferences.voiceEnabled) {
      return {
        success: false,
        message: 'Sesli yanıt tercihiniz kapalı.',
        provider: 'local',
        kvkkFiltered: false,
        blockedReason: 'VOICE_DISABLED',
      };
    }

    const isQuiet = this.linaMemoryService.isQuietNow(preferences);

    if (isQuiet && priorityLevel < 4) {
      return {
        success: false,
        message: 'Sessiz saatler aktif olduğu için sesli yanıt oluşturulmadı.',
        provider: 'local',
        kvkkFiltered: false,
        blockedReason: 'QUIET_HOURS',
      };
    }

    if (isQuiet && priorityLevel >= 4 && !preferences.urgentVoiceEnabled) {
      return {
        success: false,
        message: 'Acil sesli bildirim tercihiniz kapalı.',
        provider: 'local',
        kvkkFiltered: false,
        blockedReason: 'URGENT_VOICE_DISABLED',
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
        action: 'lina_voice',
        result: filtered.filtered ? 'filtered' : 'success',
        riskLevel: filtered.filtered ? 2 : 0,
        kvkkFiltered: filtered.filtered,
        voiceGenerated: true,
      });

      return {
        success: true,
        message: filtered.safeText,
        provider: 'elevenlabs',
        audioBase64: audio.toString('base64'),
        mimeType: 'audio/mpeg',
        kvkkFiltered: filtered.filtered,
      };
    } catch (error) {
      this.linaAuditService.log({
        userId: user?.id,
        role: user?.role,
        module: sourceModule,
        action: 'lina_voice',
        result: 'error',
        riskLevel: 2,
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        kvkkFiltered: filtered.filtered,
      });

      return {
        success: false,
        message: 'Sesli yanıt şu anda oluşturulamadı. Yazılı yanıtı görüntüleyebilirsiniz.',
        provider: 'local',
        kvkkFiltered: filtered.filtered,
        blockedReason: 'VOICE_PROVIDER_ERROR',
      };
    }
  }

  private getAiProvider(): 'openai' | 'claude' {
    const provider = String(this.configService.get<string>('LINA_AI_PROVIDER') || 'openai').toLowerCase();

    if (provider === 'claude') {
      return 'claude';
    }

    return 'openai';
  }

  private async askOpenAi(message: string, sourceModule: LinaModuleName, user?: LinaApiUser): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return this.localFallbackAnswer(message);
    }

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(sourceModule, user),
          },
          {
            role: 'user',
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
    };

    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('OPENAI_EMPTY_RESPONSE');
    }

    return content;
  }

  private async askClaude(message: string, sourceModule: LinaModuleName, user?: LinaApiUser): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return this.localFallbackAnswer(message);
    }

    const model = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-haiku-latest';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.3,
        system: this.buildSystemPrompt(sourceModule, user),
        messages: [
          {
            role: 'user',
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
    };

    const content = data?.content?.find((item) => item.type === 'text')?.text?.trim();

    if (!content) {
      throw new Error('CLAUDE_EMPTY_RESPONSE');
    }

    return content;
  }

  private async askElevenLabs(text: string): Promise<Buffer> {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    const voiceId = this.configService.get<string>('ELEVENLABS_VOICE_ID');

    if (!apiKey || !voiceId) {
      throw new Error('ELEVENLABS_CONFIG_MISSING');
    }

    const modelId = this.configService.get<string>('ELEVENLABS_MODEL_ID') || 'eleven_multilingual_v2';

    const voiceText = text
      .replace(/\bEPH\b/g, 'Emlak Portföy Havuzu')
      .replace(/\beph\b/g, 'Emlak Portföy Havuzu')
      .replace(/\. /g, '.  ')
      .replace(/, /g, ',  ');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: voiceText,
        model_id: modelId,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ELEVENLABS_ERROR_${response.status}: ${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private buildSystemPrompt(sourceModule: LinaModuleName, user?: LinaApiUser): string {
    return [
      'Sen EPH Platform içindeki Lina AI asistanısın.',
      'Yalnızca Türkçe yazılı ve sesli yanıt üretirsin.',
      'Kullanıcı yabancı dil isterse platform yönetimine talep iletmesini söylersin.',
      'Telefon, e-posta, açık adres, TC kimlik, IBAN, API key, token, şifre, özel müşteri notu ve özel mesaj içeriği paylaşmazsın.',
      'Başka kullanıcıların CRM, portföy, mesaj veya özel bilgilerine erişim varmış gibi davranmazsın.',
      'Cevapların profesyonel, kısa, net ve sektör odaklı olmalı.',
      'Kesin satış, kesin kazanç, kesin fiyat veya hukuki garanti vermezsin.',
      `Kaynak modül: ${sourceModule}.`,
      `Kullanıcı rolü: ${user?.role || 'bilinmiyor'}.`,
    ].join('\n');
  }

  private localFallbackAnswer(message: string): string {
    return [
      'Lina şu anda yerel güvenli modda yanıt veriyor.',
      'OpenAI veya Claude API anahtarı tanımlandığında gerçek yapay zekâ yanıtları aktif olacaktır.',
      `Mesajınız alındı: "${message.slice(0, 160)}"`,
    ].join(' ');
  }

  private normalizeSourceModule(value?: string): LinaModuleName {
    const allowed: LinaModuleName[] = [
      'dashboard',
      'crm',
      'network',
      'pool',
      'notifications',
      'admin',
      'audit',
      'general',
    ];

    if (allowed.includes(value as LinaModuleName)) {
      return value as LinaModuleName;
    }

    return 'general';
  }

  private isForeignLanguageRequest(message: string): boolean {
    const normalized = message.toLowerCase();

    return (
      normalized.includes('english') ||
      normalized.includes('ingilizce') ||
      normalized.includes('russian') ||
      normalized.includes('rusça') ||
      normalized.includes('arabic') ||
      normalized.includes('arapça') ||
      normalized.includes('deutsch') ||
      normalized.includes('almanca') ||
      normalized.includes('can you answer in') ||
      normalized.includes('reply in english')
    );
  }
}