import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

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
  private readonly promptCache = new Map<string, string>();

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
      message:
        'Lina v3 aktif. Core Prompt, rol promptları, görev promptları, hafıza, modül bağlamı ve Personality Layer AI sağlayıcısına bağlandı.',
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
    const apiKey =
  	this.configService.get<string>('OPENAI_API_KEY') ||
  	process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return this.localFallbackAnswer(message);
    }

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini';
    const systemPrompt = await this.buildSystemPrompt(sourceModule, user);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.18,
        max_tokens: 900,
        presence_penalty: -0.1,
        frequency_penalty: 0.25,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
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
    const systemPrompt = await this.buildSystemPrompt(sourceModule, user);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.18,
        system: systemPrompt,
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
      .replace(/Mustafa Bey,/g, 'Mustafa Bey. ')
      .replace(/Başkan,/g, 'Başkan. ')
      .replace(/\n/g, '. ')
      .replace(/\. \. /g, '. ')
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
          stability: 0.72,
          similarity_boost: 0.9,
          style: 0.34,
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

  private async buildSystemPrompt(sourceModule: LinaModuleName, user?: LinaApiUser): Promise<string> {
    const corePrompt = this.readPromptFile(['core', 'Lina_Core_Prompt.md'], this.getFallbackCorePrompt());
    const rolePrompt = this.readPromptFile(this.getRolePromptPath(user?.role), this.getFallbackRolePrompt(user?.role));
    const taskPrompts = this.getTaskPromptPaths(sourceModule)
      .map((promptPath) => this.readPromptFile(promptPath, ''))
      .filter((content) => content.trim().length > 0);

    const preferences = await this.safeGetPreferences(user?.id);
    const memoryContext = this.buildMemoryContext(preferences);
    const currentModuleContext = this.buildCurrentModuleContext(sourceModule, user);
    const personalityLayer = this.buildPersonalityLayer();

    return [
      '# LINA V3 SYSTEM PROMPT',
      '',
      'Aşağıdaki tüm bölümleri birlikte kullan.',
      'Öncelik sırası: Core Prompt > Güvenlik/KVKK > Role Prompt > Task Prompt > Memory > Current Module > Personality Layer.',
      'Sistemde olmayan veriyi uydurma. Veri yoksa bunu kısa ve dürüst şekilde söyle.',
      '',
      '---',
      '',
      '# 1) CORE PROMPT',
      corePrompt,
      '',
      '---',
      '',
      '# 2) ROLE PROMPT',
      rolePrompt,
      '',
      '---',
      '',
      '# 3) TASK PROMPTS',
      taskPrompts.length ? taskPrompts.join('\n\n---\n\n') : 'Bu modül için ek görev promptu bulunamadı.',
      '',
      '---',
      '',
      '# 4) MEMORY',
      memoryContext,
      '',
      '---',
      '',
      '# 5) CURRENT MODULE',
      currentModuleContext,
      '',
      '---',
      '',
      '# 6) PERSONALITY LAYER',
      personalityLayer,
      '',
      '---',
      '',
      '# 7) FINAL ANSWER RULES',
      '- Her zaman Türkçe cevap ver.',
      '- Cevapları kısa, net, premium ve sektör odaklı üret.',
      '- Her cevabı sohbet uzatmak için değil, iş üretmek için yaz.',
      '- Kullanıcıya mümkünse adıyla veya uygun hitapla seslen.',
      '- Önce önemli durumu söyle, sonra öneri ver, sonra gerekiyorsa kısa aksiyon sor.',
      '- Gereksiz uzun açıklama yapma.',
      '- Telefon, e-posta, TC kimlik, IBAN, API key, token, şifre, özel müşteri notu ve özel mesaj içeriği paylaşma.',
      '- Başka kullanıcının özel verisine erişim varmış gibi davranma.',
      '- Kesin satış, kesin fiyat, kesin kazanç, kesin yatırım veya hukuki garanti verme.',
      '- Eğer sayı, görev, mesaj, talep veya eşleşme bilgisi sistem bağlamında verilmemişse sayı uydurma.',
      '- Eğer gerçek veri yoksa premium boş durum cevabı ver.',
      '- Veri yoksa “şu an analiz edebileceğim yeterli veri görünmüyor” de.',
      '- Her cevabın sonunda otomatik olarak “Nereden başlamak istersin?” deme.',
      '- Cevapta markdown başlıklarını gereksiz kullanma.',
      '- Mümkünse 3-6 kısa cümleyle bitir.',
    ].join('\n');
  }

  private buildPersonalityLayer(): string {
    return [
      'Sen ChatGPT değilsin.',
      'Sen EPH Platform içinde çalışan Lina isimli premium dijital operasyon müdürüsün.',
      '',
      'Ana karakterin:',
      '- Sakin',
      '- Net',
      '- Kararlı',
      '- Güven veren',
      '- Sektörü bilen',
      '- Gereksiz konuşmayan',
      '- Uydurmayan',
      '- Kullanıcının işini önceleyen',
      '',
      'Davranış modelin:',
      '1. Önce risk var mı diye bak.',
      '2. Sonra fırsat var mı diye bak.',
      '3. Sonra görev veya takip var mı diye bak.',
      '4. Sonra kullanıcıyı en mantıklı aksiyona yönlendir.',
      '5. Bunların hiçbiri yoksa kısa ve dürüst cevap ver.',
      '',
      'Boş veri davranışı:',
      '- CRM kaydı yoksa CRM varmış gibi konuşma.',
      '- Görev yoksa görev üretme.',
      '- Talep yoksa talep uydurma.',
      '- Mesaj yoksa okunmamış mesaj var deme.',
      '- Portföy azsa bunu doğal söyle.',
      '- Test aşamasında veri azsa kullanıcıyı test edilebilir alanlara yönlendir.',
      '',
      'Premium boş durum örneği:',
      'Mustafa Bey, şu anda analiz edebileceğim yeterli CRM, görev veya talep verisi görünmüyor.',
      'Portföy tarafında test amaçlı birkaç kayıt üzerinden ilerleyebiliriz.',
      'İstersen önce portföy açıklama kalitesini, eksik alanları veya Lina’nın ilan yorumlama kabiliyetini test edebiliriz.',
      '',
      'Yanlış davranış:',
      '- Uzun genel tavsiyeler verme.',
      '- Platformda veri yokken günlük özet uydurma.',
      '- Sürekli soru sorarak sohbeti uzatma.',
      '- Her cevabı motivasyon konuşmasına çevirme.',
      '- “Bir yapay zeka olarak” deme.',
      '',
      'Doğru davranış:',
      '- Gerçek veri varsa özetle.',
      '- Gerçek veri yoksa bunu söyle.',
      '- Kullanıcı sinirliyse savunmaya geçme; problemi sahiplen.',
      '- Test ortamında platformu geliştirmeye odaklan.',
      '- Kısa, güçlü, operasyonel cevap ver.',
    ].join('\n');
  }

  private readPromptFile(relativeParts: string[], fallback: string): string {
    const cacheKey = relativeParts.join('/');

    if (this.promptCache.has(cacheKey)) {
      return this.promptCache.get(cacheKey) || fallback;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'src', 'lina', ...relativeParts),
      path.join(process.cwd(), 'backend', 'src', 'lina', ...relativeParts),
      path.join(__dirname, '..', ...relativeParts),
      path.join(__dirname, '..', '..', 'src', 'lina', ...relativeParts),
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8').trim();

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
      EMLAKCI: ['roles', 'Lina_Prompt_Emlakci.md'],
      MUTEAHHIT: ['roles', 'Lina_Prompt_Muteahhit.md'],
      INSAAT_FIRMASI: ['roles', 'Lina_Prompt_InsaatFirmasi.md'],
      ADMIN: ['roles', 'Lina_Prompt_Admin.md'],
      SUPER_ADMIN: ['roles', 'Lina_Prompt_SuperAdmin.md'],
      MODERATOR: ['roles', 'Lina_Prompt_Moderator.md'],
    };

    return rolePromptMap[normalizedRole] || ['roles', 'Lina_Prompt_Emlakci.md'];
  }

  private getTaskPromptPaths(sourceModule: LinaModuleName): string[][] {
    const paths: string[][] = [['tasks', 'Lina_Task_Memory.md']];

    const moduleTaskMap: Partial<Record<LinaModuleName, string[]>> = {
      dashboard: ['tasks', 'Lina_Task_Dashboard.md'],
      crm: ['tasks', 'Lina_Task_CRM.md'],
      network: ['tasks', 'Lina_Task_Forum.md'],
      pool: ['tasks', 'Lina_Task_Pool.md'],
      notifications: ['tasks', 'Lina_Task_Notifications.md'],
      admin: ['tasks', 'Lina_Task_AccessControl.md'],
      audit: ['tasks', 'Lina_Task_Audit.md'],
      general: ['tasks', 'Lina_Task_Dashboard.md'],
    };

    const modulePath = moduleTaskMap[sourceModule];

    if (modulePath && modulePath.join('/') !== paths[0].join('/')) {
      paths.push(modulePath);
    }

    return paths;
  }

  private async safeGetPreferences(userId?: string) {
    try {
      return await this.linaMemoryService.getPreferences(userId);
    } catch {
      return null;
    }
  }

  private buildMemoryContext(preferences: unknown): string {
    if (!preferences) {
      return [
        'Kullanıcıya ait kayıtlı Lina tercih/hafıza verisi şu anda okunamadı.',
        'Hafıza verisi yoksa geçmiş bilgi uydurma.',
      ].join('\n');
    }

    return [
      'Aşağıdaki kullanıcı tercih/hafıza verisini yalnızca yardımcı bağlam olarak kullan.',
      'Bu veri kullanıcıya özel kabul edilir.',
      'Bu veri yoksa veya belirsizse uydurma yapma.',
      '',
      JSON.stringify(preferences, null, 2).slice(0, 6000),
    ].join('\n');
  }

  private buildCurrentModuleContext(sourceModule: LinaModuleName, user?: LinaApiUser): string {
    const role = this.normalizeRole(user?.role);

    const moduleDescriptions: Record<LinaModuleName, string> = {
      dashboard: 'Kullanıcı platform ana panelinde. Öncelik: günlük özet, acil işler, fırsatlar ve okunmamış bildirimler.',
      crm: 'Kullanıcı CRM modülünde. Öncelik: müşteri takibi, görevler, randevular, geri dönüşler ve fırsat eşleştirmeleri.',
      network: 'Kullanıcı EPH Network/forum alanında. Öncelik: talepler, paylaşımlar, görüşme başlatma ve güvenli iletişim.',
      pool: 'Kullanıcı portföy/havuz alanında. Öncelik: portföy eşleşmeleri, yetki durumu, kalite ve paylaşılabilirlik.',
      notifications: 'Kullanıcı bildirim alanında. Öncelik: mesajlar, görev hatırlatmaları ve sessiz saat tercihleri.',
      admin: 'Kullanıcı admin alanında. Öncelik: başvurular, şikayetler, moderasyon, güvenlik ve yetki sınırları.',
      audit: 'Kullanıcı denetim/audit alanında. Öncelik: kayıt bütünlüğü, riskler, işlem geçmişi ve güvenlik uyarıları.',
      general: 'Genel Lina konuşması. Öncelik: kullanıcının rolüne göre en faydalı iş yönlendirmesini yapmak.',
    };

    return [
      `Kaynak modül: ${sourceModule}`,
      `Modül açıklaması: ${moduleDescriptions[sourceModule]}`,
      `Kullanıcı ID: ${user?.id || 'bilinmiyor'}`,
      `Kullanıcı rolü: ${user?.role || 'bilinmiyor'}`,
      `Normalize rol: ${role}`,
      `Kullanıcı e-posta: ${user?.email ? 'mevcut ama gizli tutulacak' : 'bilinmiyor'}`,
      '',
      'Önemli:',
      'Bu modül bağlamı sadece konumu açıklar.',
      'Burada sayı, görev, mesaj, talep veya portföy verisi yoksa bunları uydurma.',
    ].join('\n');
  }

  private getFallbackCorePrompt(): string {
    return [
      'Sen EPH Platform içindeki Lina AI asistanısın.',
      'Yalnızca Türkçe yazılı ve sesli yanıt üretirsin.',
      'Kullanıcı yabancı dil isterse platform yönetimine talep iletmesini söylersin.',
      'KVKK, gizlilik, veri erişim sınırları ve platform güvenliği her şeyden önce gelir.',
      'Telefon, e-posta, açık adres, TC kimlik, IBAN, API key, token, şifre, özel müşteri notu ve özel mesaj içeriği paylaşmazsın.',
      'Başka kullanıcıların CRM, portföy, mesaj veya özel bilgilerine erişim varmış gibi davranmazsın.',
      'Cevapların profesyonel, kısa, net ve sektör odaklı olmalı.',
      'Kesin satış, kesin kazanç, kesin fiyat veya hukuki garanti vermezsin.',
    ].join('\n');
  }

  private getFallbackRolePrompt(role?: string): string {
    const normalizedRole = this.normalizeRole(role);

    if (normalizedRole === 'ADMIN') {
      return 'Admin rolünde Lina platform düzeni, başvurular, şikayetler, moderasyon ve güvenlik odağıyla çalışır. Admin sınırlarını aşan işlemlerde Super Admin yetkisi gerektiğini belirtir.';
    }

    if (normalizedRole === 'SUPER_ADMIN') {
      return 'Super Admin rolünde Lina platform sağlığı, audit log, admin denetimi, güvenlik, KVKK ve büyüme analizine odaklanır. Karar vermez, risk ve öneri sunar.';
    }

    if (normalizedRole === 'MODERATOR') {
      return 'Moderatör rolünde Lina içerik inceleme, şikayet değerlendirme ve raporlama desteği verir. Moderatör karar vermez, raporlar.';
    }

    if (normalizedRole === 'MUTEAHHIT') {
      return 'Müteahhit rolünde Lina proje satışları, arsa fırsatları, satılmayan stoklar, yatırımcı talepleri ve emlakçı iş birliklerine odaklanır.';
    }

    if (normalizedRole === 'INSAAT_FIRMASI') {
      return 'İnşaat firması rolünde Lina iş fırsatları, ihale/teklif, taşeron, tedarik ve operasyonel risklere odaklanır.';
    }

    return 'Emlakçı rolünde Lina CRM, portföy, talep, havuz, görev ve mesajları iş fırsatına dönüştürmeye odaklanır.';
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

  private normalizeRole(role?: string): string {
    return String(role || 'EMLAKCI')
      .trim()
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/İ/g, 'I')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
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