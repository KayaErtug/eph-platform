import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LINA_VOICE_ID = "LYfSi2g3Frvxg50fRl91";
const DEFAULT_LINA_MODEL_ID = "eleven_multilingual_v2";

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

function normalizeVoiceText(text: string) {
  return String(text || "")
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
  try {
    const { text } = await req.json();

    const cleanText =
      typeof text === "string" && text.trim().length > 0
        ? normalizeVoiceText(text.trim())
        : "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?";

    const apiKey = readEnvValue("ELEVENLABS_API_KEY");
    const voiceId = readEnvValue("ELEVENLABS_VOICE_ID") || DEFAULT_LINA_VOICE_ID;
    const modelId = readEnvValue("ELEVENLABS_MODEL_ID") || DEFAULT_LINA_MODEL_ID;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "ELEVENLABS_API_KEY eksik.",
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
          voice_settings: {
            stability: 0.92,
            similarity_boost: 0.98,
            style: 0.05,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();

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
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Lina ses servisi çalışırken hata oluştu.",
      },
      { status: 500 },
    );
  }
}