const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const sample = await p.user.findFirst();
  console.log('User city fields:', {
    city: sample.city,
    district: sample.district,
    neighborhood: sample.neighborhood,
  });
}
run().finally(() => p.$disconnect());
