import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';

type AuthUser = {
  id: string;
  role: Role;
};

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getConversations(@CurrentUser() user: AuthUser) {
    return this.messagesService.getConversations(user.id, user.role);
  }

  @Post('start')
  startConversation(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      postId?: string;
      title?: string;
      creatorId?: string;
      participantId?: string;
    },
  ) {
    return this.messagesService.startConversation(body, user.id, user.role);
  }

  @Get(':id')
  getConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagesService.getConversation(id, user.id, user.role);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagesService.getMessages(id, user.id, user.role);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      senderId?: string;
      body: string;
    },
  ) {
    return this.messagesService.sendMessage(id, body, user.id, user.role);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagesService.markAsRead(id, user.id, user.role);
  }
}