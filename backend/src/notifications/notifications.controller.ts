import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(
      user.id,
      page === undefined ? 1 : Number(page),
      limit === undefined ? 20 : Number(limit),
    );
  }
  @Get('summary')
  summary(@CurrentUser() user: { id: string }) {
    return this.service.summary(user.id);
  }
  @Patch(':id/read')
  read(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.read(user.id, id);
  }
  @Post('read-all')
  readAll(@CurrentUser() user: { id: string }) {
    return this.service.readAll(user.id);
  }
}

@Controller('notification-settings')
@UseGuards(JwtAuthGuard)
export class NotificationSettingsController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  get(@CurrentUser() user: { id: string }) {
    return this.service.getSettings(user.id);
  }
  @Patch()
  update(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.service.updateSettings(user.id, body);
  }
}
