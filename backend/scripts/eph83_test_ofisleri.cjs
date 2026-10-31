// EPH-83: Kardes Ofis testi icin test verisi.
// Kullanim (sunucuda, backend klasorunden):
//   EPH_TEST_PASS='...' node scripts/eph83_test_ofisleri.cjs kur
//   node scripts/eph83_test_ofisleri.cjs pamukkale-kabul
//   node scripts/eph83_test_ofisleri.cjs sil
// Parola YALNIZ ortam degiskeninden (EPH_TEST_PASS) okunur; yalnizca "kur" icin gerekir.
// Idempotent: "kur" tekrar calistirilirsa ayni kayitlari yeniden kullanir, cogaltmaz.
// "sil" yalniz asagidaki e-posta / ofis adlariyla eslesen kayitlara dokunur; Volarant ve gercek veriye dokunmaz.
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const VOLARANT = { name: 'Volarant Denizli', fallbackId: 'a9d50719-6f67-480d-9737-b7556ece78f3' };
const PACKAGE_CODE = 'ALTIN';
const SUBSCRIPTION_DAYS = 30;
const EVENT_PREFIX = 'eph83:';

const TEST = {
  mavi: {
    key: 'MAVI', officeName: 'Mavi Emlak Ofisi (TEST)', slug: 'eph83-mavi-emlak-test',
    owner: { firstName: 'Mavi', lastName: 'Test', email: 'test.mavi@emlakportfoyhavuzu.test', phone: '+905550000001' },
  },
  pamukkale: {
    key: 'PAMUKKALE', officeName: 'Pamukkale Emlak Ofisi (TEST)', slug: 'eph83-pamukkale-emlak-test',
    owner: { firstName: 'Pamukkale', lastName: 'Test', email: 'test.pamukkale@emlakportfoyhavuzu.test', phone: '+905550000002' },
  },
};
const ALL = [TEST.mavi, TEST.pamukkale];

// Her ofis icin 5 portfoy: 3 satilik + 2 kiralik; ilk 4'u kardes ofislerle paylasilir, sonuncusu paylasilmaz.
const LISTINGS = {
  MAVI: [
    { n: 1, status: 'SATILIK', type: 'DAIRE', room: '3+1', net: 125, gross: 145, price: 4250000, floor: 4, total: 8, hood: 'Bahçelievler', district: 'Merkezefendi', title: 'Bahçelievler 3+1 Güney Cepheli Daire', desc: 'Merkezefendi Bahçelievler\'de güney cepheli, ferah salonlu, ebeveyn banyolu daire. Okul ve çarşıya yürüme mesafesinde.', feats: ['Asansör', 'Kapalı Otopark', 'Balkon', 'Doğalgaz'], owner: 'Hasan Yılmaz', ownerPhone: '+905550010001', addr: 'Bahçelievler Mah. 4. Sk. No:12 Merkezefendi/Denizli', shared: true },
    { n: 2, status: 'SATILIK', type: 'DAIRE', room: '2+1', net: 95, gross: 112, price: 2850000, floor: 2, total: 5, hood: 'Çamlık', district: 'Pamukkale', title: 'Çamlık 2+1 Yatırımlık Daire', desc: 'Pamukkale Çamlık\'ta bakımlı, kiracılı, yatırımlık 2+1 daire. Toplu taşımaya yakın.', feats: ['Balkon', 'Doğalgaz', 'Giyinme Odası'], owner: 'Ayşe Demir', ownerPhone: '+905550010002', addr: 'Çamlık Mah. 12. Sk. No:5 Pamukkale/Denizli', shared: true },
    { n: 3, status: 'SATILIK', type: 'VILLA', room: '4+1', net: 210, gross: 260, price: 9800000, floor: 0, total: 2, hood: 'Kaklık', district: 'Pamukkale', title: 'Kaklık 4+1 Bahçeli Müstakil Villa', desc: 'Pamukkale Kaklık\'ta 600 m² arsa içinde, havuzlu, bahçeli müstakil villa.', feats: ['Havuz', 'Bahçe', 'Güvenlik', 'Şömine'], owner: 'Mehmet Kaya', ownerPhone: '+905550010003', addr: 'Kaklık Mah. Gül Sk. No:3 Pamukkale/Denizli', shared: true },
    { n: 4, status: 'KIRALIK', type: 'DAIRE', room: '2+1', net: 90, gross: 105, price: 17500, floor: 3, total: 6, hood: 'Muratlar', district: 'Merkezefendi', title: 'Muratlar 2+1 Kiralık Daire', desc: 'Merkezefendi Muratlar\'da yeni boyalı, ebeveyn banyolu kiralık daire.', feats: ['Asansör', 'Balkon', 'Doğalgaz'], owner: 'Fatma Çelik', ownerPhone: '+905550010004', addr: 'Muratlar Mah. 7. Sk. No:21 Merkezefendi/Denizli', shared: true },
    { n: 5, status: 'KIRALIK', type: 'STUDYO', room: '1+0', net: 42, gross: 50, price: 11000, floor: 1, total: 4, hood: 'Çınar', district: 'Merkezefendi', title: 'Çınar 1+0 Eşyalı Stüdyo', desc: 'Merkezefendi Çınar\'da eşyalı, öğrenci ve bekâr için uygun stüdyo daire.', feats: ['Eşyalı', 'Klima'], owner: 'Ali Şahin', ownerPhone: '+905550010005', addr: 'Çınar Mah. 3. Sk. No:8 Merkezefendi/Denizli', shared: false },
  ],
  PAMUKKALE: [
    { n: 1, status: 'SATILIK', type: 'DAIRE', room: '3+1', net: 130, gross: 150, price: 4600000, floor: 5, total: 9, hood: 'Kınıklı', district: 'Pamukkale', title: 'Kınıklı 3+1 Üniversite Yakını Daire', desc: 'Pamukkale Kınıklı\'da üniversiteye yakın, geniş balkonlu, asansörlü 3+1 daire.', feats: ['Asansör', 'Otopark', 'Balkon', 'Doğalgaz'], owner: 'Zeynep Arslan', ownerPhone: '+905550020001', addr: 'Kınıklı Mah. 15. Sk. No:9 Pamukkale/Denizli', shared: true },
    { n: 2, status: 'SATILIK', type: 'DAIRE', room: '2+1', net: 88, gross: 104, price: 2650000, floor: 1, total: 4, hood: 'Bahçelievler', district: 'Merkezefendi', title: 'Bahçelievler 2+1 Bahçe Katı Daire', desc: 'Merkezefendi Bahçelievler\'de kullanım alanı geniş, bahçe katı 2+1 daire.', feats: ['Bahçe Kullanımı', 'Doğalgaz', 'Balkon'], owner: 'Murat Öztürk', ownerPhone: '+905550020002', addr: 'Bahçelievler Mah. 9. Sk. No:14 Merkezefendi/Denizli', shared: true },
    { n: 3, status: 'SATILIK', type: 'DUKKAN_MAGAZA', room: '1+0', net: 70, gross: 78, price: 5400000, floor: 0, total: 3, hood: 'Hürriyet', district: 'Pamukkale', title: 'Hürriyet Cadde Üzeri Dükkan', desc: 'Pamukkale Hürriyet\'te cadde üzeri, yüksek yaya trafiği olan köşe dükkan.', feats: ['Cadde Üzeri', 'Vitrin', 'Tuvalet'], owner: 'Kemal Aydın', ownerPhone: '+905550020003', addr: 'Hürriyet Mah. Atatürk Cd. No:44 Pamukkale/Denizli', shared: true },
    { n: 4, status: 'KIRALIK', type: 'DAIRE', room: '3+1', net: 120, gross: 140, price: 24000, floor: 3, total: 7, hood: 'Gökpınar', district: 'Merkezefendi', title: 'Gökpınar 3+1 Kiralık Daire', desc: 'Merkezefendi Gökpınar\'da ferah, asansörlü, aile için uygun kiralık daire.', feats: ['Asansör', 'Balkon', 'Kapalı Otopark'], owner: 'Elif Koç', ownerPhone: '+905550020004', addr: 'Gökpınar Mah. 2. Sk. No:30 Merkezefendi/Denizli', shared: true },
    { n: 5, status: 'KIRALIK', type: 'DAIRE', room: '1+1', net: 55, gross: 65, price: 13500, floor: 2, total: 5, hood: 'Kınıklı', district: 'Pamukkale', title: 'Kınıklı 1+1 Eşyalı Daire', desc: 'Pamukkale Kınıklı\'da eşyalı, öğrenci ve çalışan için uygun 1+1 daire.', feats: ['Eşyalı', 'Klima', 'Balkon'], owner: 'Burak Güneş', ownerPhone: '+905550020005', addr: 'Kınıklı Mah. 20. Sk. No:6 Pamukkale/Denizli', shared: false },
  ],
};

const log = (...a) => console.log(...a);
const sorted = (a, b) => (a < b ? [a, b] : [b, a]);

async function findVolarant(tx) {
  const office = (await tx.office.findFirst({ where: { name: VOLARANT.name } })) || (await tx.office.findUnique({ where: { id: VOLARANT.fallbackId } }));
  if (!office) throw new Error('Volarant ofisi bulunamadi.');
  if (!office.ownerUserId) throw new Error('Volarant ofisinin sahibi yok.');
  return office;
}

async function notify(tx, userId, eventKey, input) {
  const data = { userId, type: input.type, priority: input.priority, title: input.title, message: input.body, actionUrl: '/office', eventKey, pushStatus: 'NONE' };
  const existing = await tx.networkNotification.findUnique({ where: { eventKey } });
  if (!existing) await tx.networkNotification.create({ data });
}

async function ensureOwnerAndOffice(tx, def, password, now) {
  const passwordHash = await bcrypt.hash(password, 10); // register ile ayni: bcryptjs, 10 tur
  let user = await tx.user.findUnique({ where: { email: def.owner.email } });
  if (!user) {
    const byPhone = await tx.user.findUnique({ where: { phone: def.owner.phone } });
    if (byPhone) throw new Error(`${def.owner.phone} telefonu baska bir kullanicida kayitli, durduruldu.`);
    user = await tx.user.create({
      data: {
        ...def.owner, passwordHash, role: 'EMLAKCI', isApproved: true, isVerified: true, emailVerifiedAt: now,
        profileCompleted: true, profileCompletedAt: now, professionalVerificationStatus: 'VERIFIED', city: 'Denizli', district: 'Merkezefendi',
      },
    });
  }
  await tx.userCapability.upsert({
    where: { userId_capability: { userId: user.id, capability: 'OFFICE_OWNER' } },
    create: { userId: user.id, capability: 'OFFICE_OWNER' }, update: {},
  });
  let office = await tx.office.findFirst({ where: { name: def.officeName, ownerUserId: user.id } });
  if (!office) {
    office = await tx.office.create({ data: { name: def.officeName, slug: def.slug, ownerUserId: user.id, city: 'Denizli', district: 'Merkezefendi', isActive: true } });
    await tx.systemSetting.upsert({
      where: { key: `EPH_OFFICE_SPENDING_${office.id}` },
      create: { key: `EPH_OFFICE_SPENDING_${office.id}`, valueJson: { mode: 'ALLOCATED', updatedBy: user.id, updatedAt: now.toISOString() } }, update: {},
    });
  }
  if (!office.isActive) office = await tx.office.update({ where: { id: office.id }, data: { isActive: true } });
  if (user.officeId !== office.id) user = await tx.user.update({ where: { id: user.id }, data: { officeId: office.id } });
  if (!office.code) {
    for (let i = 0; i < 20 && !office.code; i++) {
      const code = `OFS-${100000 + crypto.randomInt(900000)}`;
      if (await tx.office.findUnique({ where: { code } })) continue;
      office = await tx.office.update({ where: { id: office.id }, data: { code } });
    }
    if (!office.code) throw new Error('Ofis kodu uretilemedi.');
  }
  return { user, office };
}

// Kardes Ofis uygunluk kontrolu SystemSetting "OFFICE_SUBSCRIPTION_<officeId>" icindeki packageCode (+ expiresAt) alanini okur.
// Kayit bicimi office.service.ts purchaseOfficePackage / eph47_b_demo.cjs ile aynidir.
async function ensureSubscription(tx, office, now) {
  const row = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
  const pkg = (Array.isArray(row?.valueJson) ? row.valueJson : []).find((p) => p.code === PACKAGE_CODE);
  if (!pkg || pkg.active === false) throw new Error(`Ofis ${PACKAGE_CODE} paketi tanimli/aktif degil.`);
  const valueJson = {
    officeId: office.id, packageCode: pkg.code, packageName: pkg.name, price: pkg.price, monthlyPk: pkg.monthlyPk,
    portfolioCapacity: pkg.portfolioCapacity, crmCapacity: pkg.crmCapacity, agents: pkg.agents,
    purchasedAt: now.toISOString(), expiresAt: new Date(now.getTime() + SUBSCRIPTION_DAYS * 86400000).toISOString(),
  };
  const key = `OFFICE_SUBSCRIPTION_${office.id}`;
  await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson }, update: { valueJson } });
}

async function coverSources(tx) {
  const testUsers = await tx.user.findMany({ where: { email: { in: ALL.map((d) => d.owner.email) } }, select: { id: true } });
  const rows = await tx.unitImage.findMany({
    where: { url: { startsWith: 'http' }, ...(testUsers.length ? { unit: { project: { ownerId: { notIn: testUsers.map((u) => u.id) } } } } : {}) },
    orderBy: { createdAt: 'desc' }, take: 10,
  });
  return rows;
}

async function ensurePortfolio(tx, def, user, covers) {
  let created = 0;
  const projectCode = `EPH83-${def.key}`;
  let project = await tx.project.findFirst({ where: { ownerId: user.id, code: projectCode } });
  if (!project) {
    project = await tx.project.create({
      data: {
        name: `${def.officeName} Portföyü`, code: projectCode, description: 'EPH-83 kardes ofis test verisi', city: 'Denizli', district: 'Merkezefendi',
        neighborhood: 'Bahçelievler', address: 'Bahçelievler Mah. Denizli', ownerId: user.id, isActive: true,
      },
    });
  }
  for (const l of LISTINGS[def.key]) {
    const inventoryCode = `EPH83-${def.key}-${l.n}`;
    let unit = await tx.unit.findFirst({ where: { projectId: project.id, inventoryCode } });
    const data = {
      type: l.type, status: l.status, roomCount: l.room, netArea: l.net, grossArea: l.gross, area: l.gross, price: l.price, priceCurrency: 'TRY',
      floor: l.floor, totalFloors: l.total, description: `${l.title}. ${l.desc}`, features: l.feats,
      deedOwnerFullName: l.owner, deedOwnerPhone: l.ownerPhone, deedOwnerEmail: `malik${l.n}.${def.key.toLowerCase()}@ornek.test`,
      contactPhone: l.ownerPhone, whatsappPhone: l.ownerPhone, adaNo: String(1000 + l.n), parselNo: String(20 + l.n),
      isPoolVisible: false, approvalStatus: 'TASLAK', sharedWithSisters: l.shared, hiddenFromOffice: false,
    };
    if (unit) unit = await tx.unit.update({ where: { id: unit.id }, data });
    else { unit = await tx.unit.create({ data: { ...data, projectId: project.id, inventoryCode, number: String(l.n) } }); created += 1; }
    if (covers.length && !(await tx.unitImage.findFirst({ where: { unitId: unit.id } }))) {
      const c = covers[(l.n - 1) % covers.length];
      await tx.unitImage.create({
        data: { unitId: unit.id, url: c.url, supabaseUrl: c.supabaseUrl, path: c.path, bucket: c.bucket, originalName: c.originalName, mimetype: c.mimetype, size: c.size, isCover: true, sortOrder: 0 },
      });
    }
  }
  // Proje adresi ilk portfoye gore (konum bilgisi dolu olsun)
  await tx.project.update({ where: { id: project.id }, data: { address: LISTINGS[def.key][0].addr, neighborhood: LISTINGS[def.key][0].hood, district: LISTINGS[def.key][0].district } });
  const total = await tx.unit.count({ where: { projectId: project.id } });
  const shared = await tx.unit.count({ where: { projectId: project.id, sharedWithSisters: true } });
  return { total, shared, created };
}

async function kur(prisma) {
  const password = process.env.EPH_TEST_PASS;
  if (!password) throw new Error('EPH_TEST_PASS ortam degiskeni gerekli (parola koda yazilmaz).');
  const now = new Date();
  const out = await prisma.$transaction(async (tx) => {
    const volarant = await findVolarant(tx);
    const covers = await coverSources(tx);
    if (!covers.length) log('UYARI: kopyalanacak herkese acik UnitImage bulunamadi; portfoyler gorselsiz olusturulacak.');
    const result = {};
    for (const def of ALL) {
      const { user, office } = await ensureOwnerAndOffice(tx, def, password, now);
      await ensureSubscription(tx, office, now);
      const portfolio = await ensurePortfolio(tx, def, user, covers);
      result[def.key] = { user, office, portfolio };
    }
    // Mavi -> Volarant daveti (SisterLinksService.invite ile ayni siralı cift kurali: officeAId < officeBId)
    const mavi = result.MAVI;
    const [a, b] = sorted(mavi.office.id, volarant.id);
    let link = await tx.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
    if (!link) {
      link = await tx.officeSisterLink.create({
        data: { officeAId: a, officeBId: b, status: 'BEKLIYOR', invitedByOfficeId: mavi.office.id, invitedByUserId: mavi.user.id, commissionSplitPct: 50 },
      });
    } else if (link.status !== 'BEKLIYOR' && link.status !== 'AKTIF') {
      link = await tx.officeSisterLink.update({
        where: { id: link.id },
        data: { status: 'BEKLIYOR', invitedByOfficeId: mavi.office.id, invitedByUserId: mavi.user.id, commissionSplitPct: 50, createdAt: now, respondedAt: null, endedAt: null, endedByUserId: null },
      });
    }
    await notify(tx, volarant.ownerUserId, `${EVENT_PREFIX}invite:${link.id}`, {
      type: 'SISTER_INVITE', priority: 'ACIL', title: 'Kardeş ofis daveti', body: `${mavi.office.name} sizi kardeş ofis olmaya davet etti.`,
    });
    return { result, link, volarant };
  }, { timeout: 60000, maxWait: 15000 });

  log('--- EPH-83 kur ozeti ---');
  for (const def of ALL) {
    const r = out.result[def.key];
    log(`${r.office.name}  kod: ${r.office.code}  sahip: ${def.owner.email}  paket: ${PACKAGE_CODE} (${SUBSCRIPTION_DAYS} gun)`);
    log(`  portfoy: ${r.portfolio.total} (paylasilan: ${r.portfolio.shared}, bu calistirmada yeni: ${r.portfolio.created})`);
  }
  log(`Davet: ${out.result.MAVI.office.name} -> ${out.volarant.name}  durum: ${out.link.status}  pay: %${out.link.commissionSplitPct}`);
}

async function pamukkaleKabul(prisma) {
  const out = await prisma.$transaction(async (tx) => {
    const volarant = await findVolarant(tx);
    const owner = await tx.user.findUnique({ where: { email: TEST.pamukkale.owner.email } });
    const office = owner && (await tx.office.findFirst({ where: { name: TEST.pamukkale.officeName, ownerUserId: owner.id } }));
    if (!office) throw new Error('Pamukkale test ofisi yok; once "kur" calistirin.');
    const [a, b] = sorted(office.id, volarant.id);
    let link = await tx.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
    let note = '';
    if (!link || (link.status !== 'BEKLIYOR' && link.status !== 'AKTIF')) {
      // "kur" yalniz Mavi->Volarant davetini olusturur; Volarant->Pamukkale daveti yoksa burada Volarant adina olusturulur.
      const data = { status: 'BEKLIYOR', invitedByOfficeId: volarant.id, invitedByUserId: volarant.ownerUserId, commissionSplitPct: 50, createdAt: new Date(), respondedAt: null, endedAt: null, endedByUserId: null };
      link = link ? await tx.officeSisterLink.update({ where: { id: link.id }, data }) : await tx.officeSisterLink.create({ data: { officeAId: a, officeBId: b, ...data } });
      note = ' (Volarant->Pamukkale daveti yoktu, olusturuldu)';
    }
    if (link.status === 'AKTIF') return { link, note: ' (zaten AKTIF)' };
    if (link.invitedByOfficeId !== volarant.id) throw new Error('Bu bag Volarant tarafindan davet edilmemis; kabul edilmedi.');
    link = await tx.officeSisterLink.update({ where: { id: link.id }, data: { status: 'AKTIF', respondedAt: new Date() } });
    await notify(tx, volarant.ownerUserId, `${EVENT_PREFIX}accept:${link.id}`, {
      type: 'SISTER_INVITE_ACCEPTED', priority: 'ONEMLI', title: 'Kardeş ofis daveti kabul edildi', body: `${office.name} kardeş ofis davetinizi kabul etti.`,
    });
    return { link, note };
  });
  log(`Pamukkale kabul: bag ${out.link.id} durum: ${out.link.status}${out.note}`);
}

async function sil(prisma) {
  const emails = ALL.map((d) => d.owner.email);
  const names = ALL.map((d) => d.officeName);
  const out = await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const userIds = users.map((u) => u.id);
    // Yalniz adi eslesen VE sahibi test kullanicisi olan ofisler
    const offices = await tx.office.findMany({ where: { name: { in: names }, ownerUserId: { in: userIds } }, select: { id: true } });
    const officeIds = offices.map((o) => o.id);
    const count = {};
    count.notifications = (await tx.networkNotification.deleteMany({ where: { OR: [{ eventKey: { startsWith: EVENT_PREFIX } }, { userId: { in: userIds } }] } })).count;
    if (officeIds.length) {
      const reqs = await tx.sisterPrivateInfoRequest.findMany({ where: { OR: [{ ownerOfficeId: { in: officeIds } }, { requesterOfficeId: { in: officeIds } }] }, select: { id: true } });
      count.accessLogs = (await tx.sisterPrivateInfoAccessLog.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } })).count;
      count.requests = (await tx.sisterPrivateInfoRequest.deleteMany({ where: { id: { in: reqs.map((r) => r.id) } } })).count;
      count.links = (await tx.officeSisterLink.deleteMany({ where: { OR: [{ officeAId: { in: officeIds } }, { officeBId: { in: officeIds } }] } })).count;
      count.settings = (await tx.systemSetting.deleteMany({
        where: { key: { in: officeIds.flatMap((id) => [`OFFICE_SUBSCRIPTION_${id}`, `EPH_OFFICE_SPENDING_${id}`]) } },
      })).count;
    }
    if (userIds.length) {
      // Birimler ve gorseller proje silinince cascade ile gider.
      count.projects = (await tx.project.deleteMany({ where: { ownerId: { in: userIds } } })).count;
      await tx.user.updateMany({ where: { id: { in: userIds } }, data: { officeId: null } });
    }
    if (officeIds.length) count.offices = (await tx.office.deleteMany({ where: { id: { in: officeIds } } })).count;
    if (userIds.length) {
      count.logs = (await tx.adminActionLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { targetUserId: { in: userIds } }] } })).count;
      count.users = (await tx.user.deleteMany({ where: { id: { in: userIds } } })).count; // yetkinlikler cascade
    }
    return count;
  }, { timeout: 60000, maxWait: 15000 });
  log('--- EPH-83 sil ozeti ---');
  log(JSON.stringify(out));
}

(async () => {
  const command = process.argv[2];
  const commands = { kur, 'pamukkale-kabul': pamukkaleKabul, sil };
  if (!commands[command]) {
    console.error('Kullanim: node scripts/eph83_test_ofisleri.cjs <kur|pamukkale-kabul|sil>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    await commands[command](prisma);
  } catch (error) {
    console.error('HATA:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
