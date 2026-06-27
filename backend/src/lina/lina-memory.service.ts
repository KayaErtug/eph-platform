import { Injectable } from "@nestjs/common";
import { LinaDurum, LinaKanal, LinaModul } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { LinaPreferencesDto } from "./dto/lina-preferences.dto";

type LinaSummaryStyle = "short" | "normal" | "detailed";

type PrismaLinaPreferenceClient = {
  linaPreference: {
    findUnique(args: {
      where: { userId: string };
    }): Promise<LinaPreferenceRecord | null>;
    upsert(args: {
      where: { userId: string };
      create: LinaPreferenceCreateInput;
      update: LinaPreferenceUpdateInput;
    }): Promise<LinaPreferenceRecord>;
  };
};

type LinaPreferenceRecord = {
  userId: string;
  voiceEnabled: boolean;
  dashboardVoiceSummaryEnabled: boolean;
  crmVoiceReminderEnabled: boolean;
  networkVoiceSummaryEnabled: boolean;
  poolVoiceSummaryEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  urgentVoiceEnabled: boolean;
  summaryStyle: string;
  updatedAt: Date;
};

type LinaPreferenceCreateInput = {
  userId: string;
  voiceEnabled: boolean;
  dashboardVoiceSummaryEnabled: boolean;
  crmVoiceReminderEnabled: boolean;
  networkVoiceSummaryEnabled: boolean;
  poolVoiceSummaryEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  urgentVoiceEnabled: boolean;
  summaryStyle: LinaSummaryStyle;
};

type LinaPreferenceUpdateInput = {
  voiceEnabled?: boolean;
  dashboardVoiceSummaryEnabled?: boolean;
  crmVoiceReminderEnabled?: boolean;
  networkVoiceSummaryEnabled?: boolean;
  poolVoiceSummaryEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  urgentVoiceEnabled?: boolean;
  summaryStyle?: LinaSummaryStyle;
};

export type LinaMemoryPreference = LinaPreferencesDto & {
  userId?: string;
  updatedAt: string;
};

export type LinaHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LinaPromptMemorySnapshot = {
  preferences: LinaMemoryPreference;
  sessionSummary: string | null;
  memories: Array<{
    id: string;
    layer: string;
    importance: string;
    title: string;
    content: string;
    data: unknown;
    permanent: boolean;
    sourceModule: string;
    expiresAt: string | null;
    updatedAt: string;
  }>;
};

export type LinaPreparedChat = {
  sessionId: string;
  history: LinaHistoryMessage[];
  memorySnapshot: LinaPromptMemorySnapshot;
};

type RecordConversationInput = {
  sessionId: string;
  userId: string;
  role?: string;
  sourceModule?: string;
  userMessage: string;
  assistantMessage: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
  creditUsed?: number;
};

@Injectable()
export class LinaMemoryService {
  private readonly sessionTimeoutMs = 12 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  getDefaultPreferences(userId?: string): LinaMemoryPreference {
    return {
      userId,
      voiceEnabled: false,
      dashboardVoiceSummaryEnabled: false,
      crmVoiceReminderEnabled: false,
      networkVoiceSummaryEnabled: false,
      poolVoiceSummaryEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      urgentVoiceEnabled: false,
      summaryStyle: "normal",
      updatedAt: new Date().toISOString(),
    };
  }

  async getPreferences(userId?: string): Promise<LinaMemoryPreference> {
    if (!userId) {
      return this.getDefaultPreferences();
    }

    const preferences = await this.client.linaPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      return this.getDefaultPreferences(userId);
    }

    return this.mapPreference(preferences);
  }

  async updatePreferences(
    userId: string,
    dto: LinaPreferencesDto,
  ): Promise<LinaMemoryPreference> {
    const defaults = this.getDefaultPreferences(userId);

    const preferences = await this.client.linaPreference.upsert({
      where: { userId },
      create: {
        userId,
        voiceEnabled: dto.voiceEnabled ?? defaults.voiceEnabled ?? false,
        dashboardVoiceSummaryEnabled:
          dto.dashboardVoiceSummaryEnabled ??
          defaults.dashboardVoiceSummaryEnabled ??
          false,
        crmVoiceReminderEnabled:
          dto.crmVoiceReminderEnabled ??
          defaults.crmVoiceReminderEnabled ??
          false,
        networkVoiceSummaryEnabled:
          dto.networkVoiceSummaryEnabled ??
          defaults.networkVoiceSummaryEnabled ??
          false,
        poolVoiceSummaryEnabled:
          dto.poolVoiceSummaryEnabled ??
          defaults.poolVoiceSummaryEnabled ??
          false,
        quietHoursEnabled:
          dto.quietHoursEnabled ?? defaults.quietHoursEnabled ?? true,
        quietHoursStart:
          dto.quietHoursStart ?? defaults.quietHoursStart ?? "22:00",
        quietHoursEnd: dto.quietHoursEnd ?? defaults.quietHoursEnd ?? "08:00",
        urgentVoiceEnabled:
          dto.urgentVoiceEnabled ?? defaults.urgentVoiceEnabled ?? false,
        summaryStyle: this.normalizeSummaryStyle(
          dto.summaryStyle ?? defaults.summaryStyle,
        ),
      },
      update: this.cleanUpdateInput({
        voiceEnabled: dto.voiceEnabled,
        dashboardVoiceSummaryEnabled: dto.dashboardVoiceSummaryEnabled,
        crmVoiceReminderEnabled: dto.crmVoiceReminderEnabled,
        networkVoiceSummaryEnabled: dto.networkVoiceSummaryEnabled,
        poolVoiceSummaryEnabled: dto.poolVoiceSummaryEnabled,
        quietHoursEnabled: dto.quietHoursEnabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        urgentVoiceEnabled: dto.urgentVoiceEnabled,
        summaryStyle: this.normalizeOptionalSummaryStyle(dto.summaryStyle),
      }),
    });

    return this.mapPreference(preferences);
  }

  async resetPreferences(userId: string): Promise<LinaMemoryPreference> {
    const preferences = await this.client.linaPreference.upsert({
      where: { userId },
      create: {
        userId,
        voiceEnabled: false,
        dashboardVoiceSummaryEnabled: false,
        crmVoiceReminderEnabled: false,
        networkVoiceSummaryEnabled: false,
        poolVoiceSummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        urgentVoiceEnabled: false,
        summaryStyle: "normal",
      },
      update: {
        voiceEnabled: false,
        dashboardVoiceSummaryEnabled: false,
        crmVoiceReminderEnabled: false,
        networkVoiceSummaryEnabled: false,
        poolVoiceSummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        urgentVoiceEnabled: false,
        summaryStyle: "normal",
      },
    });

    return this.mapPreference(preferences);
  }

  async prepareChat(
    userId: string,
    role?: string,
    sourceModule?: string,
  ): Promise<LinaPreparedChat> {
    const session = await this.getOrCreateSession(userId, role, sourceModule);
    const [history, memorySnapshot] = await Promise.all([
      this.getRecentConversationHistory(session.id),
      this.getPromptMemorySnapshot(userId, session.oturumOzeti),
    ]);

    return {
      sessionId: session.id,
      history,
      memorySnapshot,
    };
  }

  async getPromptMemorySnapshot(
    userId?: string,
    sessionSummary: string | null = null,
  ): Promise<LinaPromptMemorySnapshot> {
    const preferences = await this.getPreferences(userId);

    if (!userId) {
      return {
        preferences,
        sessionSummary,
        memories: [],
      };
    }

    const now = new Date();
    const memories = await this.prisma.linaHafiza.findMany({
      where: {
        kullaniciId: userId,
        aktifMi: true,
        kullaniciOnayliMi: true,
        silinmeTarihi: null,
        OR: [{ kaliciMi: true }, { gecerlilikTarihi: { gte: now } }],
      },
      orderBy: [{ kaliciMi: "desc" }, { guncellenmeTarihi: "desc" }],
      take: 25,
      select: {
        id: true,
        katman: true,
        onem: true,
        baslik: true,
        icerik: true,
        veri: true,
        kaliciMi: true,
        kaynakModul: true,
        gecerlilikTarihi: true,
        guncellenmeTarihi: true,
      },
    });

    return {
      preferences,
      sessionSummary,
      memories: memories.map((memory) => ({
        id: memory.id,
        layer: memory.katman,
        importance: memory.onem,
        title: memory.baslik,
        content: memory.icerik,
        data: memory.veri,
        permanent: memory.kaliciMi,
        sourceModule: memory.kaynakModul,
        expiresAt: memory.gecerlilikTarihi?.toISOString() ?? null,
        updatedAt: memory.guncellenmeTarihi.toISOString(),
      })),
    };
  }

  async recordConversation(input: RecordConversationInput): Promise<void> {
    const now = new Date();
    const module = this.mapSourceModule(input.sourceModule);
    const inputTokens = this.normalizeCount(input.inputTokenCount);
    const outputTokens = this.normalizeCount(input.outputTokenCount);
    const creditUsed = this.normalizeCount(input.creditUsed);
    const sessionSummary = this.buildSessionSummary(
      input.userMessage,
      input.assistantMessage,
    );

    await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.linaOturum.update({
        where: { id: input.sessionId },
        data: {
          rolSnapshot: input.role,
          kaynakModul: module,
          durum: LinaDurum.ISLENIYOR,
          oturumOzeti: sessionSummary,
          mesajSayisi: { increment: 1 },
          inputTokenSayisi: { increment: inputTokens },
          outputTokenSayisi: { increment: outputTokens },
          harcananKontor: { increment: creditUsed },
          sonAktiviteTarihi: now,
          gecerlilikTarihi: new Date(now.getTime() + this.sessionTimeoutMs),
        },
        select: {
          mesajSayisi: true,
        },
      });

      await tx.linaKonusma.create({
        data: {
          kullaniciId: input.userId,
          oturumId: input.sessionId,
          siraNo: updatedSession.mesajSayisi,
          rol: input.role,
          kanal: LinaKanal.YAZILI,
          modul: module,
          kullaniciMesaji: input.userMessage,
          linaCevabi: input.assistantMessage,
          ozet: sessionSummary,
          inputTokenSayisi: inputTokens,
          outputTokenSayisi: outputTokens,
          harcananKontor: creditUsed,
          durum: LinaDurum.TAMAMLANDI,
        },
      });
    });
  }

  async clearUserMemory(userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.linaHafiza.updateMany({
        where: {
          kullaniciId: userId,
          silinmeTarihi: null,
        },
        data: {
          aktifMi: false,
          silinmeTarihi: now,
        },
      }),
      this.prisma.linaKonusma.updateMany({
        where: {
          kullaniciId: userId,
          silinmeTarihi: null,
        },
        data: {
          silinmeTarihi: now,
        },
      }),
      this.prisma.linaOturum.updateMany({
        where: {
          kullaniciId: userId,
          silinmeTarihi: null,
        },
        data: {
          durum: LinaDurum.IPTAL,
          kapanmaTarihi: now,
          silinmeTarihi: now,
        },
      }),
      this.prisma.linaGunSonuOnayi.deleteMany({
        where: {
          kullaniciId: userId,
        },
      }),
    ]);
  }

  isQuietNow(preferences: LinaMemoryPreference, now = new Date()): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const start = preferences.quietHoursStart || "22:00";
    const end = preferences.quietHoursEnd || "08:00";

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = this.toMinutes(start);
    const endMinutes = this.toMinutes(end);

    if (startMinutes === endMinutes) {
      return false;
    }

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  private async getOrCreateSession(
    userId: string,
    role?: string,
    sourceModule?: string,
  ) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.sessionTimeoutMs);
    const module = this.mapSourceModule(sourceModule);

    await this.prisma.linaOturum.updateMany({
      where: {
        kullaniciId: userId,
        durum: LinaDurum.ISLENIYOR,
        silinmeTarihi: null,
        sonAktiviteTarihi: { lt: cutoff },
      },
      data: {
        durum: LinaDurum.TAMAMLANDI,
        kapanmaTarihi: now,
      },
    });

    const existingSession = await this.prisma.linaOturum.findFirst({
      where: {
        kullaniciId: userId,
        durum: LinaDurum.ISLENIYOR,
        silinmeTarihi: null,
        sonAktiviteTarihi: { gte: cutoff },
      },
      orderBy: {
        sonAktiviteTarihi: "desc",
      },
    });

    if (existingSession) {
      return this.prisma.linaOturum.update({
        where: { id: existingSession.id },
        data: {
          rolSnapshot: role,
          kaynakModul: module,
          sonAktiviteTarihi: now,
          gecerlilikTarihi: new Date(now.getTime() + this.sessionTimeoutMs),
        },
      });
    }

    return this.prisma.linaOturum.create({
      data: {
        kullaniciId: userId,
        rolSnapshot: role,
        kanal: LinaKanal.YAZILI,
        kaynakModul: module,
        durum: LinaDurum.ISLENIYOR,
        sonAktiviteTarihi: now,
        gecerlilikTarihi: new Date(now.getTime() + this.sessionTimeoutMs),
      },
    });
  }

  private async getRecentConversationHistory(
    sessionId: string,
  ): Promise<LinaHistoryMessage[]> {
    const conversations = await this.prisma.linaKonusma.findMany({
      where: {
        oturumId: sessionId,
        silinmeTarihi: null,
        linaCevabi: { not: null },
      },
      orderBy: {
        olusturulmaTarihi: "desc",
      },
      take: 8,
      select: {
        kullaniciMesaji: true,
        linaCevabi: true,
      },
    });

    return conversations.reverse().flatMap((conversation) => {
      const messages: LinaHistoryMessage[] = [
        {
          role: "user",
          content: conversation.kullaniciMesaji,
        },
      ];

      if (conversation.linaCevabi) {
        messages.push({
          role: "assistant",
          content: conversation.linaCevabi,
        });
      }

      return messages;
    });
  }

  private get client(): PrismaLinaPreferenceClient {
    return this.prisma as unknown as PrismaLinaPreferenceClient;
  }

  private mapPreference(
    preferences: LinaPreferenceRecord,
  ): LinaMemoryPreference {
    return {
      userId: preferences.userId,
      voiceEnabled: preferences.voiceEnabled,
      dashboardVoiceSummaryEnabled: preferences.dashboardVoiceSummaryEnabled,
      crmVoiceReminderEnabled: preferences.crmVoiceReminderEnabled,
      networkVoiceSummaryEnabled: preferences.networkVoiceSummaryEnabled,
      poolVoiceSummaryEnabled: preferences.poolVoiceSummaryEnabled,
      quietHoursEnabled: preferences.quietHoursEnabled,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      urgentVoiceEnabled: preferences.urgentVoiceEnabled,
      summaryStyle: this.normalizeSummaryStyle(preferences.summaryStyle),
      updatedAt: preferences.updatedAt.toISOString(),
    };
  }

  private cleanUpdateInput(
    input: LinaPreferenceUpdateInput,
  ): LinaPreferenceUpdateInput {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as LinaPreferenceUpdateInput;
  }

  private normalizeOptionalSummaryStyle(
    value?: string,
  ): LinaSummaryStyle | undefined {
    if (!value) {
      return undefined;
    }

    return this.normalizeSummaryStyle(value);
  }

  private normalizeSummaryStyle(value?: string): LinaSummaryStyle {
    if (value === "short" || value === "normal" || value === "detailed") {
      return value;
    }

    return "normal";
  }

  private mapSourceModule(value?: string): LinaModul {
    const normalized = String(value || "general").toLowerCase();

    const moduleMap: Record<string, LinaModul> = {
      dashboard: LinaModul.GENEL,
      crm: LinaModul.CRM,
      network: LinaModul.FORUM,
      pool: LinaModul.HAVUZ,
      notifications: LinaModul.BILDIRIM,
      admin: LinaModul.YETKI,
      audit: LinaModul.DENETIM,
      general: LinaModul.GENEL,
    };

    return moduleMap[normalized] || LinaModul.GENEL;
  }

  private buildSessionSummary(
    userMessage: string,
    assistantMessage: string,
  ): string {
    return [
      `Kullanıcı: ${String(userMessage || "").trim()}`,
      `Lina: ${String(assistantMessage || "").trim()}`,
    ]
      .join("\n")
      .slice(0, 1500);
  }

  private normalizeCount(value?: number): number {
    if (!Number.isFinite(value) || !value || value < 0) {
      return 0;
    }

    return Math.floor(value);
  }

  private toMinutes(value: string): number {
    const [hourRaw, minuteRaw] = String(value || "00:00").split(":");
    const hour = Number(hourRaw || 0);
    const minute = Number(minuteRaw || 0);

    return hour * 60 + minute;
  }
}
