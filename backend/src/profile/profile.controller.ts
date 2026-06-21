import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('avatar-file/:fileName')
  getAvatarFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const safeFileName = path.basename(fileName);

    const filePath = path.resolve(
      process.cwd(),
      'public',
      'profile-images',
      safeFileName,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Profil fotoğrafı bulunamadı.');
    }

    return res.sendFile(filePath);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: any,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      city?: string;
      district?: string;
    },
  ) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadAvatar(user.id, file);
  }

  @Post('documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocumentType,
  ) {
    return this.profileService.uploadDocument(user.id, type, file);
  }
}
