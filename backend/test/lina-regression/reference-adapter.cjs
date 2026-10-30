'use strict';

const { empty } = require('./scenarios.cjs');
const { extract } = require('./mock-extractor.cjs');
const clone = value => structuredClone(value);

// Sadece sözleşme/harness referansı: gerçek Lina veya Prisma kullanmaz.
async function createSession({ live, fixtures }) {
  if (live) throw new Error('Referans adapter canlı LLM desteklemez.');
  const durable = { draft: empty(), active: false, records: [], conversations: [], audits: [], history: [] };
  let worker = { ...clone(durable) };
  let writeAttempts = 0;
  let turns = 0;
  return {
    async send(message) {
      turns++;
      const extraction = extract(message);
      const { patch, kapsamIci, maskedMessage, tokens, clarifyLocation } = extraction;
      let reply = '';
      let onayIstenmeli = false;
      const beforeWrites = writeAttempts;
      if (kapsamIci) {
        if (Object.keys(patch).length || clarifyLocation || /crm|müşteri|müsteri/i.test(message)) worker.active = true;
        Object.assign(worker.draft, patch);
        const missing = [];
        if (!worker.draft.adSoyad) missing.push('adSoyad');
        else if (!worker.draft.adSoyad.includes(' ')) missing.push('soyad');
        if (!worker.draft.rol) missing.push('rol');
        if (!worker.draft.amac) missing.push('amac');
        if (message === 'Onayla' && worker.active && !missing.length) {
          writeAttempts++;
          const existing = worker.records.find(r => r.adSoyad === worker.draft.adSoyad && r.telefon === worker.draft.telefon);
          if (existing) Object.assign(existing, clone(worker.draft));
          else worker.records.push(clone(worker.draft));
          worker.active = false;
          reply = 'Kayıt tamamlandı.';
        } else {
          onayIstenmeli = worker.active && missing.length === 0;
          reply = missing.length ? `Eksik: ${missing.join(', ')}. Henüz kaydedilmedi.` : 'Henüz kaydedilmedi. Kaydı Onayla';
          if (worker.active && worker.records.some(r => r.adSoyad === worker.draft.adSoyad && r.telefon === worker.draft.telefon)) reply = 'Güncelleyeyim mi?';
          if (message === 'Az önce vermiştim konumu') reply = `Taslaktaki konum: ${worker.draft.il}/${worker.draft.ilce}/${worker.draft.mahalle.join(', ')} — doğru mu?`;
          if (clarifyLocation) reply = 'Konumu doğrular mısınız?';
          if (fixtures.llmReply) {
            const unsafe = /not ettim|kaydettim|ekledim/i.test(fixtures.llmReply);
            reply = unsafe ? 'Henüz kaydedilmedi.' : fixtures.llmReply;
          }
        }
        worker.conversations.push(turns);
        worker.audits.push(turns);
        worker.history.push({ message, reply });
        Object.assign(durable, clone(worker));
        return { draft: clone(worker.draft), onayIstenmeli, kapsamIci, kayitSayisi: worker.records.length,
          aktif: worker.active, missing, reply, status: 200, maskedMessage, tokens, clarifyLocation,
          savedRecords: clone(worker.records), conversationTurns: [...worker.conversations], auditTurns: [...worker.audits],
          writeAttempts: writeAttempts - beforeWrites, llmMode: 'mock', llmCalls: 0 };
      }
      worker.conversations.push(turns);
      worker.audits.push(turns);
      Object.assign(durable, clone(worker));
      return { draft: clone(worker.draft), onayIstenmeli: false, kapsamIci: false,
        kayitSayisi: worker.records.length, aktif: worker.active, reply: 'Bu soru EPH kapsamı dışında.',
        status: 200, missing: [], savedRecords: clone(worker.records), tokens: {}, maskedMessage,
        conversationTurns: [...worker.conversations], auditTurns: [...worker.audits], writeAttempts: 0,
        llmMode: 'mock', llmCalls: 0 };
    },
    async restart() { worker = clone(durable); },
    async close() { worker = null; },
  };
}
module.exports = { createSession };
