const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ProjectSalesLaunchService } = require('../backend/dist/src/project-sales/project-sales-launch.service');
const { Role } = require('../backend/node_modules/@prisma/client');
const settings = new Map();
let calls = 0;
let fail = false;
const image = { url: 'https://example.test/project.jpg', supabaseUrl: null, isCover: true };
const fixture = {
  id: 'project-fixture', name: 'Örnek Yaşam Projesi', city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Örnek Mahallesi',
  ownerId: 'owner-fixture', setupStatus: 'TAMAMLANDI', lifecycleStage: 'UNDER_CONSTRUCTION', completionPercent: 65,
  defaultDeliveryDate: new Date('2027-06-01T00:00:00Z'), latitude: 37.77, longitude: 29.08, updatedAt: new Date(),
  address: 'GİZLİ AÇIK ADRES', adaNo: 'GİZLİ ADA', parselNo: 'GİZLİ PARSEL', authorizedContact: { phone: 'GİZLİ YETKİLİ' },
  blocks: [{ code: 'A', name: 'A Blok', floors: [{ level: 4 }] }],
  spaces: [{ spaceType: 'HAVUZ', customTypeName: null }],
  mediaPackages: [{ id: 'general', type: 'PROJECT_GENERAL', assets: [image, { ...image, url: 'https://example.test/second.jpg' }], _count: { assets: 2, units: 0 } }],
  units: [
    { id: 'unit-1', type: 'DAIRE', roomCount: '2+1', status: 'SATILIK', price: 5000000, priceCurrency: 'TRY', netArea: 90, grossArea: 110, features: ['OTOPARK'], number: 'GİZLİ KAPI', floorLabel: 'GİZLİ KAT', images: [image], mediaPackage: null, block: { code: 'A' } },
    { id: 'unit-2', type: 'DAIRE', roomCount: '2+1', status: 'REZERVE', price: 0, priceCurrency: 'USD', netArea: 95, grossArea: 115, features: [], images: [], mediaPackage: null, block: { code: 'A' } },
    { id: 'unit-3', type: 'DAIRE', roomCount: '2+1', status: 'SATILIK', price: 150000, priceCurrency: 'USD', netArea: 100, grossArea: 120, features: [], images: [], mediaPackage: null, block: { code: 'A' } },
  ],
};
const db = {
  project: { findUnique: async () => structuredClone(fixture) },
  user: { findUnique: async () => ({ firstName: 'Paylaşan', lastName: 'Danışman', phone: '05551112233', profileImageUrl: null, office: { id: 'office-1', name: 'Örnek Ofis', isActive: true }, ownedOffices: [] }) },
  systemSetting: {
    findUnique: async ({ where }) => settings.get(where.key) || null,
    upsert: async ({ where, create, update }) => { const row = settings.has(where.key) ? { ...settings.get(where.key), ...update } : create; settings.set(where.key, row); return row; },
  },
};
const ai = { createResponse: async request => {
  calls++;
  if (fail) throw new Error('synthetic AI failure');
  const pool = JSON.parse(request.input[0].content);
  assert(!JSON.stringify(pool).includes('GİZLİ'));
  return { output_text: JSON.stringify(Object.fromEntries(Object.entries(pool).map(([key, values]) => [key, [[0], values.slice(1).map((_, i) => i + 1)]]))) };
} };
const service = new ProjectSalesLaunchService(db, { filterPublicUnits: async units => units }, undefined, ai);
// Yalnız sentetik token; gerçek ortam sırrı veya canlı oturum kullanılmaz.
service.presentationSecret = () => 'eph23-local-fixture-only';
const results = [];
async function test(name, run) { await run(); results.push(`PASS ${name}`); }
(async () => {
  await test('Önizleme ve public açılış AI çağırmaz', async () => { await service.getLaunchCenter(fixture.id, fixture.ownerId, Role.MUTEAHHIT); assert.equal(calls, 0); });
  let share;
  await test('Yetkili link ilk üretimde AI, tekrarında DB önbelleği kullanır', async () => { share = await service.createPresentationShareLink(fixture.id, fixture.ownerId, Role.MUTEAHHIT); await service.createPresentationShareLink(fixture.id, fixture.ownerId, Role.MUTEAHHIT); assert.equal(calls, 1); });
  await test('Public JSON kapı/kat/ada/parsel/özel yetkili ve kontrol uyarısı içermez', async () => { const response = await service.getPresentationByToken(share.token); assert(!JSON.stringify(response).includes('GİZLİ')); assert(!('publishReadiness' in response)); assert.equal(response.presentation.presenter.name, 'Paylaşan Danışman'); assert.equal(response.presentation.presenter.office.name, 'Örnek Ofis'); assert.equal(calls, 1); fs.writeFileSync(__dirname + '/paket/presentation-fixture.json', JSON.stringify(response, null, 2)); });
  await test('Farklı para birimleri ayrı aralık, sıfır fiyat ve stok doğru', async () => { const type = service.buildPresentationPreview(fixture, service.getProjectStats(fixture)).unitTypes[0]; assert.equal(type.count, 3); assert.equal(type.available, 2); assert.equal(type.netArea.min, 90); assert.equal(type.netArea.max, 100); assert.equal(type.prices.length, 2); assert(type.hasUnpriced); });
  await test('Proje değişince yalnız link üretimi önbelleği yeniler', async () => { fixture.completionPercent = 70; const view = await service.getPresentationByToken(share.token); assert(view.presentation.copy.project.join(' ').includes('%70')); assert.equal(calls, 1); await service.createPresentationShareLink(fixture.id, fixture.ownerId, Role.MUTEAHHIT); assert.equal(calls, 2); });
  await test('AI hatasında şablon açılır ve hata sonucu da önbelleklenir', async () => { fixture.completionPercent = 71; fail = true; await service.createPresentationShareLink(fixture.id, fixture.ownerId, Role.MUTEAHHIT); await service.createPresentationShareLink(fixture.id, fixture.ownerId, Role.MUTEAHHIT); assert.equal(calls, 3); assert.equal(settings.get('EPH23_PRESENTATION_project-fixture').valueJson.source, 'template'); fail = false; });
  await test('Eski token proje sahibinin iletişimini ifşa etmez', async () => { const payload = `${fixture.id}.${Date.now() + 60000}.nonce`; const token = Buffer.from(`${payload}.${service.signPayload(payload)}`).toString('base64url'); const response = await service.getPresentationByToken(token); assert.equal(response.presentation.presenter, null); });
  await test('İmzası değiştirilmiş ve süresi dolmuş token reddedilir', async () => { await assert.rejects(service.getPresentationByToken(share.token + 'wrong')); const payload = `${fixture.id}.1.nonce.owner-fixture`; await assert.rejects(service.getPresentationByToken(Buffer.from(`${payload}.${service.signPayload(payload)}`).toString('base64url'))); });
  await test('Ofissiz paylaşımda yalnız kişi bilgisi görünür', async () => { db.user.findUnique = async () => ({ firstName: 'Bireysel', lastName: 'Danışman', phone: '05551112233', profileImageUrl: null, office: null, ownedOffices: [] }); assert.equal((await service.getPresentationByToken(share.token)).presentation.presenter.office, null); });
  await test('Hedefli stok filtresi public yanıta uygulanır', async () => { service.audience.filterPublicUnits = async units => units.filter(unit => unit.id === 'unit-1'); const response = await service.getPresentationByToken(share.token); assert.equal(response.presentation.metrics.totalUnits, 1); assert.equal(response.presentation.unitTypes[0].count, 1); });
  await test('DB önbellek hatası sunumu bozmaz', async () => { db.systemSetting.findUnique = async () => { throw new Error('synthetic cache failure'); }; const response = await service.getPresentationByToken(share.token); assert(response.presentation.copy.location.length >= 2); });
  console.log(results.join('\n') + `\n${results.length}/${results.length} PASS; canlı DB/API çağrısı yok.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
