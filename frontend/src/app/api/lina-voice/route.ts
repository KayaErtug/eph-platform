import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const cleanText =
      typeof text === "string" && text.trim().length > 0
        ? text.trim()
        : "Merhaba, ben Lina. Size nasıl yardımcı olabilirim?";

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      return NextResponse.json(
        {
          error:
            "ElevenLabs API bilgileri eksik. ELEVENLABS_API_KEY ve ELEVENLABS_VOICE_ID kontrol edilmeli.",
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
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Lina ses üretimi başarısız oldu.",
          detail: errorText,
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
  } catch (error) {
    console.error("Lina voice error:", error);

    return NextResponse.json(
      {
        error: "Lina ses servisi çalışırken hata oluştu.",
      },
      { status: 500 },
    );
  }
}