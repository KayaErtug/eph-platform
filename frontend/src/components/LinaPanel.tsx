"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Mic,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserRound,
  Users,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

// Lina CRM Confirmation And Fixed Voice V1
type LinaActionData = {
  customerId?: string;
  interestId?: string;
  crmUrl?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  draft?: Record<string, unknown>;
  [key: string]: unknown;
};

type Message = {
  role: "user" | "lina";
  text: string;
  action?: string;
  requiresConfirmation?: boolean;
  data?: LinaActionData;
};

type LinaPanelProps = {
  open?: boolean;
  onClose?: () => void;
};

type LinaChatResponse = {
  success?: boolean;
  message?: string;
  reply?: string;
  error?: string;
  action?: string;
  requiresConfirmation?: boolean;
  data?: LinaActionData;
};

type LinaEndOfDayChoice =
  | "OTUZ_GUN_KAYDET"
  | "KALICI_KAYDET"
  | "BUGUNU_SIL";

type LinaEndOfDayReview = {
  id: string;
  date: string;
  summary: string;
  sessionCount: number;
  conversationCount: number;
  choice: LinaEndOfDayChoice | null;
  status: string;
};

type LinaEndOfDayResponse = {
  available?: boolean;
  date?: string;
  review?: LinaEndOfDayReview | null;
  success?: boolean;
  message?: string;
  error?: string;
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

function createWelcomeMessage(name: string) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "günaydın" : hour < 18 ? "iyi günler" : "iyi akşamlar";

  return `Merhaba ${name}, ${greeting}. Size nasıl yardımcı olabilirim?`;
}

function getSafeUserName(user: unknown) {
  const maybeUser = user as {
    firstName?: string;
    name?: string;
    email?: string;
  } | null;

  return (
    maybeUser?.firstName ||
    maybeUser?.name ||
    maybeUser?.email?.split("@")[0]?.split(".")[0] ||
    "Profesyonel"
  );
}

function getAuthToken(user: unknown) {
  const maybeStore = useAuthStore.getState() as unknown as {
    token?: string;
    accessToken?: string;
    jwt?: string;
    authToken?: string;
  };

  const maybeUser = user as {
    token?: string;
    accessToken?: string;
    jwt?: string;
    authToken?: string;
  } | null;

  return (
    maybeStore?.token ||
    maybeStore?.accessToken ||
    maybeStore?.jwt ||
    maybeStore?.authToken ||
    maybeUser?.token ||
    maybeUser?.accessToken ||
    maybeUser?.jwt ||
    maybeUser?.authToken ||
    ""
  );
}

function getLinaChatEndpoints() {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const endpoints = [
    envBase ? `${envBase}/lina/chat` : "",
    "/api/lina/chat",
    "/lina/chat",
    "https://emlakportfoyhavuzu.com/api/lina/chat",
    isLocal ? "http://localhost:3001/lina/chat" : "",
  ].filter(Boolean);

  return Array.from(new Set(endpoints));
}

function getLinaMemoryEndpoints(path: string) {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const endpoints = [
    envBase ? `${envBase}${normalizedPath}` : "",
    `/api${normalizedPath}`,
    normalizedPath,
    `https://emlakportfoyhavuzu.com/api${normalizedPath}`,
    isLocal ? `http://localhost:3001${normalizedPath}` : "",
  ].filter(Boolean);

  return Array.from(new Set(endpoints));
}

export default function LinaPanel({
  open = true,
  onClose = () => {},
}: LinaPanelProps) {
  const { user, hasHydrated } = useAuthStore();

  const userName = getSafeUserName(user);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const didMountMessagesRef = useRef(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceRequestIdRef = useRef(0);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const voiceDetectedRef = useRef(false);
  const discardRecordingRef = useRef(false);

  const [imageOk, setImageOk] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lina",
      text: createWelcomeMessage(userName),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [endOfDayReview, setEndOfDayReview] =
    useState<LinaEndOfDayReview | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState("");

  useEffect(() => {
    if (!hasHydrated || !user) {
      return;
    }

    setMessages((currentMessages) => {
      if (
        currentMessages.length !== 1 ||
        currentMessages[0]?.role !== "lina" ||
        !currentMessages[0].text.includes("Size nasıl yardımcı olabilirim?")
      ) {
        return currentMessages;
      }

      const nextWelcomeMessage = createWelcomeMessage(userName);

      if (currentMessages[0].text === nextWelcomeMessage) {
        return currentMessages;
      }

      return [
        {
          role: "lina",
          text: nextWelcomeMessage,
        },
      ];
    });
  }, [hasHydrated, user, userName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  }, []);

  const fetchEndOfDayReview = async () => {
    const token = getAuthToken(user);

    if (!token) {
      setEndOfDayReview(null);
      return;
    }

    setMemoryLoading(true);

    try {
      const endpoints = getLinaMemoryEndpoints(
        "/lina/memory/end-of-day",
      );
      let lastError = "";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          const raw = await response.text();
          let data: LinaEndOfDayResponse = {};

          try {
            data = raw
              ? (JSON.parse(raw) as LinaEndOfDayResponse)
              : {};
          } catch {
            data = { message: raw };
          }

          if (!response.ok) {
            lastError =
              data?.message ||
              data?.error ||
              `HTTP ${response.status}`;
            continue;
          }

          const review =
            data?.available &&
            data?.review &&
            data.review.status !== "TAMAMLANDI"
              ? data.review
              : null;

          setEndOfDayReview(review);
          setMemoryMessage("");
          return;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Gün sonu hafızası alınamadı.";
        }
      }

      throw new Error(lastError || "Gün sonu hafızası alınamadı.");
    } catch {
      setEndOfDayReview(null);
    } finally {
      setMemoryLoading(false);
    }
  };

  const saveEndOfDayChoice = async (
    choice: LinaEndOfDayChoice,
  ) => {
    const token = getAuthToken(user);

    if (!token || !endOfDayReview || memorySaving) {
      return;
    }

    setMemorySaving(true);
    setMemoryMessage("");

    try {
      const endpoints = getLinaMemoryEndpoints(
        "/lina/memory/end-of-day",
      );
      let lastError = "";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              choice,
              date: endOfDayReview.date,
            }),
          });

          const raw = await response.text();
          let data: LinaEndOfDayResponse = {};

          try {
            data = raw
              ? (JSON.parse(raw) as LinaEndOfDayResponse)
              : {};
          } catch {
            data = { message: raw };
          }

          if (!response.ok) {
            lastError =
              data?.message ||
              data?.error ||
              `HTTP ${response.status}`;
            continue;
          }

          setMemoryMessage(
            data?.message || "Hafıza tercihiniz kaydedildi.",
          );
          setEndOfDayReview(null);
          return;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Hafıza tercihi kaydedilemedi.";
        }
      }

      throw new Error(lastError || "Hafıza tercihi kaydedilemedi.");
    } catch (error) {
      setMemoryMessage(
        error instanceof Error
          ? error.message
          : "Hafıza tercihi kaydedilemedi.",
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const ensureAudioContext = async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    const context =
      audioContextRef.current || new AudioContextConstructor();

    audioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  };

  const unlockAudioPlayback = async () => {
    try {
      const context = await ensureAudioContext();

      if (!context) {
        return;
      }

      const silentBuffer = context.createBuffer(1, 1, 22050);
      const silentSource = context.createBufferSource();

      silentSource.buffer = silentBuffer;
      silentSource.connect(context.destination);
      silentSource.start(0);
    } catch {
      return;
    }
  };

  const stopCurrentAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {
        // Kaynak zaten sonlanmış olabilir.
      }

      audioSourceRef.current = null;
    }

    setSpeaking(false);
  };

  const clearRecordingMonitor = () => {
    if (recordingFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }

    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    analyserRef.current?.disconnect();
    analyserRef.current = null;
  };

  const stopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    clearRecordingMonitor();

    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    } else {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }

    setRecording(false);
  };

  useEffect(() => {
    if (!open) return;

    void fetchEndOfDayReview();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    if (!didMountMessagesRef.current) {
      didMountMessagesRef.current = true;
      return;
    }

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages, loading, open]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      stopRecording(true);

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  const callLinaBackend = async (
    text: string,
    history: Message[],
  ): Promise<LinaChatResponse> => {
    const token = getAuthToken(user);
    const endpoints = getLinaChatEndpoints();

    let lastError = "";

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            sourceModule: "general",
            history: history.map((messageItem) => ({
              role: messageItem.role === "lina" ? "assistant" : "user",
              content: messageItem.text,
            })),
          }),
        });

        const raw = await res.text();
        let data: LinaChatResponse = {};

        try {
          data = raw ? (JSON.parse(raw) as LinaChatResponse) : {};
        } catch {
          data = { message: raw };
        }

        if (!res.ok) {
          lastError = data?.message || data?.error || `HTTP ${res.status}`;
          continue;
        }

        const reply = data?.message || data?.reply;

        if (reply?.trim()) {
          return {
            ...data,
            message: reply.trim(),
          };
        }

        lastError = "Lina boş cevap döndürdü.";
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : "Lina bağlantısı kurulamadı.";
      }
    }

    throw new Error(lastError || "Lina bağlantısı kurulamadı.");
  };

  const speakWithElevenLabs = async (text: string) => {
    try {
      setVoiceError("");

      const context = await ensureAudioContext();

      if (!context) {
        setVoiceError("Bu cihaz Lina sesini desteklemiyor.");
        return;
      }

      stopCurrentAudio();
      const requestId = voiceRequestIdRef.current + 1;
      voiceRequestIdRef.current = requestId;
      setSpeaking(true);

      const res = await fetch("/lina-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        if (voiceRequestIdRef.current === requestId) {
          setSpeaking(false);
          setVoiceError("Lina sesi şu anda üretilemedi.");
        }
        return;
      }

      const audioData = await res.arrayBuffer();

      if (voiceRequestIdRef.current !== requestId) {
        return;
      }

      const audioBuffer = await context.decodeAudioData(
        audioData.slice(0),
      );

      if (voiceRequestIdRef.current !== requestId) {
        return;
      }

      const source = context.createBufferSource();

      source.buffer = audioBuffer;
      source.playbackRate.value = 1;
      source.connect(context.destination);
      audioSourceRef.current = source;

      source.onended = () => {
        if (audioSourceRef.current === source) {
          audioSourceRef.current = null;
        }

        if (voiceRequestIdRef.current === requestId) {
          setSpeaking(false);
        }
      };

      source.start(0);
    } catch {
      setSpeaking(false);
      setVoiceError(
        "Lina'nın sesi otomatik başlatılamadı. Dinle butonuna dokunun.",
      );
    }
  };

  const sendMessage = async (textFromVoice?: string) => {
    const text = (textFromVoice || input).trim();

    if (!text || loading) return;

    await unlockAudioPlayback();

    const newMessages: Message[] = [...messages, { role: "user", text }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await callLinaBackend(text, newMessages);
      const reply =
        response.message ||
        response.reply ||
        "Lina işlemi tamamladı ancak sonuç mesajı oluşturamadı.";

      setMessages((prev) => [
        ...prev,
        {
          role: "lina",
          text: reply,
          action: response.action,
          requiresConfirmation:
            response.requiresConfirmation ?? false,
          data: response.data,
        },
      ]);

      await speakWithElevenLabs(reply);
      await fetchEndOfDayReview();
    } catch {
      const fallback =
        "Şu anda Lina'nın ana beyniyle bağlantı kurulamadı. Demo cevap üretmeyeceğim. Lütfen bağlantı ayarlarını kontrol ettikten sonra tekrar deneyin.";

      setMessages((prev) => [...prev, { role: "lina", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (recording || transcribing || loading) {
      return;
    }

    try {
      setVoiceError("");
      await unlockAudioPlayback();

      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError("Bu cihaz ses kaydını desteklemiyor.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recordingStreamRef.current = stream;
      mediaRef.current = recorder;
      discardRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();
      lastVoiceAtRef.current = Date.now();
      voiceDetectedRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearRecordingMonitor();
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRef.current = null;

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }

        if (!chunks.length || !voiceDetectedRef.current) {
          setVoiceError("Ses algılanamadı. Mikrofona dokunup tekrar konuşun.");
          return;
        }

        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const extension = blobType.includes("mp4") ? "m4a" : "webm";
        const audioBlob = new Blob(chunks, { type: blobType });
        const formData = new FormData();

        formData.append("audio", audioBlob, `audio.${extension}`);

        try {
          setTranscribing(true);

          const res = await fetch("/api/whisper", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          const voiceText = data?.text?.trim();

          if (voiceText) {
            await sendMessage(voiceText);
          } else {
            setVoiceError("Ses anlaşılamadı. Lütfen tekrar deneyin.");
          }
        } catch {
          setVoiceError("Ses metne dönüştürülemedi.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(250);
      setRecording(true);

      const context = await ensureAudioContext();

      if (context) {
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        const samples = new Uint8Array(analyser.fftSize);

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyserRef.current = analyser;

        const monitorVoice = () => {
          if (!mediaRef.current || mediaRef.current.state === "inactive") {
            return;
          }

          analyser.getByteTimeDomainData(samples);

          let total = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            total += normalized * normalized;
          }

          const volume = Math.sqrt(total / samples.length);
          const now = Date.now();

          if (volume > 0.025) {
            voiceDetectedRef.current = true;
            lastVoiceAtRef.current = now;
          }

          const recordingDuration = now - recordingStartedAtRef.current;
          const silenceDuration = now - lastVoiceAtRef.current;

          if (
            voiceDetectedRef.current &&
            recordingDuration > 1000 &&
            silenceDuration > 1300
          ) {
            stopRecording();
            return;
          }

          if (!voiceDetectedRef.current && recordingDuration > 7000) {
            stopRecording();
            return;
          }

          recordingFrameRef.current = window.requestAnimationFrame(monitorVoice);
        };

        recordingFrameRef.current = window.requestAnimationFrame(monitorVoice);
      }

      recordingTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 45000);
    } catch {
      setRecording(false);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      clearRecordingMonitor();
      setVoiceError("Mikrofon izni alınamadı.");
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
      return;
    }

    void startRecording();
  };

  const resetConversation = () => {
    stopCurrentAudio();
    stopRecording(true);

    setMessages([
      {
        role: "lina",
        text: createWelcomeMessage(userName),
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
              <h1 className="text-2xl font-black tracking-tight">
                Lina Asistan
              </h1>
              <p className="text-xs font-bold text-[#475569]">
                EPH operasyon zekası
              </p>
            </div>

            <button
              type="button"
              onClick={
                speaking
                  ? stopCurrentAudio
                  : () =>
                      speakWithElevenLabs(
                        messages[messages.length - 1]?.text || "",
                      )
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
                Gerçek veri varsa analiz ederim. Veri yoksa sayı uydurmadan,
                test edilebilir alanlara yönlendiririm.
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
            <Metric
              icon={<CheckCircle2 size={23} />}
              value="—"
              label="Görev"
              sub="Gerçek veri"
              color="#1557D6"
              bg="#EFF6FF"
            />
            <Metric
              icon={<Bell size={23} />}
              value="—"
              label="Mesaj"
              sub="Gerçek veri"
              color="#7C3AED"
              bg="#FAF5FF"
            />
            <Metric
              icon={<Target size={23} />}
              value="—"
              label="Talep"
              sub="Gerçek veri"
              color="#EA580C"
              bg="#FFF7ED"
            />
            <Metric
              icon={<Star size={23} />}
              value="—"
              label="Fırsat"
              sub="Gerçek veri"
              color="#0F766E"
              bg="#ECFDF5"
            />
          </section>

          <section className="mt-5">
            <h3 className="px-1 text-center text-xl font-black tracking-tight">
              Hızlı İşlemler
            </h3>

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
                    style={{
                      color: command.color,
                      backgroundColor: command.bg,
                    }}
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

          {(endOfDayReview || memoryLoading || memoryMessage) && (
            <section className="mt-5">
              <div className="rounded-[28px] border border-[#D8E6FB] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EEF5FF] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#1557D6]">
                    <Brain size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black">
                      Gün Sonu Hafıza Onayı
                    </h3>

                    {memoryLoading && !endOfDayReview ? (
                      <div className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#64748B]">
                        <Loader2 size={16} className="animate-spin" />
                        Günlük özet hazırlanıyor...
                      </div>
                    ) : endOfDayReview ? (
                      <>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#475569] shadow-sm">
                            <Clock3 size={13} />
                            {endOfDayReview.conversationCount} konuşma
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#475569] shadow-sm">
                            {endOfDayReview.sessionCount} oturum
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-semibold leading-6 text-[#334155]">
                          {endOfDayReview.summary}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>

                {endOfDayReview && (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        saveEndOfDayChoice("OTUZ_GUN_KAYDET")
                      }
                      disabled={memorySaving}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,87,214,0.22)] disabled:opacity-60"
                    >
                      {memorySaving ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Clock3 size={17} />
                      )}
                      30 Gün Hafızaya Kaydet
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        saveEndOfDayChoice("KALICI_KAYDET")
                      }
                      disabled={memorySaving}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#F4C95D] bg-[#FFFBEB] px-4 text-sm font-black text-[#9A6700] disabled:opacity-60"
                    >
                      <Star size={17} />
                      Kalıcı Hafızaya Ekle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        saveEndOfDayChoice("BUGUNU_SIL")
                      }
                      disabled={memorySaving}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FFF7F7] px-4 text-sm font-black text-[#C24141] disabled:opacity-60"
                    >
                      <Trash2 size={17} />
                      Bugünkü Konuşmaları Sil
                    </button>
                  </div>
                )}

                {memoryMessage && (
                  <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center text-xs font-black text-[#1557D6] shadow-sm">
                    {memoryMessage}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h3 className="px-1 text-center text-xl font-black tracking-tight">
              Lina ile Sohbet
            </h3>

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
                        isLina
                          ? "bg-white text-[#06194A]"
                          : "bg-[#1557D6] text-white"
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
                        <p className="text-left text-sm font-semibold leading-6">
                          {messageItem.text}
                        </p>

                        {isLina && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                speakWithElevenLabs(messageItem.text)
                              }
                              className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] px-4 py-2 text-xs font-black text-[#1557D6]"
                            >
                              <Volume2 size={14} />
                              {speaking ? "Çalıyor" : "Dinle"}
                            </button>

                            {messageItem.requiresConfirmation &&
                              index === messages.length - 1 && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      sendMessage("Kaydı Onayla")
                                    }
                                    disabled={loading}
                                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#059669] px-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(5,150,105,0.20)] disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={16} />
                                    {messageItem.data?.confirmLabel ||
                                      "Kaydı Onayla"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      sendMessage("İptal Et")
                                    }
                                    disabled={loading}
                                    className="flex min-h-11 items-center justify-center rounded-2xl border-2 border-[#F2B8B5] bg-[#FFF5F5] px-3 text-xs font-black text-[#B42318] disabled:opacity-50"
                                  >
                                    {messageItem.data?.cancelLabel ||
                                      "İptal Et"}
                                  </button>
                                </div>
                              )}

                            {!messageItem.requiresConfirmation &&
                              Boolean(messageItem.data?.customerId) &&
                              (
                                messageItem.action ===
                                  "crm_customer_create" ||
                                messageItem.action ===
                                  "crm_customer_create_with_interest"
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.location.assign(
                                      messageItem.data?.crmUrl ||
                                        "/crm",
                                    )
                                  }
                                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#BFD5EC] bg-[#EEF5FF] px-4 text-xs font-black text-[#1557D6]"
                                >
                                  CRM’de Görüntüle
                                  <ChevronRight size={16} />
                                </button>
                              )}
                          </>
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
            {(recording || transcribing) && (
              <div className="mb-2 flex min-h-11 items-center justify-center gap-3 rounded-[22px] bg-[#F5F0FF] px-4 text-sm font-black text-[#6D28D9]">
                {recording ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B5CF6] opacity-50" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[#7C3AED]" />
                    </span>
                    Dinliyorum… Bitirince otomatik göndereceğim.
                  </>
                ) : (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Sesiniz yazıya çevriliyor…
                  </>
                )}
              </div>
            )}

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
                disabled={recording || transcribing}
                placeholder={
                  recording
                    ? "Sizi dinliyorum…"
                    : transcribing
                      ? "Ses işleniyor…"
                      : "Lina’ya yaz veya mikrofona dokunup konuş…"
                }
                className="max-h-24 min-h-12 flex-1 resize-none rounded-[22px] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#06194A] outline-none placeholder:text-[#94A3B8] disabled:opacity-70"
              />

              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading || transcribing}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_10px_24px_rgba(124,58,237,0.18)] transition active:scale-95 disabled:opacity-50 ${
                  recording
                    ? "bg-[#7C3AED] text-white ring-4 ring-[#EDE9FE]"
                    : "bg-[#F5F0FF] text-[#7C3AED]"
                }`}
                aria-label={recording ? "Konuşmayı bitir" : "Sesli konuş"}
              >
                <Mic size={22} className={recording ? "animate-pulse" : ""} />
              </button>

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || recording || transcribing || !input.trim()}
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