import { Controller, Get, Param, Post } from '@nestjs/common';

import { PoolProjectsService } from './pool-projects.service';

@Controller('pool-project-share')
export class PoolProjectsPublicController {
  constructor(private readonly service: PoolProjectsService) {}

  @Get(':token')
  getPresentation(@Param('token') token: string) {
    return this.service.getPublicPresentation(token);
  }

  @Post(':token/whatsapp-click')
  trackWhatsapp(@Param('token') token: string) {
    return this.service.trackWhatsappClick(token);
  }
}
