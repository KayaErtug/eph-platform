import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

export function ensureReportDir() {
  fs.mkdirSync(config.reportDir, { recursive: true });
  return config.reportDir;
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function writeReport(name, payload) {
  const directory = ensureReportDir();
  const filePath = path.join(directory, `${name}-${timestampSlug()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

export function appendJsonLine(name, payload) {
  const directory = ensureReportDir();
  const filePath = path.join(directory, `${name}.jsonl`);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
  return filePath;
}

export function printResult(label, status, detail = '') {
  const icon = status === 'PASS' ? '✓' : status === 'SKIP' ? '–' : '✗';
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}
