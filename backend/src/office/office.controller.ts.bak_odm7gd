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
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

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

  // EPH-70B2 (karar 18g): ödemesiz paket tanımı YALNIZ ADMIN/SÜPER ADMIN; gerekçe zorunlu + denetim. Kullanıcı (ofis sahibi) için kapalı kalır.
  // Canlıya alma Mustafa abi onayıyla (deploy yasağı sürer).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post("packages/purchase")
  async purchasePackageAdmin(@Req() req: any, @Body() body: { officeId?: string; packageCode?: string; gerekce?: string }) {
    const actorId = req.user?.id || req.user?.sub;
    return this.officeService.purchaseOfficePackage(actorId, String(body?.officeId ?? ''), String(body?.packageCode ?? ''), req.user?.role, body?.gerekce);
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
