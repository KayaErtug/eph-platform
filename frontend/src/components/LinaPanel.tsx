"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
  Target,
  UserRound,
  Users,
  Volume2,
  WandSparkles,
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

const QUICK_COMMANDS = [
  {
    title: "Portföy Oluştur",
    desc: "Yeni portföy ekle",
    text: "Lina, yeni bir emlak portföyü oluşturmak istiyorum. Bana adım adım sorular sor.",
    icon: <Building2 size={22} />,
    color: "#1557D6",
    bg: "#EFF6FF",
  },
  {
    title: "İlan Açıklaması Yaz",
    desc: "Profesyonel ilan yaz",
    text: "Lina, elimdeki portföy için profesyonel ve etkileyici bir ilan açıklaması yazmama yardım et.",
    icon: <WandSparkles size={22} />,
    color: "#7C3AED",
    bg: "#FAF5FF",
  },
  {
    title: "Müşteri Analizi",
    desc: "Müşteri değerlendir",
    text: "Lina, bir müşterinin talebini analiz edip bana nasıl dönüş yapmam gerektiğini söyle.",
    icon: <Users size={22} />,
    color: "#0F766E",
    bg: "#ECFDF5",
  },
  {
    title: "CRM Analizi",
    desc: "Verileri analiz et",
    text: "Lina, CRM kayıtlarımı yorumlayıp bugün hangi müşterilere öncelik vermem gerektiğini söyle.",
    icon: <BarChart3 size={22} />,
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    title: "Fiyat Yorumu",
    desc: "Fiyat değerlendirmesi",
    text: "Lina, bir portföy için fiyat değerlendirmesi yapmama yardımcı ol.",
    icon: <Target size={22} />,
    color: "#F43F5E",
    bg: "#FFF1F2",
  },
  {
    title: "Lina Fırsatları",
    desc: "Yeni fırsatları gör",
    text: "Lina, benim için yeni fırsatları, eşleşen talepleri ve takip etmem gereken işleri özetle.",
    icon: <Star size={22} />,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
];

export default function LinaPanel({
  open = true,
  onClose = () => {},
}: LinaPanelProps) {
  const { user } = useAuthStore();

  const userName = user?.firstName || "Profesyonel";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [imageOk, setImageOk] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lina",
      text: `Merhaba ${userName}, bugün sana nasıl yardımcı olabilirim? Portföy eklemek, müşteri analizi yapmak veya ilan açıklaması hazırlamak için buradayım.`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  }, []);

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
        "Bu bilgiyi aldım. Daha doğru ilerlemek için konum, metrekare, fiyat ve portföy tipini de paylaşabilir misin?";

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
        text: `Merhaba ${userName}, bugün sana nasıl yardımcı olabilirim? Portföy eklemek, müşteri analizi yapmak veya ilan açıklaması hazırlamak için buradayım.`,
      },
    ]);

    setInput("");
    setVoiceError("");
  };

  return (
    <div className="fixed inset-0 z-[140] bg-[#F7FBFF] text-[#06194A]">
      <div className="mx-auto flex h-[100svh] max-w-[460px] flex-col overflow-hidden bg-[#F7FBFF]">
        <header className="shrink-0 bg-[#F7FBFF]/95 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#06194A] shadow-[0_8px_22px_rgba(15,23,42,0.08)]"
              aria-label="Geri dön"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight">Lina Asistan</h1>
              <p className="text-xs font-bold text-[#475569]">
                EPH operasyon zekası
              </p>
            </div>

            <button
              type="button"
              onClick={
                speaking
                  ? stopCurrentAudio
                  : () => speakWithElevenLabs(messages[messages.length - 1]?.text || "")
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1557D6] shadow-[0_8px_22px_rgba(15,23,42,0.08)]"
              aria-label="Lina sesi"
            >
              <Volume2 size={21} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#EEF5FF] via-white to-[#EFF6FF] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="relative z-10 max-w-[56%] py-5">
              <h2 className="text-2xl font-black leading-tight tracking-tight">
                {greeting} {userName}! 👋
              </h2>

              <p className="mt-4 text-base font-semibold leading-7 text-[#27364F]">
                Bugün portföy, müşteri, talep ve ilan süreçlerinde sana yardım
                etmeye hazırım.
              </p>
            </div>

            <div className="absolute bottom-0 right-0 top-0 flex w-[48%] items-end justify-center">
              {imageOk ? (
                <img
                  src="/Lina.jpg"
                  alt="Lina Asistan"
                  onError={() => setImageOk(false)}
                  className="h-full max-h-[238px] w-auto object-contain object-bottom"
                />
              ) : (
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]">
                  <UserRound size={52} />
                </div>
              )}
            </div>

            <div className="absolute right-7 top-11 text-[#DBEAFE]">
              <Sparkles size={34} />
            </div>
          </section>

          <section className="mt-4 grid grid-cols-4 overflow-hidden rounded-[26px] bg-white shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
            <Metric icon={<CheckCircle2 size={23} />} value="4" label="Görev" sub="Aktif" color="#1557D6" bg="#EFF6FF" />
            <Metric icon={<Bell size={23} />} value="2" label="Mesaj" sub="Okunmamış" color="#7C3AED" bg="#FAF5FF" />
            <Metric icon={<Target size={23} />} value="8" label="Talep" sub="Eşleşen" color="#EA580C" bg="#FFF7ED" />
            <Metric icon={<Star size={23} />} value="3" label="Fırsat" sub="Yeni" color="#0F766E" bg="#ECFDF5" />
          </section>

          <section className="mt-5">
            <h3 className="px-1 text-xl font-black tracking-tight">Hızlı İşlemler</h3>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {QUICK_COMMANDS.map((command) => (
                <button
                  key={command.title}
                  type="button"
                  onClick={() => sendMessage(command.text)}
                  className="flex min-h-[76px] items-center gap-3 rounded-[24px] bg-white px-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition active:scale-[0.99]"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ color: command.color, backgroundColor: command.bg }}
                  >
                    {command.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {command.title}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-[#64748B]">
                      {command.desc}
                    </span>
                  </span>

                  <ChevronRight size={18} className="shrink-0 text-[#94A3B8]" />
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="px-1 text-xl font-black tracking-tight">Lina ile Sohbet</h3>

            <div className="mt-3 flex flex-col gap-3">
              {messages.map((messageItem, index) => {
                const isLina = messageItem.role === "lina";

                return (
                  <div
                    key={`${messageItem.role}-${index}`}
                    className={`flex ${isLina ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`flex max-w-[92%] gap-3 rounded-[26px] px-4 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] ${
                        isLina ? "bg-white text-[#06194A]" : "bg-[#1557D6] text-white"
                      }`}
                    >
                      {isLina && (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EFF6FF] text-[#1557D6]">
                          {imageOk ? (
                            <img
                              src="/Lina.jpg"
                              alt="Lina"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Bot size={28} />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="whitespace-pre-line text-sm font-semibold leading-6">
                          {messageItem.text}
                        </p>

                        {isLina && (
                          <button
                            type="button"
                            onClick={() => speakWithElevenLabs(messageItem.text)}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] px-4 py-2 text-xs font-black text-[#1557D6]"
                          >
                            <Volume2 size={14} />
                            Dinle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-white px-5 py-4 text-sm font-black text-[#64748B] shadow-sm">
                    <Loader2 size={18} className="animate-spin" />
                    Lina düşünüyor...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </section>
        </main>

        <footer className="absolute bottom-0 left-0 right-0 mx-auto max-w-[460px] bg-gradient-to-t from-[#F7FBFF] via-[#F7FBFF] to-transparent px-4 pb-4 pt-8">
          {voiceError && (
            <div className="mb-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-black text-red-600">
              {voiceError}
            </div>
          )}

          <div className="rounded-[28px] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
            <div className="flex items-center gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Lina’ya yaz veya mikrofona basıp anlat..."
                className="max-h-24 min-h-12 flex-1 resize-none rounded-[22px] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              />

              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm transition disabled:opacity-60 ${
                  recording ? "bg-red-600 text-white" : "bg-white text-[#7C3AED]"
                }`}
                aria-label={recording ? "Kaydı durdur" : "Konuş"}
              >
                {recording ? <MicOff size={21} /> : <Mic size={21} />}
              </button>

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1557D6] text-white shadow-[0_10px_24px_rgba(21,87,214,0.24)] transition disabled:opacity-50"
                aria-label="Gönder"
              >
                <Send size={21} />
              </button>
            </div>

            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={resetConversation}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-black text-[#64748B] transition disabled:opacity-60"
              >
                <RefreshCcw size={14} />
                Sohbeti Sıfırla
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  sub,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="border-r border-[#E2E8F0] px-2 py-4 text-center last:border-r-0">
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ color, backgroundColor: bg }}
      >
        {icon}
      </div>
      <div className="mt-3 text-3xl font-black leading-none">{value}</div>
      <div className="mt-1 text-sm font-black">{label}</div>
      <div className="mt-1 text-xs font-semibold text-[#64748B]">{sub}</div>
    </div>
  );
}