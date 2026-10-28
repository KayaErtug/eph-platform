import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectRenderService } from './project-render.service';

@Controller('project-sales/projects/:projectId/render')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectRenderController {
  constructor(
    private readonly projectRenderService: ProjectRenderService,
  ) {}

  @Get()
  getRenderStatus(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectRenderService.getRenderStatus(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('referenceImage', {
      storage: memoryStorage(),
      limits: {
        files: 1,
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  generateRender(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @UploadedFile() referenceImage?: Express.Multer.File,
  ) {
    return this.projectRenderService.startRender({
      projectId,
      userId: user.id,
      userRole: user.role,
      referenceImage,
    });
  }
}
