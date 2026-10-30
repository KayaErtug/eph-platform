'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { scenarios } = require('./scenarios.cjs');
const live = process.env.LINA_REGRESSION_LIVE === '1';
// Mock modda yanlışlıkla sağlayıcıya/DB'ye ağ erişimi bile başarısız olur.
if (!live) {
  const blocked = () => { throw new Error('Lina mock modunda ağ erişimi yasak.'); };
  globalThis.fetch = blocked;
  require('node:net').Socket.prototype.connect = blocked;
  require('node:dgram').Socket.prototype.send = blocked;
  require('node:child_process').spawn = blocked;
  require('node:child_process').exec = blocked;
  require('node:child_process').execFile = blocked;
}
const adapterPath = process.env.LINA_REGRESSION_ADAPTER;
const adapter = require(adapterPath ? path.resolve(adapterPath) : live ? './http-adapter.cjs' : './reference-adapter.cjs');
const timeout = live ? 900000 : 10000;
let totalLlmCalls = 0;
test('Katalog: 30 senaryo, kaynak 1..30 eksiksiz, tam alan/beklenti şeması', () => {
  assert.equal(scenarios.length, 30);
  assert.deepEqual(scenarios.map(s => s.id), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual([...new Set(scenarios.flatMap(s => s.source))].sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
  for (const s of scenarios) for (const steps of s.variants || [s.steps]) for (const step of steps) {
    if (step.restart) continue;
    assert.equal(typeof step.message, 'string');
    assert.deepEqual(Object.keys(step.expected.draft).sort(), ['adSoyad', 'rol', 'amac', 'il', 'ilce', 'mahalle', 'butce', 'm2', 'oda', 'tip', 'ozellikler', 'telefon'].sort());
  }
});
for (const scenario of scenarios) {
  test(`${live ? 'LIVE' : adapterPath ? 'BACKEND-MOCK' : 'REFERENCE-MOCK'} ${scenario.id}. ${scenario.title}`, { timeout }, async () => {
    for (const steps of scenario.variants || [scenario.steps]) {
      const session = await adapter.createSession({ live, fixtures: { llmReply: scenario.llmReply || null } });
      let turn = 0;
      let llmCalls = 0;
      try {
        for (const step of steps) {
          if (step.restart) { await session.restart(); continue; }
          turn++;
          const got = await session.send(step.message);
          const label = `senaryo ${scenario.id}, tur ${turn}`;
          assert.equal(got.status, 200, label);
          for (const [key, value] of Object.entries(step.expected)) assert.deepEqual(got[key], value, `${label}: ${key}`);
          assert.equal(got.llmMode, live ? 'live' : 'mock', `${label}: LLM modu`);
          assert.ok(Number.isInteger(got.llmCalls) && got.llmCalls >= 0, `${label}: LLM sayaç kanıtı`);
          if (!live) assert.equal(got.llmCalls, 0, label);
          llmCalls += got.llmCalls;
          assert.equal(got.savedRecords.length, got.kayitSayisi, `${label}: gerçek kayıt sayısı`);
          const c = step.checks;
          for (const field of c.missing || []) assert.ok(got.missing.includes(field), `${label}: eksik ${field}`);
          for (const field of c.notMissing || []) assert.ok(!got.missing.includes(field), `${label}: tekrar sorulan ${field}`);
          for (const text of c.replyIncludes || []) assert.ok(got.reply.includes(text), `${label}: yanıt içermeli: ${text}`);
          for (const text of c.replyExcludes || []) assert.ok(!got.reply.toLocaleLowerCase('tr').includes(text.toLocaleLowerCase('tr')), `${label}: yasak yanıt: ${text}`);
          if (c.maskedEquals !== undefined) assert.equal(got.maskedMessage, c.maskedEquals, label);
          if (c.tokenValue) assert.equal(got.tokens['[TEL_1]'], c.tokenValue, label);
          if (c.tokenCount !== undefined) assert.equal(Object.keys(got.tokens).length, c.tokenCount, label);
          if (c.clarifyLocation) assert.equal(got.clarifyLocation, true, label);
          if (c.forbiddenValue) assert.ok(!Object.values(got.draft).includes(c.forbiddenValue), label);
          if (c.saved) assert.deepEqual(got.savedRecords, [c.saved], `${label}: kalıcı kayıt`);
          if (c.noWriteAttempt) assert.equal(got.writeAttempts, 0, label);
          if (c.minReplyLength) assert.ok(got.reply.length >= c.minReplyLength, label);
          if (c.allTurnsLogged) {
            const ids = Array.from({ length: turn }, (_, i) => i + 1);
            assert.deepEqual(got.conversationTurns, ids, `${label}: LinaKonusma`);
            assert.deepEqual(got.auditTurns, ids, `${label}: LinaDenetim`);
          }
        }
        totalLlmCalls += llmCalls;
      } finally { await session.close(); }
    }
  });
}
if (live) test('LIVE: set boyunca en az bir gerçek sağlayıcı çağrısı yapılmış olmalı', () => {
  assert.ok(totalLlmCalls > 0, 'Canlı mod mocka düşemez: sağlayıcı çağrı kanıtı gerekli.');
});
