import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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

  @Get(':portfolioId')
  @UseGuards(JwtAuthGuard)
  getPortfolioImages(@Param('portfolioId') portfolioId: string) {
    return this.portfolioImagesService.getPortfolioImages(portfolioId);
  }

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
      userRole: user.role,
      portfolioId,
      file,
      isCover: isCover === 'true',
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });
  }

  @Put(':imageId/cover')
  @UseGuards(JwtAuthGuard)
  setCoverImage(@CurrentUser() user: any, @Param('imageId') imageId: string) {
    return this.portfolioImagesService.setCoverImage({
      userId: user.id,
      userRole: user.role,
      imageId,
    });
  }

  @Put('reorder/:portfolioId')
  @UseGuards(JwtAuthGuard)
  reorderImages(
    @CurrentUser() user: any,
    @Param('portfolioId') portfolioId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.portfolioImagesService.reorderImages({
      userId: user.id,
      userRole: user.role,
      portfolioId,
      imageIds,
    });
  }

  @Delete(':imageId')
  @UseGuards(JwtAuthGuard)
  deleteImage(@CurrentUser() user: any, @Param('imageId') imageId: string) {
    return this.portfolioImagesService.deleteImage({
      userId: user.id,
      userRole: user.role,
      imageId,
    });
  }
}