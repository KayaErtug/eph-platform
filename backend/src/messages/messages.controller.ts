import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('conversations')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getConversations(@Query('userId') userId: string) {
    return this.messagesService.getConversations(userId);
  }

  @Post('start')
  startConversation(
    @Body()
    body: {
      postId?: string;
      title?: string;
      creatorId?: string;
      participantId?: string;
    },
  ) {
    return this.messagesService.startConversation(body);
  }

  @Get(':id')
  getConversation(@Param('id') id: string) {
    return this.messagesService.getConversation(id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.messagesService.getMessages(id);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body()
    body: {
      senderId: string;
      body: string;
    },
  ) {
    return this.messagesService.sendMessage(id, body);
  }

  @Post(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
    },
  ) {
    return this.messagesService.markAsRead(id, body.userId);
  }
}
