import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config, requireConfig } from './config.mjs';
import { apiRequest } from './http.mjs';
import { appendJsonLine } from './report.mjs';

requireConfig();
if (!config.allowMutations) throw new Error('Onaylı işlem çalıştırmak için ALLOW_MUTATIONS=true olmalıdır.');

const actions = {
  publish: {
    description: `CRM talebini anonim Talep Merkezi kaydına dönüştür: ${config.ids.interestId || '(ID yok)'}`,
    ready: Boolean(config.ids.interestId),
    run: () => apiRequest(`/coordination/crm/interests/${config.ids.interestId}/publish-request`, { method: 'POST', body: { createFollowUpTask: true } }),
  },
  opportunity: {
    description: `Talep Merkezi kaydından özel CRM fırsatı oluştur: ${config.ids.postId || '(ID yok)'}`,
    ready: Boolean(config.ids.postId),
    run: () => apiRequest(`/coordination/requests/${config.ids.postId}/create-crm-opportunity`, { method: 'POST', body: { createFollowUpTask: true } }),
  },
  link: {
    description: `Havuz portföyünü CRM müşterisine bağla: ${config.ids.unitId || '(unit yok)'} → ${config.ids.customerId || '(customer yok)'}`,
    ready: Boolean(config.ids.customerId && config.ids.unitId),
    run: () => apiRequest(`/coordination/crm/customers/${config.ids.customerId}/pool-units/${config.ids.unitId}/link`, {
      method: 'POST',
      body: {
        ...(config.ids.interestId ? { customerInterestId: config.ids.interestId } : {}),
        createFollowUpTask: true,
        note: 'Kullanıcı onaylı koordinasyon işlemi',
      },
    }),
  },
};

const selectedName = process.argv[2];
const selected = actions[selectedName];
if (!selected) throw new Error('Kullanım: npm run approve -- publish|opportunity|link');
if (!selected.ready) throw new Error('Seçilen işlem için gerekli test kimlikleri eksik.');

console.log(`\nİŞLEM: ${selected.description}`);
console.log('Bu işlem test ortamında gerçek kayıt oluşturabilir veya güncelleyebilir.');
const rl = readline.createInterface({ input, output });
const answer = await rl.question('Devam etmek için tam olarak ONAYLIYORUM yazın: ');
rl.close();
if (answer.trim() !== 'ONAYLIYORUM') {
  console.log('İşlem iptal edildi.');
  process.exit(2);
}

const result = await selected.run();
appendJsonLine('approved-actions', {
  action: selectedName,
  approvedAt: new Date().toISOString(),
  status: result.status,
  elapsedMs: result.elapsedMs,
  response: result.data,
});
console.log('İşlem tamamlandı.');
console.log(JSON.stringify(result.data, null, 2));
