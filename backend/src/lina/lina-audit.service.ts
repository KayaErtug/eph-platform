import { Injectable, Logger } from '@nestjs/common';

export type LinaAuditLevel = 0 | 1 | 2 | 3 | 4;

export type LinaAuditEvent = {
  userId?: string;
  role?: string;
  module?: string;
  action: string;
  result: 'allowed' | 'blocked' | 'filtered' | 'error' | 'success';
  riskLevel?: LinaAuditLevel;
  reason?: string;
  kvkkFiltered?: boolean;
  voiceGenerated?: boolean;
};

@Injectable()
export class LinaAuditService {
  private readonly logger = new Logger(LinaAuditService.name);

  log(event: LinaAuditEvent): void {
    const safeEvent = {
      userId: event.userId || 'anonymous',
      role: event.role || 'unknown',
      module: event.module || 'general',
      action: event.action,
      result: event.result,
      riskLevel: event.riskLevel ?? 0,
      reason: event.reason || null,
      kvkkFiltered: event.kvkkFiltered ?? false,
      voiceGenerated: event.voiceGenerated ?? false,
      createdAt: new Date().toISOString(),
    };

    if (safeEvent.riskLevel >= 3 || safeEvent.result === 'blocked' || safeEvent.result === 'error') {
      this.logger.warn(JSON.stringify(safeEvent));
      return;
    }

    this.logger.log(JSON.stringify(safeEvent));
  }
}