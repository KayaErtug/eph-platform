import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { mimeFromPath, StoragePathError } from './local-storage.driver';
import { SupabaseService } from './supabase.service';

/**
 * STORAGE_DRIVER=local iken gizli dosyalar için süreli HMAC imzalı indirme.
 * Tam yol: GET /files/private/:bucket/<dosya yolu>?exp=<unix sn>&sig=<imza>
 */
@Controller('files/private')
export class PrivateFilesController {
  constructor(private readonly storage: SupabaseService) {}

  @Get(':bucket/*path')
  download(
    @Param('bucket') bucket: string,
    @Param('path') pathParam: string | string[],
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const local = this.storage.local;

    if (!local) {
      throw new NotFoundException();
    }

    const rel = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    let filePath: string;

    try {
      filePath = local.verifySignedRequest(bucket, rel, exp, sig);
    } catch (error) {
      if (error instanceof StoragePathError) {
        throw new ForbiddenException('Bağlantı geçersiz veya süresi dolmuş.');
      }
      throw error;
    }

    res.setHeader('Content-Type', mimeFromPath(filePath));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    return res.sendFile(filePath, { dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'Dosya bulunamadı.' });
      }
    });
  }
}
