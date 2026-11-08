import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('nominations')
@UseGuards(JwtAuthGuard)
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateNominationDto) {
    return this.nominationsService.create(req.user.id, dto);
  }

  @Get('my')
  findMy(@Request() req) {
    return this.nominationsService.findMyNominations(req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query('status') status?: string) {
    return this.nominationsService.findAll(status);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; adminNote?: string },
  ) {
    return this.nominationsService.updateStatus(id, body.status, body.adminNote);
  }

  @Patch(':id/note')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  addNote(@Param('id') id: string, @Body() body: { adminNote: string }) {
    return this.nominationsService.addAdminNote(id, body.adminNote);
  }
}