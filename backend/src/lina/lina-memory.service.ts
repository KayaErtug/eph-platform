import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { LinaPreferencesDto } from './dto/lina-preferences.dto';

type LinaSummaryStyle = 'short' | 'normal' | 'detailed';

type PrismaLinaPreferenceClient = {
  linaPreference: {
    findUnique(args: { where: { userId: string } }): Promise<LinaPreferenceRecord | null>;
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

@Injectable()
export class LinaMemoryService {
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
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      urgentVoiceEnabled: false,
      summaryStyle: 'normal',
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

  async updatePreferences(userId: string, dto: LinaPreferencesDto): Promise<LinaMemoryPreference> {
    const defaults = this.getDefaultPreferences(userId);

    const preferences = await this.client.linaPreference.upsert({
      where: { userId },
      create: {
        userId,
        voiceEnabled: dto.voiceEnabled ?? defaults.voiceEnabled ?? false,
        dashboardVoiceSummaryEnabled:
          dto.dashboardVoiceSummaryEnabled ?? defaults.dashboardVoiceSummaryEnabled ?? false,
        crmVoiceReminderEnabled: dto.crmVoiceReminderEnabled ?? defaults.crmVoiceReminderEnabled ?? false,
        networkVoiceSummaryEnabled: dto.networkVoiceSummaryEnabled ?? defaults.networkVoiceSummaryEnabled ?? false,
        poolVoiceSummaryEnabled: dto.poolVoiceSummaryEnabled ?? defaults.poolVoiceSummaryEnabled ?? false,
        quietHoursEnabled: dto.quietHoursEnabled ?? defaults.quietHoursEnabled ?? true,
        quietHoursStart: dto.quietHoursStart ?? defaults.quietHoursStart ?? '22:00',
        quietHoursEnd: dto.quietHoursEnd ?? defaults.quietHoursEnd ?? '08:00',
        urgentVoiceEnabled: dto.urgentVoiceEnabled ?? defaults.urgentVoiceEnabled ?? false,
        summaryStyle: this.normalizeSummaryStyle(dto.summaryStyle ?? defaults.summaryStyle),
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
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        urgentVoiceEnabled: false,
        summaryStyle: 'normal',
      },
      update: {
        voiceEnabled: false,
        dashboardVoiceSummaryEnabled: false,
        crmVoiceReminderEnabled: false,
        networkVoiceSummaryEnabled: false,
        poolVoiceSummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        urgentVoiceEnabled: false,
        summaryStyle: 'normal',
      },
    });

    return this.mapPreference(preferences);
  }

  isQuietNow(preferences: LinaMemoryPreference, now = new Date()): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const start = preferences.quietHoursStart || '22:00';
    const end = preferences.quietHoursEnd || '08:00';

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

  private get client(): PrismaLinaPreferenceClient {
    return this.prisma as unknown as PrismaLinaPreferenceClient;
  }

  private mapPreference(preferences: LinaPreferenceRecord): LinaMemoryPreference {
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

  private cleanUpdateInput(input: LinaPreferenceUpdateInput): LinaPreferenceUpdateInput {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as LinaPreferenceUpdateInput;
  }

  private normalizeOptionalSummaryStyle(value?: string): LinaSummaryStyle | undefined {
    if (!value) {
      return undefined;
    }

    return this.normalizeSummaryStyle(value);
  }

  private normalizeSummaryStyle(value?: string): LinaSummaryStyle {
    if (value === 'short' || value === 'normal' || value === 'detailed') {
      return value;
    }

    return 'normal';
  }

  private toMinutes(value: string): number {
    const [hourRaw, minuteRaw] = String(value || '00:00').split(':');
    const hour = Number(hourRaw || 0);
    const minute = Number(minuteRaw || 0);

    return hour * 60 + minute;
  }
}