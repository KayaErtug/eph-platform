import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ResolveMapLocationResult = Coordinates & {
  success: true;
  resolvedUrl: string | null;
};

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 1_000_000;

@Injectable()
export class MapsService {
  async resolveSharedLocation(
    rawValue: unknown,
  ): Promise<ResolveMapLocationResult> {
    const value = String(rawValue ?? '').trim();

    if (!value) {
      throw new BadRequestException(
        'Konum bağlantısı veya koordinat bilgisi girin.',
      );
    }

    const directCoordinates = this.parseCoordinatesFromValue(value);
    const sharedUrl = this.extractFirstUrl(value);

    if (directCoordinates) {
      return {
        success: true,
        ...directCoordinates,
        resolvedUrl: sharedUrl || null,
      };
    }

    if (!sharedUrl) {
      throw new BadRequestException(
        'Geçerli bir Google Maps, Apple Maps veya koordinat bağlantısı bulunamadı.',
      );
    }

    const initialUrl = this.createAllowedUrl(sharedUrl);
    const urlCoordinates = this.parseCoordinatesFromValue(
      initialUrl.toString(),
    );

    if (urlCoordinates) {
      return {
        success: true,
        ...urlCoordinates,
        resolvedUrl: initialUrl.toString(),
      };
    }

    const resolution = await this.resolveAllowedUrl(initialUrl);

    const resolvedCoordinates =
      this.parseCoordinatesFromValue(resolution.finalUrl) ||
      this.parseCoordinatesFromValue(resolution.html);

    if (!resolvedCoordinates) {
      throw new UnprocessableEntityException(
        'Paylaşılan bağlantı çözüldü ancak koordinat bilgisi bulunamadı.',
      );
    }

    return {
      success: true,
      ...resolvedCoordinates,
      resolvedUrl: resolution.finalUrl,
    };
  }

  private createCoordinates(
    latitudeValue: string,
    longitudeValue: string,
  ): Coordinates | null {
    const latitude = Number(latitudeValue.replace(',', '.'));
    const longitude = Number(longitudeValue.replace(',', '.'));

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }

  private decodeSafely(value: string): string {
    let current = value;

    for (let index = 0; index < 3; index += 1) {
      try {
        const decoded = decodeURIComponent(current);

        if (decoded === current) {
          break;
        }

        current = decoded;
      } catch {
        break;
      }
    }

    return current;
  }

  private extractFirstUrl(value: string): string {
    const match = value.match(/https?:\/\/[^\s<>"']+/i);

    return String(match?.[0] || '')
      .replace(/[),.;]+$/g, '')
      .trim();
  }

  private parseCoordinatesFromValue(value: string): Coordinates | null {
    const decoded = this.decodeSafely(value)
      .replace(/\\u0026/gi, '&')
      .replace(/&amp;/gi, '&');

    const patterns = [
      /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|z|\/|$)/i,
      /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i,
      /(?:q|query|ll|sll|center|destination|daddr)[=:]\s*(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/i,
      /(?:latitude|lat)[=:]\s*(-?\d{1,3}(?:\.\d+)?)[,\s;&]+(?:longitude|lng|lon)[=:]\s*(-?\d{1,3}(?:\.\d+)?)/i,
      /^\s*(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)\s*$/,
    ];

    for (const pattern of patterns) {
      const match = decoded.match(pattern);

      if (!match) {
        continue;
      }

      const coordinates = this.createCoordinates(match[1], match[2]);

      if (coordinates) {
        return coordinates;
      }
    }

    return null;
  }

  private isAllowedMapHost(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase();

    return (
      normalizedHostname === 'google.com' ||
      normalizedHostname.endsWith('.google.com') ||
      normalizedHostname === 'google.com.tr' ||
      normalizedHostname.endsWith('.google.com.tr') ||
      normalizedHostname === 'goo.gl' ||
      normalizedHostname.endsWith('.goo.gl') ||
      normalizedHostname === 'maps.apple.com'
    );
  }

  private createAllowedUrl(value: string, baseUrl?: URL): URL {
    let parsedUrl: URL;

    try {
      parsedUrl = baseUrl ? new URL(value, baseUrl) : new URL(value);
    } catch {
      throw new BadRequestException('Konum bağlantısı geçerli değil.');
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      !this.isAllowedMapHost(parsedUrl.hostname)
    ) {
      throw new BadRequestException(
        'Yalnızca Google Maps ve Apple Maps konum bağlantıları desteklenir.',
      );
    }

    return parsedUrl;
  }

  private async resolveAllowedUrl(
    initialUrl: URL,
  ): Promise<{ finalUrl: string; html: string }> {
    let currentUrl = initialUrl;

    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount += 1
    ) {
      const response = await this.fetchWithTimeout(currentUrl);

      if (response.status >= 300 && response.status < 400) {
        const redirectLocation = response.headers.get('location');

        if (!redirectLocation) {
          throw new UnprocessableEntityException(
            'Konum bağlantısının yönlendirme adresi bulunamadı.',
          );
        }

        currentUrl = this.createAllowedUrl(
          redirectLocation,
          currentUrl,
        );

        continue;
      }

      if (!response.ok) {
        throw new UnprocessableEntityException(
          `Konum bağlantısı ${response.status} durum koduyla yanıt verdi.`,
        );
      }

      const html = await this.readLimitedResponse(response);

      return {
        finalUrl: currentUrl.toString(),
        html,
      };
    }

    throw new UnprocessableEntityException(
      'Konum bağlantısı çok fazla yönlendirme içeriyor.',
    );
  }

  private async fetchWithTimeout(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      return await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent':
            'Mozilla/5.0 (compatible; EPH-MapResolver/1.0)',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'Konum bağlantısı zaman aşımına uğradı.',
        );
      }

      throw new ServiceUnavailableException(
        'Konum bağlantısına şu anda ulaşılamadı.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readLimitedResponse(
    response: Response,
  ): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      if (!result.value) {
        continue;
      }

      const remainingBytes =
        MAX_RESPONSE_BYTES - totalLength;

      if (remainingBytes <= 0) {
        await reader.cancel();
        break;
      }

      const chunk =
        result.value.length > remainingBytes
          ? result.value.slice(0, remainingBytes)
          : result.value;

      chunks.push(chunk);
      totalLength += chunk.length;

      if (totalLength >= MAX_RESPONSE_BYTES) {
        await reader.cancel();
        break;
      }
    }

    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder('utf-8').decode(merged);
  }
}
