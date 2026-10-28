import { createHmac } from 'node:crypto';
import { IyzicoGateway, secureHexEqual } from './iyzico.gateway';

describe('iyzico gateway', () => {
  let gateway: IyzicoGateway;
  const fetchOriginal = global.fetch;
  beforeEach(() => {
    process.env.EPH_PAYMENTS_ENABLED = 'true'; process.env.IYZICO_MODE = 'sandbox';
    process.env.IYZICO_API_KEY = 'test-api-key'; process.env.IYZICO_SECRET_KEY = 'test-secret-key';
    gateway = new IyzicoGateway();
  });
  afterEach(() => { global.fetch = fetchOriginal; });
  afterAll(() => { for (const key of ['EPH_PAYMENTS_ENABLED', 'IYZICO_MODE', 'IYZICO_API_KEY', 'IYZICO_SECRET_KEY']) delete process.env[key]; });
  test('rejects absent or malformed signatures', () => {
    expect(secureHexEqual('a'.repeat(64), '')).toBe(false);
    expect(secureHexEqual('a'.repeat(64), 'zz'.repeat(32))).toBe(false);
    expect(secureHexEqual('a'.repeat(64), 'b'.repeat(64))).toBe(false);
    expect(secureHexEqual('a'.repeat(64), 'A'.repeat(64))).toBe(true);
  });
  test.each(['http://sandbox-iyzico.com/pay', 'https://sandbox-iyzico.com.evil.test/pay', 'https://evil.test/pay', 'https://user:password@sandbox-iyzico.com/pay', 'javascript:alert(1)', 'https://sandbox-iyzico.com:8443/pay'])('rejects unsafe checkout URL %s', (url) => expect(() => gateway.checkoutUrl(url)).toThrow());
  test('validates environment checkout hosts', () => {
    expect(gateway.checkoutUrl('https://sandbox-iyzico.com/pay')).toBe('https://sandbox-iyzico.com/pay');
    expect(() => gateway.checkoutUrl('https://iyzico.com/pay')).toThrow();
    process.env.IYZICO_MODE = 'live';
    expect(gateway.checkoutUrl('https://cpp.iyzico.com/pay')).toBe('https://cpp.iyzico.com/pay');
  });
  test('HPP webhook uses payment ID, token and exact documented field order', () => {
    const body = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 123, token: 'test-token', paymentConversationId: 'attempt-1', status: 'SUCCESS' };
    const signature = createHmac('sha256', 'test-secret-key').update('test-secret-keyCHECKOUT_FORM_AUTH123test-tokenattempt-1SUCCESS').digest('hex');
    expect(gateway.verifyWebhook(body, signature)).toBe(true);
    expect(gateway.verifyWebhook({ ...body, token: 'different' }, signature)).toBe(false);
    expect(gateway.verifyWebhook({ ...body, status: 'FAILURE' }, signature)).toBe(false);
  });
  test('request signature signs exactly the transmitted JSON and URI', async () => {
    const result: Record<string, any> = { status: 'success', conversationId: 'attempt-1', token: 'test-token', paymentPageUrl: 'https://sandbox-iyzico.com/pay' };
    result.signature = createHmac('sha256', 'test-secret-key').update('attempt-1:test-token').digest('hex');
    const mock = jest.fn().mockResolvedValue({ ok: true, json: async () => result });
    global.fetch = mock;
    await gateway.initialize({ conversationId: 'attempt-1', price: '100.00' });
    const [url, init] = mock.mock.calls[0];
    const decoded = Buffer.from(init.headers.Authorization.slice(8), 'base64').toString();
    const expected = createHmac('sha256', 'test-secret-key').update(init.headers['x-iyzi-rnd'] + new URL(url).pathname + init.body).digest('hex');
    expect(decoded).toContain(`signature:${expected}`);
    expect(init.redirect).toBe('error');
  });
  test('rejects tampered provider response signature', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success', signature: '0'.repeat(64) }) });
    await expect(gateway.retrieve('token', 'attempt')).rejects.toThrow('doğrulanmış');
  });
  test('normalizes price trailing zeroes for retrieve signatures', async () => {
    const result: Record<string, any> = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '123', currency: 'TRY', basketId: 'order', conversationId: 'attempt', paidPrice: '100.00', price: '100.0', token: 'test-token' };
    result.signature = createHmac('sha256', 'test-secret-key').update('SUCCESS:123:TRY:order:attempt:100:100:test-token').digest('hex');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => result });
    await expect(gateway.retrieve('test-token', 'attempt')).resolves.toMatchObject({ paymentId: '123' });
  });
  test('disabled payment never contacts provider', async () => {
    process.env.EPH_PAYMENTS_ENABLED = 'false'; global.fetch = jest.fn();
    await expect(gateway.initialize({})).rejects.toThrow('etkinleştirilmedi'); expect(global.fetch).not.toHaveBeenCalled();
  });
});
