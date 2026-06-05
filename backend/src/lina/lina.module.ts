import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { LinaController } from './lina.controller';
import { LinaService } from './lina.service';
import { LinaAccessService } from './lina-access.service';
import { LinaKvkkService } from './lina-kvkk.service';
import { LinaAuditService } from './lina-audit.service';
import { LinaMemoryService } from './lina-memory.service';
import { LinaNotificationService } from './lina-notification.service';
import { LinaVoiceService } from './lina-voice.service';

@Module({
  controllers: [LinaController],
  providers: [
    PrismaService,
    LinaService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
  ],
  exports: [
    LinaService,
    LinaAccessService,
    LinaKvkkService,
    LinaAuditService,
    LinaMemoryService,
    LinaNotificationService,
    LinaVoiceService,
  ],
})
export class LinaModule {}