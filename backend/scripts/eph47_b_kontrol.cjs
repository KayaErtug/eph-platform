// EPH-47 B2: SALT OKUMA. Volarant ofisi, uyeleri, veri sayilari, paket/cuzdan. Kisisel veri maskeli.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const mask = (s) => (s ? String(s).slice(0, 1) + '***' : null);

(async () => {
  const prisma = new PrismaClient();
  try {
    const offices = await prisma.office.findMany({
      where: { name: { contains: 'volarant', mode: 'insensitive' } },
      include: { owner: { select: { id: true, firstName: true, lastName: true, role: true } }, users: { select: { id: true, role: true, firstName: true, lastName: true } }, teams: { select: { id: true } } },
    });
    console.log('ofis sayisi:', offices.length);
    for (const o of offices) {
      const ids = o.users.map((u) => u.id);
      const rels = prisma._runtimeDataModel.models.User.fields
        .filter((f) => f.kind === 'object' && f.isList).map((f) => f.name);
      const veri = {};
      for (const id of ids) {
        const c = await prisma.user.findUnique({ where: { id }, select: { _count: { select: Object.fromEntries(rels.map((r) => [r, true])) } } });
        for (const [k, n] of Object.entries(c._count)) if (n > 0) veri[k] = (veri[k] || 0) + n;
      }
      const sub = await prisma.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${o.id}` } });
      const wallet = o.ownerUserId ? await prisma.kontorCuzdani.findUnique({ where: { kullaniciId: o.ownerUserId } }) : null;
      console.log(JSON.stringify({
        officeId: o.id, name: o.name, isActive: o.isActive,
        owner: o.owner && { id: o.owner.id, ad: `${mask(o.owner.firstName)} ${mask(o.owner.lastName)}`, role: o.owner.role },
        uyeSayisi: o.users.length, uyeler: o.users.map((u) => ({ id: u.id, role: u.role, ad: `${mask(u.firstName)} ${mask(u.lastName)}` })),
        takim: o.teams.length, veri,
        abonelik: sub && sub.valueJson, cuzdan: wallet && { bakiye: wallet.bakiye, aktif: wallet.aktifMi },
      }, null, 1));
    }
    const pk = await prisma.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
    console.log('paketler:', JSON.stringify((pk?.valueJson || []).map((p) => ({ code: p.code, name: p.name, monthlyPk: p.monthlyPk, agents: p.agents, active: p.active }))));
    const ph = await prisma.phoneVerificationSecurity.findUnique({ where: { phone: '+905323402036' } });
    console.log('A5 phoneVerificationSecurity kaydi:', ph ? { lockedUntil: ph.lockedUntil, verifiedAt: ph.verifiedAt, firebaseUid: ph.firebaseUid ? 'var' : null, nextSmsAllowedAt: ph.nextSmsAllowedAt } : 'yok');
  } finally {
    await prisma.$disconnect();
  }
})();
