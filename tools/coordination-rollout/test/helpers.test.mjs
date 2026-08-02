import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoPersonalData } from '../src/http.mjs';

test('kişisel veri olmayan yanıt kabul edilir', () => {
  assert.doesNotThrow(() => assertNoPersonalData({ title: 'Anonim talep', customerId: 'x' }));
});

test('telefon alanı reddedilir', () => {
  assert.throws(() => assertNoPersonalData({ phone: '05000000000' }), /kişisel veri/);
});

test('e-posta alanı reddedilir', () => {
  assert.throws(() => assertNoPersonalData({ email: 'test@example.com' }), /kişisel veri/);
});
