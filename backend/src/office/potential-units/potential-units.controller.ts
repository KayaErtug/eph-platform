import {
  Body,
  Controller,
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
import {
  PotentialUnitSource,
  PotentialUnitStatus,
  PotentialUnitType,
} from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ConvertPotentialUnitDto,
  CreatePotentialUnitDto,
  UpdatePotentialUnitStatusDto,
} from './dto/create-potential-unit.dto';
import { PotentialUnitsService } from './potential-units.service';

@Controller('office/potential-units')
@UseGuards(JwtAuthGuard)
export class PotentialUnitsController {
  constructor(private readonly service: PotentialUnitsService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('officeId') officeId?: string,
    @Query('status') status?: PotentialUnitStatus,
    @Query('type') type?: PotentialUnitType,
    @Query('sourceType') sourceType?: PotentialUnitSource,
    @Query('createdById') createdById?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list(user, {
      officeId,
      status,
      type,
      sourceType,
      createdById,
      assignedUserId,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user);
  }

  @Get('nearby')
  getNearby(
    @CurrentUser() user: any,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.service.getNearby(
      user,
      Number(lat),
      Number(lng),
      radius ? Number(radius) : 100,
    );
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getById(id, user);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreatePotentialUnitDto) {
    return this.service.create(user, body);
  }

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentUser() _user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadPhoto(file);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdatePotentialUnitStatusDto,
  ) {
    return this.service.updateStatus(id, user, body);
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: ConvertPotentialUnitDto,
  ) {
    return this.service.convertToUnit(id, user, body);
  }
}
