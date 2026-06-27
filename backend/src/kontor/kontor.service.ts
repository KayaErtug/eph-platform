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
  Role,
  UyelikDurumu,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  private readonly adminGiftOptions = [100, 250, 500];
  private readonly adminDailyLimit = 5000;
  private readonly recipientAdminGiftCountLimit = 2;
  private readonly recipientAdminGiftAmountLimit = 1000;

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
      islemTuru === KontorIslemTuru.FORUM_VITRIN
    ) {
      return 'FORUM_ISLEMLERI';
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

  async getHareketler(userId: string) {
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
            verilenKontor: paket.verilenKontor,
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
            ? this.adminGiftOptions
            : null,
        gunlukLimit:
          actor.role === Role.ADMIN
            ? this.adminDailyLimit
            : null,
        bugunGonderilen: bugunToplam,
        bugunIslemAdedi:
          bugunGonderilen._count._all,
        bugunKalan:
          actor.role === Role.ADMIN
            ? Math.max(
                0,
                this.adminDailyLimit - bugunToplam,
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
      !this.adminGiftOptions.includes(miktar)
    ) {
      throw new BadRequestException(
        'ADMIN yalnızca 100, 250 veya 500 kontör gönderebilir.',
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
          hashtext(${`gift-recipient:${aliciId}`})
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

      const havuz =
        await tx.hediyeKontorHavuzu.findUnique({
          where: { kod: 'GLOBAL' },
        });

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
          this.adminDailyLimit
        ) {
          throw new BadRequestException(
            `Günlük hediye kontör limitiniz ${this.adminDailyLimit} kontördür.`,
          );
        }

        if (
          aliciAdminHediyeAdedi >=
          this.recipientAdminGiftCountLimit
        ) {
          throw new BadRequestException(
            'Bu kullanıcı ADMIN hesaplarından en fazla 2 kez hediye kontör alabilir.',
          );
        }

        if (
          aliciAdminHediyeToplami + miktar >
          this.recipientAdminGiftAmountLimit
        ) {
          throw new BadRequestException(
            'Bu kullanıcının ADMIN kaynaklı toplam hediye kontör sınırı 1.000 kontördür.',
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

      await tx.$queryRaw`
        SELECT "id"
        FROM "KontorCuzdani"
        WHERE "kullaniciId" = ${aliciId}
        FOR UPDATE
      `;

      const cuzdan =
        await tx.kontorCuzdani.findUnique({
          where: { kullaniciId: aliciId },
        });

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
