import { Controller, Get, Param } from '@nestjs/common';

import { UnitsService } from './units.service';

@Controller('portfolio-share')
export class PortfolioShareController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.unitsService.getPortfolioShareByToken(token);
  }
}
