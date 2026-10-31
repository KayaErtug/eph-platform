import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SisterLinksService } from './sister-links.service';
import { SisterPoolService } from './sister-pool.service';
import { SisterRequestsService } from './sister-requests.service';

@Controller('office')
@UseGuards(JwtAuthGuard)
export class SisterController {
  constructor(
    private readonly links: SisterLinksService,
    private readonly pool: SisterPoolService,
    private readonly requests: SisterRequestsService,
  ) {}

  @Get(':id/sisters') list(@Req() req: any, @Param('id') id: string) { return this.links.list(req.user.id, id); }
  @Post(':id/sisters/invite') invite(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.links.invite(req.user.id, id, body ?? {}); }
  @Post(':id/sisters/:linkId/accept') accept(@Req() req: any, @Param('id') id: string, @Param('linkId') linkId: string) { return this.links.accept(req.user.id, id, linkId); }
  @Post(':id/sisters/:linkId/reject') reject(@Req() req: any, @Param('id') id: string, @Param('linkId') linkId: string) { return this.links.reject(req.user.id, id, linkId); }
  @Post(':id/sisters/:linkId/end') end(@Req() req: any, @Param('id') id: string, @Param('linkId') linkId: string) { return this.links.end(req.user.id, id, linkId); }

  @Patch(':id/pool/:unitId/sister-share') share(@Req() req: any, @Param('id') id: string, @Param('unitId') unitId: string, @Body('shared') shared: unknown) { return this.pool.setShare(req.user.id, id, unitId, shared); }

  @Get(':id/sister-pool') sisterPool(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.pool.pool(req.user.id, id, query); }
  @Get(':id/sister-pool/:unitId') sisterDetail(@Req() req: any, @Param('id') id: string, @Param('unitId') unitId: string) { return this.pool.detail(req.user.id, id, unitId); }
  @Post(':id/sister-pool/:unitId/private-request') privateRequest(@Req() req: any, @Param('id') id: string, @Param('unitId') unitId: string) { return this.pool.requestPrivateInfo(req.user.id, id, unitId); }

  @Get(':id/sister-requests') listRequests(@Req() req: any, @Param('id') id: string, @Query('box') box: unknown) { return this.requests.list(req.user.id, id, box); }
  @Post(':id/sister-requests/:reqId/approve') approve(@Req() req: any, @Param('id') id: string, @Param('reqId') reqId: string) { return this.requests.approve(req.user.id, id, reqId); }
  @Post(':id/sister-requests/:reqId/reject') rejectRequest(@Req() req: any, @Param('id') id: string, @Param('reqId') reqId: string) { return this.requests.reject(req.user.id, id, reqId); }
}
