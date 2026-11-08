import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { OfficeRealtorGuard } from './office-realtor.guard';
import { OfficeService } from "./office.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("office")
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Get("packages")
  async getPackages() {
    const packages = await this.officeService.getOfficePackages();
    return { ok: true, data: packages };
  }

  @UseGuards(JwtAuthGuard, OfficeRealtorGuard)
  @Get("mine")
  async getMyOffices(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.officeService.getMyOffices(userId, req.user?.role);
  }

  @UseGuards(JwtAuthGuard, OfficeRealtorGuard)
  @Post("trial/start")
  async startTrial(@Req() req: any, @Body("officeId") officeId: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.officeService.startOfficeTrial(userId, officeId, req.user?.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post("packages/purchase")
  async purchasePackageClosed() {
    throw new ForbiddenException(
      "Ofis paketi yalnızca doğrulanmış ödeme sonrası tanımlanır. Bu uç nokta kapatılmıştır; /office/packages/orders ile ödeme siparişi oluşturun.",
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("packages/orders")
  async createPackageOrder() {
    throw new ServiceUnavailableException(
      "Ofis paketi ödeme siparişi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("wallet-quote")
  async getWalletQuote(
    @Req() req: any,
    @Query("action") action?: string,
    @Query("walletSource") walletSource?: "PERSONAL" | "OFFICE",
    @Query("walletOfficeId") walletOfficeId?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.officeService.getWalletQuote(
      userId,
      action,
      walletSource,
      walletOfficeId,
    );
  }
}
