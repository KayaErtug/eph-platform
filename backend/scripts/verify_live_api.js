const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const offices = await p.office.findMany({ select: { id: true, name: true, code: true } });
  console.log('=== CANLI OFISLER VE KODLARI ===');
  offices.forEach(o => console.log(`Ofis: ${o.name} | ID: ${o.id} | Kod: ${o.code}`));
  
  const superAdmin = await p.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, firstName: true, lastName: true }
  });
  console.log('=== SUPER ADMIN ===', superAdmin);
}

run().finally(() => p.$disconnect());
