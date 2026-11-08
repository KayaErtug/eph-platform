import { Logger } from '@nestjs/common';
import { X509Certificate } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APIException, AppStoreServerAPIClient, Environment, SignedDataVerifier, VerificationException, VerificationStatus } from '@apple/app-store-server-library';
import type { JWSRenewalInfoDecodedPayload, JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import { AppleStoreConfig, readAppleStoreConfig } from './apple-store.config';
import {
  AppleDecodedNotification, AppleEnv, AppleSignatureError, AppleStorePort, AppleStoreUnavailableError,
  AppleTransactionLookup, AppleTransactionNotFoundError,
} from './apple-store.port';

interface EnvContext { name: AppleEnv; verifier: SignedDataVerifier; api?: AppStoreServerAPIClient }

/**
 * Gerçek Apple bağlantısı (@apple/app-store-server-library). Yalnız ilk kullanımda, ortam değişkenlerinden kurulur.
 * Bu görevde gerçek Apple isteği yapılmadı; canlı davranış "doğrulanamadı" (bkz. ODM-3 raporu).
 */
export class AppleStoreClient implements AppleStorePort {
  private readonly logger = new Logger(AppleStoreClient.name);
  private contexts?: EnvContext[];

  constructor(private readonly configReader: () => AppleStoreConfig = readAppleStoreConfig) {}

  private rootCertificates(dir: string): Buffer[] {
    if (!dir) throw new AppleStoreUnavailableError('APPLE_ROOT_CA_DIR tanımlı değil.');
    const roots: Buffer[] = [];
    for (const name of readdirSync(dir)) {
      if (!/\.(cer|crt|der|pem)$/i.test(name)) continue;
      const raw = readFileSync(join(dir, name));
      roots.push(raw.subarray(0, 11).toString('latin1') === '-----BEGIN C' ? new X509Certificate(raw).raw : raw);
    }
    if (!roots.length) throw new AppleStoreUnavailableError('Apple kök sertifikası bulunamadı.');
    return roots;
  }

  private build(): EnvContext[] {
    if (this.contexts) return this.contexts;
    const cfg = this.configReader();
    if (!cfg.bundleId) throw new AppleStoreUnavailableError('APPLE_BUNDLE_ID tanımlı değil.');
    const roots = this.rootCertificates(cfg.rootCaDir);
    const order: AppleEnv[] = cfg.environment === 'SANDBOX' ? ['SANDBOX'] : (cfg.allowTest ? ['PRODUCTION', 'SANDBOX'] : ['PRODUCTION']);
    const key = cfg.privateKeyPath && cfg.issuerId && cfg.keyId ? readFileSync(cfg.privateKeyPath, 'utf8') : '';
    this.contexts = order.map((name) => {
      const environment = name === 'PRODUCTION' ? Environment.PRODUCTION : Environment.SANDBOX;
      if (name === 'PRODUCTION' && cfg.appAppleId === undefined) throw new AppleStoreUnavailableError('APPLE_APP_ID tanımlı değil.');
      const verifier = new SignedDataVerifier(roots, true, environment, cfg.bundleId, name === 'PRODUCTION' ? cfg.appAppleId : undefined);
      const api = key ? new AppStoreServerAPIClient(key, cfg.keyId, cfg.issuerId, cfg.bundleId, environment) : undefined;
      return { name, verifier, api };
    });
    return this.contexts;
  }

  private contextsOrThrow(): EnvContext[] {
    try { return this.build(); }
    catch (error) {
      if (error instanceof AppleStoreUnavailableError) throw error;
      this.logger.error('APPLE_STORE_CONFIG_ERROR');
      throw new AppleStoreUnavailableError('Apple yapılandırması okunamadı.');
    }
  }

  private mapVerification(error: unknown): Error {
    if (error instanceof VerificationException) {
      return error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE
        ? new AppleStoreUnavailableError('Apple doğrulaması geçici olarak yapılamadı.')
        : new AppleSignatureError(`VerificationStatus:${VerificationStatus[error.status] ?? error.status}`);
    }
    return error instanceof Error ? error : new AppleStoreUnavailableError('Bilinmeyen doğrulama hatası.');
  }

  async getTransaction(transactionId: string): Promise<AppleTransactionLookup> {
    const contexts = this.contextsOrThrow();
    for (const context of contexts) {
      if (!context.api) throw new AppleStoreUnavailableError('Apple API anahtarı tanımlı değil.');
      let signed: string | undefined;
      try {
        signed = (await context.api.getTransactionInfo(transactionId)).signedTransactionInfo;
      } catch (error) {
        if (error instanceof APIException) {
          if (error.httpStatusCode === 404) continue; // bu ortamda yok → sıradaki ortam
          this.logger.warn(`APPLE_API_ERROR:${error.httpStatusCode}:${error.apiError ?? ''}`);
          throw new AppleStoreUnavailableError('Apple API isteği başarısız.');
        }
        throw new AppleStoreUnavailableError('Apple API ye ulaşılamadı.');
      }
      if (!signed) throw new AppleSignatureError('İşlem imzası boş.');
      try {
        return { transaction: await context.verifier.verifyAndDecodeTransaction(signed), environment: context.name };
      } catch (error) { throw this.mapVerification(error); }
    }
    throw new AppleTransactionNotFoundError('İşlem bulunamadı.');
  }

  async decodeNotification(signedPayload: string): Promise<AppleDecodedNotification> {
    const contexts = this.contextsOrThrow();
    let last: unknown;
    for (const context of contexts) {
      try {
        const notification = await context.verifier.verifyAndDecodeNotification(signedPayload);
        let transaction: JWSTransactionDecodedPayload | undefined;
        let renewal: JWSRenewalInfoDecodedPayload | undefined;
        if (notification.data?.signedTransactionInfo) transaction = await context.verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
        if (notification.data?.signedRenewalInfo) renewal = await context.verifier.verifyAndDecodeRenewalInfo(notification.data.signedRenewalInfo);
        return { notification, transaction, renewal, environment: context.name };
      } catch (error) {
        last = error;
        if (error instanceof VerificationException && error.status === VerificationStatus.INVALID_ENVIRONMENT) continue;
        throw this.mapVerification(error);
      }
    }
    throw this.mapVerification(last);
  }
}
