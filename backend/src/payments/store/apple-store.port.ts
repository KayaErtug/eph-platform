import type { JWSRenewalInfoDecodedPayload, JWSTransactionDecodedPayload, ResponseBodyV2DecodedPayload } from '@apple/app-store-server-library';

/** Apple ile konuşan tek katman. Gerçek uygulama: apple-store.client.ts. Testler sahte uygulama enjekte eder. */
export const APPLE_STORE_PORT = Symbol('APPLE_STORE_PORT');

/** Test için ayar okuyucu enjeksiyonu (isteğe bağlı; yoksa ortam değişkenleri okunur). */
export const APPLE_STORE_CONFIG = Symbol('APPLE_STORE_CONFIG');

export type AppleEnv = 'PRODUCTION' | 'SANDBOX';

/** İşlem Apple'da bulunamadı (hiçbir ortamda). */
export class AppleTransactionNotFoundError extends Error {}
/** Apple geçici olarak ulaşılamaz / yeniden denenebilir hata / yapılandırma eksik. */
export class AppleStoreUnavailableError extends Error {}
/** İmza, zincir, bundle veya ortam doğrulaması başarısız. */
export class AppleSignatureError extends Error {}

export interface AppleTransactionLookup {
  transaction: JWSTransactionDecodedPayload;
  environment: AppleEnv;
}

export interface AppleDecodedNotification {
  notification: ResponseBodyV2DecodedPayload;
  transaction?: JWSTransactionDecodedPayload;
  renewal?: JWSRenewalInfoDecodedPayload;
  environment: AppleEnv;
}

export interface AppleStorePort {
  /** App Store Server API'den işlemi okur (önce yapılandırılan ortam, bulunamazsa Sandbox) ve imzayı Apple kök zinciriyle doğrular. */
  getTransaction(transactionId: string): Promise<AppleTransactionLookup>;
  /** Notifications V2 signedPayload'ı (ve içindeki işlem/yenileme JWS'lerini) kök zinciriyle doğrular. */
  decodeNotification(signedPayload: string): Promise<AppleDecodedNotification>;
}
