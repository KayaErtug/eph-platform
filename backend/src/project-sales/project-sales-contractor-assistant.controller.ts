import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectSalesContractorAssistantService } from './project-sales-contractor-assistant.service';

type AuthenticatedUser = {
  id: string;
  role: Role;
};

@Controller('project-sales/contractor-assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MUTEAHHIT, Role.INSAAT_FIRMASI, Role.SUPER_ADMIN)
export class ProjectSalesContractorAssistantController {
  constructor(
    private readonly projectSalesContractorAssistantService: ProjectSalesContractorAssistantService,
  ) {}

  @Post('ask')
  ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectSalesContractorAssistantService.ask(
      user.id,
      user.role,
      body,
    );
  }
}
