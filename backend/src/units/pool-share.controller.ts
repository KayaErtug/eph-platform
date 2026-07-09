import { Controller, Get, Param } from '@nestjs/common';

import { UnitsService } from './units.service';

@Controller('pool-share')
export class PoolShareController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.unitsService.getPoolShareByToken(token);
  }
}
