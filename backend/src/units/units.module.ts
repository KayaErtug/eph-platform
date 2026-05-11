import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';

@Module({
  providers: [UnitsService],
  controllers: [UnitsController]
})
export class UnitsModule {}
