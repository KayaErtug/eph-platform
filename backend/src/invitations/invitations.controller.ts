import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  create(@Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(dto);
  }

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.invitationsService.validate(code);
  }

  @Get('my')
  findAll() {
    return this.invitationsService.findAll();
  }

  @Patch(':code/revoke')
  revoke(@Param('code') code: string) {
    return this.invitationsService.revoke(code);
  }
}