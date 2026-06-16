import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KontorHareketTuru, KontorIslemTuru, UyelikDurumu } from '@prisma/client';

type KontorKategoriKodu =
  | 'HAVUZ_MESAJ'
  | 'HAVUZ_ILGILENIYORUM'
  | 'HAVUZ_MUSTERIM_VAR'
  | 'FORUM_ISLEMLERI'
  | 'PORTFOY_ONE_CIKARMA'
  | 'LINA_ISLEMLERI'
  | 'DIGER';

@Injectable()
export class KontorService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly emptyWallet = {
    bakiye: 0,
    toplamYukleme: 0,
    toplamHarcama: 0,
    toplamHediye: 0,
    aktifMi: true,
  };

  private getKategori(islemTuru: KontorIslemTuru): KontorKategoriKodu {
    if (islemTuru === KontorIslemTuru.HAVUZ_MESAJ) {
      return 'HAVUZ_MESAJ';
    }

    if (islemTuru === KontorIslemTuru.HAVUZ_ILGILENIYORUM) {
      return 'HAVUZ_ILGILENIYORUM';
    }

    if (islemTuru === KontorIslemTuru.HAVUZ_ESLESEN_MUSTERIM_VAR) {
      return 'HAVUZ_MUSTERIM_VAR';
    }

    if (
      islemTuru === KontorIslemTuru.FORUM_ACIL_ETIKETI ||
      islemTuru === KontorIslemTuru.FORUM_SABITLEME ||
      islemTuru === KontorIslemTuru.FORUM_VITRIN
    ) {
      return 'FORUM_ISLEMLERI';
    }

    if (islemTuru === KontorIslemTuru.PORTFOY_ONE_CIKARMA) {
      return 'PORTFOY_ONE_CIKARMA';
    }

    if (
      islemTuru === KontorIslemTuru.LINA_ILAN_ACIKLAMASI ||
      islemTuru === KontorIslemTuru.LINA_ILAN_DUZENLEME ||
      islemTuru === KontorIslemTuru.LINA_SESTEN_ILAN
    ) {
      return 'LINA_ISLEMLERI';
    }

    return 'DIGER';
  }

  async getCuzdan(userId: string) {
    const wallet = await this.prisma.kontorCuzdani.findUnique({
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
    const hareketler = await this.prisma.kontorHareketi.findMany({
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
    const [wallet, hareketler, harcamaToplami, yuklemeToplami, hediyeToplami, iadeToplami] = await Promise.all([
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
        where: { kullaniciId: userId, hareketTuru: KontorHareketTuru.HARCAMA },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: { kullaniciId: userId, hareketTuru: KontorHareketTuru.YUKLEME },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: { kullaniciId: userId, hareketTuru: KontorHareketTuru.HEDIYE },
        _sum: { miktar: true },
      }),
      this.prisma.kontorHareketi.aggregate({
        where: { kullaniciId: userId, hareketTuru: KontorHareketTuru.IADE },
        _sum: { miktar: true },
      }),
    ]);

    const kategoriMap: Record<KontorKategoriKodu, { adet: number; toplam: number }> = {
      HAVUZ_MESAJ: { adet: 0, toplam: 0 },
      HAVUZ_ILGILENIYORUM: { adet: 0, toplam: 0 },
      HAVUZ_MUSTERIM_VAR: { adet: 0, toplam: 0 },
      FORUM_ISLEMLERI: { adet: 0, toplam: 0 },
      PORTFOY_ONE_CIKARMA: { adet: 0, toplam: 0 },
      LINA_ISLEMLERI: { adet: 0, toplam: 0 },
      DIGER: { adet: 0, toplam: 0 },
    };

    hareketler.forEach((hareket) => {
      if (hareket.hareketTuru !== KontorHareketTuru.HARCAMA) {
        return;
      }

      const kategori = this.getKategori(hareket.islemTuru);
      kategoriMap[kategori].adet += 1;
      kategoriMap[kategori].toplam += hareket.miktar;
    });

    return {
      cuzdan: wallet,
      toplamlar: {
        toplamHarcama: harcamaToplami._sum.miktar ?? 0,
        toplamYukleme: yuklemeToplami._sum.miktar ?? 0,
        toplamHediye: hediyeToplami._sum.miktar ?? 0,
        toplamIade: iadeToplami._sum.miktar ?? 0,
      },
      kategoriler: Object.entries(kategoriMap).map(([kod, deger]) => ({
        kod,
        adet: deger.adet,
        toplam: deger.toplam,
      })),
    };
  }

  async getPaket(userId: string) {
    const aktifPaket = await this.prisma.kullaniciUyelikPaketi.findFirst({
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

    const paket = await this.prisma.uyelikPaketi.findUnique({
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
            aktifPortfoyLimiti: paket.aktifPortfoyLimiti,
            verilenKontor: paket.verilenKontor,
            fiyat: paket.fiyat,
            paraBirimi: paket.paraBirimi,
            baslangicTarihi: aktifPaket.baslangicTarihi,
            bitisTarihi: aktifPaket.bitisTarihi,
            pilotPaketMi: aktifPaket.pilotPaketMi,
            testPaketiMi: aktifPaket.testPaketiMi,
          }
        : null,
      mesajlasmaLimiti,
    };
  }
}
