import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemMessagesService } from './system-messages.service';
import { SendSystemMessageDto } from './dto/send-system-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('system-messages')
export class SystemMessagesController {
  constructor(private readonly systemMessagesService: SystemMessagesService) {}

  @Post('send')
  send(@Body() dto: SendSystemMessageDto, @CurrentUser() user: any) {
    return this.systemMessagesService.send(dto, user);
  }

  @Get()
  findForUser(@CurrentUser() user: any) {
    return this.systemMessagesService.findForUser(user);
  }

  @Get('admin/all')
  findAllForSuperAdmin(@CurrentUser() user: any) {
    return this.systemMessagesService.findAllForSuperAdmin(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.systemMessagesService.findOne(id, user);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.systemMessagesService.markAsRead(id, user);
  }
}