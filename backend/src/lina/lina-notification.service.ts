import { Injectable } from '@nestjs/common';

export type LinaNotificationPriority = 0 | 1 | 2 | 3 | 4;

export type LinaNotificationInput = {
  userId?: string;
  sourceModule: 'dashboard' | 'crm' | 'network' | 'pool' | 'notifications' | 'general';
  title: string;
  message: string;
  priorityLevel?: LinaNotificationPriority;
  wantsVoice?: boolean;
};

export type LinaNotificationResult = {
  created: boolean;
  shouldPush: boolean;
  shouldVoice: boolean;
  priorityLevel: LinaNotificationPriority;
  title: string;
  message: string;
};

@Injectable()
export class LinaNotificationService {
  createNotification(input: LinaNotificationInput): LinaNotificationResult {
    const priorityLevel = input.priorityLevel ?? 1;

    return {
      created: true,
      shouldPush: priorityLevel >= 2,
      shouldVoice: Boolean(input.wantsVoice && priorityLevel >= 3),
      priorityLevel,
      title: input.title,
      message: input.message,
    };
  }

  getPriorityLabel(priorityLevel: LinaNotificationPriority): string {
    const labels: Record<LinaNotificationPriority, string> = {
      0: 'Bilgilendirme',
      1: 'Düşük',
      2: 'Normal',
      3: 'Yüksek',
      4: 'Kritik',
    };

    return labels[priorityLevel];
  }
}