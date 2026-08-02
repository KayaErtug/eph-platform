import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { appendJsonLine } from './report.mjs';

requireConfig();
if (!config.allowMutations) {
  throw new Error('Eşleşme yeniden hesaplama endpointleri bildirim yazabildiği için ALLOW_MUTATIONS=true olmalıdır.');
}

const snapshots = [];
if (config.ids.interestId) {
  const result = await apiRequest(`/coordination/crm/interests/${config.ids.interestId}/recalculate`, { method: 'POST' });
  snapshots.push({
    kind: 'CRM_INTEREST_POOL',
    entityId: config.ids.interestId,
    capturedAt: new Date().toISOString(),
    warning: result.data?.warning,
    matches: result.data?.matches || [],
  });
}
if (config.ids.postId) {
  const result = await apiRequest(`/coordination/requests/${config.ids.postId}/recalculate-portfolio-matches`, { method: 'POST' });
  snapshots.push({
    kind: 'NETWORK_POST_PORTFOLIO',
    entityId: config.ids.postId,
    capturedAt: new Date().toISOString(),
    warning: result.data?.warning,
    matches: result.data?.matches || [],
  });
}
if (!snapshots.length) throw new Error('TEST_INTEREST_ID veya TEST_POST_ID tanımlanmalıdır.');
for (const snapshot of snapshots) appendJsonLine('match-history', snapshot);
console.log(`${snapshots.length} eşleşme geçmişi kaydı yazıldı.`);
