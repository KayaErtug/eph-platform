import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    if (!audio) return NextResponse.json({ error: "Ses dosyası bulunamadı" }, { status: 400 });

    const whisperForm = new FormData();
    whisperForm.append("file", audio, "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "tr");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    });

    const data = await res.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (err) {
    return NextResponse.json({ error: "Whisper hatası" }, { status: 500 });
  }
}