import { Body, Controller, Get, Post } from '@nestjs/common';
import { NetworkService } from './network.service';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('posts')
  findAll() {
    return this.networkService.findAll();
  }

  @Post('posts')
  create(@Body() body: any) {
    return this.networkService.create(body);
  }
}