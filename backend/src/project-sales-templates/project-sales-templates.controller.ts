import {
  Controller,
  Get,
  NotFoundException,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const TEMPLATE_FILE_NAME =
  'EPH_Proje_Satis_Merkezi_Excel_Sablonu_V4.xlsx';

@Controller('project-sales/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI)
export class ProjectSalesTemplatesController {
  @Get('excel')
  downloadExcelTemplate(
    @Res({ passthrough: true }) response: Response,
  ) {
    const filePath = this.resolveTemplatePath();

    if (!filePath) {
      throw new NotFoundException(
        'Proje Satış Merkezi Excel şablonu bulunamadı.',
      );
    }

    const fileStat = statSync(filePath);
    const encodedFileName = encodeURIComponent(TEMPLATE_FILE_NAME);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Length', String(fileStat.size));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${TEMPLATE_FILE_NAME}"; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(createReadStream(filePath));
  }

  private resolveTemplatePath() {
    const candidates = [
      resolve(
        process.cwd(),
        'assets',
        'templates',
        TEMPLATE_FILE_NAME,
      ),
      resolve(
        process.cwd(),
        'backend',
        'assets',
        'templates',
        TEMPLATE_FILE_NAME,
      ),
    ];

    return candidates.find((candidate) => existsSync(candidate)) || null;
  }
}
