import { Body, Controller, Get, Post } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Post('subscribe')
  subscribe(
    @Body()
    body: {
      userId: string;
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
    },
  ) {
    return this.pushService.saveSubscription(body.userId, body.subscription);
  }

  @Post('test')
  test(@Body() body: { userId: string }) {
    return this.pushService.sendToUser(body.userId, {
      title: 'EPH Platform',
      body: 'Push bildirimi başarıyla çalışıyor.',
      url: '/messages',
    });
  }
}