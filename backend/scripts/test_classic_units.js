const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const superAdmin = await p.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  
  const classicWhere = {
    code: null,
    declaredIndependentUnitCount: null,
    declaredSalesInventoryCount: null,
    plannedUnitTypes: { isEmpty: true },
    blocks: { none: {} },
    mediaPackages: { none: {} },
    designReviewRequests: { none: {} },
  };

  // Test 1: Super Admin with ALL classic units
  const allClassic = await p.unit.findMany({
    where: {
      project: {
        ...classicWhere,
        isActive: true,
      }
    },
    select: { id: true, type: true, project: { select: { name: true, owner: { select: { firstName: true, lastName: true, role: true } } } } }
  });
  console.log('Test 1 - Super admin total classic units count:', allClassic.length);
  
  // Test 2: Super Admin ownerOnly
  const ownClassic = await p.unit.findMany({
    where: {
      project: {
        ownerId: superAdmin.id,
        ...classicWhere,
        isActive: true,
      }
    }
  });
  console.log('Test 2 - Super admin own classic units count:', ownClassic.length);
}

run().finally(() => p.$disconnect());
