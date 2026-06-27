import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LinaChatDto } from "./dto/lina-chat.dto";
import { LinaPreferencesDto } from "./dto/lina-preferences.dto";
import { LinaVoiceDto } from "./dto/lina-voice.dto";
import { LinaMemoryService } from "./lina-memory.service";
import { LinaService } from "./lina.service";

type LinaRequestUser = {
  id?: string;
  role?: string;
  email?: string;
};

type RequestWithUser = Request & {
  user?: LinaRequestUser;
};

type LinaEndOfDayDecisionBody = {
  choice?: string;
  date?: string;
};

@Controller("lina")
export class LinaController {
  constructor(
    private readonly linaService: LinaService,
    private readonly linaMemoryService: LinaMemoryService,
  ) {}

  @Get("status")
  getStatus() {
    return this.linaService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post("chat")
  async chat(
    @Body() body: LinaChatDto,
    @Req() request: RequestWithUser,
  ) {
    return this.linaService.createTextReply(
      body,
      this.extractUser(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("voice")
  async voice(
    @Body() body: LinaVoiceDto,
    @Req() request: RequestWithUser,
  ) {
    return this.linaService.createVoice(
      body,
      this.extractUser(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("preferences")
  async getPreferences(@Req() request: RequestWithUser) {
    return this.linaService.getPreferences(
      this.extractUser(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch("preferences")
  async updatePreferences(
    @Body() body: LinaPreferencesDto,
    @Req() request: RequestWithUser,
  ) {
    return this.linaService.updatePreferences(
      body,
      this.extractUser(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("memory")
  async getMemoryCenter(@Req() request: RequestWithUser) {
    return this.linaMemoryService.getMemoryCenter(
      this.requireUserId(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("memory/end-of-day")
  async getEndOfDayReview(
    @Query("date") date: string | undefined,
    @Req() request: RequestWithUser,
  ) {
    return this.linaMemoryService.getOrCreateEndOfDayReview(
      this.requireUserId(request),
      date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("memory/end-of-day")
  async decideEndOfDay(
    @Body() body: LinaEndOfDayDecisionBody,
    @Req() request: RequestWithUser,
  ) {
    return this.linaMemoryService.decideEndOfDay(
      this.requireUserId(request),
      String(body?.choice || ""),
      body?.date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete("memory/:id")
  async deleteMemory(
    @Param("id") memoryId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.linaMemoryService.deleteMemory(
      this.requireUserId(request),
      memoryId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete("memory")
  async resetMemory(@Req() request: RequestWithUser) {
    return this.linaService.resetMemory(
      this.extractUser(request),
    );
  }

  private requireUserId(request: RequestWithUser): string {
    const userId = this.extractUser(request).id;

    if (!userId) {
      throw new UnauthorizedException(
        "Lina hafıza işlemi için giriş yapmanız gerekir.",
      );
    }

    return userId;
  }

  private extractUser(
    request: RequestWithUser,
  ): LinaRequestUser {
    const userFromRequest = request.user;

    if (userFromRequest?.id) {
      return {
        id: userFromRequest.id,
        role: userFromRequest.role,
        email: userFromRequest.email,
      };
    }

    return {
      id: this.readHeader(request, "x-user-id"),
      role: this.readHeader(request, "x-user-role"),
      email: this.readHeader(request, "x-user-email"),
    };
  }

  private readHeader(
    request: Request,
    name: string,
  ): string | undefined {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
