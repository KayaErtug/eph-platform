import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesOfferService } from './project-sales-offer.service';

@Controller('project-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesOfferController {
  constructor(private readonly projectSalesOfferService: ProjectSalesOfferService) {}

  @Post('units/:unitId/offer-preview')
  previewOffer(
    @CurrentUser() user: any,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesOfferService.previewOffer(
      unitId,
      user.id,
      user.role,
      body,
    );
  }
}
