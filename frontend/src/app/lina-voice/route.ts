import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const cleanText =
      typeof text === "string" && text.trim().length > 0
        ? text.trim()
        : "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?";

    const apiKey = readEnvValue("ELEVENLABS_API_KEY");
    const voiceId =
      readEnvValue("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";

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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.58,
            similarity_boost: 0.82,
            style: 0.18,
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