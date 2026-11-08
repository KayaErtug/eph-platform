const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const u = await p.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  console.log('SuperAdmin:', u.id, u.firstName, u.lastName, u.role);
  
  const ownUnits = await p.unit.count({ where: { project: { ownerId: u.id } } });
  const ownCust = await p.customer.count({ where: { ownerId: u.id } });
  const ownProj = await p.project.count({ where: { ownerId: u.id } });
  console.log('OWN stats (15, 8, 10):', { units: ownUnits, cust: ownCust, proj: ownProj });
  
  const totalUnits = await p.unit.count({ where: { project: { isActive: true } } });
  const totalCust = await p.customer.count();
  const totalProj = await p.project.count({ where: { isActive: true } });
  console.log('TOTAL platform stats:', { units: totalUnits, cust: totalCust, proj: totalProj });
  
  // Also check units/my logic
  const classicUnits = await p.unit.count({
    where: {
      project: {
        isActive: true,
        code: null,
        declaredIndependentUnitCount: null,
        declaredSalesInventoryCount: null,
      }
    }
  });
  console.log('Classic single real-estate units:', classicUnits);
  
  const contractorProjectUnits = await p.unit.count({
    where: {
      project: {
        owner: { role: 'MUTEAHHIT' },
        NOT: {
          code: null,
          declaredIndependentUnitCount: null,
        }
      }
    }
  });
  console.log('Contractor project units:', contractorProjectUnits);
}

run().finally(() => p.$disconnect());
