import { Injectable } from '@nestjs/common';

import {
  TextSafetyField,
  TextSafetyIssue,
  TextSafetyOptions,
  TextSafetyResult,
  TextSafetySeverity,
} from './text-safety.types';

const ONES = [
  'sıfır',
  'bir',
  'iki',
  'üç',
  'dört',
  'beş',
  'altı',
  'yedi',
  'sekiz',
  'dokuz',
] as const;

const TENS = [
  '',
  'on',
  'yirmi',
  'otuz',
  'kırk',
  'elli',
  'altmış',
  'yetmiş',
  'seksen',
  'doksan',
] as const;

const PROFANITY_WORDS = new Set([
  'amk',
  'aq',
  'aptal',
  'gerizekalı',
  'göt',
  'ibne',
  'kahpe',
  'orospu',
  'pezevenk',
  'piç',
  'pislik',
  'salak',
  'sik',
  'siktir',
  'şerefsiz',
  'yarrak',
]);

const OBFUSCATED_PROFANITY_PATTERNS = [
  /\ba[\s._*+\-/]*m[\s._*+\-/]*[kq]\b/u,
  /\bs[\s._*+\-/]*[iı1!]?[\s._*+\-/]*k[\s._*+\-/]*t[\s._*+\-/]*[iı1!]?[\s._*+\-/]*r\b/u,
  /\bo[\s._*+\-/]*r[\s._*+\-/]*o[\s._*+\-/]*s[\s._*+\-/]*p[\s._*+\-/]*u\b/u,
  /\bş[\s._*+\-/]*e[\s._*+\-/]*r[\s._*+\-/]*e[\s._*+\-/]*f[\s._*+\-/]*s[\s._*+\-/]*i[\s._*+\-/]*z\b/u,
];

const THREAT_PATTERNS = [
  /\böldüreceğim\b/u,
  /\böldürürüm\b/u,
  /\bgebertirim\b/u,
  /\bvuracağım\b/u,
  /\byakacağım\b/u,
  /\bseni bitireceğim\b/u,
];

const TECHNICAL_PASTE_PATTERNS = [
  /\bcd\s+\/var\/www\b/i,
  /\bpm2\s+(?:restart|stop|delete)\b/i,
  /\bgit\s+(?:push|pull|commit|reset)\b/i,
  /\bnpm\s+(?:run|install|build)\b/i,
  /\bsudo\s+/i,
  /\bchmod\s+/i,
];

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

function numberToTurkishWords(value: number): string {
  if (value < 10) {
    return ONES[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;

    return [
      TENS[tens],
      ones > 0 ? ONES[ones] : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  return [
    hundreds === 1 ? 'yüz' : `${ONES[hundreds]} yüz`,
    remainder > 0
      ? numberToTurkishWords(remainder)
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildNumberPhraseMaps() {
  const phraseMap = new Map<string, string>();
  const compactMap = new Map<string, string>();

  for (let value = 0; value <= 999; value += 1) {
    const phrase = numberToTurkishWords(value);
    const digits = String(value);

    phraseMap.set(phrase, digits);
    compactMap.set(phrase.replace(/\s+/g, ''), digits);
  }

  return {
    phraseMap,
    compactMap,
  };
}

const {
  phraseMap: TURKISH_NUMBER_PHRASES,
  compactMap: TURKISH_COMPACT_NUMBER_PHRASES,
} = buildNumberPhraseMaps();

function normalizeMobileCandidate(
  value: string,
): string | null {
  let digits = value.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('90')) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && digits.startsWith('5')) {
    return digits;
  }

  return null;
}

function chunksContainMobileNumber(
  chunks: string[],
): boolean {
  for (let start = 0; start < chunks.length; start += 1) {
    let candidate = '';

    for (
      let end = start;
      end < chunks.length;
      end += 1
    ) {
      candidate += chunks[end];

      if (candidate.length > 12) {
        break;
      }

      if (normalizeMobileCandidate(candidate)) {
        return true;
      }
    }
  }

  return false;
}

function containsWrittenOrMixedPhone(
  value: string,
): boolean {
  const tokens = normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let chunks: string[] = [];

  const flush = () => {
    const detected = chunksContainMobileNumber(chunks);
    chunks = [];
    return detected;
  };

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];

    if (/^\d+$/.test(token)) {
      chunks.push(token);
      index += 1;
      continue;
    }

    let matched = false;

    for (
      let length = Math.min(4, tokens.length - index);
      length >= 1;
      length -= 1
    ) {
      const phrase = tokens
        .slice(index, index + length)
        .join(' ');

      const parsed =
        TURKISH_NUMBER_PHRASES.get(phrase);

      if (parsed !== undefined) {
        chunks.push(parsed);
        index += length;
        matched = true;
        break;
      }
    }

    if (matched) {
      continue;
    }

    const compactParsed =
      TURKISH_COMPACT_NUMBER_PHRASES.get(token);

    if (compactParsed !== undefined) {
      chunks.push(compactParsed);
      index += 1;
      continue;
    }

    if (flush()) {
      return true;
    }

    index += 1;
  }

  return flush();
}

function containsDirectPhone(value: string): boolean {
  const normalized = normalizeText(value);

  const pattern =
    /(?:^|[^\d])(?:\+?90[\s().*_/\\-]*)?0?5\d{2}(?:[\s().*_/\\-]*\d){7}(?:[^\d]|$)/u;

  return pattern.test(normalized);
}

function containsEmail(value: string): boolean {
  const normalized = normalizeText(value);

  const directEmail =
    /\b[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\s*\.\s*[a-z]{2,}\b/i;

  const hiddenEmail =
    /\b[a-z0-9._%+-]+\s+(?:et|at)\s+[a-z0-9.-]+\s+(?:nokta|dot)\s+(?:com|net|org|com\.tr|net\.tr|org\.tr)\b/i;

  return (
    directEmail.test(normalized) ||
    hiddenEmail.test(normalized)
  );
}

function normalizeLinkText(
  value: string,
): string {
  return normalizeText(value)
    .replace(
      /\bh\s*t\s*t\s*p\s*s?\b/gi,
      (match) => match.replace(/\s+/g, ''),
    )
    .replace(
      /\bw\s*w\s*w\b/gi,
      (match) => match.replace(/\s+/g, ''),
    )
    .replace(
      /\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}/g,
      '.',
    )
    .replace(
      /\s+(?:nokta|dot)\s+/g,
      '.',
    )
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*:\s*\/\s*\/\s*/g, '://');
}

function containsLink(value: string): boolean {
  const normalized =
    normalizeLinkText(value);

  const protocolUrl =
    /\b(?:https?|ftp):\/\/[^\s]+/iu;

  const wwwUrl =
    /\bwww\.[^\s]+/iu;

  const bareDomain =
    /\b(?:[a-z0-9çğıöşü](?:[a-z0-9çğıöşü-]{0,61}[a-z0-9çğıöşü])?\.)+(?:com\.tr|net\.tr|org\.tr|gov\.tr|edu\.tr|bel\.tr|com|net|org|io|co|app|dev|site|online|xyz|me|tv|info|biz)(?:\/[^\s]*)?\b/iu;

  const ipUrl =
    /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:\/[^\s]*)?\b/u;

  return (
    protocolUrl.test(normalized) ||
    wwwUrl.test(normalized) ||
    bareDomain.test(normalized) ||
    ipUrl.test(normalized)
  );
}

function normalizeWords(value: string): string[] {
  return normalizeText(value)
    .replace(/0/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/[^a-zçğıöşü]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function containsProfanity(value: string): boolean {
  const normalized = normalizeText(value);
  const words = normalizeWords(value);

  if (
    words.some((word) =>
      PROFANITY_WORDS.has(word),
    )
  ) {
    return true;
  }

  return OBFUSCATED_PROFANITY_PATTERNS.some(
    (pattern) => pattern.test(normalized),
  );
}

function containsThreat(value: string): boolean {
  const normalized = normalizeText(value);

  return THREAT_PATTERNS.some(
    (pattern) => pattern.test(normalized),
  );
}

function containsSpamRepetition(
  value: string,
): boolean {
  const normalized = normalizeText(value);

  if (/(.)\1{7,}/u.test(normalized)) {
    return true;
  }

  const words = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (let index = 0; index <= words.length - 5; index += 1) {
    const group = words.slice(index, index + 5);

    if (group.every((word) => word === group[0])) {
      return true;
    }
  }

  return false;
}

function containsTechnicalPaste(
  value: string,
): boolean {
  return TECHNICAL_PASTE_PATTERNS.some(
    (pattern) => pattern.test(value),
  );
}

@Injectable()
export class TextSafetyService {
  validate(
    value: unknown,
    options: TextSafetyOptions,
  ): TextSafetyResult {
    const text = String(value ?? '');
    const issues: TextSafetyIssue[] = [];

    const addIssue = (
      code: string,
      severity: TextSafetySeverity,
      message: string,
    ) => {
      if (issues.some((issue) => issue.code === code)) {
        return;
      }

      issues.push({
        code,
        field: options.field,
        severity,
        blocking:
          severity === TextSafetySeverity.ERROR,
        message,
      });
    };

    if (
      options.blockContact &&
      (
        containsDirectPhone(text) ||
        containsWrittenOrMixedPhone(text)
      )
    ) {
      addIssue(
        'PHONE_NUMBER_DETECTED',
        TextSafetySeverity.ERROR,
        'Herkese açık metinlerde telefon veya WhatsApp numarası kullanılamaz. İletişim EPH üzerinden yürütülmelidir.',
      );
    }

    if (
      options.blockContact &&
      containsEmail(text)
    ) {
      addIssue(
        'EMAIL_ADDRESS_DETECTED',
        TextSafetySeverity.ERROR,
        'Herkese açık metinlerde e-posta adresi kullanılamaz. İletişim EPH üzerinden yürütülmelidir.',
      );
    }

    if (
      options.blockLinks &&
      containsLink(text)
    ) {
      addIssue(
        'PUBLIC_LINK_DETECTED',
        TextSafetySeverity.ERROR,
        'Herkese açık metinlerde bağlantı veya internet adresi kullanılamaz.',
      );
    }

    if (
      options.blockProfanity !== false &&
      containsProfanity(text)
    ) {
      addIssue(
        'PROFANITY_DETECTED',
        TextSafetySeverity.ERROR,
        'Bu metin küfür, hakaret veya uygunsuz ifade içeriyor. Lütfen metni düzenleyin.',
      );
    }

    if (
      options.blockThreat !== false &&
      containsThreat(text)
    ) {
      addIssue(
        'THREAT_LANGUAGE_DETECTED',
        TextSafetySeverity.ERROR,
        'Tehdit içeren ifadeler EPH üzerinde kullanılamaz.',
      );
    }

    if (
      options.detectSpam !== false &&
      containsSpamRepetition(text)
    ) {
      addIssue(
        'SPAM_REPETITION_DETECTED',
        TextSafetySeverity.WARNING,
        'Metinde olağan dışı tekrarlar bulunuyor. Daha açık ve profesyonel bir ifade kullanın.',
      );
    }

    if (
      options.detectTechnicalPaste &&
      containsTechnicalPaste(text)
    ) {
      addIssue(
        'TECHNICAL_PASTE_DETECTED',
        TextSafetySeverity.WARNING,
        'Metne teknik komut yapıştırılmış görünüyor. Açıklamayı kontrol edin.',
      );
    }

    const errors = issues.filter(
      (issue) => issue.blocking,
    );

    const warnings = issues.filter(
      (issue) => !issue.blocking,
    );

    return {
      valid: errors.length === 0,
      issues,
      errors,
      warnings,
    };
  }

  validatePublicTitle(
    value: unknown,
  ): TextSafetyResult {
    return this.validate(value, {
      field: TextSafetyField.PUBLIC_TITLE,
      blockContact: true,
      blockLinks: true,
      blockProfanity: true,
      blockThreat: true,
      detectSpam: true,
      detectTechnicalPaste: false,
    });
  }

  validatePublicDescription(
    value: unknown,
  ): TextSafetyResult {
    return this.validate(value, {
      field:
        TextSafetyField.PUBLIC_DESCRIPTION,
      blockContact: true,
      blockLinks: true,
      blockProfanity: true,
      blockThreat: true,
      detectSpam: true,
      detectTechnicalPaste: true,
    });
  }
}
