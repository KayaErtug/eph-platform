import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PortfolioImagesService } from './portfolio-images.service';

@Controller('portfolio-images')
export class PortfolioImagesController {
  constructor(
    private readonly portfolioImagesService: PortfolioImagesService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadPortfolioImage(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('portfolioId') portfolioId: string,
    @Body('isCover') isCover?: string,
    @Body('sortOrder') sortOrder?: string,
  ) {
    return this.portfolioImagesService.uploadPortfolioImage({
      userId: user.id,
      portfolioId,
      file,
      isCover: isCover === 'true',
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });
  }
}
