import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContentSafetyService } from './content-safety.service';
import { CreateSafetyReportDto, ResolveSafetyReportDto, SafetyEntity, SafetyTargetDto } from './content-safety.dto';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class ContentSafetyController {
  constructor(private readonly safety: ContentSafetyService) {}
  @Get('me') mine(@CurrentUser() user: { id: string }) { return this.safety.mine(user.id); }
  @Get('blocks') blocks(@CurrentUser() user: { id: string }, @Query('cursor') cursor?: string) { return this.safety.listBlocks(user.id, cursor); }
  @Get('context/:entityType/:entityId') context(@CurrentUser() user: { id: string },
    @Param('entityType', new ParseEnumPipe(SafetyEntity)) entityType: SafetyEntity,
    @Param('entityId') entityId: string) { return this.safety.context(user.id, { entityType, entityId }); }
  @Post('reports') report(@CurrentUser() user: { id: string }, @Body() body: CreateSafetyReportDto) { return this.safety.report(user.id, body); }
  @Post('blocks') block(@CurrentUser() user: { id: string }, @Body() body: SafetyTargetDto) { return this.safety.block(user.id, body); }
  @Delete('blocks/:id') unblock(@CurrentUser() user: { id: string }, @Param('id', new ParseUUIDPipe()) id: string) { return this.safety.unblock(user.id, id); }
  @Get('moderation') queue(@CurrentUser() user: { id: string }) { return this.safety.queue(user.id); }
  @Post('moderation/:id/resolve') resolve(@CurrentUser() user: { id: string }, @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ResolveSafetyReportDto) { return this.safety.resolve(user.id, id, body); }
}
