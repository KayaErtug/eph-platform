import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { diskStorage, memoryStorage } from 'multer';
import { tmpdir } from 'os';
import { extname } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectMediaZipService } from './project-media-zip.service';
import { ProjectSalesService } from './project-sales.service';

const MEDIA_ZIP_MAX_FILE_SIZE = 200 * 1024 * 1024;

const mediaZipStorage = diskStorage({
  destination: tmpdir(),
  filename: (_request, file, callback) => {
    const extension =
      extname(file.originalname).toLocaleLowerCase('tr-TR') ||
      '.zip';

    callback(
      null,
      `eph-project-media-${Date.now()}-${randomUUID()}${extension}`,
    );
  },
});

@Controller('project-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesController {
  constructor(
    private readonly projectSalesService: ProjectSalesService,
    private readonly projectMediaZipService: ProjectMediaZipService,
  ) {}

  @Get('imports/config')
  getImportConfig() {
    return this.projectSalesService.getImportConfig();
  }

  @Post('imports/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  previewExcel(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Excel dosyası yüklenmedi.');
    }

    return this.projectSalesService.previewExcel(user.id, file);
  }

  @Get('media/:projectCode/config')
  getMediaZipConfig(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
  ) {
    return this.projectMediaZipService.getConfig(
      user.id,
      user.role,
      projectCode,
    );
  }

  @Get('media/:projectCode/packages')
  listMediaPackages(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
  ) {
    return this.projectMediaZipService.listPackages(
      user.id,
      user.role,
      projectCode,
    );
  }

  @Post('media/:projectCode/zip/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: mediaZipStorage,
      limits: {
        fileSize: MEDIA_ZIP_MAX_FILE_SIZE,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        const isZip =
          extname(file.originalname)
            .toLocaleLowerCase('tr-TR') === '.zip';

        callback(
          isZip
            ? null
            : new BadRequestException(
                'Yalnızca .zip dosyası yüklenebilir.',
              ),
          isZip,
        );
      },
    }),
  )
  previewMediaZip(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('replaceExisting') replaceExisting?: string,
  ) {
    if (!file) {
      throw new BadRequestException('ZIP dosyası yüklenmedi.');
    }

    return this.projectMediaZipService.previewZip({
      userId: user.id,
      userRole: user.role,
      projectCode,
      file,
      replaceExisting: replaceExisting === 'true',
    });
  }

  @Post('media/:projectCode/zip/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: mediaZipStorage,
      limits: {
        fileSize: MEDIA_ZIP_MAX_FILE_SIZE,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        const isZip =
          extname(file.originalname)
            .toLocaleLowerCase('tr-TR') === '.zip';

        callback(
          isZip
            ? null
            : new BadRequestException(
                'Yalnızca .zip dosyası yüklenebilir.',
              ),
          isZip,
        );
      },
    }),
  )
  uploadMediaZip(
    @CurrentUser() user: any,
    @Param('projectCode') projectCode: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('replaceExisting') replaceExisting?: string,
  ) {
    if (!file) {
      throw new BadRequestException('ZIP dosyası yüklenmedi.');
    }

    return this.projectMediaZipService.uploadZip({
      userId: user.id,
      userRole: user.role,
      projectCode,
      file,
      replaceExisting: replaceExisting === 'true',
    });
  }
}
