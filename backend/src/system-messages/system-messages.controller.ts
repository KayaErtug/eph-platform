import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SendSystemMessageDto } from './dto/send-system-message.dto';
import { SystemMessagesService } from './system-messages.service';

@Controller('system-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemMessagesController {
  constructor(private readonly systemMessagesService: SystemMessagesService) {}

  @Post('send')
  @Roles(Role.SUPER_ADMIN)
  send(@Body() dto: SendSystemMessageDto, @CurrentUser() user: any) {
    return this.systemMessagesService.send(dto, user);
  }

  @Get()
  findForUser(@CurrentUser() user: any) {
    return this.systemMessagesService.findForUser(user);
  }

  @Get('admin/all')
  @Roles(Role.SUPER_ADMIN)
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
