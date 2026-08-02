import { config, requireConfig } from './config.mjs';
import { apiRequest, assertNoPersonalData } from './http.mjs';
import { printResult, writeReport } from './report.mjs';

requireConfig();
const results = [];

async function verify(label, fn) {
  try {
    const value = await fn();
    results.push({ label, status: 'PASS', value });
    printResult(label, 'PASS');
  } catch (error) {
    results.push({ label, status: 'FAIL', error: error.message, details: error.details });
    printResult(label, 'FAIL', error.message);
  }
}

await verify('Kimliksiz koordinasyon erişimi reddediliyor', () =>
  apiRequest('/coordination/alerts', { token: '', expectedStatus: [401, 403] }),
);

if (config.ids.foreignInterestId) {
  await verify('Başka kullanıcının CRM talebi yayınlanamıyor', () =>
    apiRequest(`/coordination/crm/interests/${config.ids.foreignInterestId}/publish-request`, {
      method: 'POST',
      body: {},
      expectedStatus: [403, 404],
    }),
  );
}

if (config.ids.foreignCustomerId && config.ids.foreignUnitId) {
  await verify('Başka kullanıcının CRM müşterisine portföy bağlanamıyor', () =>
    apiRequest(`/coordination/crm/customers/${config.ids.foreignCustomerId}/pool-units/${config.ids.foreignUnitId}/link`, {
      method: 'POST',
      body: {},
      expectedStatus: [403, 404],
    }),
  );
}

if (config.ids.interestId && config.allowMutations) {
  await verify('CRM → Talep Merkezi yanıtında telefon/e-posta alanı bulunmuyor', async () => {
    const result = await apiRequest(`/coordination/crm/interests/${config.ids.interestId}/publish-request`, {
      method: 'POST',
      body: {},
    });
    assertNoPersonalData(result.data);
    return { checked: true };
  });
}

if (config.secondaryToken && config.ids.interestId) {
  await verify('İkinci kullanıcı birinci kullanıcının CRM talebini tarayamıyor', () =>
    apiRequest(`/coordination/crm/interests/${config.ids.interestId}/recalculate`, {
      token: config.secondaryToken,
      method: 'POST',
      expectedStatus: [403, 404],
    }),
  );
}

const reportPath = writeReport('security', {
  createdAt: new Date().toISOString(),
  baseUrl: config.baseUrl,
  results,
});
console.log(`Rapor: ${reportPath}`);
if (results.some((item) => item.status === 'FAIL')) process.exitCode = 1;
