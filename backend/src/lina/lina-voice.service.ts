import { Injectable } from '@nestjs/common';
import { LinaKvkkService } from './lina-kvkk.service';
import { LinaMemoryPreference, LinaMemoryService } from './lina-memory.service';

export type LinaVoiceResult = {
  success: boolean;
  message: string;
  audioUrl?: string;
  provider?: 'elevenlabs' | 'mock';
  blockedReason?: string;
};

@Injectable()
export class LinaVoiceService {
  constructor(
    private readonly linaKvkkService: LinaKvkkService,
    private readonly linaMemoryService: LinaMemoryService,
  ) {}

  async createVoiceResponse(params: {
    text: string;
    userId?: string;
    priorityLevel?: 0 | 1 | 2 | 3 | 4;
    forceVoice?: boolean;
  }): Promise<LinaVoiceResult> {
    const preferences = await this.linaMemoryService.getPreferences(params.userId);

    const permissionResult = this.canGenerateVoice({
      preferences,
      priorityLevel: params.priorityLevel ?? 1,
      forceVoice: params.forceVoice ?? false,
    });

    if (!permissionResult.allowed) {
      return {
        success: false,
        message: 'Sesli yanıt oluşturulmadı.',
        provider: 'mock',
        blockedReason: permissionResult.reason,
      };
    }

    const filtered = this.linaKvkkService.filterText(params.text, {
      strictVoiceMode: true,
    });

    const safeText = filtered.safeText.trim();

    if (!safeText) {
      return {
        success: false,
        message: 'Sesli yanıt için güvenli metin bulunamadı.',
        provider: 'mock',
        blockedReason: 'EMPTY_SAFE_TEXT',
      };
    }

    return {
      success: true,
      message: safeText,
      provider: 'mock',
      audioUrl: undefined,
    };
  }

  canGenerateVoice(params: {
    preferences: LinaMemoryPreference;
    priorityLevel: 0 | 1 | 2 | 3 | 4;
    forceVoice: boolean;
  }): { allowed: boolean; reason?: string } {
    if (!params.forceVoice && !params.preferences.voiceEnabled) {
      return {
        allowed: false,
        reason: 'VOICE_DISABLED',
      };
    }

    const isQuiet = this.linaMemoryService.isQuietNow(params.preferences);

    if (isQuiet && params.priorityLevel < 4 && !params.forceVoice) {
      return {
        allowed: false,
        reason: 'QUIET_HOURS',
      };
    }

    if (isQuiet && params.priorityLevel >= 4 && !params.preferences.urgentVoiceEnabled && !params.forceVoice) {
      return {
        allowed: false,
        reason: 'URGENT_VOICE_DISABLED',
      };
    }

    return {
      allowed: true,
    };
  }
}