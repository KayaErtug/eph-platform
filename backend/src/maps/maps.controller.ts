import { Body, Controller, Post } from '@nestjs/common';
import { MapsService } from './maps.service';

type ResolveMapLocationBody = {
  value?: unknown;
};

@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post('resolve')
  resolveSharedLocation(
    @Body() body: ResolveMapLocationBody,
  ) {
    return this.mapsService.resolveSharedLocation(body?.value);
  }
}
