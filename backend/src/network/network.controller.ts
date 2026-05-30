import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { NetworkService } from './network.service';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('posts')
  findAll() {
    return this.networkService.findAll();
  }

  @Get('posts/:id/stats')
  getPostStats(@Param('id') id: string) {
    return this.networkService.getPostStats(id);
  }

  @Get('posts/:id')
  findOne(@Param('id') id: string) {
    return this.networkService.findOne(id);
  }

  @Post('posts')
  create(@Body() body: any) {
    return this.networkService.create(body);
  }
}
