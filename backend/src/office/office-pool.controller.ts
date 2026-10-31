import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OfficePoolService } from './office-pool.service';

@Controller('office')
@UseGuards(JwtAuthGuard)
export class OfficePoolController {
  constructor(private readonly service: OfficePoolService) {}
  @Get(':id/pool') pool(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.service.pool(req.user.id, id, query); }
  @Patch(':id/pool/:unitId/visibility') visibility(@Req() req: any, @Param('id') id: string, @Param('unitId') unitId: string, @Body('hidden') hidden: unknown) { return this.service.setVisibility(req.user.id, id, unitId, hidden); }
}
