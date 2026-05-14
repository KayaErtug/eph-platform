import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() body: {
    fullName?: string;
    phone?: string;
    email?: string;
    profession?: string;
    city?: string;
    interest?: string;
    conversation?: string;
    source?: string;
  }) {
    return this.leadsService.create(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.leadsService.findAll();
  }
}