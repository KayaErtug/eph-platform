import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Get('posts/:id/update-logs')
  getUpdateLogs(@Param('id') id: string) {
    return this.networkService.getUpdateLogs(id);
  }

  @Get('posts/:id')
  findOne(@Param('id') id: string) {
    return this.networkService.findOne(id);
  }

  @Patch('posts/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.networkService.update(id, body);
  }

  @Post('posts')
  create(@Body() body: any) {
    return this.networkService.create(body);
  }
}
