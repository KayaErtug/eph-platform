const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

bcrypt.hash('Admin1234!', 10).then(h => 
  p.user.create({
    data: {
      firstName: 'Ali',
      lastName: 'Yilmaz',
      email: 'ali@eph.com',
      phone: '+905301234568',
      passwordHash: h,
      role: 'ADMIN',
      isApproved: true,
      isVerified: true
    }
  })
).then(r => console.log('OK:', r.email))
 .catch(e => console.error('HATA:', e.message))
 .finally(() => p.$disconnect());