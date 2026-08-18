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
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LinaActionEngineService } from "./actions/lina-action-engine.service";
import { LinaConfirmationGateService } from "./actions/lina-confirmation-gate.service";
import { LinaCrmOwnerActionService } from "./actions/lina-crm-owner-action.service";
import { LinaNaturalCommandService } from "./actions/lina-natural-command.service";
import { LinaActionSourceModule } from "./actions/lina-action.types";
import { LinaChatDto } from "./dto/lina-chat.dto";
import { LinaPreferencesDto } from "./dto/lina-preferences.dto";
import { LinaVoiceDto } from "./dto/lina-voice.dto";
import { LinaDistanceRequestDto } from "./geo/lina-distance.dto";
import { LinaDistanceService } from "./geo/lina-distance.service";
import { LinaMemoryService } from "./lina-memory.service";
import { LinaService } from "./lina.service";
import { LinaTranscriptionService } from "./lina-transcription.service";

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
    private readonly linaCrmOwnerActionService: LinaCrmOwnerActionService,
    private readonly linaActionEngineService: LinaActionEngineService,
    private readonly linaConfirmationGateService: LinaConfirmationGateService,
    private readonly linaNaturalCommandService: LinaNaturalCommandService,
    private readonly linaDistanceService: LinaDistanceService,
    private readonly linaTranscriptionService: LinaTranscriptionService,
  ) {}

  // Lina Temporary Passive Mode V1
  private readonly linaTemporarilyDisabled = false;
  private readonly linaTemporarilyDisabledMessage =
    "Lina geçici olarak pasif durumdadır. Platformdaki diğer geliştirmeler tamamlandıktan sonra yeniden devreye alınacaktır.";

  @Get("status")
  getStatus() {
    if (this.linaTemporarilyDisabled) {
      return {
        enabled: false,
        status: "PASIF",
        temporarilyDisabled: true,
        message: this.linaTemporarilyDisabledMessage,
      };
    }

    return this.linaService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post("distance/calculate")
  async calculateDistance(
    @Body() body: LinaDistanceRequestDto,
  ) {
    return this.linaDistanceService.calculate(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("chat")
  async chat(
    @Body() body: LinaChatDto,
    @Req() request: RequestWithUser,
  ) {
    if (this.linaTemporarilyDisabled) {
      return {
        success: false,
        enabled: false,
        temporarilyDisabled: true,
        message: this.linaTemporarilyDisabledMessage,
        provider: "disabled" as const,
        kvkkFiltered: false,
        detectedTypes: [],
        requiresConfirmation: false,
      };
    }

    const user = this.extractUser(request);
    const sourceModule = this.normalizeSourceModule(body?.sourceModule);
    const normalizedMessage = this.linaNaturalCommandService.normalize(
      body?.message,
    );

    let executionMessage = normalizedMessage;
    let confirmedGateExecution = false;

    if (user.id && user.role) {
      const gateResult = this.linaConfirmationGateService.evaluate(
        normalizedMessage,
        user.id,
        sourceModule,
      );

      if (gateResult.handled && !gateResult.executeMessage) {
        return {
          success: gateResult.success ?? true,
          message:
            gateResult.message ||
            "İşlem taslağı hazırlandı ve kullanıcı onayı bekleniyor.",
          provider: "local" as const,
          kvkkFiltered: false,
          detectedTypes: [],
          action: "confirmation_required",
          requiresConfirmation: gateResult.requiresConfirmation ?? true,
          data: gateResult.data,
        };
      }

      if (gateResult.executeMessage) {
        executionMessage = gateResult.executeMessage;
        confirmedGateExecution = true;
      }
    }

    const ownerActionResult =
      await this.linaCrmOwnerActionService.tryExecute(
        executionMessage,
        user,
        sourceModule,
        body?.history,
      );

    if (ownerActionResult.handled) {
      return {
        success: Boolean(ownerActionResult.success),
        message:
          ownerActionResult.message ||
          "Lina işlemi tamamladı ancak sonuç mesajı oluşturamadı.",
        provider: "local" as const,
        kvkkFiltered: false,
        detectedTypes: [],
        action: ownerActionResult.action,
        requiresConfirmation:
          ownerActionResult.requiresConfirmation ?? false,
        data: ownerActionResult.data,
      };
    }

    const actionResult = await this.linaActionEngineService.tryExecute(
      executionMessage,
      user,
      sourceModule,
      body?.history,
    );

    if (actionResult.handled) {
      return {
        success: Boolean(actionResult.success),
        message:
          actionResult.message ||
          "Lina işlemi tamamladı ancak sonuç mesajı oluşturamadı.",
        provider: "local" as const,
        kvkkFiltered: false,
        detectedTypes: [],
        action: actionResult.action,
        requiresConfirmation: actionResult.requiresConfirmation ?? false,
        data: actionResult.data,
      };
    }

    const fallbackBody = confirmedGateExecution
      ? {
          ...body,
          message: executionMessage,
        }
      : body;

    return this.linaService.createTextReply(fallbackBody, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("transcribe")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (this.linaTemporarilyDisabled) {
      throw new ServiceUnavailableException(
        this.linaTemporarilyDisabledMessage,
      );
    }

    return this.linaTranscriptionService.transcribe(file);
  }

  @UseGuards(JwtAuthGuard)
  @Post("voice")
  async voice(
    @Body() body: LinaVoiceDto,
    @Req() request: RequestWithUser,
  ) {
    if (this.linaTemporarilyDisabled) {
      throw new ServiceUnavailableException(
        this.linaTemporarilyDisabledMessage,
      );
    }

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

  private normalizeSourceModule(
    sourceModule?: string,
  ): LinaActionSourceModule {
    const allowedModules: LinaActionSourceModule[] = [
      "dashboard",
      "crm",
      "portfolio",
      "pool",
      "requests",
      "forum",
      "network",
      "project_sales",
      "kontor",
      "membership",
      "messages",
      "notifications",
      "admin",
      "general",
    ];

    return allowedModules.includes(sourceModule as LinaActionSourceModule)
      ? (sourceModule as LinaActionSourceModule)
      : "general";
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
