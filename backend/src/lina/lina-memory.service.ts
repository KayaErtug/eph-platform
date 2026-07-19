import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LinaDurum,
  LinaGunSonuSecimi,
  LinaHafizaKatmani,
  LinaHafizaOnemi,
  LinaKanal,
  LinaModul,
} from "@prisma/client";

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

  async getMemoryCenter(userId: string) {
    await this.expireThirtyDayMemories(userId);

    const [memories, endOfDay] = await Promise.all([
      this.prisma.linaHafiza.findMany({
        where: {
          kullaniciId: userId,
          aktifMi: true,
          kullaniciOnayliMi: true,
          silinmeTarihi: null,
          OR: [
            { kaliciMi: true },
            { gecerlilikTarihi: { gte: new Date() } },
          ],
        },
        orderBy: [
          { kaliciMi: "desc" },
          { guncellenmeTarihi: "desc" },
        ],
        select: {
          id: true,
          katman: true,
          onem: true,
          baslik: true,
          icerik: true,
          veri: true,
          kaliciMi: true,
          kaynakModul: true,
          onayTarihi: true,
          gecerlilikTarihi: true,
          sonKullanilmaTarihi: true,
          kullanimSayisi: true,
          olusturulmaTarihi: true,
          guncellenmeTarihi: true,
        },
      }),
      this.getOrCreateEndOfDayReview(userId),
    ]);

    const mappedMemories = memories.map((memory) =>
      this.mapMemoryRecord(memory),
    );

    return {
      success: true,
      counts: {
        total: mappedMemories.length,
        thirtyDay: mappedMemories.filter((memory) => !memory.permanent)
          .length,
        permanent: mappedMemories.filter((memory) => memory.permanent)
          .length,
      },
      thirtyDayMemories: mappedMemories.filter(
        (memory) => !memory.permanent,
      ),
      permanentMemories: mappedMemories.filter(
        (memory) => memory.permanent,
      ),
      endOfDay,
    };
  }

  async getOrCreateEndOfDayReview(
    userId: string,
    requestedDate?: string,
  ) {
    const dateKey = this.normalizeDateKey(requestedDate);
    const { start, end, databaseDate } =
      this.getIstanbulDayRange(dateKey);

    const conversations = await this.prisma.linaKonusma.findMany({
      where: {
        kullaniciId: userId,
        silinmeTarihi: null,
        olusturulmaTarihi: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        olusturulmaTarihi: "asc",
      },
      select: {
        id: true,
        oturumId: true,
        modul: true,
        kullaniciMesaji: true,
        linaCevabi: true,
        ozet: true,
        olusturulmaTarihi: true,
      },
    });

    if (!conversations.length) {
      return {
        available: false,
        date: dateKey,
        review: null,
      };
    }

    const existing = await this.prisma.linaGunSonuOnayi.findUnique({
      where: {
        kullaniciId_tarih: {
          kullaniciId: userId,
          tarih: databaseDate,
        },
      },
    });

    if (existing?.durum === LinaDurum.TAMAMLANDI) {
      return {
        available: true,
        date: dateKey,
        review: this.mapEndOfDayReview(existing),
      };
    }

    const sessionIds = Array.from(
      new Set(
        conversations
          .map((conversation) => conversation.oturumId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const dailySummary = this.buildDailySummary(conversations);

    const review = existing
      ? await this.prisma.linaGunSonuOnayi.update({
          where: {
            id: existing.id,
          },
          data: {
            gunlukOzet: dailySummary,
            oturumIdleri: sessionIds,
            oturumSayisi: sessionIds.length,
            konusmaSayisi: conversations.length,
            durum: LinaDurum.BEKLIYOR,
          },
        })
      : await this.prisma.linaGunSonuOnayi.create({
          data: {
            kullaniciId: userId,
            tarih: databaseDate,
            gunlukOzet: dailySummary,
            oturumIdleri: sessionIds,
            oturumSayisi: sessionIds.length,
            konusmaSayisi: conversations.length,
            durum: LinaDurum.BEKLIYOR,
          },
        });

    return {
      available: true,
      date: dateKey,
      review: this.mapEndOfDayReview(review),
    };
  }

  async decideEndOfDay(
    userId: string,
    choiceValue: string,
    requestedDate?: string,
  ) {
    const choice = this.normalizeEndOfDayChoice(choiceValue);
    const dateKey = this.normalizeDateKey(requestedDate);
    const { start, end, databaseDate } =
      this.getIstanbulDayRange(dateKey);

    const prepared = await this.getOrCreateEndOfDayReview(
      userId,
      dateKey,
    );

    if (!prepared.available || !prepared.review) {
      throw new BadRequestException(
        "Bu tarih için kaydedilecek Lina konuşması bulunamadı.",
      );
    }

    const review = await this.prisma.linaGunSonuOnayi.findUnique({
      where: {
        kullaniciId_tarih: {
          kullaniciId: userId,
          tarih: databaseDate,
        },
      },
    });

    if (!review) {
      throw new NotFoundException("Gün sonu hafıza özeti bulunamadı.");
    }

    const now = new Date();

    if (choice === LinaGunSonuSecimi.BUGUNU_SIL) {
      await this.prisma.$transaction(async (tx) => {
        await tx.linaHafiza.updateMany({
          where: {
            kullaniciId: userId,
            gunSonuOnayId: review.id,
            silinmeTarihi: null,
          },
          data: {
            aktifMi: false,
            silinmeTarihi: now,
          },
        });

        await tx.linaKonusma.updateMany({
          where: {
            kullaniciId: userId,
            silinmeTarihi: null,
            olusturulmaTarihi: {
              gte: start,
              lt: end,
            },
          },
          data: {
            silinmeTarihi: now,
          },
        });

        if (review.oturumIdleri.length) {
          await tx.linaOturum.updateMany({
            where: {
              kullaniciId: userId,
              id: {
                in: review.oturumIdleri,
              },
              silinmeTarihi: null,
            },
            data: {
              durum: LinaDurum.IPTAL,
              kapanmaTarihi: now,
              silinmeTarihi: now,
            },
          });
        }

        await tx.linaGunSonuOnayi.update({
          where: {
            id: review.id,
          },
          data: {
            secim: choice,
            durum: LinaDurum.TAMAMLANDI,
            onayTarihi: now,
          },
        });
      });

      return {
        success: true,
        choice,
        message: "Bugünkü Lina konuşmaları silindi.",
      };
    }

    const conversations = await this.prisma.linaKonusma.findMany({
      where: {
        kullaniciId: userId,
        silinmeTarihi: null,
        olusturulmaTarihi: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        olusturulmaTarihi: "asc",
      },
      take: 40,
      select: {
        modul: true,
        kullaniciMesaji: true,
        linaCevabi: true,
        olusturulmaTarihi: true,
      },
    });

    const permanent =
      choice === LinaGunSonuSecimi.KALICI_KAYDET;
    const expiresAt = permanent
      ? null
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const memoryData = {
      date: dateKey,
      sessionIds: review.oturumIdleri,
      sessionCount: review.oturumSayisi,
      conversationCount: review.konusmaSayisi,
      conversations: conversations.map((conversation) => ({
        module: conversation.modul,
        user: this.cleanMemoryText(
          conversation.kullaniciMesaji,
          500,
        ),
        assistant: this.cleanMemoryText(
          conversation.linaCevabi || "",
          700,
        ),
        createdAt: conversation.olusturulmaTarihi.toISOString(),
      })),
    };

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.linaHafiza.updateMany({
        where: {
          kullaniciId: userId,
          gunSonuOnayId: review.id,
          silinmeTarihi: null,
        },
        data: {
          aktifMi: false,
          silinmeTarihi: now,
        },
      });

      const memory = await tx.linaHafiza.create({
        data: {
          kullaniciId: userId,
          gunSonuOnayId: review.id,
          katman: LinaHafizaKatmani.KULLANICI,
          onem: permanent
            ? LinaHafizaOnemi.KALICI
            : LinaHafizaOnemi.YUKSEK,
          baslik: `${this.formatTurkishDate(dateKey)} Gün Özeti`,
          icerik: review.gunlukOzet,
          veri: memoryData,
          kaliciMi: permanent,
          kullaniciOnayliMi: true,
          aktifMi: true,
          kaynakModul: LinaModul.GENEL,
          onayTarihi: now,
          gecerlilikTarihi: expiresAt,
        },
      });

      const updatedReview = await tx.linaGunSonuOnayi.update({
        where: {
          id: review.id,
        },
        data: {
          secim: choice,
          durum: LinaDurum.TAMAMLANDI,
          onayTarihi: now,
        },
      });

      return {
        memory,
        review: updatedReview,
      };
    });

    return {
      success: true,
      choice,
      message: permanent
        ? "Bugünün özeti kalıcı hafızaya eklendi."
        : "Bugünün özeti 30 günlük hafızaya eklendi.",
      memory: this.mapMemoryRecord(result.memory),
      review: this.mapEndOfDayReview(result.review),
    };
  }

  async deleteMemory(userId: string, memoryId: string) {
    const memory = await this.prisma.linaHafiza.findFirst({
      where: {
        id: memoryId,
        kullaniciId: userId,
        silinmeTarihi: null,
      },
      select: {
        id: true,
      },
    });

    if (!memory) {
      throw new NotFoundException("Hafıza kaydı bulunamadı.");
    }

    await this.prisma.linaHafiza.update({
      where: {
        id: memory.id,
      },
      data: {
        aktifMi: false,
        silinmeTarihi: new Date(),
      },
    });

    return {
      success: true,
      message: "Hafıza kaydı silindi.",
      memoryId: memory.id,
    };
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

  private async expireThirtyDayMemories(
    userId: string,
  ): Promise<void> {
    await this.prisma.linaHafiza.updateMany({
      where: {
        kullaniciId: userId,
        kaliciMi: false,
        aktifMi: true,
        silinmeTarihi: null,
        gecerlilikTarihi: {
          lt: new Date(),
        },
      },
      data: {
        aktifMi: false,
      },
    });
  }

  private normalizeEndOfDayChoice(
    value: string,
  ): LinaGunSonuSecimi {
    const normalized = String(value || "")
      .trim()
      .toUpperCase();

    if (
      normalized === LinaGunSonuSecimi.OTUZ_GUN_KAYDET ||
      normalized === "30_GUN_KAYDET" ||
      normalized === "30_GÜN_KAYDET"
    ) {
      return LinaGunSonuSecimi.OTUZ_GUN_KAYDET;
    }

    if (
      normalized === LinaGunSonuSecimi.KALICI_KAYDET ||
      normalized === "KALICI_HAFIZAYA_EKLE"
    ) {
      return LinaGunSonuSecimi.KALICI_KAYDET;
    }

    if (
      normalized === LinaGunSonuSecimi.BUGUNU_SIL ||
      normalized === "BUGUNKU_KONUSMALARI_SIL" ||
      normalized === "BUGÜNKÜ_KONUŞMALARI_SİL"
    ) {
      return LinaGunSonuSecimi.BUGUNU_SIL;
    }

    throw new BadRequestException("Geçersiz gün sonu hafıza seçimi.");
  }

  private normalizeDateKey(value?: string): string {
    if (!value) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    }

    const normalized = String(value).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(
        "Tarih YYYY-MM-DD formatında olmalıdır.",
      );
    }

    return normalized;
  }

  private getIstanbulDayRange(dateKey: string) {
    const [year, month, day] = dateKey.split("-").map(Number);

    if (
      !year ||
      !month ||
      !day ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      throw new BadRequestException("Geçersiz tarih.");
    }

    const start = new Date(
      Date.UTC(year, month - 1, day, -3, 0, 0, 0),
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const databaseDate = new Date(
      Date.UTC(year, month - 1, day, 0, 0, 0, 0),
    );

    return {
      start,
      end,
      databaseDate,
    };
  }

  private buildDailySummary(
    conversations: Array<{
      modul: LinaModul;
      kullaniciMesaji: string;
      linaCevabi: string | null;
    }>,
  ): string {
    const moduleCounts = new Map<string, number>();

    for (const conversation of conversations) {
      const label = this.getModuleLabel(conversation.modul);
      moduleCounts.set(label, (moduleCounts.get(label) || 0) + 1);
    }

    const moduleSummary = Array.from(moduleCounts.entries())
      .map(([label, count]) => `${label}: ${count}`)
      .join(", ");

    const topics = Array.from(
      new Set(
        conversations
          .map((conversation) =>
            this.cleanMemoryText(conversation.kullaniciMesaji, 110),
          )
          .filter(Boolean),
      ),
    )
      .slice(-4)
      .map((topic) => `“${topic}”`)
      .join("; ");

    return [
      `Bugün Lina ile ${conversations.length} konuşma yaptınız.`,
      moduleSummary
        ? `Modül dağılımı: ${moduleSummary}.`
        : "",
      topics
        ? `Öne çıkan konuşmalar: ${topics}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 1800);
  }

  private getModuleLabel(module: LinaModul): string {
    const labels: Partial<Record<LinaModul, string>> = {
      [LinaModul.GENEL]: "Genel sohbet",
      [LinaModul.PORTFOY]: "Portföy",
      [LinaModul.CRM]: "CRM",
      [LinaModul.FORUM]: "Talep Merkezi",
      [LinaModul.HAVUZ]: "Havuz",
      [LinaModul.GOREV]: "Görev",
      [LinaModul.RAPORLAMA]: "Raporlama",
      [LinaModul.BILDIRIM]: "Bildirim",
      [LinaModul.YETKI]: "Yetki",
    };

    return labels[module] || String(module);
  }

  private cleanMemoryText(
    value: string,
    maxLength: number,
  ): string {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  private formatTurkishDate(dateKey: string): string {
    const [year, month, day] = dateKey.split("-").map(Number);

    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(
      new Date(Date.UTC(year, month - 1, day, 12, 0, 0)),
    );
  }

  private mapMemoryRecord(memory: {
    id: string;
    katman: LinaHafizaKatmani;
    onem: LinaHafizaOnemi;
    baslik: string;
    icerik: string;
    veri: unknown;
    kaliciMi: boolean;
    kaynakModul: LinaModul;
    onayTarihi: Date | null;
    gecerlilikTarihi: Date | null;
    sonKullanilmaTarihi: Date | null;
    kullanimSayisi: number;
    olusturulmaTarihi: Date;
    guncellenmeTarihi: Date;
  }) {
    return {
      id: memory.id,
      layer: memory.katman,
      importance: memory.onem,
      title: memory.baslik,
      content: memory.icerik,
      data: memory.veri,
      permanent: memory.kaliciMi,
      sourceModule: memory.kaynakModul,
      approvedAt: memory.onayTarihi?.toISOString() ?? null,
      expiresAt: memory.gecerlilikTarihi?.toISOString() ?? null,
      lastUsedAt:
        memory.sonKullanilmaTarihi?.toISOString() ?? null,
      usageCount: memory.kullanimSayisi,
      createdAt: memory.olusturulmaTarihi.toISOString(),
      updatedAt: memory.guncellenmeTarihi.toISOString(),
    };
  }

  private mapEndOfDayReview(review: {
    id: string;
    tarih: Date;
    gunlukOzet: string;
    oturumIdleri: string[];
    oturumSayisi: number;
    konusmaSayisi: number;
    secim: LinaGunSonuSecimi | null;
    durum: LinaDurum;
    onayTarihi: Date | null;
    olusturulmaTarihi: Date;
    guncellenmeTarihi: Date;
  }) {
    return {
      id: review.id,
      date: review.tarih.toISOString().slice(0, 10),
      summary: review.gunlukOzet,
      sessionIds: review.oturumIdleri,
      sessionCount: review.oturumSayisi,
      conversationCount: review.konusmaSayisi,
      choice: review.secim,
      status: review.durum,
      approvedAt: review.onayTarihi?.toISOString() ?? null,
      createdAt: review.olusturulmaTarihi.toISOString(),
      updatedAt: review.guncellenmeTarihi.toISOString(),
    };
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
