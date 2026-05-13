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
      process.env.SUPABASE_ANON_KEY!,
      {
        realtime: {
          transport: ws,
        },
      }
    );
  }

  async uploadFile(bucket: string, path: string, file: Buffer, mimetype: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: mimetype, upsert: true });
    if (error) throw new Error(error.message);
    return data;
  }

  getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}