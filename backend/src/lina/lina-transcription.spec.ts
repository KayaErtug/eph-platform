import { UnprocessableEntityException } from "@nestjs/common";
import {
  isUnintelligibleTranscript,
  LinaTranscriptionService,
  TRANSCRIPTION_HINT_PROMPT,
  UNINTELLIGIBLE_AUDIO_MESSAGE,
} from "./lina-transcription.service";

const audio = (bytes: number) =>
  ({ buffer: Buffer.alloc(bytes, 1), size: bytes, originalname: "ses.m4a", mimetype: "audio/mp4" }) as Express.Multer.File;

describe("EPH-92 bos/anlamsiz ses", () => {
  const original = global.fetch;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-anahtar"; });
  afterEach(() => { global.fetch = original; });

  const mockText = (text: string) => {
    const fn = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ text }) });
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  it("ipucu yankisi reddedilir (tam ve kismi)", () => {
    expect(isUnintelligibleTranscript(TRANSCRIPTION_HINT_PROMPT)).toBe(true);
    expect(isUnintelligibleTranscript("Türkçe emlak CRM sesli komutu. EPH, Emlak Portföy Havuzu, Lina")).toBe(true);
    expect(isUnintelligibleTranscript("  TÜRKÇE emlak crm sesli komutu!  ")).toBe(true);
  });

  it("bos veya 2 kelimeden kisa metin reddedilir", () => {
    expect(isUnintelligibleTranscript("")).toBe(true);
    expect(isUnintelligibleTranscript("  ... ")).toBe(true);
    expect(isUnintelligibleTranscript("Merhaba")).toBe(true);
  });

  it("normal metin gecer", () => {
    expect(isUnintelligibleTranscript("Pamukkale'de üç artı bir daire arayan müşteri ekle")).toBe(false);
    expect(isUnintelligibleTranscript("Yarın saat ikide toplantı")).toBe(false);
  });

  it("servis ipucu yankisinda 422 doner", async () => {
    mockText(TRANSCRIPTION_HINT_PROMPT);
    const error = await new LinaTranscriptionService().transcribe(audio(5000)).catch((e) => e);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.message).toBe(UNINTELLIGIBLE_AUDIO_MESSAGE);
  });

  it("2 KB altı dosya OpenAI'a gönderilmeden 422 döner", async () => {
    const fn = mockText("Yarın saat ikide toplantı");
    const error = await new LinaTranscriptionService().transcribe(audio(1500)).catch((e) => e);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.getStatus()).toBe(422);
    expect(error.message).toBe(UNINTELLIGIBLE_AUDIO_MESSAGE);
    expect(fn).not.toHaveBeenCalled();
  });

  it("normal metin sonucu döner", async () => {
    mockText("Yarın saat ikide toplantı");
    const result = await new LinaTranscriptionService().transcribe(audio(5000));
    expect(result.text).toBe("Yarın saat ikide toplantı");
  });
});
