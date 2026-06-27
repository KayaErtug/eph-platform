import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    passwordHash: string;
    role: Role;
    isApproved?: boolean;
    referralCode?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          city: data.city,
          passwordHash: data.passwordHash,
          role: data.role,
          isApproved: data.isApproved ?? false,
          referralCode: data.referralCode,
        },
      });

      const denemePaketi = await tx.uyelikPaketi.upsert({
        where: {
          paketKodu: 'DENEME',
        },
        update: {
          paketAdi: 'DENEME',
          aciklama:
            'Yeni kullanıcılar için role göre 30 veya 60 günlük ücretsiz başlangıç paketi.',
          aktifPortfoyLimiti: 25,
          aylikForumKonusuLimiti: null,
          aylikMesajBaslatmaLimiti: null,
          gunlukMesajBaslatmaLimiti: null,
          gunlukForumIlgiLimiti: 25,
          gunlukHavuzMesajLimiti: 25,
          verilenKontor: 500,
          fiyat: 0,
          paraBirimi: 'TRY',
          aktifMi: true,
        },
        create: {
          paketKodu: 'DENEME',
          paketAdi: 'DENEME',
          aciklama:
            'Yeni kullanıcılar için role göre 30 veya 60 günlük ücretsiz başlangıç paketi.',
          aktifPortfoyLimiti: 25,
          aylikForumKonusuLimiti: null,
          aylikMesajBaslatmaLimiti: null,
          gunlukMesajBaslatmaLimiti: null,
          gunlukForumIlgiLimiti: 25,
          gunlukHavuzMesajLimiti: 25,
          verilenKontor: 500,
          fiyat: 0,
          paraBirimi: 'TRY',
          aktifMi: true,
        },
      });

      const trialGunSayisi =
        data.role === Role.MUTEAHHIT ||
        data.role === Role.INSAAT_FIRMASI
          ? 60
          : 30;

      const baslangicTarihi = new Date();
      const bitisTarihi = new Date(baslangicTarihi);

      bitisTarihi.setDate(
        bitisTarihi.getDate() + trialGunSayisi,
      );

      await tx.kullaniciUyelikPaketi.create({
        data: {
          kullaniciId: user.id,
          paketId: denemePaketi.id,
          durum: 'AKTIF',
          baslangicTarihi,
          bitisTarihi,
          pilotPaketMi: false,
          testPaketiMi: false,
          notlar: `${data.role} rolü için ${trialGunSayisi} günlük otomatik DENEME paketi.`,
        },
      });

      await tx.kontorCuzdani.create({
        data: {
          kullaniciId: user.id,
          bakiye: 500,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 500,
          aktifMi: true,
        },
      });

      await tx.kontorHareketi.create({
        data: {
          kullaniciId: user.id,
          hareketTuru: 'HEDIYE',
          islemTuru: 'DIGER',
          miktar: 500,
          oncekiBakiye: 0,
          sonrakiBakiye: 500,
          aciklama: `${trialGunSayisi} günlük DENEME paketi başlangıç kontörü.`,
          ilgiliKayitTuru: 'UYELIK_PAKETI',
          ilgiliKayitId: denemePaketi.id,
          olusturanId: null,
        },
      });

      return user;
    });
  }
}
