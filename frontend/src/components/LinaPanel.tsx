"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

type Message = {
  role: "user" | "lina";
  text: string;
};

type LinaPanelProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function LinaPanel({
  open = true,
  onClose = () => {},
}: LinaPanelProps) {
  const { user } = useAuthStore();

  const userName = user?.firstName || "Profesyonel";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lina",
      text: `Merhaba ${userName}. Ben Lina. Size profesyonel bir emlak ilanı hazırlamak için buradayım. İlan satılık mı, kiralık mı, yoksa proje bilgisi mi gireceğiz?`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setSpeaking(false);
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }

    setRecording(false);
  };

  useEffect(() => {
    if (!open) return;

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages, loading, open]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      stopRecording();
    };
  }, []);

  if (!open) return null;

  const speakWithElevenLabs = async (text: string) => {
    try {
      setVoiceError("");
      stopCurrentAudio();
      setSpeaking(true);

      const res = await fetch("/lina-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        setSpeaking(false);
        setVoiceError("Lina sesi şu anda üretilemedi.");
        return;
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
        setVoiceError("Ses oynatılırken hata oluştu.");
      };

      await audio.play();
    } catch {
      setSpeaking(false);
      setVoiceError("Tarayıcı sesi başlatamadı. Tekrar deneyin.");
    }
  };

  const sendMessage = async (textFromVoice?: string) => {
    const text = (textFromVoice || input).trim();

    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", text }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/lina-stok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: newMessages.map((messageItem) => ({
            role: messageItem.role === "lina" ? "assistant" : "user",
            content: messageItem.text,
          })),
        }),
      });

      const data = await res.json();

      const reply =
        data?.reply ||
        "Bu bilgiyi aldım. İlanı daha doğru hazırlamam için konum, oda sayısı, metrekare ve fiyat bilgisini de paylaşabilir misiniz?";

      setMessages((prev) => [...prev, { role: "lina", text: reply }]);

      await speakWithElevenLabs(reply);
    } catch {
      const fallback =
        "Bağlantı sırasında bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.";

      setMessages((prev) => [...prev, { role: "lina", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setVoiceError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError("Bu cihaz ses kaydını desteklemiyor.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRef.current = recorder;

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();

        formData.append("audio", audioBlob, "audio.webm");

        try {
          setLoading(true);

          const res = await fetch("/api/whisper", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          const text = data?.text?.trim();

          if (text) {
            await sendMessage(text);
          } else {
            setVoiceError("Ses anlaşılamadı. Lütfen tekrar deneyin.");
          }
        } catch {
          setVoiceError("Ses metne dönüştürülemedi.");
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError("Mikrofon izni alınamadı.");
    }
  };

  const resetConversation = () => {
    stopCurrentAudio();

    setMessages([
      {
        role: "lina",
        text: `Merhaba ${userName}. Ben Lina. Size profesyonel bir emlak ilanı hazırlamak için buradayım. İlan satılık mı, kiralık mı, yoksa proje bilgisi mi gireceğiz?`,
      },
    ]);

    setInput("");
    setVoiceError("");
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#0F172A]/60 p-0 backdrop-blur-md md:items-center md:p-5">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[34px] border border-[#DDE7F3] bg-white shadow-2xl md:h-[82vh] md:rounded-[36px]">
        <header className="border-b border-[#DDE7F3] bg-[#F8FAFC] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#08111F] text-[#F7DFA3] shadow-lg">
                <Sparkles size={25} />

                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#14B8A6]">
                  <CheckCircle2 size={12} className="text-white" />
                </span>
              </div>

              <div className="min-w-0 text-center md:text-left">
                <h2 className="truncate text-xl font-black text-[#172033]">
                  Lina
                </h2>

                <p className="text-xs font-bold text-[#64748B]">
                  EPH Yapay Zeka Asistanı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {speaking && (
                <button
                  type="button"
                  onClick={stopCurrentAudio}
                  className="flex h-10 items-center gap-2 rounded-2xl border border-[#F7DFA3]/40 bg-[#FFF7ED] px-4 text-xs font-black text-[#B45309]"
                >
                  <Volume2 size={15} />
                  Sesi Durdur
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#172033]"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </header>

        <section className="grid flex-1 overflow-hidden md:grid-cols-[330px_1fr]">
          <aside className="hidden border-r border-[#DDE7F3] bg-[#F8FAFC] p-5 text-center md:block">
            <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-sm">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[34px] bg-[#08111F] text-[#F7DFA3] shadow-xl">
                <Bot size={46} />
              </div>

              <h3 className="mt-5 text-2xl font-black text-[#172033]">
                Lina AI
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#64748B]">
                Portföy bilgilerini toplar, ilan açıklaması hazırlar ve stok
                giriş sürecini hızlandırır.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoBadge title="Sesli Komut" />
                <InfoBadge title="İlan Metni" />
                <InfoBadge title="Portföy Analizi" />
              </div>
            </div>

            {voiceError && (
              <div className="mt-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                {voiceError}
              </div>
            )}
          </aside>

          <main className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto bg-white p-4 md:p-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((messageItem, index) => {
                  const isLina = messageItem.role === "lina";

                  return (
                    <div
                      key={`${messageItem.role}-${index}`}
                      className={`flex ${
                        isLina ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-sm md:max-w-[76%] ${
                          isLina
                            ? "border border-[#DDE7F3] bg-[#F8FAFC] text-[#172033]"
                            : "bg-[#2563EB] text-white"
                        }`}
                      >
                        <p className="whitespace-pre-line text-center md:text-left">
                          {messageItem.text}
                        </p>

                        {isLina && (
                          <button
                            type="button"
                            onClick={() =>
                              speakWithElevenLabs(messageItem.text)
                            }
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black text-[#172033]"
                          >
                            <Volume2 size={14} />
                            Dinle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] px-5 py-4 text-sm font-black text-[#64748B]">
                      <Loader2 size={18} className="animate-spin" />
                      Lina düşünüyor...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-[#DDE7F3] bg-[#F8FAFC] p-4">
              {voiceError && (
                <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-black text-red-600 md:hidden">
                  {voiceError}
                </div>
              )}

              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="İlan bilgisini yazın veya mikrofona basıp anlatın..."
                  className="min-h-[88px] w-full resize-none rounded-3xl border border-[#DDE7F3] bg-white px-5 py-4 text-center text-sm font-semibold text-[#172033] outline-none ring-0 placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                />

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition disabled:opacity-60 ${
                      recording ? "bg-red-600" : "bg-[#0F766E]"
                    }`}
                  >
                    {recording ? <MicOff size={18} /> : <Mic size={18} />}
                    {recording ? "Durdur" : "Konuş"}
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-black text-white transition disabled:opacity-60"
                  >
                    <Send size={18} />
                    Gönder
                  </button>

                  <button
                    type="button"
                    onClick={resetConversation}
                    disabled={loading}
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white px-4 py-3 text-sm font-black text-[#172033] transition disabled:opacity-60"
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}

function InfoBadge({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] px-4 py-3 text-center text-sm font-black text-[#172033]">
      {title}
    </div>
  );
}