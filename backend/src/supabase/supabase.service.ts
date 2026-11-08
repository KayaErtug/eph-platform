import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  LocalStorageDriver,
  StoragePathError,
  readLocalStorageConfig,
} from './local-storage.driver';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabase!: SupabaseClient;
  private readonly writeAuthMode: 'service-role' | 'anon' | 'local' =
    'local';
  /** STORAGE_DRIVER=local ise dolu; yoksa (varsayılan supabase) null. */
  readonly local: LocalStorageDriver | null = null;

  constructor() {
    const driverName = String(process.env.STORAGE_DRIVER || 'local')
      .trim()
      .toLowerCase();

    if (driverName !== 'local' && driverName !== 'supabase') {
      throw new Error(
        `STORAGE_DRIVER geçersiz: "${driverName}" (local | supabase).`,
      );
    }

    this.local = new LocalStorageDriver(readLocalStorageConfig());

    if (driverName === 'local') {
      this.logger.log('Dosya depolama sürücüsü: local');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ws = require('ws');

    const supabaseUrl = String(
      process.env.SUPABASE_URL || '',
    ).trim();
    const serviceRoleKey = String(
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    ).trim();
    const anonKey = String(
      process.env.SUPABASE_ANON_KEY || '',
    ).trim();
    const selectedKey = serviceRoleKey || anonKey;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL tanımlı değil.');
    }

    if (!selectedKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_ANON_KEY tanımlı değil.',
      );
    }

    this.writeAuthMode = serviceRoleKey
      ? 'service-role'
      : 'anon';

    if (this.writeAuthMode === 'anon') {
      this.logger.warn(
        'Supabase Storage yazma işlemleri ANON key ile çalışıyor. ' +
          'RLS hatası oluşursa backend .env içine SUPABASE_SERVICE_ROLE_KEY eklenmelidir.',
      );
    }

    this.supabase = createClient(
      supabaseUrl,
      selectedKey,
      {
        realtime: {
          transport: ws,
        },
      },
    );
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    mimetype: string,
  ) {
    if (this.local) {
      return this.local.write(bucket, path, file);
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data, error } = await this.supabase.storage
          .from(bucket)
          .upload(path, file, {
            contentType: mimetype,
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          throw error;
        }

        return data;
      } catch (error) {
        lastError = error;
        if (this.isQuotaOrRestrictedError(error) && this.local) {
          this.logger.warn(
            `Supabase kotası aşıldı/kısıtlandı (402), dosya otomatik olarak yerel depolamaya (local driver) kaydediliyor: ${bucket}/${path}`,
          );
          return this.local.write(bucket, path, file);
        }
        const message = this.storageErrorMessage(
          error,
          bucket,
          path,
        );

        this.logger.error(
          `Supabase yükleme denemesi ${attempt}/${maxAttempts} başarısız: ${message}`,
        );

        if (
          attempt >= maxAttempts ||
          !this.isTransientStorageError(error)
        ) {
          throw new Error(message);
        }

        await this.wait(700 * attempt);
      }
    }

    throw new Error(
      this.storageErrorMessage(lastError, bucket, path),
    );
  }

  async removeFile(bucket: string, paths: string[]) {
    if (this.local) {
      const removed: { name: string }[] = [];

      for (const stored of paths) {
        let rel: string;

        try {
          rel = this.resolveStoragePath(bucket, stored);
        } catch {
          // Eski Supabase kaydı / tanınmayan değer: sessizce geç.
          continue;
        }

        try {
          await this.local.remove(bucket, rel);
          removed.push({ name: rel });
        } catch (error) {
          if (!(error instanceof StoragePathError)) {
            throw error;
          }
          // Geçersiz/kök dışı yol: silinecek dosya yok sayılır.
        }
      }

      return removed;
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new Error(
        this.storageErrorMessage(
          error,
          bucket,
          paths.join(', '),
        ),
      );
    }

    return data;
  }

  getPublicUrl(bucket: string, path: string) {
    if (this.local) {
      return this.local.publicUrl(bucket, path);
    }

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }


  resolveStoragePath(bucket: string, storedValue: string) {
    const raw = String(storedValue || '').trim();

    if (!raw) {
      throw new Error('Storage dosya yolu boş olamaz.');
    }

    if (!/^https?:\/\//i.test(raw)) {
      return raw.replace(/^\/+/, '');
    }

    let url: URL;

    try {
      url = new URL(raw);
    } catch {
      throw new Error('Geçersiz Storage URL değeri.');
    }

    if (this.local) {
      const localPath = this.local.pathFromLocalUrl(bucket, url);

      if (localPath) {
        return localPath;
      }
    }

    const encodedBucket = encodeURIComponent(bucket);

    const markers = [
      `/storage/v1/object/public/${encodedBucket}/`,
      `/storage/v1/object/sign/${encodedBucket}/`,
      `/storage/v1/object/authenticated/${encodedBucket}/`,
    ];

    for (const markerValue of markers) {
      const index = url.pathname.indexOf(markerValue);

      if (index >= 0) {
        const encodedPath = url.pathname.slice(
          index + markerValue.length,
        );

        const decodedPath = decodeURIComponent(encodedPath)
          .replace(/^\/+/, '')
          .trim();

        if (!decodedPath) {
          break;
        }

        return decodedPath;
      }
    }

    throw new Error(
      `Storage URL "${bucket}" bucket yolu ile eşleşmiyor.`,
    );
  }

  async createSignedUrl(
    bucket: string,
    storedValue: string,
    expiresInSeconds = 300,
  ) {
    const path = this.resolveStoragePath(
      bucket,
      storedValue,
    );

    const safeExpiresIn = Math.max(
      30,
      Math.min(
        3600,
        Math.floor(Number(expiresInSeconds) || 300),
      ),
    );

    if (this.local && (!this.supabase || (await this.local.exists(bucket, path)))) {
      if (!this.local.isPrivateBucket(bucket)) {
        return this.local.publicUrl(bucket, path);
      }
      return this.local.signedUrl(bucket, path, safeExpiresIn);
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(
        path,
        safeExpiresIn,
      );

    if (error || !data?.signedUrl) {
      throw new Error(
        this.storageErrorMessage(
          error || 'Signed URL üretilemedi',
          bucket,
          path,
        ),
      );
    }

    return data.signedUrl;
  }

  getImageDomainUrl(path: string, bucket?: string) {
    if (this.local) {
      return this.local.publicUrl(
        bucket || process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images',
        path,
      );
    }

    const baseUrl =
      process.env.IMAGE_PUBLIC_BASE_URL ||
      'https://image.emlakportfoyhavuzu.com';

    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private storageErrorMessage(
    error: unknown,
    bucket: string,
    path: string,
  ) {
    const record =
      error && typeof error === 'object'
        ? (error as Record<string, unknown>)
        : {};
    const rawMessage =
      error instanceof Error
        ? error.message
        : String(record.message || error || 'Bilinmeyen hata');
    const statusCode = String(
      record.statusCode ||
        record.status ||
        record.error ||
        '',
    ).trim();
    const normalized = rawMessage.toLocaleLowerCase('tr-TR');
    let hint = '';

    if (
      normalized.includes('row-level security') ||
      normalized.includes('rls') ||
      normalized.includes('unauthorized') ||
      normalized.includes('not authorized')
    ) {
      hint =
        ' Backend .env içinde geçerli SUPABASE_SERVICE_ROLE_KEY bulunmalı; ANON key Storage yazma işlemi için yeterli olmayabilir.';
    } else if (
      normalized.includes('bucket') &&
      normalized.includes('not found')
    ) {
      hint =
        ` Supabase Storage içinde "${bucket}" bucket'ının bulunduğunu kontrol edin.`;
    } else if (
      normalized.includes('maximum allowed size') ||
      normalized.includes('payload too large') ||
      normalized.includes('too large')
    ) {
      hint =
        ' Supabase bucket dosya boyutu limitini ve yüklenen görsel boyutunu kontrol edin.';
    }

    return (
      `Supabase Storage hatası` +
      `${statusCode ? ` [${statusCode}]` : ''}: ${rawMessage}. ` +
      `Kimlik doğrulama: ${this.writeAuthMode}; ` +
      `bucket: ${bucket}; path: ${path}.${hint}`
    );
  }

  private isQuotaOrRestrictedError(error: unknown): boolean {
    const msg = String((error as any)?.message || error || '').toLowerCase();
    const status = (error as any)?.status || (error as any)?.statusCode;
    return (
      status === 402 ||
      msg.includes('402') ||
      msg.includes('quota') ||
      msg.includes('restricted') ||
      msg.includes('exceed') ||
      msg.includes('violation')
    );
  }

  private isTransientStorageError(error: unknown) {
    const record =
      error && typeof error === 'object'
        ? (error as Record<string, unknown>)
        : {};
    const message = String(
      error instanceof Error
        ? error.message
        : record.message || error || '',
    ).toLocaleLowerCase('tr-TR');
    const status = Number(
      record.statusCode || record.status || 0,
    );

    return (
      status === 408 ||
      status === 425 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      message.includes('fetch failed') ||
      message.includes('network') ||
      message.includes('socket') ||
      message.includes('timeout') ||
      message.includes('temporarily unavailable') ||
      message.includes('unexpected end')
    );
  }

  private wait(milliseconds: number) {
    return new Promise((resolve) =>
      setTimeout(resolve, milliseconds),
    );
  }
}
