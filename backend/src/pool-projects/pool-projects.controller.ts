import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoolProjectsService } from './pool-projects.service';

@Controller('pool-projects')
@UseGuards(JwtAuthGuard)
export class PoolProjectsController {
  constructor(private readonly service: PoolProjectsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.listProjects(user);
  }

  @Get(':projectId')
  detail(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.service.getProjectDetail(projectId, user);
  }

  @Get(':projectId/presentations')
  listPresentations(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listPresentations(projectId, user);
  }

  @Post(':projectId/presentations')
  createPresentation(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.service.createPresentation(projectId, user, durationHours);
  }

  @Patch('presentations/:id/renew')
  renewPresentation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('durationHours') durationHours?: number,
  ) {
    return this.service.renewPresentation(id, user, durationHours);
  }

  @Delete('presentations/:id')
  revokePresentation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revokePresentation(id, user);
  }
}
