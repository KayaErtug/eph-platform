import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { PoolShareController } from './pool-share.controller';

@Module({
  providers: [UnitsService],
  controllers: [UnitsController, PoolShareController]
})
export class UnitsModule {}
