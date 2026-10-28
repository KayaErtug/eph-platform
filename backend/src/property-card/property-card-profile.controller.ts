import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { PropertyCardProfileService } from './property-card-profile.service';

@Controller('property-card-profiles')
export class PropertyCardProfileController {
  constructor(
    private readonly propertyCardProfileService: PropertyCardProfileService,
  ) {}

  @Get()
  listProfiles() {
    return this.propertyCardProfileService.listProfiles();
  }

  @Get(':unitType')
  getProfile(@Param('unitType') unitType: string) {
    return this.propertyCardProfileService.getProfile(unitType);
  }

  @Post('resolve')
  resolve(
    @Body()
    body: {
      unitType: string;
      values?: Record<string, unknown>;
      features?: string[];
    },
  ) {
    return this.propertyCardProfileService.resolve(body);
  }
}
