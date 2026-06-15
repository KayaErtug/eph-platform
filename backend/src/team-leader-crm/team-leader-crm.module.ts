import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TeamLeaderCrmController } from './team-leader-crm.controller';
import { TeamLeaderCrmService } from './team-leader-crm.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamLeaderCrmController],
  providers: [TeamLeaderCrmService],
  exports: [TeamLeaderCrmService],
})
export class TeamLeaderCrmModule {}
