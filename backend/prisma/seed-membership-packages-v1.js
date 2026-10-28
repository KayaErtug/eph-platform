const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const packages = [
  {
    paketKodu: 'DENEME', segment: 'EMLAK_PRO',
    paketAdi: 'Deneme',
    aciklama: '14 günlük deneme paketi. Bronz paket haklarını içerir.',
    aktifPortfoyLimiti: 30,
    aylikTalepLimiti: 10,
    aylikHavuzGonderimLimiti: 20,
    aylikMatchLimiti: 40,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: null,
    projeIlanLimiti: null,
    aylikPaketPk: 1000,
    denemeGunSayisi: 14,
    fiyat: 0,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 10,
    verilenKontor: 1000,
  },
  {
    paketKodu: 'BRONZ', segment: 'EMLAK_PRO',
    paketAdi: 'Bronz',
    aciklama: 'Emlak profesyonelleri için Bronz üyelik paketi.',
    aktifPortfoyLimiti: 30,
    aylikTalepLimiti: 10,
    aylikHavuzGonderimLimiti: 20,
    aylikMatchLimiti: 40,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: null,
    projeIlanLimiti: null,
    aylikPaketPk: 1000,
    denemeGunSayisi: null,
    fiyat: 500,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 10,
    verilenKontor: 1000,
  },
  {
    paketKodu: 'GUMUS', segment: 'EMLAK_PRO',
    paketAdi: 'Gümüş',
    aciklama: 'Emlak profesyonelleri için Gümüş üyelik paketi.',
    aktifPortfoyLimiti: 100,
    aylikTalepLimiti: 30,
    aylikHavuzGonderimLimiti: 60,
    aylikMatchLimiti: 100,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: null,
    projeIlanLimiti: null,
    aylikPaketPk: 3000,
    denemeGunSayisi: null,
    fiyat: 1000,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 30,
    verilenKontor: 3000,
  },
  {
    paketKodu: 'ALTIN', segment: 'EMLAK_PRO',
    paketAdi: 'Altın',
    aciklama: 'Emlak profesyonelleri için Altın üyelik paketi.',
    aktifPortfoyLimiti: 300,
    aylikTalepLimiti: 100,
    aylikHavuzGonderimLimiti: 200,
    aylikMatchLimiti: 300,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: null,
    projeIlanLimiti: null,
    aylikPaketPk: 10000,
    denemeGunSayisi: null,
    fiyat: 2500,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 100,
    verilenKontor: 10000,
  },

  {
    paketKodu: 'DENEME', segment: 'MUTEAHHIT',
    paketAdi: 'Deneme',
    aciklama: '14 günlük deneme paketi. Bronz paket haklarını içerir.',
    aktifPortfoyLimiti: 12,
    aylikTalepLimiti: 10,
    aylikHavuzGonderimLimiti: 10,
    aylikMatchLimiti: 40,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: 1,
    projeIlanLimiti: 12,
    aylikPaketPk: 750,
    denemeGunSayisi: 14,
    fiyat: 0,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 10,
    verilenKontor: 750,
  },
  {
    paketKodu: 'BRONZ', segment: 'MUTEAHHIT',
    paketAdi: 'Bronz',
    aciklama: 'Müteahhit ve inşaat firmaları için Bronz üyelik paketi.',
    aktifPortfoyLimiti: 12,
    aylikTalepLimiti: 10,
    aylikHavuzGonderimLimiti: 10,
    aylikMatchLimiti: 40,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: 1,
    projeIlanLimiti: 12,
    aylikPaketPk: 750,
    denemeGunSayisi: null,
    fiyat: 500,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 10,
    verilenKontor: 750,
  },
  {
    paketKodu: 'GUMUS', segment: 'MUTEAHHIT',
    paketAdi: 'Gümüş',
    aciklama: 'Müteahhit ve inşaat firmaları için Gümüş üyelik paketi.',
    aktifPortfoyLimiti: 36,
    aylikTalepLimiti: 30,
    aylikHavuzGonderimLimiti: 30,
    aylikMatchLimiti: 100,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: 3,
    projeIlanLimiti: 36,
    aylikPaketPk: 2000,
    denemeGunSayisi: null,
    fiyat: 1000,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 30,
    verilenKontor: 2000,
  },
  {
    paketKodu: 'ALTIN', segment: 'MUTEAHHIT',
    paketAdi: 'Altın',
    aciklama: 'Müteahhit ve inşaat firmaları için Altın üyelik paketi.',
    aktifPortfoyLimiti: 120,
    aylikTalepLimiti: 100,
    aylikHavuzGonderimLimiti: 100,
    aylikMatchLimiti: 300,
    aylikYeniGorusmeLimiti: 0,
    projeLimiti: 10,
    projeIlanLimiti: 120,
    aylikPaketPk: 6000,
    denemeGunSayisi: null,
    fiyat: 2500,
    paraBirimi: 'TRY',
    aktifMi: true,
    aylikForumKonusuLimiti: 100,
    verilenKontor: 6000,
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const item of packages) {
      await tx.uyelikPaketi.upsert({
        where: {
          paketKodu_segment: {
            paketKodu: item.paketKodu,
            segment: item.segment,
          },
        },
        update: item,
        create: item,
      });
    }
  });

  const count = await prisma.uyelikPaketi.count();

  const rows = await prisma.uyelikPaketi.findMany({
    orderBy: [
      { segment: 'asc' },
      { fiyat: 'asc' },
    ],
    select: {
      paketKodu: true,
      segment: true,
      fiyat: true,
      aylikPaketPk: true,
      aktifPortfoyLimiti: true,
      aylikTalepLimiti: true,
      aylikHavuzGonderimLimiti: true,
      aylikMatchLimiti: true,
      projeLimiti: true,
      projeIlanLimiti: true,
      denemeGunSayisi: true,
      aktifMi: true,
    },
  });

  console.log("TOPLAM PAKET:", count);
  console.table(rows);

  if (count !== 8) {
    throw new Error(`Beklenen 8 paket, bulunan ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
