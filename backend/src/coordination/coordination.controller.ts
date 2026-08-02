import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoordinationService } from './coordination.service';
import { PublishCrmInterestDto } from './dto/publish-crm-interest.dto';

@Controller('coordination')
@UseGuards(JwtAuthGuard)
export class CoordinationController {
  constructor(
    private readonly coordinationService: CoordinationService,
  ) {}

  @Post('crm/interests/:interestId/publish-request')
  publishCrmInterestToRequestCenter(
    @Param('interestId') interestId: string,
    @CurrentUser() user: any,
    @Body() body: PublishCrmInterestDto,
  ) {
    return this.coordinationService.publishCrmInterestToRequestCenter(
      interestId,
      user,
      body,
    );
  }

  @Get('crm/interests/:interestId/request-status')
  getCrmInterestRequestStatus(
    @Param('interestId') interestId: string,
    @CurrentUser() user: any,
  ) {
    return this.coordinationService.getCrmInterestRequestStatus(
      interestId,
      user,
    );
  }

  @Post('requests/:postId/create-crm-opportunity')
  createCrmOpportunityFromRequest(
    @Param('postId') postId: string,
    @CurrentUser() user: any,
  ) {
    return this.coordinationService.createCrmOpportunityFromRequest(
      postId,
      user,
    );
  }

  @Get('requests/:postId/crm-status')
  getRequestCrmStatus(
    @Param('postId') postId: string,
    @CurrentUser() user: any,
  ) {
    return this.coordinationService.getRequestCrmStatus(postId, user);
  }
}
