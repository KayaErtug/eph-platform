import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
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