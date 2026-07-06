import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabase: SupabaseClient;
  private readonly writeAuthMode: 'service-role' | 'anon';

  constructor() {
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
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  getImageDomainUrl(path: string) {
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
