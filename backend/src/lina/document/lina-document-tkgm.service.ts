import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  LinaExtractedParcelInfo,
  LinaTkgmParcelResult,
} from './lina-document-analysis.types';

type TkgmSearchInput = LinaExtractedParcelInfo & {
  unitAdaNo?: string | null;
  unitParselNo?: string | null;
};

@Injectable()
export class LinaDocumentTkgmService {
  constructor(private readonly configService: ConfigService) {}

  async verifyParcel(input: TkgmSearchInput): Promise<LinaTkgmParcelResult> {
    const city = this.clean(input.city);
    const district = this.clean(input.district);
    const neighborhood = this.clean(input.neighborhood);
    const adaNo = this.clean(input.adaNo || input.unitAdaNo);
    const parselNo = this.clean(input.parselNo || input.unitParselNo);

    if (!adaNo || !parselNo) {
      return {
        status: 'MISSING_INPUT',
        matched: false,
        source: 'NONE',
        message:
          'TKGM kontrolü için ada ve parsel bilgisi zorunludur. Belgeden veya portföy kaydından yeterli veri okunamadı.',
        city,
        district,
        neighborhood,
        adaNo,
        parselNo,
      };
    }

    const enabled = this.getBooleanConfig('LINA_TKGM_ENABLED', true);

    if (!enabled) {
      return {
        status: 'NOT_REQUESTED',
        matched: false,
        source: 'NONE',
        message: 'TKGM kontrolü yapılandırma nedeniyle pasif.',
        city,
        district,
        neighborhood,
        adaNo,
        parselNo,
      };
    }

    const endpoint = this.getConfig('LINA_TKGM_PARCEL_ENDPOINT');

    if (!endpoint) {
      return {
        status: 'UNAVAILABLE',
        matched: false,
        source: 'NONE',
        message:
          'TKGM parsel kontrol servisi henüz yapılandırılmadı. OCR sonucu kaydedildi, dış parsel kontrolü bekliyor.',
        city,
        district,
        neighborhood,
        adaNo,
        parselNo,
      };
    }

    try {
      const url = this.buildUrl(endpoint, {
        city,
        district,
        neighborhood,
        adaNo,
        parselNo,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'EPH-Lina-Document-Analysis/1.0',
        },
      });

      if (!response.ok) {
        return {
          status: 'ERROR',
          matched: false,
          source: 'TKGM',
          message: `TKGM servis yanıtı başarısız: ${response.status}`,
          city,
          district,
          neighborhood,
          adaNo,
          parselNo,
        };
      }

      const raw = await response.json();
      const normalized = this.normalizeTkgmResponse(raw);

      return {
        ...normalized,
        city: normalized.city || city,
        district: normalized.district || district,
        neighborhood: normalized.neighborhood || neighborhood,
        adaNo: normalized.adaNo || adaNo,
        parselNo: normalized.parselNo || parselNo,
        raw,
      };
    } catch (error) {
      return {
        status: 'ERROR',
        matched: false,
        source: 'TKGM',
        message:
          error instanceof Error
            ? `TKGM kontrol hatası: ${error.message}`
            : 'TKGM kontrolü sırasında bilinmeyen hata oluştu.',
        city,
        district,
        neighborhood,
        adaNo,
        parselNo,
      };
    }
  }

  private normalizeTkgmResponse(raw: any): LinaTkgmParcelResult {
    const candidate =
      Array.isArray(raw?.features) && raw.features.length
        ? raw.features[0]
        : Array.isArray(raw?.data) && raw.data.length
          ? raw.data[0]
          : Array.isArray(raw) && raw.length
            ? raw[0]
            : raw?.data || raw?.result || raw;

    const props = candidate?.properties || candidate?.attributes || candidate || {};
    const areaSquareMeters = this.parseNumber(
      props.alan ||
        props.area ||
        props.yuzolcum ||
        props.yuzolcumu ||
        props.yuzölçüm ||
        props.yuzolcumBilgisi,
    );

    const adaNo = this.clean(props.adaNo || props.ada || props.ada_no);
    const parselNo = this.clean(
      props.parselNo || props.parsel || props.parsel_no,
    );

    const hasGeometry = Boolean(
      candidate?.geometry || props.geometry || props.geom || props.wkt,
    );

    if (!candidate || Object.keys(candidate).length === 0) {
      return {
        status: 'NOT_FOUND',
        matched: false,
        source: 'TKGM',
        message: 'TKGM kayıtlarında eşleşen parsel bulunamadı.',
      };
    }

    return {
      status: 'MATCHED',
      matched: true,
      source: 'TKGM',
      message: 'TKGM kayıtlarında parsel bulundu.',
      city: this.clean(props.il || props.city),
      district: this.clean(props.ilce || props.ilçe || props.district),
      neighborhood: this.clean(
        props.mahalle || props.koy || props.köy || props.neighborhood,
      ),
      adaNo,
      parselNo,
      areaSquareMeters,
      nitelik: this.clean(props.nitelik || props.tasinmazNitelik),
      pafta: this.clean(props.pafta),
      mevki: this.clean(props.mevki),
      geometryAvailable: hasGeometry,
    };
  }

  private buildUrl(endpoint: string, params: Record<string, string | null>) {
    const url = new URL(endpoint);

    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    return url.toString();
  }

  private getConfig(key: string) {
    return (
      this.configService.get<string>(key) ||
      process.env[key] ||
      ''
    ).trim();
  }

  private getBooleanConfig(key: string, fallback: boolean) {
    const value = this.getConfig(key).toLowerCase();

    if (!value) return fallback;
    return ['1', 'true', 'yes', 'on', 'aktif'].includes(value);
  }

  private clean(value: unknown) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private parseNumber(value: unknown) {
    if (value === null || value === undefined) return null;

    const normalized = String(value)
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '');

    const numeric = Number(normalized);

    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }
}
