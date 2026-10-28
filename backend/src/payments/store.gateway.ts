import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppStoreServerAPIClient, Environment, InAppOwnershipType, SignedDataVerifier, Type as AppleType } from '@apple/app-store-server-library';
import { GoogleAuth } from 'google-auth-library';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { StoreMode, StorePlatform, StoreVerifyDto } from './store.dto';

export const STORE_GATEWAY = Symbol('STORE_GATEWAY');
export type StoreProof = {
  platform: StorePlatform; mode: StoreMode; sku: string; reference: string;
  intentId: string; accountToken?: string; amount: string; currency: string;
  purchasedAt: string; productType: 'CONSUMABLE' | 'NON_RENEWING';
  revoked: boolean; pending: boolean;
  partialRevocation?: boolean; refundMilliPercent?: number;
  paymentConfirmed?: boolean;
};
export interface StoreGateway {
  ready(platform: StorePlatform, mode: StoreMode): boolean;
  accountToken(userId: string): string;
  verify(dto: StoreVerifyDto): Promise<StoreProof>;
  consume(sku: string, token: string): Promise<void>;
  seal(dto: StoreVerifyDto): string;
  unseal(value: string): StoreVerifyDto;
}

@Injectable()
export class OfficialStoreGateway implements StoreGateway {
  private google?: GoogleAuth;

  private bundleId() { return 'com.emlakportfoyhavuzu.app'; }
  private key() {
    const value = process.env.EPH_STORE_TOKEN_ENCRYPTION_KEY || '';
    if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new ServiceUnavailableException('Mağaza doğrulaması yapılandırılmamış.');
    return Buffer.from(value, 'hex');
  }
  accountToken(userId: string) {
    const secret = process.env.EPH_STORE_ACCOUNT_SECRET || '';
    if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new ServiceUnavailableException('Mağaza hesap bağlantısı yapılandırılmamış.');
    return createHmac('sha256', Buffer.from(secret, 'hex')).update(`EPH:GOOGLE:${userId}`).digest('hex');
  }
  private apple(mode: StoreMode) {
    const environment = mode === 'sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
    const appId = Number(process.env.APPLE_APP_ID);
    if (!process.env.APPLE_IAP_PRIVATE_KEY_FILE || !process.env.APPLE_IAP_KEY_ID || !process.env.APPLE_IAP_ISSUER_ID ||
      !process.env.APPLE_ROOT_CA_FILES || (mode === 'live' && (!Number.isSafeInteger(appId) || appId <= 0))) throw new Error('Apple configuration');
    const roots = process.env.APPLE_ROOT_CA_FILES.split(';').filter(Boolean).map((file) => readFileSync(file));
    const client = new AppStoreServerAPIClient(readFileSync(process.env.APPLE_IAP_PRIVATE_KEY_FILE, 'utf8'),
      process.env.APPLE_IAP_KEY_ID, process.env.APPLE_IAP_ISSUER_ID, this.bundleId(), environment);
    const verifier = new SignedDataVerifier(roots, true, environment, this.bundleId(), mode === 'live' ? appId : undefined);
    return { client, verifier, environment };
  }
  ready(platform: StorePlatform, mode: StoreMode) {
    try {
      this.key(); this.accountToken('configuration-check');
      if (platform === 'APPLE') this.apple(mode);
      else {
        if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) return false;
        const key = JSON.parse(readFileSync(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE, 'utf8'));
        if (key.type !== 'service_account' || !key.client_email || !key.private_key) return false;
      }
      return true;
    } catch { return false; }
  }
  seal(dto: StoreVerifyDto) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(dto), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
  }
  unseal(value: string): StoreVerifyDto {
    const [version, iv, tag, data, extra] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !data || extra) throw new Error('Invalid encrypted store receipt');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8'));
  }
  private auth() {
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) throw new Error('Google configuration');
    return this.google ||= new GoogleAuth({ keyFilename: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  }
  private async googleRequest<T>(suffix: string, method: 'GET' | 'POST' = 'GET') {
    const client = await this.auth().getClient();
    return (await client.request<T>({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${this.bundleId()}/${suffix}`,
      method, timeout: 15000, ...(method === 'POST' ? { data: {} } : {}) })).data;
  }
  async consume(sku: string, token: string) {
    const purchase = await this.googleRequest<any>(`purchases/productsv2/tokens/${encodeURIComponent(token)}`);
    if (purchase.productLineItem?.length === 1 && purchase.productLineItem[0].productId === sku &&
      purchase.productLineItem[0].productOfferDetails?.consumptionState === 'CONSUMPTION_STATE_CONSUMED') return;
    await this.googleRequest(`purchases/products/${encodeURIComponent(sku)}/tokens/${encodeURIComponent(token)}:consume`, 'POST');
  }
  async verify(dto: StoreVerifyDto): Promise<StoreProof> {
    if (!this.ready(dto.platform, dto.mode)) throw new ServiceUnavailableException('Mağaza doğrulaması kullanılamıyor.');
    try {
      if (dto.platform === 'APPLE') return await this.verifyApple(dto);
      return await this.verifyGoogle(dto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('Mağaza işlemi doğrulanamadı. İşlem kaybolmaz; lütfen tekrar deneyin.');
    }
  }
  private async verifyApple(dto: StoreVerifyDto): Promise<StoreProof> {
    if (!dto.transactionId || !/^[0-9]{1,60}$/.test(dto.transactionId)) throw new BadRequestException('Mağaza işlem kimliği gerekli.');
    const { client, verifier, environment } = this.apple(dto.mode);
    const result = await client.getTransactionInfo(dto.transactionId);
    const data = await verifier.verifyAndDecodeTransaction(result.signedTransactionInfo || '');
    if (data.transactionId !== dto.transactionId || data.productId !== dto.sku || data.bundleId !== this.bundleId() ||
      data.environment !== environment || data.inAppOwnershipType !== InAppOwnershipType.PURCHASED || data.quantity !== 1 ||
      !data.appAccountToken || ![AppleType.CONSUMABLE, AppleType.NON_RENEWING_SUBSCRIPTION].includes(data.type as AppleType) ||
      !Number.isSafeInteger(data.price) || data.price < 0 || !/^[A-Z]{3}$/.test(data.currency || '') || !data.purchaseDate || data.purchaseDate > Date.now() + 300000 ||
      (data.revocationPercentage !== undefined && (!Number.isInteger(data.revocationPercentage) || data.revocationPercentage < 0 || data.revocationPercentage > 100000))) {
      throw new BadRequestException('Mağaza işlem içeriği eşleşmiyor.');
    }
    return { platform: 'APPLE', mode: dto.mode, sku: data.productId, reference: data.transactionId,
      intentId: data.appAccountToken.toLowerCase(), amount: new Prisma.Decimal(data.price).div(1000).toFixed(), currency: data.currency,
      purchasedAt: new Date(data.purchaseDate).toISOString(), productType: data.type === AppleType.CONSUMABLE ? 'CONSUMABLE' : 'NON_RENEWING',
      revoked: !!data.revocationDate || (data.revocationPercentage || 0) > 0 || String(data.revocationType || '').startsWith('REFUND'), pending: false, paymentConfirmed: true,
      partialRevocation: data.revocationType === 'REFUND_PRORATED' || (data.revocationPercentage !== undefined && data.revocationPercentage < 100000),
      ...(data.revocationPercentage !== undefined ? { refundMilliPercent: data.revocationPercentage } : {}) };
  }
  private async verifyGoogle(dto: StoreVerifyDto): Promise<StoreProof> {
    if (!dto.purchaseToken || dto.purchaseToken.length > 8192) throw new BadRequestException('Mağaza makbuzu gerekli.');
    const data = await this.googleRequest<any>(`purchases/productsv2/tokens/${encodeURIComponent(dto.purchaseToken)}`);
    const item = data.productLineItem?.[0];
    const mode: StoreMode = data.testPurchaseContext ? 'sandbox' : 'live';
    const state = data.purchaseStateContext?.purchaseState;
    if (data.productLineItem?.length !== 1 || item?.productId !== dto.sku || !data.obfuscatedExternalAccountId ||
      !data.obfuscatedExternalProfileId || mode !== dto.mode || !['PURCHASED', 'PENDING', 'CANCELLED'].includes(state)) {
      throw new BadRequestException('Mağaza işlem içeriği eşleşmiyor.');
    }
    const reference = createHash('sha256').update(dto.purchaseToken).digest('hex');
    const common = { platform: 'GOOGLE' as const, mode, sku: dto.sku, reference, intentId: data.obfuscatedExternalProfileId,
      accountToken: data.obfuscatedExternalAccountId, productType: 'CONSUMABLE' as const };
    if (state !== 'PURCHASED') return { ...common, amount: '0', currency: 'TRY', purchasedAt: new Date().toISOString(), revoked: state === 'CANCELLED', pending: state === 'PENDING' };
    const offer = item.productOfferDetails;
    if (offer?.quantity !== 1 || !Number.isInteger(offer.refundableQuantity) || offer.refundableQuantity < 0 || offer.refundableQuantity > 1 ||
      offer.rentOfferDetails || offer.preorderOfferDetails || !data.orderId || !data.purchaseCompletionTime) {
      throw new BadRequestException('Mağaza sipariş ayrıntıları henüz hazır değil. Tekrar deneyin.');
    }
    const details = await this.googleRequest<any>(`orders/${encodeURIComponent(data.orderId)}`);
    const line = details.lineItems?.[0]; const total = line?.total;
    if (details.orderId !== data.orderId || details.lineItems?.length !== 1 || line.productId !== dto.sku || !line.oneTimePurchaseDetails ||
      !total || !/^[A-Z]{3}$/.test(total.currencyCode || '') || !/^[0-9]{1,12}$/.test(String(total.units ?? '0')) ||
      !Number.isInteger(total.nanos ?? 0) || (total.nanos ?? 0) < 0 || (total.nanos ?? 0) >= 1000000000) throw new BadRequestException('Mağaza tutarı doğrulanamadı.');
    const date = new Date(data.purchaseCompletionTime);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000) throw new BadRequestException('Mağaza işlem tarihi geçersiz.');
    return { ...common, amount: new Prisma.Decimal(total.units || '0').add(new Prisma.Decimal(total.nanos || 0).div(1000000000)).toFixed(),
      currency: total.currencyCode, purchasedAt: date.toISOString(), pending: false, paymentConfirmed: true, revoked: offer.refundableQuantity === 0 };
  }
}
