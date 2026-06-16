import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KontorService } from './kontor.service';

@Controller('kontor')
@UseGuards(JwtAuthGuard)
export class KontorController {
  constructor(private readonly kontorService: KontorService) {}

  @Get('cuzdan')
  getCuzdan(@CurrentUser() user: any) {
    return this.kontorService.getCuzdan(user.id);
  }

  @Get('hareketler')
  getHareketler(@CurrentUser() user: any) {
    return this.kontorService.getHareketler(user.id);
  }

  @Get('ozet')
  getOzet(@CurrentUser() user: any) {
    return this.kontorService.getOzet(user.id);
  }

  @Get('paket')
  getPaket(@CurrentUser() user: any) {
    return this.kontorService.getPaket(user.id);
  }
}
