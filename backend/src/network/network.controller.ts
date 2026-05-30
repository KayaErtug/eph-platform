import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NetworkService } from './network.service';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('posts')
  findAll() {
    return this.networkService.findAll();
  }

  @Get('posts/followed')
  getFollowedPosts(@Query('userId') userId: string) {
    return this.networkService.getFollowedPosts(userId);
  }

  @Get('posts/:id/stats')
  getPostStats(@Param('id') id: string) {
    return this.networkService.getPostStats(id);
  }

  @Get('posts/:id/follow-status')
  getFollowStatus(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.networkService.getFollowStatus(id, userId);
  }

  @Post('posts/:id/follow')
  followPost(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
    },
  ) {
    return this.networkService.followPost(id, body.userId);
  }

  @Delete('posts/:id/follow')
  unfollowPost(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
    },
  ) {
    return this.networkService.unfollowPost(id, body.userId);
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
