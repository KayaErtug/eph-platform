import { lockWallet } from '../kontor/wallet-lots';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { readTrialPolicy, resolveInitialTrialDays } from "../pricing/trial-policy";
import {
  KontorHareketTuru,
  KontorIslemTuru,
  PaymentOrderPurpose,
  PaymentOrderStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  PortfolioCreditLotTuru,
  Prisma,
  Role,
  UyelikDurumu,
  UyelikPaketKodu,
  UyelikPaketSegmenti,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { addMonthClamped, jsonObject } from '../payments/payment.rules';
import { OfficeEntitlementService, entitlementSource } from '../office/office-entitlement.service';

@Injectable()
export class MembershipService {
  private readonly officeEntitlements: OfficeEntitlementService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() officeEntitlements?: OfficeEntitlementService,
  ) {
    this.officeEntitlements = officeEntitlements ?? new OfficeEntitlementService(prisma);
  }

  private resolveSegment(
    role: Role,
  ): UyelikPaketSegmenti {
    if (role === Role.EMLAKCI || role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      return UyelikPaketSegmenti.EMLAK_PRO;
    }

    if (
      role === Role.MUTEAHHIT ||
      role === Role.INSAAT_FIRMASI
    ) {
      return UyelikPaketSegmenti.MUTEAHHIT;
    }

    throw new ForbiddenException(
      'Bu hesap türü için üyelik paketi satın alma akışı bulunmuyor.',
    );
  }

  private async getUser(userId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    if (!userId) {
      throw new ForbiddenException(
        'Kullanıcı kimliği doğrulanamadı.',
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Kullanıcı bulunamadı.',
      );
    }

    return user;
  }

  private async findCurrentMembership(
    userId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const now = new Date();

    const membership =
      await db.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: userId,
          durum: UyelikDurumu.AKTIF,
          baslangicTarihi: {
            lte: now,
          },
          OR: [
            { bitisTarihi: null },
            {
              bitisTarihi: {
                gte: now,
              },
            },
          ],
        },
        orderBy: {
          baslangicTarihi: 'desc',
        },
      });

    if (!membership) {
      const userOffice = await db.user.findUnique({
        where: { id: userId },
        select: {
          officeId: true,
          office: {
            select: {
              isActive: true,
              ownerUserId: true,
            },
          },
        },
      });
      if (
        userOffice?.officeId &&
        userOffice.office?.isActive &&
        userOffice.office.ownerUserId &&
        userOffice.office.ownerUserId !== userId
      ) {
        return this.findCurrentMembership(userOffice.office.ownerUserId, db);
      }
      return null;
    }

    const paket =
      await db.uyelikPaketi.findUnique({
        where: {
          id: membership.paketId,
        },
      });

    if (!paket) {
      return null;
    }

    return {
      membership,
      paket,
    };
  }

  private serializePackage(paket: any) {
    return {
      id: paket.id,
      paketKodu: paket.paketKodu,
      segment: paket.segment,
      paketAdi: paket.paketAdi,
      aciklama: paket.aciklama,
      aktifPortfoyLimiti:
        paket.aktifPortfoyLimiti,
      aktifCrmLimiti:
        paket.aktifCrmLimiti ?? 100,
      aylikTalepLimiti:
        paket.aylikTalepLimiti,
      aylikHavuzGonderimLimiti:
        paket.aylikHavuzGonderimLimiti,
      aylikMatchLimiti:
        paket.aylikMatchLimiti,
      aylikYeniGorusmeLimiti:
        paket.aylikYeniGorusmeLimiti,
      projeLimiti: paket.projeLimiti,
      projeIlanLimiti:
        paket.projeIlanLimiti,
      aylikPaketPk: paket.aylikPaketPk,
      denemeGunSayisi:
        paket.denemeGunSayisi,
      fiyat:
        paket.fiyat === null
          ? null
          : Number(paket.fiyat),
      paraBirimi: paket.paraBirimi,
      aktifMi: paket.aktifMi,
    };
  }

  async getPackages(userId: string) {
    const user = await this.getUser(userId);
    const segment = this.resolveSegment(user.role);

    const packages =
      await this.prisma.uyelikPaketi.findMany({
        where: {
          segment,
          aktifMi: true,
        },
        orderBy: [
          { fiyat: 'asc' },
          { paketKodu: 'asc' },
        ],
      });

    return {
      segment,
      packages: packages.map((paket) =>
        this.serializePackage(paket),
      ),
    };
  }

  async getCurrent(userId: string) {
    const user = await this.getUser(userId);
    const segment = this.resolveSegment(user.role);

    const current =
      await this.findCurrentMembership(userId);

    if (!current) {
      return {
        segment,
        membership: null,
      };
    }

    return {
      segment,
      membership: {
        id: current.membership.id,
        durum: current.membership.durum,
        baslangicTarihi:
          current.membership.baslangicTarihi,
        bitisTarihi:
          current.membership.bitisTarihi,
        paket: this.serializePackage(
          current.paket,
        ),
      },
    };
  }

  async startTrialMembership(userId: string) {
    const user = await this.getUser(userId);
    const segment = this.resolveSegment(user.role);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`trial-start:${userId}`})
        )
      `;

      const previousMembership =
        await tx.kullaniciUyelikPaketi.findFirst({
          where: {
            kullaniciId: userId,
          },
          select: {
            id: true,
          },
        });

      if (previousMembership) {
        return {
          started: false,
          reason: "MEMBERSHIP_HISTORY_EXISTS" as const,
        };
      }

      const paket =
        await tx.uyelikPaketi.findUnique({
          where: {
            paketKodu_segment: {
              paketKodu: UyelikPaketKodu.DENEME,
              segment,
            },
          },
        });

      if (!paket || !paket.aktifMi) {
        throw new NotFoundException(
          "Aktif DENEME üyelik paketi bulunamadı.",
        );
      }

      const initialDays = resolveInitialTrialDays(
        paket,
        await readTrialPolicy(tx),
      );

      const now = new Date();
      const endDate = new Date(now);

      endDate.setUTCDate(
        endDate.getUTCDate() + initialDays,
      );

      const membership =
        await tx.kullaniciUyelikPaketi.create({
          data: {
            kullaniciId: userId,
            paketId: paket.id,
            durum: UyelikDurumu.AKTIF,
            baslangicTarihi: now,
            bitisTarihi: endDate,
            pilotPaketMi: false,
            testPaketiMi: false,
            notlar:
              "Profesyonel belge doğrulaması sonrası otomatik DENEME üyeliği",
          },
        });

      const packagePk =
        Number(paket.aylikPaketPk || 0);

      let portfolioCreditLotId: string | null =
        null;

      if (packagePk > 0) {
        const creditLot =
          await tx.portfolioCreditLot.create({
            data: {
              kullaniciId: userId,
              lotTuru:
                PortfolioCreditLotTuru.PAKET,
              ilkMiktar: packagePk,
              kalanMiktar: packagePk,
              sonKullanmaTarihi: endDate,
              kaynakKayitTuru:
                "TRIAL_MEMBERSHIP",
              kaynakKayitId:
                membership.id,
              uyelikId:
                membership.id,
              dedupeKey:
                `trial:${membership.id}:package-pk`,
              aciklama:
                `${paket.paketAdi} DENEME paketi PK tanımı`,
              aktifMi: true,
            },
          });

        portfolioCreditLotId =
          creditLot.id;

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${userId}`}))`;
        await tx.kontorCuzdani.upsert({
          where: {
            kullaniciId: userId,
          },
          update: {},
          create: {
            kullaniciId: userId,
            bakiye: 0,
            toplamYukleme: 0,
            toplamHarcama: 0,
            toplamHediye: 0,
            aktifMi: true,
          },
        });

        // EPH-70B1/K1: tek kilit sırası (advisory + FOR UPDATE)
        const wallet = await lockWallet(tx, userId);

        if (!wallet) {
          throw new BadRequestException(
            "Kullanıcı PK cüzdanı oluşturulamadı.",
          );
        }

        const updatedWallet =
          await tx.kontorCuzdani.update({
            where: {
              kullaniciId: userId,
            },
            data: {
              bakiye: {
                increment: packagePk,
              },
              toplamYukleme: {
                increment: packagePk,
              },
              aktifMi: true,
            },
          });

        await tx.kontorHareketi.create({
          data: {
            kullaniciId: userId,
            hareketTuru:
              KontorHareketTuru.YUKLEME,
            islemTuru:
              KontorIslemTuru.DIGER,
            miktar: packagePk,
            oncekiBakiye:
              wallet.bakiye,
            sonrakiBakiye:
              updatedWallet.bakiye,
            aciklama:
              `${paket.paketAdi} DENEME paketi PK yüklemesi`,
            ilgiliKayitTuru:
              "TRIAL_MEMBERSHIP",
            ilgiliKayitId:
              membership.id,
            olusturanId: null,
          },
        });
      }

      return {
        started: true,
        membershipId:
          membership.id,
        paketId:
          paket.id,
        paketKodu:
          paket.paketKodu,
        segment:
          paket.segment,
        initialDays,
        baslangicTarihi:
          membership.baslangicTarihi,
        bitisTarihi:
          membership.bitisTarihi,
        packagePk,
        portfolioCreditLotId,
      };
    });
  }

  async createPaymentOrder(
    userId: string,
    dto: CreatePaymentOrderDto,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const user = await this.getUser(userId, db);
    const segment = this.resolveSegment(user.role);

    if (!dto?.paketKodu) {
      throw new BadRequestException(
        'Paket kodu zorunludur.',
      );
    }

    if (
      !Object.values(UyelikPaketKodu).includes(
        dto.paketKodu,
      )
    ) {
      throw new BadRequestException(
        'Geçersiz paket kodu.',
      );
    }

    if (
      dto.paketKodu ===
      UyelikPaketKodu.DENEME
    ) {
      throw new BadRequestException(
        'Deneme paketi ödeme ile satın alınamaz.',
      );
    }

    const target =
      await db.uyelikPaketi.findUnique({
        where: {
          paketKodu_segment: {
            paketKodu: dto.paketKodu,
            segment,
          },
        },
      });

    if (!target || !target.aktifMi) {
      throw new NotFoundException(
        'Satın alınabilir üyelik paketi bulunamadı.',
      );
    }

    if (
      target.fiyat === null ||
      Number(target.fiyat) <= 0
    ) {
      throw new BadRequestException(
        'Paket için geçerli satış fiyatı bulunamadı.',
      );
    }

    const current =
      await this.findCurrentMembership(userId, db);

    let purpose: PaymentOrderPurpose =
      PaymentOrderPurpose.MEMBERSHIP_PURCHASE;

    if (current) {
      if (
        current.paket.paketKodu ===
        target.paketKodu
      ) {
        purpose =
          PaymentOrderPurpose.MEMBERSHIP_RENEWAL;
      } else {
        const currentPrice =
          current.paket.fiyat === null
            ? 0
            : Number(current.paket.fiyat);

        const targetPrice =
          Number(target.fiyat);

        if (targetPrice <= currentPrice) {
          throw new BadRequestException(
            'Daha düşük pakete geçiş dönem sonunda uygulanacaktır. Bu akış henüz aktif değildir.',
          );
        }

        purpose =
          PaymentOrderPurpose.MEMBERSHIP_UPGRADE;
      }
    }

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000,
    );

    const order =
      await db.paymentOrder.create({
        data: {
          siparisNo:
            `EPH-${Date.now()}-${randomUUID()
              .slice(0, 8)
              .toUpperCase()}`,
          kullaniciId: userId,
          amac: purpose,
          durum: PaymentOrderStatus.CREATED,
          tutar: target.fiyat,
          paraBirimi: target.paraBirimi,
          hedefPaketId: target.id,
          fiyatSnapshot: {
            ...this.serializePackage(target),
            paketKodu: target.paketKodu,
            segment: target.segment,
            paketAdi: target.paketAdi,
            fiyat: Number(target.fiyat),
            paraBirimi: target.paraBirimi,
            aylikPaketPk:
              target.aylikPaketPk,
          },
          metadata: current
            ? {
                mevcutUyelikId:
                  current.membership.id,
                mevcutPaketId:
                  current.paket.id,
                mevcutPaketKodu:
                  current.paket.paketKodu,
              }
            : undefined,
          expiresAt,
        },
      });

    return {
      order: {
        id: order.id,
        siparisNo: order.siparisNo,
        amac: order.amac,
        durum: order.durum,
        tutar: Number(order.tutar),
        paraBirimi: order.paraBirimi,
        hedefPaketId:
          order.hedefPaketId,
        expiresAt: order.expiresAt,
      },
      paket: this.serializePackage(target),
      paymentRequired: true,
      paymentStarted: false,
    };
  }

  /**
   * Yalnız doğrulanmış provider ödeme akışı tarafından çağrılmalıdır.
   * Public controller endpointi değildir.
   */
  async settlePaidOrder(orderId: string, transaction?: Prisma.TransactionClient) {
    if (!orderId) {
      throw new BadRequestException(
        'Ödeme siparişi kimliği zorunludur.',
      );
    }

    const settle = async (tx: Prisma.TransactionClient) => {
      const owner = await tx.paymentOrder.findUnique({ where: { id: orderId }, select: { kullaniciId: true } });
      if (owner) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-user:${owner.kullaniciId}`}))`;
      await tx.$queryRaw`
        SELECT "id"
        FROM "PaymentOrder"
        WHERE "id" = ${orderId}
        FOR UPDATE
      `;

      const existingSettlement =
        await tx.paymentSettlement.findUnique({
          where: { orderId },
        });

      if (existingSettlement) {
        return {
          settled: true,
          alreadySettled: true,
          settlementId: existingSettlement.id,
        };
      }

      const order =
        await tx.paymentOrder.findUnique({
          where: { id: orderId },
          include: {
            hedefPaket: true,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Ödeme siparişi bulunamadı.',
        );
      }

      if (order.durum !== PaymentOrderStatus.PAID) {
        throw new BadRequestException(
          'Yalnız PAID durumundaki ödeme siparişi settle edilebilir.',
        );
      }

      // EPH-70B1F/D8 (§11/19): finans incelemesindeki veya hak verilmemiş işaretli sipariş settle edilemez;
      // mağaza kanallarında tutarı 0 olan sipariş de hak vermez. (iyzico akışı etkilenmez: kanal/işaret yoksa geçer.)
      {
        const meta = jsonObject(order.metadata);
        if (meta.requiresFinanceReview === true || meta.entitlementGranted === false || ((order.kanal === 'APPLE' || order.kanal === 'GOOGLE') && Number(order.tutar) <= 0)) {
          throw new BadRequestException('Bu sipariş finans incelemesinde veya tutarı 0; hak tanımlanamaz.');
        }
      }

      const successfulTransaction =
        await tx.paymentTransaction.findFirst({
          where: {
            orderId: order.id,
            durum: PaymentTransactionStatus.SUCCEEDED,
            islemTuru: {
              in: [
                PaymentTransactionType.PAYMENT,
                PaymentTransactionType.CAPTURE,
              ],
            },
          },
          orderBy: {
            olusturulmaTarihi: 'desc',
          },
        });

      if (!successfulTransaction) {
        throw new BadRequestException(
          'Başarılı ödeme transaction kaydı bulunamadı.',
        );
      }

      if (
        Number(successfulTransaction.tutar) !==
          Number(order.tutar) ||
        successfulTransaction.paraBirimi !==
          order.paraBirimi
      ) {
        throw new BadRequestException(
          'Ödeme transaction tutarı veya para birimi siparişle eşleşmiyor.',
        );
      }

      if (jsonObject(order.metadata).paymentMode === 'sandbox') {
        const owner = await tx.user.findUnique({ where: { id: order.kullaniciId }, select: { hesapTuru: true } });
        if (owner?.hesapTuru !== 'TEST') throw new BadRequestException('Sandbox hakları yalnız TEST hesabına tanımlanır.');
      }
      // EPH-70B2: ofis paketi / eklenti siparişi -> ilişkisel ofis hakkı (OfficeEntitlementService). Kilit sırası payment-user -> office -> wallet.
      if (order.amac === PaymentOrderPurpose.OFFICE_PACKAGE || order.amac === PaymentOrderPurpose.OFFICE_ADDON) {
        return this.settleOfficeOrder(tx, order, successfulTransaction.id);
      }

      if (
        order.amac ===
        PaymentOrderPurpose.PK_PURCHASE
      ) {
        const amount = Number(order.pkMiktari);
        if (!Number.isSafeInteger(amount) || amount <= 0) throw new BadRequestException('Geçersiz PK miktarı.');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${order.kullaniciId}`}))`;
        await tx.kontorCuzdani.upsert({ where: { kullaniciId: order.kullaniciId }, update: {}, create: { kullaniciId: order.kullaniciId } });
        const wallet = await lockWallet(tx, order.kullaniciId);
        if (!wallet) throw new BadRequestException('PK cüzdanı bulunamadı.');
        if (!wallet.aktifMi) throw new BadRequestException('PK cüzdanı kapalı; ödeme destek incelemesi gerektiriyor.');
        const updated = await tx.kontorCuzdani.update({ where: { id: wallet.id }, data: { bakiye: { increment: amount }, toplamYukleme: { increment: amount } } });
        const lot = await tx.portfolioCreditLot.create({ data: {
          kullaniciId: order.kullaniciId, lotTuru: PortfolioCreditLotTuru.SATIN_ALMA, ilkMiktar: amount, kalanMiktar: amount,
          kaynakKayitTuru: 'PAYMENT_ORDER', kaynakKayitId: order.id, paymentOrderId: order.id,
          dedupeKey: `payment:${order.id}:purchased-pk`, aciklama: 'Kart ödemesi ile PK satın alma',
        } });
        await tx.kontorHareketi.create({ data: {
          kullaniciId: order.kullaniciId, hareketTuru: KontorHareketTuru.YUKLEME, islemTuru: KontorIslemTuru.DIGER,
          miktar: amount, oncekiBakiye: wallet.bakiye, sonrakiBakiye: updated.bakiye,
          aciklama: 'Kart ödemesi ile PK satın alma', ilgiliKayitTuru: 'PAYMENT_ORDER', ilgiliKayitId: order.id,
        } });
        const settlement = await tx.paymentSettlement.create({ data: { orderId: order.id, kullaniciId: order.kullaniciId,
          portfolioCreditLotId: lot.id, metadata: { orderPurpose: order.amac, purchasedPk: amount, transactionId: successfulTransaction.id } } });
        return { settled: true, alreadySettled: false, settlementId: settlement.id, portfolioCreditLotId: lot.id, packagePk: amount };

      }

      const paket = order.hedefPaket;

      if (!paket) {
        throw new BadRequestException(
          'Üyelik siparişinde hedef paket bulunamadı.',
        );
      }

      const now = new Date();

      const currentMembership =
        await tx.kullaniciUyelikPaketi.findFirst({
          where: {
            kullaniciId: order.kullaniciId,
            durum: UyelikDurumu.AKTIF,
          },
          orderBy: {
            baslangicTarihi: 'desc',
          },
        });

      const expectedMembershipId = jsonObject(order.metadata).mevcutUyelikId;
      if (currentMembership && currentMembership.bitisTarihi > now &&
        currentMembership.paketId !== paket.id && currentMembership.id !== expectedMembershipId) {
        throw new BadRequestException('Üyelik ödeme sırasında değişmiş; hak tanımlaması inceleme gerektiriyor.');
      }
      let membership;

      if (
        order.amac ===
        PaymentOrderPurpose.MEMBERSHIP_RENEWAL
      ) {
        if (!currentMembership) {
          throw new BadRequestException(
            'Yenilenecek aktif üyelik bulunamadı.',
          );
        }

        if (
          currentMembership.paketId !==
          paket.id
        ) {
          throw new BadRequestException(
            'Yenileme siparişi mevcut üyelik paketiyle eşleşmiyor.',
          );
        }

        const renewalBase =
          currentMembership.bitisTarihi &&
          currentMembership.bitisTarihi > now
            ? new Date(
                currentMembership.bitisTarihi,
              )
            : new Date(now);

        const newEndDate = addMonthClamped(renewalBase);

        membership =
          await tx.kullaniciUyelikPaketi.update({
            where: {
              id: currentMembership.id,
            },
            data: {
              durum: UyelikDurumu.AKTIF,
              bitisTarihi: newEndDate,
            },
          });
      } else {
        if (currentMembership) {
          await tx.kullaniciUyelikPaketi.update({
            where: {
              id: currentMembership.id,
            },
            data: {
              durum: UyelikDurumu.PASIF,
            },
          });
        }

        const base = order.amac === PaymentOrderPurpose.MEMBERSHIP_UPGRADE && currentMembership?.bitisTarihi > now
          ? currentMembership.bitisTarihi : now;
        const endDate = addMonthClamped(base);

        membership =
          await tx.kullaniciUyelikPaketi.create({
            data: {
              kullaniciId: order.kullaniciId,
              paketId: paket.id,
              durum: UyelikDurumu.AKTIF,
              baslangicTarihi: now,
              bitisTarihi: endDate,
              pilotPaketMi: false,
              testPaketiMi: false,
              notlar:
                order.amac ===
                PaymentOrderPurpose.MEMBERSHIP_UPGRADE
                  ? 'Ödeme sonrası paket yükseltme'
                  : 'Ödeme sonrası üyelik satın alma',
            },
          });
      }

      const packagePk =
        Number(jsonObject(order.fiyatSnapshot).aylikPaketPk ?? paket.aylikPaketPk ?? 0);

      let creditLot = null;

      // EPH-70B1/K4: süresi geçmiş üyelik işlemi hak/PK yüklemez (yalnız tarihsel kayıt).
      const periodLive = !membership.bitisTarihi || membership.bitisTarihi.getTime() > Date.now();
      if (packagePk > 0 && periodLive) {
        creditLot =
          await tx.portfolioCreditLot.create({
            data: {
              kullaniciId: order.kullaniciId,
              lotTuru:
                PortfolioCreditLotTuru.PAKET,
              ilkMiktar: packagePk,
              kalanMiktar: packagePk,
              sonKullanmaTarihi:
                membership.bitisTarihi,
              kaynakKayitTuru:
                'PAYMENT_ORDER',
              kaynakKayitId: order.id,
              uyelikId: membership.id,
              paymentOrderId: order.id,
              dedupeKey:
                `payment:${order.id}:package-pk`,
              aciklama:
                `${paket.paketAdi} üyelik paketi aylık PK tanımı`,
              aktifMi: true,
            },
          });

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${order.kullaniciId}`}))`;
        await tx.kontorCuzdani.upsert({
          where: {
            kullaniciId: order.kullaniciId,
          },
          update: {},
          create: {
            kullaniciId: order.kullaniciId,
            bakiye: 0,
            toplamYukleme: 0,
            toplamHarcama: 0,
            toplamHediye: 0,
            aktifMi: true,
          },
        });

        const wallet = await lockWallet(tx, order.kullaniciId);

        if (!wallet) {
          throw new BadRequestException(
            'Kullanıcı PK cüzdanı oluşturulamadı.',
          );
        }

        if (!wallet.aktifMi) throw new BadRequestException('PK cüzdanı kapalı; ödeme destek incelemesi gerektiriyor.');
        const updatedWallet =
          await tx.kontorCuzdani.update({
            where: {
              kullaniciId:
                order.kullaniciId,
            },
            data: {
              bakiye: {
                increment: packagePk,
              },
              toplamYukleme: {
                increment: packagePk,
              },
              aktifMi: true,
            },
          });

        await tx.kontorHareketi.create({
          data: {
            kullaniciId:
              order.kullaniciId,
            hareketTuru:
              KontorHareketTuru.YUKLEME,
            islemTuru:
              KontorIslemTuru.DIGER,
            miktar: packagePk,
            oncekiBakiye:
              wallet.bakiye,
            sonrakiBakiye:
              updatedWallet.bakiye,
            aciklama:
              `${paket.paketAdi} üyelik paketi PK yüklemesi`,
            ilgiliKayitTuru:
              'PAYMENT_ORDER',
            ilgiliKayitId:
              order.id,
            olusturanId: null,
          },
        });
      }

      const settlement =
        await tx.paymentSettlement.create({
          data: {
            orderId: order.id,
            kullaniciId:
              order.kullaniciId,
            uyelikId: membership.id,
            portfolioCreditLotId:
              creditLot?.id || null,
            metadata: {
              paketId: paket.id,
              paketKodu: paket.paketKodu,
              segment: paket.segment,
              orderPurpose: order.amac,
              packagePk,
              transactionId:
                successfulTransaction.id,
            },
          },
        });

      return {
        settled: true,
        alreadySettled: false,
        settlementId: settlement.id,
        membershipId: membership.id,
        portfolioCreditLotId:
          creditLot?.id || null,
        packagePk,
      };
    };
    return transaction ? settle(transaction) : this.prisma.$transaction(settle, { timeout: 20000 });
  }


  /**
   * EPH-70B2: OFFICE_PACKAGE / OFFICE_ADDON sipariş settlement'ı. Hedef ofis, hak sahibi ve ürün SİPARİŞE sabitlenmiştir (F11);
   * dönem bilgisi order.metadata.entitlementPeriod'dandır (mağaza: doğrulanmış dönem). Aynı uygunluk denetimi burada da çalışır (F10).
   */
  private async settleOfficeOrder(tx: Prisma.TransactionClient, order: any, transactionId: string) {
    // ODM-7G-D F01: ofis hak yazıcısı yayın kapısına bağlı — legacy modda (veya web satışı kapalıyken) settlement ofis hakkı YAZMAZ
    if ((await entitlementSource(tx)) !== 'relational') throw new BadRequestException('Ofis paketi/eklentisi yazımı paket modeli geçişi tamamlanana kadar kapalı; sipariş inceleme gerektiriyor.');
    const meta = jsonObject(order.metadata);
    const period = jsonObject(meta.entitlementPeriod);
    const officeId = order.hedefOfficeId as string | null;
    const ownerId = (order.hakSahibiUserId as string | null) ?? order.kullaniciId;
    if (!officeId || ownerId !== order.kullaniciId) throw new BadRequestException('Ofis siparişinde hedef ofis veya hak sahibi geçersiz; hak tanımlaması inceleme gerektiriyor.');
    const amount = Number(order.tutar);
    const start = new Date(String(period.start ?? order.paidAt ?? ''));
    const end = new Date(String(period.end ?? ''));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) throw new BadRequestException('Ofis siparişinde dönem bilgisi yok veya geçersiz.');
    const base = {
      officeId, hakSahibiUserId: ownerId, kanal: order.kanal, kaynakAbonelikAnahtari: typeof period.key === 'string' ? period.key : null, donemBaslangic: start, donemBitis: end, tutar: amount,
      paymentOrderId: order.id, otomatikYenileme: typeof period.autoRenew === 'boolean' ? period.autoRenew : null, magazaUrunKimligi: typeof period.productId === 'string' ? period.productId : null,
      hakSnapshot: jsonObject(order.fiyatSnapshot) as { monthlyPk?: number; ekKullaniciPk?: number },
    };
    let result;
    if (order.amac === PaymentOrderPurpose.OFFICE_PACKAGE) {
      if (!order.hedefOfisPaketKodu) throw new BadRequestException('Ofis siparişinde paket kodu yok.');
      result = await this.officeEntitlements.grantPackage(tx, { ...base, paketKodu: order.hedefOfisPaketKodu });
    } else {
      const addon = jsonObject(order.hedefEklenti);
      if ((addon.tur !== 'EK_KULLANICI' && addon.tur !== 'OFIS_BOY') || !Number.isSafeInteger(addon.adet)) throw new BadRequestException('Ofis siparişinde eklenti bilgisi geçersiz.');
      result = await this.officeEntitlements.grantAddon(tx, { ...base, tur: addon.tur as 'EK_KULLANICI' | 'OFIS_BOY', adet: addon.adet as number });
    }
    const settlement = await tx.paymentSettlement.create({ data: { orderId: order.id, kullaniciId: order.kullaniciId, portfolioCreditLotId: result.lotId,
      metadata: { orderPurpose: order.amac, officeId, abonelikId: result.abonelikId, eklentiId: result.eklentiId ?? null, hakDonemiId: result.hakDonemiId, grantedPk: result.grantedPk, stale: result.stale, transactionId } } });
    if (result.hakDonemiId) await tx.ofisHakDonemi.update({ where: { id: result.hakDonemiId }, data: { paymentSettlementId: settlement.id } });
    return { settled: true, alreadySettled: false, settlementId: settlement.id, membershipId: null, portfolioCreditLotId: result.lotId, packagePk: result.grantedPk,
      officeSubscriptionId: result.abonelikId, officeAddonId: result.eklentiId ?? null };
  }


  async getOfficePackages() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' },
    });
    return (setting?.valueJson as any[]) || [];
  }
}
