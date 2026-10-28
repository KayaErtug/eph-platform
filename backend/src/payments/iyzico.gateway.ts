import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { jsonObject } from './payment.rules';

export interface PaymentGateway {
  mode(): 'sandbox' | 'live';
  ready(): boolean;
  initialize(payload: Record<string, unknown>): Promise<Record<string, any>>;
  retrieve(token: string, conversationId: string): Promise<Record<string, any>>;
  verifyWebhook(payload: Record<string, any>, signature: string): boolean;
  checkoutUrl(value: unknown): string;
}
export const PAYMENT_GATEWAY = 'EPH_PAYMENT_GATEWAY';

export function secureHexEqual(expected: string, provided: string): boolean {
  return /^[a-f0-9]{64}$/i.test(provided || '') &&
    timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
}

@Injectable()
export class IyzicoGateway implements PaymentGateway {
  mode(): 'sandbox' | 'live' {
    const value = process.env.IYZICO_MODE || 'sandbox';
    if (value !== 'sandbox' && value !== 'live') throw new ServiceUnavailableException('Ödeme ortamı geçersiz.');
    return value;
  }

  ready(): boolean {
    return process.env.EPH_PAYMENTS_ENABLED === 'true' && !!process.env.IYZICO_API_KEY && !!process.env.IYZICO_SECRET_KEY &&
      (process.env.IYZICO_MODE === undefined || ['sandbox', 'live'].includes(process.env.IYZICO_MODE));
  }

  checkoutUrl(value: unknown): string {
    try {
      const url = new URL(String(value));
      const host = this.mode() === 'live' ? 'iyzico.com' : 'sandbox-iyzico.com';
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !(url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error();
      return url.toString();
    } catch { throw new BadGatewayException('Ödeme sayfasının adresi doğrulanamadı.'); }
  }

  private async request(path: string, payload: Record<string, unknown>): Promise<Record<string, any>> {
    if (!this.ready()) throw new ServiceUnavailableException('Kartlı ödeme henüz etkinleştirilmedi.');
    const apiKey = process.env.IYZICO_API_KEY!;
    const secret = process.env.IYZICO_SECRET_KEY!;
    const random = randomBytes(24).toString('hex');
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(random + path + body).digest('hex');
    const authorization = Buffer.from(`apiKey:${apiKey}&randomKey:${random}&signature:${signature}`).toString('base64');
    try {
      const base = this.mode() === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com';
      const response = await fetch(base + path, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `IYZWSv2 ${authorization}`, 'x-iyzi-rnd': random, 'Content-Type': 'application/json' }, body,
      });
      if (!response.ok) throw new Error();
      const result = jsonObject(await response.json());
      if (!['success', 'failure'].includes(result.status)) throw new Error();
      if (result.status === 'success') {
        const fields = path.includes('/initialize/')
          ? ['conversationId', 'token']
          : ['paymentStatus', 'paymentId', 'currency', 'basketId', 'conversationId', 'paidPrice', 'price', 'token'];
        const values = fields.map((key) => {
          const raw = String(result[key] ?? '');
          return ['price', 'paidPrice'].includes(key) && raw.includes('.') ? raw.replace(/0+$/, '').replace(/\.$/, '') : raw;
        });
        const expected = createHmac('sha256', secret).update(values.join(':')).digest('hex');
        if (!secureHexEqual(expected, result.signature)) throw new Error();
      }
      return result;
    } catch { throw new BadGatewayException('Ödeme sağlayıcısından doğrulanmış yanıt alınamadı. Yeniden ödeme yapmadan işlem durumunu kontrol edin.'); }
  }

  async initialize(payload: Record<string, unknown>) {
    const result = await this.request('/payment/iyzipos/checkoutform/initialize/auth/ecom', payload);
    if (result.status === 'success') {
      if (result.conversationId !== payload.conversationId || typeof result.token !== 'string' || !result.token || result.token.length > 512) {
        throw new BadGatewayException('Ödeme oturumu doğrulanamadı.');
      }
      result.paymentPageUrl = this.checkoutUrl(result.paymentPageUrl);
    }
    return result;
  }

  retrieve(token: string, conversationId: string) {
    return this.request('/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId, token });
  }

  verifyWebhook(payload: Record<string, any>, signature: string): boolean {
    const secret = process.env.IYZICO_SECRET_KEY;
    const fields = ['iyziEventType', 'iyziPaymentId', 'token', 'paymentConversationId', 'status'];
    if (!secret || fields.some((key) => !['string', 'number'].includes(typeof payload[key]))) return false;
    const expected = createHmac('sha256', secret).update(secret + fields.map((key) => String(payload[key])).join('')).digest('hex');
    return secureHexEqual(expected, signature);
  }
}
