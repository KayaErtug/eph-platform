import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { ProjectSalesCompletionService } from './project-sales-completion.service';
import { ProjectSalesDashboardService } from './project-sales-dashboard.service';
import { ProjectSalesImportService } from './project-sales-import.service';
import { ProjectSalesInventoryService } from './project-sales-inventory.service';
import { ProjectSalesLaunchService } from './project-sales-launch.service';
import { ProjectSalesMediaSetupService } from './project-sales-media-setup.service';
import { ProjectSalesSetupService } from './project-sales-setup.service';
import { ProjectSalesSpacesService } from './project-sales-spaces.service';
import { ProjectSalesStockService } from './project-sales-stock.service';
import { ProjectSalesStructureService } from './project-sales-structure.service';
import { ProjectSalesService } from './project-sales.service';

const MEDIA_ZIP_MAX_FILE_SIZE = 200 * 1024 * 1024;

const mediaZipStorage = diskStorage({
  destination: tmpdir(),
  filename: (_request, file, callback) => {
    const extension =
      extname(file.originalname).toLocaleLowerCase('tr-TR') || '.zip';

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
    private readonly projectSalesCompletionService: ProjectSalesCompletionService,
    private readonly projectSalesImportService: ProjectSalesImportService,
    private readonly projectSalesInventoryService: ProjectSalesInventoryService,
    private readonly projectSalesLaunchService: ProjectSalesLaunchService,
    private readonly projectSalesMediaSetupService: ProjectSalesMediaSetupService,
    private readonly projectMediaZipService: ProjectMediaZipService,
    private readonly projectSalesDashboardService: ProjectSalesDashboardService,
    private readonly projectSalesSetupService: ProjectSalesSetupService,
    private readonly projectSalesSpacesService: ProjectSalesSpacesService,
    private readonly projectSalesStockService: ProjectSalesStockService,
    private readonly projectSalesStructureService: ProjectSalesStructureService,
  ) {}

  @Post('projects')
  createProjectDraft(
    @CurrentUser() user: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesSetupService.createProjectDraft(user.id, body);
  }

  @Get('projects')
  listProjectDrafts(@CurrentUser() user: any) {
    return this.projectSalesSetupService.listProjectDrafts(
      user.id,
      user.role,
    );
  }

  @Delete('projects/:projectId')
  deleteProjectDraft(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesSetupService.deleteProjectDraft(
      projectId,
      user.id,
      user.role,
    );
  }

  @Get('projects/:projectId/setup')
  getProjectSetup(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesSetupService.getProjectSetup(
      projectId,
      user.id,
      user.role,
    );
  }

  @Patch('projects/:projectId/setup')
  updateProjectDraft(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesSetupService.updateProjectDraft(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/structure/preview')
  previewProjectStructure(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesStructureService.previewStructure(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/structure/apply')
  applyProjectStructure(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesStructureService.applyStructure(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/inventory/preview')
  previewProjectInventory(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesInventoryService.previewInventory(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/inventory/apply')
  applyProjectInventory(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesInventoryService.applyInventory(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/inventory/replace')
  replaceProjectInventory(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesInventoryService.replaceInventory(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/spaces/preview')
  previewProjectSpaces(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesSpacesService.previewSpaces(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('projects/:projectId/spaces/apply')
  applyProjectSpaces(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesSpacesService.applySpaces(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Get('projects/:projectId/sales-stock')
  getProjectSalesStock(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesStockService.getProjectStock(
      projectId,
      user.id,
      user.role,
    );
  }

  @Patch('projects/:projectId/sales-stock/bulk')
  updateProjectSalesStockBulk(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesStockService.updateProjectStockBulk(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Patch('units/:unitId/sales-stock')
  updateProjectSalesStockUnit(
    @CurrentUser() user: any,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesStockService.updateUnitStock(
      unitId,
      user.id,
      user.role,
      body,
    );
  }

  @Get('projects/:projectId/completion-preview')
  previewProjectCompletion(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesCompletionService.previewCompletion(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('projects/:projectId/complete')
  completeProject(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesCompletionService.completeProject(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('projects/:projectId/design-review-requests')
  createProjectDesignReviewRequest(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesCompletionService.createDesignReviewRequest(
      projectId,
      user.id,
      user.role,
      body,
    );
  }

  @Get('projects/:projectId/design-review-requests')
  listProjectDesignReviewRequests(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesCompletionService.listProjectDesignReviewRequests(
      projectId,
      user.id,
      user.role,
    );
  }

  @Get('design-review-requests')
  listDesignReviewRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.projectSalesCompletionService.listDesignReviewRequests(
      user.role,
      status,
    );
  }

  @Patch('design-review-requests/:requestId')
  updateDesignReviewRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesCompletionService.updateDesignReviewRequest(
      requestId,
      user.id,
      user.role,
      body,
    );
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.projectSalesDashboardService.getDashboard(user.id);
  }

  @Get('projects/:projectId/launch')
  getProjectLaunchCenter(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesLaunchService.getLaunchCenter(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('projects/:projectId/launch/render-work-order')
  createProjectRenderWorkOrder(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesLaunchService.createRenderWorkOrder(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('projects/:projectId/launch/presentation-link')
  createProjectPresentationLink(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesLaunchService.createPresentationShareLink(
      projectId,
      user.id,
      user.role,
    );
  }

  @Post('projects/:projectId/launch/publish-to-pool')
  publishProjectToPool(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesLaunchService.publishToPool(
      projectId,
      user.id,
      user.role,
    );
  }

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

    return this.projectSalesImportService.previewExcel(user.id, file);
  }

  @Post('imports/commit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  commitExcel(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body('previewHash') previewHash?: string,
    @Body('confirmation') confirmation?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Excel dosyası yüklenmedi.');
    }

    return this.projectSalesImportService.commitExcel({
      userId: user.id,
      userRole: user.role,
      file,
      previewHash: previewHash || '',
      confirmation: confirmation || '',
    });
  }

  @Get('imports/batches/:batchId')
  getImportBatch(
    @CurrentUser() user: any,
    @Param('batchId') batchId: string,
  ) {
    return this.projectSalesImportService.getBatch(
      user.id,
      user.role,
      batchId,
    );
  }

  @Post('projects/:projectId/media-packages/ensure')
  ensureProjectMediaPackages(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectSalesMediaSetupService.ensureMediaPackages(
      projectId,
      user.id,
      user.role,
    );
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
          extname(file.originalname).toLocaleLowerCase('tr-TR') === '.zip';

        callback(
          isZip
            ? null
            : new BadRequestException('Yalnızca .zip dosyası yüklenebilir.'),
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
          extname(file.originalname).toLocaleLowerCase('tr-TR') === '.zip';

        callback(
          isZip
            ? null
            : new BadRequestException('Yalnızca .zip dosyası yüklenebilir.'),
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


