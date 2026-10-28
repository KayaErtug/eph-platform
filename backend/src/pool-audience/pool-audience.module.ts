import { Module } from '@nestjs/common';

import { PoolAudienceController } from './pool-audience.controller';
import { PoolAudienceService } from './pool-audience.service';

@Module({
  controllers: [PoolAudienceController],
  providers: [PoolAudienceService],
  exports: [PoolAudienceService],
})
export class PoolAudienceModule {}
