import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = "marin";
const OPENAI_TTS_SPEED = 1;

const OPENAI_TTS_INSTRUCTIONS = `
Türkçe konuş.
Samimi, doğal, sıcak ve güven veren yetişkin bir kadın sesi kullan.
Konuşma hızını orta seviyede ve sabit tut.
Tüm yanıtlarda aynı ses karakterini, ritmi ve sakin tonu koru.
Robotik, resmi, haber spikeri gibi veya aşırı neşeli konuşma.
Ani ton değişiklikleri, yapay vurgular, dramatik iniş çıkışlar ve gereksiz uzatmalar yapma.
Soruları doğal bir sohbet içindeymiş gibi, anlaşılır ve yumuşak biçimde söyle.
Noktalama işaretlerinde kısa ve doğal duraklamalar kullan.
`.trim();

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
    .replace(/\bEPH\b/gi, "Emlak Portföy Havuzu")
    .replace(/\bTRY\b/g, "Türk Lirası")
    .replace(/\bTL\b/g, "Türk Lirası")
    .replace(/₺/g, " Türk Lirası ")
    .replace(/\b0\s*km\b/gi, "sıfır kilometre")
    .replace(/\b(\d+)\s*[,.]\s*5\s*\+\s*(\d+)\b/g, "$1 buçuk artı $2")
    .replace(/\b(\d+)\s*\+\s*(\d+)\b/g, "$1 artı $2")
    .replace(/\n+/g, ". ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    let payload: { text?: unknown };

    try {
      payload = (await req.json()) as { text?: unknown };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);

      console.error("[LINA_OPENAI_TTS_INVALID_JSON]", detail);

      return NextResponse.json(
        {
          error: "Lina ses isteğinin JSON gövdesi okunamadı.",
          code: "LINA_VOICE_INVALID_JSON",
        },
        { status: 400 },
      );
    }

    const rawText =
      typeof payload.text === "string" && payload.text.trim().length > 0
        ? payload.text.trim()
        : "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?";

    const cleanText = normalizeVoiceText(rawText).slice(0, 4096);
    const apiKey = readEnvValue("OPENAI_API_KEY");

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY eksik.",
          code: "OPENAI_API_KEY_MISSING",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_TTS_MODEL,
          voice: OPENAI_TTS_VOICE,
          input: cleanText,
          instructions: OPENAI_TTS_INSTRUCTIONS,
          response_format: "mp3",
          speed: OPENAI_TTS_SPEED,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "[LINA_OPENAI_TTS_ERROR]",
        response.status,
        detail,
      );

      return NextResponse.json(
        {
          error: "Lina sesi üretilemedi.",
          code: "LINA_OPENAI_TTS_ERROR",
        },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Lina-Voice-Provider": "openai",
        "X-Lina-Voice-Model": OPENAI_TTS_MODEL,
        "X-Lina-Voice-Id": OPENAI_TTS_VOICE,
        "X-Lina-Voice-Speed": String(OPENAI_TTS_SPEED),
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error("[LINA_OPENAI_TTS_UNHANDLED]", detail);

    return NextResponse.json(
      {
        error: "Lina ses servisi çalışırken beklenmeyen hata oluştu.",
        code: "LINA_VOICE_UNHANDLED",
      },
      { status: 500 },
    );
  }
}
