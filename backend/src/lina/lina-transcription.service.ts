import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MIN_AUDIO_BYTES = 2 * 1024;
export const UNINTELLIGIBLE_AUDIO_MESSAGE =
  "Sesinizi anlayamadım, lütfen tekrar deneyin.";
export const TRANSCRIPTION_HINT_PROMPT =
  "Türkçe emlak CRM sesli komutu. EPH, Emlak Portföy Havuzu, Lina, CRM, Pamukkale, Merkezefendi, mahalle, portföy, müşteri, alıcı, satıcı, kiracı, görev ve toplantı gibi gayrimenkul terimlerini doğru yaz.";

function normalizeSpeech(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Sessiz/boş kayıtta model ipucu (prompt) metnini geri yankılayabilir; bunu konuşma sayma.
export function isUnintelligibleTranscript(
  text: string,
  hint: string = TRANSCRIPTION_HINT_PROMPT,
): boolean {
  const normalized = normalizeSpeech(text);
  if (!normalized || normalized.split(" ").length < 2) return true;

  const normalizedHint = normalizeSpeech(hint);
  if (normalized === normalizedHint) return true;
  if (normalized.length >= 15 && normalizedHint.includes(normalized)) return true;
  if (normalizedHint.length >= 15 && normalized.includes(normalizedHint)) return true;

  const words = normalized.split(" ");
  if (words.length >= 4) {
    const hintWords = new Set(normalizedHint.split(" "));
    const shared = words.filter((word) => hintWords.has(word)).length;
    if (shared / words.length >= 0.9) return true;
  }

  return false;
}
const DEFAULT_TRANSCRIPTION_ENDPOINT =
  "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

const SUPPORTED_EXTENSIONS = new Set([
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
]);

type OpenAiTranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

export type LinaTranscriptionResult = {
  success: true;
  text: string;
  provider: "openai";
  model: string;
};

@Injectable()
export class LinaTranscriptionService {
  private readonly logger = new Logger(LinaTranscriptionService.name);

  async transcribe(
    file: Express.Multer.File | undefined,
  ): Promise<LinaTranscriptionResult> {
    this.validateFile(file);

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Lina sesli komut servisi yapılandırılmamış.",
      );
    }

    const endpoint =
      process.env.LINA_OPENAI_TRANSCRIPTIONS_URL?.trim() ||
      DEFAULT_TRANSCRIPTION_ENDPOINT;
    const model =
      process.env.LINA_OPENAI_TRANSCRIBE_MODEL?.trim() ||
      DEFAULT_TRANSCRIPTION_MODEL;
    const timeoutMs = this.readTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const form = new FormData();
      const filename = this.safeFilename(file!);
      const mimeType = file!.mimetype || "audio/mp4";
      const bytes = new Uint8Array(file!.buffer);
      const blob = new Blob([bytes], { type: mimeType });

      form.append("file", blob, filename);
      form.append("model", model);
      form.append("language", "tr");
      form.append("prompt", TRANSCRIPTION_HINT_PROMPT);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      const responseText = await response.text();
      let parsed: OpenAiTranscriptionResponse = {};

      try {
        parsed = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `OPENAI_TRANSCRIPTION_INVALID_JSON:${response.status}`,
        );
      }

      if (!response.ok) {
        const remoteMessage =
          parsed.error?.message?.trim() ||
          responseText.slice(0, 500) ||
          "Ses çözümleme isteği başarısız.";

        throw new Error(
          `OPENAI_TRANSCRIPTION_HTTP_${response.status}:${remoteMessage}`,
        );
      }

      const text = String(parsed.text || "").trim();

      if (isUnintelligibleTranscript(text)) {
        throw new UnprocessableEntityException(UNINTELLIGIBLE_AUDIO_MESSAGE);
      }

      return {
        success: true,
        text,
        provider: "openai",
        model,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new ServiceUnavailableException(
          "Lina sesli komut çözümlemesi zaman aşımına uğradı.",
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof UnprocessableEntityException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(
        error instanceof Error
          ? error.message
          : "Lina sesli komut çözümlemesinde bilinmeyen hata.",
      );

      throw new ServiceUnavailableException(
        "Lina sesli komutu şu anda çözümlenemedi.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Ses dosyası gönderilmedi.");
    }

    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException(
        "Ses kaydı en fazla 10 MB olabilir.",
      );
    }

    if (file.size < MIN_AUDIO_BYTES || file.buffer.length < MIN_AUDIO_BYTES) {
      throw new UnprocessableEntityException(UNINTELLIGIBLE_AUDIO_MESSAGE);
    }

    const extension = this.extensionOf(file.originalname);

    if (extension && !SUPPORTED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        "Desteklenmeyen ses dosyası biçimi.",
      );
    }
  }

  private safeFilename(file: Express.Multer.File): string {
    const extension =
      this.extensionOf(file.originalname) ||
      this.extensionFromMimeType(file.mimetype) ||
      "m4a";

    return `lina-command-${Date.now()}.${extension}`;
  }

  private extensionOf(filename?: string): string {
    const value = String(filename || "").trim().toLowerCase();
    const dotIndex = value.lastIndexOf(".");

    return dotIndex >= 0 ? value.slice(dotIndex + 1) : "";
  }

  private extensionFromMimeType(mimeType?: string): string {
    const value = String(mimeType || "").toLowerCase();

    if (value.includes("webm")) return "webm";
    if (value.includes("ogg")) return "ogg";
    if (value.includes("wav")) return "wav";
    if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
    if (value.includes("mp4") || value.includes("m4a") || value.includes("aac")) {
      return "m4a";
    }

    return "";
  }

  private readTimeoutMs(): number {
    const configured = Number(
      process.env.LINA_OPENAI_TRANSCRIBE_TIMEOUT_MS,
    );

    if (
      Number.isFinite(configured) &&
      configured >= 5000 &&
      configured <= 120000
    ) {
      return configured;
    }

    return 60000;
  }
}
