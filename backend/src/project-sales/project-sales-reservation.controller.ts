import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesReservationService } from './project-sales-reservation.service';

@Controller('project-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesReservationController {
  constructor(
    private readonly projectSalesReservationService: ProjectSalesReservationService,
  ) {}

  @Post('units/:unitId/reservations')
  createReservation(
    @CurrentUser() user: any,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesReservationService.createReservation(
      unitId,
      user.id,
      user.role,
      body,
    );
  }

  @Get('projects/:projectId/reservations')
  listProjectReservations(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.projectSalesReservationService.listProjectReservations(
      projectId,
      user.id,
      user.role,
      status,
    );
  }

  @Patch('reservations/:reservationId/extend')
  extendReservation(
    @CurrentUser() user: any,
    @Param('reservationId') reservationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesReservationService.extendReservation(
      reservationId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('reservations/:reservationId/release')
  releaseReservation(
    @CurrentUser() user: any,
    @Param('reservationId') reservationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesReservationService.releaseReservation(
      reservationId,
      user.id,
      user.role,
      body,
    );
  }

  @Post('reservations/:reservationId/convert')
  convertReservation(
    @CurrentUser() user: any,
    @Param('reservationId') reservationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesReservationService.convertReservation(
      reservationId,
      user.id,
      user.role,
      body,
    );
  }
}
