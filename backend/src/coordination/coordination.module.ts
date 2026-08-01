import { Module } from '@nestjs/common';

import { CrmModule } from '../crm/crm.module';
import { NetworkModule } from '../network/network.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';

@Module({
  imports: [PrismaModule, CrmModule, NetworkModule],
  controllers: [CoordinationController],
  providers: [CoordinationService],
  exports: [CoordinationService],
})
export class CoordinationModule {}
