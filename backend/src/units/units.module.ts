import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { PoolShareController } from './pool-share.controller';
import { PortfolioShareController } from './portfolio-share.controller';

@Module({
  providers: [UnitsService],
  controllers: [UnitsController, PoolShareController, PortfolioShareController]
})
export class UnitsModule {}
