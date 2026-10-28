import { BadRequestException } from '@nestjs/common';
import { OfficialStoreGateway } from './store.gateway';

describe('Official store gateway', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  function gateway() { const g = new OfficialStoreGateway(); jest.spyOn(g, 'ready').mockReturnValue(true); return g; }
  const apple = { transactionId: '12345', productId: 'eph.pk.500', bundleId: 'com.emlakportfoyhavuzu.app',
    environment: 'Sandbox', inAppOwnershipType: 'PURCHASED', quantity: 1, appAccountToken: '11111111-1111-4111-8111-111111111111',
    type: 'Consumable', price: 1250500, currency: 'TRY', purchaseDate: Date.now() - 1000 };
  function appleGateway(data = apple) {
    const g = gateway(); const verifier = { verifyAndDecodeTransaction: jest.fn().mockResolvedValue(data) };
    jest.spyOn(g as any, 'apple').mockReturnValue({ client: { getTransactionInfo: jest.fn().mockResolvedValue({ signedTransactionInfo: 'signed-jws' }) }, verifier, environment: 'Sandbox' });
    return { g, verifier };
  }
  const dto = { platform: 'APPLE' as const, mode: 'sandbox' as const, sku: 'eph.pk.500', transactionId: '12345' };
  it('requires the official signature verifier and converts Apple milliunits', async () => {
    const { g, verifier } = appleGateway(); const proof = await g.verify(dto);
    expect(verifier.verifyAndDecodeTransaction).toHaveBeenCalledWith('signed-jws'); expect(proof.amount).toBe('1250.5'); expect(proof.intentId).toBe(apple.appAccountToken);
  });
  it.each([
    { quantity: 2 }, { inAppOwnershipType: 'FAMILY_SHARED' }, { bundleId: 'other.app' }, { productId: 'wrong.sku' },
    { transactionId: 'other' }, { environment: 'Production' }, { type: 'Auto-Renewable Subscription' },
    { price: -1 }, { currency: 'bad' }, { appAccountToken: null }, { purchaseDate: Date.now() + 600000 },
  ])('rejects mismatched or unsupported Apple proof %j', async (patch) => {
    const { g } = appleGateway({ ...apple, ...patch } as any); await expect(g.verify(dto)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('never accepts a signature verifier failure', async () => {
    const { g, verifier } = appleGateway(); verifier.verifyAndDecodeTransaction.mockRejectedValue(new Error('bad signature'));
    await expect(g.verify(dto)).rejects.toThrow('Mağaza işlemi doğrulanamadı');
  });
  it('marks Apple revocation for entitlement reversal, not a new grant', async () => {
    const { g } = appleGateway({ ...apple, revocationDate: Date.now() } as any); expect((await g.verify(dto)).revoked).toBe(true);
  });
  it('keeps Apple partial refund distinct from a full revocation', async () => {
    const { g } = appleGateway({ ...apple, revocationDate: Date.now(), revocationType: 'REFUND_PRORATED', revocationPercentage: 40000 } as any);
    const proof = await g.verify(dto); expect(proof.revoked).toBe(true); expect(proof.partialRevocation).toBe(true); expect(proof.refundMilliPercent).toBe(40000);
  });
  it('rejects invalid Apple refund percentage', async () => {
    const { g } = appleGateway({ ...apple, revocationPercentage: 100001 } as any); await expect(g.verify(dto)).rejects.toBeInstanceOf(BadRequestException);
  });
  const play = { productLineItem: [{ productId: 'eph.pk.500', productOfferDetails: { quantity: 1, refundableQuantity: 1, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' } }],
    purchaseStateContext: { purchaseState: 'PURCHASED' }, testPurchaseContext: { fopType: 'TEST' }, orderId: 'GPA.123',
    obfuscatedExternalAccountId: 'opaque-account', obfuscatedExternalProfileId: apple.appAccountToken, purchaseCompletionTime: new Date().toISOString() };
  const order = { orderId: 'GPA.123', lineItems: [{ productId: 'eph.pk.500', oneTimePurchaseDetails: {}, total: { units: '1250', nanos: 500000000, currencyCode: 'TRY' } }] };
  function playGateway(data: any = play, details: any = order) {
    const g = gateway(); const request = jest.spyOn(g as any, 'googleRequest').mockImplementation(async (suffix: unknown) => String(suffix).startsWith('orders/') ? details : data);
    return { g, request };
  }
  const googleDto = { platform: 'GOOGLE' as const, mode: 'sandbox' as const, sku: 'eph.pk.500', purchaseToken: 'private/play-token?x=y' };
  it('gets Google authoritative amount and opaque receipt hash', async () => {
    const { g, request } = playGateway(); const proof = await g.verify(googleDto);
    expect(proof.amount).toBe('1250.5'); expect(proof.reference).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(proof)).not.toContain(googleDto.purchaseToken);
    expect(request).toHaveBeenCalledWith('purchases/productsv2/tokens/private%2Fplay-token%3Fx%3Dy');
  });
  it('keeps pending Google purchase pending and does not request monetary order details', async () => {
    const { g, request } = playGateway({ ...play, purchaseStateContext: { purchaseState: 'PENDING' } });
    expect((await g.verify(googleDto)).pending).toBe(true); expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([
    { testPurchaseContext: undefined }, { obfuscatedExternalAccountId: null }, { obfuscatedExternalProfileId: null },
    { productLineItem: [] }, { purchaseStateContext: { purchaseState: 'UNKNOWN' } },
    { productLineItem: [{ ...play.productLineItem[0], productOfferDetails: { quantity: 2, refundableQuantity: 2 } }] },
    { productLineItem: [{ ...play.productLineItem[0], productOfferDetails: { quantity: 1, refundableQuantity: 1, rentOfferDetails: {} } }] },
  ])('rejects mismatched Google proof %j', async (patch) => {
    const { g } = playGateway({ ...play, ...patch }); await expect(g.verify(googleDto)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not grant when the Google monetary record is unavailable or mismatched', async () => {
    const { g } = playGateway(play, { ...order, lineItems: [{ ...order.lineItems[0], productId: 'other' }] }); await expect(g.verify(googleDto)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('recognizes Google refunded quantity', async () => {
    const { g } = playGateway({ ...play, productLineItem: [{ ...play.productLineItem[0], productOfferDetails: { quantity: 1, refundableQuantity: 0 } }] });
    expect((await g.verify(googleDto)).revoked).toBe(true);
  });
  it('does not consume an already consumed Google receipt', async () => {
    const { g, request } = playGateway({ productLineItem: [{ productId: 'eph.pk.500', productOfferDetails: { consumptionState: 'CONSUMPTION_STATE_CONSUMED' } }] });
    await g.consume('eph.pk.500', 'token'); expect(request).toHaveBeenCalledTimes(1);
  });
  it('seals receipt tokens with authenticated encryption and rejects tampering', () => {
    process.env.EPH_STORE_TOKEN_ENCRYPTION_KEY = 'f'.repeat(64); const g = gateway(); const sealed = g.seal(googleDto);
    expect(sealed).not.toContain(googleDto.purchaseToken); expect(g.unseal(sealed)).toEqual(googleDto);
    const pieces = sealed.split('.'); pieces[2] = Buffer.alloc(16).toString('base64url'); expect(() => g.unseal(pieces.join('.'))).toThrow();
  });
  it('uses a stable opaque Google account binding and requires a server secret', () => {
    process.env.EPH_STORE_ACCOUNT_SECRET = 'a'.repeat(64); const g = gateway(); expect(g.accountToken('user1')).toMatch(/^[a-f0-9]{64}$/);
    expect(g.accountToken('user1')).toBe(g.accountToken('user1')); expect(g.accountToken('user1')).not.toBe(g.accountToken('user2'));
    delete process.env.EPH_STORE_ACCOUNT_SECRET; expect(() => g.accountToken('user1')).toThrow();
  });
});
