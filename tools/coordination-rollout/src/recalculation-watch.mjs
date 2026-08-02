import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { appendJsonLine } from './report.mjs';

requireConfig();

async function handleAlert(alert) {
  if (!config.autoRecalculate) return { status: 'observed' };
  if (!config.allowMutations) return { status: 'blocked', reason: 'ALLOW_MUTATIONS=false' };

  if (alert.action === 'RECALCULATE_CRM_INTEREST') {
    return apiRequest(`/coordination/crm/interests/${alert.entityId}/recalculate`, { method: 'POST' });
  }
  if (alert.action === 'RECALCULATE_REQUEST_PORTFOLIOS') {
    return apiRequest(`/coordination/requests/${alert.entityId}/recalculate-portfolio-matches`, { method: 'POST' });
  }
  return { status: 'manual-review', action: alert.action };
}

async function tick() {
  const result = await apiRequest('/coordination/alerts');
  const alerts = Array.isArray(result.data?.alerts) ? result.data.alerts : [];
  const outcomes = [];
  for (const alert of alerts) {
    try {
      outcomes.push({ alert, outcome: await handleAlert(alert) });
    } catch (error) {
      outcomes.push({ alert, outcome: { status: 'error', message: error.message } });
    }
  }
  appendJsonLine('recalculation-watch', {
    checkedAt: new Date().toISOString(),
    autoRecalculate: config.autoRecalculate,
    mutationsEnabled: config.allowMutations,
    outcomes,
  });
  console.log(`${alerts.length} uyarı işlendi. Otomatik yeniden hesaplama: ${config.autoRecalculate ? 'açık' : 'kapalı'}`);
}

await tick();
setInterval(() => tick().catch((error) => console.error(error.message)), config.pollIntervalMs);
