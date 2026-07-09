import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NetworkService } from './network.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('network')
@UseGuards(JwtAuthGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('posts')
  findAll() {
    return this.networkService.findAll();
  }

  @Get('posts/followed')
  getFollowedPosts(@CurrentUser() user: any) {
    return this.networkService.getFollowedPosts(user.id);
  }

  @Get('posts/featured')
  getFeaturedPosts() {
    return this.networkService.getFeaturedPosts();
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: any) {
    return this.networkService.getNotifications(user.id);
  }

  @Post('notifications/read')
  markNotificationsAsRead(@CurrentUser() user: any) {
    return this.networkService.markNotificationsAsRead(user.id);
  }

  @Get('posts/:id/stats')
  getPostStats(@Param('id') id: string) {
    return this.networkService.getPostStats(id);
  }

  @Get('posts/:id/update-logs')
  getUpdateLogs(@Param('id') id: string) {
    return this.networkService.getUpdateLogs(id);
  }

  @Post('posts/:id/view')
  recordPostView(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.recordPostView(id, user.id);
  }

  @Get('posts/:id/follow-status')
  getFollowStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.getFollowStatus(id, user.id);
  }

  @Get('posts/:id/followers')
  getPostFollowers(@Param('id') id: string) {
    return this.networkService.getPostFollowers(id);
  }

  @Post('posts/:id/follow')
  followPost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.followPost(id, user.id);
  }

  @Delete('posts/:id/follow')
  unfollowPost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.unfollowPost(id, user.id);
  }

  @Get('posts/:id')
  findOne(@Param('id') id: string) {
    return this.networkService.findOne(id);
  }

  @Post('posts/:id/share')
  createShareLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.createNetworkPostShareLink(id, user.id);
  }

  @Patch('posts/:id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.networkService.update(id, body, user.id);
  }

  @Delete('posts/:id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.remove(id, user.id);
  }

  @Post('posts')
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.networkService.create(body, user.id);
  }

  @Post('posts/:id/message')
  messagePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { message?: string },
  ) {
    return this.networkService.messagePost(id, user, body);
  }

  @Post('posts/:id/interest')
  interestPost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { note?: string },
  ) {
    return this.networkService.interestPost(id, user, body);
  }

  @Post('posts/:id/help')
  helpPost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { note?: string },
  ) {
    return this.networkService.helpPost(id, user, body);
  }
}
