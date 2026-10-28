import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoolAudienceService } from './pool-audience.service';

@Controller('pool-audience')
@UseGuards(JwtAuthGuard)
export class PoolAudienceController {
  constructor(private readonly service: PoolAudienceService) {}

  @Get('roles')
  getRoles() {
    return this.service.getRoles();
  }

  @Get('groups')
  getGroups(@CurrentUser() user: any) {
    return this.service.getGroups(user);
  }

  @Post('groups')
  createGroup(
    @CurrentUser() user: any,
    @Body() body: { name?: string },
  ) {
    return this.service.createGroup(user, body);
  }

  @Get('groups/:id')
  getGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getGroup(id, user);
  }

  @Patch('groups/:id')
  updateGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { name?: string },
  ) {
    return this.service.updateGroup(id, user, body);
  }

  @Delete('groups/:id')
  deleteGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteGroup(id, user);
  }

  @Post('groups/:id/members')
  addGroupMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { userId?: string },
  ) {
    return this.service.addGroupMember(id, user, body);
  }

  @Delete('groups/:id/members/:userId')
  removeGroupMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeGroupMember(id, userId, user);
  }

  @Get('users')
  searchUsers(
    @CurrentUser() user: any,
    @Query('q') query?: string,
  ) {
    return this.service.searchUsers(user, query || '');
  }

  @Get('projects/:id')
  getProjectAudience(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getProjectAudience(id, user);
  }

  @Patch('projects/:id')
  updateProjectAudience(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { mode?: 'PUBLIC' | 'TARGETED'; roles?: string[]; groupIds?: string[] }) {
    return this.service.setProjectAudience(id, user, body);
  }

  @Get('units/:id')
  getUnitAudience(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getUnitAudience(id, user);
  }

  @Patch('units/:id')
  updateUnitAudience(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      mode?: 'PUBLIC' | 'TARGETED';
      roles?: string[];
      groupIds?: string[];
    },
  ) {
    return this.service.updateUnitAudience(id, user, body);
  }
}
