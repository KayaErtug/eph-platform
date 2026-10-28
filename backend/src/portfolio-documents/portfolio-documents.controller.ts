import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PortfolioAuthorityType } from '@prisma/client';
import { memoryStorage } from 'multer';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioDocumentsService } from './portfolio-documents.service';

@Controller('portfolio-documents')
@UseGuards(JwtAuthGuard)
export class PortfolioDocumentsController {
  constructor(
    private readonly portfolioDocumentsService: PortfolioDocumentsService,
  ) {}

  @Get(':portfolioId')
  getPortfolioDocuments(
    @CurrentUser() user: any,
    @Param('portfolioId') portfolioId: string,
  ) {
    return this.portfolioDocumentsService.getPortfolioDocuments({
      userId: user.id,
      userRole: user.role,
      portfolioId,
    });
  }

  @Post(':portfolioId/submit-review')
  submitPortfolioForReview(
    @CurrentUser() user: any,
    @Param('portfolioId') portfolioId: string,
  ) {
    return this.portfolioDocumentsService.submitPortfolioForReview({
      userId: user.id,
      userRole: user.role,
      portfolioId,
    });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadPortfolioDocument(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('portfolioId') portfolioId: string,
    @Body('authorityType') authorityType: PortfolioAuthorityType,
  ) {
    return this.portfolioDocumentsService.uploadPortfolioDocument({
      userId: user.id,
      userRole: user.role,
      portfolioId,
      authorityType,
      file,
    });
  }

  @Patch(':documentId/approve')
  approvePortfolioDocument(
    @CurrentUser() user: any,
    @Param('documentId') documentId: string,
    @Body('note') note?: string,
  ) {
    return this.portfolioDocumentsService.approvePortfolioDocument({
      userId: user.id,
      userRole: user.role,
      documentId,
      note,
    });
  }

  @Patch(':documentId/reject')
  rejectPortfolioDocument(
    @CurrentUser() user: any,
    @Param('documentId') documentId: string,
    @Body('note') note?: string,
  ) {
    return this.portfolioDocumentsService.rejectPortfolioDocument({
      userId: user.id,
      userRole: user.role,
      documentId,
      note,
    });
  }

  @Patch(':documentId/request-reupload')
  requestPortfolioDocumentReupload(
    @CurrentUser() user: any,
    @Param('documentId') documentId: string,
    @Body('note') note?: string,
  ) {
    return this.portfolioDocumentsService.requestPortfolioDocumentReupload({
      userId: user.id,
      userRole: user.role,
      documentId,
      note,
    });
  }

  @Delete(':documentId')
  deletePortfolioDocument(
    @CurrentUser() user: any,
    @Param('documentId') documentId: string,
  ) {
    return this.portfolioDocumentsService.deletePortfolioDocument({
      userId: user.id,
      userRole: user.role,
      documentId,
    });
  }
}
