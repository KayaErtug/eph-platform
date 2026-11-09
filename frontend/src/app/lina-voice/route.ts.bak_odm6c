import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lina CRM Confirmation And Fixed Voice V1
// Lina Fixed Voice V2
const FIXED_LINA_MODEL_ID = "eleven_multilingual_v2";
const FIXED_LINA_VOICE_SEED = 20260628;

function readEnvValue(key: string) {
  const fromProcess = process.env[key];

  if (fromProcess && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envFile = fs.readFileSync(envPath, "utf8");

    const line = envFile
      .split("\n")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${key}=`));

    if (!line) {
      return "";
    }

    return line.replace(`${key}=`, "").trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

function normalizeMeasurementNumber(value: string) {
  const text = String(value || "").trim();

  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) {
    return text.replace(/\./g, "");
  }

  return text;
}

function normalizeVoiceText(text: string) {
  return String(text || "")
    .replace(
      /(\d[\d.]*(?:,\d+)?)\s*(?:km²|km2|km\^2)/gi,
      (_, value: string) =>
        `${normalizeMeasurementNumber(value)} kilometrekare`,
    )
    .replace(/(?:km²|km2|km\^2)/gi, "kilometrekare")
    .replace(
      /(\d[\d.]*(?:,\d+)?)\s*(?:m²|m2|m\^2)/gi,
      (_, value: string) =>
        `${normalizeMeasurementNumber(value)} metrekare`,
    )
    .replace(/(?:m²|m2|m\^2)/gi, "metrekare")
    .replace(/\bEPH\b/g, "Emlak Portföy Havuzu")
    .replace(/\beph\b/g, "Emlak Portföy Havuzu")
    .replace(/\bTRY\b/g, "Türk Lirası")
    .replace(/\bTL\b/g, "Türk Lirası")
    .replace(/₺/g, " Türk Lirası ")
    .replace(/\b0\s*km\b/gi, "sıfır kilometre")
    .replace(/\b0km\b/gi, "sıfır kilometre")
    .replace(/\b(\d+)\s*[,.]\s*5\s*\+\s*(\d+)\b/g, "$1 buçuk artı $2")
    .replace(/\b(\d+)\s*\+\s*(\d+)\b/g, "$1 artı $2")
    .replace(/\n/g, ". ")
    .replace(/\. \. /g, ". ")
    .replace(/\. /g, ". ")
    .replace(/, /g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  // Lina Temporary Passive Mode V1
  const linaTemporarilyDisabled = true;

  if (linaTemporarilyDisabled) {
    return NextResponse.json(
      {
        error:
          "Lina geçici olarak pasif durumdadır. Platformdaki diğer geliştirmeler tamamlandıktan sonra yeniden devreye alınacaktır.",
        code: "LINA_TEMPORARILY_DISABLED",
      },
      { status: 503 },
    );
  }

  // Lina Fixed Voice V4 Diagnostic
  try {
    let payload: { text?: unknown };

    try {
      payload = (await req.json()) as { text?: unknown };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);

      console.error(
        "[LINA_FIXED_VOICE_V4_INVALID_JSON]",
        detail,
      );

      return NextResponse.json(
        {
          error: "Lina ses isteğinin JSON gövdesi okunamadı.",
          code: "LINA_VOICE_INVALID_JSON",
          detail:
            process.env.NODE_ENV === "development"
              ? detail
              : undefined,
        },
        { status: 400 },
      );
    }

    const { text } = payload;

    const cleanText =
      typeof text === "string" && text.trim().length > 0
        ? normalizeVoiceText(text.trim())
        : "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?";

    const apiKey = readEnvValue("ELEVENLABS_API_KEY");
    const voiceId =
      readEnvValue("LINA_FIXED_VOICE_ID") ||
      readEnvValue("ELEVENLABS_VOICE_ID");
    const modelId = FIXED_LINA_MODEL_ID;

    if (!apiKey || !voiceId) {
      return NextResponse.json(
        {
          error:
            "ELEVENLABS_API_KEY veya ELEVENLABS_VOICE_ID eksik.",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          language_code: "tr",
          seed: FIXED_LINA_VOICE_SEED,
          voice_settings: {
            stability: 0.88,
            similarity_boost: 0.95,
            style: 0,
            use_speaker_boost: true,
            speed: 1.03,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "[LINA_FIXED_VOICE_V2_FRONTEND_ERROR]",
        response.status,
        detail,
      );

      return NextResponse.json(
        {
          error: "Lina sesi üretilemedi.",
          detail,
        },
        { status: 500 },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Lina-Voice-Id": voiceId,
        "X-Lina-Voice-Seed": String(FIXED_LINA_VOICE_SEED),
        "X-Lina-Voice-Speed": "1.03",
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    const cause =
      error instanceof Error &&
      "cause" in error &&
      error.cause
        ? String(error.cause)
        : "";

    console.error(
      "[LINA_FIXED_VOICE_V4_UNHANDLED]",
      detail,
      cause,
      error,
    );

    return NextResponse.json(
      {
        error: "Lina ses servisi çalışırken beklenmeyen hata oluştu.",
        code: "LINA_VOICE_UNHANDLED",
        detail:
          process.env.NODE_ENV === "development"
            ? detail
            : undefined,
        cause:
          process.env.NODE_ENV === "development" && cause
            ? cause
            : undefined,
      },
      { status: 500 },
    );
  }
}
