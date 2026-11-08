const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  console.log('=== 1. SON OLUŞTURULAN OFİSLER ===');
  const offices = await p.office.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  });
  offices.forEach(o => {
    console.log(`Ofis Adı: ${o.name} | Ofis Kodu: ${o.code} | Ofis ID: ${o.id} | Sahibi: ${o.owner ? o.owner.firstName + ' ' + o.owner.lastName : 'Yok'} | Oluşturulma: ${o.createdAt}`);
  });

  console.log('\n=== 2. SON OLUŞTURULAN KULLANICILAR ===');
  const recentUsers = await p.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      memberCode: true,
      createdAt: true,
      office: { select: { id: true, name: true, code: true } }
    }
  });
  recentUsers.forEach(u => {
    console.log(`Ad Soyad: ${u.firstName} ${u.lastName} | EPH Kodu: ${u.memberCode || 'Yok'} | ID: ${u.id} | Rol: ${u.role} | Tel: ${u.phone} | E-posta: ${u.email} | Ofis: ${u.office?.name || 'Bağımsız'} | Oluşturulma: ${u.createdAt}`);
  });

  console.log('\n=== 3. MUSTAFA SAMSA BİLGİLERİ VE PAKETİ ===');
  const mustafa = await p.user.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Mustafa', mode: 'insensitive' }, lastName: { contains: 'Samsa', mode: 'insensitive' } },
        { email: { contains: 'samsa', mode: 'insensitive' } }
      ]
    },
    include: {
      ownedOffices: true,
    }
  });
  console.log('Mustafa Samsa:', mustafa ? {
    id: mustafa.id,
    name: `${mustafa.firstName} ${mustafa.lastName}`,
    email: mustafa.email,
    phone: mustafa.phone,
    role: mustafa.role,
    memberCode: mustafa.memberCode,
  } : 'Bulunamadı');

  const packages = await p.systemSetting.findMany({
    where: {
      OR: [
        { key: { contains: 'PACKAGE', mode: 'insensitive' } },
        { key: { contains: 'MEMBERSHIP', mode: 'insensitive' } },
        { key: { contains: 'UYELIK', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Mevcut Paket Ayarları:', packages.map(pkg => pkg.key));
}

run().finally(() => p.$disconnect());
