import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
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
  findAll(@CurrentUser() user: any) {
    return this.networkService.findAll(user.id || user.sub);
  }

  @Get('posts/lookup')
  lookupListing(@Query('number') number: string, @CurrentUser() user: any) {
    return this.networkService.lookupListing(number, user.id || user.sub);
  }

  @Get('demand-density')
  getDemandDensity(@CurrentUser() user: any) {
    return this.networkService.getDemandDensity(user.id || user.sub);
  }

  @Get('posts/followed')
  getFollowedPosts(@CurrentUser() user: any) {
    return this.networkService.getFollowedPosts(user.id);
  }

  @Get('posts/featured')
  getFeaturedPosts(@CurrentUser() user: any) {
    return this.networkService.getFeaturedPosts(user.id || user.sub);
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
  getPostStats(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.getPostStats(id, user.id || user.sub);
  }

  @Get('posts/:id/update-logs')
  getUpdateLogs(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.getUpdateLogs(id, user.id || user.sub);
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
  getPostFollowers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.getPostFollowers(id, user.id || user.sub);
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.networkService.findOne(id, user.id || user.sub);
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

  @Get('posts/:id/contact-quote')
  getContactQuote(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query() query?: { walletSource?: string; walletOfficeId?: string },
  ) {
    return this.networkService.getContactQuote(id, user, query);
  }

  @Post('posts/:id/private-info')
  privateInfo(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { walletSource?: string; walletOfficeId?: string },
  ) {
    return this.networkService.postPrivateInfo(id, user, body);
  }

  @Post('posts/:id/message')
  messagePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { message?: string; walletSource?: string; walletOfficeId?: string },
  ) {
    return this.networkService.messagePost(id, user, body);
  }

  @Post('posts/:id/contact/:channel')
  contactPost(
    @Param('id') id: string,
    @Param('channel') channel: string,
    @CurrentUser() user: any,
    @Body() body?: { walletSource?: string; walletOfficeId?: string },
  ) {
    return this.networkService.postContact(id, user, channel, body);
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
