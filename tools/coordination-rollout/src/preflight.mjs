import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { printResult, writeReport } from './report.mjs';

const results = [];

async function check(label, fn) {
  try {
    const value = await fn();
    results.push({ label, status: 'PASS', value });
    printResult(label, 'PASS', value?.elapsedMs ? `${value.elapsedMs} ms` : '');
  } catch (error) {
    results.push({ label, status: 'FAIL', error: error.message, details: error.details });
    printResult(label, 'FAIL', error.message);
  }
}

requireConfig();
console.log(`EPH koordinasyon ön kontrolü: ${config.baseUrl}`);
await check('JWT ile koordinasyon uyarıları okunabiliyor', () => apiRequest('/coordination/alerts'));
await check('Kimliksiz erişim reddediliyor', () => apiRequest('/coordination/alerts', { token: '', expectedStatus: [401, 403] }));

const reportPath = writeReport('preflight', {
  createdAt: new Date().toISOString(),
  baseUrl: config.baseUrl,
  results,
});

console.log(`Rapor: ${reportPath}`);
if (results.some((item) => item.status === 'FAIL')) process.exitCode = 1;
