import { Controller, Get, Param } from '@nestjs/common';

import { NetworkService } from './network.service';

@Controller('network-share')
export class NetworkPostShareController {
  constructor(private readonly networkService: NetworkService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.networkService.getNetworkPostShareByToken(token);
  }
}
