import fs from 'node:fs';
import path from 'node:path';
import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { appendJsonLine, ensureReportDir } from './report.mjs';

requireConfig();
ensureReportDir();
const statePath = path.join(config.reportDir, 'monitor-state.json');
let state = { seen: {} };
if (fs.existsSync(statePath)) {
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { state = { seen: {} }; }
}

async function tick() {
  const result = await apiRequest('/coordination/alerts');
  const alerts = Array.isArray(result.data?.alerts) ? result.data.alerts : [];
  const fresh = [];
  for (const alert of alerts) {
    const key = `${alert.type}:${alert.entityId}:${alert.updatedAt}`;
    if (state.seen[key]) continue;
    state.seen[key] = new Date().toISOString();
    fresh.push(alert);
  }

  const snapshot = {
    checkedAt: new Date().toISOString(),
    elapsedMs: result.elapsedMs,
    alertCount: alerts.length,
    newAlertCount: fresh.length,
    alerts: fresh,
  };
  appendJsonLine('monitor', snapshot);
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  console.log(`[${snapshot.checkedAt}] ${alerts.length} uyarı, ${fresh.length} yeni`);
}

await tick();
setInterval(() => tick().catch((error) => console.error(error.message)), config.pollIntervalMs);
