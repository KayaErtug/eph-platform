'use strict';

// Yeni Lina için test bridge sözleşmesi; üretimde var olduğu iddia edilmez.
async function createSession({ live, fixtures }) {
  if (!live) throw new Error('HTTP adapter yalnız LINA_REGRESSION_LIVE=1 ile kullanılabilir.');
  const endpoint = process.env.LINA_REGRESSION_URL;
  if (!endpoint) throw new Error('Canlı mod için LINA_REGRESSION_URL (izole test bridge URL) gerekli.');
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Test bridge HTTP(S) olmalı.');
  async function request(operation, payload = {}) {
    const response = await fetch(url, {
      method: 'POST', signal: AbortSignal.timeout(90000),
      headers: { 'Content-Type': 'application/json', ...(process.env.LINA_REGRESSION_TOKEN
        ? { Authorization: `Bearer ${process.env.LINA_REGRESSION_TOKEN}` } : {}) },
      body: JSON.stringify({ operation, ...payload }),
    });
    if (!response.ok) throw new Error(`Test bridge ${operation}: HTTP ${response.status}`);
    return response.json();
  }
  const { sessionId } = await request('start', { live: true, fixtures });
  if (!sessionId || typeof sessionId !== 'string') throw new Error('Bridge geçerli sessionId döndürmedi.');
  return {
    send: message => request('send', { sessionId, message }),
    restart: () => request('restart', { sessionId }),
    close: () => request('close', { sessionId }),
  };
}
module.exports = { createSession };
