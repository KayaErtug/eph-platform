import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NativePushService } from './native-push.service';

@Controller('push/native')
@UseGuards(JwtAuthGuard)
export class NativePushController {
  constructor(private readonly service: NativePushService) {}

  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() body: { token?: unknown; platform?: unknown; sound?: unknown; preferences?: unknown }) {
    return this.service.subscribe(user.id, body);
  }

  @Post('unsubscribe')
  unsubscribe(@CurrentUser() user: any, @Body() body: { token?: unknown }) {
    return this.service.unsubscribe(user.id, body);
  }

  @Post('test')
  test(@CurrentUser() user: any, @Body() body: { token?: unknown }) {
    return this.service.test(user.id, body);
  }
}
