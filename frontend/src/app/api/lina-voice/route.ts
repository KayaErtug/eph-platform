import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_SPEECH_ENDPOINT =
  "https://api.openai.com/v1/audio/speech";

const DEFAULT_LINA_TTS_MODEL =
  "gpt-4o-mini-tts";

const DEFAULT_LINA_TTS_VOICE =
  "marin";

const MAX_SPEECH_INPUT_LENGTH = 4096;

function readEnvFileValue(
  filePath: string,
  key: string,
): string {
  try {
    if (!fs.existsSync(filePath)) {
      return "";
    }

    const envFile = fs.readFileSync(
      filePath,
      "utf8",
    );

    const line = envFile
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(
        (item) =>
          item.startsWith(`${key}=`) ||
          item.startsWith(
            `export ${key}=`,
          ),
      );

    if (!line) {
      return "";
    }

    return line
      .replace(/^export\s+/, "")
      .replace(`${key}=`, "")
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

function readEnvValue(key: string): string {
  const fromProcess =
    process.env[key]?.trim();

  if (fromProcess) {
    return fromProcess;
  }

  const possibleEnvFiles = [
    path.join(
      process.cwd(),
      ".env.local",
    ),
    path.join(
      process.cwd(),
      ".env",
    ),
    path.join(
      process.cwd(),
      "..",
      "backend",
      ".env",
    ),
  ];

  for (const filePath of possibleEnvFiles) {
    const value = readEnvFileValue(
      filePath,
      key,
    );

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeVoiceText(
  text: string,
): string {
  return String(text || "")
    .replace(
      /\bEPH\b/g,
      "Emlak Portföy Havuzu",
    )
    .replace(
      /\beph\b/g,
      "Emlak Portföy Havuzu",
    )
    .replace(
      /\bTRY\b/g,
      "Türk Lirası",
    )
    .replace(
      /\bTL\b/g,
      "Türk Lirası",
    )
    .replace(
      /₺/g,
      " Türk Lirası ",
    )
    .replace(
      /\bUSD\b/g,
      "Amerikan Doları",
    )
    .replace(
      /\bEUR\b/g,
      "Euro",
    )
    .replace(
      /\bKAKS\b/g,
      "kaks",
    )
    .replace(
      /\bTAKS\b/g,
      "taks",
    )
    .replace(
      /\bBrüt\b/g,
      "bürüt",
    )
    .replace(
      /\bbrüt\b/g,
      "bürüt",
    )
    .replace(
      /\b0\s*km\b/gi,
      "sıfır kilometre",
    )
    .replace(
      /\b0km\b/gi,
      "sıfır kilometre",
    )
    .replace(
      /\b(\d+)\s*[,.]\s*5\s*\+\s*(\d+)\b/g,
      "$1 buçuk artı $2",
    )
    .replace(
      /\b(\d+)\s*\+\s*(\d+)\b/g,
      "$1 artı $2",
    )
    .replace(
      /\bAda\s*\/\s*Parsel\b/gi,
      "ada parsel",
    )
    .replace(
      /\b(\d+)\s*(m²|m2)\b/gi,
      "$1 metrekare",
    )
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(
      0,
      MAX_SPEECH_INPUT_LENGTH,
    );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        text?: unknown;
      };

    const requestedText =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";

    const cleanText = normalizeVoiceText(
      requestedText ||
        "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?",
    );

    const apiKey =
      readEnvValue("OPENAI_API_KEY");

    const model =
      readEnvValue(
        "LINA_OPENAI_TTS_MODEL",
      ) || DEFAULT_LINA_TTS_MODEL;

    const voice =
      readEnvValue(
        "LINA_OPENAI_TTS_VOICE",
      ) || DEFAULT_LINA_TTS_VOICE;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY yapılandırılmamış.",
        },
        {
          status: 500,
        },
      );
    }

    const response = await fetch(
      OPENAI_SPEECH_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          input: cleanText,
          instructions:
            "Doğal ve akıcı Türkçe konuş. Sesin sıcak, güven veren, profesyonel ve sakin olsun. Gayrimenkul terimlerini doğru telaffuz et. Çok hızlı konuşma. Cümle sonlarında doğal ve kısa duraklamalar yap. Abartılı duygu, reklam tonu veya robotik ton kullanma.",
          response_format: "mp3",
          speed: 0.96,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail =
        await response.text();

      console.error(
        "[LINA_OPENAI_TTS_ERROR]",
        response.status,
        detail.slice(0, 1000),
      );

      return NextResponse.json(
        {
          error:
            "Lina OpenAI sesi üretilemedi.",
          statusCode:
            response.status,
        },
        {
          status: 502,
        },
      );
    }

    const audioBuffer =
      await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "audio/mpeg",
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
        "X-Lina-Voice-Provider":
          "openai",
        "X-Lina-Voice-Model":
          model,
        "X-Lina-Voice-Name":
          voice,
      },
    });
  } catch (error) {
    console.error(
      "[LINA_OPENAI_TTS_ROUTE_ERROR]",
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR",
    );

    return NextResponse.json(
      {
        error:
          "Lina ses servisi çalışırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
