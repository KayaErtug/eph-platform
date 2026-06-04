import { Injectable } from '@nestjs/common';

export type LinaKvkkFilterResult = {
  safeText: string;
  filtered: boolean;
  detectedTypes: string[];
};

@Injectable()
export class LinaKvkkService {
  filterText(text: string, options?: { strictVoiceMode?: boolean }): LinaKvkkFilterResult {
    let safeText = String(text || '');
    const detectedTypes = new Set<string>();

    const replacements: Array<{
      type: string;
      regex: RegExp;
      replacement: string;
    }> = [
      {
        type: 'phone',
        regex: /(\+90|0)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
        replacement: '[telefon bilgisi gizlendi]',
      },
      {
        type: 'email',
        regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        replacement: '[e-posta bilgisi gizlendi]',
      },
      {
        type: 'iban',
        regex: /TR\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{2}/gi,
        replacement: '[IBAN bilgisi gizlendi]',
      },
      {
        type: 'tcKimlik',
        regex: /\b[1-9]\d{10}\b/g,
        replacement: '[kimlik bilgisi gizlendi]',
      },
      {
        type: 'apiKey',
        regex: /\b(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,})\b/g,
        replacement: '[gizli anahtar bilgisi gizlendi]',
      },
      {
        type: 'token',
        regex: /\b(?:access_token|refresh_token|token|api_key|apikey)\s*[:=]\s*["']?[^"'\s]{12,}/gi,
        replacement: '[gizli erişim bilgisi gizlendi]',
      },
    ];

    for (const item of replacements) {
      if (item.regex.test(safeText)) {
        detectedTypes.add(item.type);
        safeText = safeText.replace(item.regex, item.replacement);
      }
    }

    if (options?.strictVoiceMode) {
      safeText = safeText
        .replace(/\b(açık adres|adres|kapı no|daire no)\b/gi, '[adres detayı gizlendi]')
        .replace(/\b(pazarlık|komisyon|özel not|müşteri notu)\b/gi, '[hassas detay gizlendi]');
    }

    return {
      safeText,
      filtered: detectedTypes.size > 0 || safeText !== String(text || ''),
      detectedTypes: Array.from(detectedTypes),
    };
  }

  getKvkkRefusalMessage(): string {
    return 'KVKK ve platform güvenliği gereği bu bilgiyi paylaşamam.';
  }
}