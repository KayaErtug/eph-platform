import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortfolioAuthorityType } from '@prisma/client';

import { LinaDocumentTkgmService } from './lina-document-tkgm.service';
import {
  LinaDocumentDeepAnalysis,
  LinaDocumentKind,
  LinaDocumentRiskLevel,
  LinaExtractedParcelInfo,
  LinaTkgmParcelResult,
} from './lina-document-analysis.types';

export interface LinaDocumentPrecheckResult {
  documentType: string;
  ocrQualityScore: number;
  confidenceScore: number;
  qrDetected: boolean;
  riskLevel: string;
  linaSummary: string;
}

type LinaDocumentAnalysisInput = {
  fileName: string;
  mimeType?: string;
  buffer?: Buffer;
  authorityType?: PortfolioAuthorityType | string;
  portfolioContext?: {
    ownerName?: string | null;
    ownerPhone?: string | null;
    ownerEmail?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    adaNo?: string | null;
    parselNo?: string | null;
    area?: number | string | null;
  };
};

type OpenAiDocumentJson = {
  documentType?: LinaDocumentKind | string | null;
  ocrQualityScore?: number | null;
  confidenceScore?: number | null;
  qrDetected?: boolean | null;
  signatureDetected?: boolean | null;
  missingPageRisk?: boolean | null;
  forgeryRiskScore?: number | null;
  extracted?: Partial<LinaExtractedParcelInfo> | null;
  warnings?: string[] | null;
  linaSummary?: string | null;
};

@Injectable()
export class LinaDocumentPrecheckService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tkgmService: LinaDocumentTkgmService,
  ) {}

  async analyze(
    inputOrFileName: LinaDocumentAnalysisInput | string,
  ): Promise<LinaDocumentPrecheckResult> {
    const input =
      typeof inputOrFileName === 'string'
        ? { fileName: inputOrFileName }
        : inputOrFileName;

    const safeInput: LinaDocumentAnalysisInput = {
      ...input,
      fileName: String(input.fileName || 'belge').trim() || 'belge',
      mimeType: String(input.mimeType || '').trim(),
    };

    console.log('[LINA_OCR_DEBUG] START', {
      fileName: safeInput.fileName,
      mimeType: safeInput.mimeType,
      bufferLength: safeInput.buffer?.length || 0,
      authorityType: safeInput.authorityType || null,
      context: safeInput.portfolioContext || null,
    });

    const baseAnalysis = this.buildFallbackAnalysis(safeInput);

    const aiAnalysis = await this.safeAnalyzeWithOpenAi(safeInput, baseAnalysis);

    console.log('[LINA_OCR_DEBUG] AI_ANALYSIS', {
      documentType: aiAnalysis.documentType,
      ocrQualityScore: aiAnalysis.ocrQualityScore,
      confidenceScore: aiAnalysis.confidenceScore,
      riskLevel: aiAnalysis.riskLevel,
      extracted: aiAnalysis.extracted,
      warnings: aiAnalysis.warnings,
    });

    const tkgm = await this.tkgmService.verifyParcel({
      ...aiAnalysis.extracted,
      city:
        aiAnalysis.extracted.city ||
        safeInput.portfolioContext?.city ||
        undefined,
      district:
        aiAnalysis.extracted.district ||
        safeInput.portfolioContext?.district ||
        undefined,
      neighborhood:
        aiAnalysis.extracted.neighborhood ||
        safeInput.portfolioContext?.neighborhood ||
        undefined,
      unitAdaNo: safeInput.portfolioContext?.adaNo,
      unitParselNo: safeInput.portfolioContext?.parselNo,
    } as any);

    const finalAnalysis = this.finalizeAnalysis(aiAnalysis, tkgm, safeInput);

    console.log('[LINA_OCR_DEBUG] FINAL_ANALYSIS', {
      documentType: finalAnalysis.documentType,
      ocrQualityScore: finalAnalysis.ocrQualityScore,
      confidenceScore: finalAnalysis.confidenceScore,
      riskLevel: finalAnalysis.riskLevel,
      qrDetected: finalAnalysis.qrDetected,
      tkgm: finalAnalysis.tkgm,
      summary: this.buildSummary(finalAnalysis, safeInput),
    });

    return {
      documentType: finalAnalysis.documentType,
      ocrQualityScore: finalAnalysis.ocrQualityScore,
      confidenceScore: finalAnalysis.confidenceScore,
      qrDetected: finalAnalysis.qrDetected,
      riskLevel: finalAnalysis.riskLevel,
      linaSummary: this.buildSummary(finalAnalysis, safeInput),
    };
  }

  private async safeAnalyzeWithOpenAi(
    input: LinaDocumentAnalysisInput,
    fallback: LinaDocumentDeepAnalysis,
  ): Promise<LinaDocumentDeepAnalysis> {
    const apiKey = this.getConfig('OPENAI_API_KEY');

    if (!apiKey || !input.buffer?.length || !input.mimeType) {
      console.log('[LINA_OCR_DEBUG] FALLBACK_BEFORE_OPENAI', {
        hasApiKey: Boolean(apiKey),
        bufferLength: input.buffer?.length || 0,
        mimeType: input.mimeType || null,
      });
      return fallback;
    }

    if (!this.isSupportedMimeType(input.mimeType)) {
      console.log('[LINA_OCR_DEBUG] UNSUPPORTED_MIME', { mimeType: input.mimeType });
      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          'Dosya tipi OpenAI belge analizi için desteklenmedi; temel kontrol uygulandı.',
        ],
      };
    }

    try {
      const model =
        this.getConfig('LINA_DOCUMENT_MODEL') ||
        this.getConfig('OPENAI_VISION_MODEL') ||
        this.getConfig('OPENAI_MODEL') ||
        'gpt-4.1-mini';

      console.log('[LINA_OCR_DEBUG] OPENAI_REQUEST', {
        model,
        fileName: input.fileName,
        mimeType: input.mimeType,
        bufferLength: input.buffer?.length || 0,
      });

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 1400,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: this.buildAnalysisPrompt(input),
                },
                this.buildOpenAiFileInput(input),
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text();

        console.log('[LINA_OCR_DEBUG] OPENAI_ERROR', {
          status: response.status,
          detail: detail.slice(0, 1200),
        });

        return {
          ...fallback,
          warnings: [
            ...fallback.warnings,
            `OpenAI belge analizi tamamlanamadı: ${response.status} ${detail.slice(0, 160)}`,
          ],
        };
      }

      const data = await response.json();
      const text = this.extractOpenAiText(data);
      const parsed = this.parseJsonResult(text);

      console.log('[LINA_OCR_DEBUG] OPENAI_SUCCESS', {
        textPreview: text.slice(0, 1200),
        parsed,
      });

      return this.mergeAiResult(fallback, parsed);
    } catch (error) {
      console.log('[LINA_OCR_DEBUG] OPENAI_EXCEPTION', {
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          error instanceof Error
            ? `OpenAI belge analiz hatası: ${error.message}`
            : 'OpenAI belge analizi sırasında bilinmeyen hata oluştu.',
        ],
      };
    }
  }

  private buildOpenAiFileInput(input: LinaDocumentAnalysisInput) {
    const mimeType = String(input.mimeType || '').toLowerCase();
    const base64 = input.buffer?.toString('base64') || '';

    if (mimeType === 'application/pdf') {
      return {
        type: 'input_file',
        filename: input.fileName || 'belge.pdf',
        file_data: base64,
      };
    }

    return {
      type: 'input_image',
      image_url: `data:${mimeType};base64,${base64}`,
      detail: 'high',
    };
  }

  private buildAnalysisPrompt(input: LinaDocumentAnalysisInput) {
    const ctx = input.portfolioContext || {};

    return [
      'Sen EPH Platform içinde çalışan Lina Belge Analiz Merkezi V1 motorusun.',
      'Görevin emlak belgelerini ön kontrolden geçirmek ve yalnızca JSON döndürmektir.',
      '',
      'ÖNEMLİ SINIRLAR:',
      '- Malik adını sadece belgeden OKU. Malik doğrulandı deme.',
      '- Ada/parsel belgeden okunabilir; dış TKGM doğrulamasını backend ayrıca yapacaktır.',
      '- Hukuki kesinlik, resmi onay veya tapu sahipliği garantisi verme.',
      '- Emin değilsen null döndür, uydurma.',
      '',
      'PORTFÖY BAĞLAMI:',
      `- Beklenen malik adı: ${ctx.ownerName || 'bilinmiyor'}`,
      `- Beklenen il: ${ctx.city || 'bilinmiyor'}`,
      `- Beklenen ilçe: ${ctx.district || 'bilinmiyor'}`,
      `- Beklenen mahalle/köy: ${ctx.neighborhood || 'bilinmiyor'}`,
      `- Beklenen ada: ${ctx.adaNo || 'bilinmiyor'}`,
      `- Beklenen parsel: ${ctx.parselNo || 'bilinmiyor'}`,
      `- Beklenen alan: ${ctx.area || 'bilinmiyor'}`,
      `- Yükleme türü: ${input.authorityType || 'bilinmiyor'}`,
      '',
      'ÇIKTI ŞEMASI:',
      '{',
      '  "documentType": "TAPU | KIMLIK | YETKI_BELGESI | KAT_KARSILIGI_SOZLESMESI | VERGI_LEVHASI | DIGER",',
      '  "ocrQualityScore": 0-100,',
      '  "confidenceScore": 0-100,',
      '  "qrDetected": true/false,',
      '  "signatureDetected": true/false,',
      '  "missingPageRisk": true/false,',
      '  "forgeryRiskScore": 0-100,',
      '  "extracted": {',
      '    "ownerName": string|null,',
      '    "city": string|null,',
      '    "district": string|null,',
      '    "neighborhood": string|null,',
      '    "adaNo": string|null,',
      '    "parselNo": string|null,',
      '    "areaText": string|null,',
      '    "areaSquareMeters": number|null,',
      '    "documentDate": string|null,',
      '    "deedType": string|null',
      '  },',
      '  "warnings": string[],',
      '  "linaSummary": string',
      '}',
      '',
      'Yalnızca geçerli JSON döndür. Markdown, açıklama veya kod bloğu kullanma.',
    ].join('\n');
  }

  private buildFallbackAnalysis(input: LinaDocumentAnalysisInput): LinaDocumentDeepAnalysis {
    const lower = this.normalizeText(input.fileName);
    const authorityType = String(input.authorityType || '').toUpperCase();
    const ctx = input.portfolioContext || {};

    let documentType: LinaDocumentKind = 'DIGER';

    if (lower.includes('tapu') || authorityType === 'TAPU') {
      documentType = 'TAPU';
    } else if (lower.includes('kimlik') || authorityType === 'TAPU_SAHIBI_KIMLIK') {
      documentType = 'KIMLIK';
    } else if (lower.includes('yetki') || authorityType === 'YETKI_BELGESI') {
      documentType = 'YETKI_BELGESI';
    } else if (
      lower.includes('kat karsiligi') ||
      lower.includes('kat karşılığı') ||
      authorityType === 'KAT_KARSILIGI_SOZLESMESI'
    ) {
      documentType = 'KAT_KARSILIGI_SOZLESMESI';
    }

    const confidenceScore = documentType === 'DIGER' ? 55 : 68;

    return {
      documentType,
      ocrQualityScore: input.buffer?.length ? 45 : 0,
      confidenceScore,
      qrDetected: false,
      signatureDetected: false,
      missingPageRisk: true,
      forgeryRiskScore: documentType === 'DIGER' ? 55 : 35,
      riskLevel: this.riskFromScores(confidenceScore, 35, true),
      extracted: {
        ownerName: ctx.ownerName || null,
        city: ctx.city || null,
        district: ctx.district || null,
        neighborhood: ctx.neighborhood || null,
        adaNo: ctx.adaNo || null,
        parselNo: ctx.parselNo || null,
        areaSquareMeters: this.parseNumber(ctx.area),
      },
      tkgm: {
        status: 'NOT_REQUESTED',
        matched: false,
        source: 'NONE',
        message: 'TKGM kontrolü henüz yapılmadı.',
      },
      warnings: [
        'Gerçek OCR sonucu alınamadığı için temel dosya ve portföy bilgileriyle ön kontrol yapıldı.',
      ],
      linaSummary: 'Belge temel ön kontrolden geçti; gerçek OCR sonucu bekleniyor.',
    };
  }

  private mergeAiResult(
    fallback: LinaDocumentDeepAnalysis,
    parsed: OpenAiDocumentJson | null,
  ): LinaDocumentDeepAnalysis {
    if (!parsed) {
      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          'OpenAI yanıtı geçerli JSON formatında okunamadı.',
        ],
      };
    }

    const documentType = this.normalizeDocumentType(parsed.documentType) || fallback.documentType;
    const ocrQualityScore = this.clampScore(parsed.ocrQualityScore, fallback.ocrQualityScore);
    const confidenceScore = this.clampScore(parsed.confidenceScore, fallback.confidenceScore);
    const forgeryRiskScore = this.clampScore(parsed.forgeryRiskScore, fallback.forgeryRiskScore);
    const missingPageRisk = Boolean(parsed.missingPageRisk);
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((item) => String(item)).filter(Boolean).slice(0, 8)
      : fallback.warnings;

    return {
      ...fallback,
      documentType,
      ocrQualityScore,
      confidenceScore,
      qrDetected: Boolean(parsed.qrDetected),
      signatureDetected: Boolean(parsed.signatureDetected),
      missingPageRisk,
      forgeryRiskScore,
      riskLevel: this.riskFromScores(confidenceScore, forgeryRiskScore, missingPageRisk),
      extracted: {
        ...fallback.extracted,
        ...(parsed.extracted || {}),
        ownerName: this.clean(parsed.extracted?.ownerName) || fallback.extracted.ownerName || null,
        city: this.clean(parsed.extracted?.city) || fallback.extracted.city || null,
        district: this.clean(parsed.extracted?.district) || fallback.extracted.district || null,
        neighborhood:
          this.clean(parsed.extracted?.neighborhood) ||
          fallback.extracted.neighborhood ||
          null,
        adaNo: this.clean(parsed.extracted?.adaNo) || fallback.extracted.adaNo || null,
        parselNo:
          this.clean(parsed.extracted?.parselNo) ||
          fallback.extracted.parselNo ||
          null,
        areaSquareMeters:
          this.parseNumber(parsed.extracted?.areaSquareMeters) ??
          this.parseNumber(parsed.extracted?.areaText) ??
          fallback.extracted.areaSquareMeters ??
          null,
      },
      warnings,
      linaSummary:
        this.clean(parsed.linaSummary) ||
        'Lina belgeyi OCR ile okudu ve ön kontrol için risk skorunu oluşturdu.',
    };
  }

  private finalizeAnalysis(
    analysis: LinaDocumentDeepAnalysis,
    tkgm: LinaTkgmParcelResult,
    input: LinaDocumentAnalysisInput,
  ): LinaDocumentDeepAnalysis {
    const warnings = [...analysis.warnings];

    if (analysis.documentType === 'TAPU' && tkgm.status === 'MATCHED') {
      warnings.push('Ada/parsel bilgisi TKGM parsel kontrolünde bulundu.');
    }

    if (analysis.documentType === 'TAPU' && ['NOT_FOUND', 'ERROR'].includes(tkgm.status)) {
      warnings.push(tkgm.message);
    }

    if (input.portfolioContext?.ownerName && analysis.extracted.ownerName) {
      const expected = this.normalizeText(input.portfolioContext.ownerName);
      const actual = this.normalizeText(analysis.extracted.ownerName);

      if (expected && actual && !actual.includes(expected) && !expected.includes(actual)) {
        warnings.push('Belgeden okunan malik adı portföydeki malik adıyla tam eşleşmedi.');
      }
    }

    let confidenceScore = analysis.confidenceScore;

    if (tkgm.status === 'MATCHED') confidenceScore += 8;
    if (tkgm.status === 'NOT_FOUND') confidenceScore -= 18;
    if (analysis.missingPageRisk) confidenceScore -= 8;
    if (analysis.forgeryRiskScore >= 70) confidenceScore -= 18;

    confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));

    return {
      ...analysis,
      tkgm,
      confidenceScore,
      riskLevel: this.riskFromScores(
        confidenceScore,
        analysis.forgeryRiskScore,
        analysis.missingPageRisk,
        tkgm.status,
      ),
      warnings: Array.from(new Set(warnings)).slice(0, 10),
    };
  }

  private buildSummary(
    analysis: LinaDocumentDeepAnalysis,
    input: LinaDocumentAnalysisInput,
  ) {
    const extracted = analysis.extracted;
    const lines = [
      `Belge türü: ${this.displayDocumentType(analysis.documentType)}.`,
      extracted.ownerName
        ? `Malik adı belgeden okundu: ${extracted.ownerName}.`
        : 'Malik adı belgeden net okunamadı.',
      extracted.adaNo || extracted.parselNo
        ? `Ada/parsel: ${extracted.adaNo || '-'} / ${extracted.parselNo || '-'}.`
        : 'Ada/parsel bilgisi net okunamadı.',
      analysis.tkgm.status === 'MATCHED'
        ? 'TKGM parsel kontrolü: parsel bulundu.'
        : analysis.tkgm.status === 'UNAVAILABLE'
          ? 'TKGM parsel kontrolü: servis henüz yapılandırılmadı.'
          : `TKGM parsel kontrolü: ${analysis.tkgm.message}`,
      `QR: ${analysis.qrDetected ? 'var' : 'yok/belirsiz'}. İmza alanı: ${
        analysis.signatureDetected ? 'var' : 'yok/belirsiz'
      }.`,
      analysis.missingPageRisk
        ? 'Eksik sayfa riski var; insan incelemesi önerilir.'
        : 'Eksik sayfa riski düşük görünüyor.',
      analysis.warnings.length ? `Not: ${analysis.warnings[0]}` : '',
    ].filter(Boolean);

    const summary = lines.join(' ');

    if (summary.length <= 900) return summary;

    return `${summary.slice(0, 897)}...`;
  }

  private extractOpenAiText(data: any) {
    if (typeof data?.output_text === 'string') {
      return data.output_text.trim();
    }

    const chunks: string[] = [];

    for (const output of data?.output || []) {
      for (const content of output?.content || []) {
        if (typeof content?.text === 'string') chunks.push(content.text);
      }
    }

    return chunks.join('\n').trim();
  }

  private parseJsonResult(text: string): OpenAiDocumentJson | null {
    if (!text) return null;

    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');

      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          return null;
        }
      }

      return null;
    }
  }

  private riskFromScores(
    confidenceScore: number,
    forgeryRiskScore: number,
    missingPageRisk: boolean,
    tkgmStatus?: string,
  ): LinaDocumentRiskLevel {
    if (
      confidenceScore < 55 ||
      forgeryRiskScore >= 70 ||
      (missingPageRisk && confidenceScore < 75) ||
      tkgmStatus === 'NOT_FOUND'
    ) {
      return 'HIGH';
    }

    if (
      confidenceScore < 82 ||
      forgeryRiskScore >= 45 ||
      missingPageRisk ||
      tkgmStatus === 'ERROR' ||
      tkgmStatus === 'UNAVAILABLE'
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private normalizeDocumentType(value?: string | null): LinaDocumentKind | null {
    const normalized = this.normalizeText(value);

    if (!normalized) return null;
    if (normalized.includes('tapu')) return 'TAPU';
    if (normalized.includes('kimlik')) return 'KIMLIK';
    if (normalized.includes('yetki')) return 'YETKI_BELGESI';
    if (normalized.includes('kat karsiligi') || normalized.includes('sozlesme')) {
      return 'KAT_KARSILIGI_SOZLESMESI';
    }
    if (normalized.includes('vergi')) return 'VERGI_LEVHASI';
    if (normalized.includes('diger')) return 'DIGER';

    const upper = String(value || '').toUpperCase();

    if (
      [
        'TAPU',
        'KIMLIK',
        'YETKI_BELGESI',
        'KAT_KARSILIGI_SOZLESMESI',
        'VERGI_LEVHASI',
        'DIGER',
      ].includes(upper)
    ) {
      return upper as LinaDocumentKind;
    }

    return null;
  }

  private displayDocumentType(value: LinaDocumentKind) {
    const map: Record<LinaDocumentKind, string> = {
      TAPU: 'Tapu',
      KIMLIK: 'Kimlik',
      YETKI_BELGESI: 'Yetki Belgesi',
      KAT_KARSILIGI_SOZLESMESI: 'Kat Karşılığı Sözleşmesi',
      VERGI_LEVHASI: 'Vergi Levhası',
      DIGER: 'Diğer Evrak',
    };

    return map[value] || 'Belirlenemedi';
  }

  private clampScore(value: unknown, fallback: number) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return Math.max(0, Math.min(100, Math.round(fallback || 0)));
    }

    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  private parseNumber(value: unknown): number | null {
    if (value === undefined || value === null) return null;

    const text = String(value)
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
      .trim();

    if (!text) return null;

    const numeric = Number(text);

    return Number.isFinite(numeric) ? numeric : null;
  }

  private clean(value: unknown) {
    const text = String(value ?? '').trim();

    return text || null;
  }

  private normalizeText(value: unknown) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private isSupportedMimeType(mimeType?: string) {
    return [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ].includes(String(mimeType || '').toLowerCase());
  }

  private getConfig(key: string) {
    return (
      this.configService.get<string>(key) ||
      process.env[key] ||
      ''
    ).trim();
  }
}
