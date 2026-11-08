const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const offices = await p.office.findMany();
  console.log('Total offices:', offices.length);
  for (const off of offices) {
    if (!off.code) {
      const code = 'OFS-' + Math.floor(10000 + Math.random() * 90000).toString();
      await p.office.update({ where: { id: off.id }, data: { code } });
      console.log('Assigned code', code, 'to office', off.name);
    } else {
      console.log('Office', off.name, 'already has code', off.code);
    }
  }
}

run().finally(() => p.$disconnect());
