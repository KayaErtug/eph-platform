import {
  Controller,
  Delete,
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
import { ProjectMediaSingleService } from './project-media-single.service';

// EPH-19: POST /project-sales/media/:projectCode/packages/:packageId/images (multipart "file", tek fotoğraf)
@Controller('project-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectMediaSingleController {
  constructor(private readonly service: ProjectMediaSingleService) {}

  @Post('media/:projectCode/packages/:packageId/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
    @Param('packageId') packageId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadImage({
      userId: user.id,
      userRole: user.role,
      projectCode,
      packageId,
      file,
    });
  }

  @Delete('media/:projectCode/assets/:assetId')
  remove(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
    @Param('assetId') assetId: string,
  ) {
    return this.service.deleteAsset({ userId: user.id, userRole: user.role, projectCode, assetId });
  }
}
