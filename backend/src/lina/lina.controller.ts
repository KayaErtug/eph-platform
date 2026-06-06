import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { LinaService } from './lina.service';
import { LinaChatDto } from './dto/lina-chat.dto';
import { LinaVoiceDto } from './dto/lina-voice.dto';
import { LinaPreferencesDto } from './dto/lina-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type LinaRequestUser = {
  id?: string;
  role?: string;
  email?: string;
};

type RequestWithUser = Request & {
  user?: LinaRequestUser;
};

@Controller('lina')
export class LinaController {
  constructor(private readonly linaService: LinaService) {}

  @Get('status')
  getStatus() {
    return this.linaService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(@Body() body: LinaChatDto, @Req() request: RequestWithUser) {
    return this.linaService.createTextReply(body, this.extractUser(request));
  }

  @UseGuards(JwtAuthGuard)
  @Post('voice')
  async voice(@Body() body: LinaVoiceDto, @Req() request: RequestWithUser) {
    return this.linaService.createVoice(body, this.extractUser(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@Req() request: RequestWithUser) {
    return this.linaService.getPreferences(this.extractUser(request));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  async updatePreferences(@Body() body: LinaPreferencesDto, @Req() request: RequestWithUser) {
    return this.linaService.updatePreferences(body, this.extractUser(request));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('memory')
  async resetMemory(@Req() request: RequestWithUser) {
    return this.linaService.resetMemory(this.extractUser(request));
  }

  private extractUser(request: RequestWithUser): LinaRequestUser {
    const userFromRequest = request.user;

    if (userFromRequest?.id) {
      return {
        id: userFromRequest.id,
        role: userFromRequest.role,
        email: userFromRequest.email,
      };
    }

    return {
      id: this.readHeader(request, 'x-user-id'),
      role: this.readHeader(request, 'x-user-role'),
      email: this.readHeader(request, 'x-user-email'),
    };
  }

  private readHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}