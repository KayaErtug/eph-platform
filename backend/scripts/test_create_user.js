const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function run() {
  console.log('=== TEST: KULLANICI OLUŞTURMA TESTİ ===');
  const superAdmin = await p.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  console.log('Aktör (Süper Admin):', superAdmin.email);
  
  const testEmail = `test.user.${Date.now()}@eph.com`;
  const testPhone = `0555${Math.floor(1000000 + Math.random() * 9000000)}`;
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const created = await p.user.create({
    data: {
      firstName: 'Deneme',
      lastName: 'Danışman',
      email: testEmail,
      phone: testPhone,
      passwordHash,
      role: 'EMLAKCI',
      city: 'Denizli',
      district: 'Pamukkale',
      isApproved: true,
      isVerified: true,
      memberCode: `EPH-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    }
  });
  
  console.log('Oluşturulan Kullanıcı Başarılı:', {
    id: created.id,
    name: `${created.firstName} ${created.lastName}`,
    email: created.email,
    phone: created.phone,
    role: created.role,
    city: created.city,
    memberCode: created.memberCode,
  });
  
  // Test cleanup
  await p.user.delete({ where: { id: created.id } });
  console.log('Test kullanıcısı temizlendi. Test PASS!');
}

run().finally(() => p.$disconnect());
