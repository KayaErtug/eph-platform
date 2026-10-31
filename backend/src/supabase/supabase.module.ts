import { Global, Module } from '@nestjs/common';
import { PrivateFilesController } from './private-files.controller';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  controllers: [PrivateFilesController],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}