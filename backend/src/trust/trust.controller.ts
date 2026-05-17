import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TrustService } from './trust.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('trust')
@UseGuards(JwtAuthGuard)
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get('my')
  getMyScore(@CurrentUser() user: any) {
    return this.trustService.getTrustScore(user.id);
  }

  @Get('user/:id')
  getUserScore(@Param('id') id: string) {
    return this.trustService.getTrustScore(id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.trustService.getLeaderboard();
  }
}