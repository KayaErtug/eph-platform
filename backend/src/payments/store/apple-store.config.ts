// ODM-3: Apple mağaza ayarları. Yalnız ortam değişkeni ADLARI okunur; değerler koda/loga/yanıta yazılmaz.
export type AppleEnvironment = 'PRODUCTION' | 'SANDBOX';

export interface AppleStoreConfig {
  /** STORE_PAYMENTS_ENABLED (varsayılan false). Kapalıyken doğrulama hak vermez; bildirimler yalnız kaydedilir. */
  enabled: boolean;
  /** STORE_ALLOW_TEST_PURCHASES. Sandbox işlemleri yalnız hesapTuru=TEST hesaba hak verir. */
  allowTest: boolean;
  /** APPLE_ENVIRONMENT: PRODUCTION (varsayılan) | SANDBOX */
  environment: AppleEnvironment;
  /** APPLE_BUNDLE_ID */
  bundleId: string;
  /** APPLE_ISSUER_ID */
  issuerId: string;
  /** APPLE_KEY_ID */
  keyId: string;
  /** APPLE_PRIVATE_KEY_PATH (dosya yolu; içeriği yalnız istemci oluşturulurken okunur) */
  privateKeyPath: string;
  /** APPLE_APP_ID (Production doğrulaması için sayısal uygulama kimliği; sözleşme §8) */
  appAppleId?: number;
  /** APPLE_ROOT_CA_DIR (Apple kök sertifikaları; sözleşme §8) */
  rootCaDir: string;
}

const flag = (value: string | undefined): boolean => String(value ?? '').trim().toLowerCase() === 'true';

export function readAppleStoreConfig(env: NodeJS.ProcessEnv = process.env): AppleStoreConfig {
  const rawApp = String(env.APPLE_APP_ID ?? '').trim();
  const appAppleId = /^\d{1,15}$/.test(rawApp) ? Number(rawApp) : undefined;
  return {
    enabled: flag(env.STORE_PAYMENTS_ENABLED),
    allowTest: flag(env.STORE_ALLOW_TEST_PURCHASES),
    environment: String(env.APPLE_ENVIRONMENT ?? '').trim().toUpperCase() === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION',
    bundleId: String(env.APPLE_BUNDLE_ID ?? '').trim(),
    issuerId: String(env.APPLE_ISSUER_ID ?? '').trim(),
    keyId: String(env.APPLE_KEY_ID ?? '').trim(),
    privateKeyPath: String(env.APPLE_PRIVATE_KEY_PATH ?? '').trim(),
    appAppleId,
    rootCaDir: String(env.APPLE_ROOT_CA_DIR ?? '').trim(),
  };
}
