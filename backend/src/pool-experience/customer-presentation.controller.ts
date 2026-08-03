import { Controller, Get, Param, Post } from '@nestjs/common';

import { PoolExperienceService } from './pool-experience.service';

@Controller('customer-presentation')
export class CustomerPresentationController {
  constructor(private readonly service: PoolExperienceService) {}

  @Get(':token')
  getPresentation(@Param('token') token: string) {
    return this.service.getCustomerPresentation(token);
  }

  @Post(':token/whatsapp-click')
  recordWhatsappClick(@Param('token') token: string) {
    return this.service.recordWhatsappClick(token);
  }
}
