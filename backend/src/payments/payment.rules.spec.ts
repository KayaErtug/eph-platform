import { addMonthClamped, equalMoney, money, termsVersion } from './payment.rules';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckoutDto, PaymentSettingsDto } from './payment.dto';
import { CreatePaymentOrderDto } from '../membership/dto/create-payment-order.dto';

describe('Payment rules and input validation', () => {
  test.each(['0', '-1', '1.001', 'NaN', 'Infinity', '', null, '10000000.01'])('rejects invalid amount %p', (value) => {
    expect(() => money(value)).toThrow();
  });
  test.each([['1', '1.00'], ['12.5', '12.50'], ['9999.99', '9999.99']])('formats exact decimal %s', (value, expected) => expect(money(value)).toBe(expected));
  test('compares money without floating point rounding', () => {
    expect(equalMoney('100.0', '100.00')).toBe(true);
    expect(equalMoney('100.001', '100.00')).toBe(false);
    expect(equalMoney('100.01', '100.00')).toBe(false);
  });
  test.each([
    ['2026-01-31T12:20:00Z', '2026-02-28T12:20:00.000Z'],
    ['2028-01-31T12:20:00Z', '2028-02-29T12:20:00.000Z'],
    ['2026-12-31T12:20:00Z', '2027-01-31T12:20:00.000Z'],
  ])('clamps month boundary %s', (start, expected) => expect(addMonthClamped(new Date(start)).toISOString()).toBe(expected));
  test('legal version changes with content', () => expect(termsVersion({ a: 1 })).not.toBe(termsVersion({ a: 2 })));
  test('JSONB key ordering does not invalidate consent version', () => expect(termsVersion({ a: 1, b: { x: 2, y: 3 } })).toBe(termsVersion({ b: { y: 3, x: 2 }, a: 1 })));
  test('membership order DTO survives global whitelist', async () => {
    const value = plainToInstance(CreatePaymentOrderDto, { paketKodu: 'BRONZ', amount: 1 });
    expect(await validate(value, { whitelist: true })).toHaveLength(0);
    expect(value.paketKodu).toBe('BRONZ');
    expect((value as any).amount).toBeUndefined();
  });
  test('missing billing and false consent are rejected', async () => {
    const value = plainToInstance(CheckoutDto, { kind: 'PK', productCode: 'PK_100', termsVersion: 'a'.repeat(64), acceptedTerms: false });
    const errors = await validate(value, { whitelist: true });
    expect(errors.map((e) => e.property)).toEqual(expect.arrayContaining(['billing', 'acceptedTerms']));
  });
  test('valid checkout strips price and amount manipulation', async () => {
    const value = plainToInstance(CheckoutDto, { kind: 'PK', productCode: 'PK_100', termsVersion: 'a'.repeat(64), acceptedTerms: true, amount: 1,
      billing: { firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '+905001234567', identityNumber: '10000000146', address: 'Test fatura adresi 123', city: 'Denizli' } });
    expect(await validate(value, { whitelist: true })).toHaveLength(0);
    expect((value as any).amount).toBeUndefined();
  });
  test('invalid PK quantities and negative prices cannot be configured', async () => {
    const config = plainToInstance(PaymentSettingsDto, { approved: false, pkProducts: [{ code: 'PK_100', name: 'PK Test', credits: -1, amountMinor: -1, active: true }] });
    expect((await validate(config)).some((e) => e.property === 'pkProducts')).toBe(true);
  });
});
