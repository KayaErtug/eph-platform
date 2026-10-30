'use strict';
// EPH-55: Regresyon setini GERÇEK Lina koduna bağlar (derlenmiş dist/).
// Gerçek: LinaDraftFlowService, LinaCrmExtractionService, LinaLocationValidatorService, LinaMaskingService,
//         LinaScopeService, EphLocationCatalogService (Türkiye API), OpenAI.
// Taklit (bellek içi): Prisma tabloları ve CrmService. Canlı DB'ye hiçbir yazma yapılmaz.
// Çalıştırma: LINA_REGRESSION_LIVE=1 LINA_REGRESSION_ADAPTER=test/lina-regression/backend-adapter.cjs node test/lina-regression/regression.test.cjs
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
require(path.join(root, 'node_modules', 'dotenv')).config({ path: path.join(root, '.env'), quiet: true });
process.env.LINA_MASK_KEY = process.env.LINA_MASK_KEY || 'eph-regression-anahtar';
const dist = (p) => require(path.join(root, 'dist', 'src', 'lina', p));

const { LinaDraftFlowService } = dist('draft/lina-draft-flow.service');
const { LinaCrmExtractionService } = dist('draft/lina-crm-extraction.service');
const { LinaLocationValidatorService } = dist('draft/lina-location-validator.service');
const { LinaMaskingService } = dist('draft/lina-masking.service');
const { missingKeys, guardWriteClaims } = dist('draft/lina-draft-logic');
const { LinaScopeService } = dist('lina-scope.service');
const { LinaKvkkService } = dist('lina-kvkk.service');
const { LinaOpenAiClientService } = dist('openai-tools/lina-openai-client.service');
const { LinaModelSettingsService } = dist('lina-model-settings.service');
const { LinaAccessService } = dist('lina-access.service');
const { EphLocationCatalogService } = dist('catalog/eph-location-catalog.service');
const { LinaGeoService } = dist('geo/lina-geo.service');

// ---- OpenAI çağrı/maliyet sayacı (yalnız başarılı sağlayıcı yanıtları) ----
const stats = globalThis.__linaStats || (globalThis.__linaStats = { calls: 0, byModel: {}, current: 0 });
if (!globalThis.__linaFetchWrapped) {
  globalThis.__linaFetchWrapped = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const res = await realFetch(url, init);
    if (String(url).includes('api.openai.com') && res.ok) {
      stats.calls++; stats.current++;
      try {
        const usage = (await res.clone().json()).usage || {};
        const model = JSON.parse(init.body).model;
        const m = (stats.byModel[model] ||= { calls: 0, input: 0, output: 0 });
        m.calls++; m.input += usage.input_tokens || 0; m.output += usage.output_tokens || 0;
      } catch { /* sayaç hatası testi bozmaz */ }
    }
    return res;
  };
  process.on('exit', () => {
    const price = { 'gpt-4.1': [2, 8], 'gpt-4.1-mini': [0.4, 1.6] }; // USD / 1M token (liste fiyatı, tahmini)
    let usd = 0;
    for (const [model, m] of Object.entries(stats.byModel)) {
      const [i, o] = price[model] || [2, 8];
      usd += (m.input * i + m.output * o) / 1e6;
    }
    console.log(`\n[LINA-OPENAI] toplam çağrı=${stats.calls} modeller=${JSON.stringify(stats.byModel)} tahmini maliyet≈$${usd.toFixed(3)}`);
  });
}

// ---- Bellek içi Prisma ----
function memoryPrisma() {
  const tables = { linaTaslak: [], linaKonusma: [], linaDenetim: [] };
  let n = 0;
  const match = (row, where = {}) => Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'gt' in v) return row[k] > v.gt;
    return row[k] === v;
  });
  const table = (rows, extra = {}) => ({
    findFirst: async ({ where }) => [...rows].reverse().find((r) => match(r, where)) ?? null,
    create: async ({ data }) => { const r = { id: `r${++n}`, sonSonuc: null, ...data }; rows.push(r); return r; },
    update: async ({ where, data }) => { const r = rows.find((x) => x.id === where.id); Object.assign(r, data); return r; },
    updateMany: async ({ where, data }) => { const hit = rows.filter((r) => match(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    ...extra,
  });
  return { tables, client: { linaTaslak: table(tables.linaTaslak), linaKonusma: table(tables.linaKonusma), linaDenetim: table(tables.linaDenetim), systemSetting: { findUnique: async () => null } } };
}

// ---- Bellek içi CRM (CrmService yerine) ----
function memoryCrm() {
  const customers = [];
  let n = 0;
  const eq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  return {
    customers,
    service: {
      async createCustomer(ownerId, data) {
        const c = { id: `c${++n}`, ownerId, firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, roles: data.roles || [], interests: [] };
        if (data.interestAreas !== undefined) c.interests.push({ id: `i${++n}`, ...data, areas: data.interestAreas });
        customers.push(c);
        return c;
      },
      async addCustomerInterest(customerId, _u, _r, data) {
        const c = customers.find((x) => x.id === customerId);
        const i = { id: `i${++n}`, ...data, areas: [{ city: data.city, district: data.district, neighborhood: data.neighborhood }] };
        c.interests.push(i);
        return i;
      },
    },
    findDuplicate: ({ where }) => customers.find((c) => c.ownerId === where.ownerId && where.OR.some((cond) =>
      cond.phone ? c.phone && String(c.phone).replace(/\D/g, '').includes(cond.phone.contains)
        : eq(c.firstName, cond.firstName.equals) && eq(c.lastName, cond.lastName.equals))) || null,
  };
}

const empty = () => ({ adSoyad: null, rol: null, amac: null, il: null, ilce: null, mahalle: [], butce: { min: null, max: null, para: 'TRY' }, m2: { min: null, max: null }, oda: { min: null, tam: [] }, tip: null, ozellikler: [], telefon: null });
const cap = (t) => { const s = String(t).toLowerCase().replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

// Taslak alanları -> senaryo sözleşmesi
function toDraft(a) {
  if (!a) return empty();
  return {
    adSoyad: a.adSoyad ?? null,
    rol: a.rol ? { 'alıcı': 'ALICI', 'satıcı': 'SATICI', 'kiracı': 'KIRACI', 'kiraya veren': 'MAL_SAHIBI' }[a.rol] : null,
    amac: a.amac ?? null, il: a.il ?? null, ilce: a.ilce ?? null, mahalle: [...(a.mahalleler || [])],
    butce: { min: a.butceMin ?? null, max: a.butceMax ?? null, para: 'TRY' },
    m2: { min: a.m2Min ?? null, max: a.m2Max ?? null },
    oda: a.odaSayisi ? (a.odaEnAz ? { min: a.odaSayisi, tam: [] } : { min: null, tam: [a.odaSayisi] }) : { min: null, tam: [] },
    tip: a.mulkTipi ? cap(a.mulkTipi) : null, ozellikler: [...(a.ozellikler || [])], telefon: a.telefon ?? null,
  };
}

// Kalıcı Customer + CustomerInterest alanlarından normalize kayıt (ham notes'tan ayrıştırma yok)
function toSaved(c) {
  const i = c.interests[c.interests.length - 1] || {};
  const areas = (i.areas || []).filter((x) => x && x.city);
  const rooms = i.roomCounts || [];
  return {
    adSoyad: `${c.firstName} ${c.lastName}`.trim(),
    rol: c.roles[0] ?? null,
    amac: (i.interestStatuses || i.statuses || [])[0] ?? null,
    il: areas[0]?.city ?? null, ilce: areas[0]?.district ?? null,
    mahalle: areas.map((x) => x.neighborhood).filter(Boolean),
    butce: { min: i.minBudget ?? null, max: i.maxBudget ?? null, para: 'TRY' },
    m2: { min: i.minArea ?? null, max: i.maxArea ?? null },
    oda: rooms.length > 1 ? { min: rooms[0], tam: [] } : { min: null, tam: rooms.slice() },
    tip: (i.propertyTypes || [])[0] ? cap(i.propertyTypes[0]) : null,
    ozellikler: [...(i.features || [])], telefon: c.phone ?? null,
  };
}

async function createSession({ live, fixtures }) {
  if (!live) throw new Error('Bu adapter gerçek OpenAI kullanır; LINA_REGRESSION_LIVE=1 gerekli.');
  const db = memoryPrisma();
  const crm = memoryCrm();
  db.client.customer = { findFirst: async (args) => crm.findDuplicate(args) };
  const user = { id: 'regresyon-kullanici', role: 'EMLAKCI' };

  const build = () => {
    const masking = new LinaMaskingService();
    const realMask = masking.mask.bind(masking);
    masking.mask = (text, state) => { const out = realMask(text, state); (build.maskCalls ||= []).push(out); return out; };
    const modelSettings = new LinaModelSettingsService(db.client);
    const openAi = new LinaOpenAiClientService(modelSettings);
    const geo = new LinaGeoService();
    const catalog = new EphLocationCatalogService(geo, {});
    const flow = new LinaDraftFlowService(
      db.client, masking, new LinaCrmExtractionService(openAi, modelSettings),
      new LinaLocationValidatorService(catalog, geo), new LinaAccessService(), crm.service);
    return { flow, scope: new LinaScopeService(openAi, new LinaKvkkService()) };
  };
  let svc = build();
  let last = empty();
  let turn = 0;

  const activeRow = () => [...db.tables.linaTaslak].reverse().find((r) => r.tur === 'CRM_MUSTERI' && ['AKTIF', 'ONAY_BEKLIYOR'].includes(r.durum)) || null;

  return {
    async send(message) {
      turn++;
      build.maskCalls = [];
      stats.current = 0;
      const writesBefore = crm.customers.reduce((s, c) => s + c.interests.length, 0) + crm.customers.length;
      const before = activeRow();
      if (before) last = toDraft(before.alanlar);

      const ctx = await svc.flow.getScopeContext(user.id);
      const scope = await svc.scope.classify({ message }, ctx);
      let result = { handled: false };
      let kapsamIci = scope !== 'OUT_OF_SCOPE';
      if (kapsamIci) result = await svc.flow.handle({ message }, user, 'crm');

      const row = activeRow();
      const draft = row ? toDraft(row.alanlar) : last;
      if (row) last = draft;
      const writesAfter = crm.customers.reduce((s, c) => s + c.interests.length, 0) + crm.customers.length;
      let reply = result.handled ? result.message : kapsamIci ? 'Lina: taslağı etkilemeyen genel mesaj.' : 'Bu soru EPH kapsamı dışında.';
      if (fixtures.llmReply) reply = guardWriteClaims(fixtures.llmReply); // sağlayıcı çıktısı yazma korumasından önce enjekte edilir
      const firstMask = build.maskCalls[0];
      const keys = row ? missingKeys(row.alanlar) : result.data?.eksikKodlar || [];
      const ids = (rows) => rows.map((_, i) => i + 1);
      return {
        draft, onayIstenmeli: Boolean(result.handled && result.requiresConfirmation), kapsamIci,
        kayitSayisi: crm.customers.length, aktif: Boolean(row), missing: keys.filter((k) => k !== 'talep'), reply, status: 200,
        maskedMessage: firstMask ? firstMask.text : message, tokens: firstMask ? { ...firstMask.state.esleme } : {},
        clarifyLocation: Boolean(result.data?.konumSorusu), savedRecords: crm.customers.map(toSaved),
        conversationTurns: ids(db.tables.linaKonusma), auditTurns: ids(db.tables.linaDenetim),
        writeAttempts: writesAfter - writesBefore, llmMode: 'live', llmCalls: stats.current,
      };
    },
    async restart() { svc = build(); },
    async close() { /* bellek içi; paylaşılan kaynak yok */ },
  };
}
module.exports = { createSession };
