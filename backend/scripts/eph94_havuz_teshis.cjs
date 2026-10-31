// EPH-94: Portfoy Havuzu teshis betigi (YALNIZ SELECT / count; kisisel veri yazmaz, yalniz sayilar).
// Kullanim (sunucuda, backend klasorunden):
//   node scripts/eph94_havuz_teshis.cjs
//   node scripts/eph94_havuz_teshis.cjs --user=<kullanici-id-veya-e-posta>   (engelleme + hedef kitle adimlari o kullanici icin)
// Cikti: her kosulun TEK BASINA elediği ve ARDISIK (kümülatif) kalan ilan sayilari.
// /pool-experience/units ve /units (süper admin görünümü) için ayri tablolar.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const OUT = ['PASIF', 'SATILDI', 'KIRALANDII'];

// units.service.ts getClassicPortfolioProjectWhere() ile ayni
const CLASSIC_PROJECT = {
  code: null,
  declaredIndependentUnitCount: null,
  declaredSalesInventoryCount: null,
  plannedUnitTypes: { isEmpty: true },
  blocks: { none: {} },
  mediaPackages: { none: {} },
  designReviewRequests: { none: {} },
};

async function table(title, base, steps) {
  const total = await prisma.unit.count({ where: base });
  console.log(`\n=== ${title} ===`);
  console.log(`Baslangic kume: ${total}`);
  console.log('kosul'.padEnd(46), 'tek basina ELER'.padEnd(18), 'ardisik KALAN'.padEnd(14), 'ardisik ELENEN');
  let cum = [base];
  let prev = total;
  for (const [name, cond] of steps) {
    const alone = await prisma.unit.count({ where: { AND: [base, cond] } });
    cum = [...cum, cond];
    const left = await prisma.unit.count({ where: { AND: cum } });
    console.log(name.padEnd(46), String(total - alone).padEnd(18), String(left).padEnd(14), prev - left);
    prev = left;
  }
  console.log(`SONUC (sorgu where kaldi): ${prev}`);
  return prev;
}

async function resolveUser(arg) {
  if (!arg) return null;
  return prisma.user.findFirst({
    where: arg.includes('@') ? { email: arg } : { id: arg },
    select: { id: true, role: true },
  });
}

async function main() {
  const userArg = (process.argv.find((a) => a.startsWith('--user=')) || '').slice(7);
  const user = await resolveUser(userArg);
  if (userArg && !user) console.log('UYARI: --user bulunamadi, kullaniciya ozel adimlar atlandi.');
  const isSuper = user?.role === 'SUPER_ADMIN';

  console.log('EPH-94 teshis (salt-okunur). Kullanici:', user ? `${user.role}` : '(verilmedi)');
  console.log('Toplam Unit:', await prisma.unit.count());
  console.log('Unit.isPoolVisible=true:', await prisma.unit.count({ where: { isPoolVisible: true } }));

  // ---- A) /pool-experience/units (pool-experience.service.ts findPoolUnits) ----
  const poolBase = { isPoolVisible: true };
  await table('A) GET /pool-experience/units', poolBase, [
    ['status NOT IN (PASIF,SATILDI,KIRALANDII)', { status: { notIn: OUT } }],
    ["approvalStatus = HAVUZDA", { approvalStatus: 'HAVUZDA' }],
    ['project.isActive = true', { project: { isActive: true } }],
    ['project.code IS NULL', { project: { code: null } }],
  ]);
  console.log('Not: sorguda take/skip YOK, sure (expiry) YOK, sahip uyelik/paket YOK; sayfalama yok.');

  // Sorgu sonrasi (JS) filtreler: engelleme + hedef kitle
  const poolWhere = {
    isPoolVisible: true,
    status: { notIn: OUT },
    approvalStatus: 'HAVUZDA',
    project: { isActive: true, code: null },
  };
  const afterDb = await prisma.unit.findMany({ where: poolWhere, select: { id: true, project: { select: { ownerId: true } } } });
  console.log(`\nSorgu sonrasi (filterVisibleUnits) giris: ${afterDb.length}`);
  if (user) {
    const blocks = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
      select: { blockerId: true, blockedId: true },
    });
    const peers = new Set(blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId)));
    const afterBlock = afterDb.filter((u) => !peers.has(u.project.ownerId));
    console.log(`  engelleme (blockedPeerIds, SUPER_ADMIN de dahil): elenen ${afterDb.length - afterBlock.length}, kalan ${afterBlock.length}`);
    let afterAud = afterBlock;
    if (!isSuper) {
      const ids = afterBlock.map((u) => u.id);
      const rows = await prisma.poolAudienceUnit.findMany({
        where: { unitId: { in: ids } },
        include: { groups: { include: { group: { include: { members: { where: { userId: user.id }, select: { userId: true }, take: 1 } } } } } },
      });
      const by = new Map(rows.map((r) => [r.unitId, r]));
      afterAud = afterBlock.filter((u) => {
        if (u.project.ownerId === user.id) return true;
        const a = by.get(u.id);
        if (!a || a.mode === 'PUBLIC') return true;
        if (user.role && a.roles.includes(user.role)) return true;
        return a.groups.some((l) => l.group.members.length > 0);
      });
      console.log(`  hedef kitle (PoolAudienceUnit TARGETED): elenen ${afterBlock.length - afterAud.length}, kalan ${afterAud.length}`);
    } else {
      console.log('  hedef kitle: SUPER_ADMIN icin uygulanmaz.');
    }
    console.log(`  API'nin donmesi beklenen adet: ${afterAud.length}`);
  } else {
    const t = await prisma.poolAudienceUnit.count({ where: { mode: 'TARGETED', unitId: { in: afterDb.map((u) => u.id) } } });
    console.log(`  (--user verilmedi) TARGETED hedef kitleli ilan: ${t}; engelleme adimi atlandi.`);
  }

  // ---- Referans: ilanlari eleyen bilesenler (neden dagilimi, yalniz sayi) ----
  console.log('\n--- isPoolVisible=true ilanlarin dagilimi ---');
  const byStatus = await prisma.unit.groupBy({ by: ['status'], where: { isPoolVisible: true }, _count: { _all: true } });
  console.log('status:', byStatus.map((r) => `${r.status}=${r._count._all}`).join(', '));
  const byAppr = await prisma.unit.groupBy({ by: ['approvalStatus'], where: { isPoolVisible: true }, _count: { _all: true } });
  console.log('approvalStatus:', byAppr.map((r) => `${r.approvalStatus}=${r._count._all}`).join(', '));
  console.log('project.isActive=false:', await prisma.unit.count({ where: { isPoolVisible: true, project: { isActive: false } } }));
  console.log('project.code dolu (proje satis):', await prisma.unit.count({ where: { isPoolVisible: true, project: { code: { not: null } } } }));
  console.log('  ...bunlardan project.setupStatus=TAMAMLANDI:', await prisma.unit.count({ where: { isPoolVisible: true, project: { code: { not: null }, setupStatus: 'TAMAMLANDI' } } }));
  console.log('  (units.service findPool bu TAMAMLANDI projeleri DAHIL eder; pool-experience etmez)');

  // ---- /units (units.service.ts findAll) ----
  const allBase = {};
  await table('B) GET /units (SUPER_ADMIN gorunumu: getPrivateUnitWhere={} )', allBase, [
    ['project.isActive = true', { project: { isActive: true } }],
    ['project.code IS NULL', { project: { code: null } }],
    ['declaredIndependentUnitCount IS NULL', { project: { declaredIndependentUnitCount: null } }],
    ['declaredSalesInventoryCount IS NULL', { project: { declaredSalesInventoryCount: null } }],
    ['plannedUnitTypes bos', { project: { plannedUnitTypes: { isEmpty: true } } }],
    ['blocks yok', { project: { blocks: { none: {} } } }],
    ['mediaPackages yok', { project: { mediaPackages: { none: {} } } }],
    ['designReviewRequests yok', { project: { designReviewRequests: { none: {} } } }],
  ]);
  console.log('Not: ayni kosullar toplu (CLASSIC_PROJECT + isActive):',
    await prisma.unit.count({ where: { project: { ...CLASSIC_PROJECT, isActive: true } } }));
  if (user) {
    const own = await prisma.unit.count({ where: { project: { ownerId: user.id } } });
    const ownVisible = await prisma.unit.count({ where: { project: { ownerId: user.id, ...CLASSIC_PROJECT, isActive: true } } });
    console.log(`Kullanicinin kendi ilani: ${own}; /units?ownerOnly gorunumu: ${ownVisible}`);
    const ownProjects = await prisma.project.count({ where: { ownerId: user.id } });
    console.log(`Kullanicinin proje (portfoy) kaydi: ${ownProjects}`);
  }
  console.log('Not: /units sorgusunda take/skip YOK; sayfalama yok.');
}

main()
  .catch((e) => { console.error('HATA:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
