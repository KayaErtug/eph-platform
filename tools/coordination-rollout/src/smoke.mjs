import { config, requireConfig } from './config.mjs';
import { apiRequest, assertNoPersonalData } from './http.mjs';
import { printResult, writeReport } from './report.mjs';

requireConfig();
const results = [];

async function run(label, fn, { mutation = false } = {}) {
  if (mutation && !config.allowMutations) {
    results.push({ label, status: 'SKIP', reason: 'ALLOW_MUTATIONS=false' });
    printResult(label, 'SKIP', 'ALLOW_MUTATIONS=false');
    return null;
  }

  try {
    const value = await fn();
    results.push({ label, status: 'PASS', value });
    printResult(label, 'PASS', value?.elapsedMs ? `${value.elapsedMs} ms` : '');
    return value;
  } catch (error) {
    results.push({ label, status: 'FAIL', error: error.message, details: error.details });
    printResult(label, 'FAIL', error.message);
    return null;
  }
}

await run('Koordinasyon uyarıları listeleniyor', () => apiRequest('/coordination/alerts'));

if (config.ids.interestId) {
  await run('CRM talebinin Talep Merkezi bağlantı durumu okunuyor', () =>
    apiRequest(`/coordination/crm/interests/${config.ids.interestId}/request-status`),
  );

  await run('CRM talebi Havuz ile yeniden eşleştiriliyor', () =>
    apiRequest(`/coordination/crm/interests/${config.ids.interestId}/recalculate`, { method: 'POST' }),
    { mutation: true },
  );

  const published = await run('CRM talebi anonim olarak Talep Merkezi’nde yayınlanıyor', () =>
    apiRequest(`/coordination/crm/interests/${config.ids.interestId}/publish-request`, {
      method: 'POST',
      body: { createFollowUpTask: true },
    }),
    { mutation: true },
  );
  if (published) assertNoPersonalData(published.data, 'CRM → Talep Merkezi yanıtı');
}

if (config.ids.postId) {
  await run('Talep Merkezi kaydının CRM bağlantı durumu okunuyor', () =>
    apiRequest(`/coordination/requests/${config.ids.postId}/crm-status`),
  );

  await run('Talep Merkezi kaydı kendi portföyleriyle eşleştiriliyor', () =>
    apiRequest(`/coordination/requests/${config.ids.postId}/recalculate-portfolio-matches`, { method: 'POST' }),
    { mutation: true },
  );

  const opportunity = await run('Talep Merkezi kaydı özel CRM fırsatına dönüştürülüyor', () =>
    apiRequest(`/coordination/requests/${config.ids.postId}/create-crm-opportunity`, {
      method: 'POST',
      body: { createFollowUpTask: true },
    }),
    { mutation: true },
  );
  if (opportunity) assertNoPersonalData(opportunity.data, 'Talep Merkezi → CRM yanıtı');
}

if (config.ids.customerId && config.ids.unitId) {
  await run('Havuz portföyü CRM müşterisine bağlanıyor', () =>
    apiRequest(`/coordination/crm/customers/${config.ids.customerId}/pool-units/${config.ids.unitId}/link`, {
      method: 'POST',
      body: {
        ...(config.ids.interestId ? { customerInterestId: config.ids.interestId } : {}),
        createFollowUpTask: true,
        note: 'Geçici test ortamı kabul testi',
      },
    }),
    { mutation: true },
  );
}

const reportPath = writeReport('smoke', {
  createdAt: new Date().toISOString(),
  baseUrl: config.baseUrl,
  mutationsEnabled: config.allowMutations,
  results,
});
console.log(`Rapor: ${reportPath}`);
if (results.some((item) => item.status === 'FAIL')) process.exitCode = 1;
