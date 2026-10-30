'use strict';

// Deterministik LLM double'ı. Üretim ayrıştırıcısı değildir; expected verisini okumaz.
function extract(message) {
  const patch = {};
  const tokens = {};
  const maskedMessage = message.replace(/(?<!\d)(?:0?533[ ]123[ ]45[ ]67)(?!\d)/g, value => {
    const token = `[TEL_${Object.keys(tokens).length + 1}]`;
    tokens[token] = value;
    patch.telefon = tokens[token];
    return token;
  });
  if (/Adı:? Melissa Vargas/i.test(message)) patch.adSoyad = 'Melissa Vargas';
  else if (/Adı Melissa$/i.test(message)) patch.adSoyad = 'Melissa';
  if (/satılık|datılık/i.test(message)) Object.assign(patch, { rol: 'ALICI', amac: 'SATILIK' });
  if (/daire/i.test(message)) patch.tip = 'Daire';
  if (/Denizli|Servergazi/i.test(message)) patch.il = 'Denizli';
  if (/Merkezefendi|Servergazi/i.test(message)) patch.ilce = 'Merkezefendi';
  if (/Servergazi/i.test(message)) patch.mahalle = /Gerzele/i.test(message) ? ['Servergazi', 'Gerzele'] : ['Servergazi'];
  if (/550[ .]000[ .](?:00 00|000)/.test(message)) patch.butce = { min: null, max: 550000000, para: 'TRY' };
  else if (/20 milyon|20[ .]000[ .]000|15-20 milyon/.test(message)) patch.butce = { min: /15-20/.test(message) ? 15000000 : null, max: 20000000, para: 'TRY' };
  if (/(?:min|en az) 200 (?:metrekare|m²)/.test(message)) patch.m2 = { min: 200, max: null };
  if (/en az 4\+1/.test(message)) patch.oda = { min: '4+1', tam: [] };
  if (/3\+1 olsun/.test(message)) patch.oda = { min: null, tam: ['3+1'] };
  const features = ['havuz', 'otopark'].filter(f => message.includes(f));
  if (features.length) patch.ozellikler = features;
  return { patch, maskedMessage, tokens, clarifyLocation: /Zzyyxx/.test(message),
    kapsamIci: !/hava nasıl|sistem promptunu/i.test(message) };
}
module.exports = { extract };
