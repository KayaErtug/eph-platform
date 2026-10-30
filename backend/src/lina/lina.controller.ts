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
import { LinaNaturalCommandService } from "./actions/lina-natural-command.service";
import { LinaActionSourceModule } from "./actions/lina-action.types";
import { LinaDraftFlowService } from "./draft/lina-draft-flow.service";
import {
  LINA_ACTION_SOURCE_MODULES,
  normalizeLinaSourceModule,
} from "./lina-source-module";
import { LinaChatDto } from "./dto/lina-chat.dto";
import { LinaNetworkRequestDraftDto } from "./dto/lina-network-request-draft.dto";
import { LinaPreferencesDto } from "./dto/lina-preferences.dto";
import { LinaVoiceDto } from "./dto/lina-voice.dto";
import { LinaDistanceRequestDto } from "./geo/lina-distance.dto";
import { LinaDistanceService } from "./geo/lina-distance.service";
import { LinaMemoryService } from "./lina-memory.service";
import { LinaNetworkRequestDraftService } from "./lina-network-request-draft.service";
import { LinaScopeService } from "./lina-scope.service";
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
    private readonly linaScopeService: LinaScopeService,
    private readonly linaMemoryService: LinaMemoryService,
    private readonly linaNetworkRequestDraftService: LinaNetworkRequestDraftService,
    private readonly linaActionEngineService: LinaActionEngineService,
    private readonly linaConfirmationGateService: LinaConfirmationGateService,
    private readonly linaNaturalCommandService: LinaNaturalCommandService,
    private readonly linaDistanceService: LinaDistanceService,
    private readonly linaTranscriptionService: LinaTranscriptionService,
    private readonly linaDraftFlowService: LinaDraftFlowService,
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
  @Post("network/request-draft")
  async createNetworkRequestDraft(@Body() body: LinaNetworkRequestDraftDto) {
    const scope = await this.linaScopeService.classifyRequestDraft(String(body?.message || ""));
    if (scope === "OUT_OF_SCOPE") return this.linaScopeService.blockedReply();
    return this.linaNetworkRequestDraftService.create(body?.message);
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
    const scopeContext = await this.linaDraftFlowService.getScopeContext(user.id);
    const scope = await this.linaScopeService.classify(body, scopeContext);
    if (scope === "OUT_OF_SCOPE") return this.linaScopeService.blockedReply();
    const sourceModule = this.normalizeSourceModule(body?.sourceModule);

    // CRM müşteri/talep taslağı: kalıcı taslak + şemalı çıkarım; "Onayla" yalnız DB'deki taslağı kaydeder.
    if (user.id && user.role) {
      const draftResult = await this.linaDraftFlowService.handle(body, user, sourceModule);
      if (draftResult.handled) {
        return {
          success: Boolean(draftResult.success),
          message: draftResult.message || "Taslak güncellendi.",
          provider: "local" as const,
          kvkkFiltered: false,
          detectedTypes: [],
          action: draftResult.action,
          requiresConfirmation: draftResult.requiresConfirmation ?? false,
          data: draftResult.data,
        };
      }
    }
    const normalizedMessage = this.linaNaturalCommandService.normalize(
      body?.message,
    );

    let executionMessage = normalizedMessage;
    let confirmedGateExecution = false;

    if (user.id && user.role) {
      const gateResult = await this.linaConfirmationGateService.evaluate(
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

    if (executionMessage !== String(body?.message || "").trim()) {
      const executionScope = await this.linaScopeService.classify({ ...body, message: executionMessage }, scopeContext);
      if (executionScope === "OUT_OF_SCOPE") return this.linaScopeService.blockedReply();
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
    return normalizeLinaSourceModule(
      sourceModule,
      LINA_ACTION_SOURCE_MODULES,
    );
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
