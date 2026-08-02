import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { writeReport } from './report.mjs';

requireConfig();
const total = config.loadRequests;
const concurrency = Math.min(config.loadConcurrency, total);
const durations = [];
let passed = 0;
let failed = 0;
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= total) return;
    try {
      const result = await apiRequest('/coordination/alerts');
      durations.push(result.elapsedMs);
      passed += 1;
    } catch {
      failed += 1;
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const totalMs = performance.now() - startedAt;
durations.sort((a, b) => a - b);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] ?? null;
const summary = {
  createdAt: new Date().toISOString(),
  endpoint: '/coordination/alerts',
  requests: total,
  concurrency,
  passed,
  failed,
  totalMs: Math.round(totalMs * 100) / 100,
  requestsPerSecond: Math.round((passed / (totalMs / 1000)) * 100) / 100,
  latencyMs: {
    min: durations[0] ?? null,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: durations.at(-1) ?? null,
  },
};
console.log(JSON.stringify(summary, null, 2));
console.log(`Rapor: ${writeReport('load', summary)}`);
if (failed > 0) process.exitCode = 1;
