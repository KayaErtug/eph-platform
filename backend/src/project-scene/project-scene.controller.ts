import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSceneService } from './project-scene.service';

@Controller('project-sales/projects/:projectId/scene')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSceneController {
  constructor(private readonly projectSceneService: ProjectSceneService) {}

  @Get()
  getScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSceneService.getScene(projectId, user.id, user.role);
  }

  @Post('initialize')
  initializeScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSceneService.initializeScene(
      projectId,
      user.id,
      user.role,
    );
  }

  @Put()
  updateScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSceneService.updateScene(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('complete')
  completeScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSceneService.completeScene(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('skip')
  skipScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSceneService.skipScene(projectId, user.id, user.role);
  }

  @Delete('reset')
  resetScene(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSceneService.resetScene(projectId, user.id, user.role);
  }
}
