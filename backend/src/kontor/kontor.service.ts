import { resolveOfficeWallet } from '../office/office-wallet.rules';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  KontorHareketTuru,
  KontorIslemTuru,
  Prisma,
  Role,
  UyelikDurumu,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { readLimit, readLimitList } from '../pricing/commercial-costs';
import { Cron } from '@nestjs/schedule';
import { consumeLots, expireDueLots, grantLot, LOT_RECONCILED_KEY, lockWallet, lotsReconciled, restoreLots } from './wallet-lots';

type KontorKategoriKodu =
  | 'HAVUZ_MESAJ'
  | 'HAVUZ_ILGILENIYORUM'
  | 'HAVUZ_MUSTERIM_VAR'
  | 'FORUM_ISLEMLERI'
  | 'PORTFOY_ONE_CIKARMA'
  | 'LINA_ISLEMLERI'
  | 'DIGER';

type GiftActor = {
  id?: string;
  role?: Role | string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class KontorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  // Admin hediye sınırları SystemSetting'ten okunur (LIMIT_ADMIN_HEDIYE_*, LIMIT_ALICI_ADMIN_HEDIYE_*); yoksa commercial-costs yedeği.
  private async readGiftLimits() {
    const [options, daily, recipientCount, recipientAmount] = await Promise.all([
      readLimitList(this.prisma, 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI'),
      readLimit(this.prisma, 'LIMIT_ADMIN_HEDIYE_GUNLUK_PK'),
      readLimit(this.prisma, 'LIMIT_ALICI_ADMIN_HEDIYE_ADET'),
      readLimit(this.prisma, 'LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK'),
    ]);
    return { options, daily, recipientCount, recipientAmount };
  }

  private readonly emptyWallet = {
    bakiye: 0,
    toplamYukleme: 0,
    toplamHarcama: 0,
    toplamHediye: 0,
    aktifMi: true,
  };

  private normalizeGiftActor(actor: GiftActor) {
    const id = String(actor?.id || '').trim();
    const role = String(actor?.role || '').trim().toUpperCase();

    if (!id) {
      throw new ForbiddenException('Kullanıcı kimliği doğrulanamadı.');
    }

    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hediye kontör işlemi için yetkiniz yok.',
      );
    }

    return {
      id,
      role: role as Role,
      email: actor.email,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    };
  }

  private getIstanbulDayRange(now = new Date()) {
    const threeHours = 3 * 60 * 60 * 1000;
    const istanbulDate = new Date(now.getTime() + threeHours);

    const startUtc =
      Date.UTC(
        istanbulDate.getUTCFullYear(),
        istanbulDate.getUTCMonth(),
        istanbulDate.getUTCDate(),
      ) - threeHours;

    return {
      start: new Date(startUtc),
      end: new Date(startUtc + 24 * 60 * 60 * 1000),
    };
  }

  private cleanDescription(value?: string) {
    const text = String(value || '').trim();
    return text ? text.slice(0, 500) : null;
  }

  private getKategori(
    islemTuru: KontorIslemTuru,
  ): KontorKategoriKodu {
    if (islemTuru === KontorIslemTuru.HAVUZ_MESAJ) {
      return 'HAVUZ_MESAJ';
    }

    if (
      islemTuru === KontorIslemTuru.HAVUZ_ILGILENIYORUM
    ) {
      return 'HAVUZ_ILGILENIYORUM';
    }

    if (
      islemTuru ===
      KontorIslemTuru.HAVUZ_ESLESEN_MUSTERIM_VAR
    ) {
      return 'HAVUZ_MUSTERIM_VAR';
    }

    if (
      islemTuru === KontorIslemTuru.FORUM_ACIL_ETIKETI ||
      islemTuru === KontorIslemTuru.FORUM_SABITLEME ||
      islemTuru === KontorIslemTuru.FORUM_VITRIN ||
      islemTuru === KontorIslemTuru.FORUM_TELEFON ||
      islemTuru === KontorIslemTuru.FORUM_WHATSAPP ||
      islemTuru === KontorIslemTuru.FORUM_OZEL_BILGI
    ) {
      return 'FORUM_ISLEMLERI';
    }

    if (
      islemTuru === KontorIslemTuru.HAVUZ_TELEFON ||
      islemTuru === KontorIslemTuru.HAVUZ_WHATSAPP
    ) {
      return 'HAVUZ_MESAJ';
    }

    if (
      islemTuru === KontorIslemTuru.PORTFOY_ONE_CIKARMA
    ) {
      return 'PORTFOY_ONE_CIKARMA';
    }

    if (
      islemTuru ===
        KontorIslemTuru.LINA_ILAN_ACIKLAMASI ||
      islemTuru ===
        KontorIslemTuru.LINA_ILAN_DUZENLEME ||
      islemTuru === KontorIslemTuru.LINA_SESTEN_ILAN
    ) {
      return 'LINA_ISLEMLERI';
    }

    return 'DIGER';
  }

  async harcamayiYap(input: {
    userId: string;
    actorId?: string;
    amount: number;
    islemTuru: KontorIslemTuru;
    aciklama?: string;
    ilgiliKayitTuru?: string;
    ilgiliKayitId?: string;
    idempotencyKey?: string;
    transaction?: Prisma.TransactionClient;
    walletSource?: string;
    walletOfficeId?: string;
  }) {
    const userId = String(input?.userId || '').trim();
    const actorId = String(input?.actorId || userId).trim();
    const amount = Number(input?.amount);
    const idempotencyKey = String(input?.idempotencyKey || '').trim();
    const relatedRecordType = String(input?.ilgiliKayitTuru || '').trim();

    if (!userId) {
      throw new BadRequestException(
        'Kontör harcaması için kullanıcı zorunludur.',
      );
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        'Kontör harcama miktarı pozitif tam sayı olmalıdır.',
      );
    }

    const spend = async (tx: Prisma.TransactionClient) => {
      const context = await resolveOfficeWallet(tx, actorId, { walletSource: input.walletSource, walletOfficeId: input.walletOfficeId }, true);
      if (input.actorId && userId !== actorId && context.chargeUserId !== userId) throw new BadRequestException('Ofis PK hesabı değişti. İşlemi yeniden onaylayın.');
      const chargeUserId = context.chargeUserId;
      if (idempotencyKey) {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${`kontor-spend:${userId}:${idempotencyKey}`})
          )
        `;

        const existingMovement = await tx.kontorHareketi.findFirst({
          where: {
            OR: [{ kullaniciId: chargeUserId }, { olusturanId: actorId }, { kullaniciId: actorId, olusturanId: null }],
            hareketTuru: 'HARCAMA',
            islemTuru: input.islemTuru,
            ilgiliKayitId: idempotencyKey,
            ...(relatedRecordType
              ? { ilgiliKayitTuru: relatedRecordType }
              : {}),
          },
          orderBy: {
            olusturulmaTarihi: 'desc',
          },
        });

        if (existingMovement) {
          if (input.actorId && (existingMovement.olusturanId || userId) !== actorId) throw new ForbiddenException('İşlem anahtarı başka kullanıcıya aittir.');
          const currentWallet = existingMovement.kullaniciId === chargeUserId ? await tx.kontorCuzdani.findUnique({
            where: { kullaniciId: chargeUserId },
          }) : null;

          return {
            spent: existingMovement.miktar,
            previousBalance: existingMovement.oncekiBakiye,
            remainingBalance:
              currentWallet?.bakiye ?? existingMovement.sonrakiBakiye,
            wallet: currentWallet,
            movement: existingMovement,
            alreadyProcessed: true,
          };
        }
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${chargeUserId}`}))`;
      await tx.kontorCuzdani.upsert({
        where: { kullaniciId: chargeUserId },
        update: {},
        create: {
          kullaniciId: chargeUserId,
          bakiye: 0,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 0,
          aktifMi: true,
        },
      });

      // EPH-70B1/K1: tek kilit sırası (advisory wallet + satır FOR UPDATE); bakiye kilitten SONRA okunur.
      const wallet = await lockWallet(tx, chargeUserId);

      if (!wallet) {
        throw new BadRequestException(
          'Kullanıcı kontör cüzdanı bulunamadı.',
        );
      }

      if (!wallet.aktifMi) {
        throw new ForbiddenException(
          'Kontör cüzdanınız aktif değildir.',
        );
      }

      if (wallet.bakiye < amount) {
        throw new BadRequestException(
          `Bu işlem için ${amount} kontör gerekir. Mevcut bakiyeniz ${wallet.bakiye} kontör.`,
        );
      }

      const updatedWallet = await tx.kontorCuzdani.update({
        where: { kullaniciId: chargeUserId },
        data: {
          bakiye: { decrement: amount },
          toplamHarcama: { increment: amount },
        },
      });
      if (updatedWallet.bakiye < 0) {
        throw new BadRequestException('Kontör bakiyesi sıfırın altına düşemez.');
      }
      // EPH-70B1/K2: lotlar tanımlı sırayla tüketilir (süresi yakın PAKET/DENEME → süresiz → EK PK en son).
      const movement = await tx.kontorHareketi.create({
        data: {
          kullaniciId: chargeUserId,
          hareketTuru: 'HARCAMA',
          islemTuru: input.islemTuru,
          miktar: amount,
          oncekiBakiye: wallet.bakiye,
          sonrakiBakiye: updatedWallet.bakiye,
          aciklama: this.cleanDescription(input.aciklama),
          ilgiliKayitTuru:
            relatedRecordType || null,
          ilgiliKayitId:
            idempotencyKey ||
            String(input.ilgiliKayitId || '').trim() ||
            null,
          olusturanId: actorId,
        },
      });
      // EPH-70B1F/D1+D5: hareket oluştuktan sonra lot tüketimi + lot-bazlı tahsis kaydı (iade buradan geri alınır).
      await consumeLots(tx, chargeUserId, amount, { hareketId: movement.id });

      return {
        spent: amount,
        previousBalance: wallet.bakiye,
        remainingBalance: updatedWallet.bakiye,
        wallet: updatedWallet,
        movement,
        alreadyProcessed: false,
      };
    };
    return input.transaction ? spend(input.transaction) : this.prisma.$transaction(spend);
  }

  async harcamayiIadeEt(input: {
    userId: string;
    originalMovementId: string;
    aciklama?: string;
  }) {
    const userId = String(input?.userId || '').trim();
    const originalMovementId = String(
      input?.originalMovementId || '',
    ).trim();

    if (!userId || !originalMovementId) {
      throw new BadRequestException(
        'Kontör iadesi için kullanıcı ve harcama hareketi zorunludur.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(
            ${`kontor-refund:${userId}:${originalMovementId}`}
          )
        )
      `;

      const existingRefund =
        await tx.kontorHareketi.findFirst({
          where: {
            kullaniciId: userId,
            hareketTuru: KontorHareketTuru.IADE,
            ilgiliKayitTuru: 'KONTOR_HARCAMA_IADE',
            ilgiliKayitId: originalMovementId,
          },
          orderBy: {
            olusturulmaTarihi: 'desc',
          },
        });

      if (existingRefund) {
        const currentWallet =
          await tx.kontorCuzdani.findUnique({
            where: { kullaniciId: userId },
          });

        return {
          refunded: existingRefund.miktar,
          remainingBalance:
            currentWallet?.bakiye ??
            existingRefund.sonrakiBakiye,
          wallet: currentWallet,
          movement: existingRefund,
          alreadyProcessed: true,
        };
      }

      const originalMovement =
        await tx.kontorHareketi.findFirst({
          where: {
            id: originalMovementId,
            kullaniciId: userId,
            hareketTuru: KontorHareketTuru.HARCAMA,
          },
        });

      if (!originalMovement) {
        throw new NotFoundException(
          'İade edilecek kontör harcaması bulunamadı.',
        );
      }

      // EPH-70B1/K1: harcamayla AYNI kilit sırası; bakiye kilitten sonra okunur.
      const wallet = await lockWallet(tx, userId);

      if (!wallet) {
        throw new BadRequestException(
          'Kullanıcı kontör cüzdanı bulunamadı.',
        );
      }

      // EPH-70B1F/D5: yalnız bu hareketin tahsis kayıtlarından geri al; geri yazılamayan pay (vadesi geçmiş/pasif lot) bakiyeye eklenmez.
      const restore = await restoreLots(tx, userId, originalMovement.id, originalMovement.miktar);
      const credit = restore.credit;
      const nextBalance = wallet.bakiye + credit;

      const updatedWallet =
        await tx.kontorCuzdani.update({
          where: {
            kullaniciId: userId,
          },
          data: {
            bakiye: {
              increment: credit,
            },
            toplamHarcama: Math.max(
              0,
              wallet.toplamHarcama -
                originalMovement.miktar,
            ),
          },
        });

      const refundMovement =
        await tx.kontorHareketi.create({
          data: {
            kullaniciId: userId,
            hareketTuru: KontorHareketTuru.IADE,
            islemTuru: originalMovement.islemTuru,
            miktar: credit,
            oncekiBakiye: wallet.bakiye,
            sonrakiBakiye: nextBalance,
            aciklama:
              (this.cleanDescription(input.aciklama) ||
              'Başarısız işlem için kontör iadesi.') + (restore.lost > 0 ? ` (${restore.lost} PK süresi dolmuş/kapanmış lota ait olduğu için geri yazılmadı.)` : ''),
            ilgiliKayitTuru: 'KONTOR_HARCAMA_IADE',
            ilgiliKayitId: originalMovementId,
            olusturanId: originalMovement.olusturanId || userId,
          },
        });

      return {
        refunded: credit,
        lostPk: restore.lost,
        remainingBalance: updatedWallet.bakiye,
        wallet: updatedWallet,
        movement: refundMovement,
        alreadyProcessed: false,
      };
    });
  }

  /**
   * EPH-70B1/K4 (§11 madde 6): dönem sonunda PAKET lotunun kalanı cüzdandan düşülür. Günlük job; idempotent
   * (düşülen lotun kalanı 0 + aktifMi=false olur, tekrar çalışınca bulunmaz). EK PK (SATIN_ALMA, süresiz) düşülmez.
   */
  @Cron('15 3 * * *')
  async scheduledExpirePackageLots() {
    try { await this.expirePackageLots(); } catch (error) { console.error('[KontorService] dönem sonu PAKET lot düşümü başarısız:', error); }
  }

  /**
   * Bakım/telafi işi (asıl kapanış harcama/iade anında lockWallet içinde atomik yapılır). EPH-70B1F:
   *  - D3: SystemSetting EPH70_LOT_UZLASTIRMA_TAMAM=true değilse HİÇBİR ŞEY yapmaz (no-op + log).
   *  - D4: eski denemeler (karar 18b) düşülmez (expireDueLots içinde isLegacyTrialLot).
   *  - D9: tüm vadesi gelmiş kullanıcılar sayfa sayfa (deterministik sıra, kullaniciId imleci) boşaltılır.
   */
  async expirePackageLots(now = new Date()) {
    if (!(await lotsReconciled(this.prisma as unknown as Prisma.TransactionClient))) {
      console.warn(`[KontorService] ${LOT_RECONCILED_KEY} true değil; dönem sonu düşümü çalıştırılmadı (no-op).`);
      return { users: 0, deducted: 0, skipped: true as const };
    }
    let users = 0; let deducted = 0; let cursor: string | undefined;
    const PAGE = 200;
    for (let guard = 0; guard < 10000; guard++) {
      const due = await this.prisma.portfolioCreditLot.findMany({
        where: { lotTuru: 'PAKET', aktifMi: true, kalanMiktar: { gt: 0 }, sonKullanmaTarihi: { lte: now }, ...(cursor ? { kullaniciId: { gt: cursor } } : {}) },
        select: { kullaniciId: true }, distinct: ['kullaniciId'], orderBy: { kullaniciId: 'asc' }, take: PAGE,
      });
      if (due.length === 0) break;
      for (const { kullaniciId } of due) {
        deducted += await this.prisma.$transaction(async (tx) => {
          await lockWallet(tx, kullaniciId, { expire: false, now });
          return expireDueLots(tx, kullaniciId, now);
        });
        users += 1;
        cursor = kullaniciId;
      }
      if (due.length < PAGE) break;
    }
    return { users, deducted, skipped: false as const };
  }

  async getCuzdan(userId: string) {
    const wallet =
      await this.prisma.kontorCuzdani.findUnique({
        where: { kullaniciId: userId },
      });

    if (!wallet) {
      return this.emptyWallet;
    }

    return {
      id: wallet.id,
      bakiye: wallet.bakiye,
      toplamYukleme: wallet.toplamYukleme,
      toplamHarcama: wallet.toplamHarcama,
      toplamHediye: wallet.toplamHediye,
      aktifMi: wallet.aktifMi,
      olusturulmaTarihi: wallet.olusturulmaTarihi,
      guncellenmeTarihi: wallet.guncellenmeTarihi,
    };
  }

  async getHareketler(userId: string, actor: GiftActor) {
    if (actor?.role === Role.ADMIN || actor?.role === Role.SUPER_ADMIN) {
      const permission = await this.adminService.resolveOperationalPermission(actor, 'CREDIT_HISTORY_VIEW');
      if (!permission.enabled) {
        throw new ForbiddenException('Kontör geçmişi görüntüleme yetkiniz bulunmuyor.');
      }
    }

    const hareketler =
      await this.prisma.kontorHareketi.findMany({
        where: { kullaniciId: userId },
        orderBy: { olusturulmaTarihi: 'desc' },
        take: 100,
      });

    return hareketler.map((hareket) => ({
      id: hareket.id,
      hareketTuru: hareket.hareketTuru,
      islemTuru: hareket.islemTuru,
      kategori: this.getKategori(hareket.islemTuru),
      miktar: hareket.miktar,
      oncekiBakiye: hareket.oncekiBakiye,
      sonrakiBakiye: hareket.sonrakiBakiye,
      aciklama: hareket.aciklama,
      ilgiliKayitTuru: hareket.ilgiliKayitTuru,
      ilgiliKayitId: hareket.ilgiliKayitId,
      olusturulmaTarihi: hareket.olusturulmaTarihi,
    }));
  }

  async getOzet(userId: string) {
    const [
      wallet,
      hareketler,
      harcamaToplami,
      yuklemeToplami,
      hediyeToplami,
      iadeToplami,
    ] = await Promise.all([
      this.getCuzdan(userId),
      this.prisma.kontorHareketi.findMany({
        where: { kullaniciId: userId },
        select: {
          hareketTuru: true,
          islemTuru: true,
          miktar: true,
        },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: {
          kullaniciId: userId,
          hareketTuru: KontorHareketTuru.HARCAMA,
        },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: {
          kullaniciId: userId,
          hareketTuru: KontorHareketTuru.YUKLEME,
        },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: {
          kullaniciId: userId,
          hareketTuru: KontorHareketTuru.HEDIYE,
        },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: {
          kullaniciId: userId,
          hareketTuru: KontorHareketTuru.IADE,
        },
        _sum: { miktar: true },
      }),
    ]);

    const kategoriMap: Record<
      KontorKategoriKodu,
      { adet: number; toplam: number }
    > = {
      HAVUZ_MESAJ: { adet: 0, toplam: 0 },
      HAVUZ_ILGILENIYORUM: { adet: 0, toplam: 0 },
      HAVUZ_MUSTERIM_VAR: { adet: 0, toplam: 0 },
      FORUM_ISLEMLERI: { adet: 0, toplam: 0 },
      PORTFOY_ONE_CIKARMA: { adet: 0, toplam: 0 },
      LINA_ISLEMLERI: { adet: 0, toplam: 0 },
      DIGER: { adet: 0, toplam: 0 },
    };

    hareketler.forEach((hareket) => {
      if (
        hareket.hareketTuru !==
        KontorHareketTuru.HARCAMA
      ) {
        return;
      }

      const kategori = this.getKategori(
        hareket.islemTuru,
      );

      kategoriMap[kategori].adet += 1;
      kategoriMap[kategori].toplam += hareket.miktar;
    });

    return {
      cuzdan: wallet,
      toplamlar: {
        toplamHarcama:
          harcamaToplami._sum.miktar ?? 0,
        toplamYukleme:
          yuklemeToplami._sum.miktar ?? 0,
        toplamHediye:
          hediyeToplami._sum.miktar ?? 0,
        toplamIade: iadeToplami._sum.miktar ?? 0,
      },
      kategoriler: Object.entries(kategoriMap).map(
        ([kod, deger]) => ({
          kod,
          adet: deger.adet,
          toplam: deger.toplam,
        }),
      ),
    };
  }

  async getPaket(userId: string) {
    const aktifPaket =
      await this.prisma.kullaniciUyelikPaketi.findFirst({
        where: {
          kullaniciId: userId,
          durum: UyelikDurumu.AKTIF,
        },
        orderBy: { baslangicTarihi: 'desc' },
      });

    if (!aktifPaket) {
      return {
        aktifPaket: null,
        mesajlasmaLimiti: null,
      };
    }

    const paket =
      await this.prisma.uyelikPaketi.findUnique({
        where: { id: aktifPaket.paketId },
      });

    const mesajlasmaLimiti = paket
      ? await this.prisma.mesajlasmaLimiti.findUnique({
          where: { paketKodu: paket.paketKodu },
        })
      : null;

    return {
      aktifPaket: paket
        ? {
            id: aktifPaket.id,
            paketId: aktifPaket.paketId,
            paketKodu: paket.paketKodu,
            paketAdi: paket.paketAdi,
            aciklama: paket.aciklama,
            durum: aktifPaket.durum,
            aktifPortfoyLimiti:
              paket.aktifPortfoyLimiti,
            aylikPaketPk: paket.aylikPaketPk,
            verilenKontor: paket.aylikPaketPk,
            fiyat: paket.fiyat,
            paraBirimi: paket.paraBirimi,
            baslangicTarihi:
              aktifPaket.baslangicTarihi,
            bitisTarihi: aktifPaket.bitisTarihi,
            pilotPaketMi: aktifPaket.pilotPaketMi,
            testPaketiMi: aktifPaket.testPaketiMi,
          }
        : null,
      mesajlasmaLimiti,
    };
  }

  async getHediyeHavuzu(actorInput: GiftActor) {
    const actor = this.normalizeGiftActor(actorInput);
    const dayRange = this.getIstanbulDayRange();
    const giftLimits = await this.readGiftLimits();

    const [havuz, bugunGonderilen] =
      await Promise.all([
        this.prisma.hediyeKontorHavuzu.findUnique({
          where: { kod: 'GLOBAL' },
        }),
        this.prisma.hediyeKontorDagitimi.aggregate({
          where: {
            gonderenId: actor.id,
            createdAt: {
              gte: dayRange.start,
              lt: dayRange.end,
            },
          },
          _sum: { miktar: true },
          _count: { _all: true },
        }),
      ]);

    if (!havuz) {
      throw new NotFoundException(
        'Hediye kontör havuzu bulunamadı.',
      );
    }

    const bugunToplam =
      bugunGonderilen._sum.miktar ?? 0;

    return {
      havuz: {
        id: havuz.id,
        kod: havuz.kod,
        bakiye: havuz.bakiye,
        toplamYukleme: havuz.toplamYukleme,
        toplamDagitim: havuz.toplamDagitim,
        aktifMi: havuz.aktifMi,
      },
      yetki: {
        rol: actor.role,
        secenekler:
          actor.role === Role.ADMIN
            ? giftLimits.options
            : null,
        gunlukLimit:
          actor.role === Role.ADMIN
            ? giftLimits.daily
            : null,
        bugunGonderilen: bugunToplam,
        bugunIslemAdedi:
          bugunGonderilen._count._all,
        bugunKalan:
          actor.role === Role.ADMIN
            ? Math.max(
                0,
                giftLimits.daily - bugunToplam,
              )
            : null,
      },
    };
  }

  async yukleHediyeHavuzu(
    actorInput: GiftActor,
    body: {
      miktar: number;
      aciklama?: string;
    },
  ) {
    const actor = this.normalizeGiftActor(actorInput);

    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hediye kontör havuzuna yalnızca Yazılım Ekibi kontör ekleyebilir.',
      );
    }

    const miktar = Number(body?.miktar);

    if (
      !Number.isInteger(miktar) ||
      miktar <= 0
    ) {
      throw new BadRequestException(
        'Yüklenecek kontör miktarı pozitif tam sayı olmalıdır.',
      );
    }

    const aciklama =
      this.cleanDescription(body?.aciklama) ||
      'Hediye kontör havuzuna Yazılım Ekibi tarafından kontör eklendi.';

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext('gift-pool:GLOBAL')
        )
      `;

      await tx.$queryRaw`
        SELECT "id"
        FROM "HediyeKontorHavuzu"
        WHERE "kod" = 'GLOBAL'
        FOR UPDATE
      `;

      const havuz =
        await tx.hediyeKontorHavuzu.findUnique({
          where: { kod: 'GLOBAL' },
        });

      if (!havuz) {
        throw new NotFoundException(
          'Hediye kontör havuzu bulunamadı.',
        );
      }

      const guncelHavuz =
        await tx.hediyeKontorHavuzu.update({
          where: { id: havuz.id },
          data: {
            bakiye: { increment: miktar },
            toplamYukleme: { increment: miktar },
          },
        });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action:
            AuditAction.HEDIYE_KONTOR_HAVUZU_YUKLE,
          entityType: 'HediyeKontorHavuzu',
          entityId: havuz.id,
          description: aciklama,
          metadata: {
            miktar,
            oncekiBakiye: havuz.bakiye,
            sonrakiBakiye: guncelHavuz.bakiye,
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return {
        success: true,
        mesaj: `${miktar} kontör hediye havuzuna eklendi.`,
        havuz: {
          bakiye: guncelHavuz.bakiye,
          toplamYukleme:
            guncelHavuz.toplamYukleme,
          toplamDagitim:
            guncelHavuz.toplamDagitim,
        },
      };
    });
  }

  async gonderHediyeKontor(
    actorInput: GiftActor,
    body: {
      aliciId: string;
      miktar: number;
      aciklama?: string;
    },
  ) {
    const actor = this.normalizeGiftActor(actorInput);
    const permission = await this.adminService.resolveOperationalPermission(actor, 'GIFT_PK');
    if (!permission.enabled) {
      throw new ForbiddenException('Hediye PK gönderme yetkiniz bulunmuyor.');
    }
    const giftLimits = await this.readGiftLimits();
    const aliciId = String(body?.aliciId || '').trim();
    const miktar = Number(body?.miktar);

    if (!aliciId) {
      throw new BadRequestException(
        'Hediye gönderilecek kullanıcı zorunludur.',
      );
    }

    if (
      !Number.isInteger(miktar) ||
      miktar <= 0
    ) {
      throw new BadRequestException(
        'Kontör miktarı pozitif tam sayı olmalıdır.',
      );
    }

    const adminKaynakli =
      actor.role === Role.ADMIN;

    if (
      adminKaynakli &&
      !giftLimits.options.includes(miktar)
    ) {
      throw new BadRequestException(
        `ADMIN yalnızca ${giftLimits.options.join(', ')} kontör gönderebilir.`,
      );
    }

    const aciklamaMetni =
      String(body?.aciklama || '').trim();

    if (aciklamaMetni.length > 50) {
      throw new BadRequestException(
        'Hediye açıklaması en fazla 50 karakter olabilir.',
      );
    }

    const aciklama =
      aciklamaMetni ||
      'Hediye kontör gönderimi.';

    const dayRange = this.getIstanbulDayRange();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext('gift-pool:GLOBAL')
        )
      `;

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`gift-sender:${actor.id}`})
        )
      `;

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`wallet:${aliciId}`})
        )
      `;

      const alici = await tx.user.findUnique({
        where: { id: aliciId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!alici) {
        throw new NotFoundException(
          'Hediye gönderilecek kullanıcı bulunamadı.',
        );
      }

      await tx.$queryRaw`
        SELECT "id"
        FROM "HediyeKontorHavuzu"
        WHERE "kod" = 'GLOBAL'
        FOR UPDATE
      `;

      // EPH-62: havuz kaydı yoksa süper admin gönderimi engellenmez; şema varsayılanlarıyla (50000) oluşturulur.
      let havuz =
        await tx.hediyeKontorHavuzu.findUnique({
          where: { kod: 'GLOBAL' },
        });

      if (!havuz && actor.role === Role.SUPER_ADMIN) {
        havuz = await tx.hediyeKontorHavuzu.create({
          data: { kod: 'GLOBAL', createdById: actor.id },
        });
      }

      if (!havuz || !havuz.aktifMi) {
        throw new BadRequestException(
          'Hediye kontör havuzu aktif değil.',
        );
      }

      if (havuz.bakiye < miktar) {
        throw new BadRequestException(
          'Hediye kontör havuzunda yeterli bakiye yok.',
        );
      }

      let adminGunlukToplam = 0;
      let aliciAdminHediyeAdedi = 0;
      let aliciAdminHediyeToplami = 0;

      if (adminKaynakli) {
        const [gunlukDurum, aliciDurum] =
          await Promise.all([
            tx.hediyeKontorDagitimi.aggregate({
              where: {
                gonderenId: actor.id,
                adminKaynakli: true,
                createdAt: {
                  gte: dayRange.start,
                  lt: dayRange.end,
                },
              },
              _sum: { miktar: true },
            }),
            tx.hediyeKontorDagitimi.aggregate({
              where: {
                aliciId,
                adminKaynakli: true,
              },
              _count: { _all: true },
              _sum: { miktar: true },
            }),
          ]);

        adminGunlukToplam =
          gunlukDurum._sum.miktar ?? 0;

        aliciAdminHediyeAdedi =
          aliciDurum._count._all;

        aliciAdminHediyeToplami =
          aliciDurum._sum.miktar ?? 0;

        if (
          adminGunlukToplam + miktar >
          giftLimits.daily
        ) {
          throw new BadRequestException(
            `Günlük hediye kontör limitiniz ${giftLimits.daily} kontördür.`,
          );
        }

        if (
          aliciAdminHediyeAdedi >=
          giftLimits.recipientCount
        ) {
          throw new BadRequestException(
            `Bu kullanıcı ADMIN hesaplarından en fazla ${giftLimits.recipientCount} kez hediye kontör alabilir.`,
          );
        }

        if (
          aliciAdminHediyeToplami + miktar >
          giftLimits.recipientAmount
        ) {
          throw new BadRequestException(
            `Bu kullanıcının ADMIN kaynaklı toplam hediye kontör sınırı ${giftLimits.recipientAmount} kontördür.`,
          );
        }
      }

      await tx.kontorCuzdani.upsert({
        where: { kullaniciId: aliciId },
        update: {},
        create: {
          kullaniciId: aliciId,
          bakiye: 0,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 0,
          aktifMi: true,
        },
      });

      // EPH-70B1F: ortak kilit sırası (wallet advisory + satır kilidi + atomik dönem sonu kapanışı)
      const cuzdan = await lockWallet(tx, aliciId);

      if (!cuzdan) {
        throw new BadRequestException(
          'Kullanıcı kontör cüzdanı oluşturulamadı.',
        );
      }

      const dagitim =
        await tx.hediyeKontorDagitimi.create({
          data: {
            havuzId: havuz.id,
            gonderenId: actor.id,
            aliciId,
            miktar,
            gonderenRol: actor.role,
            adminKaynakli,
            aciklama,
          },
        });

      const guncelHavuz =
        await tx.hediyeKontorHavuzu.update({
          where: { id: havuz.id },
          data: {
            bakiye: { decrement: miktar },
            toplamDagitim: { increment: miktar },
          },
        });

      const guncelCuzdan =
        await tx.kontorCuzdani.update({
          where: { kullaniciId: aliciId },
          data: {
            bakiye: { increment: miktar },
            toplamHediye: { increment: miktar },
            aktifMi: true,
          },
        });

      // EPH-70B1F/D6: hediye PK artık lotlanır (HEDIYE, süresiz) — iade/dönem sonu/uzlaştırma kaynak ayrımı yapabilsin.
      await grantLot(tx, { userId: aliciId, lotTuru: 'HEDIYE', amount: miktar, kaynakKayitTuru: 'HEDIYE_KONTOR_DAGITIMI', kaynakKayitId: dagitim.id, dedupeKey: `gift:${dagitim.id}`, aciklama: 'Hediye PK' });

      await tx.kontorHareketi.create({
        data: {
          kullaniciId: aliciId,
          hareketTuru: KontorHareketTuru.HEDIYE,
          islemTuru: KontorIslemTuru.DIGER,
          miktar,
          oncekiBakiye: cuzdan.bakiye,
          sonrakiBakiye: guncelCuzdan.bakiye,
          aciklama,
          ilgiliKayitTuru:
            'HEDIYE_KONTOR_DAGITIMI',
          ilgiliKayitId: dagitim.id,
          olusturanId: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          targetUserId: aliciId,
          action: AuditAction.HEDIYE_KONTOR_GONDER,
          entityType: 'HediyeKontorDagitimi',
          entityId: dagitim.id,
          description: aciklama,
          metadata: {
            miktar,
            gonderenRol: actor.role,
            adminKaynakli,
            havuzOncekiBakiye: havuz.bakiye,
            havuzSonrakiBakiye:
              guncelHavuz.bakiye,
            kullaniciOncekiBakiye: cuzdan.bakiye,
            kullaniciSonrakiBakiye:
              guncelCuzdan.bakiye,
            adminGunlukToplam:
              adminKaynakli
                ? adminGunlukToplam + miktar
                : null,
            kullaniciAdminHediyeAdedi:
              adminKaynakli
                ? aliciAdminHediyeAdedi + 1
                : null,
            kullaniciAdminHediyeToplami:
              adminKaynakli
                ? aliciAdminHediyeToplami + miktar
                : null,
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      const aliciAdi =
        `${alici.firstName || ''} ${alici.lastName || ''}`.trim() ||
        alici.email;

      return {
        success: true,
        mesaj: `${aliciAdi} kullanıcısına ${miktar} kontör hediye edildi.`,
        dagitimId: dagitim.id,
        alici: {
          id: alici.id,
          ad: aliciAdi,
        },
        miktar,
        kullaniciBakiyesi: guncelCuzdan.bakiye,
        havuzBakiyesi: guncelHavuz.bakiye,
      };
    });
  }
}
