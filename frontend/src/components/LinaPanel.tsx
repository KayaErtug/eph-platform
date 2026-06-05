"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
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
    title: "Portföy oluştur",
    text: "Lina, yeni bir emlak portföyü oluşturmak istiyorum. Bana adım adım sorular sor.",
    icon: <Building2 size={18} />,
    color: "#1557D6",
    bg: "#EFF6FF",
  },
  {
    title: "İlan açıklaması yaz",
    text: "Lina, elimdeki portföy için profesyonel bir ilan açıklaması yazmama yardım et.",
    icon: <WandSparkles size={18} />,
    color: "#7C3AED",
    bg: "#FAF5FF",
  },
  {
    title: "Müşteri analizi",
    text: "Lina, bir müşterinin talebini analiz edip bana nasıl dönüş yapmam gerektiğini söyle.",
    icon: <Users size={18} />,
    color: "#0F766E",
    bg: "#ECFDF5",
  },
  {
    title: "Fiyat yorumu",
    text: "Lina, bir portföy için fiyat değerlendirmesi yapmama yardımcı ol.",
    icon: <TrendingUp size={18} />,
    color: "#EA580C",
    bg: "#FFF7ED",
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

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lina",
      text: `Merhaba ${userName}. Ben Lina. Portföy, müşteri, ilan açıklaması, fiyat yorumu ve günlük iş akışında sana yardımcı olmak için buradayım. Bugün nereden başlayalım?`,
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
        text: `Merhaba ${userName}. Ben Lina. Portföy, müşteri, ilan açıklaması, fiyat yorumu ve günlük iş akışında sana yardımcı olmak için buradayım. Bugün nereden başlayalım?`,
      },
    ]);

    setInput("");
    setVoiceError("");
  };

  return (
    <div className="fixed inset-0 z-[140] flex bg-[#F7FBFF]">
      <div className="flex h-[100svh] w-full flex-col overflow-hidden bg-[#F7FBFF] text-[#06194A]">
        <header className="shrink-0 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
              aria-label="Geri dön"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1557D6] text-white shadow-sm">
                <Sparkles size={22} />
              </div>

              <div className="min-w-0 text-center md:text-left">
                <h2 className="truncate text-base font-black md:text-xl">
                  Lina Asistan
                </h2>
                <p className="text-[11px] font-bold text-[#64748B] md:text-xs">
                  EPH operasyon zekası
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={speaking ? stopCurrentAudio : () => speakWithElevenLabs(messages[messages.length - 1]?.text || "")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-sm"
              aria-label="Lina sesi"
            >
              <Volume2 size={18} />
            </button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[360px_1fr]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-[#DDE7F3] bg-[#F7FBFF] p-4 lg:block">
            <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#EFF6FF] text-[#1557D6]">
                <Bot size={38} />
              </div>

              <h3 className="mt-4 text-2xl font-black">Lina AI</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                Portföy, CRM, müşteri, fiyat ve ilan süreçlerinde hızlı karar
                desteği.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniMetric icon={<ClipboardList size={17} />} label="Görev" value="4" />
                <MiniMetric icon={<MessageCircleIcon />} label="Mesaj" value="2" />
                <MiniMetric icon={<Target size={17} />} label="Talep" value="8" />
                <MiniMetric icon={<BarChart3 size={17} />} label="Analiz" value="Hazır" />
              </div>
            </div>

            <div className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <h3 className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">
                Hızlı Komutlar
              </h3>

              <div className="mt-3 grid gap-2">
                {QUICK_COMMANDS.map((command) => (
                  <button
                    key={command.title}
                    type="button"
                    onClick={() => sendMessage(command.text)}
                    className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-3 text-left transition hover:bg-[#EFF6FF]"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ color: command.color, backgroundColor: command.bg }}
                    >
                      {command.icon}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-black">{command.title}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
                        Lina ile başlat
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {voiceError && (
              <div className="mt-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-center text-sm font-bold text-red-600">
                {voiceError}
              </div>
            )}
          </aside>

          <main className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-[#DDE7F3] bg-white px-4 py-4 lg:hidden">
              <section className="rounded-[30px] bg-[#1557D6] p-4 text-center text-white shadow-[0_16px_36px_rgba(21,87,214,0.20)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Bot size={28} />
                </div>

                <h1 className="mt-3 text-2xl font-black">
                  {greeting} {userName} 👋
                </h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
                  Bugün portföy, müşteri, talep ve ilan süreçlerinde sana yardım
                  etmeye hazırım.
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <MobileMetric label="Görev" value="4" />
                  <MobileMetric label="Mesaj" value="2" />
                  <MobileMetric label="Talep" value="8" />
                  <MobileMetric label="Lina" value="Hazır" />
                </div>
              </section>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {QUICK_COMMANDS.map((command) => (
                  <button
                    key={command.title}
                    type="button"
                    onClick={() => sendMessage(command.text)}
                    className="flex min-h-12 items-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-[#F8FAFC] px-3 text-left"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                      style={{ color: command.color, backgroundColor: command.bg }}
                    >
                      {command.icon}
                    </span>
                    <span className="truncate text-xs font-black">{command.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#F7FBFF] p-4 md:p-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                <div className="hidden rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_14px_38px_rgba(15,23,42,0.05)] lg:block">
                  <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#1557D6]">
                    <Sparkles size={15} />
                    Lina Operasyon Merkezi
                  </div>

                  <h1 className="mt-4 text-3xl font-black">
                    {greeting} {userName} 👋
                  </h1>

                  <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#64748B]">
                    Bugün portföy, müşteri, talep, fiyat ve ilan süreçlerinde
                    seni yönlendirmeye hazırım.
                  </p>
                </div>

                {messages.map((messageItem, index) => {
                  const isLina = messageItem.role === "lina";

                  return (
                    <div
                      key={`${messageItem.role}-${index}`}
                      className={`flex ${isLina ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-sm md:max-w-[76%] ${
                          isLina
                            ? "border border-[#DDE7F3] bg-white text-[#06194A]"
                            : "bg-[#1557D6] text-white"
                        }`}
                      >
                        <p className="whitespace-pre-line text-center md:text-left">
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
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-3xl border border-[#DDE7F3] bg-white px-5 py-4 text-sm font-black text-[#64748B] shadow-sm">
                      <Loader2 size={18} className="animate-spin" />
                      Lina düşünüyor...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-[#DDE7F3] bg-white p-3 md:p-4">
              {voiceError && (
                <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-black text-red-600 lg:hidden">
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
                  placeholder="Lina’ya yaz veya mikrofona basıp anlat..."
                  className="min-h-[76px] w-full resize-none rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] px-5 py-4 text-center text-sm font-semibold text-[#06194A] outline-none ring-0 placeholder:text-[#94A3B8] focus:border-[#1557D6]"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black text-white transition disabled:opacity-60 ${
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
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 py-3 text-sm font-black text-white transition disabled:opacity-60"
                  >
                    <Send size={18} />
                    Gönder
                  </button>

                  <button
                    type="button"
                    onClick={resetConversation}
                    disabled={loading}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] px-3 py-3 text-sm font-black text-[#06194A] transition disabled:opacity-60"
                  >
                    <RefreshCcw size={16} />
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

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-3 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#1557D6]">
        {icon}
      </div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black">{value}</div>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-2 text-center">
      <div className="text-[10px] font-bold text-white/70">{label}</div>
      <div className="mt-0.5 truncate text-xs font-black text-white">{value}</div>
    </div>
  );
}

function MessageCircleIcon() {
  return <span className="text-[15px] font-black">2</span>;
}