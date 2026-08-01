import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkPoolUnitDto } from './dto/link-pool-unit.dto';
import { PoolCrmCoordinationService } from './pool-crm-coordination.service';

@Controller('coordination')
@UseGuards(JwtAuthGuard)
export class PoolCrmCoordinationController {
  constructor(
    private readonly service: PoolCrmCoordinationService,
  ) {}

  @Post('crm/customers/:customerId/pool-units/:unitId/link')
  linkPoolUnitToCustomer(
    @Param('customerId') customerId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: any,
    @Body() body: LinkPoolUnitDto,
  ) {
    return this.service.linkPoolUnitToCustomer(
      customerId,
      unitId,
      user,
      body,
    );
  }
}
