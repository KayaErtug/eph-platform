import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ws = require('ws');

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY!,
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
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async removeFile(bucket: string, paths: string[]) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new Error(error.message);
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
}