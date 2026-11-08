import { resolveOfficeWallet } from '../office/office-wallet.rules';
import { grantLot, lockWallet } from '../kontor/wallet-lots';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OfficeEntitlementService, entitlementSource, resolveOfficeEntitlements } from './office-entitlement.service';
import { TELEFON_HASH_ENV, hashPhone } from '../common/telefon-hash';
import { addMonthClamped } from '../payments/payment.rules';
import { KontorHareketTuru, KontorIslemTuru, Prisma, Role } from "@prisma/client";

@Injectable()
export class OfficeService {
  private readonly entitlements: OfficeEntitlementService;

  constructor(private readonly prisma: PrismaService, @Optional() entitlements?: OfficeEntitlementService) {
    this.entitlements = entitlements ?? new OfficeEntitlementService(prisma);
  }

  async getMyOffices(userId: string, userRole?: Role | string) {
    if (!userId) return [];

    if (userRole === Role.SUPER_ADMIN) return this.prisma.office.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        office: { select: { id: true, name: true, isActive: true } },
      },
    });

    const ownedOffices = await this.prisma.office.findMany({
      where: { ownerUserId: userId, isActive: true },
      select: { id: true, name: true },
    });

    const result: Array<{ id: string; name: string }> = [];
    if (user?.office && user.office.isActive) {
      result.push({ id: user.office.id, name: user.office.name });
    }
    for (const o of ownedOffices) {
      if (!result.some((item) => item.id === o.id)) {
        result.push({ id: o.id, name: o.name });
      }
    }

    return result;
  }

  async getOfficePackages() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "OFFICE_MEMBERSHIP_PACKAGES" },
    });
    const packages = setting?.valueJson;
    return Array.isArray(packages) ? packages.filter((p: any) => p.active !== false) : [];
  }

  /**
   * EPH-70B2 — kartsız ofis denemesi. Tekillik: ofis (OfisDenemeKaydi.officeId UNIQUE) + telefon (HMAC-SHA256, karar 18h; TELEFON_HASH_ANAHTARI yoksa
   * deneme AÇILMAZ, sessiz fallback yok). Düzey/gün/PK OFFICE_TRIAL_CONFIG'ten (Gümüş seviyesi); PK, süreli (deneme bitişi) PAKET lotudur.
   */
  async startOfficeTrial(userId: string, officeId: string, userRole?: Role | string) {
    if (!userId) throw new ForbiddenException('Kullanıcı kimliği doğrulanamadı.');
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office || !office.isActive) throw new BadRequestException("Aktif ofis bulunamadı.");
    if (office.ownerUserId !== userId && userRole !== Role.SUPER_ADMIN) throw new ForbiddenException("Yalnızca ofis sahibi deneme paketi başlatabilir.");
    const beneficiaryId = office.ownerUserId;
    if (!beneficiaryId) throw new BadRequestException('Deneme paketi için önce ofis sahibi atanmalıdır.');
    const owner = await this.prisma.user.findUnique({ where: { id: beneficiaryId }, select: { phone: true } });
    let telefonHash: string;
    try { telefonHash = hashPhone(String(owner?.phone ?? '')); }
    catch (error) {
      const message = error instanceof Error && error.message.includes(TELEFON_HASH_ENV) ? 'Deneme paketi şu anda başlatılamıyor.' : 'Deneme paketi için geçerli bir telefon numarası gerekir.';
      throw new BadRequestException(message);
    }
    try {
      const result = await this.prisma.$transaction((tx) => this.entitlements.grantTrial(tx, { officeId, ownerUserId: beneficiaryId, telefonHash, actorUserId: userId }), { timeout: 20000 });
      return {
        ok: true, officeId: office.id, beneficiaryUserId: beneficiaryId, packageName: "Ofis Deneme", grantedPk: result.grantedPk, trialDays: result.trialDays,
        portfolioCapacity: result.level.portfolio, crmCapacity: result.level.crm, balance: result.balance, trialId: result.record.id, expiresAt: result.expiresAt,
      };
    } catch (error) {
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'P2002') throw new BadRequestException('Bu ofis veya telefon numarasıyla deneme paketi daha önce kullanılmıştır.');
      throw error;
    }
  }

  /**
   * Karar 18g (EPH-70B2): ödemesiz paket tanımı YALNIZ ADMIN/SÜPER ADMIN. Ortak grant yolundan (kanal ADMIN) geçer; gerekçe zorunlu, denetim kaydı yazılır.
   * Hak sahibi ofis sahibidir; dönem 1 ay (addMonthClamped). Kullanıcı kaynaklı HTTP yolu yoktur.
   */
  async purchaseOfficePackage(actorId: string, officeId: string, packageCode: string, actorRole?: Role | string, gerekce?: string) {
    if (actorRole !== Role.ADMIN && actorRole !== Role.SUPER_ADMIN) throw new ForbiddenException('Ödemesiz ofis paketi yalnız yönetici tarafından tanımlanabilir.');
    if (!gerekce || !gerekce.trim()) throw new BadRequestException('Gerekçe zorunludur.');
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, select: { id: true, isActive: true, ownerUserId: true } });
    if (!office || !office.isActive || !office.ownerUserId) throw new BadRequestException("Aktif ofis bulunamadı.");
    const now = new Date();
    const result = await this.prisma.$transaction((tx) => this.entitlements.grantPackage(tx, {
      officeId, hakSahibiUserId: office.ownerUserId as string, paketKodu: String(packageCode ?? ''), kanal: 'ADMIN', kaynakAbonelikAnahtari: `admin:${officeId}:${now.getTime()}`,
      donemBaslangic: now, donemBitis: addMonthClamped(now), tutar: 0, admin: { actorUserId: actorId, gerekce: gerekce.trim() }, at: now,
    }), { timeout: 20000 });
    return { ok: true, officeId, packageCode: String(packageCode).toUpperCase(), grantedPk: result.grantedPk, abonelikId: result.abonelikId };
  }

  async getOfficeCapacity(officeId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    if (await entitlementSource(client) === 'relational') {
      // EPH-70B2: tek çözümleyici. crmCapacity null = sınırsız (eski -1 sözleşmesiyle uyumlu dönüş: -1).
      const eff = await resolveOfficeEntitlements(client, officeId);
      return { crmCapacity: eff.crm === null ? -1 : eff.crm, portfolioCapacity: eff.portfolio, agents: eff.agents, packageName: eff.packageName };
    }
    const subSetting = await client.systemSetting.findUnique({
      where: { key: `OFFICE_SUBSCRIPTION_${officeId}` },
    });
    if (subSetting?.valueJson) {
      const sub: any = subSetting.valueJson;
      const packages = await this.getOfficePackages();
      const configured: any = packages.find((p: any) => p.code === sub.packageCode);
      const current = configured || sub;
      return {
        crmCapacity: Number(current.crmCapacity ?? 1500),
        portfolioCapacity: Number(current.portfolioCapacity ?? 150),
        agents: Number(current.agents ?? 5),
        packageName: String(current.name || sub.packageName || "Ofis"),
      };
    }
    const packages = await this.getOfficePackages();
    const trial: any = packages.find((p: any) => p.code === 'DENEME');
    return {
      crmCapacity: Number(trial?.crmCapacity ?? 1500),
      portfolioCapacity: Number(trial?.portfolioCapacity ?? 150),
      agents: Number(trial?.agents ?? 5),
      packageName: String(trial?.name || "Ofis Deneme"),
    };
  }

  async getWalletQuote(
    userId: string,
    action?: string,
    walletSource?: "PERSONAL" | "OFFICE",
    walletOfficeId?: string,
  ) {
    if (walletSource === 'OFFICE' && !walletOfficeId) throw new BadRequestException('Ortak PK için ofis seçiniz.');
    if ((walletSource && !['PERSONAL', 'OFFICE'].includes(walletSource)) || (walletSource === 'PERSONAL' && walletOfficeId)) throw new BadRequestException('Geçersiz PK kaynağı.');
    let costPk = 25;
    try {
      const setting =
        (await this.prisma.systemSetting.findUnique({ where: { key: "COST_OZEL_BILGI" } })) ??
        (await this.prisma.systemSetting.findUnique({ where: { key: "REQUEST_PRIVATE_INFO_COST" } }));
      if (
        setting &&
        setting.valueJson !== null &&
        setting.valueJson !== undefined
      ) {
        const val = Number(setting.valueJson);
        if (!isNaN(val) && val > 0) costPk = val;
      }
    } catch {
      // fallback
    }

    const selected = await resolveOfficeWallet(this.prisma, userId, { walletSource, walletOfficeId });
    const wallet = await this.prisma.kontorCuzdani.findUnique({ where: { kullaniciId: selected.chargeUserId } });
    const balance = wallet?.bakiye ?? 0;

    return {
      costPk,
      balance,
      eligible: wallet?.aktifMi === true && balance >= costPk,
    };
  }
}
