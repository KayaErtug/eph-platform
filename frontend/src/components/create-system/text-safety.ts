export type EPHTextSafetyIssue = {
  code: string;
  blocking: boolean;
  message: string;
};

export type EPHTextSafetyResult = {
  valid: boolean;
  issues: EPHTextSafetyIssue[];
};

const ONES = [
  "sıfır",
  "bir",
  "iki",
  "üç",
  "dört",
  "beş",
  "altı",
  "yedi",
  "sekiz",
  "dokuz",
] as const;

const TENS = [
  "",
  "on",
  "yirmi",
  "otuz",
  "kırk",
  "elli",
  "altmış",
  "yetmiş",
  "seksen",
  "doksan",
] as const;

const PROFANITY_WORDS = new Set([
  "amk",
  "aq",
  "aptal",
  "gerizekalı",
  "göt",
  "ibne",
  "kahpe",
  "orospu",
  "pezevenk",
  "piç",
  "pislik",
  "salak",
  "sik",
  "siktir",
  "şerefsiz",
  "yarrak",
]);

const OBFUSCATED_PROFANITY_PATTERNS = [
  /\ba[\s._*+\-/]*m[\s._*+\-/]*[kq]\b/u,
  /\bs[\s._*+\-/]*[iı1!]?[\s._*+\-/]*k[\s._*+\-/]*t[\s._*+\-/]*[iı1!]?[\s._*+\-/]*r\b/u,
  /\bo[\s._*+\-/]*r[\s._*+\-/]*o[\s._*+\-/]*s[\s._*+\-/]*p[\s._*+\-/]*u\b/u,
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

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function numberToTurkishWords(
  value: number,
): string {
  if (value < 10) {
    return ONES[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;

    return [
      TENS[tens],
      ones > 0 ? ONES[ones] : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  return [
    hundreds === 1
      ? "yüz"
      : `${ONES[hundreds]} yüz`,
    remainder > 0
      ? numberToTurkishWords(remainder)
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildNumberPhraseMaps() {
  const phrases = new Map<string, string>();
  const compact = new Map<string, string>();

  for (let value = 0; value <= 999; value += 1) {
    const phrase = numberToTurkishWords(value);
    const digits = String(value);

    phrases.set(phrase, digits);
    compact.set(
      phrase.replace(/\s+/g, ""),
      digits,
    );
  }

  return { phrases, compact };
}

const {
  phrases: NUMBER_PHRASES,
  compact: COMPACT_NUMBER_PHRASES,
} = buildNumberPhraseMaps();

function normalizeMobileCandidate(
  value: string,
) {
  let digits = value.replace(/\D/g, "");

  if (
    digits.length === 12 &&
    digits.startsWith("90")
  ) {
    digits = digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = digits.slice(1);
  }

  return (
    digits.length === 10 &&
    digits.startsWith("5")
  );
}

function chunksContainMobileNumber(
  chunks: string[],
) {
  for (
    let start = 0;
    start < chunks.length;
    start += 1
  ) {
    let candidate = "";

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
) {
  const tokens = normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  let chunks: string[] = [];

  const flush = () => {
    const found =
      chunksContainMobileNumber(chunks);

    chunks = [];
    return found;
  };

  for (
    let index = 0;
    index < tokens.length;
  ) {
    const token = tokens[index];

    if (/^\d+$/.test(token)) {
      chunks.push(token);
      index += 1;
      continue;
    }

    let matched = false;

    for (
      let length = Math.min(
        4,
        tokens.length - index,
      );
      length >= 1;
      length -= 1
    ) {
      const phrase = tokens
        .slice(index, index + length)
        .join(" ");

      const parsed =
        NUMBER_PHRASES.get(phrase);

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
      COMPACT_NUMBER_PHRASES.get(token);

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

function containsDirectPhone(value: string) {
  return /(?:^|[^\d])(?:\+?90[\s().*_/\\-]*)?0?5\d{2}(?:[\s().*_/\\-]*\d){7}(?:[^\d]|$)/u.test(
    normalizeText(value),
  );
}

function containsEmail(value: string) {
  const normalized = normalizeText(value);

  return (
    /\b[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\s*\.\s*[a-z]{2,}\b/i.test(
      normalized,
    ) ||
    /\b[a-z0-9._%+-]+\s+(?:et|at)\s+[a-z0-9.-]+\s+(?:nokta|dot)\s+(?:com|net|org|com\.tr|net\.tr|org\.tr)\b/i.test(
      normalized,
    )
  );
}

function normalizeLinkText(
  value: string,
) {
  return normalizeText(value)
    .replace(
      /\bh\s*t\s*t\s*p\s*s?\b/gi,
      (match) => match.replace(/\s+/g, ""),
    )
    .replace(
      /\bw\s*w\s*w\b/gi,
      (match) => match.replace(/\s+/g, ""),
    )
    .replace(
      /\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}/g,
      ".",
    )
    .replace(
      /\s+(?:nokta|dot)\s+/g,
      ".",
    )
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*:\s*\/\s*\/\s*/g, "://");
}

function containsLink(value: string) {
  const normalized =
    normalizeLinkText(value);

  return (
    /\b(?:https?|ftp):\/\/[^\s]+/iu.test(
      normalized,
    ) ||
    /\bwww\.[^\s]+/iu.test(normalized) ||
    /\b(?:[a-z0-9çğıöşü](?:[a-z0-9çğıöşü-]{0,61}[a-z0-9çğıöşü])?\.)+(?:com\.tr|net\.tr|org\.tr|gov\.tr|edu\.tr|bel\.tr|com|net|org|io|co|app|dev|site|online|xyz|me|tv|info|biz)(?:\/[^\s]*)?\b/iu.test(
      normalized,
    ) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:\/[^\s]*)?\b/u.test(
      normalized,
    )
  );
}

function containsProfanity(value: string) {
  const normalized = normalizeText(value);

  const words = normalized
    .replace(/0/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/[^a-zçğıöşü]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

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

function containsThreat(value: string) {
  const normalized = normalizeText(value);

  return THREAT_PATTERNS.some(
    (pattern) => pattern.test(normalized),
  );
}

function containsSpam(value: string) {
  return /(.)\1{7,}/u.test(
    normalizeText(value),
  );
}

function containsTechnicalPaste(value: string) {
  return TECHNICAL_PASTE_PATTERNS.some(
    (pattern) => pattern.test(value),
  );
}

function validateText(
  value: unknown,
  options: {
    contact: boolean;
    link: boolean;
    technicalPaste: boolean;
  },
): EPHTextSafetyResult {
  const text = String(value ?? "");
  const issues: EPHTextSafetyIssue[] = [];

  const add = (
    code: string,
    blocking: boolean,
    message: string,
  ) => {
    if (
      issues.some((issue) => issue.code === code)
    ) {
      return;
    }

    issues.push({
      code,
      blocking,
      message,
    });
  };

  if (
    options.contact &&
    (
      containsDirectPhone(text) ||
      containsWrittenOrMixedPhone(text)
    )
  ) {
    add(
      "PHONE_NUMBER_DETECTED",
      true,
      "Herkese açık metinlerde telefon veya WhatsApp numarası kullanılamaz. İletişim EPH üzerinden yürütülmelidir.",
    );
  }

  if (
    options.contact &&
    containsEmail(text)
  ) {
    add(
      "EMAIL_ADDRESS_DETECTED",
      true,
      "Herkese açık metinlerde e-posta adresi kullanılamaz. İletişim EPH üzerinden yürütülmelidir.",
    );
  }

  if (
    options.link &&
    containsLink(text)
  ) {
    add(
      "PUBLIC_LINK_DETECTED",
      true,
      "Herkese açık metinlerde bağlantı veya internet adresi kullanılamaz.",
    );
  }

  if (containsProfanity(text)) {
    add(
      "PROFANITY_DETECTED",
      true,
      "Bu metin küfür, hakaret veya uygunsuz ifade içeriyor. Lütfen metni düzenleyin.",
    );
  }

  if (containsThreat(text)) {
    add(
      "THREAT_LANGUAGE_DETECTED",
      true,
      "Tehdit içeren ifadeler EPH üzerinde kullanılamaz.",
    );
  }

  if (containsSpam(text)) {
    add(
      "SPAM_REPETITION_DETECTED",
      false,
      "Metinde olağan dışı tekrarlar bulunuyor.",
    );
  }

  if (
    options.technicalPaste &&
    containsTechnicalPaste(text)
  ) {
    add(
      "TECHNICAL_PASTE_DETECTED",
      false,
      "Metne teknik komut yapıştırılmış görünüyor.",
    );
  }

  return {
    valid: !issues.some(
      (issue) => issue.blocking,
    ),
    issues,
  };
}

export function validateEPHPublicTitle(
  value: unknown,
) {
  return validateText(value, {
    contact: true,
    link: true,
    technicalPaste: false,
  });
}

export function validateEPHPublicDescription(
  value: unknown,
) {
  return validateText(value, {
    contact: true,
    link: true,
    technicalPaste: true,
  });
}

export function getFirstBlockingTextSafetyMessage(
  result: EPHTextSafetyResult,
): string | null {
  return (
    result.issues.find(
      (issue) => issue.blocking,
    )?.message ?? null
  );
}
