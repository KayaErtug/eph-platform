import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN, Role.EMLAKCI)
  create(@CurrentUser() user: any, @Body() body: {
    name: string;
    description?: string;
    city: string;
    district: string;
    address: string;
  }) {
    return this.projectsService.create(user.id, body);
  }

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('district') district?: string,
  ) {
    return this.projectsService.findAll({ city, district });
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN, Role.EMLAKCI)
  myProjects(@CurrentUser() user: any) {
    return this.projectsService.myProjects(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN, Role.EMLAKCI)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.projectsService.update(id, user.id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.ADMIN, Role.EMLAKCI)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.remove(id, user.id);
  }
}