import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath = '.env') {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) return;

  const text = fs.readFileSync(resolved, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(process.env.ENV_FILE || '.env');

function bool(name, fallback = false) {
  const value = String(process.env[name] ?? fallback).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function number(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export const config = Object.freeze({
  baseUrl: cleanUrl(process.env.EPH_BASE_URL),
  token: String(process.env.EPH_TOKEN || '').trim(),
  secondaryToken: String(process.env.EPH_SECONDARY_TOKEN || '').trim(),
  allowMutations: bool('ALLOW_MUTATIONS'),
  autoRecalculate: bool('AUTO_RECALCULATE'),
  requestTimeoutMs: number('REQUEST_TIMEOUT_MS', 15000),
  pollIntervalMs: number('POLL_INTERVAL_MS', 60000),
  loadConcurrency: number('LOAD_CONCURRENCY', 10),
  loadRequests: number('LOAD_REQUESTS', 100),
  reportDir: path.resolve(process.cwd(), process.env.REPORT_DIR || './reports'),
  ids: Object.freeze({
    interestId: String(process.env.TEST_INTEREST_ID || '').trim(),
    postId: String(process.env.TEST_POST_ID || '').trim(),
    customerId: String(process.env.TEST_CUSTOMER_ID || '').trim(),
    unitId: String(process.env.TEST_UNIT_ID || '').trim(),
    foreignInterestId: String(process.env.FOREIGN_INTEREST_ID || '').trim(),
    foreignPostId: String(process.env.FOREIGN_POST_ID || '').trim(),
    foreignCustomerId: String(process.env.FOREIGN_CUSTOMER_ID || '').trim(),
    foreignUnitId: String(process.env.FOREIGN_UNIT_ID || '').trim(),
  }),
});

export function requireConfig(fields = []) {
  const missing = [];
  if (!config.baseUrl) missing.push('EPH_BASE_URL');
  if (!config.token) missing.push('EPH_TOKEN');

  for (const field of fields) {
    if (!config.ids[field]) missing.push(field);
  }

  if (missing.length) {
    throw new Error(`Eksik yapılandırma: ${missing.join(', ')}`);
  }
}
