import { Module } from '@nestjs/common';

import { KatilimTalepleriController } from './katilim-talepleri.controller';
import { KatilimTalepleriService } from './katilim-talepleri.service';

@Module({
  controllers: [KatilimTalepleriController],
  providers: [KatilimTalepleriService],
  exports: [KatilimTalepleriService],
})
export class KatilimTalepleriModule {}