import { config } from './config.mjs';

export class HttpError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'HttpError';
    this.details = details;
  }
}

export async function apiRequest(pathname, options = {}) {
  const {
    token = config.token,
    method = 'GET',
    body,
    expectedStatus = [200, 201],
    timeoutMs = config.requestTimeoutMs,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  const url = `${config.baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }

    const result = {
      method,
      pathname,
      status: response.status,
      ok: response.ok,
      elapsedMs,
      data,
    };

    if (!expectedStatus.includes(response.status)) {
      throw new HttpError(`${method} ${pathname} beklenmeyen durum kodu döndürdü: ${response.status}`, result);
    }

    return result;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new HttpError(`${method} ${pathname} ${timeoutMs} ms içinde tamamlanmadı.`, {
        method,
        pathname,
        timeoutMs,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function assertNoPersonalData(value, label = 'yanıt') {
  const text = JSON.stringify(value ?? {}).toLocaleLowerCase('tr-TR');
  const forbiddenKeys = ['phone', 'telefon', 'email', 'e-posta', 'eposta'];
  const found = forbiddenKeys.filter((key) => text.includes(`"${key}"`));
  if (found.length) {
    throw new Error(`${label} kişisel veri alanı içeriyor: ${found.join(', ')}`);
  }
}
