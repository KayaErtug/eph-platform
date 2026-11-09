import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ContactRateLimiter } from './contact-rate-limiter';
import { ContactService, validateContactBody } from './contact.service';

const MAX_BODY_BYTES = 4 * 1024;

@Controller('public')
export class ContactController {
  private readonly limiter = new ContactRateLimiter(5, 60 * 60 * 1000);

  constructor(private readonly contactService: ContactService) {}

  /** Nginx arkasında: proxy'nin eklediği son X-Forwarded-For girdisi. */
  private clientKey(req: any): string {
    const xff = req?.headers?.['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    if (typeof raw === 'string' && raw.trim()) {
      const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
    return req?.socket?.remoteAddress || req?.ip || 'unknown';
  }

  @Post('contact')
  @HttpCode(200)
  async contact(@Body() body: any, @Req() req: any) {
    const declared = Number(req?.headers?.['content-length'] || 0);
    if (
      declared > MAX_BODY_BYTES ||
      JSON.stringify(body ?? {}).length > MAX_BODY_BYTES
    ) {
      throw new HttpException(
        { error: 'PAYLOAD_TOO_LARGE' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (!this.limiter.consume(this.clientKey(req))) {
      throw new HttpException(
        { error: 'RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Bot tuzağı: dolu ise başarılı gibi dön, e-posta gönderme.
    if (typeof body?.website === 'string' && body.website.trim() !== '') {
      return { ok: true };
    }

    if (!this.contactService.isConfigured()) {
      throw new HttpException(
        { error: 'CONTACT_UNAVAILABLE' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const result = validateContactBody(body);
    if (result.ok === false) {
      throw new HttpException(
        { error: 'VALIDATION_ERROR', fields: result.fields },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.contactService.send(result.value);
    } catch {
      throw new HttpException(
        { error: 'CONTACT_UNAVAILABLE' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { ok: true };
  }
}
